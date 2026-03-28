import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import { UploadZone } from '@/components/UploadZone';
import { useCountdown } from '@/hooks/useCountdown';
import { getCurrentDay, getDeadlineToday, getMySubmissions, submitScreenshot, getLeaderboard } from '@/lib/tournaments';
import type { Tournament, Participant, Submission, SubmissionDot } from '@/types/database';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface CheckInScreenProps {
  tournament: Tournament;
  participant: Participant;
}

export function CheckInScreen({ tournament, participant }: CheckInScreenProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rank, setRank] = useState<number>(0);
  const [netGain, setNetGain] = useState<number>(0);
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

  const handleUpload = async (file: File) => {
    await submitScreenshot(tournament.id, participant.id, currentDay, file);
    await loadData();
  };

  const dots: SubmissionDot[] = Array.from({ length: tournament.duration_days }, (_, i) => {
    const day = i + 1;
    const sub = submissions.find(s => s.day_number === day);
    return { day_number: day, ocr_status: sub?.ocr_status || null };
  });

  const isRejected = todaySub?.ocr_status === 'rejected';
  const canResubmit = isRejected && todaySub?.resubmit_allowed_until &&
    new Date(todaySub.resubmit_allowed_until) > new Date();

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

        {/* Upload / Status */}
        {!todaySub && (
          <UploadZone onUpload={handleUpload} />
        )}

        {todaySub?.ocr_status === 'approved' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <p className="text-emerald-300 font-semibold">Submitted!</p>
            <div className="text-sm text-gray-300 text-center space-y-1">
              <p>Brawler: {todaySub.brawler_detected || '—'}</p>
              <p>Trophies: {todaySub.trophy_count ?? '—'}</p>
              <p className="text-xs text-gray-500">
                {new Date(todaySub.submitted_at).toLocaleTimeString()}
              </p>
            </div>
            {currentDay < tournament.duration_days && (
              <p className="text-xs text-gray-400 text-center">
                Come back tomorrow before {tournament.daily_deadline_hour}:00 UTC for Day {currentDay + 1}
              </p>
            )}
          </div>
        )}

        {todaySub?.ocr_status === 'pending' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-amber-300 font-semibold">Submitted — awaiting admin review</p>
            <p className="text-xs text-gray-400">Your previous day's score is held until review</p>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-red-300 font-semibold">Submission rejected</p>
            {todaySub.rejection_reason && (
              <p className="text-sm text-gray-300">{todaySub.rejection_reason}</p>
            )}
            {canResubmit && (
              <>
                <p className="text-xs text-gray-400">
                  Resubmit before {new Date(todaySub.resubmit_allowed_until!).toLocaleString()}
                </p>
                <UploadZone onUpload={handleUpload} />
              </>
            )}
          </div>
        )}

        {todaySub?.ocr_status === 'ocr_failed' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-amber-300 font-semibold">Could not read screenshot</p>
            {todaySub.resubmit_allowed_until && new Date(todaySub.resubmit_allowed_until) > new Date() && (
              <>
                <p className="text-xs text-gray-400">
                  Resubmit before {new Date(todaySub.resubmit_allowed_until).toLocaleString()}
                </p>
                <UploadZone onUpload={handleUpload} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
