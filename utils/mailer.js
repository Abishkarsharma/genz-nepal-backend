const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const SUBJECTS = {
  signup: 'Verify your email — Gen.Z Nepal',
  reset: 'Reset your password — Gen.Z Nepal',
};

const TITLES = {
  signup: 'Verify your email address',
  reset: 'Reset your password',
};

const SUBTITLES = {
  signup: 'Use the code below to verify your email and complete signup.',
  reset: 'Use the code below to reset your password. It expires in 10 minutes.',
};

async function sendOtp(to, otp, type = 'signup') {
  const subject = SUBJECTS[type] || SUBJECTS.signup;
  const title = TITLES[type] || TITLES.signup;
  const subtitle = SUBTITLES[type] || SUBTITLES.signup;

  await transporter.sendMail({
    from: `"Gen.Z Nepal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px">
          <h1 style="color:white;margin:0;font-size:1.4rem;font-weight:800">Gen.Z Nepal</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:0.9rem">${title}</p>
        </div>
        <div style="padding:32px">
          <p style="color:#555;margin:0 0 24px;font-size:0.9rem;line-height:1.6">${subtitle}</p>
          <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:2.2rem;font-weight:800;letter-spacing:0.25em;color:#0f172a;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:0.78rem;margin:0;line-height:1.5">
            This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #eee">
          <p style="color:#cbd5e1;font-size:0.72rem;margin:0">© ${new Date().getFullYear()} Gen.Z Nepal. Crafted in Kathmandu.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOtp };
