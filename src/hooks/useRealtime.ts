import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeSubmissions(tournamentId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`submissions:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, onUpdate]);
}
