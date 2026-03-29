export const FACILITY_TARGETS: Record<string, number> = {
  "Buza Health Center (Zone A)": 93,
  "Makangarawe Dispensary (Zone A)": 31,
  "Kilakala Health Center (Zone A)": 16,
  "Yombo Vituka Health Center (Zone A)": 56,
  "Maji Matitu Health Center (Zone D)": 111,
  "Keko Mwanga Dispensary (Zone A)": 11,
  "Changombe Dispensary (Zone A)": 15,
  "Sigara Dispensary (Zone A)": 22,
  "Sandali Dispensary (Zone A)": 30,
  "Goroka Health Center (Zone B)": 15,
  "Mbagala Kuu Dispensary (Zone B)": 22,
  "Mikwambe Dispensary (Zone B)": 22,
  "Kijichi Health Center (Zone B)": 44,
  "Toangoma Dispensary (Zone B)": 30,
  "Tandika Dispensary (Zone C)": 28,
  "Temeke Regional Referral Hospital (Zone C)": 0,
  "Mbande Health Center (Zone D)": 65,
  "Chamazi Dispensary (Zone D)": 75,
  "Charambe Dispensary (Zone D)": 72,
  "Kilungule Dispensary (Zone D)": 7,
  "Mbagala Rangi Tatu Hospital (Zone B)": 53,
  "Tambukareli Dispensary (Zone C)": 59,
  "Miburani Dispensary (Zone C)": 9,
  "Mbagala Kizuiani Dispensary (Zone C)": 34,
  "Kurasini Dispensary (Zone B)": 7,
  "Kingugi Dispensary (Zone D)": 23,
  "Mzinga Dispensary (Zone C)": 44,
  "Mbagala Roundtable Health Center (Zone C)": 65,
  "Mtoni Dispensary (Zone C)": 43,
  "Mkodogwa Health Center (Zone D)": 21,
  "Kichemchem Dispensary (Zone B)": 25,
};

export const TOTAL_TARGET = 1148;

/**
 * Normalizes clinical site names for robust matching across different 
 * database naming conventions and abbreviations.
 * Handles "Center" vs "Centre", case variations, and aggressive whitespace stripping.
 */
export function normalizeSiteName(name: string): string {
  if (!name) return '';
  let n = name.toLowerCase();
  
  // Strip Zone designations aggressively
  n = n.replace(/\(zone [a-z0-9]+\)/gi, '');
  
  // Normalize types
  n = n.replace(/health cent(er|re)/gi, 'hc');
  n = n.replace(/dispensary/gi, 'disp');
  n = n.replace(/regional referral hospital/gi, 'rrh');
  n = n.replace(/hospital/gi, 'hosp');
  
  // Final cleanup: remove all non-alphanumeric and trim
  return n.replace(/[^a-z0-9]/g, '').trim();
}

export function getFacilityTarget(facility: string): number {
  return FACILITY_TARGETS[facility] ?? 0;
}

export function isFacilityFull(facility: string, enrolled: number): boolean {
  const target = getFacilityTarget(facility);
  if (target === 0) return true;
  return enrolled >= target;
}

export function getFacilityProgress(facility: string, enrolled: number) {
  const target = getFacilityTarget(facility);
  const remaining = Math.max(0, target - enrolled);
  const percentage = target > 0 ? Math.round((enrolled / target) * 100) : 100;
  return { target, enrolled, remaining, percentage, isFull: enrolled >= target };
}
