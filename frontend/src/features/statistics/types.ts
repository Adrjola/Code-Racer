export type StatsView = 'GLOBAL' | 'PERSONAL';

export type GlobalRankingEntry = {
  cpm: number;
  fastestTime: string;
  rank: number;
  username: string;
};

export type PersonalActivityEntry = {
  category: string;
  cpm: number;
  relativeTime: string;
  snippetName: string;
  time: string;
};

export type PersonalStatsSummary = {
  averageCpm: number;
  averageTime: string;
  fastestCpm: number;
  fastestTime: string;
};
