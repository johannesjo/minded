export interface EntryForHost {
  lastUsedTS: number;
  sessionDurationInS: number;
  /**
   * Set when a chosen time ran out on this site and the pause is waiting for
   * the next natural break (naturalBreak.ts); cleared when the pause arrives
   * or a new time is chosen. A page load while it stands meets the pause, not
   * a fresh grace (isTimeUpMidSession). 0 / absent = nothing due.
   */
  pauseDueTS?: number;
}

export interface LocalData {
  hostsData: {
    [key: string]: EntryForHost;
  };
}
