import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import { BracketBadge } from '@/components/BracketBadge';
import { getLeaderboard } from '@/lib/tournaments';
import type { Tournament, Participant, LeaderboardEntry } from '@/types/database';
import { ArrowLeft } from 'lucide-react';

interface TournamentDetailScreenProps {
  tournament: Tournament;
  participant: Participant;
  finalRank: number;
  daysCompleted: number;
  myProfileId: string;
  onBack: () => void;
}

export function TournamentDetailScreen({
  tournament, participant, finalRank, daysCompleted, myProfileId, onBack,
}: TournamentDetailScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboard(tournament.id).then(setEntries);
  }, [tournament.id]);

  const myEntry = entries.find(e => e.profile_id === myProfileId);
  const netGain = myEntry?.net_gain ?? 0;
  const isDnf = participant.is_eliminated || participant.disqualified;
  const startDate = new Date(tournament.starts_at);
  const endDate = new Date(startDate.getTime() + tournament.duration_days * 86400000);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-400';
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Header */}
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 -ml-1">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-white">{tournament.name}</h1>
            <BracketBadge bracket={tournament.bracket_name} />
          </div>
          <p className="text-xs text-gray-400">
            {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()} • {entries.length} players
          </p>
        </div>

        {/* My stats */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Final Rank" value={isDnf ? 'DNF' : `#${finalRank}`} color={isDnf ? 'red' : 'default'} />
          <MetricCard label="Net Gain" value={netGain >= 0 ? `+${netGain}` : `${netGain}`} color={netGain >= 0 ? 'green' : 'red'} />
          <MetricCard label="Days" value={`${daysCompleted}/${tournament.duration_days}`} />
        </div>

        {/* Progression card */}
        {myEntry && (
          <div className="bg-gray-800/60 rounded-2xl p-4 flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">Your progression</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-300">Started: {participant.baseline_trophies ?? '—'}</span>
              <span className="text-gray-600">→</span>
              <span className="text-white font-bold">{(participant.baseline_trophies ?? 0) + netGain}</span>
            </div>
            <StreakDots dots={myEntry.submissions} currentDay={tournament.duration_days} />
          </div>
        )}

        {/* Full leaderboard */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Final Standings</h2>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const isMe = entry.profile_id === myProfileId;
              const entryDnf = entry.is_eliminated || entry.disqualified;

              return (
                <div
                  key={entry.participant_id}
                  className={`rounded-xl p-3 flex items-center gap-3 ${
                    isMe
                      ? 'bg-violet-500/15 border border-violet-500/30'
                      : entryDnf
                      ? 'bg-gray-800/30 opacity-50'
                      : 'bg-gray-800/60'
                  }`}
                >
                  <span className={`text-lg font-bold w-8 text-center ${getRankColor(entry.rank)}`}>
                    {entry.rank}
                  </span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isMe ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {entry.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{entry.display_name}</span>
                      {entryDnf && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">DNF</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{entry.brawler_name}</span>
                    <StreakDots dots={entry.submissions} currentDay={tournament.duration_days} size="sm" />
                  </div>
                  <span className={`text-lg font-bold ${entry.net_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.net_gain >= 0 ? '+' : ''}{entry.net_gain}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
