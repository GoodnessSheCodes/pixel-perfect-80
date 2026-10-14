
create type public.app_role as enum ('patient','doctor','admin');
create type public.verification_status as enum ('pending','verified','rejected');
create type public.grant_status as enum ('pending','approved','denied','revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  email text,
  phone text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.patients (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  patient_code text not null unique,
  share_code text not null default lpad((floor(random()*1000000))::int::text, 6, '0'),
  date_of_birth date,
  sex text,
  blood_type text,
  allergies text[] not null default '{}',
  conditions text[] not null default '{}',
  emergency_contact text,
  created_at timestamptz not null default now()
);
grant select, update on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;

create table public.doctor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hpcsa_number text,
  specialty text,
  practice_name text,
  verification_status verification_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.doctor_profiles to authenticated;
grant all on public.doctor_profiles to service_role;
alter table public.doctor_profiles enable row level security;

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(user_id) on delete cascade,
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  status grant_status not null default 'pending',
  method text not null default 'in_app',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz
);
grant select on public.access_grants to authenticated;
grant all on public.access_grants to service_role;
alter table public.access_grants enable row level security;

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(user_id) on delete cascade,
  doctor_id uuid not null references public.profiles(id),
  consultation_date date not null default current_date,
  reason text not null,
  findings text,
  diagnosis text not null,
  treatment_plan text,
  follow_up_instructions text,
  follow_up_date date,
  created_at timestamptz not null default now()
);
grant select on public.consultations to authenticated;
grant all on public.consultations to service_role;
alter table public.consultations enable row level security;

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  prescription_number text not null unique default ('RX-' || upper(substr(md5(random()::text),1,8))),
  patient_id uuid not null references public.patients(user_id) on delete cascade,
  doctor_id uuid not null references public.profiles(id),
  consultation_id uuid references public.consultations(id),
  notes text,
  issued_at timestamptz not null default now(),
  viewed_at timestamptz
);
grant select on public.prescriptions to authenticated;
grant all on public.prescriptions to service_role;
alter table public.prescriptions enable row level security;

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_name text not null,
  dosage text not null,
  frequency text not null,
  duration text not null,
  instructions text
);
grant select on public.prescription_items to authenticated;
grant all on public.prescription_items to service_role;
alter table public.prescription_items enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_patient_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- helpers
create or replace function public.is_verified_doctor(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_uid,'doctor') and exists (select 1 from public.doctor_profiles where user_id=_uid and verification_status='verified')
$$;

create or replace function public.has_access(_doctor uuid, _patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.access_grants where doctor_id=_doctor and patient_id=_patient
    and status='approved' and (expires_at is null or expires_at > now()))
$$;

create or replace function public.log_event(_action text, _target uuid, _details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs(actor_id, action, target_patient_id, details) values (auth.uid(), _action, _target, coalesce(_details,'{}'));
$$;

-- policies
create policy "profiles self" on public.profiles for select to authenticated using (
  id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(id,'doctor') or public.has_access(auth.uid(), id));
create policy "profiles update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "roles self" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "patients read" on public.patients for select to authenticated using (
  user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_access(auth.uid(), user_id));
create policy "patients update self" on public.patients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "doctors read" on public.doctor_profiles for select to authenticated using (true);
create policy "doctors update self" on public.doctor_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "grants read" on public.access_grants for select to authenticated using (
  patient_id = auth.uid() or doctor_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "consult read" on public.consultations for select to authenticated using (
  patient_id = auth.uid() or public.has_access(auth.uid(), patient_id) or public.has_role(auth.uid(),'admin'));
create policy "rx read" on public.prescriptions for select to authenticated using (
  patient_id = auth.uid() or doctor_id = auth.uid() or public.has_access(auth.uid(), patient_id) or public.has_role(auth.uid(),'admin'));
create policy "rx items read" on public.prescription_items for select to authenticated using (
  exists (select 1 from public.prescriptions p where p.id = prescription_id and
    (p.patient_id = auth.uid() or p.doctor_id = auth.uid() or public.has_access(auth.uid(), p.patient_id) or public.has_role(auth.uid(),'admin'))));
create policy "notif read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "audit read" on public.audit_logs for select to authenticated using (
  public.has_role(auth.uid(),'admin') or target_patient_id = auth.uid() or actor_id = auth.uid());

-- protect columns patients/doctors must not change themselves
create or replace function public.guard_patient_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.user_id and not public.has_role(auth.uid(),'admin') then
    new.patient_code := old.patient_code;
    new.allergies := old.allergies;
    new.conditions := old.conditions;
    new.date_of_birth := old.date_of_birth;
  end if;
  return new;
end $$;
create trigger trg_guard_patient before update on public.patients for each row execute function public.guard_patient_update();

