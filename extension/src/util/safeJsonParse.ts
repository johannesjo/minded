/**
 * Safe JSON parsing utilities with proper error handling and type inference.
 */

/**
 * Result type for safe JSON parsing using discriminated union
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error; raw: string };

/**
 * Safely parse JSON with proper error handling and type inference.
 *
 * @param json - JSON string to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns Parsed data or fallback
 *
 * @example
 * // With fallback (returns T)
 * const apps = safeJsonParse<App[]>(jsonStr, []);
 *
 * // Without fallback (returns T | undefined)
 * const data = safeJsonParse<Data>(jsonStr);
 * if (data) { ... }
 */
export function safeJsonParse<T>(json: string, fallback: T): T;
export function safeJsonParse<T>(json: string): T | undefined;
export function safeJsonParse<T>(json: string, fallback?: T): T | undefined {
  if (!json) {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error("JSON parse error:", error, {
      json: json.substring(0, 100),
    });
    return fallback;
  }
}

/**
 * Parse JSON with full result information (success/error discriminated union).
 * Use when you need to handle errors explicitly.
 *
 * @param json - JSON string to parse
 * @returns ParseResult with either data or error info
 *
 * @example
 * const result = safeJsonParseResult<App[]>(jsonStr);
 * if (result.success) {
 *   setApps(result.data);
 * } else {
 *   reportError(result.error, result.raw);
 * }
 */
export function safeJsonParseResult<T>(json: string): ParseResult<T> {
  try {
    return { success: true, data: JSON.parse(json) as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      raw: json,
    };
  }
}
