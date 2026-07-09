import { useRef, useState } from 'react';
import { Plus, Printer, FileDown, Send } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { downloadApplicationPdf, printApplication } from '../lib/applicationPdf';
import { submitJobApplication } from '../lib/submitApplication';
import {
  emptyForm,
  type JobApplicationFormData,
  type SkillLevel,
} from '../types/jobApplication';

const inputCls =
  'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-white/40';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-400';
const sectionCls = 'rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label}
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
    <div className="flex gap-4">
      {(['Тийм', 'Үгүй'] as const).map((v) => (
        <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === v}
            onChange={() => onChange(v)}
            className="accent-white"
          />
          {v}
        </label>
      ))}
    </div>
  );
}

function SkillRadio({
  value,
  onChange,
  name,
}: {
  value: SkillLevel;
  onChange: (v: SkillLevel) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['Сайн', 'Дунд', 'Муу'] as const).map((v) => (
        <label key={v} className="flex cursor-pointer items-center gap-1 text-xs">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="accent-white" />
          {v}
        </label>
      ))}
    </div>
  );
}

export default function JobApplicationForm() {
  const [form, setForm] = useState<JobApplicationFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const setGeneral = (patch: Partial<JobApplicationFormData['general']>) =>
    setForm((f) => ({ ...f, general: { ...f.general, ...patch } }));

  const validate = (): string | null => {
    const g = form.general;
    if (!g.firstName.trim()) return 'Өөрийн нэрийг бөглөнө үү.';
    if (!g.fatherName.trim()) return 'Эцэг (эх)-ийн нэрийг бөглөнө үү.';
    if (!g.phoneMobile.trim()) return 'Гар утасны дугаараа бөглөнө үү.';
    if (!g.registrationNo.trim()) return 'Регистрийн дугаараа бөглөнө үү.';
    if (!form.consent) return 'Зөвшөөрлийн хэсгийг тэмдэглэнэ үү.';
    if (!form.signatureSvg.trim()) return 'Гарын үсэг зурна уу.';
    const emerg = form.emergencyContacts.filter((e) => e.name.trim() && e.phone.trim());
    if (emerg.length < 1) return 'Ядаж нэг яаралтай холбоо барих хүний мэдээлэл оруулна уу.';
    return null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const err = validate();
    if (err) {
      setMsg({ type: 'err', text: err });
      return;
    }
    const payload = { ...form, signedAt: new Date().toISOString() };
    setLoading(true);
    try {
      await submitJobApplication(payload);
      setForm(emptyForm());
      setMsg({ type: 'ok', text: 'Анкет амжилттай илгээгдлээ. Бид тун удахгүй холбогдоно.' });
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (ex) {
      setMsg({ type: 'err', text: ex instanceof Error ? ex.message : 'Илгээхэд алдаа гарлаа.' });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => ({ ...form, signedAt: form.signedAt || new Date().toISOString() });

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      <div className="text-center">
        <img src="/logo.png" alt="ЖЕННЕТЕКС" className="mx-auto mb-4 h-16 object-contain" />
        <p className="text-sm font-semibold tracking-wide text-gray-400">{form.company}</p>
        <h3 className="mt-1 text-xl font-medium md:text-2xl">{form.title}</h3>
      </div>

      {/* 1. ЕРӨНХИЙ МЭДЭЭЛЭЛ */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">1. Ерөнхий мэдээлэл</h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Ургийн овог" required>
            <input className={inputCls} value={form.general.clanName} onChange={(e) => setGeneral({ clanName: e.target.value })} />
          </Field>
          <Field label="Эцэг (эх)-ийн нэр" required>
            <input className={inputCls} value={form.general.fatherName} onChange={(e) => setGeneral({ fatherName: e.target.value })} />
          </Field>
          <Field label="Өөрийн нэр" required>
            <input className={inputCls} value={form.general.firstName} onChange={(e) => setGeneral({ firstName: e.target.value })} />
          </Field>
          <Field label="Төрсөн он">
            <input className={inputCls} placeholder="1986" value={form.general.birthYear} onChange={(e) => setGeneral({ birthYear: e.target.value })} />
          </Field>
          <Field label="Сар">
            <input className={inputCls} placeholder="12" value={form.general.birthMonth} onChange={(e) => setGeneral({ birthMonth: e.target.value })} />
          </Field>
          <Field label="Өдөр">
            <input className={inputCls} placeholder="11" value={form.general.birthDay} onChange={(e) => setGeneral({ birthDay: e.target.value })} />
          </Field>
          <Field label="Төрсөн аймаг, хот">
            <input className={inputCls} value={form.general.birthProvince} onChange={(e) => setGeneral({ birthProvince: e.target.value })} />
          </Field>
          <Field label="Сум, дүүрэг">
            <input className={inputCls} value={form.general.birthDistrict} onChange={(e) => setGeneral({ birthDistrict: e.target.value })} />
          </Field>
          <Field label="Яс үндэс">
            <input className={inputCls} value={form.general.ethnicity} onChange={(e) => setGeneral({ ethnicity: e.target.value })} />
          </Field>
          <Field label="Хүйс">
            <select className={inputCls} value={form.general.gender} onChange={(e) => setGeneral({ gender: e.target.value as 'Эрэгтэй' | 'Эмэгтэй' | '' })}>
              <option value="">Сонгох</option>
              <option value="Эрэгтэй">Эрэгтэй</option>
              <option value="Эмэгтэй">Эмэгтэй</option>
            </select>
          </Field>
          <Field label="Регистрийн дугаар" required>
            <input className={inputCls} value={form.general.registrationNo} onChange={(e) => setGeneral({ registrationNo: e.target.value })} />
          </Field>
          <Field label="И-мэйл хаяг">
            <input type="email" className={inputCls} value={form.general.email} onChange={(e) => setGeneral({ email: e.target.value })} />
          </Field>
          <div>
            <span className={labelCls}>НД төлдөг эсэх</span>
            <YesNo name="nd" value={form.general.paysSocialInsurance} onChange={(v) => setGeneral({ paysSocialInsurance: v })} />
          </div>
          <Field label="Харилцах утас (гар)" required>
            <input className={inputCls} value={form.general.phoneMobile} onChange={(e) => setGeneral({ phoneMobile: e.target.value })} />
          </Field>
          <Field label="Харилцах утас (гэр)">
            <input className={inputCls} value={form.general.phoneHome} onChange={(e) => setGeneral({ phoneHome: e.target.value })} />
          </Field>
          <Field label="Жолооны үнэмлэхний №">
            <input className={inputCls} value={form.general.driverLicenseNo} onChange={(e) => setGeneral({ driverLicenseNo: e.target.value })} />
          </Field>
          <Field label="Жолооны ангилал">
            <input className={inputCls} value={form.general.driverLicenseClass} onChange={(e) => setGeneral({ driverLicenseClass: e.target.value })} />
          </Field>
          <Field label="Цусны бүлэг">
            <input className={inputCls} value={form.general.bloodType} onChange={(e) => setGeneral({ bloodType: e.target.value })} />
          </Field>
          <Field label="Оршин суугаа хаяг">
            <input className={inputCls} value={form.general.address} onChange={(e) => setGeneral({ address: e.target.value })} />
          </Field>
          <div>
            <span className={labelCls}>Оршин суух төрөл</span>
            <div className="flex flex-col gap-2 text-sm">
              {(['Өөрийн', 'Түрээсийн', 'Эцэг эх хамаатан садангийн'] as const).map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="housing" checked={form.general.housingType === v} onChange={() => setGeneral({ housingType: v })} className="accent-white" />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <Field label="Биеийн хэмжээ">
            <input className={inputCls} value={form.general.bodySize} onChange={(e) => setGeneral({ bodySize: e.target.value })} />
          </Field>
          <Field label="Хувцасны размер">
            <input className={inputCls} value={form.general.clothingSize} onChange={(e) => setGeneral({ clothingSize: e.target.value })} />
          </Field>
          <Field label="Гутлын размер">
            <input className={inputCls} value={form.general.shoeSize} onChange={(e) => setGeneral({ shoeSize: e.target.value })} />
          </Field>
          <Field label="Юнивишн гэрээний дугаар">
            <input className={inputCls} value={form.general.univisionContractNo} onChange={(e) => setGeneral({ univisionContractNo: e.target.value })} />
          </Field>
          <Field label="Сүүлийн 3 сард авахуулсан зураг">
            <input type="file" accept="image/*" className={inputCls} onChange={(e) => onPhoto(e.target.files?.[0] || null)} />
            {form.general.photoDataUrl ? (
              <img src={form.general.photoDataUrl} alt="Зураг" className="mt-2 h-32 w-24 rounded-lg border border-dashed border-white/30 object-cover" />
            ) : null}
          </Field>
        </div>
      </section>

      {/* 2. ГЭР БҮЛ */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">2. Гэр бүлийн байдал</h4>
        <div className="mb-4">
          <span className={labelCls}>Гэрлэсэн эсэх</span>
          <YesNo name="married" value={form.family.married} onChange={(v) => setForm((f) => ({ ...f, family: { ...f.family, married: v } }))} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="p-2">Овог нэр</th>
                <th className="p-2">Таны юу болох</th>
                <th className="p-2">Төрсөн он</th>
                <th className="p-2">Ажил / сургууль</th>
                <th className="p-2">Утас</th>
              </tr>
            </thead>
            <tbody>
              {form.family.members.map((m, i) => (
                <tr key={i} className="border-b border-white/5">
                  {(['fullName', 'relation', 'birthYear', 'workOrSchool', 'phone'] as const).map((k) => (
                    <td key={k} className="p-1">
                      <input
                        className={inputCls}
                        value={m[k]}
                        onChange={(e) => {
                          const members = [...form.family.members];
                          members[i] = { ...members[i], [k]: e.target.value };
                          setForm((f) => ({ ...f, family: { ...f.family, members } }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className={`${btnGhost} mt-3`}
          onClick={() =>
            setForm((f) => ({
              ...f,
              family: {
                ...f.family,
                members: [...f.family.members, { fullName: '', relation: '', birthYear: '', workOrSchool: '', phone: '' }],
              },
            }))
          }
        >
          <Plus size={14} /> Гэр бүлийн гишүүн нэмэх
        </button>
      </section>

      {/* 3. БОЛОВСРОЛ */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">3. Боловсролын байдал</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                {['Хаана', 'Сургуулийн нэр', 'Элссэн он', 'Төгссөн он', 'Мэргэжил', 'Зэрэг цол', 'Голч дүн'].map((h) => (
                  <th key={h} className="p-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.education.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  {(['location', 'schoolName', 'enteredYear', 'graduatedYear', 'profession', 'degree', 'gpa'] as const).map((k) => (
                    <td key={k} className="p-1">
                      <input
                        className={inputCls}
                        value={row[k]}
                        onChange={(e) => {
                          const education = [...form.education];
                          education[i] = { ...education[i], [k]: e.target.value };
                          setForm((f) => ({ ...f, education }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setForm((f) => ({ ...f, education: [...f.education, { location: '', schoolName: '', enteredYear: '', graduatedYear: '', profession: '', degree: '', gpa: '' }] }))}>
          <Plus size={14} /> Боловсрол нэмэх
        </button>
      </section>

      {/* 4. АЖЛЫН ТУРШЛАГА */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">4. Ажлын дадлага туршлага</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                {['Байгууллагын нэр', 'Ажил үүрэг', 'Албан тушаал', 'Орсон', 'Гарсан', 'Цалин', 'Гарсан шалтгаан'].map((h) => (
                  <th key={h} className="p-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.workExperience.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  {(['companyName', 'duties', 'position', 'startDate', 'endDate', 'salary', 'leaveReason'] as const).map((k) => (
                    <td key={k} className="p-1">
                      <input className={inputCls} value={row[k]} onChange={(e) => {
                        const workExperience = [...form.workExperience];
                        workExperience[i] = { ...workExperience[i], [k]: e.target.value };
                        setForm((f) => ({ ...f, workExperience }));
                      }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setForm((f) => ({ ...f, workExperience: [...f.workExperience, { companyName: '', duties: '', position: '', startDate: '', endDate: '', salary: '', leaveReason: '' }] }))}>
          <Plus size={14} /> Ажлын туршлага нэмэх
        </button>
      </section>

      {/* 5. ХЭЛ */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">5. Гадаад хэлний мэдлэг</h4>
        <div className="space-y-4">
          {form.languages.map((row, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-3">
              <Field label="Гадаад хэл">
                <input className={inputCls} value={row.language} onChange={(e) => {
                  const languages = [...form.languages];
                  languages[i] = { ...languages[i], language: e.target.value };
                  setForm((f) => ({ ...f, languages }));
                }} />
              </Field>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><span className={labelCls}>Ярьж ойлгох</span><SkillRadio name={`l${i}a`} value={row.listening} onChange={(v) => { const languages = [...form.languages]; languages[i].listening = v; setForm((f) => ({ ...f, languages })); }} /></div>
                <div><span className={labelCls}>Өөрөө ярих</span><SkillRadio name={`l${i}b`} value={row.speaking} onChange={(v) => { const languages = [...form.languages]; languages[i].speaking = v; setForm((f) => ({ ...f, languages })); }} /></div>
                <div><span className={labelCls}>Уншиж ойлгох</span><SkillRadio name={`l${i}c`} value={row.reading} onChange={(v) => { const languages = [...form.languages]; languages[i].reading = v; setForm((f) => ({ ...f, languages })); }} /></div>
                <div><span className={labelCls}>Бичиж орчуулах</span><SkillRadio name={`l${i}d`} value={row.writing} onChange={(v) => { const languages = [...form.languages]; languages[i].writing = v; setForm((f) => ({ ...f, languages })); }} /></div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setForm((f) => ({ ...f, languages: [...f.languages, { language: '', listening: '', speaking: '', reading: '', writing: '' }] }))}>
          <Plus size={14} /> Хэл нэмэх
        </button>
      </section>

      {/* 6-7 */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">6. Хувийн онцлог</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Таны давуу тал">
            <textarea rows={4} className={inputCls} value={form.personal.strengths} onChange={(e) => setForm((f) => ({ ...f, personal: { ...f.personal, strengths: e.target.value } }))} />
          </Field>
          <Field label="Таны сул тал">
            <textarea rows={4} className={inputCls} value={form.personal.weaknesses} onChange={(e) => setForm((f) => ({ ...f, personal: { ...f.personal, weaknesses: e.target.value } }))} />
          </Field>
        </div>
        <h4 className="mb-4 mt-6 text-sm font-bold uppercase tracking-wider text-white/80">7. Ажилд орох хүсэл</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Сонирхож буй ажлын байр">
            <input className={inputCls} value={form.jobInterest.position} onChange={(e) => setForm((f) => ({ ...f, jobInterest: { ...f.jobInterest, position: e.target.value } }))} />
          </Field>
          <Field label="Хүсэж буй цалингийн хэмжээ">
            <input className={inputCls} value={form.jobInterest.desiredSalary} onChange={(e) => setForm((f) => ({ ...f, jobInterest: { ...f.jobInterest, desiredSalary: e.target.value } }))} />
          </Field>
        </div>
      </section>

      {/* 8. Яаралтай */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">8. Яаралтай тохиолдолд холбоо барих хүмүүс</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {form.emergencyContacts.map((c, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-3 space-y-2">
              <Field label={`Хүн ${i + 1} — Нэр`}>
                <input className={inputCls} value={c.name} onChange={(e) => {
                  const emergencyContacts = [...form.emergencyContacts];
                  emergencyContacts[i] = { ...emergencyContacts[i], name: e.target.value };
                  setForm((f) => ({ ...f, emergencyContacts }));
                }} />
              </Field>
              <Field label="Таны юу болох">
                <input className={inputCls} value={c.relation} onChange={(e) => {
                  const emergencyContacts = [...form.emergencyContacts];
                  emergencyContacts[i] = { ...emergencyContacts[i], relation: e.target.value };
                  setForm((f) => ({ ...f, emergencyContacts }));
                }} />
              </Field>
              <Field label="Утас">
                <input className={inputCls} value={c.phone} onChange={(e) => {
                  const emergencyContacts = [...form.emergencyContacts];
                  emergencyContacts[i] = { ...emergencyContacts[i], phone: e.target.value };
                  setForm((f) => ({ ...f, emergencyContacts }));
                }} />
              </Field>
            </div>
          ))}
        </div>
      </section>

      {/* 9-10 */}
      <section className={sectionCls}>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/80">9. Зөвшөөрөл</h4>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-300">
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} className="mt-1 accent-white" />
          Би дээрх мэдээллийг үнэн зөв бөглөсөн бөгөөд байгууллагын дүрэм журмыг хүлээн зөвшөөрч байна.
        </label>
        <h4 className="mb-4 mt-6 text-sm font-bold uppercase tracking-wider text-white/80">10. Гарын үсэг</h4>
        <SignaturePad onChange={(svg) => setForm((f) => ({ ...f, signatureSvg: svg }))} />
        <p className="mt-2 text-xs text-gray-500">Огноо: {new Date().toLocaleDateString('mn-MN')}</p>
      </section>

      {msg ? <p className={`text-center text-sm ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p> : null}

      <div className="flex flex-wrap justify-center gap-3 pb-4">
        <button type="button" className={btnGhost} onClick={() => printApplication(exportData())}>
          <Printer size={16} /> Хэвлэх
        </button>
        <button type="button" className={btnGhost} onClick={() => downloadApplicationPdf(exportData())}>
          <FileDown size={16} /> PDF хадгалах
        </button>
        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60">
          <Send size={16} />
          {loading ? 'Илгээж байна...' : 'Анкет илгээх'}
        </button>
      </div>
    </form>
  );
}
