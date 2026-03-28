import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import { useRealtimeSubmissions } from '@/hooks/useRealtime';
import { getLeaderboard, getCurrentDay } from '@/lib/tournaments';
import type { Tournament, LeaderboardEntry } from '@/types/database';

interface LeaderboardScreenProps {
  tournament: Tournament;
  myProfileId: string;
}

export function LeaderboardScreen({ tournament, myProfileId }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const currentDay = getCurrentDay(tournament);

  const loadData = useCallback(async () => {
    const data = await getLeaderboard(tournament.id);
    setEntries(data);
  }, [tournament.id]);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeSubmissions(tournament.id, loadData);

  const totalPlayers = entries.length;
  const activePlayers = entries.filter(e => !e.is_eliminated && !e.disqualified).length;
  const dnfCount = entries.filter(e => e.is_eliminated || e.disqualified).length;

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-400';
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">{tournament.name}</h1>
          <p className="text-sm text-gray-400">Day {currentDay}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total" value={totalPlayers} />
          <MetricCard label="Active" value={activePlayers} color="green" />
          <MetricCard label="DNF" value={dnfCount} color="red" />
        </div>

        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const isMe = entry.profile_id === myProfileId;
            const isDnf = entry.is_eliminated || entry.disqualified;

            return (
              <div
                key={entry.participant_id}
                className={`rounded-xl p-3 flex items-center gap-3 transition-all ${
                  isMe
                    ? 'bg-violet-500/15 border border-violet-500/30'
                    : isDnf
                    ? 'bg-gray-800/30 opacity-50'
                    : 'bg-gray-800/60'
                }`}
              >
                {/* Rank */}
                <span className={`text-lg font-bold w-8 text-center ${getRankColor(entry.rank)}`}>
                  {entry.rank}
                </span>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isMe ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {entry.display_name.slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {entry.display_name}
                    </span>
                    {isDnf && (
                      <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        DNF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{entry.brawler_name}</span>
                    {entry.baseline_trophies != null && (
                      <span className="text-gray-600">({entry.baseline_trophies})</span>
                    )}
                  </div>
                  <StreakDots dots={entry.submissions} currentDay={currentDay} size="sm" />
                </div>

                {/* Net gain */}
                <div className="text-right shrink-0">
                  {entry.submissions.some(s => s.ocr_status === 'pending') ? (
                    <span className="text-xs text-amber-400 font-medium">Awaiting<br />review</span>
                  ) : (
                    <span className={`text-lg font-bold ${
                      entry.net_gain >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {entry.net_gain >= 0 ? '+' : ''}{entry.net_gain}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {entries.length === 0 && (
            <p className="text-gray-500 text-center py-12">No participants yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
