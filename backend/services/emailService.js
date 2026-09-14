const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Path to official project seal logo
const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');

function getLogoAttachments() {
  if (fs.existsSync(logoPath)) {
    return [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'project_logo',
      },
    ];
  }
  return [];
}

let cachedTransporter = null;

/**
 * Creates and returns a configured Nodemailer transporter.
 * Uses connection pooling to keep SMTP connections warm and ultra-fast.
 */
function createTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
    return cachedTransporter;
  }

  return null;
}

/**
 * Sends an official PWD ID Approval email to the recipient.
 */
async function sendPwdApprovalEmail({
  recipientEmail,
  recipientName,
  pwdIdNumber,
  referenceNumber,
  disabilityType,
  bloodType,
  approvedDate,
  contactNumber,
  address,
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const dateStr = approvedDate
    ? new Date(approvedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Gov Services - Official PWD ID Approval</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 24px; color: #1e293b; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
        .card { background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 14px; padding: 24px; margin: 20px 0; }
        .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 14px; margin-bottom: 16px; }
        .id-number-box { background: #eff6ff; border: 1.5px solid #2563eb; border-radius: 10px; padding: 12px 16px; margin: 12px 0; text-align: center; }
        .id-number-label { font-size: 12px; text-transform: uppercase; color: #1e40af; font-weight: 800; letter-spacing: 0.5px; }
        .id-number-val { font-size: 22px; font-family: monospace; font-weight: 800; color: #1d4ed8; letter-spacing: 2px; margin-top: 4px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-val { color: #0f172a; font-weight: 700; text-align: right; }
        .button { display: block; width: 100%; text-align: center; background: #2563eb; color: #ffffff !important; padding: 14px 0; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 24px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Gov Services Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>Gov Services</h1>
          <p>Persons with Disability Affairs Division — Gov Services</p>
        </div>

        <div class="content">
          <div style="text-align: center;">
            <span class="badge">✓ OFFICIAL PWD ID ISSUED</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Greetings, ${recipientName || 'Applicant'}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            We are pleased to inform you that your application for an official <strong>Persons with Disability (PWD) ID</strong> has been officially <strong>APPROVED</strong> by Gov Services - Persons with Disability Affairs Division.
          </p>

          <div class="card">
            <div class="id-number-box">
              <div class="id-number-label">OFFICIAL PWD ID</div>
              <div class="id-number-val">${pwdIdNumber || referenceNumber || 'PWD-137404-2026-000000'}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Beneficiary Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${recipientName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Disability Category:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${disabilityType || 'Physical / Visual Disability'}</td>
              </tr>
              ${bloodType ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Blood Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${bloodType}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date of Approval:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
                <td style="padding: 6px 0; color: #047857; font-weight: 800; text-align: right;">ACTIVE AND REGISTERED</td>
              </tr>
            </table>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #1e40af; line-height: 1.5;">
            <strong>Privileges and Benefits:</strong> You can now access and view your <strong>Digital PWD ID</strong> via the Gov Services User Portal to avail of statutory discounts (20% discount &amp; VAT exemption) and government assistance programs.
          </div>

          <a href="https://frontend-production-1c51.up.railway.app/portal" class="button" target="_blank">
            ACCESS DIGITAL PWD ID
          </a>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated email notification from the Gov Services Portal.</p>
          <p style="margin: 0;">Gov Services | Persons with Disability Affairs Division</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const attachments = getLogoAttachments();

  const mailOptions = {
    from: `"Gov Services (PWD Affairs)" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[Gov Services] Official PWD ID Card Approved: ${pwdIdNumber || referenceNumber}`,
    text: `Greetings ${recipientName}! Your PWD ID Application has been officially approved. Official ID: ${pwdIdNumber || referenceNumber}.`,
    html: htmlContent,
    attachments,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching official email to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] Successfully delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed] ${primaryErr.message}, attempting Port 587 STARTTLS...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // STARTTLS
          auth: {
            user: senderEmail,
            pass: emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] Successfully delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed] ${fallbackErr.message}, attempting Brevo REST API fallback...`);
      }
    }
  }

  // 2. SECONDARY FALLBACK: Brevo HTTPS REST API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo HTTPS API Fallback] Dispatching email to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Gov Services (PWD Affairs)', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName || 'Applicant' }],
          subject: `[Gov Services] Official PWD ID Card Approved: ${pwdIdNumber || referenceNumber}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo HTTPS API] Successfully delivered to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      } else {
        console.warn(`[Brevo API Error] ${JSON.stringify(data)}, attempting Resend fallback...`);
      }
    } catch (err) {
      console.warn(`[Brevo API Exception] ${err.message}, attempting Resend fallback...`);
    }
  }

  // 3. TERTIARY FALLBACK: Resend HTTPS API
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      console.log(`[Resend HTTPS API Fallback] Sending email to: ${recipientEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gov Services <onboarding@resend.dev>',
          to: [recipientEmail.trim()],
          subject: `[Gov Services] Official PWD ID Card Approved: ${pwdIdNumber || referenceNumber}`,
          text: `Greetings ${recipientName}! Your PWD ID Application has been approved. Official ID: ${pwdIdNumber || referenceNumber}.`,
          html: htmlContent,
        }),
      });


      const data = await res.json();
      if (res.ok && data.id) {
        console.log(`[Resend HTTPS API] Email successfully delivered to ${recipientEmail}. MessageId: ${data.id}`);
        return { success: true, messageId: data.id, delivered: true, recipient: recipientEmail, provider: 'resend' };
      } else {
        console.warn(`[Resend API Error] ${JSON.stringify(data)}`);
      }
    } catch (apiErr) {
      console.warn(`[Resend API Exception] ${apiErr.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver email to ${recipientEmail}. All SMTP and REST providers failed.`,
  };
}

/**
 * Sends a 6-digit OTP verification email to the recipient.
 */
async function sendOtpEmail({ recipientEmail, otpCode, recipientName = 'Resident' }) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email for OTP: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>GovServe - Account Verification OTP</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 24px; color: #1e293b; text-align: center; }
        .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bfdbfe; margin-bottom: 20px; }
        .otp-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
        .otp-code { font-size: 36px; font-weight: 800; font-family: 'Courier New', monospace; letter-spacing: 8px; color: #1e3a8a; margin: 8px 0; }
        .otp-note { font-size: 12px; color: #64748b; margin-top: 6px; }
        .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #991b1b; line-height: 1.5; text-align: left; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Government Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>GovServe</h1>
          <p>Social Services Management System</p>
        </div>

        <div class="content">
          <div>
            <span class="badge">EMAIL VERIFICATION CODE</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Hello!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            Please use the 6-digit One-Time Password (OTP) verification code below to complete your registration for your GovServe Resident Account:
          </p>

          <div class="otp-box">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px;">YOUR VERIFICATION CODE</div>
            <div class="otp-code">${otpCode}</div>
            <div class="otp-note">Valid for <strong>10 minutes</strong>.</div>
          </div>

          <div class="warning-box">
            <strong>Security Notice:</strong> Do not share this OTP verification code with anyone. GovServe personnel and administrators will never ask for your code.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated security notification from the GovServe Portal.</p>
          <p style="margin: 0;">GovServe Social Services Management Portal | Online Support</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');

  const mailOptions = {
    from: `"GovServe" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[GovServe] Your OTP Verification Code: ${otpCode}`,
    text: `Your GovServe OTP Verification Code is: ${otpCode}. This code is valid for 10 minutes. Do not share this code with anyone.`,
    html: htmlContent,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching OTP to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] OTP delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed for OTP] ${primaryErr.message}, trying port 587...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: senderEmail, pass: emailPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] OTP delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed for OTP] ${fallbackErr.message}, attempting Brevo fallback...`);
      }
    }
  }

  // 2. FALLBACK: Brevo API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo API Fallback] Sending OTP to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'GovServe', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName }],
          subject: `[GovServe] Your OTP Verification Code: ${otpCode}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo API] OTP delivered to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      }
    } catch (err) {
      console.warn(`[Brevo OTP Exception] ${err.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver OTP to ${recipientEmail}.`,
  };
}

/**
 * Sends an official Senior Citizen (OSCA) ID Approval email to the recipient.
 */
async function sendSeniorCitizenApprovalEmail({
  recipientEmail,
  recipientName,
  seniorIdNumber,
  referenceNumber,
  applicationType = 'New Application',
  bloodType = 'O+',
  approvedDate,
  contactNumber,
  address,
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email for Senior ID: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const dateStr = approvedDate
    ? new Date(approvedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const officialId = seniorIdNumber || referenceNumber || 'OSCA-137404-2026-000000';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Gov Services - Official Senior Citizen ID Approval</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
        .content { padding: 32px 24px; color: #1e293b; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
        .card { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 14px; padding: 24px; margin: 20px 0; }
        .id-number-box { background: #ffffff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 12px 16px; margin: 12px 0; text-align: center; box-shadow: 0 2px 4px rgba(2,132,199,0.08); }
        .id-number-label { font-size: 12px; text-transform: uppercase; color: #0369a1; font-weight: 800; letter-spacing: 0.5px; }
        .id-number-val { font-size: 22px; font-family: monospace; font-weight: 800; color: #0c4a6e; letter-spacing: 2px; margin-top: 4px; }
        .button { display: block; width: 100%; text-align: center; background: #0284c7; color: #ffffff !important; padding: 14px 0; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 24px; box-shadow: 0 2px 6px rgba(2,132,199,0.3); }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Gov Services Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>Gov Services</h1>
          <p>Office for Senior Citizens Affairs (OSCA) — Gov Services</p>
        </div>

        <div class="content">
          <div style="text-align: center;">
            <span class="badge">✓ OFFICIAL SENIOR CITIZEN ID ISSUED</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Greetings, ${recipientName || 'Senior Citizen'}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            We are pleased to inform you that your application for an official <strong>Senior Citizen ID</strong> has been officially <strong>APPROVED</strong> by Gov Services - Office for Senior Citizens Affairs (OSCA).
          </p>

          <div class="card">
            <div class="id-number-box">
              <div class="id-number-label">OFFICIAL SENIOR CITIZEN</div>
              <div class="id-number-val">${officialId}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Cardholder Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${recipientName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service / Category:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">Senior Citizen OSCA ID Card</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Application Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${applicationType}</td>
              </tr>
              ${bloodType ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Blood Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${bloodType}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date of Approval:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
                <td style="padding: 6px 0; color: #047857; font-weight: 800; text-align: right;">ACTIVE AND REGISTERED</td>
              </tr>
            </table>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #0369a1; line-height: 1.5;">
            <strong>Privileges and Benefits (R.A. 9994):</strong> As an official Senior Citizen ID cardholder, you are entitled to a 20% discount and VAT exemption on qualified medicines, grocery purchases, public transportation fares, dining, medical and dental services, and other authorized government privileges.
          </div>

          <a href="https://frontend-production-1c51.up.railway.app/portal/my-applications" class="button" target="_blank">
            ACCESS DIGITAL SENIOR CITIZEN ID
          </a>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated email notification from the Gov Services Portal.</p>
          <p style="margin: 0;">Gov Services | Office for Senior Citizens Affairs (OSCA)</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const attachments = getLogoAttachments();

  const mailOptions = {
    from: `"Gov Services (Senior Citizen Services)" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[Gov Services] Official Senior Citizen ID Card Approved: ${officialId}`,
    text: `Greetings ${recipientName}! Your Senior Citizen ID Application has been officially approved. Official ID: ${officialId}.`,
    html: htmlContent,
    attachments,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching Senior ID email to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] Successfully delivered Senior ID email to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed] ${primaryErr.message}, attempting Port 587 STARTTLS...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: senderEmail,
            pass: emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] Successfully delivered Senior ID email to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed] ${fallbackErr.message}, attempting Brevo REST API fallback...`);
      }
    }
  }

  // 2. SECONDARY FALLBACK: Brevo HTTPS REST API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo HTTPS API Fallback] Dispatching Senior ID email to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Gov Services (Senior Citizen Services)', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName || 'Senior Citizen' }],
          subject: `[Gov Services] Official Senior Citizen ID Card Approved: ${officialId}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo HTTPS API] Successfully delivered Senior ID email to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      }
    } catch (err) {
      console.warn(`[Brevo API Exception] ${err.message}`);
    }
  }

  // 3. TERTIARY FALLBACK: Resend HTTPS API
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      console.log(`[Resend HTTPS API Fallback] Sending Senior ID email to: ${recipientEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gov Services <onboarding@resend.dev>',
          to: [recipientEmail.trim()],
          subject: `[Gov Services] Official Senior Citizen ID Card Approved: ${officialId}`,
          text: `Greetings ${recipientName}! Your Senior Citizen ID Application has been approved. Official ID: ${officialId}.`,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        console.log(`[Resend HTTPS API] Senior ID email delivered to ${recipientEmail}. MessageId: ${data.id}`);
        return { success: true, messageId: data.id, delivered: true, recipient: recipientEmail, provider: 'resend' };
      }
    } catch (apiErr) {
      console.warn(`[Resend API Exception] ${apiErr.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver Senior ID email to ${recipientEmail}.`,
  };
}

