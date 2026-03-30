import { useState } from 'react';
import { CodeInput } from '@/components/CodeInput';
import { BracketBadge } from '@/components/BracketBadge';
import { fetchTournamentByCode, joinTournament, validatePlayerTag, checkIn, getParticipantCount, getCurrentDay } from '@/lib/tournaments';
import type { Tournament, Participant } from '@/types/database';
import { Calendar, Clock, Users, Lock, Search, CheckCircle, Loader2, HelpCircle, ChevronDown, ChevronUp, Ticket, Trophy, Compass, Crown, Swords } from 'lucide-react';

interface ActiveTournamentEntry {
  tournament: Tournament;
  participant: Participant;
}

interface JoinScreenProps {
  onJoined: () => void;
  activeTournaments: ActiveTournamentEntry[];
  onSelectTournament: (index: number) => void;
  onGoToHistory: () => void;
}

interface BrawlerInfo {
  name: string;
  trophies: number;
}

export function JoinScreen({ onJoined, activeTournaments, onSelectTournament, onGoToHistory }: JoinScreenProps) {
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showActiveTournaments, setShowActiveTournaments] = useState(false);
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
  const [showHelp, setShowHelp] = useState(false);

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

  // If the join code flow is active, show the full join flow
  if (showJoinCode || tournament) {
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
              <button
                onClick={() => { setShowJoinCode(false); setError(''); }}
                className="text-sm text-text-secondary/60 mt-2"
              >
                Back to Home
              </button>
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

                  {/* How to find your tag */}
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="flex items-center justify-center gap-1.5 text-xs text-cyan mx-auto"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Where do I find my tag?
                    {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showHelp && (
                    <div className="brawl-card p-4 flex flex-col gap-4">
                      {/* Step 1 */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-brawl shrink-0">1</div>
                        <div>
                          <p className="text-sm text-white font-semibold">Open Brawl Stars</p>
                          <p className="text-xs text-text-secondary">Tap your <span className="text-gold font-semibold">player name</span> or <span className="text-gold font-semibold">profile icon</span> in the top-left corner of the main screen</p>
                        </div>
                      </div>

                      {/* Visual mockup of BS profile area */}
                      <div className="bg-deep-bg rounded-xl p-3 border border-cyan/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center text-lg">👤</div>
                          <div>
                            <p className="text-sm font-bold text-white">YourName</p>
                            <p className="text-xs font-mono text-gold">#ABCD1234 ← This is your tag!</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-gold/10 rounded-lg px-2 py-1.5 border border-gold/20">
                          <span className="text-[10px] text-gold">🏆</span>
                          <span className="text-xs text-text-secondary">Total Trophies: 15,234</span>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-brawl shrink-0">2</div>
                        <div>
                          <p className="text-sm text-white font-semibold">Find your tag</p>
                          <p className="text-xs text-text-secondary">Your tag is shown right below your name. It starts with <span className="text-gold font-mono font-bold">#</span> followed by letters and numbers</p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-brawl shrink-0">3</div>
                        <div>
                          <p className="text-sm text-white font-semibold">Copy it</p>
                          <p className="text-xs text-text-secondary">Tap the tag to copy it, then paste it here. Only these characters are used: <span className="text-cyan font-mono font-bold">0 2 8 9 P Y L Q G R J C U V</span></p>
                        </div>
                      </div>
                    </div>
                  )}
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

              <button
                onClick={() => { setTournament(null); setShowJoinCode(false); setError(''); setPlayerName(''); setPlayerTag('#'); setBrawlers([]); setSelectedBrawler(null); }}
                className="text-sm text-text-secondary/60 text-center"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Home hub view
  return (
    <div className="min-h-screen px-4 pt-10 pb-28">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <img src="/logo.png" alt="BrawlT" className="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(255,204,0,0.2)]" />
        </div>

        {/* Action cards */}
        <div className="flex flex-col gap-3">

          {/* Active Tournaments */}
          <div>
            <button
              onClick={() => setShowActiveTournaments(!showActiveTournaments)}
              className="brawl-card p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:border-lime/30 w-full"
            >
              <div className="w-10 h-10 rounded-xl bg-lime/15 flex items-center justify-center shrink-0">
                <Swords className="w-5 h-5 text-lime" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Active Tournaments</p>
                <p className="text-xs text-text-secondary">
                  {activeTournaments.length > 0
                    ? `${activeTournaments.length} tournament${activeTournaments.length > 1 ? 's' : ''} in progress`
                    : 'No active tournaments'}
                </p>
              </div>
              {showActiveTournaments ? <ChevronUp className="w-5 h-5 text-text-secondary/50 shrink-0" /> : <ChevronDown className="w-5 h-5 text-text-secondary/50 shrink-0" />}
            </button>

            {showActiveTournaments && (
              <div className="mt-2 flex flex-col gap-2">
                {activeTournaments.length > 0 ? (
                  activeTournaments.map((entry, index) => {
                    const day = getCurrentDay(entry.tournament);
                    const isUpcoming = day === 0;
                    return (
                      <button
                        key={entry.tournament.id}
                        onClick={() => onSelectTournament(index)}
                        className="brawl-card-gold p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-white truncate">{entry.tournament.name}</span>
                            <BracketBadge bracket={entry.tournament.bracket_name} />
                          </div>
                          <p className="text-xs text-text-secondary">
                            {isUpcoming
                              ? `Starts ${new Date(entry.tournament.starts_at).toLocaleDateString()}`
                              : `Day ${day} of ${entry.tournament.duration_days}`}
                            {' · '}{entry.participant.brawler_name}
                          </p>
                        </div>
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${isUpcoming ? 'bg-cyan/15 text-cyan' : 'bg-lime/15 text-lime'}`}>
                          {isUpcoming ? 'Upcoming' : 'Live'}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="brawl-card p-5 text-center">
                    <p className="text-sm text-text-secondary/60 mb-1">No active tournaments</p>
                    <p className="text-xs text-text-secondary/40">Use an invite code to join a tournament, or search by location (coming soon)</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Join with Code */}
          <button
            onClick={() => setShowJoinCode(true)}
            className="brawl-card p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:border-gold/30"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Join with Code</p>
              <p className="text-xs text-text-secondary">Enter a 5-character invite code</p>
            </div>
          </button>

          {/* Tournament History */}
          <button
            onClick={onGoToHistory}
            className="brawl-card p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:border-cyan/30"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-cyan" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Tournament History</p>
              <p className="text-xs text-text-secondary">View your past tournaments and results</p>
            </div>
          </button>

          {/* Find a Tournament — Coming Soon */}
          <div className="brawl-card p-4 flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 rounded-xl bg-magenta/10 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-magenta/60" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white/60">Find a Tournament</p>
                <span className="text-[10px] font-bold text-magenta/80 bg-magenta/10 px-2 py-0.5 rounded-full">Soon</span>
              </div>
              <p className="text-xs text-text-secondary/60">Discover tournaments in your region</p>
            </div>
          </div>

          {/* Create Your Own — Coming Soon */}
          <div className="brawl-card p-4 flex items-center gap-4 opacity-50">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-gold/60" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white/60">Create Your Own</p>
                <span className="text-[10px] font-bold text-magenta/80 bg-magenta/10 px-2 py-0.5 rounded-full">Soon</span>
              </div>
              <p className="text-xs text-text-secondary/60">Run tournaments and win BT rewards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
