export interface BruteForceResult {
  success: true;
  password: string | null;
  attempts: number;
  duration: string;
  speed: string;
  algorithm: "md5" | "sha256";
  stoppedByUser?: boolean;
}

export interface ProgressStats {
  tested: number;
  speed: number;
}

export interface BruteForceError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
