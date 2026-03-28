export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  passcode_hash: string | null;
  player_tag: string | null;
  is_admin: boolean;
  created_at: string;
}

export type BracketName = 'Wood' | 'Bronze' | 'Silver' | 'Gold' | 'Prestige1' | 'Prestige2';

export interface Tournament {
  id: string;
  name: string;
  bracket_name: BracketName;
  trophy_min: number;
  trophy_max: number | null;
  brawler_lock: string | null;
  starts_at: string;
  daily_deadline_hour: number;
  max_participants: number | null;
  duration_days: number;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface Participant {
  id: string;
  tournament_id: string;
  profile_id: string;
  brawler_name: string;
  baseline_trophies: number | null;
  is_eliminated: boolean;
  disqualified: boolean;
  joined_at: string;
}

export type OcrStatus = 'pending' | 'approved' | 'rejected' | 'ocr_failed';
export type OcrConfidence = 'high' | 'low';

export interface Submission {
  id: string;
  participant_id: string;
  tournament_id: string;
  day_number: number;
  image_url: string | null;
  trophy_count: number | null;
  brawler_detected: string | null;
  ocr_status: OcrStatus;
  ocr_confidence: OcrConfidence | null;
  rejection_reason: string | null;
  resubmit_allowed_until: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface LeaderboardEntry {
  participant_id: string;
  profile_id: string;
  display_name: string;
  brawler_name: string;
  baseline_trophies: number | null;
  net_gain: number;
  rank: number;
  is_eliminated: boolean;
  disqualified: boolean;
  submissions: SubmissionDot[];
}

export interface SubmissionDot {
  day_number: number;
  ocr_status: OcrStatus | null;
}
