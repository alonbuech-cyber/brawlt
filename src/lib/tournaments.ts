import { supabase } from './supabase';
import type { Tournament, Participant, Submission, LeaderboardEntry, SubmissionDot } from '@/types/database';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getCurrentDay(tournament: Tournament): number {
  const start = new Date(tournament.starts_at).getTime();
  const now = Date.now();
  if (now < start) return 0;
  const day = Math.floor((now - start) / 86400000) + 1;
  return Math.min(day, tournament.duration_days);
}

export function getDeadlineToday(tournament: Tournament): Date {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setUTCHours(tournament.daily_deadline_hour, 0, 0, 0);
  if (deadline.getTime() < now.getTime()) {
    deadline.setDate(deadline.getDate() + 1);
  }
  return deadline;
}

export async function fetchTournamentByCode(code: string): Promise<Tournament | null> {
  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single();
  return data;
}

export async function createTournament(tournament: Omit<Tournament, 'id' | 'invite_code' | 'created_at' | 'created_by'>): Promise<{ tournament: Tournament | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tournament: null, error: 'Not authenticated' };

  const invite_code = generateInviteCode();

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      ...tournament,
      invite_code,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { tournament: null, error: error.message };
  return { tournament: data, error: null };
}

export async function joinTournament(
  tournamentId: string,
  brawlerName: string
): Promise<{ participant: Participant | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { participant: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('participants')
    .insert({
      tournament_id: tournamentId,
      profile_id: user.id,
      brawler_name: brawlerName,
    })
    .select()
    .single();

  if (error) return { participant: null, error: error.message };
  return { participant: data, error: null };
}

export async function getMyParticipant(tournamentId: string): Promise<Participant | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('profile_id', user.id)
    .single();

  return data;
}

export async function getMyActiveTournament(): Promise<{ tournament: Tournament; participant: Participant } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: participants } = await supabase
    .from('participants')
    .select('*, tournaments(*)')
    .eq('profile_id', user.id)
    .eq('is_eliminated', false)
    .eq('disqualified', false);

  if (!participants || participants.length === 0) return null;

  // Find active tournament (started, not yet ended)
  const now = new Date();
  for (const p of participants) {
    const t = (p as any).tournaments as Tournament;
    const start = new Date(t.starts_at);
    const end = new Date(start.getTime() + t.duration_days * 86400000);
    if (now >= start && now <= end) {
      return { tournament: t, participant: p };
    }
  }
  return null;
}

export async function submitScreenshot(
  tournamentId: string,
  participantId: string,
  dayNumber: number,
  file: File
): Promise<{ submission: Submission | null; error: string | null }> {
  const path = `${tournamentId}/${participantId}/day${dayNumber}.jpg`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('screenshots')
    .upload(path, file, { upsert: true });

  if (uploadError) return { submission: null, error: uploadError.message };

  // Create submission record
  const { data, error } = await supabase
    .from('submissions')
    .upsert({
      participant_id: participantId,
      tournament_id: tournamentId,
      day_number: dayNumber,
      image_url: path,
      ocr_status: 'pending',
    }, { onConflict: 'participant_id,day_number' })
    .select()
    .single();

  if (error) return { submission: null, error: error.message };

  // Trigger edge function
  try {
    await supabase.functions.invoke('process-screenshot', {
      body: { submission_id: data.id, image_path: path, tournament_id: tournamentId },
    });
  } catch {
    // Edge function runs async, non-blocking
  }

  return { submission: data, error: null };
}

export async function getMySubmissions(participantId: string): Promise<Submission[]> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('participant_id', participantId)
    .order('day_number');

  return data || [];
}

