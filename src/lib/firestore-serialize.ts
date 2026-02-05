
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Recursively serializes data that may contain Firestore Timestamps into a plain JSON-compatible object.
 * This is crucial for passing data from Server Components/Actions to Client Components.
 * @param data The data to serialize.
 * @returns A new object with all Timestamps converted to ISO date strings.
 */
export function serializeFirestoreData(data: any): any {
    if (data === null || data === undefined || typeof data !== 'object') {
        return data;
    }

    // Firestore Timestamps
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    
    // Catch any other Timestamp-like objects (e.g., from different SDK versions)
    if (typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }

    // Arrays
    if (Array.isArray(data)) {
        return data.map(serializeFirestoreData);
    }

    // Plain objects
    const sanitizedObject: { [key: string]: any } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            sanitizedObject[key] = serializeFirestoreData(data[key]);
        }
    }
    return sanitizedObject;
}
