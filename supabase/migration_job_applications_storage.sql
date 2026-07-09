-- Ажлын байрны анкетын цээж зураг — Storage bucket

insert into storage.buckets (id, name, public)
values ('job-applications', 'job-applications', true)
on conflict (id) do nothing;

create policy "job_applications_storage_select"
  on storage.objects for select
  using (bucket_id = 'job-applications');

create policy "job_applications_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'job-applications');

notify pgrst, 'reload schema';
