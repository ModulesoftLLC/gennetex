import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

/** Hero — сүлжээний GIF + статик poster (Vite public/) */
export const HERO_GIF_URL = '/hero-network.gif';
export const HERO_POSTER_URL = '/hero-network-poster.jpg';

/** @deprecated GIF ашиглана */
export const HERO_IMAGE_URL = HERO_GIF_URL;
export const HERO_VIDEO_URL = HERO_GIF_URL;
