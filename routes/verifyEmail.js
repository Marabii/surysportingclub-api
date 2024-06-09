const DOMAIN = process.env.DOMAINMAILGUN;
const mailgun = require("mailgun-js");
require("dotenv").config();

const mg = mailgun({
  apiKey: process.env.MAILGUN_API,
  domain: DOMAIN,
  url: "https://api.eu.mailgun.net",
});

const verifyEmail = async (email) => {
  const verificationCode =
    Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

  const data = {
    from: "Sury Sporting Club <SurySportingClub.SSC@gmail.com>",
    to: email,
    subject: "Email Verification",
    template: "emailVerification",
    "h:X-Mailgun-Variables": JSON.stringify({
      verificationCode: verificationCode,
    }),
  };

  // Return a promise that resolves with the verification code or rejects with an error
  return new Promise((resolve, reject) => {
    mg.messages().send(data, function (error, body) {
      if (error) {
        console.error("Failed to send email:", error);
        reject(new Error("Failed to send email"));
      } else {
        console.log("Email sent:", body);
        resolve(verificationCode);
      }
    });
  });
};

module.exports = verifyEmail;
