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
    <div className="px-4 pt-6 pb-28">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-brawl text-gold">{tournament.name}</h1>
          <p className="text-sm text-text-secondary">Day {currentDay} of {tournament.duration_days}</p>
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
        <div className="brawl-card p-5 text-center">
          <p className="text-xs text-text-secondary mb-2">Deadline</p>
          <p className="text-4xl font-bold text-cyan font-mono" style={{ textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
          </p>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-text-secondary">Check-in streak</p>
          <StreakDots dots={dots} currentDay={currentDay} />
        </div>

        {/* Check-in button */}
        {!todaySub && !checkInResult && (
          <button onClick={handleCheckIn} disabled={checkingIn} className="btn-primary text-lg">
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
          <div className="brawl-card p-5 flex flex-col items-center gap-3" style={{ borderColor: 'rgba(0,255,159,0.3)' }}>
            <CheckCircle className="w-10 h-10 text-lime" style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,159,0.5))' }} />
            <p className="text-lime font-brawl text-lg">Checked in!</p>
            <div className="text-sm text-text-secondary text-center space-y-1">
              <p>Brawler: <span className="text-white font-semibold">{checkInResult?.brawler_name || todaySub?.brawler_detected || '—'}</span></p>
              <p>Trophies: <span className="text-gold font-bold">{checkInResult?.trophy_count ?? todaySub?.trophy_count ?? '—'}</span></p>
              <p className="text-xs text-text-secondary/60">Verified via Brawl Stars API</p>
            </div>
            {currentDay < tournament.duration_days && (
              <p className="text-xs text-text-secondary text-center mt-2">
                Come back tomorrow before {tournament.daily_deadline_hour}:00 UTC for Day {currentDay + 1}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-magenta text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
