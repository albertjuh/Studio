
import {
  Card,
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
import { formatDistanceToNow } from 'date-fns';
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

  const sortedPayments = [...payments].sort((a, b) => {
    // If status is different, 'Pending' comes first.
    if (a.status !== b.status) {
      return a.status === 'Pending' ? -1 : 1;
    }
    // If status is the same, sort by date descending (most recent first).
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <Card>
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
            {sortedPayments.map((payment) => (
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
                <TableCell>
                  {formatDistanceToNow(new Date(payment.date), { addSuffix: true })}
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
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
