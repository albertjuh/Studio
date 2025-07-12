
"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoodsReceivedForm } from "@/components/data-entry/goods-received-form";
import { GoodsDispatchedForm } from "@/components/data-entry/goods-dispatched-form";
import { SteamingProcessForm } from "@/components/data-entry/steaming-process-form";
import { ShellingProcessForm } from "@/components/data-entry/shelling-process-form";
import { DryingProcessForm } from "@/components/data-entry/drying-process-form";
import { PeelingProcessForm } from "@/components/data-entry/peeling-process-form";
import { CalibrationForm } from "@/components/data-entry/calibration-form";
import { RcnQualityAssessmentForm } from "@/components/data-entry/rcn-quality-assessment-form";
import { MachineGradingForm } from "@/components/data-entry/machine-grading-form";
import { ManualPeelingRefinementForm } from "@/components/data-entry/manual-peeling-refinement-form";
import { QualityControlFinalForm } from "@/components/data-entry/quality-control-final-form";
import { PackagingForm } from "@/components/data-entry/packaging-form";
import { OtherMaterialsIntakeForm } from "@/components/data-entry/other-materials-intake-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle } from 'lucide-react';
import type { DataEntryFormType } from "@/types";
import { DATA_ENTRY_FORM_TYPES } from "@/lib/constants"; 

// Constructing the config dynamically from constants
const DATA_ENTRY_FORMS_CONFIG = DATA_ENTRY_FORM_TYPES.map(formType => {
  let component: React.ElementType | null = null;
  switch (formType.value) {
    case 'rcn_intake':
      component = GoodsReceivedForm;
      break;
    case 'other_materials_intake':
      component = OtherMaterialsIntakeForm;
      break;
    case 'goods_dispatched':
      component = GoodsDispatchedForm;
      break;
    case 'steaming_process':
      component = SteamingProcessForm;
      break;
    case 'shelling_process':
      component = ShellingProcessForm;
      break;
    case 'drying_process':
      component = DryingProcessForm;
      break;
    case 'peeling_process':
      component = PeelingProcessForm;
      break;
    case 'calibration':
      component = CalibrationForm;
      break;
    case 'quality_control_rcn':
      component = RcnQualityAssessmentForm;
      break;
    case 'machine_grading':
      component = MachineGradingForm;
      break;
    case 'manual_peeling_refinement':
      component = ManualPeelingRefinementForm;
      break;
    case 'quality_control_final':
      component = QualityControlFinalForm;
      break;
    case 'packaging':
      component = PackagingForm;
      break;
    default:
      component = null; // Placeholder for forms not yet implemented
  }
  return {
    ...formType, // value, label, icon, group from constants
    description: getFormDescription(formType.value), // Helper function for descriptions
    component,
  };
});

function getFormDescription(formValue: DataEntryFormType): string {
  switch (formValue) {
    case 'rcn_intake': return 'Log incoming RCN from suppliers or internal RCN movement from the warehouse to the factory floor.';
    case 'other_materials_intake': return 'Log intake of other materials like packaging, diesel, spare parts etc.';
    case 'calibration': return 'Log equipment calibration activities, parameters checked, and results.';
    case 'quality_control_rcn': return 'Perform and log detailed quality assessment for received RCN.';
    case 'steaming_process': return 'Record details of the RCN steaming process, including times, temperatures, and weights.';
    case 'shelling_process': return 'Log shelling operations, kernel output, waste, machine throughput, and operator details.';
    case 'drying_process': return 'Track kernel drying parameters, moisture loss, methods, and quality checks.';
    case 'peeling_process': return 'Record peeling efficiency, waste, methods (manual/auto), and worker/machine details.';
    case 'machine_grading': return 'Log machine-based grading (sizing/sorting), outputs per grade, and machine settings.';
    case 'manual_peeling_refinement': return 'Log manual peeling refinement activities, often post-machine peeling.';
    case 'packaging': return 'Record packaging details, including batch codes, weights, package types, and production/expiry dates.';
    case 'quality_control_final': return 'Log final quality control checks for packaged products before dispatch.';
    case 'goods_dispatched': return 'Log all items leaving the factory (finished products, by-products, waste, etc.).';
    case 'other_production_stage_placeholder': return 'This form is a placeholder for other detailed production stages under development.';
    default: return 'Form for selected stage.';
  }
}


export default function DataEntryPage() {
  const [selectedForm, setSelectedForm] = useState<DataEntryFormType>(DATA_ENTRY_FORMS_CONFIG[0].value);

  const CurrentForm = DATA_ENTRY_FORMS_CONFIG.find(f => f.value === selectedForm)?.component;
  const currentFormConfig = DATA_ENTRY_FORMS_CONFIG.find(f => f.value === selectedForm);

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Data Entry</h2>
      
      <div className="mb-6">
        <Select onValueChange={(value) => setSelectedForm(value as DataEntryFormType)} value={selectedForm}>
          <SelectTrigger className="w-full md:w-[500px] text-base py-6">
            <SelectValue placeholder="Select a data entry form" />
          </SelectTrigger>
          <SelectContent>
            {DATA_ENTRY_FORMS_CONFIG.map((formConfig) => {
              const Icon = formConfig.icon;
              return (
                <SelectItem key={formConfig.value} value={formConfig.value} >
                  <div className="flex items-center gap-3 py-1">
                    <Icon className="h-5 w-5 text-primary" />
                    <span>{formConfig.label}</span>
                    {!formConfig.component && <span className="ml-auto text-xs text-muted-foreground">(Dev)</span>}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {currentFormConfig && (
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              {currentFormConfig.icon && <currentFormConfig.icon className="h-7 w-7 text-primary" />}
              <CardTitle className="text-2xl">{currentFormConfig.label}</CardTitle>
            </div>
            <CardDescription className="text-md">{currentFormConfig.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {CurrentForm ? <CurrentForm /> : (
              <div className="text-center py-10 text-muted-foreground">
                <HelpCircle className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg">This form is under development.</p>
                <p>Please check back later or select another form.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
    
