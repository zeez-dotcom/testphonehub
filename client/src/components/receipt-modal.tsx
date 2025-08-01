import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "@/components/receipt";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from '@shared/schema';

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  receiptData?: {
    seller: {
      businessName: string;
      businessLogo?: string;
      businessEmail?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      businessAddress?: string;
      businessWebsite?: string;
    };
    customer: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    paymentMethod: string;
    amountReceived?: number;
    changeAmount?: number;
  };
}

export function ReceiptModal({ 
  open, 
  onOpenChange, 
  order, 
  receiptData 
}: ReceiptModalProps) {
  const { t } = useLanguage();

  if (!order || !receiptData) {
    return null;
  }

  const data = {
    order,
    ...receiptData
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('receipt')}</DialogTitle>
        </DialogHeader>
        <Receipt data={data} />
      </DialogContent>
    </Dialog>
  );
}

export default ReceiptModal;