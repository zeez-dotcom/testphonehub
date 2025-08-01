import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle, Upload, FileText, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface SellerOnboardingStatusProps {
  sellerId: string;
}

export function SellerOnboardingStatus({ sellerId }: SellerOnboardingStatusProps) {
  const { data: sellerProfile } = useQuery({
    queryKey: ["/api/seller/profile"],
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          color: "bg-amber-100 text-amber-800",
          title: "Pending Approval",
          description: "Your documents are being reviewed by our team"
        };
      case "approved":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          color: "bg-green-100 text-green-800",
          title: "Approved",
          description: "Your seller account is fully activated"
        };
      case "rejected":
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          color: "bg-red-100 text-red-800",
          title: "Rejected",
          description: sellerProfile?.rejectionReason || "Please review and resubmit your documents"
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
          color: "bg-gray-100 text-gray-800",
          title: "Documents Required",
          description: "Please submit your business documents to activate your account"
        };
    }
  };

  const statusInfo = getStatusInfo(sellerProfile?.status || "incomplete");

  const hasDocuments = sellerProfile?.businessLogo || 
                      sellerProfile?.shopLicenseImage || 
                      sellerProfile?.ownerCivilIdImage || 
                      sellerProfile?.ownerPhoto;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Store className="h-5 w-5 text-blue-600" />
          <span>Seller Account Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusInfo.icon}
            <div>
              <Badge variant="secondary" className={statusInfo.color}>
                {statusInfo.title}
              </Badge>
              <p className="text-sm text-slate-600 mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              sellerProfile ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {sellerProfile ? <CheckCircle className="h-4 w-4" /> : <span className="text-sm">1</span>}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Account Created</p>
              <p className="text-sm text-slate-600">Basic seller account registered</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              hasDocuments ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
            }`}>
              {hasDocuments ? <CheckCircle className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Documents Submitted</p>
              <p className="text-sm text-slate-600">
                {hasDocuments 
                  ? "Business documents uploaded successfully" 
                  : "Upload your business license, civil ID, and photos"
                }
              </p>
            </div>
            {!hasDocuments && (
              <Link href="/seller-documents">
                <Button size="sm" variant="outline">
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              sellerProfile?.status === "approved" ? "bg-green-100 text-green-600" : 
              sellerProfile?.status === "rejected" ? "bg-red-100 text-red-600" :
              hasDocuments ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
            }`}>
              {sellerProfile?.status === "approved" ? <CheckCircle className="h-4 w-4" /> : 
               sellerProfile?.status === "rejected" ? <XCircle className="h-4 w-4" /> :
               hasDocuments ? <Clock className="h-4 w-4" /> : <span className="text-sm">3</span>}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Admin Review</p>
              <p className="text-sm text-slate-600">
                {sellerProfile?.status === "approved" ? "Documents approved by admin" :
                 sellerProfile?.status === "rejected" ? "Documents rejected - please resubmit" :
                 hasDocuments ? "Under review by admin team" : "Waiting for document submission"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              sellerProfile?.status === "approved" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {sellerProfile?.status === "approved" ? <CheckCircle className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Start Selling</p>
              <p className="text-sm text-slate-600">
                {sellerProfile?.status === "approved" 
                  ? "Your account is active - start adding products!"
                  : "Activate selling privileges after approval"
                }
              </p>
            </div>
            {sellerProfile?.status === "approved" && (
              <Link href="/seller-dashboard">
                <Button size="sm">
                  <Store className="h-3 w-3 mr-1" />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {sellerProfile?.status === "rejected" && (
          <div className="pt-4 border-t">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Documents Rejected</h4>
                  <p className="text-sm text-red-800">
                    {sellerProfile.rejectionReason || "Your documents need to be corrected and resubmitted."}
                  </p>
                </div>
              </div>
            </div>
            <Link href="/seller-documents">
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Resubmit Documents
              </Button>
            </Link>
          </div>
        )}

        {sellerProfile?.status === "pending" && (
          <div className="pt-4 border-t">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">Under Review</h4>
                  <p className="text-sm text-amber-800">
                    Your documents are being reviewed. This typically takes 1-2 business days.
                    You'll receive an email notification once the review is complete.
                  </p>
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <p className="text-xs text-amber-700 font-medium">Need Help?</p>
                    <p className="text-xs text-amber-700">
                      Support: <a href="mailto:support@gmail.com" className="underline">support@gmail.com</a> | 
                      Phone: <a href="tel:12345678" className="underline ml-1">12345678</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasDocuments && (
          <div className="pt-4 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Documents Required</h4>
                  <p className="text-sm text-blue-800">
                    To start selling, please upload your business license, civil ID, and business photos.
                    All documents must be clear and valid.
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-300">
                    <p className="text-xs text-blue-700 font-medium">Need Onboarding Help?</p>
                    <p className="text-xs text-blue-700">
                      Email: <a href="mailto:support@gmail.com" className="underline">support@gmail.com</a> | 
                      Call: <a href="tel:12345678" className="underline ml-1">12345678</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/seller-documents">
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}