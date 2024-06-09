const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

var passport = require("passport");
var crypto = require("crypto");

var loginAndRegisterRouter = require("./routes/index");
var emailRouter = require("./routes/email");
var addMatchRouter = require("./routes/addMatch");
var newsRouter = require("./routes/news.js");
var teamsRouter = require("./routes/teams");

const connection = require("./config/database");
const cors = require("cors");
const path = require("path");
const port = process.env.PORT || 3001;
const fs = require("fs");
const cookieParser = require("cookie-parser");

const User = connection.models.User;
const { connectDB } = require("./config/productsDataDB");
const multer = require("multer");
const { isAuth, isAdmin } = require("./routes/authMiddleware");

// Package documentation - https://www.npmjs.com/package/connect-mongo
const MongoStore = require("connect-mongo")(session);

/**
 * -------------- GENERAL SETUP ----------------
 */

// Gives us access to variables set in the .env file via `process.env.VARIABLE_NAME` syntax
require("dotenv").config();

// Create the Express application
var app = express();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/gif"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./assets/news/news-photos");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  },
});

const upload = multer({ storage: storage, fileFilter: fileFilter });

console.log("FRONT_END", process.env.FRONT_END);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://ssc.surysportingclub.com",
    ]; // Add more origins as needed
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow specific origins
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD", "DELETE"],
};

app.use(cors(corsOptions));

connectDB();

/**
 * -------------- SESSION SETUP ----------------
 */

const sessionStore = new MongoStore({
  mongooseConnection: connection,
  collection: "sessions",
});

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Need to require the entire Passport config module so app.js knows about it
require("./config/passport");

app.use(passport.initialize());
app.use(passport.session());

// Imports all of the routes from ./routes/index.js
app.use(loginAndRegisterRouter);
app.use(emailRouter);
app.use(addMatchRouter);
app.use(newsRouter);
app.use(teamsRouter);

app.use(express.static(path.join(__dirname, "assets")));

app.get("/api/getSponsors/query", async (req, res) => {
  const imagesPath = req.query.category;
  fs.readdir(
    path.join(__dirname, "assets", "sponsors", imagesPath),
    (err, files) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.json(files);
      }
    }
  );
});

app.get("/api/getImagesNames", async (req, res) => {
  fs.readdir(path.join(__dirname, "assets", "club-images"), (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.json(files);
    }
  });
});

app.get("/api/verifyUser", cookieParser(process.env.SECRET), (req, res) => {
  const userID = req?.user?._id;
  userID
    ? User.findById(userID).then((data) =>
        res.json({ isLoggedIn: req.isAuthenticated(), isAdmin: data.admin })
      )
    : res.json({ isLoggedIn: req.isAuthenticated(), isAdmin: false });
});

const clubImagesStorage = multer.diskStorage({
  destination: "./assets/club-images",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const sponsorImagesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `./assets/sponsors/${req.body.sponsorType}`;
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const clubImagesUpload = multer({ storage: clubImagesStorage, fileFilter });
const sponsorImagesUpload = multer({
  storage: sponsorImagesStorage,
  fileFilter,
});

// POST endpoint for uploading club images
app.post(
  "/api/addClubImage",
  isAdmin,
  clubImagesUpload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .send("No image uploaded. Please upload a valid image file.");
    } else {
      res.status(200).send({
        message: "Club image uploaded successfully",
        fileName: req.file.filename,
      });
    }
  }
);

// POST endpoint for uploading sponsor images
app.post(
  "/api/addSponsorImage",
  isAdmin,
  sponsorImagesUpload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .send("No image uploaded. Please upload a valid image file.");
    } else {
      res.status(200).send({
        message: "Sponsor image uploaded successfully",
        fileName: req.file.filename,
      });
    }
  }
);

app.delete("/api/deleteImage", isAdmin, (req, res) => {
  const imageName = req.body.imageName;
  const imagePath = path.join(__dirname, "assets/club-images", imageName);

  fs.unlink(imagePath, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error deleting image");
    }
    res.send({ message: "Image deleted successfully" });
  });
});

/**
 * -------------- SERVER ----------------
 */

// Server listens on http://localhost:3001
app.listen(port, () => {
  console.log(`listening on port : ${port}`);
});
