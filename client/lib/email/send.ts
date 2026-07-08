import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// En desarrollo o sin RESEND_API_KEY, los emails se loguean pero no se envían.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('[email] Resend no configurado — email no enviado a', to)
    return
  }
  try {
    const { error } = await resend.emails.send({
      from: `BRÄVE Studio <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
    }
  } catch (e) {
    console.error('[email] Send failed:', e)
  }
}