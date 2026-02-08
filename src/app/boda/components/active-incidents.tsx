import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Incident {
    id: string;
    bikeId: string;
    description: string;
    severity: 'Minor' | 'Major';
    status: 'Reported' | 'In-Progress';
}

interface ActiveIncidentsProps {
    incidents: Incident[];
}

export function ActiveIncidents({ incidents }: ActiveIncidentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive"/>
            Active Incidents
        </CardTitle>
        <CardDescription>
          Issues that require attention or are being resolved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {incidents.map((incident) => (
            <div key={incident.id} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <p className="font-medium">{incident.description}</p>
                    <p className="text-sm text-muted-foreground">
                        Bike: <span className="font-mono">{incident.bikeId}</span>
                    </p>
                </div>
                <Badge variant={incident.severity === 'Major' ? 'destructive' : 'secondary'}>{incident.severity}</Badge>
            </div>
        ))}
        {incidents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active incidents.</p>
        )}
      </CardContent>
    </Card>
  );
}
