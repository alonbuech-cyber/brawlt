import { useState, useEffect } from 'react';
import { getMyPastTournaments } from '@/lib/tournaments';
import { BracketBadge } from '@/components/BracketBadge';
import type { Tournament, Participant } from '@/types/database';
import { Clock, ChevronRight } from 'lucide-react';

interface HistoryEntry {
  tournament: Tournament;
  participant: Participant;
  finalRank: number;
  daysCompleted: number;
}

interface HistoryScreenProps {
  onSelectTournament: (entry: HistoryEntry) => void;
}

export function HistoryScreen({ onSelectTournament }: HistoryScreenProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPastTournaments().then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const getRankColor = (rank: number, isDnf: boolean) => {
    if (isDnf) return 'text-red-400';
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-white';
  };

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24">
        <p className="text-gray-500 text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-lg font-bold text-white">Tournament History</h1>
        </div>

        {entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Clock className="w-12 h-12 text-gray-600" />
            <p className="text-gray-500 text-center">No completed tournaments yet</p>
          </div>
        )}

        {entries.map((entry) => {
          const isDnf = entry.participant.is_eliminated || entry.participant.disqualified;
          const startDate = new Date(entry.tournament.starts_at);
          const endDate = new Date(startDate.getTime() + entry.tournament.duration_days * 86400000);

          return (
            <button
              key={entry.tournament.id}
              onClick={() => onSelectTournament(entry)}
              className="bg-gray-800/60 rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:bg-gray-800/80"
            >
              {/* Rank */}
              <div className="flex flex-col items-center w-12">
                <span className={`text-2xl font-bold ${getRankColor(entry.finalRank, isDnf)}`}>
                  {isDnf ? 'DNF' : `#${entry.finalRank}`}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white truncate">{entry.tournament.name}</span>
                  <BracketBadge bracket={entry.tournament.bracket_name} />
                </div>
                <div className="text-xs text-gray-400">
                  {entry.participant.brawler_name} • {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {entry.daysCompleted}/{entry.tournament.duration_days} days
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
