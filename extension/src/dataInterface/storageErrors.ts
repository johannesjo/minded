/**
 * Storage rejections that pruning old answers can actually cure.
 * - Chromium reports its data quotas using either API-style names such as
 *   `QUOTA_BYTES_PER_ITEM` or C++-style names such as
 *   `Resource::kQuotaBytesPerItem`.
 * - Firefox throws one message for all three of its storage.sync quotas:
 *   "QuotaExceededError: storage.sync API call exceeded its quota
 *   limitations." (ExtensionStorageSync.sys.mjs) - matched by its distinctive
 *   phrase. A bare /quota/i match would be wrong: Chrome's rate-limit errors
 *   ("MAX_WRITE_OPERATIONS_* quota exceeded") contain "quota" too, and those
 *   are NOT prune-recoverable - deleting answers wouldn't help, so they must
 *   surface instead (as must transient failures).
 *
 * Platform-neutral so shared code (the journal import) can tell a quota
 * rejection apart without pulling the extension's storage module into the
 * app bundles.
 */
export const isPruneRecoverableError = (e: unknown): boolean => {
  const msg = String(e).toLowerCase();
  return (
    msg.includes("quota_bytes") ||
    msg.includes("quotabytes") ||
    msg.includes("max_items") ||
    msg.includes("maxitems") ||
    msg.includes("exceeded its quota limitations")
  );
};
