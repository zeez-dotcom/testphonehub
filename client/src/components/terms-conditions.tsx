import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Shield, Users, Store, CheckCircle, XCircle } from "lucide-react";

interface TermsConditionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: "customer" | "seller";
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsConditions({ open, onOpenChange, userType, onAccept, onDecline }: TermsConditionsProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCommunications, setAcceptedCommunications] = useState(false);

  const handleAccept = () => {
    if (acceptedTerms && acceptedPrivacy) {
      onAccept();
      onOpenChange(false);
    }
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  const canProceed = acceptedTerms && acceptedPrivacy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            {userType === "seller" ? (
              <Store className="h-5 w-5 text-blue-600" />
            ) : (
              <Users className="h-5 w-5 text-green-600" />
            )}
            <span>
              {userType === "seller" ? "Seller" : "Customer"} Terms & Conditions
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {/* Warning Notice */}
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Important Notice</p>
                      <p>
                        By creating an account, you agree to comply with all terms and conditions.
                        Failure to accept these terms will prevent account creation.
                      </p>
                      <div className="mt-3 pt-3 border-t border-amber-300">
                        <p className="font-medium mb-1">Need Help?</p>
                        <p className="text-xs">
                          Support: <a href="mailto:support@gmail.com" className="underline font-medium">support@gmail.com</a>
                        </p>
                        <p className="text-xs">
                          Onboarding Assistance: <a href="tel:12345678" className="underline font-medium">12345678</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms Content */}
              <div className="border rounded-lg p-4 bg-white">
                <div className="space-y-6 text-sm">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Terms of Service - PhoneHub Kuwait
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </div>

                  {userType === "seller" ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">1. Seller Requirements</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>Must have valid Kuwait business license and commercial registration</li>
                          <li>Must provide authentic Civil ID and business documentation</li>
                          <li>Must comply with Kuwait consumer protection laws</li>
                          <li>All products must be genuine and properly described</li>
                          <li>Must maintain minimum 4.0 star rating and respond to customer inquiries within 24 hours</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">2. Product Listing Requirements</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>All product images must be clear, authentic photographs of actual items</li>
                          <li>Product descriptions must be accurate and include all relevant specifications</li>
                          <li>Pricing must be competitive and reflect true market value</li>
                          <li>Stock levels must be maintained accurately to prevent overselling</li>
                          <li>Only mobile phones and accessories are permitted on this platform</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">3. Commission & Payments</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>PhoneHub charges 5% commission on all sales</li>
                          <li>Payments are processed within 3-5 business days after delivery confirmation</li>
                          <li>Refunds and disputes are handled according to Kuwait consumer law</li>
                          <li>Sellers are responsible for all applicable taxes and VAT</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">4. Order Fulfillment</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>Orders must be processed within 24 hours of confirmation</li>
                          <li>Delivery within Kuwait must be completed within 2-3 business days</li>
                          <li>Sellers must provide tracking information for all shipments</li>
                          <li>Customer service inquiries must be responded to within 4 hours</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">1. Customer Rights</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>Right to receive authentic products as described</li>
                          <li>Right to return products within 7 days if defective</li>
                          <li>Right to full refund for cancelled orders</li>
                          <li>Right to customer support in Arabic and English</li>
                          <li>Protection under Kuwait Consumer Protection Law</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">2. Payment & Security</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>Secure payment processing through K-Net and major credit cards</li>
                          <li>Cash on delivery available for orders under 500 KWD</li>
                          <li>Personal data is encrypted and never shared with third parties</li>
                          <li>Order history and preferences are stored securely</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">3. Order & Delivery</h4>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                          <li>Orders are processed within 24 hours</li>
                          <li>Free delivery within Kuwait for orders over 50 KWD</li>
                          <li>Same-day delivery available in Kuwait City area</li>
                          <li>Order tracking provided via SMS and email</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <hr className="my-6" />

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Privacy Policy</h4>
                    <ul className="list-disc pl-6 space-y-1 text-slate-700">
                      <li>We collect only necessary information for order processing</li>
                      <li>Personal data is protected according to Kuwait privacy laws</li>
                      <li>Information is never shared with third parties without consent</li>
                      <li>Users can request data deletion at any time</li>
                      <li>Cookies are used only for essential website functionality</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Prohibited Activities</h4>
                    <ul className="list-disc pl-6 space-y-1 text-slate-700">
                      <li>Sale of counterfeit or stolen products</li>
                      <li>Manipulation of reviews or ratings</li>
                      <li>Harassment of other users</li>
                      <li>Violation of intellectual property rights</li>
                      <li>Use of platform for illegal activities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Fixed bottom section with checkboxes and buttons */}
        <div className="flex-shrink-0 border-t pt-4 space-y-4 bg-white">
          {/* Acceptance Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                I have read and agree to the <strong>Terms of Service</strong> and understand
                that violation of these terms may result in account suspension or termination.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
              />
              <label htmlFor="privacy" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                I agree to the <strong>Privacy Policy</strong> and consent to the collection
                and processing of my personal data as described.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="communications"
                checked={acceptedCommunications}
                onCheckedChange={(checked) => setAcceptedCommunications(checked === true)}
              />
              <label htmlFor="communications" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                I agree to receive important notifications about my account and orders via email and SMS.
                <span className="text-slate-500 block mt-1">(Optional - can be changed in settings)</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!canProceed}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept & Create Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}