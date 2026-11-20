import nodemailer from 'nodemailer'
import path from 'path'
import fs from 'fs'

export interface EmailAttachment {
  filename: string
  content?: string | Buffer
  path?: string
  cid?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  attachments?: EmailAttachment[]
  replyTo?: string
}

export async function sendEmail({ to, subject, html, attachments = [], replyTo }: SendEmailOptions) {
  const recipients = Array.isArray(to) ? to : [to]
  const resendApiKey = process.env.RESEND_API_KEY

  // 1. Priorité 1 : RESEND.COM (API directe ultra-rapide et fiable)
  if (resendApiKey && resendApiKey.trim().length > 5) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'THE DISNASTY CIRCLE <onboarding@resend.dev>'
      const replyToEmail = replyTo || process.env.STAFF_ALERT_EMAIL || 'landrytouotap@gmail.com'

      // Préparation des pièces jointes au format Resend
      const formattedAttachments: any[] = []
      for (const att of attachments) {
        if (att.content) {
          const base64 = Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64')
          formattedAttachments.push({
            filename: att.filename,
            content: base64,
          })
        } else if (att.path && fs.existsSync(att.path)) {
          const fileBuf = fs.readFileSync(att.path)
          formattedAttachments.push({
            filename: att.filename,
            content: fileBuf.toString('base64'),
          })
        }
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject: subject,
          html: html,
          reply_to: replyToEmail,
          attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        return { success: true, provider: 'resend', id: data.id }
      } else {
        console.warn('Resend API returned error, falling back to SMTP:', data)
      }
    } catch (resendErr) {
      console.warn('Resend call failed, trying fallback:', resendErr)
    }
  }

  // 2. Priorité 2 : SMTP / Gmail
  const user = process.env.SMTP_USER || process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD

  if (user && pass && !pass.includes('placeholder') && !pass.includes('votre-mot-de-passe')) {
    try {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com'
      const port = parseInt(process.env.SMTP_PORT || '465', 10)
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })

      const info = await transporter.sendMail({
        from: `"THE DISNASTY CIRCLE" <${user}>`,
        to: recipients.join(', '),
        subject,
        html,
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: a.content,
          path: a.path,
          cid: a.cid,
        })),
        replyTo: replyTo || user,
      })

      return { success: true, provider: 'smtp', messageId: info.messageId }
    } catch (smtpErr) {
      console.error('SMTP send error:', smtpErr)
    }
  }

  // 3. Mode Simulation (Développement ou clés non encore saisies)
  return {
    success: true,
    provider: 'simulation',
    isMock: true,
    recipients,
  }
}
