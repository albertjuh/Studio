

import type { CALIBRATION_RESULTS, DRYING_METHODS, PEELING_METHODS, QUALITY_CHECK_STATUSES, RCN_VISUAL_QUALITY_GRADES, SHIFT_OPTIONS, SIZE_CATEGORIES, YES_NO_OPTIONS, CALIBRATION_PARAMETERS, DISPATCH_TYPES, PACKAGE_TYPES, RCN_OUTPUT_DESTINATIONS, RCN_SIZE_GRADES, DISPATCH_CATEGORIES, FINISHED_KERNEL_GRADES } from '@/lib/constants';

// General Types
export interface AppNotification {
  id: string;
  message: string;
  read: boolean;
  timestamp: any; // Allow flexible timestamp type
  link?: string; // Add link for navigation
}

// --- NEW UNIFIED INVENTORY MODEL ---
export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    category: string;
    unit: string;
    lastUpdated: string; // ISO string for client compatibility
    price?: number;
    description?: string;
    sku?: string;
    supplier?: string;
    location?: string;
}

export interface InventoryLog {
    id: string;
    itemId: string;
    itemName?: string; // Added for convenience
    itemUnit?: string; // Added for convenience
    action: 'add' | 'remove' | 'update' | 'create';
    quantity: number;
    previousQuantity?: number;
    timestamp: string; // ISO string for client compatibility
    user: string;
    notes?: string;
}


// --- FORM VALUE TYPES (Still needed for form handling) ---
export interface RcnIntakeEntry {
  transaction_type: "intake";
  intake_batch_id: string;
  item_name: string; // Should always be "Raw Cashew Nuts"
  gross_weight_kg: number;
  tare_weight_kg?: number;
  supplier_id: string;
  arrival_datetime: Date;
  // RCN Specific fields
  moisture_content_percent?: number;
  foreign_matter_percent?: number;
  visual_defects_percent?: number;
  visual_quality_grade?: typeof RCN_VISUAL_QUALITY_GRADES[number];
  truck_license_plate?: string;
  receiver_id: string;
  supervisor_id: string;
  notes?: string;
}

export interface OtherMaterialsIntakeFormValues {
  intake_batch_id?: string;
  item_name: string; 
  transaction_type: 'intake' | 'correction';
  quantity: number;
  unit: string;
  supplier_id?: string;
  arrival_datetime: Date;
  receiver_id: string;
  supervisor_id: string;
  notes?: string;
}

export interface DispatchedItem {
  item_name: string;
  quantity: number;
  unit: string;
}

export interface GoodsDispatchedFormValues {
  dispatch_batch_id?: string;
  dispatched_items: DispatchedItem[];
  destination: string;
  dispatch_type?: typeof DISPATCH_TYPES[number];
  dispatcher_id: string;
  dispatch_datetime: Date;
  document_reference?: string;
  notes?: string;
}

// Production & other forms remain largely the same for now
// as they don't directly map to the simple inventory model
// but their actions might create/update inventory items.
export interface RcnOutputToFactoryEntry {
  transaction_type: "output";
  output_batch_id: string;
  linked_rcn_intake_batch_id: string; 
  output_datetime: Date;
  quantity_kg: number;
  destination_stage?: typeof RCN_OUTPUT_DESTINATIONS[number];
  authorized_by_id: string;
  notes?: string;
}

export interface RcnSizingGradeOutput {
  grade: typeof RCN_SIZE_GRADES[number];
  weight_kg: number;
}
export interface RcnSizingCalibrationFormValues {
    sizing_batch_id: string;
    linked_rcn_batch_id: string;
    sizing_datetime: Date;
    input_weight_kg: number;
    total_output_weight_kg: number;
    grade_outputs: RcnSizingGradeOutput[];
    machine_id: string;
    supervisor_id: string;
    notes?: string;
}

export interface SteamingProcessFormValues {
  steam_batch_id: string;
  linked_intake_batch_id: string;
  steam_start_time: Date;
  steam_end_time: Date;
  steam_temperature_celsius?: number;
  steam_pressure_psi?: number;
  weight_before_steam_kg: number;
  weight_after_steam_kg: number;
  equipment_id?: string;
  supervisor_id: string;
  notes?: string;
}

export interface ShellingMachineThroughput {
  machine_id: string;
  processed_kg: number;
}
export interface ShellingProcessFormValues {
  shell_process_id: string;
  lot_number: string;
  linked_steam_batch_id: string;
  shell_start_time: Date;
  shell_end_time: Date;
  steamed_weight_input_kg: number;
  shelled_kernels_weight_kg: number;
  shell_waste_weight_kg?: number;
  broken_kernels_weight_kg?: number;
  machine_throughputs?: ShellingMachineThroughput[];
  operator_id: string;
  supervisor_id: string;
  notes?: string;
}

export interface DryingProcessFormValues {
  linked_lot_number: string;
  dry_start_time: Date;
  dry_end_time: Date;
  wet_kernel_weight_kg: number;
  dry_kernel_weight_kg?: number;
  drying_temperature_celsius?: number;
  final_moisture_percent?: number;
  drying_method?: typeof DRYING_METHODS[number];
  weather_conditions?: string;
  equipment_id?: string;
  quality_check_status?: typeof QUALITY_CHECK_STATUSES[number];
  supervisor_id: string;
  notes?: string;
}

