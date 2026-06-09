-- Allow officers to update their own pending no-receipt forms (for resubmission)
-- This is needed because the existing forms_update_adviser policy only allows adviser/admin to update
CREATE POLICY "forms_update_officer_own" ON no_receipt_forms FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
  AND submitted_by = auth.uid()
)
WITH CHECK (
  (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'officer'
  AND submitted_by = auth.uid()
);
