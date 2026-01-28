import nodemailer from "nodemailer";
import dotenv from "dotenv";

// 1. FORCE LOAD .ENV
dotenv.config(); 

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Hardcoded for testing to bypass the 127.0.0.1 error
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // This must be loaded from .env
    pass: process.env.SMTP_PASS, // This must be loaded from .env
  },
});

export const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Debug Log: Check if password is loaded (Don't share this log)
    if (!process.env.SMTP_PASS) {
        console.error("❌ ERROR: SMTP_PASS is missing in .env file");
        return false;
    }

    console.log(`📧 Sending email to: ${to}...`);

    const info = await transporter.sendMail({
      from: `"Smart Campus" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log("✅ Email sent successfully! ID:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    if (error.response) {
        console.error("GMAIL Error:", error.response);
    }
    return false;
  }
};