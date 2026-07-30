import posts from '../data/posts';

export async function fetchBlogPosts() {
  return posts.filter((post) => post.published !== false);
}

export async function fetchBlogPostBySlug(slug) {
  if (!slug) return null;
  return posts.find((post) => post.slug === slug && post.published !== false) || null;
}
