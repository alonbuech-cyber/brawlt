import { supabase } from './supabase';
import type { Profile } from '@/types/database';

export async function sendOtp(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { error: error.message };
  return { error: null };
}

export async function verifyOtp(email: string, token: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { error: error.message };
  return { error: null };
}

export async function setPasscode(passcode: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.rpc('set_passcode', { new_passcode: passcode });
  if (error) return { error: error.message };
  return { error: null };
}

export async function loginWithPasscode(
  email: string,
  passcode: string
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase.rpc('verify_passcode', {
    p_email: email,
    p_passcode: passcode,
  });
  if (error) return { profile: null, error: error.message };
  if (!data || !data.valid) return { profile: null, error: 'Invalid passcode' };

  return { profile: data.profile, error: null };
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
