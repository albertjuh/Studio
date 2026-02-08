
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
}

export function RecentPayments({ payments }: RecentPaymentsProps) {
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
                <TableCell>
                  {formatDistanceToNow(new Date(payment.date), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  TZS {payment.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
