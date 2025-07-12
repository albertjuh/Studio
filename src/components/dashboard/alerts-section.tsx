
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface AlertsDialogProps {
  alerts: string[];
}

export function AlertsDialog({ alerts }: AlertsDialogProps) {
    if (!alerts || alerts.length === 0) {
        return null;
    }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Operational Alerts
        </DialogTitle>
        <DialogDescription>
            Review the following alerts that require your attention.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4">
        {alerts.map((alert, index) => (
          <Alert key={index} variant="destructive" className="bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alert {index + 1}</AlertTitle>
            <AlertDescription>{alert}</AlertDescription>
          </Alert>
        ))}
      </div>
    </DialogContent>
  );
}
