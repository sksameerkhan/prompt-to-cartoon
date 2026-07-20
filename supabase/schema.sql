-- Run this once in your Supabase project's SQL Editor (Supabase dashboard -> SQL Editor -> New query)

-- Tracks how many credits each user has
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  email text,
  credits integer not null default 3,   -- new users get 3 free tries
  created_at timestamptz default now()
);

-- Every generated cartoon, so users see their history
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text,
  prompt text not null,
  scenes jsonb not null,
  created_at timestamptz default now()
);

-- Automatically create a profile row (with 3 free credits) when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security: users can only see/edit their own data
alter table public.profiles enable row level security;
alter table public.generations enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can view their own generations"
  on public.generations for select using (auth.uid() = user_id);

create policy "Users can insert their own generations"
  on public.generations for insert with check (auth.uid() = user_id);
