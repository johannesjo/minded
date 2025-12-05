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
 * Error thrown when JSON parsing fails.
 */
export class DataParseError extends Error {
  constructor(
    message: string,
    public readonly raw?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DataParseError";
  }
}

/**
 * Options for error handling.
 */
export interface DataErrorOptions {
  /** Whether to show user-facing alert on error */
  alertUser?: boolean;
  /** Custom fallback value */
  fallback?: unknown;
  /** Whether to attempt recovery */
  attemptRecovery?: boolean;
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

/**
 * Wraps an async operation with standardized error handling.
 *
 * @param operation - The async operation to wrap
 * @param context - Description for error logging
 * @param fallback - Value to return if operation fails
 * @returns Result of operation or fallback value
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallback: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDataError(error, context);
    return fallback;
  }
}
