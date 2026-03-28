import { useState } from 'react';
import { CodeInput } from '@/components/CodeInput';
import { BracketBadge } from '@/components/BracketBadge';
import { fetchTournamentByCode, joinTournament, validatePlayerTag, checkIn, getParticipantCount, getCurrentDay } from '@/lib/tournaments';
import type { Tournament } from '@/types/database';
import { Calendar, Clock, Users, Lock, Search, CheckCircle, Loader2 } from 'lucide-react';

interface JoinScreenProps {
  onJoined: () => void;
}

interface BrawlerInfo {
  name: string;
  trophies: number;
}

export function JoinScreen({ onJoined }: JoinScreenProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState('');
  const [playerTag, setPlayerTag] = useState('#');
  const [playerName, setPlayerName] = useState('');
  const [brawlers, setBrawlers] = useState<BrawlerInfo[]>([]);
  const [selectedBrawler, setSelectedBrawler] = useState<BrawlerInfo | null>(null);
  const [validating, setValidating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleCodeComplete = async (code: string) => {
    setError('');
    const t = await fetchTournamentByCode(code);
    if (!t) {
      setError('Tournament not found');
      return;
    }
    setTournament(t);
    const count = await getParticipantCount(t.id);
    setParticipantCount(count);
  };

  const handleValidateTag = async () => {
    if (playerTag.length < 3) {
      setError('Enter a valid player tag');
      return;
    }
    setError('');
    setValidating(true);

    const tag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
    const { player_name, brawlers: playerBrawlers, error: valErr } = await validatePlayerTag(tag);

    if (valErr) {
      setError(valErr);
      setValidating(false);
      return;
    }

    setPlayerName(player_name);
    setPlayerTag(tag);

    if (tournament?.brawler_lock) {
      const locked = playerBrawlers.find(
        b => b.name.toLowerCase() === tournament.brawler_lock!.toLowerCase()
      );
      if (!locked) {
        setError(`You don't have ${tournament.brawler_lock} on this account`);
        setValidating(false);
        return;
      }
      if (locked.trophies < tournament.trophy_min) {
        setError(`${locked.name} has ${locked.trophies} trophies, minimum is ${tournament.trophy_min}`);
        setValidating(false);
        return;
      }
      if (tournament.trophy_max && locked.trophies > tournament.trophy_max) {
        setError(`${locked.name} has ${locked.trophies} trophies, maximum is ${tournament.trophy_max}`);
        setValidating(false);
        return;
      }
      setSelectedBrawler(locked);
    }

    setBrawlers(playerBrawlers.sort((a, b) => b.trophies - a.trophies));
    setValidating(false);
  };

  const handleJoin = async () => {
    if (!tournament || !selectedBrawler) return;
    setJoining(true);
    setError('');

    const { participant, error: joinErr } = await joinTournament(
      tournament.id,
      selectedBrawler.name,
      playerTag,
      selectedBrawler.trophies
    );

    if (joinErr || !participant) {
      setError(joinErr || 'Failed to join');
      setJoining(false);
      return;
    }

    const day = getCurrentDay(tournament);
    if (day >= 1) {
      await checkIn(tournament.id, participant.id, day, playerTag);
    }

    setJoined(true);
    setJoining(false);
    setTimeout(() => onJoined(), 1500);
  };

  const hasStarted = tournament && new Date(tournament.starts_at) <= new Date();

  return (
    <div className="min-h-screen px-4 pt-12 pb-28">
      <div className="max-w-sm mx-auto flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-brawl text-gold mb-1">Join Tournament</h1>
          <p className="text-sm text-text-secondary">Enter the invite code to get started</p>
        </div>

        {!tournament && (
          <div className="flex flex-col gap-4 items-center">
            <CodeInput length={5} onComplete={handleCodeComplete} />
            {error && <p className="text-magenta text-sm">{error}</p>}
          </div>
        )}

        {tournament && (
          <div className="flex flex-col gap-5">
            {/* Tournament card */}
            <div className="brawl-card-gold p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold text-white">{tournament.name}</h2>
                <BracketBadge bracket={tournament.bracket_name} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {tournament.brawler_lock && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Lock className="w-4 h-4 text-magenta" />
                    {tournament.brawler_lock}
                  </div>
                )}
                <div className="flex items-center gap-2 text-text-secondary">
                  <Calendar className="w-4 h-4 text-cyan" />
                  {new Date(tournament.starts_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="w-4 h-4 text-cyan" />
                  {tournament.daily_deadline_hour}:00 UTC
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Users className="w-4 h-4 text-cyan" />
                  {participantCount}{tournament.max_participants ? `/${tournament.max_participants}` : ''} players
                </div>
              </div>

              <div className="text-xs text-text-secondary/60">
                Trophies: {tournament.trophy_min}{tournament.trophy_max ? `–${tournament.trophy_max}` : '+'}
              </div>
            </div>

            {/* Player tag input */}
            {!playerName && !joined && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary text-center">
                  Enter your Brawl Stars player tag
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerTag}
                    onChange={(e) => setPlayerTag(e.target.value.toUpperCase())}
                    placeholder="#ABC123"
                    className="brawl-input flex-1 font-mono text-lg"
                  />
                  <button
                    onClick={handleValidateTag}
                    disabled={validating || playerTag.length < 3}
                    className="bg-cyan hover:bg-cyan-dark disabled:opacity-50 text-deep-bg px-5 rounded-2xl flex items-center justify-center active:scale-95 transition-all glow-cyan"
                  >
                    {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-text-secondary/50 text-center">
                  Find it in Brawl Stars → Profile → tap your tag to copy
                </p>
              </div>
            )}

            {/* Player found */}
            {playerName && !joined && (
              <div className="flex flex-col gap-4">
                <div className="brawl-card p-3 flex items-center gap-3" style={{ borderColor: 'rgba(0,255,159,0.3)' }}>
                  <CheckCircle className="w-5 h-5 text-lime shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{playerName}</p>
                    <p className="text-xs text-text-secondary">{playerTag}</p>
                  </div>
                </div>

                {/* Brawler selection */}
                {!tournament.brawler_lock && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-text-secondary">Select your brawler</p>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {brawlers.map(b => (
                        <button
                          key={b.name}
                          onClick={() => setSelectedBrawler(b)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all active:scale-[0.98] ${
                            selectedBrawler?.name === b.name
                              ? 'bg-gold/10 border-2 border-gold/40 text-white glow-gold'
                              : 'brawl-card text-text-secondary'
                          }`}
                        >
                          <span className="font-bold">{b.name}</span>
                          <span className="text-xs text-gold">{b.trophies}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tournament.brawler_lock && selectedBrawler && (
                  <div className="brawl-card p-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{selectedBrawler.name}</span>
                    <span className="text-sm text-gold font-bold">{selectedBrawler.trophies}</span>
                  </div>
                )}

                <button onClick={handleJoin} disabled={joining || !selectedBrawler} className="btn-primary">
                  {joining ? 'Joining...' : `Join with ${selectedBrawler?.name || '...'}`}
                </button>
              </div>
            )}

            {!hasStarted && playerName && (
              <div className="brawl-card p-4 text-center" style={{ borderColor: 'rgba(0,212,255,0.3)' }}>
                <p className="text-cyan text-sm font-semibold">
                  Tournament starts on {new Date(tournament.starts_at).toLocaleDateString()}
                </p>
              </div>
            )}

            {joined && (
              <div className="brawl-card p-4 text-center" style={{ borderColor: 'rgba(0,255,159,0.3)' }}>
                <p className="text-lime font-brawl">You're in! Redirecting...</p>
              </div>
            )}

            {error && <p className="text-magenta text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
