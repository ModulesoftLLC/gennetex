import { supabase } from './supabase';

export async function fetchBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, author_name, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function fetchBlogPostBySlug(slug) {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, content, featured_image, author_name, created_at, source_urls')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}
