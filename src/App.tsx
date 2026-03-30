import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginScreen } from '@/screens/LoginScreen';
import { JoinScreen } from '@/screens/JoinScreen';
import { CheckInScreen } from '@/screens/CheckInScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { TournamentDetailScreen } from '@/screens/TournamentDetailScreen';
import { AdminHomeScreen } from '@/screens/AdminHomeScreen';
import { CreateTournamentScreen } from '@/screens/CreateTournamentScreen';
import { AdminPanelScreen } from '@/screens/AdminPanelScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { TournamentSwitcher } from '@/components/TournamentSwitcher';
import { BottomNav, type TabId } from '@/components/BottomNav';
import { getMyActiveTournaments } from '@/lib/tournaments';
import type { Tournament, Participant } from '@/types/database';
import { LogOut } from 'lucide-react';

type AdminView = 'home' | 'create' | 'panel';

interface HistoryEntry {
  tournament: Tournament;
  participant: Participant;
  finalRank: number;
  daysCompleted: number;
}

export default function App() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeTournaments, setActiveTournaments] = useState<{ tournament: Tournament; participant: Participant }[]>([]);
  const [selectedTournamentIndex, setSelectedTournamentIndex] = useState(0);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<HistoryEntry | null>(null);
  const [adminView, setAdminView] = useState<AdminView>('home');
  const [adminSelectedTournament, setAdminSelectedTournament] = useState<Tournament | null>(null);
  const tournamentLoadedRef = useRef(false);

  const loadActiveTournaments = useCallback(async () => {
    setLoadingTournament(true);
    const results = await getMyActiveTournaments();
    setActiveTournaments(results);
    if (selectedTournamentIndex >= results.length && results.length > 0) {
      setSelectedTournamentIndex(0);
    }
    setLoadingTournament(false);
    tournamentLoadedRef.current = true;
  }, [selectedTournamentIndex]);

  useEffect(() => {
    if (session && profile && !profile.is_admin && !tournamentLoadedRef.current) {
      loadActiveTournaments();
    }
  }, [session, profile, loadActiveTournaments]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in or profile setup incomplete (no passcode set)
  if (!session || !profile || !profile.passcode_hash) {
    return <LoginScreen onLogin={() => refreshProfile()} />;
  }

  // Admin
  if (profile.is_admin) {
    return (
      <div className="min-h-screen">
        {adminView === 'home' && (
          <AdminHomeScreen
            onCreateNew={() => setAdminView('create')}
            onSelectTournament={(t) => {
              setAdminSelectedTournament(t);
              setAdminView('panel');
            }}
          />
        )}
        {adminView === 'create' && (
          <CreateTournamentScreen
            onCreated={() => setAdminView('home')}
            onGoToPanel={() => setAdminView('home')}
          />
        )}
        {adminView === 'panel' && (
          <AdminPanelScreen onBack={() => { setAdminView('home'); setAdminSelectedTournament(null); }} />
        )}
        <button
          onClick={signOut}
          className="fixed top-4 left-4 text-text-secondary/50 p-2 z-50"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Regular user — tournament detail from history
  if (historyDetail) {
    return (
      <div className="min-h-screen">
        <TournamentDetailScreen
          tournament={historyDetail.tournament}
          participant={historyDetail.participant}
          finalRank={historyDetail.finalRank}
          daysCompleted={historyDetail.daysCompleted}
          myProfileId={profile.id}
          onBack={() => setHistoryDetail(null)}
        />
      </div>
    );
  }

  // Regular user
  const hasActiveTournament = activeTournaments.length > 0;
  const selectedTournament = hasActiveTournament ? activeTournaments[selectedTournamentIndex] : null;

  const handleSelectTournament = (index: number) => {
    setSelectedTournamentIndex(index);
    setActiveTab('checkin');
  };

  return (
    <div className="min-h-screen">
      {/* User info + sign out */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <span className="text-xs text-text-secondary/60 font-semibold">{profile.display_name}</span>
        <button
          onClick={signOut}
          className="text-text-secondary/50 p-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'home' && (
        <JoinScreen
          onJoined={() => { tournamentLoadedRef.current = false; loadActiveTournaments(); }}
          activeTournaments={activeTournaments}
          onSelectTournament={handleSelectTournament}
          onGoToHistory={() => setActiveTab('history')}
        />
      )}

      {(activeTab === 'checkin' || activeTab === 'feed' || activeTab === 'leaderboard') && selectedTournament && (
        <>
          <TournamentSwitcher
            tournaments={activeTournaments.map(t => t.tournament)}
            selectedIndex={selectedTournamentIndex}
            onSelect={setSelectedTournamentIndex}
          />

          {activeTab === 'checkin' && (
            <CheckInScreen
              tournament={selectedTournament.tournament}
              participant={selectedTournament.participant}
            />
          )}

          {activeTab === 'feed' && (
            <FeedScreen
              tournament={selectedTournament.tournament}
              myProfileId={profile.id}
              isAdmin={profile.is_admin}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardScreen
              tournament={selectedTournament.tournament}
              myProfileId={profile.id}
            />
          )}
        </>
      )}

      {activeTab === 'history' && (
        <HistoryScreen onSelectTournament={setHistoryDetail} onBack={() => setActiveTab('home')} />
      )}

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        hasActiveTournament={hasActiveTournament}
      />
    </div>
  );
}
