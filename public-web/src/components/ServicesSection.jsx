import { Network, Cable, Camera, ShieldCheck, Server, Wrench } from 'lucide-react';

const SERVICES = [
  { icon: Network, title: 'Сүлжээний шийдэл', text: 'LAN/WAN, өгөгдлийн төв, wireless сүлжээний зураг төсөл, суурилуулалт.' },
  { icon: Cable, title: 'Шилэн кабель', text: 'Fiber optic татах, гагнах, хэмжилт, терминаци болон бүрэн шинжилгээ.' },
  { icon: Camera, title: 'Хяналтын систем', text: 'CCTV, хяналт-камер, хандалт удирдлагын иж бүрэн систем.' },
  { icon: ShieldCheck, title: 'Аюулгүй байдал', text: 'Гал хамгаалалт, дохиолол, мэдээллийн аюулгүй байдлын шийдэл.' },
  { icon: Server, title: 'IT дэд бүтэц', text: 'Сервер, өгөгдлийн төв, виртуалчлал, дэд бүтцийн зөвлөгөө.' },
  { icon: Wrench, title: 'Техник үйлчилгээ', text: '24/7 хяналт, урьдчилан сэргийлэх засвар, шуурхай дэмжлэг.' },
];

export default function ServicesSection({ embedded = false }) {
  return (
    <section className={`relative z-20 border-t border-white/10 bg-black px-4 sm:px-6 md:px-12 ${embedded ? 'py-12 md:py-16' : 'py-20 md:py-28'}`}>
      <div className="mx-auto max-w-6xl">
        {!embedded ? (
          <>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Үйлчилгээ</p>
            <h2 className="mb-12 text-3xl font-normal tracking-tightest md:text-5xl">Бидний санал болгодог шийдлүүд</h2>
          </>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="section-glass group p-6 transition-all hover:border-white/20 hover:bg-white/[0.05]">
              <s.icon className="mb-4 h-7 w-7 text-white/70 transition-colors group-hover:text-white" strokeWidth={1.5} />
              <h3 className="mb-2 font-medium">{s.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
