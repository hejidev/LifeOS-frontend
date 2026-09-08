"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginCodeEmail = sendLoginCodeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendFamilyInviteEmail = sendFamilyInviteEmail;
exports.sendContactNotificationEmail = sendContactNotificationEmail;
exports.sendSubscriptionConfirmationEmail = sendSubscriptionConfirmationEmail;
exports.sendSupportEmailChangeVerification = sendSupportEmailChangeVerification;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendLoginAlertEmail = sendLoginAlertEmail;
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
exports.sendRoleChangedEmail = sendRoleChangedEmail;
exports.sendEmailChangedByAdminEmail = sendEmailChangedByAdminEmail;
exports.sendMerchantApprovedEmail = sendMerchantApprovedEmail;
exports.sendMerchantRejectedEmail = sendMerchantRejectedEmail;
exports.sendMerchantSuspendedEmail = sendMerchantSuspendedEmail;
exports.sendMerchantReactivatedEmail = sendMerchantReactivatedEmail;
exports.sendStaffAddedEmail = sendStaffAddedEmail;
exports.sendTwoFactorEnabledEmail = sendTwoFactorEnabledEmail;
exports.sendTwoFactorResetEmail = sendTwoFactorResetEmail;
exports.sendAdminLoginAlertEmail = sendAdminLoginAlertEmail;
exports.sendBillingReminderEmail = sendBillingReminderEmail;
const resend_1 = require("resend");
const env_1 = require("../config/env");
const logger_1 = require("../lib/logger");
const resend = new resend_1.Resend(env_1.env.RESEND_API_KEY);
function renderLayout(heading, bodyHtml) {
    return `
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
                    <h2 style="margin:0 0 12px;color:#fff;font-size:20px;font-weight:600;">${heading}</h2>
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
                    <p style="margin:0;color:#444;font-size:11px;">&copy; ${new Date().getFullYear()} LifeOS. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
function paragraph(text) {
    return `<p style="margin:0 0 20px;color:#888;font-size:14px;line-height:1.6;">${text}</p>`;
}
function button(label, href) {
    return `
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${href}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}
async function send(to, subject, html, { critical = false } = {}) {
    const { data, error } = await resend.emails.send({ from: env_1.env.RESEND_FROM_EMAIL, to, subject, html });
    if (error) {
        logger_1.logger.error(`[resend] failed to send "${subject}" to ${to}:`, error);
        if (critical)
            throw new Error(`Failed to send email: ${subject}`);
        return;
    }
    logger_1.logger.info(`[resend] sent "${subject}" to ${to}:`, data?.id);
}
async function sendLoginCodeEmail(to, code) {
    const html = renderLayout("Your sign-in code", paragraph("Use the code below to sign in. It expires in 10 minutes — don't share it with anyone.") +
        `<p style="margin:0 0 20px;font-size:28px;font-weight:700;letter-spacing:6px;color:#fff;">${code}</p>`);
    await send(to, "Your LifeOS sign-in code", html, { critical: true });
}
async function sendPasswordResetEmail(to, resetLink) {
    const html = renderLayout("Reset your password", paragraph("We received a request to reset the password for your LifeOS account. Click the button below to choose a new password. This link expires in 15 minutes.") +
        button("Reset password", resetLink) +
        `<p style="margin:28px 0 0;color:#555;font-size:12px;line-height:1.6;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
       <p style="margin:16px 0 0;color:#444;font-size:11px;">Or copy this link into your browser:<br/><span style="color:#6366f1;word-break:break-all;">${resetLink}</span></p>`);
    await send(to, "Reset your LifeOS password", html, { critical: true });
}
async function sendFamilyInviteEmail(to, inviterName, joinLink) {
    const html = renderLayout("You're invited to a Family Space", paragraph(`${inviterName} invited you to join their family on LifeOS. This link expires in 7 days.`) +
        button("Join Family Space", joinLink));
    await send(to, `${inviterName} invited you to join their Family Space on LifeOS`, html, { critical: true });
}
async function sendContactNotificationEmail(to, data) {
    const html = renderLayout("New contact message", `<p style="margin:0 0 8px;color:#888;font-size:12px;">From</p>
     <p style="margin:0 0 20px;color:#fff;font-size:14px;">${data.name} · ${data.email}</p>
     ${data.subject ? `<p style="margin:0 0 8px;color:#888;font-size:12px;">Subject</p><p style="margin:0 0 20px;color:#fff;font-size:14px;">${data.subject}</p>` : ""}
     <p style="margin:0 0 8px;color:#888;font-size:12px;">Message</p>
     <p style="margin:0;color:#ccc;font-size:14px;line-height:1.6;white-space:pre-wrap;">${data.message}</p>`);
    await send(to, `New contact form submission${data.subject ? `: ${data.subject}` : ""}`, html, { critical: true });
}
async function sendSubscriptionConfirmationEmail(to, data) {
    const html = renderLayout("You're all set", paragraph(`Your <strong style="color:#fff;">${data.planName}</strong> subscription is now active, billed ${data.interval === "year" ? "yearly" : "monthly"}.`) +
        `<table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border-radius:10px;margin-bottom:24px;">
         <tr><td style="padding:16px 20px;">
           <p style="margin:0 0 4px;color:#888;font-size:12px;">Next billing date</p>
           <p style="margin:0;color:#fff;font-size:14px;font-weight:600;">${data.periodEnd.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
         </td></tr>
       </table>
       <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">You can manage or cancel your subscription any time from your Billing page.</p>`);
    await send(to, `You're subscribed to ${data.planName}`, html);
}
async function sendSupportEmailChangeVerification(to, confirmLink) {
    const html = renderLayout("Confirm your new email address", paragraph("A LifeOS support agent started an email-address change for your account. Confirm this new address by clicking below. It expires in 30 minutes.") +
        button("Confirm email change", confirmLink) +
        paragraph("If you did not contact support, do not click this link and contact LifeOS immediately."));
    await send(to, "Confirm your new LifeOS email address", html, { critical: true });
}
async function sendWelcomeEmail(to, name) {
    const html = renderLayout(`Welcome, ${name.split(" ")[0]}`, paragraph("Your LifeOS account is ready. Tasks, notes, habits, finance, and everything else you need to run your life now live in one place."));
    await send(to, "Welcome to LifeOS", html);
}
async function sendLoginAlertEmail(to, name, time) {
    const html = renderLayout("New sign-in to your account", paragraph(`Hi ${name.split(" ")[0]}, your LifeOS account was just signed in to on ${time}.`) +
        paragraph("If this was you, no action is needed. If you don't recognize this, change your password immediately."));
    await send(to, "New sign-in to your LifeOS account", html);
}
async function sendPasswordChangedEmail(to, name) {
    const html = renderLayout("Your password was changed", paragraph(`Hi ${name.split(" ")[0]}, the password for your LifeOS account was just changed.`) +
        paragraph("If you didn't make this change, contact support immediately."));
    await send(to, "Your LifeOS password was changed", html);
}
async function sendRoleChangedEmail(to, name, newRole) {
    const html = renderLayout("Your account role was updated", paragraph(`Hi ${name.split(" ")[0]}, your LifeOS account role was changed to <strong style="color:#fff;">${newRole.replace("_", " ")}</strong> by an administrator.`));
    await send(to, "Your LifeOS account role has changed", html);
}
async function sendEmailChangedByAdminEmail(to, name, newEmail) {
    const html = renderLayout("Your email address was updated", paragraph(`Hi ${name.split(" ")[0]}, an administrator changed the email address on your LifeOS account to <strong style="color:#fff;">${newEmail}</strong>.`) +
        paragraph("If you didn't expect this, contact support immediately."));
    await send(to, "Your LifeOS email address has changed", html);
}
async function sendMerchantApprovedEmail(to, businessName) {
    const html = renderLayout("You're approved!", paragraph(`Great news — <strong style="color:#fff;">${businessName}</strong> has been approved as a LifeOS merchant. Choose a plan to activate your dashboard and start selling.`));
    await send(to, "Your LifeOS merchant application was approved", html);
}
async function sendMerchantRejectedEmail(to, businessName, reason) {
    const html = renderLayout("Application not approved", paragraph(`Your application for <strong style="color:#fff;">${businessName}</strong> was not approved this time.`) +
        (reason ? paragraph(`Reason: ${reason}`) : ""));
    await send(to, "Your LifeOS merchant application status", html);
}
async function sendMerchantSuspendedEmail(to, businessName, reason) {
    const html = renderLayout("Your merchant account was suspended", paragraph(`Your merchant account for <strong style="color:#fff;">${businessName}</strong> has been suspended.`) +
        (reason ? paragraph(`Reason: ${reason}`) : "") +
        paragraph("Contact support if you believe this was a mistake."));
    await send(to, "Your LifeOS merchant account has been suspended", html);
}
async function sendMerchantReactivatedEmail(to, businessName) {
    const html = renderLayout("Your merchant account is active again", paragraph(`Good news — <strong style="color:#fff;">${businessName}</strong> has been reactivated and your dashboard is fully accessible again.`));
    await send(to, "Your LifeOS merchant account has been reactivated", html);
}
async function sendStaffAddedEmail(to, ownerName, staffName, businessName) {
    const html = renderLayout("New staff member added", paragraph(`Hi ${ownerName.split(" ")[0]}, ${staffName} was just added as a staff member on ${businessName}.`) +
        paragraph("If you didn't do this, review your staff list immediately."));
    await send(to, `New staff member added to ${businessName}`, html);
}
async function sendTwoFactorEnabledEmail(to, name) {
    const html = renderLayout("Two-factor authentication enabled", paragraph(`Hi ${name.split(" ")[0]}, two-factor authentication was just turned on for your LifeOS account.`) +
        paragraph("If you didn't do this, contact support immediately."));
    await send(to, "Two-factor authentication enabled on your LifeOS account", html);
}
async function sendTwoFactorResetEmail(to, name, reason) {
    const html = renderLayout("Two-factor authentication was reset", paragraph(`Hi ${name.split(" ")[0]}, two-factor authentication on your LifeOS account was reset by a support agent.`) +
        paragraph(`Reason given: ${reason}`) +
        paragraph("If you didn't request this, contact support immediately and secure your account."));
    await send(to, "Two-factor authentication reset on your LifeOS account", html);
}
async function sendAdminLoginAlertEmail(to, adminName, adminEmail, time) {
    const html = renderLayout("Admin sign-in", paragraph(`${adminName} (${adminEmail}) signed in to the LifeOS admin panel on ${time}.`));
    await send(to, `Admin sign-in: ${adminName}`, html);
}
async function sendBillingReminderEmail(to, name, planName, daysRemaining, renewalDate) {
    const dateLabel = renewalDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const timeLabel = daysRemaining === 1 ? "tomorrow" :
        daysRemaining === 30 ? "in 1 month" :
            daysRemaining % 7 === 0 ? `in ${daysRemaining / 7} weeks` :
                `in ${daysRemaining} days`;
    const html = renderLayout("Your plan renews soon", paragraph(`Hi ${name.split(" ")[0]}, your <strong style="color:#fff;">${planName}</strong> plan renews ${timeLabel}, on ${dateLabel}.`) +
        paragraph("No action is needed if you'd like to continue — you'll be billed automatically. If you'd like to make changes or cancel, you can do that any time from your Billing page before the renewal date."));
    await send(to, `Your ${planName} plan renews ${timeLabel}`, html);
}
