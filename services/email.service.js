const nodemailer = require('nodemailer');

// Create Gmail transporter with App Password
const createTransporter = () => {
  // Check if Gmail credentials are configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️ Gmail credentials not configured.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const emailService = {
  sendOTP: async (email, otp, name) => {
    const transporter = createTransporter();

    // If transporter is not configured, log OTP to console
    if (!transporter) {
      console.warn('⚠️ Gmail not configured. Email will not be sent.');
      console.log(`📧 OTP for ${email}: ${otp}`);
      // Don't throw error in development - allow registration to continue
      if (process.env.NODE_ENV === 'development') {
        return { success: true, message: 'OTP logged to console' };
      }
      throw new Error('Email service not configured');
    }

    try {
      const mailOptions = {
        from: `"ExpenseTracker" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - ExpenseTracker',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to ExpenseTracker! 🎉</h1>
                </div>
                <div class="content">
                  <p>Hi ${name},</p>
                  <p>Thank you for signing up! Please verify your email address by entering the OTP code below:</p>
                  
                  <div class="otp-box">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">This code will expire in 10 minutes</p>
                  </div>
                  
                  <p>If you didn't create an account, please ignore this email.</p>
                  
                  <div class="footer">
                    <p>Best regards,<br>The ExpenseTracker Team</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${email}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      
      return info;
    } catch (error) {
      console.error('Gmail service error:', error);
      // In development, log OTP and don't fail
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 OTP for ${email}: ${otp}`);
        return { success: true, message: 'OTP logged to console (email failed)' };
      }
      throw error;
    }
  },

  // Test email configuration
  testConnection: async () => {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, message: 'Gmail credentials not configured' };
    }

    try {
      await transporter.verify();
      console.log('✅ Gmail connection verified successfully');
      return { success: true, message: 'Gmail connection successful' };
    } catch (error) {
      console.error('❌ Gmail connection failed:', error);
      return { success: false, message: error.message };
    }
  },
};

module.exports = emailService;
