import { useState, useEffect } from 'react';
import { getFeedPosts, createFeedPost, censorPost, type FeedPost } from '@/lib/feed';
import { supabase } from '@/lib/supabase';
import type { Tournament } from '@/types/database';
import { Send, Loader2, Trophy, ShieldBan } from 'lucide-react';

interface FeedScreenProps {
  tournament: Tournament;
  myProfileId: string;
  isAdmin?: boolean;
}

export function FeedScreen({ tournament, myProfileId, isAdmin }: FeedScreenProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getFeedPosts(tournament.id).then(data => {
      setPosts(data);
      setLoading(false);
    });

    // Realtime subscription
    const channel = supabase
      .channel(`feed:${tournament.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_posts', filter: `tournament_id=eq.${tournament.id}` },
        async () => {
          const updated = await getFeedPosts(tournament.id);
          setPosts(updated);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournament.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await createFeedPost(tournament.id, text.trim(), null);
    setText('');
    setSending(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="max-w-sm mx-auto">
          <h1 className="text-lg font-bold text-white text-center">{tournament.name}</h1>
          <p className="text-xs text-text-secondary text-center">Tournament Feed</p>
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto px-4 pb-40">
        <div className="max-w-sm mx-auto flex flex-col gap-3">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-gold/40" />
              </div>
              <p className="text-text-secondary/60 text-sm text-center">No posts yet. Be the first!</p>
            </div>
          )}

          {posts.map(post => {
            const displayName = post.profiles?.display_name || 'Anonymous';
            const isMe = post.profile_id === myProfileId;
            const isCheckin = post.post_type === 'checkin';
            const isCensored = post.censored;

            return (
              <div key={post.id} className={`rounded-2xl p-4 flex flex-col gap-2 ${isCensored ? 'opacity-50 border border-magenta/20 bg-magenta/5' : isCheckin ? 'bg-lime/5 border border-lime/15' : 'brawl-card'}`}>
                {/* Author row */}
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? 'bg-gold/20 text-gold' : 'bg-cyan/20 text-cyan'}`}>
                    {isCheckin ? <Trophy className="w-4 h-4" /> : getInitials(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white">{displayName}</span>
                    {isCheckin && <span className="text-xs text-lime ml-2">checked in</span>}
                    {isCensored && <span className="text-xs text-magenta ml-2">censored</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-secondary/50">{formatTime(post.created_at)}</span>
                    {isAdmin && !isCensored && post.post_type !== 'checkin' && (
                      <button
                        onClick={() => { if (confirm('Censor this post?')) censorPost(post.id); }}
                        className="text-magenta/40 hover:text-magenta p-1 transition-colors"
                        title="Censor post"
                      >
                        <ShieldBan className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                {isCensored ? (
                  <p className="text-sm text-magenta/60 italic">This message has been removed by an admin.</p>
                ) : (
                  <>
                    {post.content && (
                      <p className="text-sm text-text-secondary leading-relaxed">{post.content}</p>
                    )}
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="rounded-xl w-full max-h-64 object-cover mt-1"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compose bar */}
      <div className="fixed bottom-20 left-0 right-0 bg-deep-bg/95 backdrop-blur-md border-t border-cyan/10 px-4 py-3 safe-area-bottom">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share something..."
              className="flex-1 bg-card-bg border border-cyan/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-text-secondary/40 focus:outline-none focus:border-gold/30"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="text-gold disabled:text-text-secondary/30 p-2 transition-colors"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