/**
 * Sends an official Senior Citizen Discount Booklet (Medicine / Movie) Approval email to the recipient.
 */
async function sendSeniorBookletApprovalEmail({
  recipientEmail,
  recipientName,
  bookletNumber,
  oscaIdNumber,
  referenceNumber,
  bookletType = 'medicine',
  applicationType = 'Renewal',
  approvedDate,
  contactNumber,
  address,
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email for Senior Booklet: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const isMovie = String(bookletType).toLowerCase().includes('movie');
  const bookletTitle = isMovie ? 'Free Movie Booklet' : 'Medicine Discount Booklet';
  const bookletShort = isMovie ? 'Movie Booklet' : 'Medicine Booklet';
  const generatedBookletNo = bookletNumber || (isMovie ? `MV-2026-${Math.floor(100000 + Math.random() * 900000)}` : `MB-2026-${Math.floor(100000 + Math.random() * 900000)}`);
  const officialOscaId = oscaIdNumber || referenceNumber || '137484-2026-516915';

  const dateStr = approvedDate
    ? new Date(approvedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Gov Services - Official Senior Citizen ${bookletTitle} Issued</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
        .content { padding: 32px 24px; color: #1e293b; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
        .card { background: #f0f9ff; border: 2px dashed #7dd3fc; border-radius: 14px; padding: 24px; margin: 20px 0; }
        .id-number-box { background: #ffffff; border: 2px solid #0284c7; border-radius: 10px; padding: 14px 16px; margin: 12px 0; text-align: center; box-shadow: 0 2px 8px rgba(2,132,199,0.12); }
        .id-number-label { font-size: 11px; text-transform: uppercase; color: #0369a1; font-weight: 800; letter-spacing: 1px; }
        .id-number-val { font-size: 24px; font-family: monospace; font-weight: 800; color: #0c4a6e; letter-spacing: 2px; margin-top: 4px; }
        .id-number-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
        .button { display: block; width: 100%; text-align: center; background: #0284c7; color: #ffffff !important; padding: 14px 0; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 24px; box-shadow: 0 2px 6px rgba(2,132,199,0.3); }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Gov Services Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>Gov Services</h1>
          <p>Office for Senior Citizens Affairs (OSCA) — Gov Services</p>
        </div>

        <div class="content">
          <div style="text-align: center;">
            <span class="badge">✓ OFFICIAL ${bookletTitle.toUpperCase()} ISSUED</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Greetings, ${recipientName || 'Senior Citizen'}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            We are pleased to inform you that your application for an official <strong>${bookletTitle}</strong> has been successfully <strong>APPROVED</strong> by the Office for Senior Citizens Affairs (OSCA).
          </p>

          <div class="card">
            <div class="id-number-box">
              <div class="id-number-label">OFFICIAL ${bookletShort.toUpperCase()} NUMBER</div>
              <div class="id-number-val">${generatedBookletNo}</div>
              <div class="id-number-sub">Official Unique Booklet Control Number for your records and renewals</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Booklet Holder Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${recipientName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Official Booklet No.:</td>
                <td style="padding: 6px 0; color: #0284c7; font-family: monospace; font-weight: 800; text-align: right;">${generatedBookletNo}</td>
              </tr>
              ${referenceNumber ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Application Ref No.:</td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700; text-align: right;">${referenceNumber}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${bookletTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Application Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${applicationType}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date of Issuance:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
                <td style="padding: 6px 0; color: #047857; font-weight: 800; text-align: right;">ACTIVE AND REGISTERED</td>
              </tr>
            </table>
          </div>

          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #166534; line-height: 1.5; margin-bottom: 16px;">
            <strong>How to Use:</strong> ${
              isMovie
                ? 'Present this Booklet Number along with your official Senior Citizen ID at participating cinemas for free movie screening privileges.'
                : 'Present this Booklet Number along with your official Senior Citizen ID and doctor\'s prescription at participating pharmacies and drugstores for a 20% discount and VAT exemption pursuant to R.A. 9994.'
            }
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #0369a1; line-height: 1.5;">
            <strong>Important Reminder:</strong> Please keep and save this email. If you need to renew or apply for a replacement booklet in the future, use this Booklet Number (<strong>${generatedBookletNo}</strong>) as your Existing Booklet Reference.
          </div>

          <a href="https://frontend-production-1c51.up.railway.app/portal/my-applications" class="button" target="_blank">
            VIEW MY APPLICATIONS
          </a>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated email notification from the Gov Services Portal.</p>
          <p style="margin: 0;">Gov Services | Office for Senior Citizens Affairs (OSCA)</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const attachments = getLogoAttachments();

  const mailOptions = {
    from: `"Gov Services (Senior Citizen Services)" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[Gov Services] Official ${bookletTitle} Approved: ${generatedBookletNo}`,
    text: `Greetings ${recipientName}! Your ${bookletTitle} application has been successfully approved. Official Booklet Number: ${generatedBookletNo}. OSCA ID: ${officialOscaId}.`,
    html: htmlContent,
    attachments,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching Senior Booklet email to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] Successfully delivered Senior Booklet email to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed] ${primaryErr.message}, attempting Port 587 STARTTLS...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: senderEmail,
            pass: emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] Successfully delivered Senior Booklet email to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed] ${fallbackErr.message}, attempting Brevo REST API fallback...`);
      }
    }
  }

  // 2. SECONDARY FALLBACK: Brevo HTTPS REST API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo HTTPS API Fallback] Dispatching Senior Booklet email to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Gov Services (Senior Citizen Services)', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName || 'Senior Citizen' }],
          subject: `[Gov Services] Official ${bookletTitle} Approved: ${generatedBookletNo}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo HTTPS API] Successfully delivered Senior Booklet email to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      }
    } catch (err) {
      console.warn(`[Brevo API Exception] ${err.message}`);
    }
  }

  // 3. TERTIARY FALLBACK: Resend HTTPS API
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      console.log(`[Resend HTTPS API Fallback] Sending Senior Booklet email to: ${recipientEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gov Services <onboarding@resend.dev>',
          to: [recipientEmail.trim()],
          subject: `[Gov Services] Official ${bookletTitle} Approved: ${generatedBookletNo}`,
          text: `Greetings ${recipientName}! Your ${bookletTitle} application has been successfully approved. Official Booklet Number: ${generatedBookletNo}.`,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        console.log(`[Resend HTTPS API] Senior Booklet email delivered to ${recipientEmail}. MessageId: ${data.id}`);
        return { success: true, messageId: data.id, delivered: true, recipient: recipientEmail, provider: 'resend' };
      }
    } catch (apiErr) {
      console.warn(`[Resend API Exception] ${apiErr.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver Senior Booklet email to ${recipientEmail}.`,
  };
}

/**
 * Sends an official Solo Parent ID Approval email to the recipient.
 */
async function sendSoloParentApprovalEmail({
  recipientEmail,
  recipientName,
  soloParentIdNumber,
  referenceNumber,
  classification,
  applicationType = 'New Application',
  approvedDate,
  contactNumber,
  address,
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email for Solo Parent ID: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const dateStr = approvedDate
    ? new Date(approvedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const officialId = soloParentIdNumber || referenceNumber || 'SP-137404-2026-000000';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Gov Services - Official Solo Parent ID Approval</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.95; }
        .content { padding: 32px 24px; color: #1e293b; }
        .badge { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
        .card { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 14px; padding: 24px; margin: 20px 0; }
        .id-number-box { background: #ffffff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 12px 16px; margin: 12px 0; text-align: center; box-shadow: 0 2px 4px rgba(2,132,199,0.08); }
        .id-number-label { font-size: 12px; text-transform: uppercase; color: #0369a1; font-weight: 800; letter-spacing: 0.5px; }
        .id-number-val { font-size: 22px; font-family: monospace; font-weight: 800; color: #0c4a6e; letter-spacing: 2px; margin-top: 4px; }
        .button { display: block; width: 100%; text-align: center; background: #0284c7; color: #ffffff !important; padding: 14px 0; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 24px; box-shadow: 0 2px 6px rgba(2,132,199,0.3); }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Gov Services Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>Gov Services</h1>
          <p>Social Services Development Department — Solo Parent Welfare</p>
        </div>

        <div class="content">
          <div style="text-align: center;">
            <span class="badge">✓ OFFICIAL SOLO PARENT ID ISSUED</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Greetings, ${recipientName || 'Solo Parent'}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            We are pleased to inform you that your application for an official <strong>Solo Parent ID</strong> has been officially <strong>APPROVED</strong> by Gov Services - Social Services Development Department.
          </p>

          <div class="card">
            <div class="id-number-box">
              <div class="id-number-label">OFFICIAL SOLO PARENT ID</div>
              <div class="id-number-val">${officialId}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Cardholder Name:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${recipientName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service / Category:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">Solo Parent Identification Card</td>
              </tr>
              ${classification ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Classification:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${classification}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Application Type:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">${applicationType}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date of Approval:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
                <td style="padding: 6px 0; color: #047857; font-weight: 800; text-align: right;">ACTIVE AND REGISTERED</td>
              </tr>
            </table>
          </div>

          <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #0369a1; line-height: 1.5;">
            <strong>Privileges and Benefits (R.A. 8972 &amp; R.A. 11861):</strong> As an official Solo Parent ID cardholder, you are entitled to statutory monthly cash subsidies, flexible work schedules, 7-day parental leave with pay, educational scholarships, and 10% discount + VAT exemption on baby's milk, food, and essential medical supplies.
          </div>

          <a href="https://frontend-production-1c51.up.railway.app/portal/my-applications" class="button" target="_blank">
            ACCESS DIGITAL SOLO PARENT ID
          </a>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated email notification from the Gov Services Portal.</p>
          <p style="margin: 0;">Gov Services | Social Services Development Department</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const attachments = getLogoAttachments();

  const mailOptions = {
    from: `"Gov Services (Solo Parent Welfare)" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[Gov Services] Official Solo Parent ID Card Approved: ${officialId}`,
    text: `Greetings ${recipientName}! Your Solo Parent ID Application has been officially approved. Official ID: ${officialId}.`,
    html: htmlContent,
    attachments,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching Solo Parent ID email to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] Successfully delivered Solo Parent ID email to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed] ${primaryErr.message}, attempting Port 587 STARTTLS...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: senderEmail,
            pass: emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] Successfully delivered Solo Parent ID email to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed] ${fallbackErr.message}, attempting Brevo REST API fallback...`);
      }
    }
  }

  // 2. SECONDARY FALLBACK: Brevo HTTPS REST API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo HTTPS API Fallback] Dispatching Solo Parent ID email to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Gov Services (Solo Parent Welfare)', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName || 'Solo Parent' }],
          subject: `[Gov Services] Official Solo Parent ID Card Approved: ${officialId}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo HTTPS API] Successfully delivered Solo Parent ID email to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      }
    } catch (err) {
      console.warn(`[Brevo API Exception] ${err.message}`);
    }
  }

  // 3. TERTIARY FALLBACK: Resend HTTPS API
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    try {
      console.log(`[Resend HTTPS API Fallback] Sending Solo Parent ID email to: ${recipientEmail}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Gov Services <onboarding@resend.dev>',
          to: [recipientEmail.trim()],
          subject: `[Gov Services] Official Solo Parent ID Card Approved: ${officialId}`,
          text: `Greetings ${recipientName}! Your Solo Parent ID Application has been successfully approved. Official ID: ${officialId}.`,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        console.log(`[Resend HTTPS API] Solo Parent ID email delivered to ${recipientEmail}. MessageId: ${data.id}`);
        return { success: true, messageId: data.id, delivered: true, recipient: recipientEmail, provider: 'resend' };
      }
    } catch (apiErr) {
      console.warn(`[Resend API Exception] ${apiErr.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver Solo Parent ID email to ${recipientEmail}.`,
  };
}

