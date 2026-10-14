import nodemailer, { createTransport } from 'nodemailer'

// ---------------------------------------------------------------------------
// Email service
// ---------------------------------------------------------------------------
// Configures a single Nodemailer transporter (via Brevo/SMTP) used to send
// transactional emails such as account verification OTPs. Credentials come from
// environment variables; the transporter is shared across the auth service.
// ---------------------------------------------------------------------------

// Reusable SMTP transporter. `secure: false` on port 587 uses STARTTLS.
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export { transporter };