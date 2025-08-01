import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { Upload, X, Image, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  onFileRemoved?: (url: string) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  multiple?: boolean;
  currentFiles?: string[];
  uploadEndpoint?: string;
}

export function FileUpload({
  onFilesUploaded,
  onFileRemoved,
  accept = "*/*",
  maxFiles = 5,
  maxSizeMB = 5,
  label = "Upload files",
  multiple = true,
  currentFiles = [],
  uploadEndpoint = "/api/upload"
}: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const compressImage = (file: File, targetSizeBytes: number = maxSizeMB * 1024 * 1024): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let quality = 0.9;
        let width = img.width;
        let height = img.height;
        
        // Start with reasonable dimensions
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        const attemptCompression = (currentQuality: number, currentWidth: number, currentHeight: number) => {
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          ctx?.clearRect(0, 0, currentWidth, currentHeight);
          ctx?.drawImage(img, 0, 0, currentWidth, currentHeight);
          
          canvas.toBlob((blob) => {
            if (blob) {
              if (blob.size <= targetSizeBytes || currentQuality <= 0.1) {
                // Success or minimum quality reached
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Try with lower quality or smaller dimensions
                if (currentQuality > 0.3) {
                  attemptCompression(currentQuality - 0.1, currentWidth, currentHeight);
                } else {
                  // Reduce dimensions by 20%
                  const newWidth = Math.floor(currentWidth * 0.8);
                  const newHeight = Math.floor(currentHeight * 0.8);
                  if (newWidth > 100 && newHeight > 100) {
                    attemptCompression(0.8, newWidth, newHeight);
                  } else {
                    const finalFile = new File([blob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(finalFile);
                  }
                }
              }
            } else {
              resolve(file);
            }
          }, 'image/jpeg', currentQuality);
        };
        
        attemptCompression(quality, width, height);
      };
      
      img.onerror = () => {
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateFile = (file: File) => {
    // Always allow all file types when accept is "*/*" or not specified
    if (!accept || accept === "*/*") {
      return true;
    }
    
    // For specific accept patterns, check file type
    const acceptTypes = accept.split(',').map(type => type.trim());
    const isValidType = acceptTypes.some(acceptType => {
      if (acceptType === "*/*") return true;
      if (acceptType.includes("/*")) {
        const baseType = acceptType.split("/")[0];
        return file.type.startsWith(baseType + "/");
      }
      return file.type === acceptType;
    });

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: `Please select a valid file type. Accepted: ${accept}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadFiles = async (files: FileList) => {
    if (!files.length) return;

    // Check if adding these files would exceed maxFiles
    if (currentFiles.length + files.length > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = Array.from(files).filter(validateFile);
    if (!validFiles.length) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        // Compress image if it's too large
        let finalFile = file;
        if (file.size > maxSizeMB * 1024 * 1024 && file.type.startsWith('image/')) {
          toast({
            title: "Info",
            description: "Compressing image to reduce file size...",
            variant: "default",
          });
          finalFile = await compressImage(file);
        }

        const formData = new FormData();
        formData.append("file", finalFile);

        const token = localStorage.getItem('authToken');
        const response = await fetch(uploadEndpoint, {
          method: "POST",
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onFilesUploaded(uploadedUrls);

      toast({
        title: "Success",
        description: `${uploadedUrls.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (url: string) => {
    if (onFileRemoved) {
      onFileRemoved(url);
    }
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || url;
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Upload Area */}
      <Card className={`transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => currentFiles.length < maxFiles && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            {currentFiles.length >= maxFiles ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-600">File uploaded</p>
                  <p className="text-xs text-muted-foreground">Click remove button to replace</p>
                </div>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Files up to {maxSizeMB}MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Files */}
      {currentFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files</Label>
          <div className="grid gap-2">
            {currentFiles.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg bg-background"
              >
                {getFileIcon(url)}
                <div className="flex-1 min-w-0">
                  {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={url}
                        alt="Uploaded file"
                        className="w-10 h-10 object-cover rounded"
                      />
                      <span className="text-sm truncate">{getFileName(url)}</span>
                    </div>
                  ) : (
                    <span className="text-sm truncate">{getFileName(url)}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(url)}
                  className="h-auto p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Count Info */}
      {maxFiles > 1 && (
        <div className="text-xs text-muted-foreground">
          {currentFiles.length} / {maxFiles} files
        </div>
      )}
    </div>
  );
}