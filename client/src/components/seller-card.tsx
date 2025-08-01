import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, MapPin, Calendar, Phone, FileText, Eye, User as UserIcon } from "lucide-react";
import type { Seller, User } from "@shared/schema";

interface SellerCardProps {
  seller: User & { 
    businessName?: string; 
    phoneNumber?: string; 
    location?: string;
    sellerStatus?: string;
    shopLicenseNumber?: string;
    ownerCivilId?: string;
    businessAddress?: string;
    whatsappNumber?: string;
    shopLicenseImage?: string;
    ownerCivilIdImage?: string;
  };
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function SellerCard({ seller, onApprove, onReject, showActions = false }: SellerCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-secondary text-secondary-foreground">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">Seller</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
              <Store className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {seller.firstName} {seller.lastName}
              </h3>
              <p className="text-muted-foreground">
                {seller.email}
              </p>
            </div>
          </div>
          {getStatusBadge(seller.sellerStatus || "pending")}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center space-x-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Business:</span>
            <span>{seller.businessName || "Not provided"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Phone:</span>
            <span>{seller.phoneNumber || "Not provided"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Location:</span>
            <span>{seller.location || "Not provided"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Registered:</span>
            <span>{formatDate(seller.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-4 border-t">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Seller Details - Kuwait Compliance</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <p className="text-slate-900">{seller.firstName} {seller.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <p className="text-slate-900">{seller.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Business Name</label>
                    <p className="text-slate-900">{seller.businessName || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <p className="text-slate-900">{seller.phoneNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Shop License Number</label>
                    <p className="text-slate-900">{seller.shopLicenseNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Civil ID</label>
                    <p className="text-slate-900">{seller.ownerCivilId || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">WhatsApp Number</label>
                    <p className="text-slate-900">{seller.whatsappNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Business Address</label>
                    <p className="text-slate-900">{seller.businessAddress || "Not provided"}</p>
                  </div>
                </div>
                
                {/* Document Status Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Kuwait Compliance Documents</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-700">Shop License:</span>
                      <Badge variant={seller.shopLicenseImage ? "secondary" : "outline"}>
                        {seller.shopLicenseImage ? "Uploaded" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-700">Civil ID Copy:</span>
                      <Badge variant={seller.ownerCivilIdImage ? "secondary" : "outline"}>
                        {seller.ownerCivilIdImage ? "Uploaded" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Registration Status</label>
                  <div className="mt-1">
                    {getStatusBadge(seller.sellerStatus || "pending")}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Registration Date</label>
                  <p className="text-slate-900">{formatDate(seller.createdAt)}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {showActions && (
            <>
              <Button
                variant="destructive"
                onClick={onReject}
                size="sm"
              >
                Reject
              </Button>
              <Button
                onClick={onApprove}
                size="sm"
              >
                Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
