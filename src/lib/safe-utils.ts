
/**
 * A collection of utility functions to prevent null/undefined errors
 * by providing safe access to object properties and safe operations.
 */

/**
 * Safely access a property on an object that might be null or undefined.
 * @param obj The object to access.
 * @param key The key of the property to access.
 * @param defaultValue The value to return if the object or property is null/undefined.
 * @returns The property value or the default value.
 */
export const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined => {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }
  return obj[key] ?? defaultValue;
};
