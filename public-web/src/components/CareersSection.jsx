import JobApplicationForm from './JobApplicationForm';
import { useSiteContent } from '../context/SiteContentContext';

export default function CareersSection() {
  const { careers } = useSiteContent();

  return (
    <section id="careers" className="relative z-20 border-t border-white/10 bg-black px-4 py-20 sm:px-6 md:px-12 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/50">{careers.label}</p>
        <h2 className="mb-3 text-center text-3xl font-normal tracking-tightest md:text-5xl">{careers.title}</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">{careers.intro}</p>
        <JobApplicationForm />
      </div>
    </section>
  );
}
