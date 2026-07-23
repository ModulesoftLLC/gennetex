import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import fallbackPosts from '../../data/posts';
import BlogCard from '../../components/BlogCard';
import { fetchBlogPosts } from '../../lib/blogService';

export default function BlogIndex() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlogPosts()
      .then((results) => setPosts(results))
      .catch((err) => {
        console.warn('[blog] fetch failed', err);
        setError(err);
        setPosts(fallbackPosts);
      })
      .finally(() => setLoading(false));
  }, []);

  const allPosts = posts.length ? posts : fallbackPosts;
  const hero = allPosts[0];
  const rest = allPosts.slice(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-12 lg:px-16">
      <div className="sticky top-[72px] z-40 mb-8 overflow-hidden rounded-3xl border border-graphite-800 bg-graphite-950/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-graphite-300">
          <Link to="/" className="transition hover:text-graphite-100">Нүүр</Link>
          <Link to="/blog" className="text-graphite-50">Блог</Link>
          <a href="#latest" className="transition hover:text-graphite-100">Шинэ нийтлэл</a>
          <a href="#categories" className="transition hover:text-graphite-100">Ангилал</a>
        </nav>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2.3fr_1fr]">
        <section className="space-y-8">
          {hero && (
            <article className="overflow-hidden rounded-[32px] border border-graphite-800 bg-graphite-950/95 shadow-[0_40px_100px_rgba(0,0,0,0.18)]">
              <Link to={`/blog/${hero.slug}`} className="group block">
                <div className="relative h-[420px] overflow-hidden">
                  <img
                    src={hero.featured_image}
                    alt={hero.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-graphite-950/95 via-graphite-950/40 to-transparent" />
                </div>
                <div className="space-y-4 p-8">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.32em] text-graphite-400">
                    <span>Онцлох</span>
                    <span className="h-1 w-1 rounded-full bg-graphite-500" />
                    <span>{hero.created_at}</span>
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">{hero.title}</h1>
                  <p className="max-w-3xl text-base leading-8 text-graphite-300">{hero.excerpt}</p>
                </div>
              </Link>
            </article>
          )}

          <div className="flex min-w-0 flex-wrap items-center gap-3 overflow-x-auto rounded-3xl border border-graphite-800 bg-graphite-950/90 px-4 py-4 text-sm text-graphite-300 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            {['Технологи', 'Боловсрол', 'Эдийн засаг', 'Эрүүл мэнд', 'Орон нутгийн', 'Шинэчлэл', 'AI', 'Сүлжээ'].map((category) => (
              <span key={category} className="inline-flex shrink-0 rounded-full border border-graphite-800 bg-graphite-900/80 px-4 py-2 text-sm text-graphite-200">
                {category}
              </span>
            ))}
          </div>

          <section id="latest" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-graphite-400">Блог</p>
                <h2 className="text-3xl font-semibold text-graphite-50">Сүүлийн нийтлэл</h2>
              </div>
              <div className="hidden rounded-full border border-graphite-800 bg-graphite-900/70 px-4 py-2 text-sm text-graphite-300 md:block">
                Сэтгүүлчийн буулт
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {rest.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-[92px] lg:self-start">
          <div className="rounded-3xl border border-graphite-800 bg-graphite-950/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="mb-4 text-lg font-semibold text-graphite-50">Сүүлийн нийтлэл</h3>
            <ul className="space-y-3">
              {posts.slice(0, 5).map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block rounded-3xl border border-transparent px-4 py-4 transition hover:border-graphite-700 hover:bg-graphite-900"
                  >
                    <p className="text-sm font-semibold text-graphite-50">{post.title}</p>
                    <p className="text-sm text-graphite-400">{post.created_at}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div id="categories" className="rounded-3xl border border-graphite-800 bg-graphite-950/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
            <h3 className="mb-4 text-lg font-semibold text-graphite-50">Ангилал</h3>
            <div className="flex flex-wrap gap-3">
              {['Технологи', 'Боловсрол', 'Эдийн засаг', 'Эрүүл мэнд', 'Орон нутгийн', 'Шинэчлэл', 'AI', 'Сүлжээ'].map((category) => (
                <span key={category} className="rounded-full border border-graphite-800 bg-graphite-900/70 px-4 py-2 text-sm text-graphite-300">
                  {category}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
