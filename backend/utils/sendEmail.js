const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If SMTP is not configured, print to console for local testing
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('========================================================');
    console.log(`[Email Mock] To: ${options.to}`);
    console.log(`[Email Mock] Subject: ${options.subject}`);
    console.log(`[Email Mock] Text: \n${options.text}`);
    console.log('========================================================');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'SmartQR'} <${process.env.FROM_EMAIL || 'noreply@smartqr.app'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;
