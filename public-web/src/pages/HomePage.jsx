import { Link } from 'react-router-dom';
import HeroBackground from '../components/HeroBackground';
import HeroSection from '../components/HeroSection';
import { ArrowRight, Briefcase, Layers, Mail, Users } from 'lucide-react';

const QUICK_LINKS = [
  {
    to: '/about',
    icon: Users,
    title: 'Бидний тухай',
    text: 'Зорилго, үнэт зүйлс, мэргэжлийн багийн танилцуулга.',
  },
  {
    to: '/services',
    icon: Layers,
    title: 'Үйлчилгээ',
    text: 'Сүлжээ, шилэн кабель, CCTV, сервер өрөөний шийдэл.',
  },
  {
    to: '/projects',
    icon: Briefcase,
    title: 'Төслүүд',
    text: 'Хэрэгжүүлсэн ажлууд, харилцагчдын итгэл.',
  },
  {
    to: '/careers',
    icon: Briefcase,
    title: 'Ажлын байр',
    text: 'Ажилд орох албан ёсны анкет бөглөх.',
    highlight: true,
  },
  {
    to: '/contact',
    icon: Mail,
    title: 'Холбоо барих',
    text: 'Утас, имэйл, хаяг, холбоо барих маягт.',
  },
];

export default function HomePage() {
  return (
    <>
      <header className="relative min-h-screen overflow-hidden">
        <HeroBackground />
        <div className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-xl bottom-blur-mask" aria-hidden />
        <div className="relative z-10 flex min-h-screen flex-col">
          <HeroSection />
        </div>
      </header>

      <section className="relative z-20 border-t border-white/10 bg-black px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/50">
            Хуудаснууд
          </p>
          <h2 className="mb-10 text-center text-2xl font-normal tracking-tightest md:text-4xl">
            Манай вэбсайтын хэсгүүд
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`group rounded-2xl border p-6 transition-all hover:-translate-y-1 ${
                  item.highlight
                    ? 'border-[#5e5adb]/50 bg-[#453fc1]/20 hover:border-[#5e5adb]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <item.icon className={`mb-4 h-8 w-8 ${item.highlight ? 'text-[#c3c1ff]' : 'text-white/70'}`} />
                <h3 className="mb-2 text-lg font-medium">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white/80 group-hover:gap-2">
                  Нээх <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
