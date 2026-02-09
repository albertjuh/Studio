
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface Payment {
    id: string;
    riderName: string;
    amount: number;
    date: string;
    status: 'Verified' | 'Pending';
    note?: string;
}

interface RecentPaymentsProps {
    payments: Payment[];
    userRole?: 'owner' | 'supervisor' | 'rider';
    onVerify?: (paymentId: string) => void;
}

export function RecentPayments({ payments, userRole, onVerify }: RecentPaymentsProps) {
  const canVerify = userRole === 'owner' || userRole === 'supervisor';

  return (
    <>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
        <CardDescription>
          A log of the most recent payments collected from riders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {canVerify && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium">{payment.riderName}</div>
                  {payment.note && <div className="text-xs text-muted-foreground">{payment.note}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={payment.status === 'Verified' ? 'default' : 'secondary'}>
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {differenceInHours(new Date(), new Date(payment.date)) < 24
                    ? formatDistanceToNow(new Date(payment.date), { addSuffix: true })
                    : format(new Date(payment.date), 'PP p')}
                </TableCell>
                <TableCell className="text-right font-mono">
                  TZS {payment.amount.toLocaleString()}
                </TableCell>
                {canVerify && (
                    <TableCell className="text-right">
                        {payment.status === 'Pending' && onVerify && (
                            <Button variant="outline" size="sm" onClick={() => onVerify(payment.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify
                            </Button>
                        )}
                    </TableCell>
                )}
              </TableRow>
            ))}
            {payments.length === 0 && (
                <TableRow>
                    <TableCell colSpan={canVerify ? 5 : 4} className="h-24 text-center">
                        No payments to display.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
