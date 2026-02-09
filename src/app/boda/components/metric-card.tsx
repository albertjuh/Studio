
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { useLanguage } from '../lib/i18n';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  valueClassName?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  valueClassName,
  ...props
}: MetricCardProps) {
  const { t } = useLanguage();
  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t(title)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold flex items-center gap-2", valueClassName)}>
          {Icon && <Icon className={cn("h-6 w-6", !valueClassName && "text-muted-foreground")} />}
          <span>{value}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
