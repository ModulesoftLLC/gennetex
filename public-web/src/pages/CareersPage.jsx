import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Clock, Shield } from 'lucide-react';
import JobApplicationForm from '../components/JobApplicationForm';
import { useSiteContent } from '../context/SiteContentContext';
import { formatCopyright } from '../lib/siteContent';

const PERK_ICONS = [Briefcase, Clock, Shield];

export default function CareersPage() {
  const { careers } = useSiteContent();

  return (
    <div className="min-h-screen bg-graphite-950 text-graphite-50">
      <header className="sticky top-0 z-50 border-b border-graphite-800 bg-graphite-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-graphite-400 transition-colors hover:bg-graphite-900 hover:text-graphite-100"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{careers.backHome}</span>
            <span className="sm:hidden">{careers.backShort}</span>
          </Link>
          <img src="/logo.png" alt="ЖЕННЕТЕКС" className="h-8 object-contain sm:h-9" />
          <div className="w-16 sm:w-20" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mb-8 text-center lg:mb-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-graphite-500">{careers.label}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-graphite-50 sm:text-3xl lg:text-4xl">
            {careers.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-graphite-400 sm:text-base">{careers.pageIntro}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-10 xl:grid-cols-[minmax(0,320px)_1fr]">
          <aside className="order-2 lg:order-1">
            <div className="rounded-2xl border border-graphite-800 bg-graphite-900/60 p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-400">{careers.perksTitle}</h2>
              <ul className="mt-4 space-y-3">
                {careers.perks.map((text, i) => {
                  const Icon = PERK_ICONS[i] || Briefcase;
                  return (
                    <li key={text} className="flex items-center gap-3 text-sm text-graphite-300">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-graphite-800 text-accent">
                        <Icon size={16} />
                      </span>
                      {text}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 rounded-xl border border-graphite-700/80 bg-graphite-950/50 p-4 text-xs leading-relaxed text-graphite-500">
                {careers.sidebarNote}
              </div>
            </div>
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-graphite-800 bg-graphite-900/40 shadow-xl shadow-black/20">
              <JobApplicationForm />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-graphite-800 py-8 text-center text-xs text-graphite-600">
        {formatCopyright(careers.footer)}
      </footer>
    </div>
  );
}
