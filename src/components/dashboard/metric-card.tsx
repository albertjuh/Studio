
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  description?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
  chartData?: any[]; // Accept chartData to prevent it from passing to DOM
}

const MetricCard = React.forwardRef<
  HTMLDivElement,
  MetricCardProps & React.HTMLAttributes<HTMLDivElement>
>(({
  title,
  value,
  unit,
  icon: Icon,
  description,
  change,
  changeType = 'neutral',
  className,
  chartData, // Destructure chartData so it's not in `...props`
  ...props
}, ref) => {
  return (
    <Card ref={ref} className={cn("shadow-lg", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-5 w-5" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </div>
        {description && (
          <p className={cn("text-xs text-muted-foreground pt-1")}>{description}</p>
        )}
        {change && (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              changeType === 'positive' && 'text-green-500',
              changeType === 'negative' && 'text-destructive'
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
});
MetricCard.displayName = "MetricCard";

export { MetricCard };
