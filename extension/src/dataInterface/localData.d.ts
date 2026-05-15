export interface EntryForHost {
  lastUsedTS: number;
  sessionDurationInS: number;
}

export interface LocalData {
  hostsData: {
    [key: string]: EntryForHost;
  };
}

export interface LiveBudgetUsageEntry {
  dateISO: string;
  host: string;
  seconds: number;
  updatedTS: number;
}
