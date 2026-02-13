
import { 
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query,
  WriteBatch
} from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import type { AncRegistration } from '@/types';

export class InventoryDataService {
  private static instance: InventoryDataService;
  private db: Firestore;

  private constructor() {
    if (!adminDb) {
      throw new Error('Firestore admin instance is not available. Check Firebase Admin initialization.');
    }
    this.db = adminDb;
  }

  public static getInstance(): InventoryDataService {
    if (!InventoryDataService.instance) {
      InventoryDataService.instance = new InventoryDataService();
    }
    return InventoryDataService.instance;
  }
  
  public getBatch(): WriteBatch {
    return this.db.batch();
  }

  public async checkFirestoreConnection(): Promise<void> {
    await this.db.collection('__healthcheck__').doc('__ping__').get();
  }

  async getAncRegistrations(filters?: { startDate?: Date; endDate?: Date }): Promise<any[]> {
    try {
        const registrationsCollection = this.db.collection('anc_registrations');
        let query: Query = registrationsCollection;

        if (filters?.startDate) {
            query = query.where('createdAt', '>=', Timestamp.fromDate(filters.startDate));
        }
        if (filters?.endDate) {
            query = query.where('createdAt', '<=', Timestamp.fromDate(filters.endDate));
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            return [];
        }

        const registrations = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                firstAncDate: (data.firstAncDate as Timestamp).toDate().toISOString(),
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            };
        });
        
        return registrations;

    } catch (error) {
        console.error('Error fetching ANC registrations in service:', error);
        throw new Error('Failed to load registration data from the database.');
    }
  }

  async deleteAncRegistration(participantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = this.db.collection('anc_registrations').doc(participantId);
        await docRef.delete();
        return { success: true };
    } catch (error) {
        console.error(`Error deleting ANC registration ${participantId}:`, error);
        throw new Error('Failed to delete registration from database.');
    }
  }
}
