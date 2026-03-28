import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StreakDots } from '@/components/StreakDots';
import { BracketBadge } from '@/components/BracketBadge';
import { useCountdown } from '@/hooks/useCountdown';
import {
  getAdminTournaments, getLeaderboard, getTodayApproved,
  disqualifyParticipant, getCurrentDay, getDeadlineToday,
} from '@/lib/tournaments';
import { useRealtimeSubmissions } from '@/hooks/useRealtime';
import type { Tournament, LeaderboardEntry } from '@/types/database';
import { Shield, ArrowLeft, Calendar, Clock, Users, Trophy, Zap, Copy } from 'lucide-react';

interface AdminPanelScreenProps {
  onBack: () => void;
}

function DeadlineCountdown({ tournament }: { tournament: Tournament }) {
  const deadline = getDeadlineToday(tournament);
  const countdown = useCountdown(deadline);
  return (
    <span className="text-2xl font-bold text-cyan font-mono" style={{ textShadow: '0 0 15px rgba(0,212,255,0.3)' }}>
      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
    </span>
  );
}

export function AdminPanelScreen({ onBack }: AdminPanelScreenProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [todayApproved, setTodayApproved] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
    const [a, l] = await Promise.all([
      getTodayApproved(selectedTournament.id, day),
      getLeaderboard(selectedTournament.id),
    ]);
    setTodayApproved(a);
    setLeaderboard(l);
  }, [selectedTournament]);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeSubmissions(selectedTournament?.id, loadData);

  const handleDisqualify = async (participantId: string) => {
    await disqualifyParticipant(participantId);
    await loadData();
  };

  const totalPlayers = leaderboard.length;
  const activePlayers = leaderboard.filter(e => !e.is_eliminated && !e.disqualified).length;
  const dnfCount = leaderboard.filter(e => e.is_eliminated || e.disqualified).length;
  const checkedInToday = todayApproved.length;
  const notCheckedIn = activePlayers - checkedInToday;

  const currentDay = selectedTournament ? getCurrentDay(selectedTournament) : 0;
  const startDate = selectedTournament ? new Date(selectedTournament.starts_at) : null;
  const endDate = startDate && selectedTournament
    ? new Date(startDate.getTime() + selectedTournament.duration_days * 86400000)
    : null;

  const getStatus = (): { label: string; badgeClass: string } => {
    if (!selectedTournament) return { label: '', badgeClass: '' };
    const now = new Date();
    if (startDate && now < startDate) return { label: 'Upcoming', badgeClass: 'brawl-badge-cyan' };
    if (endDate && now > endDate) return { label: 'Ended', badgeClass: 'brawl-badge-magenta' };
    return { label: `Day ${currentDay} of ${selectedTournament.duration_days}`, badgeClass: 'brawl-badge-lime' };
  };

  if (loading) {
    return (
      <div className="px-4 pt-12">
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const status = getStatus();

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan" />
            <span className="text-xs font-bold text-cyan">Admin</span>
          </div>
        </div>

        {/* Tournament selector */}
        {tournaments.length > 1 && (
          <select
            value={selectedTournament?.id || ''}
            onChange={(e) => setSelectedTournament(tournaments.find(t => t.id === e.target.value) || null)}
            className="brawl-input"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Tournament info card */}
        {selectedTournament && (
          <div className="brawl-card-gold p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-brawl text-gold">{selectedTournament.name}</h1>
                <span className={`brawl-badge ${status.badgeClass} mt-1`}>{status.label}</span>
              </div>
              <BracketBadge bracket={selectedTournament.bracket_name} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar className="w-4 h-4 text-cyan/60" />
                {startDate?.toLocaleDateString()} – {endDate?.toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Clock className="w-4 h-4 text-cyan/60" />
                {selectedTournament.daily_deadline_hour}:00 UTC daily
              </div>
              {selectedTournament.brawler_lock && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Trophy className="w-4 h-4 text-gold/60" />
                  {selectedTournament.brawler_lock}
                </div>
              )}
              <div className="flex items-center gap-2 text-text-secondary">
                <Users className="w-4 h-4 text-cyan/60" />
                {totalPlayers}{selectedTournament.max_participants ? `/${selectedTournament.max_participants}` : ''} players
              </div>
            </div>

            {/* Invite code */}
            <div className="flex items-center justify-between bg-deep-bg/60 rounded-xl px-3 py-2">
              <span className="text-sm font-mono font-bold text-gold tracking-widest">{selectedTournament.invite_code}</span>
              <button
                onClick={() => navigator.clipboard.writeText(selectedTournament.invite_code)}
                className="text-text-secondary/50 hover:text-white p-1"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Deadline countdown */}
        {selectedTournament && currentDay > 0 && (
          <div className="brawl-card p-4 text-center">
            <p className="text-xs text-text-secondary mb-2">Next deadline</p>
            <DeadlineCountdown tournament={selectedTournament} />
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Active players" value={activePlayers} color="green" />
          <MetricCard label="Eliminated / DQ" value={dnfCount} color="red" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Checked in today" value={checkedInToday} color="amber" />
          <MetricCard label="Not checked in" value={notCheckedIn > 0 ? notCheckedIn : 0} />
        </div>

        {/* Today's check-ins */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gold" />
            Today's Check-ins (Day {currentDay})
          </h2>
          {todayApproved.length === 0 && (
            <p className="text-text-secondary/40 text-sm text-center py-4">No check-ins yet today</p>
          )}
          {todayApproved.map((sub: any) => (
            <div key={sub.id} className="brawl-card p-3 mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{sub.profiles?.display_name}</p>
                <p className="text-xs text-text-secondary">{sub.brawler_detected} • <span className="text-gold">{sub.trophy_count}</span> trophies</p>
              </div>
              <span className="brawl-badge-lime text-[10px]">Verified</span>
            </div>
          ))}
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Leaderboard</h2>
          {leaderboard.map((entry) => {
            const isDnf = entry.is_eliminated || entry.disqualified;
            return (
              <div key={entry.participant_id} className={`brawl-card p-3 mb-2 flex items-center gap-3 ${isDnf ? 'opacity-40' : ''}`}>
                <span className={`text-lg font-brawl w-8 text-center ${
                  entry.rank === 1 ? 'text-gold' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-text-secondary/50'
                }`}>
                  {entry.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-card-bg border border-cyan/20 flex items-center justify-center text-xs font-bold text-text-secondary">
                  {entry.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{entry.display_name}</p>
                    {isDnf && <span className="brawl-badge-magenta text-[10px]">
                      {entry.disqualified ? 'DQ' : 'DNF'}
                    </span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary/60">{entry.brawler_name}</span>
                    <StreakDots
                      dots={entry.submissions}
                      currentDay={currentDay}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${entry.net_gain >= 0 ? 'text-lime' : 'text-magenta'}`}>
                    {entry.net_gain >= 0 ? '+' : ''}{entry.net_gain}
                  </span>
                  {!entry.disqualified && !entry.is_eliminated && (
                    <button
                      onClick={() => {
                        if (confirm(`Disqualify ${entry.display_name}?`)) {
                          handleDisqualify(entry.participant_id);
                        }
                      }}
                      className="text-[10px] text-magenta/60 border border-magenta/20 px-2 py-1 rounded-lg hover:text-magenta hover:border-magenta/40"
                    >
                      DQ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <p className="text-text-secondary/40 text-sm text-center py-6">No participants yet</p>
          )}
        </section>
      </div>
    </div>
  );
}
