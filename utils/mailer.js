const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

async function sendOtp(to, otp) {
  await transporter.sendMail({
    from: `"Gen.Z Nepal" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email — Gen.Z Nepal',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:8px;border:1px solid #eee">
        <h2 style="color:#f57224;margin-bottom:8px">Gen.Z Nepal</h2>
        <p style="color:#555;margin-bottom:24px">Thanks for signing up! Use the code below to verify your email address.</p>
        <div style="background:#f5f5f5;border-radius:6px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#1a1a1a">${otp}</span>
        </div>
        <p style="color:#999;font-size:0.82rem">This code expires in 10 minutes. If you didn't sign up, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtp };
