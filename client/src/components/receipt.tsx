import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Printer, Download } from 'lucide-react';
import type { Order } from '@shared/schema';

interface ReceiptData {
  order: Order;
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
}

interface ReceiptProps {
  data: ReceiptData;
  onPrint?: () => void;
  onDownload?: () => void;
}

export function Receipt({ data, onPrint, onDownload }: ReceiptProps) {
  const { t, formatCurrency, language, isRTL } = useLanguage();
  
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Create a blob with the receipt HTML and download it
      const receiptElement = document.getElementById('receipt-content');
      if (receiptElement) {
        const blob = new Blob([receiptElement.outerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${data.order.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const total = parseFloat(data.order.total);

  return (
    <div className="max-w-md mx-auto">
      {/* Print/Download Actions */}
      <div className="flex gap-2 mb-4 no-print">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          {t('print_receipt')}
        </Button>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t('download')}
        </Button>
      </div>

      {/* Receipt Content */}
      <Card id="receipt-content" className={`receipt-container ${language === 'ar' ? 'arabic' : ''} p-6 text-sm`}>
        {/* Header with Logo */}
        <div className="text-center mb-4">
          {data.seller.businessLogo && (
            <img 
              src={data.seller.businessLogo} 
              alt={data.seller.businessName}
              className="h-16 mx-auto mb-2 object-contain"
            />
          )}
          <h1 className="text-lg font-bold">{data.seller.businessName}</h1>
          {data.seller.businessAddress && (
            <p className="text-xs text-muted-foreground">{data.seller.businessAddress}</p>
          )}
          <div className="text-xs text-muted-foreground">
            {data.seller.phoneNumber && <p>{t('phone')}: {data.seller.phoneNumber}</p>}
            {data.seller.whatsappNumber && <p>{t('whatsapp_number')}: {data.seller.whatsappNumber}</p>}
            {data.seller.businessEmail && <p>{t('email')}: {data.seller.businessEmail}</p>}
            {data.seller.businessWebsite && <p>{t('website')}: {data.seller.businessWebsite}</p>}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Receipt Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">
            {t('receipt')} / {t('receipt_header')}
          </h2>
          <div className="text-xs text-muted-foreground mt-2">
            <p>{t('order_id')}: {data.order.id}</p>
            <p>{t('date')}: {new Date(data.order.createdAt!).toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Customer Info */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{t('customer_info')}</h3>
          <div className="text-xs">
            {data.customer.firstName || data.customer.lastName ? (
              <p>{t('customer_name')}: {`${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim()}</p>
            ) : null}
            {data.customer.email && <p>{t('email')}: {data.customer.email}</p>}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Items */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{t('item_details')}</h3>
          <div className="space-y-2">
            {data.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    {item.quantity} x {formatCurrency(item.price)}
                  </p>
                </div>
                <p className="font-medium">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          <div className="flex justify-between font-bold text-base">
            <span>{t('total')}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Payment Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('payment_method')}</span>
            <span>{t(data.paymentMethod as any) || data.paymentMethod}</span>
          </div>
          
          {data.amountReceived && (
            <div className="flex justify-between">
              <span>{t('amount_received')}</span>
              <span>{formatCurrency(data.amountReceived)}</span>
            </div>
          )}
          
          {data.changeAmount && data.changeAmount > 0 && (
            <div className="flex justify-between">
              <span>{t('change_due')}</span>
              <span>{formatCurrency(data.changeAmount)}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p className="mb-2">{t('thank_you')}</p>
          <p className="mb-2">{t('visit_again')}</p>
          <p>{t('powered_by')} {t('phonehub')} - PhoneHub</p>
        </div>
      </Card>
    </div>
  );
}

export default Receipt;