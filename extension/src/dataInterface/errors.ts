/**
 * Custom error types and handling utilities for data operations.
 * Provides consistent error handling across all platforms.
 */

/**
 * Error thrown when data storage operations fail.
 */
export class DataStorageError extends Error {
  constructor(
    message: string,
    public readonly platform: "extension" | "android" | "ios",
    public readonly operation: "read" | "write",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DataStorageError";
  }
}

/**
 * Options for error handling.
 */
export interface DataErrorOptions {
  /** Whether to show user-facing alert on error */
  alertUser?: boolean;
}

/**
 * Centralized error handler for data operations.
 * Logs consistently and provides recovery options.
 *
 * @param error - The error that occurred
 * @param context - Description of where the error occurred
 * @param options - Error handling options
 */
export function handleDataError(
  error: unknown,
  context: string,
  options: DataErrorOptions = {},
): void {
  const { alertUser = false } = options;

  // Always log with context
  console.error(`[DataError] ${context}:`, error);

  // Optionally alert user (only in appropriate contexts)
  if (alertUser && typeof window !== "undefined" && window.alert) {
    window.alert(`minded encountered an error: ${context}. Your data is safe.`);
  }
}
