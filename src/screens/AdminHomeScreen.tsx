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

  const getStatus = (t: Tournament): { label: string; badgeClass: string } => {
    const now = new Date();
    const start = new Date(t.starts_at);
    const end = new Date(start.getTime() + t.duration_days * 86400000);

    if (now < start) return { label: 'Upcoming', badgeClass: 'brawl-badge-cyan' };
    if (now > end) return { label: 'Ended', badgeClass: 'brawl-badge-magenta' };
    return { label: `Day ${getCurrentDay(t)}/${t.duration_days}`, badgeClass: 'brawl-badge-lime' };
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen px-4 pt-8 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-brawl text-gold">My Tournaments</h1>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan" />
            <span className="text-xs font-bold text-cyan">Admin</span>
          </div>
        </div>

        <button onClick={onCreateNew} className="btn-primary">
          <Plus className="w-5 h-5" />
          Create New Tournament
        </button>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary/50">No tournaments yet. Create your first one!</p>
          </div>
        )}

        {tournaments.map((t) => {
          const status = getStatus(t);
          const startDate = new Date(t.starts_at);

          return (
            <button
              key={t.id}
              onClick={() => onSelectTournament(t)}
              className="brawl-card p-4 flex flex-col gap-3 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white truncate">{t.name}</span>
                    <BracketBadge bracket={t.bracket_name} />
                  </div>
                  <span className={`brawl-badge ${status.badgeClass}`}>
                    {status.label}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-text-secondary/30 shrink-0 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary/70">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan/60" />
                  {t.participantCount} players
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan/60" />
                  {startDate.toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan/60" />
                  {t.daily_deadline_hour}:00 UTC
                </div>
                {t.brawler_lock && (
                  <div className="text-text-secondary/70">
                    Lock: {t.brawler_lock}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-deep-bg/60 rounded-xl px-3 py-2">
                <span className="text-sm font-mono font-bold text-gold tracking-widest">{t.invite_code}</span>
                <button
                  onClick={(e) => handleCopyCode(e, t.invite_code)}
                  className="text-text-secondary/50 hover:text-white p-1"
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
