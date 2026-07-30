import type { JobApplicationFormData } from '../types/jobApplication';

const FORM_MARKER = '[[GENNETEX_FORM]]';

/** Илгээх JSON — base64 зураг хэт том болохоос сэргийлнэ */
export function sanitizeFormData(data: JobApplicationFormData) {
  const hasPhoto = Boolean(data.general.photoDataUrl?.startsWith('data:'));
  return {
    ...data,
    general: {
      ...data.general,
      photoDataUrl: '',
      photoAttached: hasPhoto,
    },
  };
}

function buildMessage(data: JobApplicationFormData, sanitized: ReturnType<typeof sanitizeFormData>) {
  const g = data.general;
  const summary = [
    g.fatherName && `Эцэг/эх: ${g.fatherName}`,
    g.clanName && `Ургийн овог: ${g.clanName}`,
    data.personal.strengths && `Давуу: ${data.personal.strengths.slice(0, 120)}`,
    data.jobInterest.position && `Сонирхол: ${data.jobInterest.position}`,
  ]
    .filter(Boolean)
    .join(' · ');

  try {
    const json = JSON.stringify(sanitized);
    if (json.length < 45000) {
      return (summary ? `${summary}\n` : '') + `${FORM_MARKER}${json}`;
    }
  } catch {
    /* ignore */
  }
  return summary || null;
}

export async function submitJobApplication(data: JobApplicationFormData) {
  const g = data.general;
  const name = g.firstName.trim();
  if (!name) throw new Error('Өөрийн нэрээ оруулна уу.');

  const sanitized = sanitizeFormData(data);
  const signedAt = data.signedAt || new Date().toISOString();
  const response = await fetch('/api/public-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      form: sanitized,
      message: buildMessage(data, sanitized),
      signatureSvg: data.signatureSvg?.trim() || null,
      signedAt,
      photoAttached: Boolean(g.photoDataUrl?.startsWith('data:')),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
}

/** Админ / харах талд — form_data эсвэл message доторх JSON */
export function parseStoredForm(row: {
  form_data?: JobApplicationFormData | null;
  message?: string | null;
}): JobApplicationFormData | null {
  const fd = row.form_data;
  if (fd && typeof fd === 'object' && fd.general) return fd as JobApplicationFormData;

  const msg = row.message || '';
  const idx = msg.indexOf(FORM_MARKER);
  if (idx < 0) return null;
  try {
    const parsed = JSON.parse(msg.slice(idx + FORM_MARKER.length)) as JobApplicationFormData;
    if (parsed?.general) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
