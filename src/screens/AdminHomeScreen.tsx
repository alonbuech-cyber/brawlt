import { useState, useEffect } from 'react';
import { getAdminTournaments, getParticipantCount, getCurrentDay } from '@/lib/tournaments';
import { BracketBadge } from '@/components/BracketBadge';
import type { Tournament } from '@/types/database';
import { Shield, Plus, Users, Calendar, Clock, Copy, ChevronRight } from 'lucide-react';

interface AdminHomeScreenProps {
  onCreateNew: () => void;
  onSelectTournament: (tournament: Tournament) => void;
}

interface TournamentWithStats extends Tournament {
  participantCount: number;
}

export function AdminHomeScreen({ onCreateNew, onSelectTournament }: AdminHomeScreenProps) {
  const [tournaments, setTournaments] = useState<TournamentWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    const ts = await getAdminTournaments();
    const withStats = await Promise.all(
      ts.map(async (t) => ({
        ...t,
        participantCount: await getParticipantCount(t.id),
      }))
    );
    setTournaments(withStats);
    setLoading(false);
  };

  const getStatus = (t: Tournament): { label: string; color: string } => {
    const now = new Date();
    const start = new Date(t.starts_at);
    const end = new Date(start.getTime() + t.duration_days * 86400000);

    if (now < start) return { label: 'Upcoming', color: 'bg-blue-500/20 text-blue-400' };
    if (now > end) return { label: 'Ended', color: 'bg-gray-500/20 text-gray-400' };
    return { label: `Day ${getCurrentDay(t)}/${t.duration_days}`, color: 'bg-emerald-500/20 text-emerald-400' };
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 pt-8 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">My Tournaments</h1>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-400">Admin</span>
          </div>
        </div>

        {/* Create new button */}
        <button
          onClick={onCreateNew}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Tournament
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && tournaments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tournaments yet. Create your first one!</p>
          </div>
        )}

        {/* Tournament list */}
        {tournaments.map((t) => {
          const status = getStatus(t);
          const startDate = new Date(t.starts_at);

          return (
            <button
              key={t.id}
              onClick={() => onSelectTournament(t)}
              className="bg-gray-800/60 rounded-2xl p-4 flex flex-col gap-3 text-left transition-all active:scale-[0.98] hover:bg-gray-800/80"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white truncate">{t.name}</span>
                    <BracketBadge bracket={t.bracket_name} />
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 shrink-0 mt-1" />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  {t.participantCount} players
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  {startDate.toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {t.daily_deadline_hour}:00 UTC daily
                </div>
                {t.brawler_lock && (
                  <div className="text-gray-400">
                    Locked: {t.brawler_lock}
                  </div>
                )}
              </div>

              {/* Invite code */}
              <div className="flex items-center justify-between bg-gray-900/60 rounded-xl px-3 py-2">
                <span className="text-sm font-mono font-bold text-white tracking-widest">{t.invite_code}</span>
                <button
                  onClick={(e) => handleCopyCode(e, t.invite_code)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
