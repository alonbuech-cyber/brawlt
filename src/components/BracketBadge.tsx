import type { BracketName } from '@/types/database';

const bracketColors: Record<BracketName, string> = {
  Wood: 'bg-amber-900/60 text-amber-300 border-amber-700',
  Bronze: 'bg-orange-900/60 text-orange-300 border-orange-700',
  Silver: 'bg-gray-600/60 text-gray-200 border-gray-500',
  Gold: 'bg-yellow-900/60 text-yellow-300 border-yellow-600',
  Prestige1: 'bg-purple-900/60 text-purple-300 border-purple-600',
  Prestige2: 'bg-red-900/60 text-red-300 border-red-600',
};

export function BracketBadge({ bracket }: { bracket: BracketName }) {
  const label = bracket.replace('Prestige1', 'Prestige 1').replace('Prestige2', 'Prestige 2');
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bracketColors[bracket]}`}>
      {label}
    </span>
  );
}
