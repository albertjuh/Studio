

import { 
  Timestamp,
  CollectionReference,
  DocumentReference,
  Query,
  WriteBatch,
} from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import type { InventoryItem, InventoryLog, ReportFilterState, PackagingFormValues, OtherMaterialsIntakeFormValues, RcnSizingCalibrationFormValues, RcnIntakeEntry, RcnOutputToFactoryEntry, BatchIdWithWeight, VacuumBagWastageFormValues, VacuumBagIntakeFormValues, VacuumBagBatch, TraceabilityResult } from '@/types';
import { CNS_SHELL_WASTE_NAME, DRIED_KERNELS_FOR_PEELING_NAME, PAINTED_LOGO_BOXES_NAME, PEELED_KERNELS_FOR_PACKAGING_NAME, RAW_CASHEW_NUTS_NAME, RCN_FOR_SIZING_NAME, SHELLED_KERNELS_FOR_DRYING_NAME, TESTA_PEEL_WASTE_NAME, VACUUM_BAGS_NAME, WHITE_PLAIN_BOXES_NAME, PACKAGE_WEIGHT_KG, VACUUM_BAGS_BASE_NAME, VACUUM_BAGS_CARTON_QTY } from './constants';
import { format } from 'date-fns';


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
  
  public getBatch(): WriteBatch {
    return this.db.batch();
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
      
      return logsSnapshot.docs.map(doc => {
        const logData = doc.data();
        
        return {
          id: doc.id,
          ...logData,
          timestamp: (logData.timestamp as Timestamp).toDate().toISOString(),
        } as InventoryLog;
      });

    } catch (error) {
      console.error('Error fetching latest inventory logs:', error);
      throw new Error('Failed to load inventory logs');
    }
  }

  /**
   * Retrieves production logs, optionally filtered by a date range and search query.
   * @param filters - An object with optional startDate, endDate, and searchQuery.
   */
  async getProductionLogs(filters?: ReportFilterState): Promise<any[]> {
    try {
        let query: Query = this.db.collection(this.productionLogsCollection);
        
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

        let logs = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert any Firestore Timestamps to ISO strings for client-side compatibility
            for (const key in data) {
                if (data[key] instanceof Timestamp) {
                    data[key] = data[key].toDate().toISOString();
                }
            }
            return { id: doc.id, ...data };
        });

       if (filters?.searchQuery) {
            const searchTerms = filters.searchQuery.toLowerCase().split(' ').filter(Boolean);
            logs = logs.filter(log => {
                const logString = JSON.stringify(Object.values(log)).toLowerCase();
                return searchTerms.every(term => logString.includes(term));
            });
        }

        return logs;

    } catch (error) {
        console.error('Error fetching production logs:', error);
        throw new Error('Failed to load production logs from the database.');
    }
  }


  /**
   * Saves a production log entry to the `production_logs` collection.
   * This method now ALWAYS generates a new Firestore ID for consistency.
   * The original form-generated ID might be stored within the data if needed.
   * @param data - The data object for the production stage.
   * @returns An object indicating success and the ID of the created document.
   */
  async saveProductionLog(data: any, legacyId?: string): Promise<{ success: boolean; id: string; error?: string }> {
      try {
          const docRef = legacyId ? this.db.collection(this.productionLogsCollection).doc(legacyId) : this.db.collection(this.productionLogsCollection).doc();
          const logData = { ...data, id: docRef.id, created_at: Timestamp.now() };
          await docRef.set(logData);
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

  async getActiveRcnIntakeBatches(): Promise<{ id: string; available_kg: number }[]> {
    try {
      const q = this.db.collection(this.inventoryCollection)
        .where('type', '==', 'rcn_batch')
        .where('quantity', '>', 0);
      
      const querySnapshot = await q.get();

      if (querySnapshot.empty) {
        return [];
      }

      const results = querySnapshot.docs.map(doc => ({
        id: doc.data().name,
        available_kg: doc.data().quantity,
      }));
      
      return results.sort((a, b) => b.id.localeCompare(a.id));
    } catch (error) {
      console.error('Error fetching active RCN intake batches:', error);
      throw new Error('Failed to load active RCN batches from database.');
    }
  }
  
  async getActiveRcnForSizingBatches(): Promise<InventoryItem[]> {
    try {
      const q = this.db.collection(this.inventoryCollection)
        .where("type", "==", "rcn_for_sizing")
        .where("quantity", ">", 0)
        .orderBy('name', 'asc');
      
      const querySnapshot = await q.get();
      
      return querySnapshot.docs.map(doc => {
          const data = doc.data();
           if (data.lastUpdated instanceof Timestamp) {
            data.lastUpdated = data.lastUpdated.toDate().toISOString();
           }
          return { id: doc.id, ...data } as InventoryItem
      });
    } catch (error) {
      console.error('Error fetching active RCN for sizing batches:', error);
      throw new Error('Failed to load active RCN for sizing batches.');
    }
  }

  async getActiveVacuumBagBatches(): Promise<InventoryItem[]> {
    try {
      const query = this.db.collection(this.inventoryCollection)
        .where("type", "==", "vacuum_bag_carton")
        .where("quantity", ">", 0)
        .orderBy("name", "desc");

      const querySnapshot = await query.get();
      const results = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (data.lastUpdated instanceof Timestamp) {
          data.lastUpdated = data.lastUpdated.toDate().toISOString();
        }
        return { id: doc.id, ...data } as InventoryItem;
      });
      return results;
    } catch (error) {
      console.error('Error fetching active vacuum bag batches:', error);
      throw new Error(`Failed to load active vacuum bag batches: ${(error as Error).message}`);
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
  async findAndUpdateOrCreate(itemName: string, category: string, quantityChange: number, unit: string, notes: string, action: 'create' | 'add' | 'remove' | 'update' | 'reversal', batch?: WriteBatch, options?: { type?: string }) {
    const inventoryColRef = this.db.collection(this.inventoryCollection) as CollectionReference<InventoryItem>;
    const q = inventoryColRef.where("name", "==", itemName).limit(1);

    const runUpdate = async (transactionOrBatch: FirebaseFirestore.Transaction | WriteBatch) => {
        const snapshot = await (transactionOrBatch instanceof (this.db.batch() as any).constructor ? q.get() : (transactionOrBatch as FirebaseFirestore.Transaction).get(q));
        
        let docId: string;
        let itemNameForLog: string = itemName;

        if (snapshot.empty) {
            if (quantityChange <= 0 && action !== 'create') {
              console.warn(`Attempted to deduct from a non-existent item: ${itemName}. Skipping operation.`);
              return { success: true, id: '' }; // Prevent creating items with negative/zero balance
            }
            if (action === 'reversal') {
                console.warn(`Attempted to reverse a transaction for a non-existent item: ${itemName}. Skipping.`);
                return { success: true, id: '' };
            }
            const newItemData: any = {
                name: itemName,
                quantity: quantityChange,
                category,
                unit,
                lastUpdated: Timestamp.now(),
            };

             if (options?.type) {
                newItemData.type = options.type;
            }

            const docRef = inventoryColRef.doc();
            docId = docRef.id;
            transactionOrBatch.set(docRef, newItemData);
            itemNameForLog = newItemData.name;

            await this.createLog({
                itemId: docId,
                itemName: itemNameForLog,
                itemUnit: unit,
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
            itemNameForLog = currentData?.name || itemName;
            const newQuantity = currentQuantity + quantityChange;
            
            // If it's a finished good and the new quantity is zero or less, delete it.
            if (category === 'Finished Goods' && newQuantity <= 0) {
                transactionOrBatch.delete(docRef);
            } else {
                const updateData: any = {
                    quantity: newQuantity,
                    lastUpdated: Timestamp.now(),
                };
                if (currentUnit !== unit) {
                    updateData.unit = unit;
                }
                transactionOrBatch.update(docRef, updateData);
            }
            
            await this.createLog({
                itemId: docId,
                itemName: itemNameForLog,
                itemUnit: unit,
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
  private async createLog(logData: Omit<InventoryLog, 'id' | 'timestamp'>, batch?: WriteBatch): Promise<void> {
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
   * Reverses the inventory transactions for a single production log.
   * @param data The log data.
   * @param logId The ID of the log being reversed.
   * @param batch The Firestore WriteBatch to use.
   */
  private async reverseSingleLogTransaction(data: any, logId: string, batch: WriteBatch): Promise<void> {
    const reversalNotes = `Reversal of log ${logId}.`;
    switch (data.stage_name) {
        case 'RCN Intake':
            const intakeData = data as RcnIntakeEntry;
            const netWeight = intakeData.gross_weight_kg - (intakeData.tare_weight_kg || 0);
            await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -netWeight, 'kg', reversalNotes, 'reversal', batch);
            break;
        case 'RCN Output to Factory':
            const outputData = data as RcnOutputToFactoryEntry;
            if (outputData.output_batches && Array.isArray(outputData.output_batches)) {
              const totalOutputKg = outputData.output_batches.reduce((sum, b) => sum + b.weight_kg, 0);
              if (totalOutputKg > 0) {
                  await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', totalOutputKg, 'kg', reversalNotes, 'reversal', batch);
                  await this.findAndUpdateOrCreate(RCN_FOR_SIZING_NAME, 'In-Process Goods', -totalOutputKg, 'kg', reversalNotes, 'reversal', batch, { type: 'rcn_for_sizing' });
              }
            }
            break;
        case 'Other Materials Intake':
            const finalItemName = data.resolved_item_name || (data.item_name === 'Other/Uncategorized' ? data.custom_item_name : data.item_name);
            const qtyChange = data.transaction_type === 'transfer' ? Math.abs(data.quantity) : -data.quantity;
            if (finalItemName && qtyChange !== 0) {
              await this.findAndUpdateOrCreate(finalItemName, 'Other Materials', qtyChange, data.unit, reversalNotes, 'reversal', batch);
            }
            break;
        case 'Vacuum Bag Intake':
            const numCartons = Math.floor(data.numberOfCartons);
            const totalBags = data.numberOfCartons * VACUUM_BAGS_CARTON_QTY;

            // Reverse the main summary item
            await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -totalBags, 'bags', reversalNotes, 'reversal', batch);

            for(let i = 1; i <= numCartons; i++) {
                const cartonId = `${data.shipmentId}-${String(i).padStart(2, '0')}`;
                const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${cartonId}`;
                await this.findAndUpdateOrCreate(cartonItemName, 'Other Materials', -VACUUM_BAGS_CARTON_QTY, 'bags', reversalNotes, 'reversal', batch);
            }
            break;
        case 'Vacuum Bag Wastage':
             const wastedItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${data.cartonId}`;
             await this.findAndUpdateOrCreate(wastedItemName, 'Other Materials', data.quantity, 'bags', reversalNotes, 'reversal', batch);
             await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', data.quantity, 'bags', reversalNotes, 'reversal', batch);
            break;
        case 'Goods Dispatched':
             if (data.dispatch_category === 'Finished Goods' && data.dispatched_items && Array.isArray(data.dispatched_items)) {
                for (const item of data.dispatched_items) {
                    await this.findAndUpdateOrCreate(item.item_name, 'Finished Goods', item.quantity, item.unit, reversalNotes, 'reversal', batch);
                }
            } else if (data.dispatch_category === 'By-Products / Waste' && data.item_name) {
                const netWeightDispatch = (data.gross_weight_kg || 0) - (data.tare_weight_kg || 0);
                if (netWeightDispatch > 0) {
                    await this.findAndUpdateOrCreate(data.item_name, 'By-Products', netWeightDispatch, 'kg', reversalNotes, 'reversal', batch);
                }
            }
            break;
        case 'Steaming Process':
            if (data.weight_before_steam_kg) {
                await this.findAndUpdateOrCreate(data.linked_intake_batch_id, 'In-Process Goods', data.weight_before_steam_kg, 'kg', reversalNotes, 'reversal', batch);
            }
            if (data.weight_after_steam_kg) {
                await this.findAndUpdateOrCreate(data.steam_batch_id, 'In-Process Goods', -data.weight_after_steam_kg, 'kg', reversalNotes, 'reversal', batch);
            }
            break;
        case 'Shelling Process':
            if (data.steamed_weight_input_kg) {
               await this.findAndUpdateOrCreate(data.linked_steam_batch_id, 'In-Process Goods', data.steamed_weight_input_kg, 'kg', reversalNotes, 'reversal', batch);
           }
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
            const packagingData = data as PackagingFormValues;
            
            for (const item of packagingData.packed_items || []) {
              const weightForGrade = item.number_of_packs * PACKAGE_WEIGHT_KG;
              const finishedGoodsName = `${item.kernel_grade} (Lot: ${packagingData.linked_lot_number})`;
              await this.findAndUpdateOrCreate(finishedGoodsName, 'Finished Goods', -weightForGrade, 'kg', reversalNotes, 'reversal', batch);
            }
            
            const totalKernelsConsumedKg = packagingData.packed_items?.reduce((sum, item) => sum + (item.number_of_packs * PACKAGE_WEIGHT_KG), 0) || 0;
            if (totalKernelsConsumedKg > 0) {
              await this.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', totalKernelsConsumedKg, 'kg', reversalNotes, 'reversal', batch);
            }

            const totalPacks = packagingData.packed_items?.reduce((sum, item) => sum + item.number_of_packs, 0) || 0;
            if(totalPacks > 0) {
                const boxItemName = packagingData.box_type === WHITE_PLAIN_BOXES_NAME ? WHITE_PLAIN_BOXES_NAME : PAINTED_LOGO_BOXES_NAME;
                if (boxItemName) {
                    await this.findAndUpdateOrCreate(boxItemName, 'Other Materials', totalPacks, 'boxes', reversalNotes, 'reversal', batch);
                }
                const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${data.vacuum_bag_carton_id}`;
                await this.findAndUpdateOrCreate(cartonItemName, 'Other Materials', totalPacks, 'bags', reversalNotes, 'reversal', batch);
                await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', totalPacks, 'bags', reversalNotes, 'reversal', batch);
            }
            break;
        case 'RCN Sizing & Calibration':
            if (data.input_weight_kg) {
                await this.findAndUpdateOrCreate(data.linked_rcn_batch_id, 'In-Process Goods', data.input_weight_kg, 'kg', reversalNotes, 'reversal', batch);
            }
            break;
        // Non-inventory-affecting logs don't need inventory reversal.
        case 'Equipment Calibration':
        case 'RCN Quality Assessment':
        case 'Machine Grading':
        case 'Manual Peeling Refinement':
        case 'Quality Control (Final)':
            break;
    }
  }


  /**
   * Finds all production logs by a specific user and reverses the inventory transactions they created.
   * Then deletes the logs.
   * @param username The username to match.
   * @returns The number of logs processed.
   */
  async undoProductionLogsByUser(username: string): Promise<number> {
      const userFields = ['supervisor_id', 'receiver_id', 'dispatcher_id', 'calibrated_by_id', 'qc_officer_id', 'operator_id', 'authorized_by_id', 'responsible_person', 'receiverId'];
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
          await this.reverseSingleLogTransaction(data, id, batch);
          batch.delete(collectionRef.doc(id));
      }

      await batch.commit();
      return logsToUndo.length;
  }
  
  
  /**
   * Deletes a single production log and reverses its inventory transactions.
   * @param logId The ID of the production log to delete. This can be the Firestore document ID or a legacy internal ID.
   * @returns An object indicating success or failure.
   */
  async deleteProductionLogAndReverseTransactions(logId: string): Promise<{ success: boolean; error?: string }> {
      const collectionRef = this.db.collection(this.productionLogsCollection);
      let logRef: DocumentReference | null = null;
      let logDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  
      // Try to get by document ID first (for new data)
      const docById = await collectionRef.doc(logId).get();
      if (docById.exists) {
          logRef = docById.ref;
          logDoc = docById;
      } else {
          // If not found, search by legacy internal IDs (for old data)
          const legacyIdFields = ['id', 'shell_process_id', 'steam_batch_id', 'qa_rcn_batch_id', 'sizing_batch_id', 'calibration_log_id', 'intake_batch_id'];
          for (const field of legacyIdFields) {
              const q = collectionRef.where(field, '==', logId).limit(1);
              const snapshot = await q.get();
              if (!snapshot.empty) {
                  logRef = snapshot.docs[0].ref;
                  logDoc = snapshot.docs[0];
                  break;
              }
          }
      }
  
      if (!logRef || !logDoc) {
          return { success: false, error: `Log with ID ${logId} not found.` };
      }
  
      try {
          const logData = logDoc.data();
          if (!logData) {
              throw new Error(`No data found for log ID ${logId}.`);
          }
  
          const batchForReversal = this.db.batch();
          await this.reverseSingleLogTransaction(logData, logId, batchForReversal);
          batchForReversal.delete(logRef);
          await batchForReversal.commit();
  
          return { success: true };
  
      } catch (error) {
          console.error(`Error deleting production log ${logId}:`, error);
          return { success: false, error: (error as Error).message };
      }
  }

  /**
   * Updates a packaging log and its related inventory transactions atomically.
   * @param logId The ID of the packaging log to update.
   * @param newData The new data for the packaging log.
   */
  async updatePackagingLog(logId: string, newData: PackagingFormValues): Promise<{ success: boolean; id: string; error?: string }> {
    const logRef = this.db.collection(this.productionLogsCollection).doc(logId);

    try {
        return await this.db.runTransaction(async (transaction) => {
            const logDoc = await transaction.get(logRef);
            if (!logDoc.exists) {
                throw new Error(`Packaging log with ID ${logId} not found.`);
            }
            
            const batchForReversal = this.db.batch();
            await this.reverseSingleLogTransaction(logDoc.data(), logId, batchForReversal);
            await batchForReversal.commit();

            const batchForNewActions = this.db.batch();
            const totalPacks = newData.packed_items?.reduce((sum, item) => sum + item.number_of_packs, 0) || 0;
            const newKernelsConsumedKg = totalPacks * PACKAGE_WEIGHT_KG;

            if (newKernelsConsumedKg > 0) {
                await this.findAndUpdateOrCreate(PEELED_KERNELS_FOR_PACKAGING_NAME, 'In-Process Goods', -newKernelsConsumedKg, 'kg', `Update of packaging log: ${logId}`, 'update', batchForNewActions);
            }
            for (const item of newData.packed_items || []) {
                const weightForGrade = item.number_of_packs * PACKAGE_WEIGHT_KG;
                const finishedGoodsName = `${item.kernel_grade} (Lot: ${newData.linked_lot_number})`;
                await this.findAndUpdateOrCreate(finishedGoodsName, 'Finished Goods', weightForGrade, 'kg', `Update of packaging log: ${logId}`, 'update', batchForNewActions);
            }
            if(totalPacks > 0) {
                const boxItemName = newData.box_type === WHITE_PLAIN_BOXES_NAME ? WHITE_PLAIN_BOXES_NAME : PAINTED_LOGO_BOXES_NAME;
                if (boxItemName) {
                    await this.findAndUpdateOrCreate(boxItemName, 'Other Materials', -totalPacks, 'boxes', `Update of packaging log: ${logId}`, 'update', batchForNewActions);
                }
                const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${newData.vacuum_bag_carton_id}`;
                await this.findAndUpdateOrCreate(cartonItemName, 'Other Materials', -totalPacks, 'bags', `Update of packaging log: ${logId}`, 'update', batchForNewActions, { type: 'vacuum_bag_carton' });
                await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -totalPacks, 'bags', `Update of packaging log: ${logId}`, 'update', batchForNewActions);
            }
            await batchForNewActions.commit();

            transaction.update(logRef, { ...newData, updated_at: Timestamp.now() });

            return { success: true, id: logId };
        });
    } catch (error) {
        console.error(`Error updating packaging log ${logId}:`, error);
        return { success: false, id: logId, error: (error as Error).message };
    }
}

  async updateOtherMaterialsLog(logId: string, newData: OtherMaterialsIntakeFormValues): Promise<{ success: boolean; id: string; error?: string, itemName?: string }> {
    const logRef = this.db.collection(this.productionLogsCollection).doc(logId);

    try {
        const finalItemName = newData.item_name === 'Other/Uncategorized' ? newData.custom_item_name : newData.item_name;
        if (!finalItemName) {
            return { success: false, error: "Item name could not be determined." };
        }
        
        return await this.db.runTransaction(async (transaction) => {
            const logDoc = await transaction.get(logRef);
            if (!logDoc.exists) {
                throw new Error(`Other Materials log with ID ${logId} not found.`);
            }
            const oldData = logDoc.data() as OtherMaterialsIntakeFormValues;

            const batchForReversal = this.db.batch();
            const oldItemName = oldData.item_name === 'Other/Uncategorized' ? oldData.custom_item_name : oldData.item_name;
            await this.reverseSingleLogTransaction({ ...oldData, resolved_item_name: oldItemName }, logId, batchForReversal);
            await batchForReversal.commit();
            
            const batchForNewActions = this.db.batch();
            const quantityChange = newData.transaction_type === 'transfer' ? -Math.abs(newData.quantity) : newData.quantity;
            const notes = `Update to transaction. Type: ${newData.transaction_type}. Ref: ${newData.intake_batch_id || 'N/A'}.`;
            await this.findAndUpdateOrCreate(finalItemName, 'Other Materials', quantityChange, newData.unit, notes, 'update', batchForNewActions);
            await batchForNewActions.commit();
            
            transaction.update(logRef, { ...newData, resolved_item_name: finalItemName, updated_at: Timestamp.now() });

            return { success: true, id: logId, itemName: finalItemName };
        });

    } catch (error) {
        console.error(`Error updating other materials log ${logId}:`, error);
        return { success: false, id: logId, error: (error as Error).message };
    }
}

async updateRcnTransaction(logId: string, newData: any): Promise<{ success: boolean; id: string; error?: string }> {
    const logRef = this.db.collection(this.productionLogsCollection).doc(logId);
    
    try {
        return await this.db.runTransaction(async (transaction) => {
            const logDoc = await transaction.get(logRef);
            if (!logDoc.exists) {
                throw new Error(`RCN transaction log with ID ${logId} not found.`);
            }
            
            const batchForReversal = this.db.batch();
            await this.reverseSingleLogTransaction(logDoc.data(), logId, batchForReversal);
            await batchForReversal.commit();
            const batchForNewActions = this.db.batch();
            if (newData.transaction_type === 'intake') {
                 const notes = `Update to intake from supplier: ${newData.supplier_id}.`;
                 const netWeight = newData.gross_weight_kg - (newData.tare_weight_kg || 0);
                 await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', netWeight, 'kg', notes, 'update', batchForNewActions);
                 newData.net_weight_kg = netWeight;
            } else if (newData.transaction_type === 'output') {
                const notes = `Update to internal Transfer to ${newData.destination_stage}.`;
                const totalOutputKg = newData.output_batches.reduce((sum: number, b: BatchIdWithWeight) => sum + b.weight_kg, 0);
                 if (totalOutputKg > 0) {
                    await this.findAndUpdateOrCreate(RAW_CASHEW_NUTS_NAME, 'Raw Materials', -totalOutputKg, 'kg', notes, 'update', batchForNewActions);
                    for(const outputBatch of newData.output_batches) {
                        await this.findAndUpdateOrCreate(outputBatch.id, 'In-Process Goods', outputBatch.weight_kg, 'kg', notes, 'update', batchForNewActions, { type: 'rcn_for_sizing' });
                    }
                }
            }
            
            await batchForNewActions.commit();
            transaction.update(logRef, { ...newData, updated_at: Timestamp.now() });

            return { success: true, id: logId };
        });
    } catch (error) {
        console.error(`Error updating RCN transaction log ${logId}:`, error);
        return { success: false, id: logId, error: (error as Error).message };
    }
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

  /**
   * Generates the next sequential batch ID for a given prefix and date.
   * e.g., getNextBatchId('VBInt-BATCH', new Date()) -> 'VBInt-BATCH20240801-01'
   * @param prefix The prefix for the batch ID.
   * @param forDate The date for which to generate the ID.
   * @returns The next sequential batch ID string.
   */
  async generateNextBatchId(prefix: string, forDate: Date): Promise<string> {
    const dateStr = format(forDate, 'yyyyMMdd');
    const fullPrefix = `${prefix}${dateStr}-`;

    const q = this.db.collection(this.productionLogsCollection)
        .where('shipmentId', '>=', fullPrefix)
        .where('shipmentId', '<', `${fullPrefix}\uf8ff`)
        .orderBy('shipmentId', 'desc')
        .limit(1);
    
    const snapshot = await q.get();

    if (snapshot.empty) {
        return `${fullPrefix}01`;
    }

    const lastId = snapshot.docs[0].data().shipmentId;
    const lastNumMatch = lastId.match(/-(\d+)$/);
    const lastNum = lastNumMatch ? parseInt(lastNumMatch[1], 10) : 0;
    const nextNum = lastNum + 1;
    
    return `${fullPrefix}${String(nextNum).padStart(2, '0')}`;
  }


  async handleVacuumBagIntake(data: VacuumBagIntakeFormValues & { shipmentId: string }): Promise<{ success: boolean; id?: string; error?: string }> {
    const logResult = await this.saveProductionLog({ ...data, stage_name: 'Vacuum Bag Intake' });
    if (!logResult.success) {
      return logResult;
    }
  
    const batch = this.db.batch();
    const totalBags = data.numberOfCartons * VACUUM_BAGS_CARTON_QTY;
    const notes = `Intake from ${data.supplier} as part of shipment ${data.shipmentId} (${data.numberOfCartons} cartons)`;

    // Update the main summary item
    await this.findAndUpdateOrCreate(
        VACUUM_BAGS_NAME,
        'Other Materials',
        totalBags,
        'bags',
        notes,
        'add',
        batch
    );
    
    // Handle individual cartons
    for (let i = 1; i <= data.numberOfCartons; i++) {
      const cartonId = `${data.shipmentId}-${String(i).padStart(2, '0')}`;
      const itemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${cartonId}`;
      await this.findAndUpdateOrCreate(
        itemName,
        'Other Materials',
        VACUUM_BAGS_CARTON_QTY,
        'bags',
        notes,
        'add',
        batch,
        { type: 'vacuum_bag_carton' }
      );
    }
    
    await batch.commit();
    return { success: true, id: data.shipmentId };
  }
  
  async handleVacuumBagWastage(data: VacuumBagWastageFormValues): Promise<{ success: boolean; id?: string; error?: string }> {
      const logResult = await this.saveProductionLog({ ...data, stage_name: 'Vacuum Bag Wastage' });
      if (!logResult.success) {
          return logResult;
      }
      
      const batch = this.db.batch();
      const notes = `Wastage due to: ${data.reason}`;
      const cartonItemName = `${VACUUM_BAGS_BASE_NAME} - Carton ${data.cartonId}`;
      
      // Deduct from the specific carton
      await this.findAndUpdateOrCreate(cartonItemName, 'Other Materials', -data.quantity, 'bags', notes, 'remove', batch, { type: 'vacuum_bag_carton' });
      
      // Also deduct from the main summary item
      await this.findAndUpdateOrCreate(VACUUM_BAGS_NAME, 'Other Materials', -data.quantity, 'bags', notes, 'remove', batch);
      
      await batch.commit();
      
      return { success: true, id: logResult.id };
  }

  async getVacuumBagTraceabilityReport(): Promise<VacuumBagBatch[]> {
    const allLogs = await this.getProductionLogs();
    const intakeLogs = allLogs.filter(log => log.stage_name === 'Vacuum Bag Intake');
    
    const shipments = new Map<string, VacuumBagBatch>();

    // Initialize shipments from intake logs
    for (const log of intakeLogs) {
        shipments.set(log.shipmentId, {
            batchId: log.shipmentId,
            initialQuantity: (log.numberOfCartons || 0) * VACUUM_BAGS_CARTON_QTY,
            currentStock: 0, // Will be calculated next
            intakeDate: log.receiptDate,
            supplier: log.supplier,
            usedCount: 0,
            wastedCount: 0,
            usage: [],
            wastage: [],
        });
    }
    
    // Calculate current stock from inventory items
    const allInventory = await this.getAllInventoryItems();
    const vacuumBagCartons = allInventory.filter(item => item.type === 'vacuum_bag_carton');

    for (const carton of vacuumBagCartons) {
        const shipmentIdMatch = carton.name.match(/VBInt-BATCH\d{8}-\d+/);
        if (shipmentIdMatch) {
            const shipmentId = shipmentIdMatch[0];
            if (shipments.has(shipmentId)) {
                const shipment = shipments.get(shipmentId)!;
                shipment.currentStock += carton.quantity;
            }
        }
    }


    // Process usage and wastage from logs
    for (const log of allLogs) {
        if (log.stage_name === 'Packaging') {
            const cartonName = log.vacuum_bag_carton_id; // e.g., "VBInt-BATCH20250825-01-01"
            const shipmentIdMatch = cartonName?.match(/VBInt-BATCH\d{8}-\d+/);
            if (shipmentIdMatch) {
                const shipmentId = shipmentIdMatch[0];
                if (shipments.has(shipmentId)) {
                    const shipment = shipments.get(shipmentId)!;
                    const usedQty = log.packed_items.reduce((sum: number, item: any) => sum + item.number_of_packs, 0);
                    shipment.usedCount += usedQty;
                    shipment.usage.push(...log.packed_items.map((item: any) => ({
                        grade: item.kernel_grade,
                        quantity: item.number_of_packs,
                    })));
                }
            }
        } else if (log.stage_name === 'Vacuum Bag Wastage') {
            const cartonName = log.cartonId; // e.g., "VBInt-BATCH20250825-01-01"
            const shipmentIdMatch = cartonName?.match(/VBInt-BATCH\d{8}-\d+/);
             if (shipmentIdMatch) {
                const shipmentId = shipmentIdMatch[0];
                if (shipments.has(shipmentId)) {
                    const shipment = shipments.get(shipmentId)!;
                    shipment.wastedCount += log.quantity;
                    shipment.wastage.push({
                        date: log.wastageDate,
                        quantity: log.quantity,
                        reason: log.reason,
                    });
                }
            }
        }
    }

    return Array.from(shipments.values());
  }

  async findPackagingLogsByLot(lotNumbers: string[]): Promise<PackagingFormValues[]> {
      if (lotNumbers.length === 0) return [];
      
      const q = this.db.collection(this.productionLogsCollection)
          .where('stage_name', '==', 'Packaging')
          .where('linked_lot_number', 'in', lotNumbers);
          
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as PackagingFormValues);
  }
  
  /**
   * Helper to find a production log by searching across multiple possible ID fields.
   */
  public async findLogByAnyId(id: string): Promise<any | null> {
    const idFields = ['id', 'lot_number', 'steam_batch_id', 'sizing_batch_id', 'linked_lot_number', 'linked_steam_batch_id', 'linked_rcn_batch_id', 'linked_intake_batch_id', 'shipmentId'];
    for (const field of idFields) {
        try {
            const q = this.db.collection(this.productionLogsCollection).where(field, '==', id).limit(1);
            const snapshot = await q.get();
            if (!snapshot.empty) {
                return snapshot.docs[0].data();
            }
        } catch (e) {
            console.warn(`Query failed for field ${field} with ID ${id}. This may be expected if indexes are not configured for all fields.`)
        }
    }
    return null;
  }
  
  /**
   * Extracts the correct "parent" ID from a log to continue the trace.
   */
  public getLinkedIdFromLog(log: any): string | null {
      return log.linked_lot_number || log.linked_steam_batch_id || log.linked_rcn_batch_id || log.linked_intake_batch_id || null;
  }
  
  async resetVacuumBagInventory(): Promise<{ count: number }> {
    const inventoryColRef = this.db.collection(this.inventoryCollection);
    const itemsToDelete: DocumentReference[] = [];

    // Query for the main "Vacuum Bags" summary item
    const mainBagItemQuery = inventoryColRef.where('name', '==', VACUUM_BAGS_NAME);
    const mainBagSnapshot = await mainBagItemQuery.get();
    mainBagSnapshot.forEach(doc => itemsToDelete.push(doc.ref));
    
    // Query for all individual carton items
    const cartonItemsQuery = inventoryColRef.where('type', '==', 'vacuum_bag_carton');
    const cartonSnapshot = await cartonItemsQuery.get();
    cartonSnapshot.forEach(doc => itemsToDelete.push(doc.ref));

    if (itemsToDelete.length === 0) {
        return { count: 0 };
    }
    
    const batch = this.db.batch();
    itemsToDelete.forEach(ref => {
        batch.delete(ref);
    });
    
    await batch.commit();
    return { count: itemsToDelete.length };
  }
}
