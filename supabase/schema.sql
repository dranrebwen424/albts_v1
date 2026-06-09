-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('officer', 'adviser', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  officer_id UUID NOT NULL REFERENCES profiles(user_id),
  adviser_id UUID NOT NULL REFERENCES profiles(user_id),
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(user_id),
  vendor TEXT NOT NULL DEFAULT '',
  si_or_number TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  items JSONB DEFAULT '[]',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  confidence INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  transaction_hash TEXT,
  block_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- No Receipt Forms
CREATE TABLE IF NOT EXISTS no_receipt_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(user_id),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('transport', 'food', 'supplies', 'labor', 'other')),
  expense_name TEXT NOT NULL,
  date_incurred TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  formula_breakdown TEXT NOT NULL DEFAULT '',
  transport_data JSONB,
  food_data JSONB,
  supplies_data JSONB DEFAULT '[]',
  labor_data JSONB,
  other_data JSONB,
  witnesses JSONB DEFAULT '[]',
  certification BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  resubmitted BOOLEAN DEFAULT false,
  transaction_hash TEXT,
  block_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES profiles(user_id),
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  approved_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(user_id),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_receipt_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read their own profile; admins can read all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (
  auth.uid() = user_id
);

-- Departments: all authenticated users can read; only admins can insert
CREATE POLICY "departments_select_all" ON departments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "departments_insert_admin" ON departments FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Events: department-scoped access
CREATE POLICY "events_select" ON events FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM profiles WHERE user_id = auth.uid()
  ) OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "events_insert_officer" ON events FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);

CREATE POLICY "events_update_officer" ON events FOR UPDATE USING (
  officer_id = auth.uid() OR
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Receipts: department-scoped
CREATE POLICY "receipts_select" ON receipts FOR SELECT USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.department_id IN (
      SELECT department_id FROM profiles WHERE user_id = auth.uid()
    )
  ) OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "receipts_insert_officer" ON receipts FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);

CREATE POLICY "receipts_update_adviser" ON receipts FOR UPDATE USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('adviser', 'admin')
);

-- No-receipt forms: department-scoped
CREATE POLICY "forms_select" ON no_receipt_forms FOR SELECT USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.department_id IN (
      SELECT department_id FROM profiles WHERE user_id = auth.uid()
    )
  ) OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "forms_insert_officer" ON no_receipt_forms FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);

CREATE POLICY "forms_update_adviser" ON no_receipt_forms FOR UPDATE USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('adviser', 'admin')
);

CREATE POLICY "forms_update_officer_own" ON no_receipt_forms FOR UPDATE USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
  AND submitted_by = auth.uid()
) WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
  AND submitted_by = auth.uid()
);

-- Financial reports: department-scoped
CREATE POLICY "reports_select" ON financial_reports FOR SELECT USING (
  event_id IN (
    SELECT e.id FROM events e
    WHERE e.department_id IN (
      SELECT department_id FROM profiles WHERE user_id = auth.uid()
    )
  ) OR (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "reports_insert_officer" ON financial_reports FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);

CREATE POLICY "reports_update_adviser" ON financial_reports FOR UPDATE USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('adviser', 'admin')
);

-- Notifications: users see their own
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Audit logs: admins only
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "audit_logs_insert_admin" ON audit_logs FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, department_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    (NEW.raw_user_meta_data->>'department_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'role', 'officer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger for no_receipt_forms
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_no_receipt_forms_updated_at
  BEFORE UPDATE ON no_receipt_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts_storage_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts'
);

CREATE POLICY "receipts_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);
