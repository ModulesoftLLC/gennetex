import { supabase } from './supabase';
import type { JobApplicationFormData } from '../types/jobApplication';

export async function submitJobApplication(data: JobApplicationFormData) {
  const g = data.general;
  const row = {
    name: g.firstName.trim(),
    last_name: g.clanName.trim() || null,
    phone: g.phoneMobile.trim() || null,
    email: g.email.trim() || null,
    position: data.jobInterest.position.trim() || null,
    message: [
      g.fatherName && `Эцэг/эх: ${g.fatherName}`,
      data.personal.strengths && `Давуу: ${data.personal.strengths.slice(0, 80)}`,
    ]
      .filter(Boolean)
      .join(' · ') || null,
    source: 'web',
    status: 'new',
    form_data: data,
    signature_svg: data.signatureSvg || null,
    signed_at: data.signedAt || new Date().toISOString(),
    photo_url: g.photoDataUrl?.startsWith('http') ? g.photoDataUrl : null,
  };

  const { data: inserted, error } = await supabase.from('job_applications').insert(row).select('id').single();
  if (error) throw error;
  return inserted;
}
