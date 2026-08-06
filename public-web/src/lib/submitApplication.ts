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

function friendlyError(error: any) {
  const msg = typeof error === 'string' ? error : error?.message || 'Илгээхэд алдаа гарлаа.';
  if (/form_data|signature_svg|signed_at|photo_url|schema cache/i.test(msg)) {
    return 'Серверийн тохиргоо дутуу байна. Үндсэн мэдээлэл хадгалагдах болно — дахин оролдоно уу.';
  }
  if (/permission|policy|unauthorized|403|401/i.test(msg)) {
    return 'Зөвшөөрөлгүй хүсэлт. Дахин оролдоно уу.';
  }
  if (/не найден|not found|404/i.test(msg)) {
    return 'Серверийн байршил олдсонгүй. Админд хэлнэ үү.';
  }
  return msg;
}

function dataUrlToBase64(dataUrl: string): string | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return m[2];
}

export async function submitJobApplication(data: JobApplicationFormData) {
  const g = data.general;
  const name = g.firstName.trim();
  if (!name) throw new Error('Өөрийн нэрээ оруулна уу.');

  const sanitized = sanitizeFormData(data);
  const signedAt = data.signedAt || new Date().toISOString();
  let photoBase64: string | null = null;
  if (g.photoDataUrl?.startsWith('data:')) {
    photoBase64 = dataUrlToBase64(g.photoDataUrl);
  }

  const payload = {
    form: sanitized,
    signatureSvg: data.signatureSvg?.trim() || null,
    signedAt: signedAt,
    photoAttached: Boolean(photoBase64),
    photoBase64: photoBase64,
  };

  const response = await fetch('/api/public-site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(friendlyError(errorData.error || response.statusText));
  }

  const result = await response.json();
  if (!result.ok) throw new Error(friendlyError(result.error || 'Илгээхэд алдаа гарлаа'));
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
