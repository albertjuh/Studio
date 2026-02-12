
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Archive, Send, Factory, FileText, Sparkles, Mail, Wind, Thermometer, Hammer, Hand, Combine, Scaling, ClipboardCheck, Package, CheckSquare, Wrench, Users, RotateCcw, Warehouse, Settings, History, DatabaseZap, Unplug, Cuboid, ListChecks, Eye, UserPlus, BookUser, PackageCheck } from 'lucide-react';

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
  { path: '/coastal-insights/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { path: '/coastal-insights/data-entry', label: 'Data Entry', icon: Archive, roles: ['admin', 'worker'] },
  { path: '/coastal-insights/inventory', label: 'Inventory', icon: Warehouse, roles: ['admin', 'worker'] },
  { path: '/coastal-insights/reports', label: 'Reports', icon: FileText, roles: ['admin', 'worker'] },
  {
    label: 'Nyanga Reports',
    path: '/coastal-insights/nyanga-reports',
    icon: BookUser,
    roles: ['admin'],
    children: [
        { path: '/coastal-insights/nyanga-reports/view', label: 'View Reports', icon: Eye, roles: ['admin'] },
        { path: '/coastal-insights/nyanga-reports/manage-workers', label: 'Manage Workers', icon: Users, roles: ['admin'] },
    ]
  },
  { path: '/coastal-insights/ai-summary', label: 'Traceability', icon: History, roles: ['admin'] },
  { path: '/coastal-insights/data-management', label: 'Data Management', icon: DatabaseZap, roles: ['admin'] },
  {
    label: 'Configuration',
    path: '/coastal-insights/config', // A dummy path
    icon: Settings,
    roles: ['admin'],
    children: [
      { path: '/coastal-insights/notifications', label: 'Notifications', icon: Mail, roles: ['admin'] },
    ]
  },
];


// Reordered to match logical production flow
export const DATA_ENTRY_FORM_TYPES = [
  // Inventory First
  { value: 'rcn_intake', label: 'RCN Warehouse Transactions', icon: Archive, group: "Inventory & RCN" },
  { value: 'rcn_sizing_calibration', label: 'RCN Sizing & Calibration', icon: Scaling, group: "Inventory & RCN" },
  { value: 'quality_control_rcn', label: 'RCN Quality Assessment', icon: CheckSquare, group: "Inventory & RCN" },
  { value: 'packaging', label: 'Packaging', icon: PackageCheck, group: 'Inventory & RCN' },
  { value: 'other_materials_intake', label: 'Other Materials Intake', icon: RotateCcw, group: "Other Materials" },
  { value: 'goods_dispatched', label: 'Product Shipping / Dispatch', icon: Send, group: "Other Materials" },
  { value: 'vacuum_bag_intake', label: 'Vacuum Bag Intake', icon: Package, group: "Other Materials" },
  
  // External / Other
  { value: 'nyanga_production_log', label: 'Nyanga Production Log', icon: BookUser, group: 'External Teams' },
  { value: 'add_nyanga_worker', label: 'Add Nyanga Worker', icon: UserPlus, group: 'External Teams' },
] as const;

export type DataEntryFormValue = typeof DATA_ENTRY_FORM_TYPES[number]['value'];

export const NYANGA_WORKERS = [
    { id: 'amina-salum', name: 'Amina Salum' },
    { id: 'zuhura-ismaili', name: 'Zuhura Ismaili' },
    { id: 'sharifa-laini', name: 'Sharifa Laini' },
    { id: 'fatu-mkuti', name: 'Fatu Mkuti' },
    { id: 'zulfa-ally', name: 'Zulfa Ally' },
    { id: 'tulinge-bakari', name: 'Tulinge Bakari' },
    { id: 'zainabu-saidi', name: 'Zainabu Saidi' },
    { id: 'zainabu-hasani', name: 'Zainabu Hasani' },
    { id: 'eva-barnaba', name: 'Eva Barnaba' },
    { id: 'mwanahamisi-musa', name: 'Mwanahamisi Musa' },
    { id: 'asha-abdallah', name: 'Asha Abdallah' },
    { id: 'mtilda-herman', name: 'Mtilda Herman' },
    { id: 'halima-hasani', name: 'Halima Hasani' },
];

export const ITEM_UNITS = ['kg', 'tonnes', 'litres', 'gallons', 'bags', 'pieces', 'boxes', 'units', 'sets', 'rolls', 'drums', 'count', 'Pairs', 'Dozens'];
export const RCN_OUTPUT_DESTINATIONS = ['Sizing & Calibration'] as const;

// Grade constants for the Packing Report
export const PACKING_GRADES = [
    'W180', 'W210', 'W240', 'W320', 'W450', 'SW240', 'SW320', 'SSW320', 'SSW240',
    'DW', 'LWP', 'LP', 'BB', 'DP',
    'OW', 'FS', 'SS', 'SPS', 'PKP', 'PW',
    'Puk I', 'Puk II', 'Puk III', 'SP/LP',
] as const;

// Grade constants for RCN Sizing
export const RCN_SIZE_GRADES = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'Rejects', 'Dust', 'Other'] as const;

export const RCN_VISUAL_QUALITY_GRADES = ['A', 'B', 'C', 'Reject'] as const;

// For packaging form dropdown - uses the packing grades
export const FINISHED_KERNEL_GRADES = PACKING_GRADES.map(grade => `Cashew Kernels - ${grade}`);


// Steaming is removed
// Shelling is removed
// Drying is removed
// Peeling is removed
// Machine Grading is removed
// Manual Peeling is removed

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

export const OTHER_MATERIALS_ITEMS = [
    // Packaging Materials
    VACUUM_BAGS_NAME,
    WHITE_PLAIN_BOXES_NAME,
    PAINTED_LOGO_BOXES_NAME,
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

// Packaging
export const PACKAGE_WEIGHT_KG = 22.68;

// Calibration
export const RCN_SIZING_MACHINE_IDS = ['Sizing Machine 1', 'Sizing Machine 2'] as const;

export const CALIBRATION_PARAMETERS = ['Weight Scale Accuracy', 'Temperature Reading', 'Pressure Gauge Accuracy', 'Moisture Meter Reading', 'Timer Accuracy', 'Sensor Calibration'] as const;
export const CALIBRATION_RESULTS = ['Pass', 'Fail', 'Adjusted'] as const;

// Quality Control
export const YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const AFLATOXIN_LIMIT_PPB = 15; // Example limit
export const MOISTURE_LIMIT_FINAL_PERCENT = 5; // Example limit

// Nyanga Reports
export const PAY_RATE_PER_KG = 975; // TZS per kg
