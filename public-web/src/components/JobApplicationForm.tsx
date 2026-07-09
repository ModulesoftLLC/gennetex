import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Send, Trash2 } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { submitJobApplication } from '../lib/submitApplication';
import {
  emptyForm,
  type JobApplicationFormData,
} from '../types/jobApplication';

const STEPS = [
  { id: 'basic', title: 'Үндсэн' },
  { id: 'family', title: 'Гэр бүл' },
  { id: 'work', title: 'Туршлага' },
  { id: 'finish', title: 'Дуусгах' },
];

const input =
  'w-full border-0 border-b border-slate-200 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#453fc1]';
const label = 'mb-1 block text-sm text-slate-600';

function Field({
  children,
  title,
  required,
}: {
  children: React.ReactNode;
  title: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={label}>
        {title}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function YesNo({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (v: 'Тийм' | 'Үгүй') => void;
  name: string;
}) {
  return (
    <div className="flex gap-6 text-sm">
      {(['Тийм', 'Үгүй'] as const).map((v) => (
        <label key={v} className="flex cursor-pointer items-center gap-2">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-[#453fc1]" />
          {v}
        </label>
      ))}
    </div>
  );
}

function RowCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        {onRemove ? (
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function JobApplicationForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<JobApplicationFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showExtra, setShowExtra] = useState(false);

  const setGeneral = (patch: Partial<JobApplicationFormData['general']>) =>
    setForm((f) => ({ ...f, general: { ...f.general, ...patch } }));

  const validateStep = (): string | null => {
    const g = form.general;
    if (step === 0) {
      if (!g.firstName.trim()) return 'Өөрийн нэрээ оруулна уу.';
      if (!g.fatherName.trim()) return 'Эцэг (эх)-ийн нэрийг оруулна уу.';
      if (!g.phoneMobile.trim()) return 'Утасны дугаараа оруулна уу.';
      if (!g.registrationNo.trim()) return 'Регистрийн дугаараа оруулна уу.';
    }
    if (step === 3) {
      if (!form.consent) return 'Зөвшөөрлийг тэмдэглэнэ үү.';
      if (!form.signatureSvg.trim()) return 'Гарын үсэг зурна уу.';
      const ok = form.emergencyContacts.some((e) => e.name.trim() && e.phone.trim());
      if (!ok) return 'Яаралтай холбоо барих хүний мэдээлэл оруулна уу.';
    }
    return null;
  };

  const next = () => {
    setMsg(null);
    const err = validateStep();
    if (err) {
      setMsg({ type: 'err', text: err });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setMsg(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onPhoto = (file: File | null) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setMsg({ type: 'err', text: 'Зураг 3MB-аас бага байх ёстой.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setGeneral({ photoDataUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setMsg(null);
    const err = validateStep();
    if (err) {
      setMsg({ type: 'err', text: err });
      return;
    }
    setLoading(true);
    try {
      await submitJobApplication({ ...form, signedAt: new Date().toISOString() });
      setForm(emptyForm());
      setStep(0);
      setMsg({ type: 'ok', text: 'Амжилттай илгээгдлээ. Баярлалаа!' });
    } catch (ex) {
      setMsg({ type: 'err', text: ex instanceof Error ? ex.message : 'Илгээхэд алдаа гарлаа.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Алхам */}
      <div className="mb-8 flex items-center justify-between gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? 'bg-[#453fc1] text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-[10px] sm:text-xs ${i === step ? 'font-semibold text-[#453fc1]' : 'text-slate-400'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-[320px] space-y-5">
        {step === 0 && (
          <>
            <Field title="Өөрийн нэр" required>
              <input className={input} value={form.general.firstName} onChange={(e) => setGeneral({ firstName: e.target.value })} />
            </Field>
            <Field title="Эцэг (эх)-ийн нэр" required>
              <input className={input} value={form.general.fatherName} onChange={(e) => setGeneral({ fatherName: e.target.value })} />
            </Field>
            <Field title="Ургийн овог">
              <input className={input} value={form.general.clanName} onChange={(e) => setGeneral({ clanName: e.target.value })} />
            </Field>
            <Field title="Регистрийн дугаар" required>
              <input className={input} value={form.general.registrationNo} onChange={(e) => setGeneral({ registrationNo: e.target.value })} />
            </Field>
            <Field title="Утас" required>
              <input className={input} value={form.general.phoneMobile} onChange={(e) => setGeneral({ phoneMobile: e.target.value })} />
            </Field>
            <Field title="И-мэйл">
              <input type="email" className={input} value={form.general.email} onChange={(e) => setGeneral({ email: e.target.value })} />
            </Field>
            <Field title="Оршин суугаа хаяг">
              <input className={input} value={form.general.address} onChange={(e) => setGeneral({ address: e.target.value })} />
            </Field>
            <Field title="Зураг">
              <input type="file" accept="image/*" className="text-sm text-slate-600" onChange={(e) => onPhoto(e.target.files?.[0] || null)} />
            </Field>
            <button
              type="button"
              className="text-sm text-[#453fc1] hover:underline"
              onClick={() => setShowExtra((v) => !v)}
            >
              {showExtra ? '− Нэмэлт нуух' : '+ Нэмэлт мэдээлэл'}
            </button>
            {showExtra ? (
              <div className="space-y-4 rounded-xl bg-slate-50 p-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field title="Төрсөн он">
                    <input className={input} value={form.general.birthYear} onChange={(e) => setGeneral({ birthYear: e.target.value })} />
                  </Field>
                  <Field title="Сар">
                    <input className={input} value={form.general.birthMonth} onChange={(e) => setGeneral({ birthMonth: e.target.value })} />
                  </Field>
                  <Field title="Өдөр">
                    <input className={input} value={form.general.birthDay} onChange={(e) => setGeneral({ birthDay: e.target.value })} />
                  </Field>
                </div>
                <Field title="Хүйс">
                  <select className={input} value={form.general.gender} onChange={(e) => setGeneral({ gender: e.target.value as 'Эрэгтэй' | 'Эмэгтэй' | '' })}>
                    <option value="">—</option>
                    <option value="Эрэгтэй">Эрэгтэй</option>
                    <option value="Эмэгтэй">Эмэгтэй</option>
                  </select>
                </Field>
                <Field title="Гэр утас">
                  <input className={input} value={form.general.phoneHome} onChange={(e) => setGeneral({ phoneHome: e.target.value })} />
                </Field>
              </div>
            ) : null}
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <span className={label}>Гэрлэсэн эсэх</span>
              <YesNo
                name="married"
                value={form.family.married}
                onChange={(v) => setForm((f) => ({ ...f, family: { ...f.family, married: v } }))}
              />
            </div>
            <p className="text-sm font-medium text-slate-700">Гэр бүлийн гишүүд</p>
            {form.family.members.map((m, i) => (
              <RowCard
                key={i}
                title={`Гишүүн ${i + 1}`}
                onRemove={form.family.members.length > 1 ? () => setForm((f) => ({ ...f, family: { ...f.family, members: f.family.members.filter((_, j) => j !== i) } })) : undefined}
              >
                <input className={input} placeholder="Овог нэр" value={m.fullName} onChange={(e) => { const members = [...form.family.members]; members[i] = { ...members[i], fullName: e.target.value }; setForm((f) => ({ ...f, family: { ...f.family, members } })); }} />
                <input className={input} placeholder="Хэн болох" value={m.relation} onChange={(e) => { const members = [...form.family.members]; members[i] = { ...members[i], relation: e.target.value }; setForm((f) => ({ ...f, family: { ...f.family, members } })); }} />
                <input className={input} placeholder="Утас" value={m.phone} onChange={(e) => { const members = [...form.family.members]; members[i] = { ...members[i], phone: e.target.value }; setForm((f) => ({ ...f, family: { ...f.family, members } })); }} />
              </RowCard>
            ))}
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-[#453fc1]"
              onClick={() => setForm((f) => ({ ...f, family: { ...f.family, members: [...f.family.members, { fullName: '', relation: '', birthYear: '', workOrSchool: '', phone: '' }] } }))}
            >
              <Plus size={16} /> Нэмэх
            </button>

            <p className="pt-4 text-sm font-medium text-slate-700">Боловсрол</p>
            {form.education.map((row, i) => (
              <RowCard
                key={i}
                title={`Боловсрол ${i + 1}`}
                onRemove={form.education.length > 1 ? () => setForm((f) => ({ ...f, education: f.education.filter((_, j) => j !== i) })) : undefined}
              >
                <input className={input} placeholder="Сургууль" value={row.schoolName} onChange={(e) => { const education = [...form.education]; education[i] = { ...education[i], schoolName: e.target.value }; setForm((f) => ({ ...f, education })); }} />
                <input className={input} placeholder="Мэргэжил" value={row.profession} onChange={(e) => { const education = [...form.education]; education[i] = { ...education[i], profession: e.target.value }; setForm((f) => ({ ...f, education })); }} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} placeholder="Элссэн он" value={row.enteredYear} onChange={(e) => { const education = [...form.education]; education[i] = { ...education[i], enteredYear: e.target.value }; setForm((f) => ({ ...f, education })); }} />
                  <input className={input} placeholder="Төгссөн он" value={row.graduatedYear} onChange={(e) => { const education = [...form.education]; education[i] = { ...education[i], graduatedYear: e.target.value }; setForm((f) => ({ ...f, education })); }} />
                </div>
              </RowCard>
            ))}
            <button type="button" className="flex items-center gap-1 text-sm text-[#453fc1]" onClick={() => setForm((f) => ({ ...f, education: [...f.education, { location: '', schoolName: '', enteredYear: '', graduatedYear: '', profession: '', degree: '', gpa: '' }] }))}>
              <Plus size={16} /> Боловсрол нэмэх
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-slate-500">Заавал биш — байвал бөглөнө.</p>
            <p className="text-sm font-medium text-slate-700">Ажлын туршлага</p>
            {form.workExperience.map((row, i) => (
              <RowCard
                key={i}
                title={`Ажил ${i + 1}`}
                onRemove={form.workExperience.length > 1 ? () => setForm((f) => ({ ...f, workExperience: f.workExperience.filter((_, j) => j !== i) })) : undefined}
              >
                <input className={input} placeholder="Байгууллага" value={row.companyName} onChange={(e) => { const workExperience = [...form.workExperience]; workExperience[i] = { ...workExperience[i], companyName: e.target.value }; setForm((f) => ({ ...f, workExperience })); }} />
                <input className={input} placeholder="Албан тушаал" value={row.position} onChange={(e) => { const workExperience = [...form.workExperience]; workExperience[i] = { ...workExperience[i], position: e.target.value }; setForm((f) => ({ ...f, workExperience })); }} />
                <textarea className={`${input} min-h-[60px] resize-y`} placeholder="Гүйцэтгэсэн ажил" value={row.duties} onChange={(e) => { const workExperience = [...form.workExperience]; workExperience[i] = { ...workExperience[i], duties: e.target.value }; setForm((f) => ({ ...f, workExperience })); }} />
              </RowCard>
            ))}
            <button type="button" className="flex items-center gap-1 text-sm text-[#453fc1]" onClick={() => setForm((f) => ({ ...f, workExperience: [...f.workExperience, { companyName: '', duties: '', position: '', startDate: '', endDate: '', salary: '', leaveReason: '' }] }))}>
              <Plus size={16} /> Туршлага нэмэх
            </button>

            <Field title="Сонирхож буй ажлын байр">
              <input className={input} value={form.jobInterest.position} onChange={(e) => setForm((f) => ({ ...f, jobInterest: { ...f.jobInterest, position: e.target.value } }))} />
            </Field>
            <Field title="Хүсэж буй цалин">
              <input className={input} value={form.jobInterest.desiredSalary} onChange={(e) => setForm((f) => ({ ...f, jobInterest: { ...f.jobInterest, desiredSalary: e.target.value } }))} />
            </Field>
            <Field title="Давуу тал">
              <textarea className={`${input} min-h-[72px] resize-y`} value={form.personal.strengths} onChange={(e) => setForm((f) => ({ ...f, personal: { ...f.personal, strengths: e.target.value } }))} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm font-medium text-slate-700">Яаралтай холбоо</p>
            {form.emergencyContacts.map((c, i) => (
              <RowCard key={i} title={`Хүн ${i + 1}`}>
                <input className={input} placeholder="Нэр" value={c.name} onChange={(e) => { const emergencyContacts = [...form.emergencyContacts]; emergencyContacts[i] = { ...emergencyContacts[i], name: e.target.value }; setForm((f) => ({ ...f, emergencyContacts })); }} />
                <input className={input} placeholder="Хэн болох" value={c.relation} onChange={(e) => { const emergencyContacts = [...form.emergencyContacts]; emergencyContacts[i] = { ...emergencyContacts[i], relation: e.target.value }; setForm((f) => ({ ...f, emergencyContacts })); }} />
                <input className={input} placeholder="Утас" value={c.phone} onChange={(e) => { const emergencyContacts = [...form.emergencyContacts]; emergencyContacts[i] = { ...emergencyContacts[i], phone: e.target.value }; setForm((f) => ({ ...f, emergencyContacts })); }} />
              </RowCard>
            ))}
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} className="mt-1 accent-[#453fc1]" />
              Мэдээлэл үнэн зөв бөгөөд дүрмийг зөвшөөрч байна.
            </label>
            <div>
              <span className={label}>Гарын үсэг *</span>
              <SignaturePad onChange={(svg) => setForm((f) => ({ ...f, signatureSvg: svg }))} />
            </div>
          </>
        )}
      </div>

      {msg ? (
        <p className={`mt-4 text-center text-sm ${msg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
      ) : null}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <button type="button" onClick={back} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700">
            <ChevronLeft size={18} /> Буцах
          </button>
        ) : (
          <div className="flex-1" />
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#453fc1] py-3 text-sm font-semibold text-white">
            Үргэлжлүүлэх <ChevronRight size={18} />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={loading} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#453fc1] py-3 text-sm font-semibold text-white disabled:opacity-60">
            <Send size={16} /> {loading ? 'Илгээж байна...' : 'Илгээх'}
          </button>
        )}
      </div>
    </div>
  );
}
