
-- Realtime already enabled, just ensure it's there (idempotent check)
DO $$
BEGIN
  -- No-op since chat_messages is already in supabase_realtime
  NULL;
END;
$$;
