// --- YEH HAI FIX ---
// We use the recommended TypeScript method (Client)
import nodeMailjet, { Client as MailjetClient } from 'node-mailjet'; 

// Client ko initialize karein using the class constructor
const mailjet: MailjetClient = new nodeMailjet.Client({
  apiKey: process.env.MJ_APIKEY_PUBLIC!,
  apiSecret: process.env.MJ_APIKEY_PRIVATE!
});
// --- END FIX ---

/**
 * Generates a 6-digit OTP string.
 * @returns {string} The 6-digit OTP.
 */
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends the OTP email using Mailjet with branded HTML content.
 * @param {string} recipientEmail - The email address to send the code to.
 * @param {string} otpCode - The 6-digit OTP.
 */
export const sendOtpEmail = async (recipientEmail: string, otpCode: string): Promise<void> => {
  const SENDER_EMAIL = process.env.MJ_SENDER_EMAIL;
  const SENDER_NAME = process.env.MJ_SENDER_NAME || "Gatedrop Team";
  
  const LOGO_URL = `${process.env.FRONTEND_URL || 'https://gatedrop.vercel.app'}/logo.png`; 

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #10B981; padding-bottom: 15px; margin-bottom: 20px;">
        <img src="${LOGO_URL}" alt="Gatedrop Logo" style="height: 35px;">
        <h1 style="color: #10B981; font-size: 24px; margin: 5px 0 0;">Gatedrop</h1>
      </div>
      <h2 style="color: #333; text-align: center;">Your Verification Code</h2>
      <p style="font-size: 16px; line-height: 1.5; text-align: center;">
        Hi there,
      </p>
      <p style="font-size: 16px; line-height: 1.5; text-align: center;">
        Please use the code below to complete your **Gatedrop** account registration.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: bold; color: #ffffff; background-color: #10B981; padding: 15px 30px; border-radius: 8px; letter-spacing: 5px;">
          ${otpCode}
        </span>
      </div>
      <p style="font-size: 14px; color: #777; text-align: center;">
        This code expires in 10 minutes.
      </p>
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; text-align: center;">
        <p style="font-size: 12px; color: #999;">&copy; Gatedrop Team</p>
      </div>
    </div>
  `;

  try {
    const request = mailjet
      .post('send', { version: 'v3.1' }) // Send API v3.1 use kiya
      .request({
        Messages: [
          {
            From: {
              Email: SENDER_EMAIL,
              Name: SENDER_NAME,
            },
            To: [{
              Email: recipientEmail,
              Name: 'Gatedrop User',
            }],
            Subject: 'Gatedrop: Your Email Verification Code',
            HTMLPart: htmlContent,
            TextPart: `Your Gatedrop verification code is ${otpCode}. It expires in 10 minutes.`,
          },
        ],
      });

    await request;
    console.log(`[Mailjet] OTP sent successfully to ${recipientEmail}`);

  } catch (error) {
    console.error(`[Mailjet] Failed to send OTP email to ${recipientEmail}. Status: ${error.statusCode || 'N/A'}`);
    throw new Error("Email service temporarily unavailable. Please try again.");
  }
};