import { Star, Clock, Calendar, Play, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="flex flex-1 flex-col justify-end px-4 pb-8 sm:px-6 md:px-12 md:pb-16">
      <div className="flex flex-col items-end gap-8 md:flex-row">
        <div className="flex-1">
          <div
            className="animate-blur-fade-up mb-6 flex flex-wrap items-center gap-3 text-xs sm:mb-8 sm:gap-6 sm:text-sm"
            style={{ animationDelay: '300ms' }}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Star className="h-4 w-4 fill-white sm:h-5 sm:w-5" />
              10+ жилийн туршлага
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              500+ төсөл
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              24/7 дэмжлэг
            </span>
          </div>

          <h1
            className="animate-blur-fade-up mb-4 text-3xl font-normal tracking-tightest sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ animationDelay: '400ms' }}
          >
            Илүү ухаалгаар.
            <br />
            Илүү хурдан.
          </h1>

          <p
            className="animate-blur-fade-up mb-6 max-w-2xl text-base text-gray-400 sm:mb-12 sm:text-lg md:text-xl"
            style={{ animationDelay: '500ms' }}
          >
            Gennetex — сүлжээ, шилэн кабель, аюулгүй байдал болон IT дэд бүтцийн иж бүрэн шийдлийг
            Монголын бизнесүүдэд хүргэдэг инженерингийн компани.
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <a
              href="#services"
              className="animate-blur-fade-up inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-200 sm:px-8 sm:py-3 sm:text-base"
              style={{ animationDelay: '600ms' }}
            >
              <Play size={18} className="fill-black" />
              Үйлчилгээ үзэх
            </a>
            <a
              href="#about"
              className="animate-blur-fade-up liquid-glass inline-flex items-center rounded-full px-6 py-2.5 text-sm font-medium sm:px-8 sm:py-3 sm:text-base"
              style={{ animationDelay: '700ms' }}
            >
              Дэлгэрэнгүй
            </a>
          </div>
        </div>

        <div className="flex w-full gap-3 md:w-auto md:flex-col md:items-end">
          <a
            href="#contact"
            className="animate-blur-fade-up liquid-glass inline-flex flex-1 items-center justify-center gap-1 rounded-full px-4 py-2.5 text-sm sm:px-6 md:flex-none"
            style={{ animationDelay: '800ms' }}
          >
            <ChevronLeft size={18} />
            Холбогдох
          </a>
          <a
            href="#careers"
            className="animate-blur-fade-up liquid-glass inline-flex flex-1 items-center justify-center gap-1 rounded-full px-4 py-2.5 text-sm sm:px-6 md:flex-none"
            style={{ animationDelay: '900ms' }}
          >
            Ажилд орох
            <ChevronRight size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}
