export async function sendEmail(templateId: string, toEmail: string, templateParams: Record<string, string>) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: toEmail,
        ...templateParams,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EmailJS error: ${error}`);
  }

  return true;
}
