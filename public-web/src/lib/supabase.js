import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhxyrzzgmksjlibfrmlx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeHlyenpnbWtzamxpYmZybWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODEwMjYsImV4cCI6MjA5ODQ1NzAyNn0.nYWs_N09RLHvhmEUCdbS6M8yvthsKJ5TkXjdRv4VMag';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/** Технологийн hero зураг — сүлжээ, шилэн кабель */
export const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2400&q=85';
