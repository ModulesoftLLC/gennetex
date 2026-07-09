import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhxyrzzgmksjlibfrmlx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeHlyenpnbWtzamxpYmZybWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4ODEwMjYsImV4cCI6MjA5ODQ1NzAyNn0.nYWs_N09RLHvhmEUCdbS6M8yvthsKJ5TkXjdRv4VMag';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4';
