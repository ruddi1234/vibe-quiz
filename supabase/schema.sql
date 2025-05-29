-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade,
  name text not null,
  email text not null,
  score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Create matches table
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users not null,
  matched_user_id uuid references public.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'pending'::text not null,
  constraint unique_match unique (user_id, matched_user_id)
);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.matches enable row level security;

-- Create policies for users table
create policy "Users can view their own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

create policy "Enable insert for authenticated users only" on public.users
  for insert with check (auth.role() = 'authenticated');

-- Create policies for matches table
create policy "Users can view their matches" on public.matches
  for select using (auth.uid() = user_id or auth.uid() = matched_user_id);

create policy "Users can create matches" on public.matches
  for insert with check (auth.uid() = user_id);

create policy "Users can update their matches" on public.matches
  for update using (auth.uid() = user_id or auth.uid() = matched_user_id); 