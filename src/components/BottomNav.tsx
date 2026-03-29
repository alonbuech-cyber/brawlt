import { Home, Upload, MessageSquare, BarChart3, Clock } from 'lucide-react';

export type TabId = 'checkin' | 'feed' | 'leaderboard' | 'history';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  hasActiveTournament: boolean;
}

export function BottomNav({ active, onChange, hasActiveTournament }: BottomNavProps) {
  const tabs: { id: TabId; icon: typeof Upload; activeIcon?: typeof Upload; label: string; inactiveLabel?: string; showAlways?: boolean }[] = [
    { id: 'checkin', icon: Upload, activeIcon: Upload, label: 'Check-in', inactiveLabel: 'Home' },
    { id: 'feed', icon: MessageSquare, label: 'Feed' },
    { id: 'leaderboard', icon: BarChart3, label: 'Leaderboard' },
    { id: 'history', icon: Clock, label: 'History', showAlways: true },
  ];

  const visibleTabs = tabs.filter(t => t.showAlways || hasActiveTournament);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-deep-bg/95 backdrop-blur-md border-t border-cyan/10 safe-area-bottom">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto">
        {visibleTabs.map(({ id, icon: Icon, activeIcon, label, inactiveLabel }) => {
          const isActive = active === id;
          const DisplayIcon = !hasActiveTournament && id === 'checkin' ? Home : Icon;
          const displayLabel = !hasActiveTournament && id === 'checkin' && inactiveLabel ? inactiveLabel : label;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-all ${
                isActive ? 'text-gold' : 'text-text-secondary/50'
              }`}
              style={isActive ? { filter: 'drop-shadow(0 0 8px rgba(255,204,0,0.5))' } : {}}
            >
              <DisplayIcon className="w-6 h-6" />
              <span className="text-[11px] font-bold">{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
