/**
 * Safe JSON parsing utilities with proper error handling and type inference.
 */

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
