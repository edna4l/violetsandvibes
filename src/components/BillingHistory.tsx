import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Receipt, Calendar, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BillingTransaction {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  invoiceUrl?: string;
  paymentMethod: string;
}

const BillingHistory: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Mock billing history data
  const transactions: BillingTransaction[] = [
    {
      id: 'inv_001',
      date: '2024-08-15',
      amount: 5.0,
      status: 'paid',
      description: '💜 Violets Verified Plus Monthly',
      paymentMethod: '**** 4242'
    },
    {
      id: 'inv_002',
      date: '2024-07-15',
      amount: 5.0,
      status: 'paid',
      description: '💜 Violets Verified Plus Monthly',
      paymentMethod: '**** 4242'
    },
    {
      id: 'inv_003',
      date: '2024-06-15',
      amount: 10.0,
      status: 'paid',
      description: '💜 Violets Verified Premium Monthly',
      paymentMethod: '**** 1234'
    },
    {
      id: 'inv_004',
      date: '2024-05-20',
      amount: 9.99,
      status: 'refunded',
      description: 'Profile Boost Pack',
      paymentMethod: '**** 4242'
    },
    {
      id: 'inv_005',
      date: '2024-05-15',
      amount: 5.0,
      status: 'failed',
      description: '💜 Violets Verified Plus Monthly',
      paymentMethod: '**** 4242'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadInvoice = async (transactionId: string) => {
    setIsLoading(true);
    try {
      // Mock download
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Invoice Downloaded",
        description: `Invoice ${transactionId} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Billing History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatDate(transaction.date)}
                    </span>
                  </div>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
                
                <p className="font-medium mb-1">{transaction.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{transaction.paymentMethod}</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatAmount(transaction.amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(transaction.id)}
                  disabled={isLoading || transaction.status === 'failed'}
                  className="flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Invoice
                </Button>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No billing history available</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total Spent This Year:</span>
            <span className="font-semibold text-gray-900">
              {formatAmount(
                transactions
                  .filter(t => t.status === 'paid' && new Date(t.date).getFullYear() === 2024)
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingHistory;
