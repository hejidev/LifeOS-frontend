"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginCodeEmail = sendLoginCodeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendFamilyInviteEmail = sendFamilyInviteEmail;
exports.sendContactNotificationEmail = sendContactNotificationEmail;
exports.sendSubscriptionConfirmationEmail = sendSubscriptionConfirmationEmail;
exports.sendSupportEmailChangeVerification = sendSupportEmailChangeVerification;
const resend_1 = require("resend");
const env_1 = require("../config/env");
const logger_1 = require("../lib/logger");
const resend = new resend_1.Resend(env_1.env.RESEND_API_KEY);
async function sendLoginCodeEmail(to, code) {
    const { error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: "Your LifeOS sign-in code",
        html: `<p>Your LifeOS sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send login code:", error);
        throw new Error("Failed to send sign-in code");
    }
}
async function sendPasswordResetEmail(to, resetLink) {
    const { data, error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: "Reset your LifeOS password",
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="padding:40px 40px 32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">LifeOS</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 12px;color:#fff;font-size:20px;font-weight:600;">Reset your password</h2>
                      <p style="margin:0 0 28px;color:#888;font-size:14px;line-height:1.6;">
                        We received a request to reset the password for your LifeOS account.
                        Click the button below to choose a new password. This link expires in 15 minutes.
                      </p>
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}"
                               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                              Reset password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:28px 0 0;color:#555;font-size:12px;line-height:1.6;">
                        If you didn't request this, you can safely ignore this email.
                        Your password won't change.
                      </p>
                      <p style="margin:16px 0 0;color:#444;font-size:11px;">
                        Or copy this link into your browser:<br/>
                        <span style="color:#6366f1;word-break:break-all;">${resetLink}</span>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
                      <p style="margin:0;color:#444;font-size:11px;">
                        &copy; ${new Date().getFullYear()} LifeOS. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send password reset email:", error);
        throw new Error("Failed to send reset email");
    }
    logger_1.logger.info("[resend] password reset email sent:", data?.id);
}
async function sendFamilyInviteEmail(to, inviterName, joinLink) {
    const { error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: `${inviterName} invited you to join their Family Space on LifeOS`,
        html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
                <tr><td style="padding:40px 40px 32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">LifeOS</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="margin:0 0 12px;color:#fff;font-size:20px;">You're invited to a Family Space</h2>
                  <p style="margin:0 0 28px;color:#888;font-size:14px;line-height:1.6;">
                    ${inviterName} invited you to join their family on LifeOS. This link expires in 7 days.
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
                    <a href="${joinLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                      Join Family Space
                    </a>
                  </td></tr></table>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send family invite email:", error);
        throw new Error("Failed to send invite email");
    }
}
async function sendContactNotificationEmail(to, data) {
    const { error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: `New contact form submission${data.subject ? `: ${data.subject}` : ""}`,
        html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
                <tr><td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">New contact message</h1>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;color:#888;font-size:12px;">From</p>
                  <p style="margin:0 0 20px;color:#fff;font-size:14px;">${data.name} · ${data.email}</p>
                  ${data.subject ? `<p style="margin:0 0 8px;color:#888;font-size:12px;">Subject</p><p style="margin:0 0 20px;color:#fff;font-size:14px;">${data.subject}</p>` : ""}
                  <p style="margin:0 0 8px;color:#888;font-size:12px;">Message</p>
                  <p style="margin:0;color:#ccc;font-size:14px;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send contact notification email:", error);
        throw new Error("Failed to send contact notification email");
    }
}
async function sendSubscriptionConfirmationEmail(to, data) {
    const { error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: `You're subscribed to ${data.planName}`,
        html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
                <tr><td style="padding:40px 40px 32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
                  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">LifeOS</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="margin:0 0 12px;color:#fff;font-size:20px;font-weight:600;">You're all set</h2>
                  <p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.6;">
                    Your <strong style="color:#fff;">${data.planName}</strong> subscription is now active, billed ${data.interval === "year" ? "yearly" : "monthly"}.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border-radius:10px;margin-bottom:24px;">
                    <tr><td style="padding:16px 20px;">
                      <p style="margin:0 0 4px;color:#888;font-size:12px;">Next billing date</p>
                      <p style="margin:0;color:#fff;font-size:14px;font-weight:600;">${data.periodEnd.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
                    </td></tr>
                  </table>
                  <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">You can manage or cancel your subscription any time from your Billing page.</p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
                  <p style="margin:0;color:#444;font-size:11px;">&copy; ${new Date().getFullYear()} LifeOS. All rights reserved.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send subscription confirmation email:", error);
    }
}
async function sendSupportEmailChangeVerification(to, confirmLink) {
    const { error } = await resend.emails.send({
        from: env_1.env.RESEND_FROM_EMAIL,
        to,
        subject: "Confirm your new LifeOS email address",
        html: `<p>A LifeOS support agent started an email-address change for your account.</p>
      <p>Confirm this new address by opening the link below. It expires in 30 minutes.</p>
      <p><a href="${confirmLink}">Confirm email change</a></p>
      <p>If you did not contact support, do not open this link and contact LifeOS immediately.</p>`,
    });
    if (error) {
        logger_1.logger.error("[resend] failed to send email-change verification:", error);
        throw new Error("Failed to send email-change verification");
    }
}
