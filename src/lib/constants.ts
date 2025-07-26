

import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Archive, Send, Factory, FileText, Sparkles, Mail, Wind, Thermometer, Hammer, Hand, Combine, Scaling, ClipboardCheck, Package, CheckSquare, Wrench, Users, RotateCcw, Warehouse, Settings } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  roles: ('admin' | 'worker')[];
  children?: NavItem[];
}

export const APP_NAME = "Nutshell Insights";

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/data-entry', label: 'Data Entry', icon: Archive, roles: ['admin', 'worker'] },
  { path: '/inventory', label: 'Inventory', icon: Warehouse, roles: ['admin', 'worker'] },
  { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'worker'] },
  { 
    label: 'Insights', 
    path: '/insights', // A dummy path
    icon: Sparkles, 
    roles: ['admin'],
    children: [
       { path: '/ai-summary', label: 'AI Summaries', icon: Sparkles, roles: ['admin'] },
    ]
  },
  { 
    label: 'Configuration', 
    path: '/config', // A dummy path
    icon: Settings, 
    roles: ['admin'],
    children: [
      { path: '/notifications', label: 'Notifications', icon: Mail, roles: ['admin'] },
    ]
  },
];


// Reordered to match logical production flow
export const DATA_ENTRY_FORM_TYPES = [
  // Inventory First
  { value: 'rcn_intake', label: 'RCN Warehouse Transactions', icon: Archive, group: "Inventory" },
  { value: 'other_materials_intake', label: 'Other Materials Intake', icon: RotateCcw, group: "Inventory" },
  { value: 'goods_dispatched', label: 'Product Shipping / Dispatch', icon: Send, group: "Inventory" },
  
  // Production Flow
  { value: 'rcn_sizing_calibration', label: 'RCN Sizing & Calibration', icon: Scaling, group: "Production" },
  { value: 'quality_control_rcn', label: 'RCN Quality Assessment', icon: CheckSquare, group: "Quality" },
  { value: 'steaming_process', label: 'Steaming Process', icon: Thermometer, group: "Production" },
  { value: 'shelling_process', label: 'Shelling Process', icon: Hammer, group: "Production" },
  { value: 'drying_process', label: 'Kernel Drying', icon: Wind, group: "Production" },
  { value: 'peeling_process', label: 'Peeling Process (General)', icon: Hand, group: "Production" },
  { value: 'machine_grading', label: 'Machine Grading (Sizing/Sorting)', icon: Scaling, group: "Production" },
  { value: 'manual_peeling_refinement', label: 'Manual Peeling (Refinement)', icon: Users, group: "Production" },
  { value: 'quality_control_final', label: 'Quality Control (Final Product)', icon: ClipboardCheck, group: "Quality" },
  { value: 'packaging', label: 'Packaging', icon: Package, group: "Production" },

  // Other
  { value: 'equipment_calibration', label: 'Equipment Calibration (Maint.)', icon: Wrench, group: "Maintenance" },
  { value: 'other_production_stage_placeholder', label: 'Other Production Stages (Placeholder)', icon: Factory, group: "Production" },
] as const;

export type DataEntryFormValue = typeof DATA_ENTRY_FORM_TYPES[number]['value'];

export const ITEM_UNITS = ['kg', 'tonnes', 'litres', 'gallons', 'bags', 'pieces', 'boxes', 'units', 'sets', 'rolls', 'drums', 'count'];
export const PRODUCTION_STAGES = ['Steaming', 'Shelling', 'Drying', 'Peeling', 'Grading', 'Packaging'];
export const RCN_OUTPUT_DESTINATIONS = ['Sizing & Calibration', 'Steaming'] as const;
export const CASHEW_GRADES = ['W180', 'W210', 'W240', 'W320', 'W450', 'SW', 'LWP', 'BB', 'RCN', 'SP', 'SSP', 'JH', 'SK', 'FS', 'Other']; // Expanded grades

export const RCN_VISUAL_QUALITY_GRADES = ['A', 'B', 'C', 'Reject'] as const;
export const RCN_SIZE_GRADES = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'Rejects'] as const;
export const SUPPLIER_IDS_EXAMPLE = [
    'Mayani Enterprises',
    'Iziyan Enterprises',
    'Hussain Suleiman Kassim',
    'MAMCU',
    'TANECU',
    'RUNALI',
    'WAREHOUSE-INTERNAL'
];
export const WAREHOUSE_STAFF_IDS = ['Laurent Frank', 'Lazaro'];
export const INTAKE_SUPERVISOR_IDS = ['Laurent Frank', 'Lazaro'];

export const OTHER_MATERIALS_RECEIVERS = ['Peter Reuben'] as const;

export const SUPERVISOR_IDS_EXAMPLE = [
    'Jaffari Nayopa',
    'Fintan Mmuni',
    'Ashura Athumani',
    'Edina Jacob',
    'Nassoro Hassan',
    'Shamsa Mkuti',
    'Nyanga Bakari',
    'Hamidu Juma',
    'Peter Reuben',
    'Abdumalick Issa'
];
export const RCN_OUTPUT_SUPERVISORS = ['Jaffari Nayopa', 'Fintan Mmuni'];
export const OPERATOR_IDS_EXAMPLE = ['OP001-Mike', 'OP002-Sarah', 'OP003-David'];
export const TECHNICIAN_IDS_EXAMPLE = ['TECH001-Charlie', 'TECH002-Diana'];


