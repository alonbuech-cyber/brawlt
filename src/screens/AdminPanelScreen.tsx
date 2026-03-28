import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import {
  getAdminTournaments, getLeaderboard, getPendingSubmissions,
  getTodayApproved, approveSubmission, rejectSubmission,
  disqualifyParticipant, getCurrentDay, getDeadlineToday,
} from '@/lib/tournaments';
import { supabase } from '@/lib/supabase';
import { useRealtimeSubmissions } from '@/hooks/useRealtime';
import type { Tournament, Submission, LeaderboardEntry } from '@/types/database';
import { Shield, Check, X, ArrowLeft, AlertTriangle } from 'lucide-react';

interface AdminPanelScreenProps {
  onBack: () => void;
}

export function AdminPanelScreen({ onBack }: AdminPanelScreenProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [todayApproved, setTodayApproved] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTournaments = useCallback(async () => {
    const ts = await getAdminTournaments();
    setTournaments(ts);
    if (ts.length > 0 && !selectedTournament) {
      setSelectedTournament(ts[0]);
    }
    setLoading(false);
  }, [selectedTournament]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  const loadData = useCallback(async () => {
    if (!selectedTournament) return;
    const day = getCurrentDay(selectedTournament);
    const [p, a, l] = await Promise.all([
      getPendingSubmissions(selectedTournament.id),
      getTodayApproved(selectedTournament.id, day),
      getLeaderboard(selectedTournament.id),
    ]);
    setPending(p);
    setTodayApproved(a);
    setLeaderboard(l);
  }, [selectedTournament]);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeSubmissions(selectedTournament?.id, loadData);

  const handleApprove = async (subId: string) => {
    await approveSubmission(subId);
    await loadData();
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    const t = selectedTournament!;
    const nextDeadline = getDeadlineToday(t);
    await rejectSubmission(rejectTarget, rejectReason.trim(), nextDeadline.toISOString());
    setRejectTarget(null);
    setRejectReason('');
    await loadData();
  };

  const handleDisqualify = async (participantId: string) => {
    await disqualifyParticipant(participantId);
    await loadData();
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    const { data } = await supabase.storage.from('screenshots').createSignedUrl(path, 300);
    return data?.signedUrl || '';
  };

  const totalPlayers = leaderboard.length;
  const dnfCount = leaderboard.filter(e => e.is_eliminated || e.disqualified).length;

  if (loading) {
    return <div className="px-4 pt-12"><p className="text-gray-500 text-center">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 pt-6 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-400">Admin</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white">Admin Panel</h1>

        {/* Tournament selector */}
        {tournaments.length > 1 && (
          <select
            value={selectedTournament?.id || ''}
            onChange={(e) => setSelectedTournament(tournaments.find(t => t.id === e.target.value) || null)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-violet-500 focus:outline-none"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Players" value={totalPlayers} />
          <MetricCard label="Pending" value={pending.length} color="amber" />
          <MetricCard label="DNF" value={dnfCount} color="red" />
        </div>

        {/* Review queue */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Review Queue</h2>
          {pending.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">All clear!</p>
          )}
          {pending.map((sub: any) => (
            <SubmissionReviewCard
              key={sub.id}
              sub={sub}
              onApprove={() => handleApprove(sub.id)}
              onReject={() => setRejectTarget(sub.id)}
              getSignedUrl={getSignedUrl}
            />
          ))}
        </section>

        {/* Auto-approved today */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Auto-Approved Today</h2>
          {todayApproved.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">None yet</p>
          )}
          {todayApproved.map((sub: any) => (
            <div key={sub.id} className="bg-gray-800/60 rounded-xl p-3 mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{sub.profiles?.display_name}</p>
                <p className="text-xs text-gray-400">{sub.brawler_detected} • {sub.trophy_count} trophies</p>
              </div>
              <button
                onClick={() => setRejectTarget(sub.id)}
                className="text-xs text-amber-400 border border-amber-400/30 px-3 py-1.5 rounded-lg"
              >
                Override
              </button>
            </div>
          ))}
        </section>

        {/* All participants */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">All Participants</h2>
          {leaderboard.map((entry) => (
            <div key={entry.participant_id} className="bg-gray-800/60 rounded-xl p-3 mb-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                {entry.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.display_name}</p>
                <StreakDots
                  dots={entry.submissions}
                  currentDay={selectedTournament ? getCurrentDay(selectedTournament) : 1}
                  size="sm"
                />
              </div>
              {!entry.disqualified && (
                <button
                  onClick={() => {
                    if (confirm(`Disqualify ${entry.display_name}?`)) {
                      handleDisqualify(entry.participant_id);
                    }
                  }}
                  className="text-xs text-red-400 border border-red-400/30 px-2.5 py-1.5 rounded-lg"
                >
                  DQ
                </button>
              )}
              {entry.disqualified && (
                <span className="text-xs text-red-400 font-bold">DQ'd</span>
              )}
            </div>
          ))}
        </section>

        {/* Reject bottom sheet */}
        {rejectTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setRejectTarget(null)}>
            <div className="bg-gray-900 rounded-t-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">Reject Submission</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none h-24"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectTarget(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-semibold">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionReviewCard({
  sub,
  onApprove,
  onReject,
  getSignedUrl,
}: {
  sub: any;
  onApprove: () => void;
  onReject: () => void;
  getSignedUrl: (path: string) => Promise<string>;
}) {
  const [imageUrl, setImageUrl] = useState('');
  const isFailed = sub.ocr_status === 'ocr_failed';

  useEffect(() => {
    getSignedUrl(sub.image_url).then(setImageUrl);
  }, [sub.image_url, getSignedUrl]);

  return (
    <div className={`bg-gray-800/60 rounded-xl p-3 mb-2 ${isFailed ? 'border border-amber-500/40' : ''}`}>
      <div className="flex gap-3">
        {imageUrl && (
          <img src={imageUrl} alt="Screenshot" className="w-20 h-20 rounded-lg object-cover" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{sub.profiles?.display_name}</p>
            {isFailed && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          </div>
          <p className="text-xs text-gray-400">
            {sub.brawler_detected || '?'} • {sub.trophy_count ?? 'N/A'} trophies • Day {sub.day_number}
          </p>
          {isFailed && <p className="text-xs text-amber-400 mt-1">OCR failed</p>}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onApprove} className="flex-1 bg-emerald-600/20 text-emerald-400 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" /> Approve
        </button>
        <button onClick={onReject} className="flex-1 bg-red-600/20 text-red-400 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5">
          <X className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  );
}
