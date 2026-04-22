-- Fixed recurring income and expense items
CREATE TABLE IF NOT EXISTS fixed_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  frequency   TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'fortnight')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fixed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_items_user_policy"
  ON fixed_items FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
