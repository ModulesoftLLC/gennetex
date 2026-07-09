import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CareersSection() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    const f = new FormData(e.target);
    const name = String(f.get('name') || '').trim();
    if (!name) {
      setMsg({ type: 'err', text: 'Нэрээ бичнэ үү.' });
      return;
    }
    setLoading(true);
    const row = {
      name,
      last_name: String(f.get('last_name') || '').trim() || null,
      phone: String(f.get('phone') || '').trim() || null,
      email: String(f.get('email') || '').trim() || null,
      position: String(f.get('position') || '').trim() || null,
      cv_url: String(f.get('cv_url') || '').trim() || null,
      message: String(f.get('message') || '').trim() || null,
      source: 'web',
      status: 'new',
    };
    const { error } = await supabase.from('job_applications').insert(row);
    setLoading(false);
    if (error) {
      setMsg({ type: 'err', text: `Алдаа гарлаа: ${error.message}` });
    } else {
      e.target.reset();
      setMsg({ type: 'ok', text: 'Таны анкет амжилттай илгээгдлээ. Бид тун удахгүй холбогдоно.' });
    }
  };

  return (
    <section id="careers" className="relative z-20 border-t border-white/10 bg-black px-4 py-20 sm:px-6 md:px-12 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Ажлын байр</p>
          <h2 className="mb-4 text-3xl font-normal tracking-tightest md:text-5xl">Манай багт нэгдээрэй</h2>
          <p className="mb-8 text-lg text-gray-400">
            Технологид дуртай, хөгжихийг эрмэлздэг хүмүүсийг бид урьж байна. Анкетыг бөглөснөөр шууд
            манай хүний нөөцийн багт очно.
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            {['Мэргэжлийн хөгжил — тасралтгүй сургалт', 'Тогтвортой орлого — өрсөлдөхүйц цалин', 'Найрсаг хамт олон — дэмжлэгтэй орчин'].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-white/60" />
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="section-glass space-y-4 p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-400">Нэр *</span>
              <input name="name" required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="Таны нэр" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-400">Овог</span>
              <input name="last_name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="Овог" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-400">Утас</span>
              <input name="phone" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="99xxxxxx" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-400">Имэйл</span>
              <input name="email" type="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="name@email.com" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-400">Албан тушаал</span>
            <input name="position" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="Сүлжээний инженер" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-400">CV холбоос</span>
            <input name="cv_url" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="Google Drive линк" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-gray-400">Танилцуулга</span>
            <textarea name="message" rows={4} className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-white/30" placeholder="Өөрийнхөө тухай товч бичнэ үү" />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-60"
          >
            <Send size={16} />
            {loading ? 'Илгээж байна...' : 'Анкет илгээх'}
          </button>
          {msg.text ? (
            <p className={`text-sm ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
