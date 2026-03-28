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
    if (rank === 1) return 'text-gold';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-text-secondary';
  };

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-xl font-brawl text-gold">{tournament.name}</h1>
          <p className="text-sm text-text-secondary">Day {currentDay}</p>
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
                className={`rounded-2xl p-3 flex items-center gap-3 transition-all ${
                  isMe
                    ? 'brawl-card-gold'
                    : isDnf
                    ? 'bg-card-bg/40 opacity-50 rounded-2xl'
                    : 'brawl-card'
                }`}
              >
                <span className={`text-lg font-brawl w-8 text-center ${getRankColor(entry.rank)}`}
                  style={entry.rank <= 3 ? { textShadow: `0 0 10px ${entry.rank === 1 ? 'rgba(255,204,0,0.5)' : 'rgba(200,200,200,0.3)'}` } : {}}
                >
                  {entry.rank}
                </span>

                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isMe ? 'bg-gold text-deep-bg' : 'bg-card-bg border border-cyan/20 text-text-secondary'
                }`}>
                  {entry.display_name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{entry.display_name}</span>
                    {isDnf && <span className="brawl-badge-magenta text-[10px]">DNF</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary/60">
                    <span>{entry.brawler_name}</span>
                    {entry.baseline_trophies != null && <span>({entry.baseline_trophies})</span>}
                  </div>
                  <StreakDots dots={entry.submissions} currentDay={currentDay} size="sm" />
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-lg font-bold ${entry.net_gain >= 0 ? 'text-lime' : 'text-magenta'}`}
                    style={{ textShadow: `0 0 10px ${entry.net_gain >= 0 ? 'rgba(0,255,159,0.3)' : 'rgba(255,51,153,0.3)'}` }}
                  >
                    {entry.net_gain >= 0 ? '+' : ''}{entry.net_gain}
                  </span>
                </div>
              </div>
            );
          })}

          {entries.length === 0 && (
            <p className="text-text-secondary/50 text-center py-12">No participants yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
