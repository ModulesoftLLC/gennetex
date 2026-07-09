import { useState } from 'react';
import { Menu, X, Search, User } from 'lucide-react';

const NAV_LINKS = [
  { href: '#about', label: 'Бидний тухай', delay: 100 },
  { href: '#services', label: 'Үйлчилгээ', delay: 150 },
  { href: '#projects', label: 'Төслүүд', delay: 200 },
  { href: '#careers', label: 'Ажлын байр', delay: 250 },
  { href: '#contact', label: 'Холбоо барих', delay: 300 },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <nav className="relative z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 md:py-6">
        <a href="#" className="animate-blur-fade-up flex items-center gap-2" style={{ animationDelay: '0ms' }}>
          <img src="/logo.png" alt="Gennetex" className="h-8 w-auto md:h-10" />
          <span className="text-lg font-semibold tracking-tight md:text-xl">GENNETEX</span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="animate-blur-fade-up text-sm text-white/90 transition-colors hover:text-gray-300"
              style={{ animationDelay: `${link.delay}ms` }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="animate-blur-fade-up liquid-glass hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium sm:flex md:px-6"
            style={{ animationDelay: '350ms' }}
            onClick={() => document.getElementById('careers')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Search size={18} />
            <span>Ажилд орох</span>
          </button>

          <button
            type="button"
            className="animate-blur-fade-up liquid-glass hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
            style={{ animationDelay: '400ms' }}
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <User size={18} />
          </button>

          <button
            type="button"
            className="animate-blur-fade-up liquid-glass flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            style={{ animationDelay: '350ms' }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Цэс хаах' : 'Цэс нээх'}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Menu
                size={20}
                className={`absolute transition-all duration-500 ease-out ${
                  open ? 'rotate-180 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
                }`}
              />
              <X
                size={20}
                className={`absolute transition-all duration-500 ease-out ${
                  open ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-50 opacity-0'
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`absolute left-0 right-0 top-[72px] z-40 border-b border-gray-800 border-t bg-gray-900/95 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out lg:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div className="flex flex-col px-4 py-4">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-3 text-sm transition-all hover:bg-gray-800/50"
              style={{
                transitionDelay: open ? `${i * 50}ms` : '0ms',
                transform: open ? 'translateX(0)' : 'translateX(-12px)',
                opacity: open ? 1 : 0,
              }}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex gap-3 border-t border-gray-800 pt-4 sm:hidden">
            <button
              type="button"
              className="liquid-glass flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm"
              onClick={() => {
                close();
                document.getElementById('careers')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Search size={18} />
              Ажилд орох
            </button>
            <button
              type="button"
              className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full"
              onClick={() => {
                close();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