// Steaming
export const STEAM_EQUIPMENT_IDS = ['Boiler-01', 'Boiler-02', 'Cooker-A', 'Cooker-B', 'Steamer-S1', 'Steamer-S2'];

// Shelling
export const SHELLING_MACHINE_IDS = ['Sheller-M1', 'Sheller-M2', 'Sheller-M3', 'Sheller-Auto-01'];

// Drying
export const DRYING_METHODS = ['Sun', 'Mechanical', 'Hybrid'] as const;
export const DRYING_EQUIPMENT_IDS = ['Dryer-D1', 'Dryer-D2', 'Oven-O1'];
export const QUALITY_CHECK_STATUSES = ['Pending', 'Approved', 'Rejected', 'Requires Rework'] as const;

// Peeling
export const PEELING_METHODS = ['Manual', 'Semi-Auto', 'Auto'] as const;
export const PEELING_MACHINE_IDS = ['Peeler-P1', 'Peeler-P2', 'BrushPeeler-B1'];
export const SHIFT_OPTIONS = ['Day A', 'Day B', 'Night A', 'Night B', 'General'] as const;

// Dispatch
export const DISPATCH_TYPES = ['Finished Product Sale', 'Sample', 'Waste Disposal', 'Internal Transfer'] as const;
export const DISPATCHABLE_ITEMS = [
    // Finished Goods - Whole
    'Cashew Kernels - W180',
    'Cashew Kernels - W210',
    'Cashew Kernels - W240',
    'Cashew Kernels - W320',
    'Cashew Kernels - W450',
    // Finished Goods - Pieces
    'Cashew Kernels - SW (Scorched Wholes)',
    'Cashew Kernels - LWP (Large White Pieces)',
    'Cashew Kernels - BB (Baby Bits)',
    'Cashew Kernels - SP (Splits)',
    // By-products
    'Cashew Nut Shell Liquid (CNSL)',
    'Raw Cashew Shells',
    // Waste
    'Testa (Peel Skin) Waste',
    'General Factory Waste',
    // Samples
    'Sample - Finished Product',
    'Sample - In-Process',
    // Internal Use Materials
    'Boxes (Internal Use)',
    'Vacuum Bags (Internal Use)',
] as const;

export const OTHER_MATERIALS_ITEMS = [
    // Packaging
    'Packaging Boxes',
    'Vacuum Bags',
    'Nitrogen Gas Cylinders',
    'Labels',
    'Adhesive Tape',
    // Fuel & Lubricants
    'Diesel',
    'Engine Oil',
    'Hydraulic Fluid',
    // Maintenance
    'Machine Spare Parts',
    'Fuses',
    'Bearings',
    'Welding Rods',
    // Cleaning & Sanitation
    'Cleaning Chemicals',
    'Brushes and Mops',
    'Hand Sanitizer',
    'Hair Nets',
    // Office Supplies
    'A4 Paper',
    'Pens',
    'Printer Ink',
    // Lab Supplies
    'Lab Chemicals',
    'Sample Bags',
    'Petri Dishes',
    // Other
    'Other/Uncategorized',
] as const;

export const PACKAGING_BOXES_NAME = "Packaging Boxes";
export const VACUUM_BAGS_NAME = "Vacuum Bags";


// CS Machine (Sizing/Sorting)
export const SIZE_CATEGORIES = ['W180', 'W210', 'W240', 'W320', 'W450', 'SW', 'LWP', 'BB', 'SP', 'SSP', 'JH', 'SK', 'FS', 'Rejects', 'Dust', 'Other'] as const;
export const CS_MACHINE_IDS = ['Sorter-CS1', 'Sizer-SZ1', 'ColorSort-X1'];

// Packaging
export const PACKAGE_TYPES = ['Carton', 'Tin', 'Pouch-Vacuum', 'Pouch-Nitrogen', 'BulkBag'] as const;
export const PACKAGING_LINE_IDS = ['Line-1', 'Line-2', 'Manual-Pack-Area'];
export const SEALING_MACHINE_IDS = ['Sealer-A', 'Sealer-B', 'Manual-HeatSeal'];

// Calibration
export const RCN_SIZING_MACHINE_IDS = ['RCN-Sizer-01', 'RCN-Sizer-02'];
export const EQUIPMENT_CALIBRATION_IDS_EXAMPLE = [
    ...STEAM_EQUIPMENT_IDS,
    ...SHELLING_MACHINE_IDS,
    ...DRYING_EQUIPMENT_IDS,
    ...PEELING_MACHINE_IDS,
    ...CS_MACHINE_IDS,
    ...SEALING_MACHINE_IDS,
    ...RCN_SIZING_MACHINE_IDS,
    'WeighScale-Platform-01', 'WeighScale-Lab-01',
    'Thermometer-Digital-01', 'PressureGauge-Boiler-01',
    'MoistureMeter-MM01'
] as const;
export const CALIBRATION_PARAMETERS = ['Weight Scale Accuracy', 'Temperature Reading', 'Pressure Gauge Accuracy', 'Moisture Meter Reading', 'Timer Accuracy', 'Sensor Calibration'] as const;
export const CALIBRATION_RESULTS = ['Pass', 'Fail', 'Adjusted'] as const;

// Quality Control
export const QC_OFFICER_IDS = ['QC001-Emily', 'QC002-Kevin', 'LABTECH-01'] as const;
export const YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const AFLATOXIN_LIMIT_PPB = 15; // Example limit
export const MOISTURE_LIMIT_FINAL_PERCENT = 5; // Example limit
