
"use client"

import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { useLanguage } from "../lib/i18n";

interface FleetStatusChartProps {
    data: { name: string; value: number; fill: string; }[];
}

export function FleetStatusChart({ data }: FleetStatusChartProps) {
  const { t } = useLanguage();

  const chartConfig = {
    value: {
      label: t('bikes'),
    },
    active: {
        label: t('active'),
        color: "hsl(var(--primary))",
    },
    maintenance: {
        label: t('maintenance'),
        color: "hsl(var(--destructive))",
    },
    inactive: {
        label: t('inactive'),
        color: "hsl(var(--muted))",
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('fleetStatus')}</CardTitle>
        <CardDescription>{t('fleetStatusBreakdown')}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-6">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-full max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="name" />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