/**
 * Sends a Password Reset email with OTP and direct reset link to the recipient.
 */
async function sendPasswordResetEmail({
  recipientEmail,
  otpCode,
  resetUrl,
  recipientName = 'Resident',
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`[Mailer] Invalid recipient email for Password Reset: "${recipientEmail}". Skipped.`);
    return { success: false, message: 'Invalid recipient email' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>GovServe - Password Reset Request</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 24px; color: #1e293b; text-align: center; }
        .badge { display: inline-block; background-color: #fef2f2; color: #dc2626; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #fecaca; margin-bottom: 20px; }
        .otp-box { background: #f8fafc; border: 2px dashed #dc2626; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
        .otp-code { font-size: 36px; font-weight: 800; font-family: 'Courier New', monospace; letter-spacing: 8px; color: #991b1b; margin: 8px 0; }
        .otp-note { font-size: 12px; color: #64748b; margin-top: 6px; }
        .btn-reset { display: inline-block; background-color: #dc2626; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; margin: 16px 0; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3); }
        .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #92400e; line-height: 1.5; text-align: left; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://raw.githubusercontent.com/shinxyg/Social-Service-Management-orig/main/backend/assets/logo.png" alt="Government Seal" width="75" height="75" style="margin-bottom: 12px; display: inline-block; object-fit: contain;" />
          <h1>GovServe</h1>
          <p>Social Services Management System</p>
        </div>

        <div class="content">
          <div>
            <span class="badge">PASSWORD RESET REQUEST</span>
          </div>

          <h2 style="font-size: 18px; margin: 0 0 8px; color: #0f172a;">Hello, ${recipientName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
            We received a request to reset the password for your GovServe Account.
          </p>

          <div class="otp-box">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1px;">YOUR 6-DIGIT RESET CODE</div>
            <div class="otp-code">${otpCode}</div>
            <div class="otp-note">Valid for <strong>15 minutes</strong>.</div>
          </div>

          ${resetUrl ? `
          <div style="margin: 20px 0;">
            <p style="font-size: 13px; color: #475569; margin-bottom: 10px;">Or click the button below to reset your password directly:</p>
            <a href="${resetUrl}" class="btn-reset" target="_blank">Reset Password Now</a>
            <p style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 8px;">Direct Link: <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
          </div>
          ` : ''}

          <div class="warning-box">
            <strong>Security Notice:</strong> If you did not request this password reset, please disregard this email. Your account remains safe and secure.
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 4px;">This is an official automated security notification from the GovServe Portal.</p>
          <p style="margin: 0;">GovServe Social Services Management Portal | Quezon City</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. PRIMARY: Direct Gmail SMTP
  const transporter = createTransporter();
  const senderEmail = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
  const attachments = getLogoAttachments();

  const mailOptions = {
    from: `"GovServe Security" <${senderEmail}>`,
    to: recipientEmail.trim(),
    subject: `[GovServe] Password Reset Request - Verification Code: ${otpCode}`,
    text: `Greetings ${recipientName}! Your password reset verification code is: ${otpCode}. Valid for 15 minutes. Reset link: ${resetUrl || 'Visit GovServe login page'}`,
    html: htmlContent,
    attachments,
  };

  if (transporter) {
    try {
      console.log(`[Gmail SMTP 465] Dispatching Password Reset to: ${recipientEmail}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Gmail SMTP 465] Password Reset delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-465' };
    } catch (primaryErr) {
      console.warn(`[Gmail SMTP 465 Failed for Password Reset] ${primaryErr.message}, trying port 587...`);
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: senderEmail, pass: emailPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Gmail SMTP 587] Password Reset delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId, delivered: true, recipient: recipientEmail, provider: 'gmail-smtp-587' };
      } catch (fallbackErr) {
        console.warn(`[Gmail SMTP 587 Failed for Password Reset] ${fallbackErr.message}, attempting Brevo fallback...`);
      }
    }
  }

  // 2. FALLBACK: Brevo API
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  if (brevoApiKey) {
    try {
      console.log(`[Brevo API Fallback] Sending Password Reset to: ${recipientEmail}...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'GovServe Security', email: senderEmail },
          to: [{ email: recipientEmail.trim(), name: recipientName }],
          subject: `[GovServe] Password Reset Request - Verification Code: ${otpCode}`,
          htmlContent: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.messageId) {
        console.log(`[Brevo API] Password Reset delivered to ${recipientEmail}. MessageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId, delivered: true, recipient: recipientEmail, provider: 'brevo' };
      }
    } catch (err) {
      console.warn(`[Brevo Password Reset Exception] ${err.message}`);
    }
  }

  return {
    success: false,
    message: `Failed to deliver Password Reset email to ${recipientEmail}.`,
  };
}

module.exports = {
  sendPwdApprovalEmail,
  sendSeniorCitizenApprovalEmail,
  sendSeniorBookletApprovalEmail,
  sendSoloParentApprovalEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
};


