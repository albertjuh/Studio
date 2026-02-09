
"use client";

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
import { useLanguage } from "../lib/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { t } = useLanguage();
  const canVerify = userRole === 'owner' || userRole === 'supervisor';

  return (
    <>
      <CardHeader>
        <CardTitle>{t('recentPayments')}</CardTitle>
        <CardDescription>
          {t('recentPaymentsLog')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('rider')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                {canVerify && <TableHead className="text-right">{t('actions')}</TableHead>}
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
                      {t(payment.status.toLowerCase())}
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
                          {t('verify')}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canVerify ? 5 : 4} className="h-24 text-center">
                    {t('noPayments')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </>
  );
}
