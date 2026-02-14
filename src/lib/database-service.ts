// This file is intentionally left empty.
// It contained server-side data access logic that depended on the Firebase Admin SDK.
// This logic is not needed for the static ANC Cohort Study app and was causing build failures.
// This file is kept to prevent import errors from other unused files.

import type { WriteBatch } from 'firebase-admin/firestore';

// Mock the class to prevent breaking imports in other unused files.
export class InventoryDataService {
  private static instance: InventoryDataService;

  private constructor() {}

  public static getInstance(): InventoryDataService {
    if (!InventoryDataService.instance) {
      InventoryDataService.instance = new InventoryDataService();
    }
    return InventoryDataService.instance;
  }
  
  public getBatch(): WriteBatch {
    throw new Error("Database service is not available in this build.");
  }

  public async checkFirestoreConnection(): Promise<void> {
     throw new Error("Database service is not available in this build.");
  }
  
  async getAncRegistrations(filters?: { startDate?: Date; endDate?: Date }): Promise<any[]> {
    throw new Error("Database service is not available in this build.");
  }

  async deleteAncRegistration(participantId: string): Promise<{ success: boolean; error?: string }> {
     throw new Error("Database service is not available in this build.");
  }

  async deleteAllAncRegistrations(): Promise<{ success: boolean; count: number; error?: string }> {
     throw new Error("Database service is not available in this build.");
  }
}
