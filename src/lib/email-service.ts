// src/lib/email-service.ts
'use server';

import sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email using SendGrid.
 * Requires SENDGRID_API_KEY and a verified SENDGRID_FROM_EMAIL in .env.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || apiKey === "YOUR_SENDGRID_API_KEY_HERE" || apiKey.startsWith("SG.your-actual-key")) {
    const errorMessage = "SendGrid API Key not found, is a placeholder, or seems incorrect. Please set a valid SENDGRID_API_KEY in your .env file.";
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  if (!fromEmail || fromEmail === "your-verified-sender@example.com" || !fromEmail.includes('@')) {
     const errorMessage = "SendGrid From Email not configured, is a placeholder, or invalid. Please set SENDGRID_FROM_EMAIL in your .env file with a SendGrid verified sender email address.";
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    ...options,
    from: fromEmail, // Use the verified sender from .env
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to} from ${fromEmail} with subject "${options.subject}"`);
    return { success: true, message: `Email sent to ${options.to}.` };
  } catch (error: any) {
    console.error("Error sending email with SendGrid:", error.response?.body || error.message);
    // Try to provide more specific error messages if available from SendGrid
    let detailedError = error.message;
    if (error.response && error.response.body && error.response.body.errors) {
      detailedError = error.response.body.errors.map((e: any) => e.message).join(', ');
    }
    return { success: false, message: `Failed to send email: ${detailedError}` };
  }
}
