import { Target, Users, Shield } from 'lucide-react';

const ITEMS = [
  {
    icon: Target,
    title: 'Эрхэм зорилго',
    text: 'Чанартай, найдвартай технологийн шийдлээр харилцагчдынхаа өсөлтөд хувь нэмэр оруулах.',
  },
  {
    icon: Users,
    title: 'Мэргэжлийн баг',
    text: 'Гэрчилгээжсэн, тасралтгүй хөгжиж буй инженерүүдийн туршлагатай хамт олон.',
  },
  {
    icon: Shield,
    title: 'Хариуцлага',
    text: 'Төслийн эхнээс дуустал, дараах засвар үйлчилгээ хүртэл бүрэн хариуцлага.',
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="relative z-20 bg-black px-4 py-20 sm:px-6 md:px-12 md:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Бидний тухай</p>
        <h2 className="mb-4 max-w-2xl text-3xl font-normal tracking-tightest md:text-5xl">
          Найдвартай технологийн түнш
        </h2>
        <p className="mb-12 max-w-2xl text-lg text-gray-400">
          Бид орчин үеийн технологи, туршлагатай инженерүүдийн багаараа дамжуулан байгууллагуудын
          дижитал шилжилтийг дэмжиж, тасралтгүй аюулгүй үйл ажиллагааг хангадаг.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.title} className="section-glass p-6 transition-transform hover:-translate-y-1">
              <item.icon className="mb-4 h-8 w-8 text-white/80" strokeWidth={1.5} />
              <h3 className="mb-2 text-lg font-medium">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
