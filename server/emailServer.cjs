const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
require("dotenv").config();
const fs = require("fs");
const cors = require("cors");

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Apply middleware
app.use(bodyParser.json());

// Configure CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Use a more specific allowlist in production
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173", // Vite's default port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "https://chathura.eversoft.lk",
      ];

      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Create reusable transporter with improved TLS options
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Add debug logging for SMTP connections
  debug: true,
  // Add TLS options for enhanced security
  tls: {
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
  },
});

// Verify connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send messages");
  }
});

// Function to get email template from filesystem with error handling
const getTemplate = async (template) => {
  try {
    const path = `./public/email-templates/${template}.html`;
    return fs.readFileSync(path, "utf8");
  } catch (error) {
    console.error(`Error reading template ${template}:`, error);
    throw new Error("Template not found");
  }
};

// Set up the POST method for email submission
app.post("/send-email", async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Where you want to receive emails
      subject: `New Contact Form Message from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Message: ${message}
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Failed to send email", details: err.message });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
