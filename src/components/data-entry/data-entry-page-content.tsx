
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import type { DataEntryFormType } from "@/types";
import { DATA_ENTRY_FORM_TYPES } from "@/lib/constants";

// Import all the forms
import { GoodsReceivedForm } from "@/components/data-entry/goods-received-form";
import { GoodsDispatchedForm } from "@/components/data-entry/goods-dispatched-form";
import { RcnQualityAssessmentForm } from "@/components/data-entry/rcn-quality-assessment-form";
import { OtherMaterialsIntakeForm } from "@/components/data-entry/other-materials-intake-form";
import { RcnSizingCalibrationForm } from "@/components/data-entry/rcn-sizing-calibration-form";
import { VacuumBagIntakeForm } from "./vacuum-bag-intake-form";
import { PackagingForm } from "./packaging-form";
import { NyangaProductionLogForm } from "./nyanga-production-log-form";
import { AddNyangaWorkerForm } from "./add-nyanga-worker-form";


// Helper to get form descriptions
function getFormDescription(formValue: DataEntryFormType): string {
    switch (formValue) {
        case 'rcn_intake': return 'Log incoming/outgoing RCN from the main warehouse.';
        case 'other_materials_intake': return 'Log new material purchases or internal transfers to production.';
        case 'goods_dispatched': return 'Log all items leaving the factory.';
        case 'vacuum_bag_intake': return 'Register a new batch of vacuum bags received from a supplier.';
        case 'rcn_sizing_calibration': return 'Log RCN sizing operations and grade outputs.';
        case 'quality_control_rcn': return 'Perform and log quality assessment for received RCN.';
        case 'packaging': return 'Log the final packaging of finished cashew kernels.';
        case 'nyanga_production_log': return 'Log daily production totals for the Nyanga external peeling team.';
        case 'add_nyanga_worker': return 'Add a new worker to the Nyanga team list.';
        default: return 'Form for selected stage.';
    }
}

// Map form values to their respective components
const formComponentMap: Record<string, React.ElementType | null> = {
  rcn_intake: GoodsReceivedForm,
  other_materials_intake: OtherMaterialsIntakeForm,
  goods_dispatched: GoodsDispatchedForm,
  vacuum_bag_intake: VacuumBagIntakeForm,
  rcn_sizing_calibration: RcnSizingCalibrationForm,
  quality_control_rcn: RcnQualityAssessmentForm,
  packaging: PackagingForm,
  nyanga_production_log: NyangaProductionLogForm,
  add_nyanga_worker: AddNyangaWorkerForm,
};


export default function DataEntryPageContent() {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<DataEntryFormType | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    // Reset dirty state when dialog is closed
    if (!openDialog) {
      setIsDirty(false);
    }
  }, [openDialog]);

  const groupedForms = useMemo(() => (DATA_ENTRY_FORM_TYPES as any).reduce((acc: any, formType: any) => {
    const group = formType.group || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(formType);
    return acc;
  }, {} as Record<string, typeof DATA_ENTRY_FORM_TYPES>), []);


  const handleCardClick = (formValue: DataEntryFormType) => {
      setOpenDialog(formValue);
  };

  const handleOpenChange = (formType: DataEntryFormType) => (isOpen: boolean) => {
    if (!isOpen && isDirty) {
        setShowConfirmDialog(true);
    } else {
      setOpenDialog(null);
    }
  };

  const handleClose = () => {
    setIsDirty(false);
    setOpenDialog(null);
  };
  
  const proceedToClose = () => {
      handleClose();
      setShowConfirmDialog(false);
  };

  const cancelClose = () => {
      setShowConfirmDialog(false);
  };

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
    // Pass handlers to each form
    return <FormComponent onFormSubmit={handleClose} onFormDirtyChange={setIsDirty} />;
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Data Entry</h2>
      
        {Object.entries(groupedForms).map(([groupName, forms]: [string, any[]]) => (
          <div key={groupName} className="mb-8">
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-4 border-b pb-2">{groupName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {forms.map((formConfig) => {
                const Icon = formConfig.icon;

                return (
                    <Dialog key={formConfig.value} open={openDialog === formConfig.value} onOpenChange={handleOpenChange(formConfig.value)}>
                      <Card 
                        onClick={() => handleCardClick(formConfig.value)}
                        className="flex flex-col justify-center items-center text-center p-6 hover:bg-muted hover:border-primary/50 transition-all cursor-pointer h-40"
                      >
                          <Icon className="h-8 w-8 mb-2 text-primary" />
                          <p className="font-semibold text-foreground">{formConfig.label}</p>
                      </Card>
                      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-0">
                          <DialogTitle className="flex items-center gap-2 text-xl">
                            <Icon className="h-6 w-6 text-primary" />
                            {formConfig.label}
                          </DialogTitle>
                          <DialogDescription>
                            {getFormDescription(formConfig.value)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                          {renderForm(formConfig.value)}
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
              })}
            </div>
          </div>
        ))}
         <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes that will be lost. Are you sure you want to close the form?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={cancelClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={proceedToClose}>Close Anyway</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

    