
import { 
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query,
  WriteBatch,
} from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import type { InventoryItem, InventoryLog, ReportFilterState } from '@/types';
import { CNS_SHELL_WASTE_NAME, DRIED_KERNELS_FOR_PEELING_NAME, PAINTED_LOGO_BOXES_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RAW_CASHEW_NUTS_NAME, RCN_FOR_STEAMING_NAME, SHELLED_KERNELS_FOR_DRYING_NAME, TESTA_PEEL_WASTE_NAME, VACUUM_BAGS_NAME, WHITE_PLAIN_BOXES_NAME } from './constants';


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
          // Serialize Timestamp
          if (data.lastUpdated instanceof Timestamp) {
            data.lastUpdated = data.lastUpdated.toDate().toISOString();
          }
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
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            if (data.lastUpdated instanceof Timestamp) {
                data.lastUpdated = data.lastUpdated.toDate().toISOString();
            }
            return { id: doc.id, ...data } as InventoryItem
        });
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
          return querySnapshot.docs.map(doc => {
              const data = doc.data();
              if (data.lastUpdated instanceof Timestamp) {
                  data.lastUpdated = data.lastUpdated.toDate().toISOString();
              }
              return { id: doc.id, ...data } as InventoryItem;
          });
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
   * @param action The type of action for logging purposes.
   * @param batch Optional Firestore WriteBatch to include this operation in.
   * @returns An object indicating success and the ID of the created/updated document.
   */
  async findAndUpdateOrCreate(itemName: string, category: string, quantityChange: number, unit: string, notes: string, action: 'create' | 'add' | 'remove' | 'update' | 'reversal', batch?: WriteBatch) {
    const inventoryColRef = this.db.collection(this.inventoryCollection) as CollectionReference<InventoryItem>;
    const q = inventoryColRef.where("name", "==", itemName).limit(1);

    const runUpdate = async (transactionOrBatch: FirebaseFirestore.Transaction | WriteBatch) => {
        const snapshot = await (transactionOrBatch instanceof (this.db.batch() as any).constructor ? q.get() : (transactionOrBatch as FirebaseFirestore.Transaction).get(q));
        
        let docId: string;

        if (snapshot.empty) {
            if (action === 'reversal') {
                console.warn(`Attempted to reverse a transaction for a non-existent item: ${itemName}. Skipping.`);
                return { success: true, id: '' };
            }
            const newItemData = {
                name: itemName,
                quantity: quantityChange,
                category,
                unit,
                lastUpdated: Timestamp.now(),
            };
            const docRef = inventoryColRef.doc();
            docId = docRef.id;
            transactionOrBatch.set(docRef, newItemData as any);

            await this.createLog({
                itemId: docId,
                action: 'create',
                quantity: quantityChange,
                user: 'system',
                notes: `Created new item: ${itemName}. Notes: ${notes}`,
            }, batch);

        } else {
            const docRef = snapshot.docs[0].ref as DocumentReference<InventoryItem>;
            docId = docRef.id;

            const itemDoc = snapshot.docs[0];
            const currentData = itemDoc.data();
            const currentQuantity = currentData?.quantity || 0;
            const currentUnit = currentData?.unit || unit;
            const newQuantity = currentQuantity + quantityChange;
            
            const updateData: any = {
                quantity: newQuantity,
                lastUpdated: Timestamp.now(),
            };
            if (currentUnit !== unit) {
                updateData.unit = unit;
            }

            transactionOrBatch.update(docRef, updateData);
            
            await this.createLog({
                itemId: docId,
                action: action,
                quantity: Math.abs(quantityChange),
                previousQuantity: currentQuantity,
                user: 'system',
                notes,
            }, batch);
        }

        return { success: true, id: docId };
    };
    
    if (batch) {
        return await runUpdate(batch);
    } else {
        try {
            return await this.db.runTransaction(async (transaction) => {
                return await runUpdate(transaction);
            });
        } catch (error) {
            console.error(`Error in findAndUpdateOrCreate transaction for '${itemName}':`, error);
            return { success: false, error: (error as Error).message };
        }
    }
  }

  /**
   * Creates a log entry for an inventory transaction.
   * @param logData The data for the log entry.
   * @param batch Optional Firestore WriteBatch to include this operation in.
   */
  private async createLog(logData: {
    itemId: string;
    action: string;
    quantity: number;
    previousQuantity?: number;
    user: string;
    notes: string;
  }, batch?: WriteBatch): Promise<void> {
    try {
      const logWithTimestamp = {
        ...logData,
        timestamp: Timestamp.now(),
      };
      const logRef = this.db.collection(this.logsCollection).doc();
      if (batch) {
        batch.set(logRef, logWithTimestamp);
      } else {
        await logRef.set(logWithTimestamp);
      }
    } catch (error) {
      console.error('Error creating inventory log:', error);
    }
  }


  /**
   * Finds all production logs by a specific user and reverses the inventory transactions they created.
   * Then deletes the logs.
   * @param username The username to match.
   * @returns The number of logs processed.
   */
  async undoProductionLogsByUser(username: string): Promise<number> {
      const userFields = ['supervisor_id', 'receiver_id', 'dispatcher_id', 'calibrated_by_id', 'qc_officer_id', 'operator_id', 'authorized_by_id'];
      const collectionRef = this.db.collection(this.productionLogsCollection);
      const logsToUndo: { id: string, data: any }[] = [];
      const processedIds = new Set<string>();

      for (const field of userFields) {
          const q = collectionRef.where(field, '==', username);
          const snapshot = await q.get();
          snapshot.forEach(doc => {
              if (!processedIds.has(doc.id)) {
                  logsToUndo.push({ id: doc.id, data: doc.data() });
                  processedIds.add(doc.id);
              }
          });
      }

      if (logsToUndo.length === 0) {
          return 0;
      }
      
      const batch = this.db.batch();

      for (const { id, data } of logsToUndo) {
          const reversalNotes = `Reversal of log ${id} by user '${username}'.`;
          // Reverse inventory transactions based on log stage_name
          switch (data.stage_name) {
              case 'RCN Intake':
                  if (data.net_weight_kg) {
                      await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -data.net_weight_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'RCN Output to Factory':
                   if (data.quantity_kg) {
                      await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', data.quantity_kg, 'kg', reversalNotes, 'reversal', batch);
                      await this.findAndUpdateOrCreate(RCN_FOR_STEAMING_NAME, 'In-Process Goods', -data.quantity_kg, 'kg', reversalNotes, 'reversal', batch);
                   }
                  break;
              case 'Other Materials Intake':
                  const qtyChange = data.transaction_type === 'transfer' ? Math.abs(data.quantity) : -data.quantity;
                  if (data.item_name && qtyChange !== 0) {
                    await this.findAndUpdateOrCreate(data.item_name, 'Other Materials', qtyChange, data.unit, reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'Goods Dispatched':
                  if (data.dispatched_items && Array.isArray(data.dispatched_items)) {
                      for (const item of data.dispatched_items) {
                          await this.findAndUpdateOrCreate(item.item_name, 'Finished Goods', item.quantity, item.unit, reversalNotes, 'reversal', batch);
                      }
                  }
                  break;
              case 'Steaming Process':
                  if (data.weight_before_steam_kg) {
                      await this.findAndUpdateOrCreate(RCN_FOR_STEAMING_NAME, 'In-Process Goods', data.weight_before_steam_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'Shelling Process':
                  if (data.shelled_kernels_weight_kg) {
                      await this.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', -data.shelled_kernels_weight_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  if (data.shell_waste_weight_kg) {
                      await this.findAndUpdateOrCreate(CNS_SHELL_WASTE_NAME, 'By-Products', -data.shell_waste_weight_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'Drying Process':
                  if (data.wet_kernel_weight_kg) {
                      await this.findAndUpdateOrCreate(SHELLED_KERNELS_FOR_DRYING_NAME, 'In-Process Goods', data.wet_kernel_weight_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  if (data.dry_kernel_weight_kg) {
                      await this.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', -data.dry_kernel_weight_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'Peeling Process':
                  if (data.dried_kernel_input_kg) {
                      await this.findAndUpdateOrCreate(DRIED_KERNELS_FOR_PEELING_NAME, 'In-Process Goods', data.dried_kernel_input_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  if (data.peeled_kernels_kg) {
                      await this.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -data.peeled_kernels_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  if (data.peel_waste_kg) {
                      await this.findAndUpdateOrCreate(TESTA_PEEL_WASTE_NAME, 'By-Products', -data.peel_waste_kg, 'kg', reversalNotes, 'reversal', batch);
                  }
                  break;
              case 'Packaging':
                  let totalKernelsReversed = 0;
                  if (data.packed_items && Array.isArray(data.packed_items)) {
                      for (const item of data.packed_items) {
                          const weightReversed = item.number_of_packs * (data.package_weight_kg || 22.68);
                          await this.findAndUpdateOrCreate(item.kernel_grade, 'Finished Goods', -weightReversed, 'kg', reversalNotes, 'reversal', batch);
                          totalKernelsReversed += weightReversed;
                      }
                  }
                  if (totalKernelsReversed > 0) {
                      await this.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', totalKernelsReversed, 'kg', reversalNotes, 'reversal', batch);
                  }
                  const packagesUsed = data.total_packs_produced || 0;
                  const damagedPouches = data.damaged_pouches || 0;
                  const totalPouchesConsumed = packagesUsed + damagedPouches;
                  if (totalPouchesConsumed > 0) {
                      await this.findAndUpdateOrCreate(WHITE_PLAIN_BOXES_NAME, 'Other Materials', packagesUsed, 'boxes', reversalNotes, 'reversal', batch);
                      await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', totalPouchesConsumed, 'bags', reversalNotes, 'reversal', batch);
                  }
                  break;
              // Non-inventory-affecting logs can just be deleted.
              case 'Equipment Calibration':
              case 'RCN Sizing & Calibration':
              case 'RCN Quality Assessment':
              case 'Machine Grading':
              case 'Manual Peeling Refinement':
              case 'Quality Control (Final)':
                  break;
          }
          // Delete the log itself
          batch.delete(collectionRef.doc(id));
      }

      await batch.commit();
      return logsToUndo.length;
  }

  /**
   * Exports all production logs to a CSV string.
   * @returns A CSV string representing all production logs.
   */
  async exportProductionLogsToCSV(): Promise<string> {
    const snapshot = await this.db.collection(this.productionLogsCollection).orderBy('created_at', 'desc').get();
    if (snapshot.empty) {
        return "No logs found.";
    }

    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const headers = new Set<string>();
    headers.add('id'); // Ensure document ID is always a header

    const processedLogs = logs.map(log => {
        const flatLog: { [key: string]: any } = {};
        
        function flattenObject(obj: any, prefix = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const newKey = prefix ? `${prefix}_${key}` : key;
                    const value = obj[key];
                    if (value instanceof Timestamp) {
                        flatLog[newKey] = value.toDate().toISOString();
                    } else if (Array.isArray(value)) {
                        flatLog[newKey] = JSON.stringify(value);
                    } else if (typeof value === 'object' && value !== null) {
                        flattenObject(value, newKey);
                    } else {
                        flatLog[newKey] = value;
                    }
                    headers.add(newKey);
                }
            }
        }
        
        flattenObject(log);
        return flatLog;
    });

    const headerArray = Array.from(headers);
    const headerRow = headerArray.map(h => `"${h.replace(/"/g, '""')}"`).join(',');

    const rows = processedLogs.map(log => {
        return headerArray.map(header => {
            const value = log[header];
            if (value === null || value === undefined) {
                return '';
            }
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  }
}
