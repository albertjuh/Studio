import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CalendarDays } from "lucide-react";
import type { DailyAiSummary } from "@/types"; // Using DailyAiSummary as a generic structure for now

interface AiSummaryCardProps {
  summaryData: DailyAiSummary;
  className?: string;
}

export function AiSummaryCard({ summaryData, className }: AiSummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Generated Summary
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <CalendarDays className="h-3 w-3" />
          For Date: {new Date(summaryData.date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold text-foreground">Key Summary:</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summaryData.summary}</p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Actionable Insights:</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summaryData.insights}</p>
        </div>
      </CardContent>
      {summaryData.rawInventoryChanges && (
        <CardFooter className="text-xs text-muted-foreground border-t pt-3">
          <details>
            <summary>Raw Data Used (Inventory)</summary>
            <p className="mt-1 whitespace-pre-wrap">{summaryData.rawInventoryChanges}</p>
          </details>
        </CardFooter>
      )}
       {summaryData.rawProductionHighlights && (
        <CardFooter className="text-xs text-muted-foreground border-t pt-3">
          <details>
            <summary>Raw Data Used (Production)</summary>
            <p className="mt-1 whitespace-pre-wrap">{summaryData.rawProductionHighlights}</p>
          </details>
        </CardFooter>
      )}
    </Card>
  );
}
