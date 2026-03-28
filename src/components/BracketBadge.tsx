import type { BracketName } from '@/types/database';

const bracketStyles: Record<BracketName, string> = {
  Wood: 'bg-amber-900/30 text-amber-300 border-amber-600/30',
  Bronze: 'bg-orange-900/30 text-orange-300 border-orange-600/30',
  Silver: 'bg-gray-500/20 text-gray-200 border-gray-400/30',
  Gold: 'bg-gold/10 text-gold border-gold/30',
  Prestige1: 'bg-magenta/10 text-magenta border-magenta/30',
  Prestige2: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export function BracketBadge({ bracket }: { bracket: BracketName }) {
  const label = bracket.replace('Prestige1', 'Prestige 1').replace('Prestige2', 'Prestige 2');
  return (
    <span className={`brawl-badge border ${bracketStyles[bracket]}`}>
      {label}
    </span>
  );
}
