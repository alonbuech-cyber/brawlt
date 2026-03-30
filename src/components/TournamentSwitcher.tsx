import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Tournament } from '@/types/database';

interface TournamentSwitcherProps {
  tournaments: Tournament[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function TournamentSwitcher({ tournaments, selectedIndex, onSelect }: TournamentSwitcherProps) {
  const touchStartX = useRef<number | null>(null);
  const [swiping, setSwiping] = useState(false);

  if (tournaments.length <= 1) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      setSwiping(true);
      if (diff > 0 && selectedIndex > 0) {
        onSelect(selectedIndex - 1);
      } else if (diff < 0 && selectedIndex < tournaments.length - 1) {
        onSelect(selectedIndex + 1);
      }
    }
    touchStartX.current = null;
  };

  const current = tournaments[selectedIndex];

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 bg-deep-bg/80 backdrop-blur-sm border-b border-cyan/10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={() => selectedIndex > 0 && onSelect(selectedIndex - 1)}
        className={`p-1 ${selectedIndex > 0 ? 'text-text-secondary' : 'text-text-secondary/20'}`}
        disabled={selectedIndex === 0}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-bold text-white">{current.name}</span>
        <div className="flex gap-1.5">
          {tournaments.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === selectedIndex ? 'bg-gold' : 'bg-text-secondary/30'}`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => selectedIndex < tournaments.length - 1 && onSelect(selectedIndex + 1)}
        className={`p-1 ${selectedIndex < tournaments.length - 1 ? 'text-text-secondary' : 'text-text-secondary/20'}`}
        disabled={selectedIndex === tournaments.length - 1}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
