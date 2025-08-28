

import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Archive, Send, Factory, FileText, Sparkles, Mail, Wind, Thermometer, Hammer, Hand, Combine, Scaling, ClipboardCheck, Package, CheckSquare, Wrench, Users, RotateCcw, Warehouse, Settings, History, DatabaseZap, Unplug, Cuboid } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  roles: ('admin' | 'worker')[];
  children?: NavItem[];
}

export const APP_NAME = "Coastal Insights";

// Core Inventory Item Names
export const RAW_CASHEW_NUTS_NAME = "Raw Cashew Nuts";
export const RCN_FOR_SIZING_NAME = "RCN (for Sizing & Calibration)";
export const SHELLED_KERNELS_FOR_DRYING_NAME = "Shelled Kernels (for Drying)";
export const DRIED_KERNELS_FOR_PEELING_NAME = "Dried Kernels (for Peeling)";
export const PEELED_KERNELS_FOR_PACKAGING_NAME = "Peeled Kernels (for Packaging)";
export const CNS_SHELL_WASTE_NAME = "Cashew Nut Shells (CNS)";
export const TESTA_PEEL_WASTE_NAME = "Testa (Peel Skin)";
export const PACKAGING_BOXES_NAME = "Packaging Boxes"; // Kept for general use, but new ones are more specific
export const WHITE_PLAIN_BOXES_NAME = "White Plain Boxes";
export const PAINTED_LOGO_BOXES_NAME = "Painted Logo Boxes";
export const VACUUM_BAGS_NAME = "Vacuum Bags";
export const VACUUM_BAGS_CATEGORY = 'Other Materials';
export const VACUUM_BAGS_BASE_NAME = 'Vacuum Bags';
export const VACUUM_BAGS_CARTON_QTY = 200;


export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/data-entry', label: 'Data Entry', icon: Archive, roles: ['admin', 'worker'] },
  { path: '/inventory', label: 'Inventory', icon: Warehouse, roles: ['admin', 'worker'] },
  { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'worker'] },
  { path: '/ai-summary', label: 'Traceability', icon: History, roles: ['admin'] },
  { path: '/data-management', label: 'Data Management', icon: DatabaseZap, roles: ['admin'] },
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
  { value: 'vacuum_bag_intake', label: 'Vacuum Bag Intake', icon: Package, group: "Inventory" },
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
] as const;

export type DataEntryFormValue = typeof DATA_ENTRY_FORM_TYPES[number]['value'];

export const ITEM_UNITS = ['kg', 'tonnes', 'litres', 'gallons', 'bags', 'pieces', 'boxes', 'units', 'sets', 'rolls', 'drums', 'count', 'Pairs', 'Dozens'];
export const PRODUCTION_STAGES = ['Steaming', 'Shelling', 'Drying', 'Peeling', 'Grading', 'Packaging'];
export const RCN_OUTPUT_DESTINATIONS = ['Sizing & Calibration'] as const;
export const CASHEW_GRADES = ['W-180', 'W-210', 'W-240', 'W-320', 'W-450', 'SW-240', 'SW-320', 'SSW-240', 'SSW-320', 'LWP', 'BB', 'SP', 'SSP', 'JH', 'SK', 'FS', 'DP', 'RCN', 'Other'] as const;

export const RCN_VISUAL_QUALITY_GRADES = ['A', 'B', 'C', 'Reject'] as const;
export const RCN_SIZE_GRADES = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'Rejects'] as const;

// Steaming
export const STEAM_EQUIPMENT_IDS = ['Steamer 1', 'Steamer 2'] as const;

// Shelling
export const SHELLING_MACHINE_IDS = ['Sheller A', 'Sheller B', 'Sheller C', 'Sheller D', 'Sheller E'] as const;

// Drying
export const DRYING_METHODS = ['Sun', 'Mechanical', 'Hybrid'] as const;
export const DRYING_EQUIPMENT_IDS = ['Drier 1', 'Drier 2'] as const;
export const QUALITY_CHECK_STATUSES = ['Pending', 'Approved', 'Rejected', 'Requires Rework'] as const;

