// lib/email.js
import nodemailer from "nodemailer";

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getEmailVerificationTemplate = (
  firstName,
  verificationLink,
  verificationCode
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Actinova AI Tutor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .container {
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 16px 0;
      border-bottom: 1px solid #cccccc;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
    }
    .content {
      padding: 20px 0;
      font-size: 14px;
    }
    .section-box {
      border: 1px solid #cccccc;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .code {
      font-family: monospace;
      font-size: 20px;
      padding: 8px 12px;
      margin: 10px 0;
      border: 1px solid #cccccc;
      display: inline-block;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      padding: 10px 20px;
      border: 1px solid #cccccc;
      font-size: 14px;
      color: #000000;
      background-color: #ffffff;
    }
    .footer {
      padding: 16px 0;
      text-align: center;
      border-top: 1px solid #cccccc;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Actinova AI Tutor</h1>
    </div>

    <div class="content">
      <p>Hi ${firstName},</p>

      <p>
        Thank you for joining Actinova AI Tutor. We are pleased to have you on board
        and look forward to supporting you in achieving your learning goals with our
        AI powered tutoring platform.
      </p>

      <div class="section-box">
        <p><strong>Your Verification Code</strong></p>
        <p>Please use the following 6 digit code to verify your email address:</p>
        <div class="code">${verificationCode}</div>
        <p>This code will expire in 24 hours.</p>
      </div>

      <p><strong>Or Verify Using the Link</strong></p>

      <div class="section-box">
        <p>You can also verify your email by clicking the button below:</p>
        <a href="${verificationLink}" class="btn">Verify Email Address</a>
      </div>

      <p>If the button does not work, please copy and paste the link below into your browser:</p>
      <p>${verificationLink}</p>

      <p><strong>Next Steps</strong></p>
      <p>After verifying your email, you can:</p>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore our AI powered courses</li>
        <li>Begin your personalized learning journey</li>
        <li>Track your progress with detailed analytics</li>
      </ul>

      <p>
        If you did not create an account with Actinova AI Tutor, you can safely ignore this email.
      </p>

      <p>Welcome to Actinova AI Tutor.</p>
      <p>Best regards,<br />The Actinova AI Tutor Team</p>
    </div>

    <div class="footer">
      <p>© 2024 Actinova AI Tutor. All rights reserved.</p>
      <p>
        This email was sent to you because an account was created with this email address.
      </p>
    </div>
  </div>
</body>
</html>
`;

const getPasswordResetTemplate = (firstName, resetLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset - Actinova AI Tutor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .container {
      background-color: #ffffff;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 16px 0;
      border-bottom: 1px solid #cccccc;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
    }
    .content {
      padding: 20px 0;
      font-size: 14px;
    }
    .reset-box {
      border: 1px solid #cccccc;
      padding: 16px;
      text-align: center;
      margin: 20px 0;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      padding: 10px 20px;
      border: 1px solid #cccccc;
      font-size: 14px;
      color: #000000;
      background-color: #ffffff;
    }
    .warning {
      border: 1px solid #cccccc;
      padding: 12px;
      margin: 16px 0;
      font-size: 13px;
    }
    .footer {
      padding: 16px 0;
      text-align: center;
      border-top: 1px solid #cccccc;
      font-size: 12px;
      color: #666666;
    }
    .link {
      word-break: break-all;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>

    <div class="content">
      <p>Hi ${firstName},</p>

      <p>
        We received a request to reset the password for your Actinova AI Tutor account.
        If you made this request, click the button below to reset your password.
      </p>

      <div class="reset-box">
        <p><strong>Reset Your Password</strong></p>
        <p>Click the button below to create a new password for your account:</p>
        <a href="${resetLink}" class="btn">Reset Password</a>
      </div>

      <div class="warning">
        <p><strong>Important Security Information:</strong></p>
        <ul style="margin: 8px 0; padding-left: 18px;">
          <li>This link will expire in 1 hour for security reasons.</li>
          <li>If you did not request this reset, you can ignore this email.</li>
          <li>Your password will remain unchanged until you use the link above.</li>
        </ul>
      </div>

      <p>If the button does not work, you can copy and paste this link into your browser:</p>
      <p class="link">${resetLink}</p>

      <p>If you did not request a password reset, you do not need to take any further action.</p>

      <p>Best regards,<br />The Actinova AI Tutor Team</p>
    </div>

    <div class="footer">
      <p>© 2024 Actinova AI Tutor. All rights reserved.</p>
      <p>
        This email was sent to you because a password reset was requested for this account.
      </p>
    </div>
  </div>
</body>
</html>
`;

// Email sending functions
export async function sendVerificationEmail({ to, name, token, code }) {
  try {
    const verificationLink = `${process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/auth/verify-email?token=${token}`;

    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const data = await transporter.sendMail({
      from: fromAddress,
      to: to,
      subject: "Welcome to Actinova AI Tutor: Verify Your Email",
      html: getEmailVerificationTemplate(name, verificationLink, code),
      text: `Hi ${name},

Thank you for joining Actinova AI Tutor. We are pleased to have you on board and look forward to supporting you in achieving your learning goals with our AI powered tutoring platform.

Your Verification Code

Please use the following 6 digit code to verify your email address:

${code}

This code will expire in 24 hours.

Or Verify Using the Link

You can also verify your email by using the link below:

${verificationLink}

Next Steps

After verifying your email, you can:

• Complete your profile setup
• Explore our AI powered courses
• Begin your personalized learning journey
• Track your progress with detailed analytics

If you did not create an account with Actinova AI Tutor, you can safely ignore this email.

Welcome to Actinova AI Tutor.

Best regards,
The Actinova AI Tutor Team`,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail({ to, name, token }) {
  try {
    const resetLink = `${process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/auth/reset-password?token=${token}`;

    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const data = await transporter.sendMail({
      from: fromAddress,
      to: to,
      subject: "Password Reset Request for Your Actinova AI Tutor Account",
      html: getPasswordResetTemplate(name, resetLink),
      text: `Hi ${name},

We received a request to reset the password for your Actinova AI Tutor account. If you made this request, use the link below to reset your password:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, you can ignore this email and your password will remain unchanged.

Best regards,
The Actinova AI Tutor Team`,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendWelcomeEmail({ to, name }) {
  try {
    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const data = await transporter.sendMail({
      from: fromAddress,
      to: to,
      subject: "Welcome to Actinova AI Tutor!",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Actinova AI Tutor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .container {
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 16px 0;
      border-bottom: 1px solid #cccccc;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
    }
    .content {
      padding: 20px 0;
      font-size: 14px;
    }
    .footer {
      padding: 16px 0;
      text-align: center;
      border-top: 1px solid #cccccc;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Actinova AI Tutor</h1>
    </div>

    <div class="content">
      <p>Hi ${name},</p>

      <p>
        Welcome to Actinova AI Tutor! Your email has been verified and your account is now active.
      </p>

      <p><strong>Get Started</strong></p>
      <p>Here's what you can do now:</p>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore our AI powered courses</li>
        <li>Begin your personalized learning journey</li>
        <li>Track your progress with detailed analytics</li>
      </ul>

      <p>We're excited to have you on board and look forward to supporting you in achieving your learning goals.</p>

      <p>Best regards,<br />The Actinova AI Tutor Team</p>
    </div>

    <div class="footer">
      <p>© 2024 Actinova AI Tutor. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`,
      text: `Hi ${name},

Welcome to Actinova AI Tutor! Your email has been verified and your account is now active.

Get Started

Here's what you can do now:

• Complete your profile setup
• Explore our AI powered courses
• Begin your personalized learning journey
• Track your progress with detailed analytics

We're excited to have you on board and look forward to supporting you in achieving your learning goals.

Best regards,
The Actinova AI Tutor Team`,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send a 6-digit password reset code via Nodemailer
export async function sendPasswordResetCodeEmail({ to, name, code }) {
  try {
    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const subject = "Your Actinova AI Tutor Password Reset Code";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Code</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; }
    .header { text-align: center; padding: 16px 0; border-bottom: 1px solid #ccc; }
    .code-box { border: 1px solid #ccc; padding: 16px; text-align: center; margin: 20px 0; }
    .code { font-family: monospace; font-size: 24px; letter-spacing: 4px; padding: 8px 12px; border: 1px solid #ccc; display: inline-block; }
    .footer { padding: 16px 0; text-align: center; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
  </style>
  </head>
  <body>
    <div class="header">
      <h1>Password Reset Code</h1>
    </div>
    <p>Hi ${name || "Learner"},</p>
    <p>Use the 6-digit code below to reset your password. This code expires in 15 minutes.</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p>If you didn't request this, you can ignore this email.</p>
    <div class="footer">© ${new Date().getFullYear()} Actinova AI Tutor</div>
  </body>
</html>`;

    const text = `Hi ${name || "Learner"},\n\nYour password reset code is: ${code}\nThis code expires in 15 minutes. If you didn't request this, ignore this email.\n\nActinova AI Tutor`;

    const data = await transporter.sendMail({
      from: fromAddress,
      to: to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send password change notification email
export async function sendPasswordChangeNotificationEmail({ to, name }) {
  try {
    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const data = await transporter.sendMail({
      from: fromAddress,
      to: to,
      subject: "Your Password Has Been Changed - Actinova AI Tutor",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Changed - Actinova AI Tutor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .container {
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      padding: 16px 0;
      border-bottom: 1px solid #cccccc;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
    }
    .content {
      padding: 20px 0;
      font-size: 14px;
    }
    .security-box {
      border: 1px solid #cccccc;
      padding: 16px;
      margin: 20px 0;
      background-color: #f9f9f9;
    }
    .footer {
      padding: 16px 0;
      text-align: center;
      border-top: 1px solid #cccccc;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Changed Successfully</h1>
    </div>

    <div class="content">
      <p>Hi ${name},</p>

      <p>
        This is a confirmation that your password for your Actinova AI Tutor account has been successfully changed.
      </p>

      <div class="security-box">
        <p><strong>Security Information:</strong></p>
        <ul>
          <li>If you made this change, no further action is required.</li>
          <li>If you did not make this change, please contact our support team immediately.</li>
          <li>You can change your password anytime from your account settings.</li>
        </ul>
      </div>

      <p>
        If you have any questions or concerns about your account security, please don't hesitate to contact us.
      </p>

      <p>Best regards,<br />The Actinova AI Tutor Team</p>
    </div>

    <div class="footer">
      <p>© 2024 Actinova AI Tutor. All rights reserved.</p>
      <p>
        This email was sent to you because your password was changed for this account.
      </p>
    </div>
  </div>
</body>
</html>
`,
      text: `Hi ${name},

This is a confirmation that your password for your Actinova AI Tutor account has been successfully changed.

Security Information:
• If you made this change, no further action is required.
• If you did not make this change, please contact our support team immediately.
• You can change your password anytime from your account settings.

If you have any questions or concerns about your account security, please don't hesitate to contact us.

Best regards,
The Actinova AI Tutor Team`,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send a contact form message to the receiver inbox
export async function sendContactMessageEmail({
  fromEmail,
  name,
  subject,
  message,
  category = "general",
}) {
  try {
    const toAddress = "briankipkemoi808@gmail.com";

    const fromAddress = process.env.SMTP_FROM || "Actinova AI Tutor <nonereply@actinova.com>";

    const safeSubject = subject?.trim() || "New Contact Message";
    const finalSubject = `Contact: ${category} - ${safeSubject}`.slice(0, 180);

    const createdAt = new Date();
    const createdAtStr = createdAt.toUTCString();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
  <style>
    body { font-family: Arial, sans-serif; color: #000; background: #fff; }
    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
    .box { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; }
    .label { font-weight: bold; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
  </style>
  </head>
  <body>
    <div class="container">
      <h2>New Contact Message</h2>
      <div class="box">
        <p><span class="label">From:</span> ${name || "Unknown"} &lt;${fromEmail || "no-email"}&gt;</p>
        <p><span class="label">Category:</span> ${category}</p>
        <p><span class="label">Subject:</span> ${safeSubject}</p>
        <p><span class="label">Received At:</span> ${createdAtStr}</p>
        <hr />
        <p class="label">Message:</p>
        <pre>${(message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      </div>
    </div>
  </body>
</html>`;

    const text = `New Contact Message\n\nFrom: ${name || "Unknown"} <${fromEmail || "no-email"}>\nCategory: ${category}\nSubject: ${safeSubject}\nReceived At: ${createdAtStr}\n\nMessage:\n${message || ""}`;

    const data = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: finalSubject,
      html,
      text,
      replyTo: fromEmail || undefined,
    });

    return { success: true, messageId: data?.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
