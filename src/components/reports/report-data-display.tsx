

import type { ReportDataPayload, ProductionStageLogEntry, RcnOutputToFactoryEntry } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface ReportDataDisplayProps {
  data: ReportDataPayload | null;
}

function renderLogDetails(log: any) { // Using any because of the diverse log structures
    // This function can be expanded to provide more detailed breakdowns for each log type
    switch (log.stage_name) {
        case 'RCN Intake':
            return `From: ${log.supplier_id}, Net Wt: ${log.net_weight_kg} kg`;
        case 'Other Materials Intake':
            return `Item: ${log.item_name}, Qty: ${log.quantity} ${log.unit}`;
        case 'Goods Dispatched':
            return `To: ${log.destination}, Qty: ${log.quantity} ${log.unit}`;
        case 'RCN Output to Factory':
            return `Qty: ${log.quantity_kg} kg, To: ${log.destination_stage}`;
        case 'Steaming Process':
            return `Temp: ${log.steam_temperature_celsius ?? 'N/A'}°C, Duration: ${log.steam_duration_minutes ?? 'N/A'} min`;
        case 'Shelling Process':
            return `Output: ${log.shelled_kernels_weight_kg ?? 'N/A'} kg kernels, ${log.shell_waste_weight_kg ?? 'N/A'} kg CNS`;
        case 'Drying Process':
            return `Method: ${log.drying_method ?? 'N/A'}, Final Moisture: ${log.final_moisture_percent ?? 'N/A'}%`;
        case 'Peeling Process':
            return `Method: ${log.peeling_method ?? 'N/A'}, Efficiency: ${log.peeling_efficiency_percent?.toFixed(1) ?? 'N/A'}%`;
        case 'Machine Grading':
            return `Total Graded: ${log.total_graded_output_kg ?? 'N/A'} kg, Machine: ${log.equipment_id ?? 'N/A'}`;
        case 'Manual Peeling Refinement':
            return `Input: ${log.input_kg} kg, Workers: ${log.number_of_workers}`;
        case 'Packaging':
            return `Packed ${log.packages_produced ?? 'N/A'} ${log.package_type ?? 'units'}`;
        case 'Quality Control (Final)':
            return `Officer: ${log.qc_officer_id}, Certified: ${log.export_certified}`;
        case 'RCN Quality Assessment':
            return `Officer: ${log.qc_officer_id}, Moisture: ${log.moisture_content_percent}%`;
        case 'Equipment Calibration':
            return `Eqpt: ${log.equipment_id}, Result: ${log.result}`;
        default:
            return log.notes || '-';
    }
}

export function ReportDataDisplay({ data }: ReportDataDisplayProps) {
  if (!data) {
    return <p className="text-muted-foreground text-center py-8">No data to display. Apply filters to generate a report.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.totals).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</TableCell>
                  <TableCell className="text-right">{typeof value === 'number' ? value.toLocaleString() : value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item-wise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Dispatched</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.itemWiseSummary.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.item}</TableCell>
                  <TableCell className="text-right">{item.received.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.dispatched.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.produced.toLocaleString()}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableCaption>{data.itemWiseSummary.length === 0 ? "No item summary for this period." : "Summary of item movements and production."}</TableCaption>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production & Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stage / Activity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productionLogs.map((log: any, index: number) => {
                const logDate = log.arrival_datetime || log.dispatch_datetime || log.steam_start_time || log.shell_start_time || log.dry_start_time || log.peel_start_time || log.cs_start_time || log.start_time || log.pack_start_time || log.qc_datetime || log.assessment_datetime || log.calibration_date || log.output_datetime || new Date();
                return (
                    <TableRow key={log.id || index}>
                    <TableCell>{format(new Date(logDate), "PP HH:mm")}</TableCell>
                    <TableCell>{log.stage_name}</TableCell>
                    <TableCell className="text-xs">{renderLogDetails(log)}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
            <TableCaption>{data.productionLogs.length === 0 ? "No activity logs for this period." : "Detailed production and operational entries."}</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    