create or replace function public.guard_doctor_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'),'admin') and auth.uid() is not null then
    new.verification_status := old.verification_status;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end $$;
create trigger trg_guard_doctor before update on public.doctor_profiles for each row execute function public.guard_doctor_update();

create or replace function public.guard_profile_update() returns trigger language plpgsql as $$
begin new.is_demo := old.is_demo; new.email := old.email; return new; end $$;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile_update();

-- signup
create or replace function public.gen_patient_code() returns text language plpgsql as $$
declare c text;
begin
  loop
    c := 'MV-' || upper(substr(md5(random()::text),1,4)) || '-' || upper(substr(md5(random()::text),1,4));
    exit when not exists (select 1 from public.patients where patient_code = c);
  end loop;
  return c;
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','patient');
begin
  if r not in ('patient','doctor') then r := 'patient'; end if;
  insert into public.profiles(id, full_name, username, email, is_demo)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), nullif(lower(new.raw_user_meta_data->>'username'),''), new.email,
          coalesce((new.raw_user_meta_data->>'is_demo')::boolean,false));
  insert into public.user_roles(user_id, role) values (new.id, r::app_role);
  if r = 'patient' then
    insert into public.patients(user_id, patient_code, date_of_birth)
    values (new.id, public.gen_patient_code(), nullif(new.raw_user_meta_data->>'date_of_birth','')::date);
  else
    insert into public.doctor_profiles(user_id, hpcsa_number, specialty, practice_name)
    values (new.id, new.raw_user_meta_data->>'hpcsa_number', new.raw_user_meta_data->>'specialty', new.raw_user_meta_data->>'practice_name');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- workflow RPCs
create or replace function public.search_patient(_q text)
returns table(patient_id uuid, patient_code text, display_name text, birth_year int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'doctor') then raise exception 'Only doctor accounts can search patients'; end if;
  perform public.log_event('patient_search', null, jsonb_build_object('query', left(_q,40)));
  return query
    select p.user_id, p.patient_code,
      split_part(pr.full_name,' ',1) || ' ' || left(coalesce(nullif(split_part(pr.full_name,' ',2),''),' '),1) || '.',
      extract(year from p.date_of_birth)::int
    from public.patients p join public.profiles pr on pr.id = p.user_id
    where upper(p.patient_code) = upper(trim(_q)) or pr.username = lower(trim(_q))
    limit 1;
end $$;

