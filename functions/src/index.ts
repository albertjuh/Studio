
import { setGlobalOptions } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
setGlobalOptions({ maxInstances: 10 });

/**
 * Cloud Function to auto-calculate first_row_flag and missed count
 * on every write to the recruitment_entries collection.
 */
export const onRecruitmentEntryWrite = onDocumentWritten("recruitment_entries/{entryId}", async (event) => {
    const firestore = getFirestore();
    const snap = event.data;
    
    if (!snap) return; // Document deleted
    
    const afterData = snap.after.data();
    if (!afterData) return; // Document was just deleted

    const { ra_name, date_string, facility, eligible, interviewed } = afterData;

    // 1. Calculate missed
    const missed = (eligible !== undefined && interviewed !== undefined) 
        ? Math.max(0, eligible - interviewed) 
        : 0;

    // 2. Identify the first row for this session
    // We group by RA + Date + Facility
    try {
        const querySnapshot = await firestore.collection("recruitment_entries")
            .where("ra_name", "==", ra_name)
            .where("date_string", "==", date_string)
            .where("facility", "==", facility)
            .orderBy("created_at", "asc")
            .get();

        const batch = firestore.batch();
        
        querySnapshot.docs.forEach((doc, index) => {
            const currentData = doc.data();
            const newFlag = index === 0 ? 1 : 0;
            
            // Only update if something changed to avoid infinite loops
            if (currentData.first_row_flag !== newFlag || currentData.missed !== missed) {
                batch.update(doc.ref, {
                    first_row_flag: newFlag,
                    missed: missed,
                    updated_at: FieldValue.serverTimestamp()
                });
            }
        });

        if (querySnapshot.size > 0) {
            await batch.commit();
            logger.info(`Updated deduplication flags for ${ra_name} @ ${facility} on ${date_string}`);
        }
    } catch (error) {
        logger.error("Error updating recruitment flags:", error);
    }
});
