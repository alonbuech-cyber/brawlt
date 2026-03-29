import { supabase } from './supabase';

export interface FeedPost {
  id: string;
  tournament_id: string;
  profile_id: string;
  content: string | null;
  image_url: string | null;
  post_type: 'user' | 'checkin';
  created_at: string;
  profiles: { display_name: string } | null;
}

export async function getFeedPosts(tournamentId: string): Promise<FeedPost[]> {
  const { data } = await supabase
    .from('feed_posts')
    .select('*, profiles(display_name)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data || []) as FeedPost[];
}

export async function createFeedPost(
  tournamentId: string,
  content: string | null,
  imageUrl: string | null,
  postType: 'user' | 'checkin' = 'user'
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('feed_posts')
    .insert({
      tournament_id: tournamentId,
      profile_id: user.id,
      content,
      image_url: imageUrl,
      post_type: postType,
    });

  if (error) return { error: error.message };
  return { error: null };
}

export async function uploadFeedImage(
  tournamentId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Not authenticated' };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `feed/${tournamentId}/${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('screenshots')
    .upload(path, file);

  if (error) return { url: null, error: error.message };

  const { data: { publicUrl } } = supabase.storage
    .from('screenshots')
    .getPublicUrl(path);

  return { url: publicUrl, error: null };
}
