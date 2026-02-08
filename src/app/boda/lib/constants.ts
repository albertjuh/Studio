
export const DAILY_PROFIT_TARGET = 10000;

export const USER_ROLES = ['owner', 'supervisor', 'rider'] as const;

export const BIKE_STATUSES = ['active', 'maintenance', 'inactive'] as const;

export const INCIDENT_SEVERITIES = ['minor', 'major'] as const;

export const INCIDENT_STATUSES = ['reported', 'in-progress', 'resolved'] as const;

// Generate 30 unique IDs for the boda bodas
export const BIKE_IDS = Array.from({ length: 30 }, (_, i) => `BODA-${String(i + 1).padStart(3, '0')}`);
