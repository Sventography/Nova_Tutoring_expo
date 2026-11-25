-- Wallet authority preflight (read-only; run against isolated staging first).
-- No customer rows, keys, answers, or balances are returned.
-- A PASS here is necessary, not sufficient: review RPC bodies, trusted event
-- verification, RLS, account deletion, and concurrent/replay behavior separately.
-- Guest coins remain device-local and must not seed a registered wallet.
-- A failed gate blocks enabling First Twenty / production release.
WITH sensitive_columns(column_name) AS (
  VALUES ('coins'), ('purchases'), ('ask_memory_tier'), ('ask_memory_limit'),
         ('island_xp'), ('island_level'), ('companion_shield_charges'),
         ('companion_hint_tokens')
), checks AS (
  SELECT 'profile.' || column_name || '.client_insert_denied' AS gate,
         NOT has_column_privilege('authenticated','public.profiles',column_name,'INSERT') AS passed
  FROM sensitive_columns
  UNION ALL
  SELECT 'profile.' || column_name || '.client_update_denied',
         NOT has_column_privilege('authenticated','public.profiles',column_name,'UPDATE')
  FROM sensitive_columns
  UNION ALL SELECT 'archive.verify.client_execute_denied',
    NOT has_function_privilege('authenticated','public.nova_verify_archive(uuid,uuid,text)','EXECUTE')
  UNION ALL SELECT 'archive.complete.client_execute_denied',
    NOT has_function_privilege('authenticated','public.nova_complete_archive(uuid)','EXECUTE')
  UNION ALL SELECT 'archive.complete.anon_execute_denied',
    NOT has_function_privilege('anon','public.nova_complete_archive(uuid)','EXECUTE')
  UNION ALL SELECT 'archive.verify.anon_execute_denied',
    NOT has_function_privilege('anon','public.nova_verify_archive(uuid,uuid,text)','EXECUTE')
  UNION ALL SELECT 'archive.complete.service_execute_allowed',
    has_function_privilege('service_role','public.nova_complete_archive(uuid)','EXECUTE')
  UNION ALL SELECT 'archive.receipt.owner_columns_readable',
    has_column_privilege('authenticated','public.nova_archive_completions','user_id','SELECT')
    AND has_column_privilege('authenticated','public.nova_archive_completions','finish_number','SELECT')
    AND has_column_privilege('authenticated','public.nova_archive_completions','completed_at','SELECT')
  UNION ALL SELECT 'archive.receipt.client_mutation_denied',
    NOT (has_table_privilege('authenticated','public.nova_archive_completions','INSERT')
      OR has_table_privilege('authenticated','public.nova_archive_completions','UPDATE')
      OR has_table_privilege('authenticated','public.nova_archive_completions','DELETE'))
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name='nova_archive_completions'
      AND (has_column_privilege('authenticated','public.nova_archive_completions',c.column_name,'INSERT')
        OR has_column_privilege('authenticated','public.nova_archive_completions',c.column_name,'UPDATE'))
    )
  UNION ALL SELECT 'profile.rls_enabled',
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass)
  UNION ALL SELECT 'archive.verification.rls_enabled',
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.nova_archive_verification'::regclass)
  UNION ALL SELECT 'archive.receipt.rls_enabled',
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.nova_archive_completions'::regclass)
  UNION ALL SELECT 'staging.transactions_table_present', to_regclass('public.transactions') IS NOT NULL
  UNION ALL SELECT 'staging.purchases_table_present', to_regclass('public.purchases') IS NOT NULL
  UNION ALL SELECT 'staging.quiz_reward_rpc_present', EXISTS (
    SELECT 1 FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace
    WHERE n.nspname='public' AND f.proname='nova_claim_quiz_reward'
  )
)
SELECT gate, CASE WHEN passed IS TRUE THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks ORDER BY gate;