export async function getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
  const { data: participants } = await supabase
    .from('participants')
    .select('*, profiles(display_name)')
    .eq('tournament_id', tournamentId);

  if (!participants) return [];

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('tournament_id', tournamentId);

  const subsByParticipant = new Map<string, Submission[]>();
  for (const s of submissions || []) {
    const arr = subsByParticipant.get(s.participant_id) || [];
    arr.push(s);
    subsByParticipant.set(s.participant_id, arr);
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const durationDays = tournament?.duration_days || 7;

  const entries: LeaderboardEntry[] = participants.map((p: any) => {
    const subs = subsByParticipant.get(p.id) || [];
    const approved = subs.filter(s => s.ocr_status === 'approved');
    const latestApproved = approved.sort((a, b) => b.day_number - a.day_number)[0];
    const netGain = latestApproved && p.baseline_trophies != null
      ? (latestApproved.trophy_count || 0) - p.baseline_trophies
      : 0;

    const dots: SubmissionDot[] = [];
    for (let d = 1; d <= durationDays; d++) {
      const sub = subs.find(s => s.day_number === d);
      dots.push({ day_number: d, ocr_status: sub?.ocr_status || null });
    }

    return {
      participant_id: p.id,
      profile_id: p.profile_id,
      display_name: p.profiles?.display_name || 'Anonymous',
      brawler_name: p.brawler_name,
      baseline_trophies: p.baseline_trophies,
      net_gain: netGain,
      rank: 0,
      is_eliminated: p.is_eliminated,
      disqualified: p.disqualified,
      submissions: dots,
    };
  });

  // Sort: active players by net_gain desc, then eliminated at bottom
  const active = entries.filter(e => !e.is_eliminated && !e.disqualified)
    .sort((a, b) => b.net_gain - a.net_gain);
  const inactive = entries.filter(e => e.is_eliminated || e.disqualified);

  active.forEach((e, i) => { e.rank = i + 1; });
  inactive.forEach((e, i) => { e.rank = active.length + i + 1; });

  return [...active, ...inactive];
}

export async function getParticipantCount(tournamentId: string): Promise<number> {
  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  return count || 0;
}

// Admin functions
export async function getPendingSubmissions(tournamentId: string): Promise<(Submission & { profiles: { display_name: string } })[]> {
  const { data } = await supabase
    .from('submissions')
    .select('*, participants(profile_id, brawler_name, profiles(display_name))')
    .eq('tournament_id', tournamentId)
    .in('ocr_status', ['pending', 'ocr_failed'])
    .order('submitted_at', { ascending: false });

  return (data || []).map((s: any) => ({
    ...s,
    profiles: s.participants?.profiles,
    brawler_name: s.participants?.brawler_name,
  }));
}

export async function getTodayApproved(tournamentId: string, dayNumber: number): Promise<(Submission & { profiles: { display_name: string } })[]> {
  const { data } = await supabase
    .from('submissions')
    .select('*, participants(profile_id, brawler_name, profiles(display_name))')
    .eq('tournament_id', tournamentId)
    .eq('day_number', dayNumber)
    .eq('ocr_status', 'approved')
    .order('submitted_at', { ascending: false });

  return (data || []).map((s: any) => ({
    ...s,
    profiles: s.participants?.profiles,
    brawler_name: s.participants?.brawler_name,
  }));
}

export async function approveSubmission(submissionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('submissions')
    .update({ ocr_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', submissionId);

  if (error) return { error: error.message };

  // Check if this is a Day 1 submission and set baseline
  const { data: sub } = await supabase
    .from('submissions')
    .select('*, participants(*)')
    .eq('id', submissionId)
    .single();

  if (sub && sub.day_number === 1 && sub.trophy_count != null && sub.participants?.baseline_trophies == null) {
    await supabase
      .from('participants')
      .update({ baseline_trophies: sub.trophy_count })
      .eq('id', sub.participant_id);
  }

  return { error: null };
}

export async function rejectSubmission(
  submissionId: string,
  reason: string,
  resubmitUntil: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('submissions')
    .update({
      ocr_status: 'rejected',
      rejection_reason: reason,
      resubmit_allowed_until: resubmitUntil,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function disqualifyParticipant(participantId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('participants')
    .update({ disqualified: true })
    .eq('id', participantId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getMyPastTournaments(): Promise<{ tournament: Tournament; participant: Participant; finalRank: number; daysCompleted: number }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: participants } = await supabase
    .from('participants')
    .select('*, tournaments(*)')
    .eq('profile_id', user.id);

  if (!participants) return [];

  const results = [];
  const now = new Date();

  for (const p of participants) {
    const t = (p as any).tournaments as Tournament;
    const end = new Date(new Date(t.starts_at).getTime() + t.duration_days * 86400000);
    if (now < end) continue; // Still active

    const leaderboard = await getLeaderboard(t.id);
    const myEntry = leaderboard.find(e => e.participant_id === p.id);

    const { data: subs } = await supabase
      .from('submissions')
      .select('*')
      .eq('participant_id', p.id)
      .eq('ocr_status', 'approved');

    results.push({
      tournament: t,
      participant: p,
      finalRank: myEntry?.rank || 0,
      daysCompleted: subs?.length || 0,
    });
  }

  return results.sort((a, b) => new Date(b.tournament.starts_at).getTime() - new Date(a.tournament.starts_at).getTime());
}

export async function getAdminTournaments(): Promise<Tournament[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  return data || [];
}
