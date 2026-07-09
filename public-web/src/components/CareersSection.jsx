import JobApplicationForm from './JobApplicationForm';

export default function CareersSection() {
  return (
    <section id="careers" className="relative z-20 border-t border-white/10 bg-black px-4 py-20 sm:px-6 md:px-12 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/50">Ажлын байр</p>
        <h2 className="mb-3 text-center text-3xl font-normal tracking-tightest md:text-5xl">Ажилд орох анкет</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">
          &quot;ЖЕННЕТЕКС&quot; ХХК-ийн албан ёсны ажилд орох анкетыг доор бөглөн илгээнэ үү. Бөглөсөн мэдээлэл шууд
          хүний нөөцийн багт очно.
        </p>
        <JobApplicationForm />
      </div>
    </section>
  );
}
