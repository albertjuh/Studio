

import type { CALIBRATION_RESULTS, RCN_VISUAL_QUALITY_GRADES, SHIFT_OPTIONS, YES_NO_OPTIONS, CALIBRATION_PARAMETERS, DISPATCH_TYPES, RCN_OUTPUT_DESTINATIONS, RCN_SIZE_GRADES, DISPATCH_CATEGORIES, FINISHED_KERNEL_GRADES, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME, RCN_FOR_SIZING_NAME } from '@/lib/constants';

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
    action: 'add' | 'remove' | 'update' | 'create' | 'reversal';
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

export interface PackedItem {
  kernel_grade: string;
  number_of_packs: number;
}

export interface PackagingFormValues {
  id?: string; // Added for editing
  packed_items: PackedItem[];
  production_date: Date;
  shift?: typeof SHIFT_OPTIONS[number];
  supervisor_id: string;
  notes?: string;
  vacuum_bag_carton_id: string;
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
export interface DashboardMetrics {
    rcnStock: {
        current: number; // In Tonnes
        sufficiencyMessage: string;
    };
    packagingStock: {
        boxes: number;
        vacuumBags: number;
        allBoxes: InventoryItem[];
    };
    otherMaterialsStock: {
        current: number; // Count of distinct items
    };
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
    usage: { grade: string; quantity: number; lotNumber?: string; date: string; }[];
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
export interface AddNyangaWorkerFormValues {
  name: string;
}

export interface NyangaWorker {
  id: string;
  name: string;
}

export interface NyangaReportEntry {
  workerId: string;
  workerName: string;
  firstPassKg: number;
  secondPassKg: number;
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

export interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalKg: number;
  totalFirstPassKg: number;
  totalSecondPassKg: number;
  totalPay: number;
  dailyBreakdown: { 
      date: string; 
      kg: number; 
      firstPassKg: number;
      secondPassKg: number;
      pay: number;
    }[];
}

// --- Boda Fleet Management ---
export interface BodaUser {
    id: string;
    name: string;
    role: 'owner' | 'supervisor' | 'rider';
}

export interface Bike {
    id: string;
    plateNumber: string;
    assignedRiderId?: string;
    status: 'active' | 'maintenance' | 'inactive';
    lastLocation?: { lat: number; lng: number; };
    contractStartDate?: string;
    contractEndDate?: string;
}

export interface BodaPayment {
    id: string;
    riderId: string;
    bikeId: string;
    amount: number;
    date: string; // ISO string
    verifiedBySupervisorId?: string;
}

export interface Incident {
    id: string;
    bikeId: string;
    riderId?: string;
    reportedById: string;
    date: string; // ISO string
    description: string;
    severity: 'minor' | 'major';
    status: 'reported' | 'in-progress' | 'resolved';
}

// --- ANC Cohort Study ---
export interface AncRegistration {
  id: string;
  participantId: string;
  healthFacility: string;
  name: string;
  age: number;
  maritalStatus: string;
  phoneNumber: string[];
  nextOfKinName?: string;
  alternativeContact?: string;
  gestationalAge: number;
  firstAncDate: string; // ISO string for client
  createdAt: string; // ISO string for client
  registeredBy?: string;
}

export interface AncRegistrationFormValues extends Omit<AncRegistration, 'id' | 'createdAt' | 'firstAncDate'> {
  firstAncDate: Date;
}
