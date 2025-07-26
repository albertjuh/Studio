
import { 
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query,
} from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import type { InventoryItem, InventoryLog, ReportFilterState } from '@/types';


export class InventoryDataService {
  private static instance: InventoryDataService;
  private db: Firestore;
  private inventoryCollection = 'inventory';
  private logsCollection = 'inventory_logs';
  private productionLogsCollection = 'production_logs';

  private constructor() {
    if (!adminDb) {
      throw new Error("Firestore admin instance is not available. Check Firebase Admin initialization.");
    }
    this.db = adminDb;
  }

  public static getInstance(): InventoryDataService {
    if (!InventoryDataService.instance) {
      InventoryDataService.instance = new InventoryDataService();
    }
    return InventoryDataService.instance;
  }
  
  /**
   * Retrieves all inventory logs, sorted by most recent.
   * @param limit The maximum number of logs to retrieve.
   */
  async getLatestLogs(limit: number = 50): Promise<InventoryLog[]> {
    try {
      const logsSnapshot = await this.db.collection(this.logsCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      if (logsSnapshot.empty) {
        return [];
      }
      
      const itemIds = [...new Set(logsSnapshot.docs.map(doc => doc.data().itemId))].filter(Boolean);
      if (itemIds.length === 0) return []; 
      
      const itemsSnapshot = await this.db.collection(this.inventoryCollection).where('__name__', 'in', itemIds).get();
      const itemsMap = new Map(itemsSnapshot.docs.map(doc => [doc.id, doc.data() as InventoryItem]));

      return logsSnapshot.docs.map(doc => {
        const logData = doc.data();
        const item = itemsMap.get(logData.itemId);
        
        return {
          id: doc.id,
          ...logData,
          itemName: item?.name || 'Unknown Item',
          itemUnit: item?.unit || 'units',
          timestamp: (logData.timestamp as Timestamp).toDate().toISOString(),
        } as InventoryLog;
      });

    } catch (error) {
      console.error('Error fetching latest inventory logs:', error);
      throw new Error('Failed to load inventory logs');
    }
  }

  /**
   * Retrieves production logs, optionally filtered by a date range.
   * @param filters - An object with optional startDate and endDate.
   */
  async getProductionLogs(filters?: ReportFilterState): Promise<any[]> {
    try {
        let query: Query = this.db.collection(this.productionLogsCollection);
        
        // The field to order by depends on the most common date field in logs.
        // Assuming a common field like 'created_at' or using a specific one from a prominent log type.
        // Let's use 'arrival_datetime' as an example sort key if available, otherwise requires more complex logic.
        // For simplicity, we'll sort by a generic 'timestamp' field assumed to be added during logging.
        const dateField = 'created_at'; 
        
        if (filters?.startDate) {
            query = query.where(dateField, '>=', Timestamp.fromDate(filters.startDate));
        }
        if (filters?.endDate) {
            query = query.where(dateField, '<=', Timestamp.fromDate(filters.endDate));
        }
        
        query = query.orderBy(dateField, 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert any Timestamps to string dates for client-side compatibility
            for (const key in data) {
                if (data[key] instanceof Timestamp) {
                    data[key] = data[key].toDate().toISOString();
                }
            }
            return { id: doc.id, ...data };
        });

    } catch (error) {
        console.error('Error fetching production logs:', error);
        throw new Error('Failed to load production logs from the database.');
    }
  }


  /**
   * Saves a production log entry to the `production_logs` collection.
   * @param data - The data object for the production stage.
   * @returns An object indicating success and the ID of the created document.
   */
  async saveProductionLog(data: any): Promise<{ success: boolean, id: string, error?: string }> {
      try {
          // Add a server-side timestamp for consistent ordering and filtering
          const logData = { ...data, created_at: Timestamp.now() };
          const docRef = await this.db.collection(this.productionLogsCollection).add(logData);
          return { success: true, id: docRef.id };
      } catch (error) {
          console.error(`Error saving production log for stage '${data.stage_name}':`, error);
          return { success: false, id: '', error: (error as Error).message };
      }
  }


