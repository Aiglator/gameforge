import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const hasSmtp = Boolean(process.env.SMTP_HOST)

let transporter;

if (hasSmtp) {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
  };
  
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  transporter = nodemailer.createTransport(config);
} else if (!resend) {
  nodemailer.createTestAccount((err, account) => {
    if (err) {
      console.error('[Mail] Failed to create a testing account. ' + err.message);
      return;
    }
    console.log('[Mail] Ethereal test account created.');
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function baseTemplate(content) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f1623;color:#e2e8f0;padding:32px;border:1px solid #1e2d45">
      ${content}
      <hr style="border:none;border-top:1px solid #1e2d45;margin:24px 0">
      <p style="color:#64748b;font-size:11px;margin:0">GameForge - Marketplace communautaire</p>
    </div>
  `
}

export async function sendConfirmationEmail(to, nom, token) {
  const confirmUrl = `${process.env.APP_URL || 'http://localhost:3002'}/confirm-email?token=${encodeURIComponent(token)}`
  const safeName = escapeHtml(nom)
  const safeUrl = escapeHtml(confirmUrl)
  const from = process.env.MAIL_FROM || 'GameForge <no-reply@mail.slymfox.com>'
  const subject = 'Confirme ton compte GameForge'
  const html = baseTemplate(`
    <h1 style="color:#4edea3;font-size:24px;margin:0 0 8px">Bienvenue, ${safeName}</h1>
    <p style="color:#94a3b8;margin:0 0 24px">Merci de t'etre inscrit sur GameForge. Confirme ton adresse email pour activer ton compte.</p>
    <a href="${safeUrl}" style="display:inline-block;background:#4edea3;color:#060c18;padding:12px 28px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.05em;text-transform:uppercase">
      Confirmer mon compte
    </a>
    <p style="color:#64748b;font-size:12px;margin:24px 0 0">Ce lien expire dans 24h. Si tu n'as pas cree de compte, ignore cet email.</p>
  `)

  if (resend) {
    try {
      console.log(`[Mail] Attempting Resend from: ${from}, to: ${to}, subject: ${subject}`)
      const { data, error } = await resend.emails.send({ from, to, subject, html })
      if (error) throw error
      console.log(`[Mail] Confirmation email sent to ${to} via Resend`, data)
      return data
    } catch (err) {
      console.error('[Mail] Resend failed:', err)
      // Fallback to SMTP/Ethereal if configured
    }
  }

  if (!transporter) {
    console.log('[Mail] Transporter not ready yet, unable to send email.');
    return;
  }

  const info = await transporter.sendMail({ from, to, subject, html })

  if (!hasSmtp) {
    console.log('[Mail] Confirmation email sent using Ethereal')
    console.log('[Mail] Preview URL:', nodemailer.getTestMessageUrl(info))
  } else {
    console.log(`[Mail] Confirmation email sent to ${to} via SMTP (${process.env.SMTP_HOST})`)
  }
  return info
}

export async function sendWelcomeEmail(to, nom) {
  const appUrl = process.env.APP_URL || 'http://localhost:3002'
  const safeName = escapeHtml(nom)
  const safeUrl = escapeHtml(appUrl)
  const from = process.env.MAIL_FROM || 'GameForge <no-reply@mail.slymfox.com>'
  const subject = 'Ton compte GameForge est actif'
  const html = baseTemplate(`
    <h1 style="color:#4edea3;font-size:24px;margin:0 0 8px">Compte active, ${safeName}</h1>
    <p style="color:#94a3b8;margin:0 0 16px">Ton adresse email a ete confirmee. Tu peux maintenant jouer, creer et publier avec Nexus Engine.</p>
    <a href="${safeUrl}" style="display:inline-block;background:#4edea3;color:#060c18;padding:12px 28px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.05em;text-transform:uppercase">
      Acceder a la plateforme
    </a>
  `)

  if (resend) {
    try {
      console.log(`[Mail] Attempting Resend from: ${from}, to: ${to}, subject: ${subject}`)
      const { data, error } = await resend.emails.send({ from, to, subject, html })
      if (error) throw error
      console.log(`[Mail] Welcome email sent to ${to} via Resend`, data)
      return data
    } catch (err) {
      console.error('[Mail] Resend failed:', err)
      // Fallback
    }
  }

  if (!transporter) {
    console.log('[Mail] Transporter not ready yet, unable to send email.');
    return;
  }

  const info = await transporter.sendMail({ from, to, subject, html })

  if (!hasSmtp) {
    console.log('[Mail] Welcome email sent using Ethereal')
    console.log('[Mail] Preview URL:', nodemailer.getTestMessageUrl(info))
  } else {
    console.log(`[Mail] Welcome email sent to ${to} via SMTP (${process.env.SMTP_HOST})`)
  }
  return info
}
