
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Serializes data that may contain Firestore Timestamps into a plain JSON-compatible object.
 * This is crucial for passing data from Server Components/Actions to Client Components.
 * @param data The data to serialize.
 * @returns A new object with all Timestamps converted to ISO date strings.
 */
export function serializeFirestoreData<T>(data: T): T {
  const stringified = JSON.stringify(data, (_key, value) => {
    // Firestore Timestamps are not directly serializable.
    // We check if the value is an object with a `toDate` method,
    // which is a reliable way to identify a Timestamp.
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    return value;
  });

  return JSON.parse(stringified);
}
