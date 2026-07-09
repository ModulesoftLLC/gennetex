import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import JobApplicationForm from '../components/JobApplicationForm';

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} />
            Буцах
          </Link>
          <img src="/logo.png" alt="ЖЕННЕТЕКС" className="h-8 object-contain" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-center text-2xl font-semibold text-slate-900">Ажилд орох анкет</h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-slate-500">
          4 алхамд бөглөөд илгээнэ үү.
        </p>
        <div className="mt-10">
          <JobApplicationForm />
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ЖЕННЕТЕКС ХХК
      </footer>
    </div>
  );
}