  /**
   * Retrieves multiple inventory items by their names in a single query.
   * @param names An array of item names to retrieve.
   * @returns A map of item names to their inventory item objects.
   */
  async getMultipleInventoryItemsByNames(names: string[]): Promise<Map<string, InventoryItem>> {
    const results = new Map<string, InventoryItem>();
    if (names.length === 0) {
      return results;
    }

    try {
      const q = this.db.collection(this.inventoryCollection).where("name", "in", names);
      const querySnapshot = await q.get();

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name) {
          results.set(data.name, { id: docSnap.id, ...data } as InventoryItem);
        }
      });
      return results;

    } catch (error) {
      console.error(`Error fetching multiple inventory items:`, error);
      throw new Error(`Failed to load items: ${names.join(', ')}`);
    }
  }


  /**
   * Retrieves a single inventory item by its name.
   * @param name The name of the item to retrieve.
   * @returns The inventory item object or null if not found.
   */
  async getInventoryItemByName(name: string): Promise<InventoryItem | null> {
    try {
        const q = this.db.collection(this.inventoryCollection).where("name", "==", name).limit(1);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        
        if (data.lastUpdated instanceof Timestamp) {
            data.lastUpdated = data.lastUpdated.toDate().toISOString();
        }

        return { id: docSnap.id, ...data } as InventoryItem;
    } catch (error) {
        console.error(`Error fetching inventory item by name '${name}':`, error);
        throw new Error(`Failed to load item '${name}'`);
    }
  }
  
  /**
   * Gets a list of all inventory items.
   */
  async getAllInventoryItems(): Promise<InventoryItem[]> {
     try {
        const q = this.db.collection(this.inventoryCollection).orderBy("category").orderBy("name");
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
     } catch (error) {
        console.error('Error fetching all inventory items:', error);
        throw new Error('Failed to load inventory data');
     }
  }

  /**
   * Gets a list of inventory items by category.
   * @param category The category to filter by.
   */
  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
      try {
          const q = this.db.collection(this.inventoryCollection)
              .where("category", "==", category)
              .orderBy("name");
          const querySnapshot = await q.get();
          return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      } catch (error) {
          console.error(`Error fetching inventory items for category '${category}':`, error);
          throw new Error(`Failed to load inventory for category ${category}`);
      }
  }

  /**
   * Atomically finds an item by name and updates its quantity, or creates it if it doesn't exist.
   * Logs the transaction.
   * @param itemName The name of the item (e.g., "Raw Cashew Nuts").
   * @param category The category of the item (e.g., "Raw Materials").
   * @param quantityChange The amount to add (positive) or remove (negative).
   * @param unit The unit of measurement (e.g., "kg").
   * @param notes Detailed notes for the transaction log.
   * @returns An object indicating success and the ID of the created/updated document.
   */
  async findAndUpdateOrCreate(itemName: string, category: string, quantityChange: number, unit: string, notes: string) {
    const inventoryColRef = this.db.collection(this.inventoryCollection) as CollectionReference<InventoryItem>;
    const q = inventoryColRef.where("name", "==", itemName).limit(1);

    try {
      const snapshot = await q.get();
      let docId: string;

      if (snapshot.empty) {
        const newItemData = {
          name: itemName,
          quantity: quantityChange,
          category,
          unit,
          lastUpdated: Timestamp.now(),
        };
        const docRef = await inventoryColRef.add(newItemData as any);
        docId = docRef.id;

        await this.createLog({
          itemId: docId,
          action: 'create',
          quantity: quantityChange,
          user: 'system',
          notes: `Created new item: ${itemName}. Notes: ${notes}`,
        });

      } else {
        const docRef = snapshot.docs[0].ref as DocumentReference<InventoryItem>;
        docId = docRef.id;

        await this.db.runTransaction(async (transaction) => {
          const itemDoc = await transaction.get(docRef);
          if (!itemDoc.exists) {
            throw new Error(`Document for ${itemName} does not exist!`);
          }
          const currentData = itemDoc.data();
          const currentQuantity = currentData?.quantity || 0;
          const currentUnit = currentData?.unit || unit;
          const newQuantity = currentQuantity + quantityChange;
          
          transaction.update(docRef, {
            quantity: newQuantity,
            lastUpdated: Timestamp.now(),
            ...(currentUnit !== unit && { unit }),
          });
          
           await this.createLog({
            itemId: docId,
            action: quantityChange > 0 ? 'add' : 'remove',
            quantity: Math.abs(quantityChange),
            previousQuantity: currentQuantity,
            user: 'system',
            notes,
          });
        });
      }

      return { success: true, id: docId };

    } catch (error) {
      console.error(`Error in findAndUpdateOrCreate for '${itemName}':`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Creates a log entry for an inventory transaction.
   * @param logData The data for the log entry.
   */
  private async createLog(logData: {
    itemId: string;
    action: 'create' | 'add' | 'remove';
    quantity: number;
    previousQuantity?: number;
    user: string;
    notes: string;
  }): Promise<void> {
    try {
      const logWithTimestamp = {
        ...logData,
        timestamp: Timestamp.now(),
      };
      await this.db.collection(this.logsCollection).add(logWithTimestamp);
    } catch (error) {
      console.error('Error creating inventory log:', error);
    }
  }
}
