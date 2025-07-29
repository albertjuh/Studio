
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import type { DataEntryFormType } from "@/types";
import { DATA_ENTRY_FORM_TYPES } from "@/lib/constants";

// Import all the forms
import { GoodsReceivedForm } from "@/components/data-entry/goods-received-form";
import { GoodsDispatchedForm } from "@/components/data-entry/goods-dispatched-form";
import { SteamingProcessForm } from "@/components/data-entry/steaming-process-form";
import { ShellingProcessForm } from "@/components/data-entry/shelling-process-form";
import { DryingProcessForm } from "@/components/data-entry/drying-process-form";
import { PeelingProcessForm } from "@/components/data-entry/peeling-process-form";
import { EquipmentCalibrationForm } from "@/components/data-entry/calibration-form";
import { RcnQualityAssessmentForm } from "@/components/data-entry/rcn-quality-assessment-form";
import { MachineGradingForm } from "@/components/data-entry/machine-grading-form";
import { ManualPeelingRefinementForm } from "@/components/data-entry/manual-peeling-refinement-form";
import { QualityControlFinalForm } from "@/components/data-entry/quality-control-final-form";
import { PackagingForm } from "@/components/data-entry/packaging-form";
import { OtherMaterialsIntakeForm } from "@/components/data-entry/other-materials-intake-form";
import { RcnSizingCalibrationForm } from "@/components/data-entry/rcn-sizing-calibration-form";

// Helper to get form descriptions
function getFormDescription(formValue: DataEntryFormType): string {
    switch (formValue) {
        case 'rcn_intake': return 'Log incoming/outgoing RCN from the main warehouse.';
        case 'other_materials_intake': return 'Log intake of packaging, diesel, spare parts etc.';
        case 'equipment_calibration': return 'Log equipment calibration activities and results.';
        case 'rcn_sizing_calibration': return 'Log RCN sizing operations and grade outputs.';
        case 'quality_control_rcn': return 'Perform and log quality assessment for received RCN.';
        case 'steaming_process': return 'Record RCN steaming process details.';
        case 'shelling_process': return 'Log shelling operations, kernel output, and waste.';
        case 'drying_process': return 'Track kernel drying parameters and moisture loss.';
        case 'peeling_process': return 'Record peeling efficiency and waste.';
        case 'machine_grading': return 'Log machine-based grading and outputs per grade.';
        case 'manual_peeling_refinement': return 'Log manual peeling refinement activities.';
        case 'packaging': return 'Record packaging details, batch codes, and weights.';
        case 'quality_control_final': return 'Log final QC checks for packaged products.';
        case 'goods_dispatched': return 'Log all items leaving the factory.';
        default: return 'Form for selected stage.';
    }
}


// Map form values to their respective components
const formComponentMap: Record<DataEntryFormType, React.ElementType | null> = {
  rcn_intake: GoodsReceivedForm,
  other_materials_intake: OtherMaterialsIntakeForm,
  goods_dispatched: GoodsDispatchedForm,
  steaming_process: SteamingProcessForm,
  shelling_process: ShellingProcessForm,
  drying_process: DryingProcessForm,
  peeling_process: PeelingProcessForm,
  equipment_calibration: EquipmentCalibrationForm,
  rcn_sizing_calibration: RcnSizingCalibrationForm,
  quality_control_rcn: RcnQualityAssessmentForm,
  machine_grading: MachineGradingForm,
  manual_peeling_refinement: ManualPeelingRefinementForm,
  quality_control_final: QualityControlFinalForm,
  packaging: PackagingForm,
  // Add any new forms here
};


export default function DataEntryPage() {
  const [openDialog, setOpenDialog] = useState<DataEntryFormType | null>(null);

  const groupedForms = DATA_ENTRY_FORM_TYPES.reduce((acc, formType) => {
    const group = formType.group || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(formType);
    return acc;
  }, {} as Record<string, typeof DATA_ENTRY_FORM_TYPES>);

  const renderForm = (formValue: DataEntryFormType) => {
    const FormComponent = formComponentMap[formValue];
    if (!FormComponent) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <HelpCircle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">This form is under development.</p>
          <p>Please check back later.</p>
        </div>
      );
    }
    return <FormComponent />;
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Data Entry</h2>
      
      {Object.entries(groupedForms).map(([groupName, forms]) => (
        <div key={groupName} className="mb-8">
          <h3 className="text-xl font-semibold tracking-tight text-foreground mb-4 border-b pb-2">{groupName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {forms.map((formConfig) => {
              const Icon = formConfig.icon;
              return (
                <Dialog key={formConfig.value} open={openDialog === formConfig.value} onOpenChange={(isOpen) => setOpenDialog(isOpen ? formConfig.value : null)}>
                  <DialogTrigger asChild>
                    <Card className="flex flex-col justify-center items-center text-center p-6 hover:bg-muted hover:border-primary/50 transition-all cursor-pointer h-40">
                      <Icon className="h-8 w-8 mb-2 text-primary" />
                      <p className="font-semibold text-foreground">{formConfig.label}</p>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <Icon className="h-6 w-6 text-primary" />
                        {formConfig.label}
                      </DialogTitle>
                      <DialogDescription>
                        {getFormDescription(formConfig.value)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto pr-4 -mr-4">
                      {renderForm(formConfig.value)}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
