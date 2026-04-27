import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from './types';

export async function getUserProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data ?? null;
}

export async function requireTeacher(
  supabase: SupabaseClient
): Promise<{ profile: Profile } | { redirect: string }> {
  const profile = await getUserProfile(supabase);
  if (!profile) return { redirect: '/login' };
  return { profile };
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Ahora mismo';
  if (mins  < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days  === 1) return 'Ayer';
  if (days  < 7)  return `Hace ${days} días`;
  return formatDate(date);
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1_024)            return `${bytes} B`;
  if (bytes < 1_024 * 1_024)   return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}
