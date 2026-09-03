package config

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/joho/godotenv"
)

// SendPasswordResetEmail sends an HTML password reset email via Gmail SMTP.
func SendPasswordResetEmail(toEmail, resetLink string) error {
	// Reload .env from disk so credential changes take effect immediately without a server restart
	_ = godotenv.Overload()

	smtpHost := GetEnv("SMTP_HOST", "smtp.gmail.com")
	smtpPort := GetEnv("SMTP_PORT", "587")
	smtpUser := GetEnv("SMTP_USER", "")
	smtpPass := strings.ReplaceAll(GetEnv("SMTP_PASS", ""), " ", "")

	if smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	subject := "Reset Your OJT Tracker Password"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🔐 OJT Tracker</h1>
              <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">Password Reset Request</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Hi there,
              </p>
              <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your OJT Tracker account. Click the button below to set a new password. This link is valid for <strong style="color:#a5b4fc;">1 hour</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="%s" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">Reset My Password</a>
                  </td>
                </tr>
              </table>
              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="%s" style="color:#818cf8;font-size:13px;">%s</a>
              </p>
              <!-- Warning -->
              <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px 20px;">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  ⚠️ If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #334155;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">
                © 2025 OJT Tracker · This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, resetLink, resetLink, resetLink)

	msg := []byte("MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"From: OJT Tracker <" + smtpUser + ">\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n\r\n" +
		body)

	addr := smtpHost + ":" + smtpPort
	return smtp.SendMail(addr, auth, smtpUser, []string{toEmail}, msg)
}
