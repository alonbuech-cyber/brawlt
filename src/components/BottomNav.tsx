import { Upload, BarChart3, Clock } from 'lucide-react';

export type TabId = 'checkin' | 'leaderboard' | 'history';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  hasActiveTournament: boolean;
}

export function BottomNav({ active, onChange, hasActiveTournament }: BottomNavProps) {
  const tabs: { id: TabId; icon: typeof Upload; label: string; showAlways?: boolean }[] = [
    { id: 'checkin', icon: Upload, label: 'Check-in' },
    { id: 'leaderboard', icon: BarChart3, label: 'Leaderboard' },
    { id: 'history', icon: Clock, label: 'History', showAlways: true },
  ];

  const visibleTabs = tabs.filter(t => t.showAlways || hasActiveTournament);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {visibleTabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              active === id ? 'text-violet-400' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