// Peeling
export const PEELING_METHODS = ['Manual', 'Semi-Auto', 'Auto'] as const;
export const PEELING_MACHINE_IDS = ['Peeling Machine 1', 'Peeling Machine 2'] as const;
export const SHIFT_OPTIONS = ['Day A', 'Day B', 'Night A', 'Night B', 'General'] as const;

// Dispatch
export const DISPATCH_TYPES = ['Finished Product Sale', 'Sample', 'Waste Disposal', 'Internal Transfer'] as const;

export const DISPATCH_CATEGORIES = [
    'Finished Goods',
    'By-Products',
    'Waste',
    'Samples',
    'Other'
] as const;

export const FINISHED_KERNEL_GRADES = [
    'Cashew Kernels - W-180',
    'Cashew Kernels - W-210',
    'Cashew Kernels - W-240',
    'Cashew Kernels - W-320',
    'Cashew Kernels - W-450',
    'Cashew Kernels - SW-240',
    'Cashew Kernels - SW-320',
    'Cashew Kernels - SSW-240',
    'Cashew Kernels - SSW-320',
    'Cashew Kernels - DP',
    'Cashew Kernels - LWP',
    'Cashew Kernels - BB (Baby Bits)',
    'Cashew Kernels - SP',
    'Cashew Kernels - SSP',
    'Cashew Kernels - JH',
    'Cashew Kernels - SK',
    'Cashew Kernels - FS',
    'Cashew Kernels - DW',
    'Cashew Kernels - SK1',
    'Cashew Kernels - SK2',
    'Cashew Kernels - SK3',
    'Cashew Kernels - OW',
    'Cashew Kernels - SS',
    'Cashew Kernels - LP',
    'Cashew Kernels - WSP',
    'Cashew Kernels - SPS',
    'Cashew Kernels - PUK 1',
    'Cashew Kernels - PUK 2',
    'Cashew Kernels - PUK III',
] as const;


export const OTHER_MATERIALS_ITEMS = [
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


// CS Machine (Sizing/Sorting)
export const SIZE_CATEGORIES = ['W-180', 'W-210', 'W-240', 'W-320', 'W-450', 'SW-240', 'SW-320', 'SSW-240', 'SSW-320', 'LWP', 'BB', 'SP', 'SSP', 'JH', 'SK', 'FS', 'DP', 'Rejects', 'Dust', 'Other'] as const;
export const GRADING_MACHINE_IDS = ['Color Sorter 1 (Big)', 'Color Sorter 2 (Small)'] as const;

// Packaging
export const PACKAGE_TYPES = ['Carton', 'Tin', 'Pouch-Vacuum', 'Pouch-Nitrogen', 'BulkBag'] as const;
export const PACKAGE_WEIGHT_KG = 22.68;
export const PACKAGING_LINE_IDS: string[] = ['Line 1', 'Line 2'];
export const SEALING_MACHINE_IDS = ['Sealing Machine 1'] as const;

// Calibration
export const RCN_SIZING_MACHINE_IDS = ['Sizing Machine 1', 'Sizing Machine 2'] as const;

// A general list for calibration form, combining all machine IDs
export const ALL_EQUIPMENT_IDS = [
    ...STEAM_EQUIPMENT_IDS,
    ...SHELLING_MACHINE_IDS,
    ...DRYING_EQUIPMENT_IDS,
    ...PEELING_MACHINE_IDS,
    ...GRADING_MACHINE_IDS,
    ...SEALING_MACHINE_IDS,
    ...RCN_SIZING_MACHINE_IDS,
] as const;


export const CALIBRATION_PARAMETERS = ['Weight Scale Accuracy', 'Temperature Reading', 'Pressure Gauge Accuracy', 'Moisture Meter Reading', 'Timer Accuracy', 'Sensor Calibration'] as const;
export const CALIBRATION_RESULTS = ['Pass', 'Fail', 'Adjusted'] as const;

// Quality Control
export const YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const AFLATOXIN_LIMIT_PPB = 15; // Example limit
export const MOISTURE_LIMIT_FINAL_PERCENT = 5; // Example limit
