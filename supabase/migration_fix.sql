-- Drop all existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "departments_select_all" ON departments;
DROP POLICY IF EXISTS "departments_insert_admin" ON departments;
DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert_admin" ON events;
DROP POLICY IF EXISTS "events_update_officer" ON events;
DROP POLICY IF EXISTS "receipts_select" ON receipts;
DROP POLICY IF EXISTS "receipts_insert_officer" ON receipts;
DROP POLICY IF EXISTS "receipts_update_adviser" ON receipts;
DROP POLICY IF EXISTS "forms_select" ON no_receipt_forms;
DROP POLICY IF EXISTS "forms_insert_officer" ON no_receipt_forms;
DROP POLICY IF EXISTS "forms_update_adviser" ON no_receipt_forms;
DROP POLICY IF EXISTS "reports_select" ON financial_reports;
DROP POLICY IF EXISTS "reports_insert_officer" ON financial_reports;
DROP POLICY IF EXISTS "reports_update_adviser" ON financial_reports;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON audit_logs;
DROP POLICY IF EXISTS "receipts_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_storage_insert" ON storage.objects;

-- Recreate all policies
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

CREATE POLICY "departments_select_all" ON departments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "departments_insert_admin" ON departments FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

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

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "audit_logs_insert_admin" ON audit_logs FOR INSERT WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "receipts_storage_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts'
);

CREATE POLICY "receipts_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
);
