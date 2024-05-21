export interface EntryForHost {
  lastUsedTS: number;
  sessionDurationInS: number;
}

export interface LocalData {
  hostsData: {
    [key: string]: EntryForHost;
  };
}
