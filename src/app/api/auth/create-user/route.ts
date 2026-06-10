import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/client';
import { generateInvitationToken } from '@/lib/actions';

export async function POST(request: Request) {
  try {
    const { first_name, middle_name, last_name, email, department_id, role } = await request.json();

    const supabase = createAdminClient();

    // Create auth user with metadata so the trigger creates the correct profile
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Mabini2026',
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        department_id: department_id || null,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update the auto-created profile with correct data (trigger uses metadata now)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name,
        middle_name: middle_name || null,
        last_name,
        department_id: department_id || null,
        role,
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Generate invitation token
    let setPasswordLink = `${process.env.NEXT_PUBLIC_APP_URL}/change-password`;
    try {
      const token = await generateInvitationToken(email);
      setPasswordLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${token}`;
    } catch (tokenError: any) {
      console.error('Failed to generate invitation token:', tokenError);
    }

    // Send welcome email
    let emailSent = false;
    try {
      await sendEmail(process.env.EMAILJS_TEMPLATE_ID!, email, {
        to_email: email,
        first_name,
        last_name,
        default_password: 'Mabini2026',
        set_password_link: setPasswordLink,
        change_password_link: setPasswordLink,
      });
      emailSent = true;
    } catch (emailError: any) {
      console.error('Failed to send welcome email:', emailError);
    }

    return NextResponse.json({ success: true, userId: authData.user.id, emailSent });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
