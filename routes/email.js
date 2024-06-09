// External modules
const express = require("express");
const Mailgun = require("mailgun-js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const connection = require("../config/database");
const User = connection.models.User;
const { isAdmin } = require("../routes/authMiddleware");

// Internal modules

// Configuration
const config = {
  api: {
    mailgunUrl: "https://api.eu.mailgun.net",
  },
  paths: {
    emailAttachments: path.join(__dirname, "../assets/emailAttachments"),
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API,
    domain: process.env.DOMAINMAILGUN,
    newsletterList: process.env.NEWSLETTER_LIST,
  },
};

const router = express.Router();
const mg = new Mailgun({
  apiKey: config.mailgun.apiKey,
  domain: config.mailgun.domain,
  url: config.api.mailgunUrl,
});
const list = mg.lists(config.mailgun.newsletterList);

router.use(express.json());

// Function to add a member to the newsletter list
async function addMemberToList(member) {
  try {
    const newMember = {
      subscribed: true,
      address: member.email,
      name: member.name,
    };
    const response = await list.members().create(newMember);
    return "Member added successfully";
  } catch (error) {
    throw new Error(`Failed to add member: ${error.message}`);
  }
}

// Function to delete all files in a directory
function deleteFilesInDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", filePath, err);
        } else {
          console.log("Deleted file:", filePath);
        }
      });
    });
  });
}

// Function to get all files in a directory
function getFilesInDirectory(directory) {
  try {
    const files = fs.readdirSync(directory); // Synchronous reading of the directory
    return files.map((file) => path.join(directory, file));
  } catch (err) {
    throw new Error(`Failed to read directory: ${err.message}`);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.paths.emailAttachments);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage }).array("attachment");

// Routes for email operations
router.post("/api/sendEmailAttachments", isAdmin, upload, (req, res) => {
  res.send("Files received and saved!");
});

// Routes for email operations
router.post("/api/sendEmailData", isAdmin, async (req, res) => {
  try {
    const { subject, html, recipientType, specificEmails } = req.body;
    const attachments = getFilesInDirectory(config.paths.emailAttachments);

    console.log("Attachments:", attachments);

    const emailData = {
      from: "SSC Personnel <SurySportingClub.SSC@gmail.com>",
      to: "", // This will be set in the switch case below
      subject: subject,
      html: html,
      inline: attachments,
    };

    let emailPromises = [];

    // Determine recipient type and collect email sending promises
    switch (recipientType) {
      case "specific":
        emailPromises = specificEmails.map((email) =>
          sendEmailPromise(email, emailData)
        );
        break;
      case "subscribers":
        emailData.to = config.mailgun.newsletterList;
        emailPromises.push(sendEmailPromise(emailData.to, emailData));
        break;
      case "members":
        const members = await User.find({ member: true });
        emailPromises = members.map((member) =>
          sendEmailPromise(member.email, emailData)
        );
        break;
    }

    // Wait for all emails to be sent
    const emailResults = await Promise.all(emailPromises);
    console.log("Emails sent:", emailResults);

    // Delete files after confirming emails are sent
    deleteFilesInDirectory(config.paths.emailAttachments);
    res.status(200).send("Emails sent successfully");
  } catch (error) {
    console.error("Failed to send emails:", error);
    res.status(500).send(error.message);
  }
});

// Helper function to return a promise for sending an email
function sendEmailPromise(to, emailData) {
  return new Promise((resolve, reject) => {
    const data = { ...emailData, to };
    mg.messages().send(data, function (error, body) {
      if (error) {
        console.error("Failed to send email to:", to, error);
        reject(error);
      } else {
        console.log("Email sent to:", to);
        resolve(body);
      }
    });
  });
}

router.post("/api/subscribeToNewsletter", async (req, res) => {
  const { email, fullName } = req.body;
  try {
    const response = await addMemberToList({ email, name: fullName });
    res.send(response);
  } catch (e) {
    // Use a regular expression to check for the specific error pattern
    const alreadyExistsPattern =
      /Failed to add member: Address already exists '(.+)'/;
    if (alreadyExistsPattern.test(e.message)) {
      console.log(e.message); // Log the specific error message for debugging
      res
        .status(409)
        .send(
          `The email address ${email} is already subscribed to the newsletter.`
        );
    } else {
      console.error("Subscription error:", e);
      res
        .status(500)
        .send("An error occurred while processing your subscription.");
    }
  }
});

module.exports = router;
