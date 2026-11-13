begin;

update public.ai_plans
set
  monthly_question_limit = case id
    when 'free' then 10
    when 'basic' then 50
    when 'plus' then 150
    when 'pro' then 350
    when 'ultimate' then 750
    else monthly_question_limit
  end,
  updated_at = now()
where id in (
  'free',
  'basic',
  'plus',
  'pro',
  'ultimate'
);

commit;
