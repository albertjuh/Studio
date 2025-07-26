

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

export const APP_NAME = "Coastal Insights";
export const PEELED_KERNELS_FOR_PACKAGING_NAME = "Peeled Kernels for Packaging";

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
] as const;

export type DataEntryFormValue = typeof DATA_ENTRY_FORM_TYPES[number]['value'];

export const ITEM_UNITS = ['kg', 'tonnes', 'litres', 'gallons', 'bags', 'pieces', 'boxes', 'units', 'sets', 'rolls', 'drums', 'count'];
export const PRODUCTION_STAGES = ['Steaming', 'Shelling', 'Drying', 'Peeling', 'Grading', 'Packaging'];
export const RCN_OUTPUT_DESTINATIONS = ['Sizing & Calibration', 'Steaming'] as const;
export const CASHEW_GRADES = ['W180', 'W210', 'W240', 'W320', 'W450', 'SW', 'LWP', 'BB', 'RCN', 'SP', 'SSP', 'JH', 'SK', 'FS', 'Other']; // Expanded grades

export const RCN_VISUAL_QUALITY_GRADES = ['A', 'B', 'C', 'Reject'] as const;
export const RCN_SIZE_GRADES = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'Rejects'] as const;

// Steaming
export const STEAM_EQUIPMENT_IDS: string[] = [];

// Shelling
export const SHELLING_MACHINE_IDS = ['Sheller A', 'Sheller B', 'Sheller C', 'Sheller D', 'Sheller E'];

// Drying
export const DRYING_METHODS = ['Sun', 'Mechanical', 'Hybrid'] as const;
export const DRYING_EQUIPMENT_IDS: string[] = [];
export const QUALITY_CHECK_STATUSES = ['Pending', 'Approved', 'Rejected', 'Requires Rework'] as const;

// Peeling
export const PEELING_METHODS = ['Manual', 'Semi-Auto', 'Auto'] as const;
export const PEELING_MACHINE_IDS: string[] = [];
export const SHIFT_OPTIONS = ['Day A', 'Day B', 'Night A', 'Night B', 'General'] as const;

// Dispatch
export const DISPATCH_TYPES = ['Finished Product Sale', 'Sample', 'Waste Disposal', 'Internal Transfer'] as const;

export const DISPATCH_CATEGORIES = [
    'Finished Kernels',
    'By-Products',
    'Waste',
    'Samples',
    'Internal Use Materials',
    'Other'
] as const;

export const FINISHED_KERNEL_GRADES = [
    'Cashew Kernels - W180',
    'Cashew Kernels - W210',
    'Cashew Kernels - W240',
    'Cashew Kernels - W320',
    'Cashew Kernels - W450',
    'Cashew Kernels - SW (Scorched Wholes)',
    'Cashew Kernels - LWP (Large White Pieces)',
    'Cashew Kernels - BB (Baby Bits)',
    'Cashew Kernels - SP (Splits)',
] as const;


export const DISPATCHABLE_ITEMS_BY_CATEGORY = {
    "Finished Kernels": FINISHED_KERNEL_GRADES,
    "By-Products": [
        'Cashew Nut Shell Liquid (CNSL)',
        'Raw Cashew Shells',
    ],
    "Waste": [
        'Testa (Peel Skin) Waste',
        'General Factory Waste',
    ],
    "Samples": [
        'Sample - Finished Product',
        'Sample - In-Process',
    ],
    "Internal Use Materials": [
        'Boxes (Internal Use)',
        'Vacuum Bags (Internal Use)',
    ]
};


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
export const CS_MACHINE_IDS: string[] = [];

// Packaging
export const PACKAGE_TYPES = ['Carton', 'Tin', 'Pouch-Vacuum', 'Pouch-Nitrogen', 'BulkBag'] as const;
export const PACKAGING_LINE_IDS: string[] = [];
export const SEALING_MACHINE_IDS: string[] = [];

// Calibration
export const RCN_SIZING_MACHINE_IDS: string[] = [];
export const EQUIPMENT_CALIBRATION_IDS_EXAMPLE: string[] = [
    ...STEAM_EQUIPMENT_IDS,
    ...SHELLING_MACHINE_IDS,
    ...DRYING_EQUIPMENT_IDS,
    ...PEELING_MACHINE_IDS,
    ...CS_MACHINE_IDS,
    ...SEALING_MACHINE_IDS,
    ...RCN_SIZING_MACHINE_IDS,
] as const;
export const CALIBRATION_PARAMETERS = ['Weight Scale Accuracy', 'Temperature Reading', 'Pressure Gauge Accuracy', 'Moisture Meter Reading', 'Timer Accuracy', 'Sensor Calibration'] as const;
export const CALIBRATION_RESULTS = ['Pass', 'Fail', 'Adjusted'] as const;

// Quality Control
export const YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const AFLATOXIN_LIMIT_PPB = 15; // Example limit
export const MOISTURE_LIMIT_FINAL_PERCENT = 5; // Example limit
