-- Nova Tutoring v1.3
-- Conservative Nova AI launch allowances.

begin;

update public.ai_plans
set
  monthly_question_limit = case id
    when 'free' then 5
    when 'basic' then 25
    when 'plus' then 75
    when 'pro' then 200
    when 'ultimate' then 500
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