export interface PeelingProcessFormValues {
  linked_lot_number: string;
  peel_start_time: Date;
  peel_end_time: Date;
  dried_kernel_input_kg: number;
  peeled_kernels_kg?: number;
  peel_waste_kg?: number;
  defective_kernels_kg?: number;
  peeling_method?: typeof PEELING_METHODS[number];
  workers_assigned_count?: number;
  machine_id?: string;
  shift?: typeof SHIFT_OPTIONS[number];
  supervisor_id: string;
  notes?: string;
}

export interface MachineGradingSizeDistribution {
  size_category: typeof SIZE_CATEGORIES[number];
  weight_kg: number;
}
export interface MachineGradingFormValues {
  linked_lot_number: string;
  cs_start_time: Date;
  cs_end_time: Date;
  peeled_input_kg: number;
  whole_kernels_kg?: number;
  broken_pieces_kg?: number;
  dust_powder_kg?: number;
  detailed_size_distribution?: MachineGradingSizeDistribution[];
  vibration_level?: number;
  screen_size?: string;
  feed_rate_kg_hr?: number;
  machine_id: string;
  settings_profile?: string;
  supervisor_id: string;
  notes?: string;
}

export interface ManualPeelingRefinementFormValues {
  linked_lot_number: string;
  start_time: Date;
  end_time: Date;
  input_kg: number;
  peeled_kg?: number;
  waste_kg?: number;
  number_of_workers?: number;
  supervisor_id: string;
  notes?: string;
}

export interface PackedItem {
  kernel_grade: string;
  number_of_packs: number;
}

export interface PackagingFormValues {
  linked_lot_number: string;
  pack_start_time: Date;
  pack_end_time: Date;
  
  packed_items: PackedItem[];
  total_packs_produced: number; // The sum of number_of_packs for all items

  damaged_pouches?: number;

  production_date: Date;
  packaging_line_id?: string;
  sealing_machine_id?: string;
  shift?: typeof SHIFT_OPTIONS[number];
  supervisor_id: string;
  notes?: string;
}

export interface CalibrationFormValues {
  calibration_log_id: string; 
  equipment_id: string; 
  calibration_date: Date;
  parameter_checked: string;
  result: typeof CALIBRATION_RESULTS[number];
  next_due_date?: Date;
  calibrated_by_id: string; 
  supervisor_id: string;
  notes?: string;
}
export interface RcnQualityAssessmentFormValues {
  qa_rcn_batch_id: string;
  linked_intake_batch_id: string;
  assessment_datetime: Date;
  sample_weight_kg: number;
  moisture_content_percent: number;
  foreign_matter_percent: number;
  defective_nuts_percent: number;
  nut_count_per_kg?: number;
  visual_grade_assigned?: typeof RCN_VISUAL_QUALITY_GRADES[number];
  qc_officer_id: string;
  notes?: string;
}
export interface QualityControlFinalFormValues {
  linked_lot_number: string;
  qc_datetime: Date;
  qc_officer_id: string;
  sample_size_kg: number;
  moisture_content_final_percent?: number;
  foreign_matter_final_percent?: number;
  aflatoxin_level_ppb?: number;
  ecoli_result?: string;
  salmonella_result?: string;
  export_certified?: typeof YES_NO_OPTIONS[number];
  domestic_approved?: typeof YES_NO_OPTIONS[number];
  rejection_reason?: string;
  supervisor_id: string;
  notes?: string;
}

// Daily AI Summary
export interface DailyAiSummary {
  id: string;
  date: string;
  summary: string;
  insights: string;
  rawInventoryChanges?: string;
  rawProductionHighlights?: string;
  created_at?: string;
}

// Reports
export interface ReportFilterState {
  startDate?: Date;
  endDate?: Date;
  reportType?: string;
}

export interface ReportDataPayload {
  totals: {
    totalGoodsReceived: number;
    totalGoodsDispatched: number;
    totalProductionOutput: number;
    netInventoryChange: number;
    unit: string;
  };
  itemWiseSummary: Array<{
    item: string;
    received: number;
    dispatched: number;
    produced: number;
    unit: string;
  }>;
  productionLogs: any[]; // Using any for now due to complexity
}


// Dashboard Metric Card
export interface ProductionMetric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ElementType;
  description?: string;
  className?: string;
}

// Dashboard Chart Data Points
export interface RcnFlowDataPoint {
    date: string;
    rcnIntake: number;
    rcnToFactory: number;
    finalProductOutput: number;
}

export interface FinishedGoodsFlowDataPoint {
    date: string;
    packaged: number;
    dispatched: number;
}

export interface ProductionEfficiencyDataPoint {
  stage: string;
  efficiency: number;
}

// Generic form value type for selecting which data entry form to show
export type DataEntryFormType = typeof import('@/lib/constants').DATA_ENTRY_FORM_TYPES[number]['value'];

// Notifications
export interface NotificationSettings {
  dailySummaryEmailEnabled: boolean;
  recipientEmail?: string;
}

// Traceability
export interface TraceabilityRequest {
  batchId: string;
}

export interface TraceabilityResult {
  id: string;
  type: string;
  timestamp: string;
  details: Record<string, any>;
  relatedDocs?: { id: string; type: string }[];
}


// Obsolete types - can be removed later
export interface GoodsReceivedFormValues {}
export interface SteamingProcessEntry {}
export interface ShellingProcessEntry {}
export interface DryingProcessEntry {}
export interface PeelingProcessEntry {}
export interface CalibrationEntry {}
export interface RcnQualityAssessmentEntry {}
export interface MachineGradingEntry {}
export interface ManualPeelingRefinementEntry {}
export interface PackagingEntry {}
export interface QualityControlFinalEntry {}
export interface StockLevel {}
export interface ProductionStageLogEntry {}
export interface ProductionStageFormValuesOld {}
