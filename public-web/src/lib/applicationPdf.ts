import type { JobApplicationFormData } from '../types/jobApplication';

function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildApplicationPrintHtml(data: JobApplicationFormData) {
  const g = data.general;
  const fam = data.family.members.filter((m) => m.fullName.trim());
  const edu = data.education.filter((e) => e.schoolName.trim() || e.location.trim());
  const work = data.workExperience.filter((w) => w.companyName.trim());
  const langs = data.languages.filter((l) => l.language.trim());
  const emerg = data.emergencyContacts.filter((e) => e.name.trim());

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;width:32%;background:#f9fafb">${esc(label)}</td><td style="padding:6px 10px;border:1px solid #ddd">${esc(value || '—')}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:Inter,system-ui,sans-serif;color:#111;padding:24px;font-size:12px}
    h1{text-align:center;font-size:18px;margin:0 0 4px}
    h2{font-size:14px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
    th{background:#f3f4f6}
    .logo{text-align:center;margin-bottom:12px}
    .photo{float:right;width:120px;height:150px;border:1px dashed #999;object-fit:cover;margin:0 0 8px 12px}
  </style></head><body>
  <div class="logo"><img src="/logo.png" height="56" alt="Gennetex"/></div>
  <h1>${esc(data.company)}</h1>
  <p style="text-align:center;margin:0 0 16px;font-size:14px">${esc(data.title)}</p>
  ${g.photoDataUrl ? `<img class="photo" src="${g.photoDataUrl}" alt="Зураг"/>` : ''}

  <h2>1. ЕРӨНХИЙ МЭДЭЭЛЭЛ</h2>
  <table>
    ${row('Ургийн овог', g.clanName)}
    ${row('Эцэг (эх)-ийн нэр', g.fatherName)}
    ${row('Өөрийн нэр', g.firstName)}
    ${row('Төрсөн огноо', `${g.birthYear} он ${g.birthMonth} сар ${g.birthDay} өдөр`)}
    ${row('Төрсөн газар', `${g.birthProvince}, ${g.birthDistrict}`)}
    ${row('Яс үндэс', g.ethnicity)}
    ${row('Хүйс', g.gender)}
    ${row('Регистрийн дугаар', g.registrationNo)}
    ${row('И-мэйл', g.email)}
    ${row('НД төлдөг эсэх', g.paysSocialInsurance)}
    ${row('Утас (гар)', g.phoneMobile)}
    ${row('Утас (гэр)', g.phoneHome)}
    ${row('Жолооны үнэмлэх', `${g.driverLicenseNo} / ${g.driverLicenseClass}`)}
    ${row('Цусны бүлэг', g.bloodType)}
    ${row('Оршин суугаа хаяг', g.address)}
    ${row('Оршин суух төрөл', g.housingType)}
    ${row('Биеийн хэмжээ / хувцас / гутал', `${g.bodySize} / ${g.clothingSize} / ${g.shoeSize}`)}
    ${row('Юнивишн гэрээ', g.univisionContractNo)}
  </table>

  <h2>2. ГЭР БҮЛИЙН БАЙДАЛ</h2>
  <p>Гэрлэсэн эсэх: <b>${esc(data.family.married || '—')}</b></p>
  <table><thead><tr><th>Овог нэр</th><th>Харилцаа</th><th>Төрсөн он</th><th>Ажил/сургууль</th><th>Утас</th></tr></thead><tbody>
  ${fam.map((m) => `<tr><td>${esc(m.fullName)}</td><td>${esc(m.relation)}</td><td>${esc(m.birthYear)}</td><td>${esc(m.workOrSchool)}</td><td>${esc(m.phone)}</td></tr>`).join('') || '<tr><td colspan=5>—</td></tr>'}
  </tbody></table>

  <h2>3. БОЛОВСРОЛЫН БАЙДАЛ</h2>
  <table><thead><tr><th>Хаана</th><th>Сургууль</th><th>Элссэн</th><th>Төгссөн</th><th>Мэргэжил</th><th>Зэрэг</th><th>Голч</th></tr></thead><tbody>
  ${edu.map((e) => `<tr><td>${esc(e.location)}</td><td>${esc(e.schoolName)}</td><td>${esc(e.enteredYear)}</td><td>${esc(e.graduatedYear)}</td><td>${esc(e.profession)}</td><td>${esc(e.degree)}</td><td>${esc(e.gpa)}</td></tr>`).join('') || '<tr><td colspan=7>—</td></tr>'}
  </tbody></table>

  <h2>4. АЖЛЫН ДАДЛАГА ТУРШЛАГА</h2>
  <table><thead><tr><th>Байгууллага</th><th>Үүрэг</th><th>Албан тушаал</th><th>Орсон</th><th>Гарсан</th><th>Цалин</th><th>Шалтгаан</th></tr></thead><tbody>
  ${work.map((w) => `<tr><td>${esc(w.companyName)}</td><td>${esc(w.duties)}</td><td>${esc(w.position)}</td><td>${esc(w.startDate)}</td><td>${esc(w.endDate)}</td><td>${esc(w.salary)}</td><td>${esc(w.leaveReason)}</td></tr>`).join('') || '<tr><td colspan=7>—</td></tr>'}
  </tbody></table>

  <h2>5. ГАДААД ХЭЛНИЙ МЭДЛЭГ</h2>
  <table><thead><tr><th>Хэл</th><th>Яриж ойлгох</th><th>Ярих</th><th>Унших</th><th>Бичих</th></tr></thead><tbody>
  ${langs.map((l) => `<tr><td>${esc(l.language)}</td><td>${esc(l.listening)}</td><td>${esc(l.speaking)}</td><td>${esc(l.reading)}</td><td>${esc(l.writing)}</td></tr>`).join('') || '<tr><td colspan=5>—</td></tr>'}
  </tbody></table>

  <h2>6. ХУВИЙН ОНЦЛОГ</h2>
  <p><b>Давуу тал:</b> ${esc(data.personal.strengths)}</p>
  <p><b>Сул тал:</b> ${esc(data.personal.weaknesses)}</p>

  <h2>7. АЖИЛД ОРОХ ХҮСЭЛ</h2>
  <p><b>Сонирхож буй албан тушаал:</b> ${esc(data.jobInterest.position)}</p>
  <p><b>Хүсэж буй цалин:</b> ${esc(data.jobInterest.desiredSalary)}</p>

  <h2>8. ЯАРАЛТАЙ ХОЛБОО БАРИХ</h2>
  <table><thead><tr><th>Нэр</th><th>Харилцаа</th><th>Утас</th></tr></thead><tbody>
  ${emerg.map((e) => `<tr><td>${esc(e.name)}</td><td>${esc(e.relation)}</td><td>${esc(e.phone)}</td></tr>`).join('') || '<tr><td colspan=3>—</td></tr>'}
  </tbody></table>

  <h2>9. ГАРЫН ҮСЭГ</h2>
  <div>${data.signatureSvg || '—'}</div>
  <p>Огноо: ${esc(data.signedAt ? new Date(data.signedAt).toLocaleString('mn-MN') : '—')}</p>
  </body></html>`;
}

export async function downloadApplicationPdf(data: JobApplicationFormData) {
  const html = buildApplicationPrintHtml(data);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((r) => setTimeout(r, 400));
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

export function printApplication(data: JobApplicationFormData) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(buildApplicationPrintHtml(data));
  w.document.close();
  w.focus();
  w.print();
}
