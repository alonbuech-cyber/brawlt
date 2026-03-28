import { useState, useEffect, useCallback } from 'react';
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
import { BottomNav, type TabId } from '@/components/BottomNav';
import { getMyActiveTournament } from '@/lib/tournaments';
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
  const [activeTab, setActiveTab] = useState<TabId>('checkin');
  const [activeTournament, setActiveTournament] = useState<{ tournament: Tournament; participant: Participant } | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<HistoryEntry | null>(null);
  const [adminView, setAdminView] = useState<AdminView>('home');
  const [adminSelectedTournament, setAdminSelectedTournament] = useState<Tournament | null>(null);

  const loadActiveTournament = useCallback(async () => {
    setLoadingTournament(true);
    const result = await getMyActiveTournament();
    setActiveTournament(result);
    setLoadingTournament(false);
  }, []);

  useEffect(() => {
    if (session && profile && !profile.is_admin) {
      loadActiveTournament();
    }
  }, [session, profile, loadActiveTournament]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!session || !profile) {
    return <LoginScreen onLogin={() => refreshProfile()} />;
  }

  // Admin
  if (profile.is_admin) {
    return (
      <div className="min-h-screen bg-gray-950">
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
          className="fixed top-4 left-4 text-gray-500 p-2 z-50"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Regular user — tournament detail from history
  if (historyDetail) {
    return (
      <div className="min-h-screen bg-gray-950">
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
  const hasActiveTournament = !!activeTournament;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sign out */}
      <button
        onClick={signOut}
        className="fixed top-4 right-4 z-50 text-gray-500 p-2"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {/* Tab content */}
      {activeTab === 'checkin' && (
        hasActiveTournament ? (
          <CheckInScreen
            tournament={activeTournament!.tournament}
            participant={activeTournament!.participant}
          />
        ) : loadingTournament ? (
          <div className="flex items-center justify-center pt-32">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <JoinScreen onJoined={loadActiveTournament} />
        )
      )}

      {activeTab === 'leaderboard' && activeTournament && (
        <LeaderboardScreen
          tournament={activeTournament.tournament}
          myProfileId={profile.id}
        />
      )}

      {activeTab === 'history' && (
        <HistoryScreen onSelectTournament={setHistoryDetail} />
      )}

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        hasActiveTournament={hasActiveTournament}
      />
    </div>
  );
}
