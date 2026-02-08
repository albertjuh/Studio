"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface FleetStatusChartProps {
    data: { name: string; value: number; fill: string; }[];
}

export function FleetStatusChart({ data }: FleetStatusChartProps) {
  const chartConfig = {
    value: {
      label: "Bikes",
    },
    active: {
        label: "Active",
        color: "hsl(var(--primary))",
    },
    maintenance: {
        label: "Maintenance",
        color: "hsl(var(--destructive))",
    },
    inactive: {
        label: "Inactive",
        color: "hsl(var(--muted-foreground))",
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Status</CardTitle>
        <CardDescription>Breakdown of bikes by current status.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <XAxis type="number" dataKey="value" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
