import { useState } from 'react';
import { CodeInput } from '@/components/CodeInput';
import { UploadZone } from '@/components/UploadZone';
import { BracketBadge } from '@/components/BracketBadge';
import { fetchTournamentByCode, joinTournament, submitScreenshot, getParticipantCount, getCurrentDay } from '@/lib/tournaments';
import type { Tournament } from '@/types/database';
import { Calendar, Clock, Users, Lock } from 'lucide-react';

interface JoinScreenProps {
  onJoined: () => void;
}

export function JoinScreen({ onJoined }: JoinScreenProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleUpload = async (file: File) => {
    if (!tournament) return;
    setSubmitting(true);
    setError('');

    const brawlerName = tournament.brawler_lock || 'Any';
    const { participant, error: joinErr } = await joinTournament(tournament.id, brawlerName);

    if (joinErr) {
      setError(joinErr);
      setSubmitting(false);
      return;
    }

    if (!participant) {
      setError('Failed to join');
      setSubmitting(false);
      return;
    }

    const day = getCurrentDay(tournament);
    const { error: subErr } = await submitScreenshot(tournament.id, participant.id, day || 1, file);

    if (subErr) {
      setError(subErr);
      setSubmitting(false);
      return;
    }

    setJoined(true);
    setSubmitting(false);
    setTimeout(() => onJoined(), 1500);
  };

  const hasStarted = tournament && new Date(tournament.starts_at) <= new Date();

  return (
    <div className="min-h-screen bg-gray-950 px-4 pt-12 pb-24">
      <div className="max-w-sm mx-auto flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-1">Join Tournament</h1>
          <p className="text-sm text-gray-400">Enter the invite code to get started</p>
        </div>

        {!tournament && (
          <div className="flex flex-col gap-4 items-center">
            <CodeInput length={5} onComplete={handleCodeComplete} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {tournament && (
          <div className="bg-gray-800/60 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-white">{tournament.name}</h2>
              <BracketBadge bracket={tournament.bracket_name} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {tournament.brawler_lock && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Lock className="w-4 h-4 text-gray-500" />
                  {tournament.brawler_lock}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500" />
                {new Date(tournament.starts_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-gray-500" />
                {tournament.daily_deadline_hour}:00 UTC daily
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="w-4 h-4 text-gray-500" />
                {participantCount}{tournament.max_participants ? `/${tournament.max_participants}` : ''} players
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Trophies: {tournament.trophy_min}{tournament.trophy_max ? `–${tournament.trophy_max}` : '+'}
            </div>

            {!hasStarted && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
                <p className="text-violet-300 text-sm font-medium">
                  Tournament starts on {new Date(tournament.starts_at).toLocaleDateString()}
                </p>
                <p className="text-gray-400 text-xs mt-1">You're registered! Come back on start day.</p>
              </div>
            )}

            {hasStarted && !joined && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-400 text-center">
                  Upload your Day 1 screenshot to join
                </p>
                <UploadZone onUpload={handleUpload} disabled={submitting} />
              </div>
            )}

            {joined && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-emerald-300 font-medium">You're in! Redirecting...</p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
