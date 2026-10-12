// Shared data shapes persisted to /data/*.json and consumed by the dashboard UI.
// Keep these stable — the cron sync job and the UI both depend on this shape.

export interface RunActivity {
  labelId: string;
  sportType: number; // 100 outdoor run, 101 indoor run, 102 trail run, 103 track run
  date: string; // yyyy-MM-dd
  startTimestamp: number; // unix seconds
  location: string | null;
  durationSeconds: number;
  distanceKm: number;
  avgPaceSecPerKm: number | null;
  avgHeartRate: number | null;
  calories: number | null;
}

export interface FitnessSnapshot {
  date: string; // yyyy-MM-dd, snapshot day (cron run day)
  vo2max: number | null;
  runningLevel: number | null;
  thresholdPaceSecPerKm: number | null;
  predictions: {
    fiveKmSeconds: number | null;
    tenKmSeconds: number | null;
    halfMarathonSeconds: number | null;
    marathonSeconds: number | null;
  };
}

export interface LoadSnapshot {
  date: string; // yyyy-MM-dd
  shortTermLoad: number | null;
  longTermLoad: number | null;
  loadRatio: number | null;
  comment: string | null;
}

export interface BodySnapshot {
  date: string; // yyyy-MM-dd
  restingHeartRate: number | null;
  sleepScore: number | null;
  sleepDurationMinutes: number | null;
  stressLevel: number | null;
}

export interface SyncResult {
  syncedAt: string; // ISO timestamp
  newActivities: number;
  newSnapshots: number;
  committed: boolean;
  error?: string;
  /** Optional COROS tools that failed without stopping the sync */
  warnings?: string[];
}
