

import type { CALIBRATION_RESULTS, DRYING_METHODS, PEELING_METHODS, QUALITY_CHECK_STATUSES, RCN_VISUAL_QUALITY_GRADES, SHIFT_OPTIONS, SIZE_CATEGORIES, YES_NO_OPTIONS, CALIBRATION_PARAMETERS, DISPATCH_TYPES, PACKAGE_TYPES, RCN_OUTPUT_DESTINATIONS, RCN_SIZE_GRADES, DISPATCH_CATEGORIES, FINISHED_KERNEL_GRADES, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME, RCN_FOR_SIZING_NAME, PEELED_KERNELS_FOR_GRADING_NAME, GRADED_KERNELS_FOR_REFINEMENT_NAME } from '@/lib/constants';

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
    type?: string; // For special item types like 'vacuum_bag_carton'
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

export interface BatchIdWithWeight {
  id: string;
  weight_kg: number;
}

export interface RcnIntakeEntry {
  id?: string;
  transaction_type: "intake";
  intake_batch_id?: string;
  gross_weight_kg: number;
  item_name: string; // Should always be "Raw Cashew Nuts"
  tare_weight_kg?: number;
  supplier_id: string;
  arrival_datetime: Date;
  // RCN Specific fields
  moisture_content_percent?: number;
  nut_count_per_kg?: number;
  visual_quality_grade?: typeof RCN_VISUAL_QUALITY_GRADES[number];
  truck_license_plate?: string;
  receiver_id: string;
  supervisor_id: string;
  notes?: string;
}


export interface OtherMaterialsIntakeFormValues {
  id?: string;
  intake_batch_id?: string;
  item_name: string; 
  custom_item_name?: string;
  transaction_type: 'intake' | 'transfer';
  quantity?: number;
  carton_id?: string; // For transferring specific vacuum bag cartons
  unit: string;
  supplier_id?: string;
  destination_section?: string;
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

export type GoodsDispatchedFormValues = {
    dispatch_batch_id?: string;
    destination: string;
    dispatch_type?: typeof DISPATCH_TYPES[number];
    dispatcher_id: string;
    responsible_person: string;
    dispatch_datetime: Date;
    document_reference?: string;
    notes?: string;
} & (
    {
        dispatch_category: 'Finished Goods';
        dispatched_items: DispatchedItem[];
        item_name?: never;
        number_of_bags?: never;
        gross_weight_kg?: never;
        tare_weight_kg?: never;
    } | {
        dispatch_category: 'By-Products / Waste';
        item_name: string;
        number_of_bags?: number;
        gross_weight_kg: number;
        tare_weight_kg?: number;
        dispatched_items?: never;
    }
);


// Production & other forms remain largely the same for now
// as they don't directly map to the simple inventory model
// but their actions might create/update inventory items.
export interface RcnOutputToFactoryEntry {
  id?: string;
  transaction_type: "output";
  output_batches: BatchIdWithWeight[];
  linked_rcn_intake_batch_id: string; 
  output_datetime: Date;
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
    linked_rcn_batch_id: typeof RCN_FOR_SIZING_NAME;
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
  weight_after_steam_kg?: number;
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
  id: string;
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
  size_category: string;
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
  id?: string; // Added for editing
  linked_lot_number: string;
  pack_start_time: Date;
  pack_end_time: Date;
  packed_items: PackedItem[];
  production_date: Date;
  box_type?: typeof WHITE_PLAIN_BOXES_NAME | typeof PAINTED_LOGO_BOXES_NAME;
  vacuum_bag_carton_id: string;
  wasted_bags?: number;
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
  lot_number: string; // The new lot number for production
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
  id: string;
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
  reportType?: 'all' | 'production' | 'inventory' | 'packaging';
  searchQuery?: string;
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


// --- Dashboard Types ---
interface MetricTrendData {
    date: string;
    value: number;
}

interface Metric {
    current: number;
    change: number; // Percentage change
    trend: MetricTrendData[];
}

export interface DashboardMetrics {
    rcnStock: Metric & {
        sufficiencyMessage: string;
    };
    packagingStock: {
        vacuumBags: Metric;
        boxes: Metric & {
            whitePlain: number;
            paintedLogo: number;
        };
    };
    otherMaterialsStock: Metric;
    alerts: string[];
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

// Data Management
export type DataManagementAction = { action: 'delete-test-data', prefix: string } | { action: 'export-csv' };

// --- Vacuum Bag Traceability ---
export interface VacuumBagIntakeFormValues {
  shipmentId?: string;
  supplier: string;
  receiptDate: Date;
  numberOfCartons: number;
  expiryDate?: Date;
  receiverId: string;
  notes?: string;
}

export interface VacuumBagWastageFormValues {
  cartonId: string; // The unique ID of the carton, e.g., "SHIP-123-01"
  quantity: number;
  reason: string;
  operatorId: string;
  wastageDate: Date;
}

export interface VacuumBagBatch {
    batchId: string; // This is the shipment ID
    initialQuantity: number; // Total bags in shipment
    currentStock: number; // Current total bags remaining across all cartons
    intakeDate?: string;
    supplier?: string;
    usedCount: number;
    wastedCount: number;
    usage: { grade: string; quantity: number; lotNumber: string; date: string; }[];
    wastage: { date: string; quantity: number; reason: string }[];
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
export interface ProductionStageFormValuesOld {}
// Nyanga Types
export interface NyangaWorker {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface NyangaReportEntry {
  workerId: string;
  workerName: string;
  kg: number;
}

export interface NyangaReportFormValues {
  reportDate: Date;
  supervisorId: string;
  shift: 'Day A' | 'Day B' | 'Night A' | 'Night B' | 'General';
  entries: NyangaReportEntry[];
}

export interface NyangaReportData extends Omit<NyangaReportFormValues, 'reportDate'> {
  id: string;
  reportDate: string; // Stored as ISO string
  createdAt: string;
}
