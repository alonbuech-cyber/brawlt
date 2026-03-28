import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import { useCountdown } from '@/hooks/useCountdown';
import { getCurrentDay, getDeadlineToday, getMySubmissions, checkIn, getLeaderboard } from '@/lib/tournaments';
import { supabase } from '@/lib/supabase';
import type { Tournament, Participant, Submission, SubmissionDot } from '@/types/database';
import { CheckCircle, Loader2, Zap } from 'lucide-react';

interface CheckInScreenProps {
  tournament: Tournament;
  participant: Participant;
}

export function CheckInScreen({ tournament, participant }: CheckInScreenProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rank, setRank] = useState<number>(0);
  const [netGain, setNetGain] = useState<number>(0);
  const [playerTag, setPlayerTag] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{ trophy_count: number; brawler_name: string } | null>(null);
  const [error, setError] = useState('');
  const currentDay = getCurrentDay(tournament);
  const deadline = getDeadlineToday(tournament);
  const countdown = useCountdown(deadline);

  const todaySub = submissions.find(s => s.day_number === currentDay);

  const loadData = useCallback(async () => {
    const subs = await getMySubmissions(participant.id);
    setSubmissions(subs);

    const leaderboard = await getLeaderboard(tournament.id);
    const me = leaderboard.find(e => e.participant_id === participant.id);
    if (me) {
      setRank(me.rank);
      setNetGain(me.net_gain);
    }
  }, [participant.id, tournament.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load player tag from profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('player_tag')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.player_tag) setPlayerTag(data.player_tag);
          });
      }
    });
  }, []);

  const handleCheckIn = async () => {
    if (!playerTag) {
      setError('Player tag not found. Please rejoin the tournament.');
      return;
    }
    setCheckingIn(true);
    setError('');

    const { trophy_count, brawler_name, error: err } = await checkIn(
      tournament.id,
      participant.id,
      currentDay,
      playerTag
    );

    if (err) {
      setError(err);
      setCheckingIn(false);
      return;
    }

    setCheckInResult({ trophy_count: trophy_count!, brawler_name: brawler_name! });
    setCheckingIn(false);
    await loadData();
  };

  const dots: SubmissionDot[] = Array.from({ length: tournament.duration_days }, (_, i) => {
    const day = i + 1;
    const sub = submissions.find(s => s.day_number === day);
    return { day_number: day, ocr_status: sub?.ocr_status || null };
  });

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">{tournament.name}</h1>
          <p className="text-sm text-gray-400">Day {currentDay} of {tournament.duration_days}</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Rank" value={`#${rank}`} />
          <MetricCard
            label="Net gain"
            value={netGain >= 0 ? `+${netGain}` : `${netGain}`}
            color={netGain >= 0 ? 'green' : 'red'}
          />
          <MetricCard label="Baseline" value={participant.baseline_trophies ?? '—'} />
        </div>

        {/* Countdown */}
        <div className="bg-gray-800/60 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-2">Deadline</p>
          <p className="text-3xl font-bold text-white font-mono">
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </p>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-400">Check-in streak</p>
          <StreakDots dots={dots} currentDay={currentDay} />
        </div>

        {/* Check-in button */}
        {!todaySub && !checkInResult && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {checkingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching trophies...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Check In — Day {currentDay}
              </>
            )}
          </button>
        )}

        {/* Check-in success */}
        {(todaySub?.ocr_status === 'approved' || checkInResult) && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <p className="text-emerald-300 font-semibold">Checked in!</p>
            <div className="text-sm text-gray-300 text-center space-y-1">
              <p>Brawler: {checkInResult?.brawler_name || todaySub?.brawler_detected || '—'}</p>
              <p>Trophies: {checkInResult?.trophy_count ?? todaySub?.trophy_count ?? '—'}</p>
              <p className="text-xs text-gray-500">
                Verified via Brawl Stars API
              </p>
            </div>
            {currentDay < tournament.duration_days && (
              <p className="text-xs text-gray-400 text-center">
                Come back tomorrow before {tournament.daily_deadline_hour}:00 UTC for Day {currentDay + 1}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
