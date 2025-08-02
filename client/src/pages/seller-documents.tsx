import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, CheckCircle, AlertCircle, User as UserIcon, Phone, Image as ImageIcon } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { SellerOnboardingStatus } from "@/components/seller-onboarding-status";

export default function SellerDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    businessName: "",
    phoneNumber: "",
    whatsappNumber: "",
    businessAddress: "",
    shopLicenseNumber: "",
    ownerCivilId: "",
    businessType: ""
  });

  // Redirect if not seller
  if (user?.role !== "seller") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Access Denied
              </h2>
              <p className="text-slate-600">
                This page is only accessible to registered sellers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch seller data
  const { data: sellerData } = useQuery({
    queryKey: ["/api/sellers", "profile"],
  });

  // Submit seller documents
  const submitDocuments = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("PUT", "/api/sellers/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers", "profile"] });
      toast({ 
        title: "Documents submitted successfully",
        description: "Your documents are now under review by our admin team."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitDocuments.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUploaded = (field: string, urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: urls[0] || '' // Take the first URL for single file uploads
    }));
  };

  const handleFileRemoved = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const getComplianceStatus = () => {
    const required = ['businessName', 'phoneNumber', 'shopLicenseNumber', 'ownerCivilId'];
    const completed = required.filter(field => formData[field as keyof typeof formData]).length;
    return { completed, total: required.length };
  };

  const status = getComplianceStatus();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Kuwait Compliance Documents</h1>
          <p className="text-lg text-slate-600">Complete your seller profile with required Kuwait business documents</p>
        </div>

        {/* Seller Onboarding Status */}
        <div className="mb-8">
          <SellerOnboardingStatus sellerId={user?.id || ""} />
        </div>

        {/* Compliance Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Compliance Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600">
                  {status.completed} of {status.total} required fields completed
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(status.completed / status.total) * 100}%` }}
                  />
                </div>
              </div>
              <Badge variant={status.completed === status.total ? "secondary" : "outline"}>
                {status.completed === status.total ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                {formData.businessName ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>Business Name</span>
              </div>
              <div className="flex items-center space-x-2">
                {formData.phoneNumber ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>Phone Number</span>
              </div>
              <div className="flex items-center space-x-2">
                {formData.shopLicenseNumber ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>Shop License Number</span>
              </div>
              <div className="flex items-center space-x-2">
                {formData.ownerCivilId ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>Civil ID Number</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Form */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information & Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Your business name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    placeholder="e.g., Electronics Retailer"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="+965 XXXX XXXX"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                    placeholder="+965 XXXX XXXX"
                  />
                </div>
              </div>

              {/* Business Address */}
              <div>
                <Label htmlFor="businessAddress">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                  placeholder="Complete business address in Kuwait"
                  rows={3}
                />
              </div>

              {/* Kuwait Compliance Fields */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Kuwait Legal Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shopLicenseNumber">Shop License Number *</Label>
                    <Input
                      id="shopLicenseNumber"
                      value={formData.shopLicenseNumber}
                      onChange={(e) => handleInputChange('shopLicenseNumber', e.target.value)}
                      placeholder="Commercial license number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerCivilId">Owner Civil ID *</Label>
                    <Input
                      id="ownerCivilId"
                      value={formData.ownerCivilId}
                      onChange={(e) => handleInputChange('ownerCivilId', e.target.value)}
                      placeholder="Kuwait Civil ID number"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Uploads</h3>
                <div className="space-y-6">
                  {/* Company Logo */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                      <Label className="text-base font-medium">Company Logo</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your company logo for receipts and branding. This will appear on all your POS receipts and customer communications.
                    </p>
                    <FileUpload
                      accept="*/*"
                      maxFiles={1}
                      maxSizeMB={5}
                      label="Company Logo"
                      multiple={false}
                      currentFiles={formData.businessLogo ? [formData.businessLogo] : []}
                      onFilesUploaded={(urls) => handleFileUploaded('businessLogo', urls)}
                      onFileRemoved={() => handleFileRemoved('businessLogo')}
                    />
                  </div>

                  {/* Shop License */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <Label className="text-base font-medium">Shop License Image</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a clear photo or scan of your Kuwait commercial license document.
                    </p>
                    <FileUpload
                      accept="*/*"
                      maxFiles={1}
                      maxSizeMB={5}
                      label="Shop License"
                      multiple={false}
                      currentFiles={formData.shopLicenseImage ? [formData.shopLicenseImage] : []}
                      onFilesUploaded={(urls) => handleFileUploaded('shopLicenseImage', urls)}
                      onFileRemoved={() => handleFileRemoved('shopLicenseImage')}
                    />
                  </div>

                  {/* Civil ID */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <UserIcon className="h-5 w-5 text-purple-600" />
                      <Label className="text-base font-medium">Owner Civil ID Copy</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a clear photo of both sides of the business owner's Kuwait Civil ID.
                    </p>
                    <FileUpload
                      accept="*/*"
                      maxFiles={2}
                      maxSizeMB={5}
                      label="Civil ID Copy"
                      multiple={true}
                      currentFiles={formData.ownerCivilIdImage ? [formData.ownerCivilIdImage] : []}
                      onFilesUploaded={(urls) => handleFileUploaded('ownerCivilIdImage', urls)}
                      onFileRemoved={() => handleFileRemoved('ownerCivilIdImage')}
                    />
                  </div>

                  {/* Owner Photo */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <UserIcon className="h-5 w-5 text-orange-600" />
                      <Label className="text-base font-medium">Business Owner Photo</Label>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a clear photo of the business owner for identity verification.
                    </p>
                    <FileUpload
                      accept="*/*"
                      maxFiles={1}
                      maxSizeMB={5}
                      label="Owner Photo"
                      multiple={false}
                      currentFiles={formData.ownerPhoto ? [formData.ownerPhoto] : []}
                      onFilesUploaded={(urls) => handleFileUploaded('ownerPhoto', urls)}
                      onFileRemoved={() => handleFileRemoved('ownerPhoto')}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="submit" 
                  disabled={submitDocuments.isPending}
                  className="px-8"
                >
                  {submitDocuments.isPending ? "Submitting..." : "Submit Documents"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}