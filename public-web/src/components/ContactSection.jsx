import { MapPin, Phone, Mail, Globe, Clock } from 'lucide-react';

export default function ContactSection() {
  return (
    <section id="contact" className="relative z-20 border-t border-white/10 bg-black px-4 py-20 sm:px-6 md:px-12 md:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Холбоо барих</p>
        <h2 className="mb-12 text-3xl font-normal tracking-tightest md:text-5xl">Бидэнтэй холбогдоорой</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="section-glass space-y-5 p-8">
            {[
              { icon: MapPin, label: 'Хаяг', value: 'Улаанбаатар хот, Монгол улс' },
              { icon: Phone, label: 'Утас', value: '+976 0000-0000', href: 'tel:+97600000000' },
              { icon: Mail, label: 'Имэйл', value: 'info@adiya.site', href: 'mailto:info@adiya.site' },
              { icon: Globe, label: 'Вэб', value: 'adiya.site' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-white/50" />
                <div>
                  <div className="text-xs font-medium text-gray-500">{item.label}</div>
                  {item.href ? (
                    <a href={item.href} className="text-white transition hover:text-gray-300">
                      {item.value}
                    </a>
                  ) : (
                    <div className="text-white">{item.value}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="section-glass p-8">
            <div className="mb-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-white/50" />
              <h3 className="text-lg font-medium">Ажлын цаг</h3>
            </div>
            <div className="space-y-2 text-gray-300">
              <p>Даваа – Баасан: 09:00 – 18:00</p>
              <p>Бямба: 10:00 – 14:00</p>
              <p>Ням: Амарна</p>
            </div>
            <p className="mt-6 text-sm text-gray-400">Яаралтай техник дэмжлэг 24/7 ажиллана.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
