const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: "",
    pass: "",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendmail = async (mailOptions, transporter) => {
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { transporter, sendmail };
