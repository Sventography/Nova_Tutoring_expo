alter table public.profiles
drop constraint if exists profiles_ask_memory_tier_check;

alter table public.profiles
add constraint profiles_ask_memory_tier_check
check (
  ask_memory_tier in (
    'free',
    'tier1',
    'tier2',
    'tier3',
    'tier4'
  )
);
