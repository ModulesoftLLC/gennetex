const STATS = [
  { value: '10+', label: 'Жилийн туршлага' },
  { value: '500+', label: 'Хэрэгжүүлсэн төсөл' },
  { value: '50+', label: 'Мэргэжлийн инженер' },
  { value: '24/7', label: 'Техник дэмжлэг' },
];

const HIGHLIGHTS = [
  'Байгууллагын сүлжээний бүрэн шинэчлэл, өндөр хурдны шилэн холболт',
  'Оффис, агуулах, үйлдвэрлэлийн талбайн CCTV болон хяналтын систем',
  'Төслийн эхнээс дуустал инженерийн хяналт, гүйцэтгэлийн баталгаа',
];

export default function ProjectsSection({ embedded = false }) {
  return (
    <section className={`relative z-20 border-t border-white/10 bg-black px-4 sm:px-6 md:px-12 ${embedded ? 'py-12 md:py-16' : 'py-20 md:py-28'}`}>
      <div className="mx-auto max-w-6xl">
        {!embedded ? (
          <>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Төслүүд</p>
            <h2 className="mb-12 text-3xl font-normal tracking-tightest md:text-5xl">Бидний хүрсэн үр дүн</h2>
          </>
        ) : null}

        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="section-glass p-6 text-center">
              <div className="text-3xl font-semibold tracking-tight md:text-4xl">{s.value}</div>
              <div className="mt-2 text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="section-glass p-8 md:p-10">
          <h3 className="mb-6 text-xl font-medium">Гол чиглэлүүд</h3>
          <ul className="space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-3 text-gray-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                <span className="leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
