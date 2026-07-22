export type StatsView = 'GLOBAL' | 'PERSONAL';

/** Which snippet log is shown: personal bests (one row per snippet) or recent attempts. */
export type SnippetView = 'BEST' | 'HISTORY';

export type GlobalRankingEntry = {
  cpm: number;
  fastestTime: string;
  rank: number;
  username: string;
};

export type PersonalActivityEntry = {
  category: string;
  cpm: number;
  /** Unique per row: the snippet's id for a Best entry, the attempt's id for a History entry. */
  id: string;
  relativeTime: string;
  snippetName: string;
  time: string;
};

export type PersonalStatsSummary = {
  averageCpm: number | null;
  averageTime: string;
  fastestCpm: number | null;
  fastestTime: string;
};
