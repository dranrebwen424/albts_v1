-- Password reset codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL CHECK (type IN ('invitation', 'reset')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Only the service_role admin client accesses this table, so default-deny is sufficient
-- No public policies needed — all access is via server actions using the admin client

-- Add password_changed column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;
