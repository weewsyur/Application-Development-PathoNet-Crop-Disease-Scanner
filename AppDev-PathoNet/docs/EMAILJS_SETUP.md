# EmailJS Setup Guide for PathoNet OTP Verification

This guide will help you set up EmailJS to send OTP verification emails for PathoNet users.

## 📋 Prerequisites

- EmailJS account (free tier is sufficient for development)
- Gmail or other email service account
- PathoNet project with environment variables configured

## 🚀 Step-by-Step Setup

### 1. Create EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Add Email Service

1. After logging in, go to **Email Services** in the sidebar
2. Click **Add New Service**
3. Choose your email provider (recommended: **Gmail**)
4. Click **Connect Service** and follow the OAuth process
5. Grant EmailJS permission to send emails on your behalf

### 3. Create Email Template

1. Go to **Email Templates** in the sidebar
2. Click **Create New Template**
3. Fill in the template details:

#### Template Settings
```
Name: PathoNet OTP Verification
Subject: {{app_name}} - Your Verification Code
```

#### Email Content
```
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PathoNet Verification Code</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #10B981, #06B6D4);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }
        .title {
            color: #0F172A;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #475569;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .otp-container {
            background: linear-gradient(135deg, #D1FAE5, #E0F2FE);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: 800;
            color: #10B981;
            letter-spacing: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        .expiry {
            color: #64748b;
            font-size: 14px;
            margin-top: 15px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .security-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-note strong {
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌱</div>
            <h1 class="title">Verify Your Email</h1>
            <p class="subtitle">Welcome to {{app_name}}! Please use the verification code below to complete your registration.</p>
        </div>

        <div class="otp-container">
            <p style="margin: 0; color: #059669; font-weight: 600;">Your verification code is:</p>
            <div class="otp-code">{{otp_code}}</div>
            <p class="expiry">This code will expire in {{expiration_minutes}} minutes</p>
        </div>

        <div class="security-note">
            <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <p style="margin: 0; color: #64748b;">If you didn't request this code, you can safely ignore this email.</p>
        </div>

        <div class="footer">
            <p>Best regards,<br>The {{app_name}} Team</p>
            <p style="font-size: 12px; margin-top: 20px;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
```

### 4. Configure Template Variables

Make sure these variables are included in your template:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{to_email}}` | Recipient email address | `user@example.com` |
| `{{to_name}}` | Recipient name | `John Doe` |
| `{{otp_code}}` | 6-digit verification code | `123456` |
| `{{expiration_minutes}}` | Expiration time in minutes | `5` |
| `{{app_name}}` | Application name | `PathoNet` |

### 5. Get Your Credentials

1. **Service ID**: Go to **Email Services** → Click on your service → Copy Service ID
2. **Template ID**: Go to **Email Templates** → Click on your template → Copy Template ID  
3. **Public Key**: Go to **Account** → **General** → Copy Public Key

### 6. Configure Environment Variables

Create a `.env` file in your project root (or update existing):

```bash
# EmailJS Configuration
EXPO_PUBLIC_EMAILJS_SERVICE_ID=your_service_id_here
EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id_here
EXPO_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**Important**: Make sure your `.env` file is in your `.gitignore` to avoid exposing secrets.

### 7. Test the Setup

1. Start your PathoNet app
2. Try to create a new account
3. Check if you receive the OTP email
4. Verify the code works in the app

## 🔧 Troubleshooting

### Common Issues

**Issue: No email received**
- Check your spam/junk folder
- Verify EmailJS service is connected properly
- Ensure environment variables are set correctly

**Issue: Template variables not working**
- Make sure variable names match exactly (including double curly braces)
- Check that all required variables are being passed from the app

**Issue: Rate limiting**
- EmailJS free tier has monthly limits
- Consider upgrading to paid tier for production

**Issue: CORS errors**
- EmailJS handles CORS automatically
- Make sure you're using the correct EmailJS SDK version

### Debug Mode

Add this to your development environment to enable EmailJS logging:

```javascript
// In services/emailService.ts
emailjs.init(EMAILJS_PUBLIC_KEY, {
  publicKey: EMAILJS_PUBLIC_KEY,
  blockHeadless: false,
  limitRate: {
    id: 'app',
    throttle: 10000, // 10 seconds
  },
});
```

## 📧 Email Template Customization

### Brand Customization

You can customize the email template to match your brand:

```css
/* Update these colors in the template */
:root {
  --primary-color: #10B981;    /* PathoNet green */
  --secondary-color: #06B6D4;  /* PathoNet cyan */
  --text-color: #0F172A;       /* Dark text */
  --light-text: #64748b;       /* Light gray text */
}
```

### Alternative Text-Only Template

For better email client compatibility, consider this text-only version:

```
PathoNet - Email Verification

Hello {{to_name}},

Welcome to PathoNet! Your verification code is:

{{otp_code}}

This code will expire in {{expiration_minutes}} minutes.

Security Notice:
- Never share this code with anyone
- Our team will never ask for your verification code
- If you didn't request this code, you can safely ignore this email

Best regards,
The PathoNet Team
```

## 🚀 Production Considerations

### Email Service Provider

For production use, consider:
- **Gmail**: Good for development, but has sending limits
- **SendGrid**: Professional email service with better deliverability
- **Amazon SES**: Cost-effective for high volume
- **Mailgun**: Developer-friendly with good analytics

### Monitoring and Analytics

Set up email monitoring:
- Track delivery rates
- Monitor bounce rates
- Set up alerts for failed deliveries
- Use EmailJS dashboard analytics

### Security Best Practices

- Use environment variables for all credentials
- Implement rate limiting in your app
- Add email validation before sending OTP
- Consider adding reCAPTCHA for signup forms
- Regularly rotate your EmailJS API keys

## 📞 Support

If you need help:
- EmailJS Documentation: https://www.emailjs.com/docs/
- PathoNet GitHub Issues: [Your repo link]
- EmailJS Support: support@emailjs.com

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Compatible with**: PathoNet v1.0, EmailJS SDK v3.2.0
