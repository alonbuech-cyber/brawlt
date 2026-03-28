import { useState } from 'react';
import { createTournament } from '@/lib/tournaments';
import type { BracketName, Tournament } from '@/types/database';
import { Shield, Copy, Share2, Plus } from 'lucide-react';

const BRACKETS: { name: BracketName; min: number; max: number | null }[] = [
  { name: 'Wood', min: 0, max: 499 },
  { name: 'Bronze', min: 500, max: 999 },
  { name: 'Silver', min: 1000, max: 1499 },
  { name: 'Gold', min: 1500, max: 1999 },
  { name: 'Prestige1', min: 2000, max: 2499 },
  { name: 'Prestige2', min: 2500, max: null },
];

const bracketColors: Record<BracketName, string> = {
  Wood: 'bg-amber-900/40 border-amber-700 text-amber-300',
  Bronze: 'bg-orange-900/40 border-orange-700 text-orange-300',
  Silver: 'bg-gray-600/40 border-gray-500 text-gray-200',
  Gold: 'bg-yellow-900/40 border-yellow-600 text-yellow-300',
  Prestige1: 'bg-purple-900/40 border-purple-600 text-purple-300',
  Prestige2: 'bg-red-900/40 border-red-600 text-red-300',
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
      <div className="min-h-screen bg-gray-950 px-4 pt-12 pb-24">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Admin</span>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-bold text-white mb-2">Tournament Created!</h1>
            <p className="text-sm text-gray-400">{created.name}</p>
          </div>

          <div className="bg-gray-800/60 rounded-2xl p-6 w-full flex flex-col items-center gap-4">
            <p className="text-xs text-gray-400">Invite Code</p>
            <p className="text-4xl font-mono font-bold text-white tracking-[0.3em]">
              {created.invite_code}
            </p>
            <div className="flex gap-3">
              <button onClick={handleCopy} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm active:scale-95">
                <Copy className="w-4 h-4" /> Copy
              </button>
              {typeof navigator.share === 'function' && (
                <button onClick={handleShare} className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm active:scale-95">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={() => { setCreated(null); setName(''); }} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-semibold active:scale-95">
              <Plus className="w-4 h-4 inline mr-1" /> New
            </button>
            <button onClick={onGoToPanel} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold active:scale-95">
              Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 pt-8 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Create Tournament</h1>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-400">Admin</span>
          </div>
        </div>

        <button onClick={onGoToPanel} className="bg-gray-800 text-violet-400 py-2.5 rounded-xl text-sm font-semibold active:scale-95">
          Go to Admin Panel
        </button>

        {/* Name */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Tournament name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Showdown"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Bracket */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Bracket</label>
          <div className="grid grid-cols-3 gap-2">
            {BRACKETS.map(b => (
              <button
                key={b.name}
                onClick={() => setBracket(b.name)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  bracket === b.name
                    ? bracketColors[b.name] + ' ring-2 ring-violet-500'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
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
          <label className="text-xs text-gray-400 block mb-1.5">Brawler lock (optional)</label>
          <input
            type="text"
            value={brawlerLock}
            onChange={(e) => setBrawlerLock(e.target.value)}
            placeholder="e.g. Shelly (leave empty for any)"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Start date */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Deadline hour + duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Daily deadline (UTC)</label>
            <select
              value={deadlineHour}
              onChange={(e) => setDeadlineHour(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-violet-500 focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Duration (days)</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-violet-500 focus:outline-none"
            >
              {[3, 5, 7, 10, 14].map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </div>
        </div>

        {/* Max participants */}
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Max participants (optional)</label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Unlimited"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
        >
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </div>
  );
}
