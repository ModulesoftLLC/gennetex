import { Link } from 'react-router-dom';
import HeroBackground from '../components/HeroBackground';
import HeroSection from '../components/HeroSection';
import { useSiteContent } from '../context/SiteContentContext';
import { ArrowRight, BookOpenText, Briefcase, Layers, Mail, Users } from 'lucide-react';

const ICONS = {
  '/about': Users,
  '/services': Layers,
  '/projects': Briefcase,
  '/careers': Briefcase,
  '/contact': Mail,
};

const BLOG_POSTS = [
  {
    category: 'Инженерчлэл',
    title: 'Шилэн кабель, сүлжээний найдвартай архитектур',
    summary: 'Өндөр хурд, тогтвортой ажиллагаа, хариуцлагатай хяналт бүхий зөв суурилуулалт.',
  },
  {
    category: 'Аюулгүй байдал',
    title: 'CCTV болон хяналтын системийн шилжилт',
    summary: 'Аюулгүй байдлын шийдлүүдийг бизнесийн үйл ажиллагаатай уялдуулан нэгтгэсэн арга барил.',
  },
  {
    category: 'Технологи',
    title: 'IT дэд бүтцийн өсөлтөд зориулсан төлөвлөлт',
    summary: 'Төсөл бүрийн өмнө хэмжилт, зураг төсөл, туршилт, гүйцэтгэлээ нэг хуудсанд төвлөрүүлдэг.',
  },
];

export default function HomePage() {
  const { home, hero } = useSiteContent();

  return (
    <>
      <header className="relative min-h-screen overflow-hidden">
        <HeroBackground />
        <div className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-xl bottom-blur-mask" aria-hidden />
        <div className="relative z-10 flex min-h-screen flex-col">
          <HeroSection />
        </div>
      </header>

      <section className="relative z-20 border-t border-graphite-800 bg-graphite-950 px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-graphite-500">{home.label}</p>
              <h2 className="max-w-3xl text-2xl font-normal tracking-tightest text-graphite-50 md:text-4xl">
                {home.title}
              </h2>
            </div>
            <div className="max-w-xl rounded-3xl border border-white/10 bg-gradient-to-r from-graphite-900/80 to-graphite-950/80 p-4 text-sm leading-6 text-graphite-300 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
              {hero.description}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.links.map((item) => {
              const Icon = ICONS[item.to] || Briefcase;
              const highlight = item.to === '/careers';
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group rounded-[28px] border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-graphite-500 ${
                    highlight
                      ? 'border-accent/40 bg-accent-soft hover:border-accent/60'
                      : 'border-graphite-800 bg-gradient-to-b from-graphite-900/75 to-graphite-950/80 hover:bg-graphite-900'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Icon className={`h-6 w-6 ${highlight ? 'text-accent' : 'text-graphite-300'}`} />
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-graphite-400">
                      {home.linkOpen}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-graphite-50">{item.title}</h3>
                  <p className="text-sm leading-6 text-graphite-400">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-graphite-200 transition-all group-hover:gap-2">
                    {home.linkOpen} <ArrowRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-20 border-t border-graphite-800 bg-graphite-950/70 px-4 py-16 sm:px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-graphite-500">Blog</p>
              <h3 className="text-2xl font-normal tracking-tightest text-graphite-50 md:text-3xl">Нийтлэл & мэдээ</h3>
            </div>
            <div className="hidden rounded-full border border-graphite-700 bg-graphite-900/60 px-4 py-2 text-sm text-graphite-300 md:flex md:items-center">
              <BookOpenText size={16} className="mr-2 text-accent" />
              Gennetex insights
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.title}
                className="rounded-[28px] border border-graphite-800 bg-gradient-to-b from-graphite-900/75 to-graphite-950/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-graphite-600"
              >
                <span className="mb-3 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-graphite-400">
                  {post.category}
                </span>
                <h4 className="mb-2 text-lg font-semibold text-graphite-50">{post.title}</h4>
                <p className="text-sm leading-6 text-graphite-400">{post.summary}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-graphite-200">
                  Унших <ArrowRight size={16} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
