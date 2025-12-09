export interface EntryForHost {
  lastUsedTS: number;
  sessionDurationInS: number;
  sessionLimitInS?: number | null;
  sessionEndTS?: number | null;
}

export interface LocalData {
  hostsData: {
    [key: string]: EntryForHost;
  };
}
