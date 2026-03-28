import { useState } from 'react';
import { createTournament } from '@/lib/tournaments';
import type { BracketName, Tournament } from '@/types/database';
import { Shield, Copy, Share2, Plus, ArrowLeft } from 'lucide-react';

const BRACKETS: { name: BracketName; min: number; max: number | null }[] = [
  { name: 'Wood', min: 0, max: 499 },
  { name: 'Bronze', min: 500, max: 999 },
  { name: 'Silver', min: 1000, max: 1499 },
  { name: 'Gold', min: 1500, max: 1999 },
  { name: 'Prestige1', min: 2000, max: 2499 },
  { name: 'Prestige2', min: 2500, max: null },
];

const bracketColors: Record<BracketName, string> = {
  Wood: 'bg-amber-900/30 border-amber-700/40 text-amber-300',
  Bronze: 'bg-orange-900/30 border-orange-700/40 text-orange-300',
  Silver: 'bg-gray-500/20 border-gray-400/40 text-gray-200',
  Gold: 'bg-gold/10 border-gold/40 text-gold',
  Prestige1: 'bg-magenta/10 border-magenta/40 text-magenta',
  Prestige2: 'bg-red-500/15 border-red-500/40 text-red-300',
};

interface CreateTournamentScreenProps {
  onCreated: () => void;
  onGoToPanel: () => void;
}

export function CreateTournamentScreen({ onCreated, onGoToPanel }: CreateTournamentScreenProps) {
  const [name, setName] = useState('');
  const [bracket, setBracket] = useState<BracketName>('Silver');
  const [brawlerLock, setBrawlerLock] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState(20);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Tournament | null>(null);

  const selectedBracket = BRACKETS.find(b => b.name === bracket)!;

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter a tournament name'); return; }
    if (!startDate) { setError('Pick a start date'); return; }

    setError('');
    setLoading(true);

    const { tournament, error: err } = await createTournament({
      name: name.trim(),
      bracket_name: bracket,
      trophy_min: selectedBracket.min,
      trophy_max: selectedBracket.max,
      brawler_lock: brawlerLock.trim() || null,
      starts_at: new Date(startDate).toISOString(),
      daily_deadline_hour: deadlineHour,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      duration_days: durationDays,
    });

    if (err) { setError(err); setLoading(false); return; }
    setCreated(tournament);
    setLoading(false);
  };

  const handleCopy = () => {
    if (created) navigator.clipboard.writeText(created.invite_code);
  };

  const handleShare = async () => {
    if (!created) return;
    if (navigator.share) {
      await navigator.share({
        title: `Join ${created.name}`,
        text: `Join my Brawl Stars tournament! Code: ${created.invite_code}`,
      });
    }
  };

  if (created) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-24">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan" />
            <span className="text-xs font-bold text-cyan uppercase tracking-wider">Admin</span>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-brawl text-lime mb-2">Tournament Created!</h1>
            <p className="text-sm text-text-secondary">{created.name}</p>
          </div>

          <div className="brawl-card-gold p-6 w-full flex flex-col items-center gap-4">
            <p className="text-xs text-text-secondary">Invite Code</p>
            <p className="text-4xl font-mono font-bold text-gold tracking-[0.3em]"
              style={{ textShadow: '0 0 20px rgba(255,204,0,0.4)' }}>
              {created.invite_code}
            </p>
            <div className="flex gap-3">
              <button onClick={handleCopy} className="btn-outline !min-h-[44px] !w-auto !text-sm px-5">
                <Copy className="w-4 h-4" /> Copy
              </button>
              {typeof navigator.share === 'function' && (
                <button onClick={handleShare} className="btn-secondary !min-h-[44px] !w-auto !text-sm px-5">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={() => { setCreated(null); setName(''); }} className="btn-outline flex-1">
              <Plus className="w-4 h-4" /> New
            </button>
            <button onClick={onCreated} className="btn-primary flex-1">
              My Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-8 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button onClick={onGoToPanel} className="flex items-center gap-2 text-text-secondary">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-cyan" />
            <span className="text-xs font-bold text-cyan">Admin</span>
          </div>
        </div>

        <h1 className="text-2xl font-brawl text-gold">Create Tournament</h1>

        {/* Name */}
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Tournament name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Showdown"
            className="brawl-input"
          />
        </div>

        {/* Bracket */}
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Bracket</label>
          <div className="grid grid-cols-3 gap-2">
            {BRACKETS.map(b => (
              <button
                key={b.name}
                onClick={() => setBracket(b.name)}
                className={`py-3 rounded-2xl text-xs font-bold border-2 transition-all active:scale-95 ${
                  bracket === b.name
                    ? bracketColors[b.name] + ' ring-2 ring-gold/50'
                    : 'bg-card-bg/60 border-cyan/10 text-text-secondary/60'
                }`}
              >
                {b.name.replace('Prestige', 'P')}
                <br />
                <span className="text-[10px] opacity-70">{b.min}{b.max ? `–${b.max}` : '+'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Brawler lock */}
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Brawler lock (optional)</label>
          <input
            type="text"
            value={brawlerLock}
            onChange={(e) => setBrawlerLock(e.target.value)}
            placeholder="e.g. Shelly (leave empty for any)"
            className="brawl-input"
          />
        </div>

        {/* Start date */}
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="brawl-input"
          />
        </div>

        {/* Deadline hour + duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1.5">Daily deadline (UTC)</label>
            <select
              value={deadlineHour}
              onChange={(e) => setDeadlineHour(parseInt(e.target.value))}
              className="brawl-input"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1.5">Duration (days)</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value))}
              className="brawl-input"
            >
              {[3, 5, 7, 10, 14].map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </div>
        </div>

        {/* Max participants */}
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Max participants (optional)</label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Unlimited"
            className="brawl-input"
          />
        </div>

        {error && <p className="text-magenta text-sm text-center">{error}</p>}

        <button onClick={handleCreate} disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </div>
  );
}