create or replace function public.request_access(_patient uuid, _dob date, _share_code text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p record; dname text;
begin
  if not public.has_role(auth.uid(),'doctor') then raise exception 'Only doctor accounts can request access'; end if;
  select * into p from public.patients where user_id = _patient;
  if p is null then raise exception 'Patient not found'; end if;
  if p.date_of_birth is null or p.date_of_birth <> _dob then
    perform public.log_event('identity_verification_failed', _patient, '{}');
    raise exception 'Identity verification failed: date of birth does not match';
  end if;
  if public.has_access(auth.uid(), _patient) then return 'approved'; end if;
  select full_name into dname from public.profiles where id = auth.uid();
  if _share_code is not null and length(trim(_share_code)) > 0 then
    if trim(_share_code) <> p.share_code then
      perform public.log_event('share_code_failed', _patient, '{}');
      raise exception 'Access code is incorrect';
    end if;
    insert into public.access_grants(patient_id, doctor_id, status, method, responded_at, expires_at)
    values (_patient, auth.uid(), 'approved', 'share_code', now(), now() + interval '30 days');
    update public.patients set share_code = lpad((floor(random()*1000000))::int::text,6,'0') where user_id = _patient;
    insert into public.notifications(user_id, title, body, link)
    values (_patient, 'Record access granted', coalesce(dname,'A doctor') || ' accessed your records using your one-time access code.', '/patient/privacy');
    perform public.log_event('access_granted_share_code', _patient, '{}');
    return 'approved';
  end if;
  delete from public.access_grants where patient_id=_patient and doctor_id=auth.uid() and status='pending';
  insert into public.access_grants(patient_id, doctor_id) values (_patient, auth.uid());
  insert into public.notifications(user_id, title, body, link)
  values (_patient, 'Access request', coalesce(dname,'A doctor') || ' is requesting access to your medical records.', '/patient/privacy');
  perform public.log_event('access_requested', _patient, '{}');
  return 'pending';
end $$;

create or replace function public.respond_access(_grant uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.access_grants where id = _grant;
  if g is null or g.patient_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if _approve then
    update public.access_grants set status='approved', responded_at=now(), expires_at=now()+interval '30 days' where id=_grant;
    perform public.log_event('access_approved', g.patient_id, jsonb_build_object('doctor_id', g.doctor_id));
  else
    update public.access_grants set status = case when g.status='approved' then 'revoked'::grant_status else 'denied'::grant_status end, responded_at=now() where id=_grant;
    perform public.log_event(case when g.status='approved' then 'access_revoked' else 'access_denied' end, g.patient_id, jsonb_build_object('doctor_id', g.doctor_id));
  end if;
  insert into public.notifications(user_id, title, body, link)
  values (g.doctor_id, case when _approve then 'Access approved' else 'Access ended' end,
    'A patient has ' || case when _approve then 'approved' else 'declined or revoked' end || ' your access request.', '/doctor');
end $$;

create or replace function public.create_consultation(_patient uuid, _date date, _reason text, _findings text, _diagnosis text, _plan text, _follow text, _follow_date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; dname text;
begin
  if not public.is_verified_doctor(auth.uid()) then raise exception 'Only verified doctors can create clinical records'; end if;
  if not public.has_access(auth.uid(), _patient) then raise exception 'You do not have authorised access to this patient'; end if;
  if coalesce(trim(_reason),'') = '' or coalesce(trim(_diagnosis),'') = '' then raise exception 'Reason and diagnosis are required'; end if;
  insert into public.consultations(patient_id, doctor_id, consultation_date, reason, findings, diagnosis, treatment_plan, follow_up_instructions, follow_up_date)
  values (_patient, auth.uid(), coalesce(_date, current_date), _reason, _findings, _diagnosis, _plan, _follow, _follow_date) returning id into cid;
  select full_name into dname from public.profiles where id = auth.uid();
  insert into public.notifications(user_id, title, body, link)
  values (_patient, 'New consultation recorded', coalesce(dname,'Your doctor') || ' added a consultation: ' || _reason, '/patient/history/' || cid);
  perform public.log_event('consultation_created', _patient, jsonb_build_object('consultation_id', cid));
  return cid;
end $$;

create or replace function public.issue_prescription(_patient uuid, _consultation uuid, _notes text, _items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; it jsonb; dname text;
begin
  if not public.is_verified_doctor(auth.uid()) then raise exception 'Only verified doctors can issue prescriptions'; end if;
  if not public.has_access(auth.uid(), _patient) then raise exception 'You do not have authorised access to this patient'; end if;
  if _consultation is not null and not exists (select 1 from public.consultations where id=_consultation and patient_id=_patient) then
    raise exception 'Consultation does not belong to this patient'; end if;
  if jsonb_array_length(coalesce(_items,'[]')) = 0 then raise exception 'At least one medication is required'; end if;
  for it in select * from jsonb_array_elements(_items) loop
    if coalesce(trim(it->>'medication_name'),'')='' or coalesce(trim(it->>'dosage'),'')='' or coalesce(trim(it->>'frequency'),'')='' or coalesce(trim(it->>'duration'),'')='' then
      raise exception 'Each medication needs a name, dosage, frequency and duration'; end if;
  end loop;
  insert into public.prescriptions(patient_id, doctor_id, consultation_id, notes) values (_patient, auth.uid(), _consultation, _notes) returning id into rid;
  insert into public.prescription_items(prescription_id, medication_name, dosage, frequency, duration, instructions)
  select rid, x->>'medication_name', x->>'dosage', x->>'frequency', x->>'duration', x->>'instructions' from jsonb_array_elements(_items) x;
  select full_name into dname from public.profiles where id = auth.uid();
  insert into public.notifications(user_id, title, body, link)
  values (_patient, 'New prescription received', coalesce(dname,'Your doctor') || ' sent you a digital prescription.', '/patient/prescriptions/' || rid);
  perform public.log_event('prescription_issued', _patient, jsonb_build_object('prescription_id', rid));
  return rid;
end $$;

create or replace function public.mark_prescription_viewed(_rx uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.prescriptions set viewed_at = coalesce(viewed_at, now()) where id=_rx and patient_id=auth.uid();
end $$;

create or replace function public.log_record_view(_patient uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.has_access(auth.uid(), _patient) then perform public.log_event('record_viewed', _patient, '{}'); end if;
end $$;

create or replace function public.set_doctor_verification(_doctor uuid, _status verification_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  update public.doctor_profiles set verification_status=_status, reviewed_at=now() where user_id=_doctor;
  insert into public.notifications(user_id, title, body, link) values (_doctor, 'Verification ' || _status::text, 'Your professional account is now ' || _status::text || '.', '/doctor');
  perform public.log_event('doctor_' || _status::text, null, jsonb_build_object('doctor_id', _doctor));
end $$;

revoke execute on function public.log_event(text, uuid, jsonb) from public, anon, authenticated;
