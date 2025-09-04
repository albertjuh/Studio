import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  description?: string;
  change?: number; // Change is now a number for percentage
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
  chartData?: { date: string, value: number }[];
  chartColor?: string;
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
  changeType: explicitChangeType,
  className,
  chartData,
  chartColor = 'hsl(var(--primary))',
  ...props
}, ref) => {

  const getChangeType = () => {
    if (explicitChangeType) return explicitChangeType;
    if (change === undefined || change === 0) return 'neutral';
    return change > 0 ? 'positive' : 'negative';
  };

  const changeType = getChangeType();
  
  const formattedChange = change !== undefined ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : null;

  return (
    <Card ref={ref} className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-5 w-5" />}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div>
            <div className="text-2xl font-bold">
            {value}
            {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
            </div>
            {description && (
            <p className={cn("text-xs opacity-80 pt-1")}>{description}</p>
            )}
        </div>
        
        <div className="flex justify-between items-end mt-2">
            {formattedChange ? (
                <div className="flex items-center gap-1">
                    {changeType === 'positive' && <ArrowUp className="h-4 w-4 text-green-500" />}
                    {changeType === 'negative' && <ArrowDown className="h-4 w-4 text-destructive" />}
                    <p
                        className={cn(
                        "text-xs",
                        changeType === 'positive' && 'text-green-500',
                        changeType === 'negative' && 'text-destructive',
                        changeType === 'neutral' && 'text-muted-foreground'
                        )}
                    >
                        {formattedChange}
                    </p>
                </div>
            ) : <div />}

            {chartData && chartData.length > 1 && (
                <div className="w-24 h-10 -mb-2 -mr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id={`color-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#color-${title})`}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
});
MetricCard.displayName = "MetricCard";

export { MetricCard };
