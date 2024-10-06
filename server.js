// Import required dependencies
const express = require("express");
const app = express();
const path = require("path");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const session = require("express-session");
const passport = require("passport");
const flash = require("express-flash");
const LocalStrategy = require("passport-local").Strategy;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

// Load environment variables from .env file
dotenv.config();

// Set up view engine and views directory
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware setup
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));
// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session middleware for user sessions
app.use(
  session({
    secret: process.env.Generated_session_secret,
    resave: false,
    saveUninitialized: false,
  })
);

// Enable flash messages for user feedback
app.use(flash());

// Initialize Passport.js for authentication
app.use(passport.initialize());
app.use(passport.session());

// Database connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test database connection
db.connect((err) => {
  if (err) {
    return console.log("Error connecting to the database:", err);
  }
  return console.log("Connected to the database successfully:", db.threadId);
});

// Set up Google's Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Configure Passport Local Strategy for authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Check if user exists in database
        const [userRows] = await db
          .promise()
          .query("SELECT * FROM users WHERE email = ?", [email]);
        if (userRows.length === 0) {
          return done(null, false, { message: "Incorrect email or password." });
        }
        const user = userRows[0];

        // Verify password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser(function (user, done) {
  done(null, user.user_id);
});

// Deserialize user from the session
passport.deserializeUser(async function (id, done) {
  try {
    const [userRows] = await db
      .promise()
      .query("SELECT * FROM users WHERE user_id = ?", [id]);
    if (userRows.length > 0) {
      done(null, userRows[0]);
    } else {
      done(new Error("User not found"));
    }
  } catch (err) {
    done(err);
  }
});

// Middleware to check if user is authenticated
function checkAuthentication(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  next();
}

// Route Handlers

// Home page route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Login routes
app.get("/login", (req, res) => {
  res.render("login", { messages: req.flash() });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/user",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

// Signup routes
app.get("/signup", (req, res) => {
  res.render("signup", { messages: req.flash() });
});

// Handle user registration
app.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  try {
    // Validate input
    if (!name || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/signup");
    }
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("/signup");
    }

    // Check for existing user
    const [existingUsers] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      req.flash("error", "Email already registered.");
      return res.redirect("/signup");
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await db
      .promise()
      .query(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        [name, email, hashedPassword]
      );

    req.flash("success", "Registration successful. Please log in.");
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "An error occurred during registration.");
    res.redirect("/signup");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error(err);
      return next(err);
    }
    res.redirect("/");
  });
});

// Legal resources route - fetches and displays legal resources
app.get("/legal-resources", (req, res) => {
  const query = "SELECT * FROM legal_resources";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).send("Error fetching legal resources");
    }
    res.render("legal-resources", { resources: results });
  });
});

// Lawyer profile routes
app.get("/lawyersProfile", checkAuthentication, (req, res) => {
  res.render("lawyersProfile");
});

// Save lawyer profile with image upload
app.post(
  "/lawyersProfile/save",
  checkAuthentication,
  upload.single("image"),
  (req, res) => {
    const {
      name,
      description,
      specialization,
      location,
      email,
      phone_number,
      license_number,
      availability,
    } = req.body;
    const image = req.file.filename;

    // Insert lawyer profile into database
    const query =
      "INSERT INTO lawyers (image, name, description, specialization, location, email, phone_number, license_number, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(
      query,
      [
        image,
        name,
        description,
        specialization,
        location,
        email,
        phone_number,
        license_number,
        availability,
      ],
      (err, result) => {
        if (err) {
          console.error("Database Error:", err);
          req.flash("error", "Error saving lawyer profile");
          return res.redirect("/lawyersProfile");
        }
        req.flash("success", "Profile saved successfully");
        res.redirect("/lawyer");
      }
    );
  }
);

// Display all lawyers
app.get("/lawyer", (req, res) => {
  const query = "SELECT * FROM lawyers";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      req.flash("error", "Error fetching lawyers");
      return res.redirect("/");
    }
    res.render("lawyer", { lawyers: results });
  });
});

// User profile routes
app.get("/user", checkAuthentication, (req, res) => {
  res.redirect(`/user/${req.user.user_id}`);
});

// Display specific user profile
app.get("/user/:userId", checkAuthentication, async (req, res) => {
  const userId = req.params.userId;

  try {
    const [userRows] = await db
      .promise()
      .query("SELECT * FROM users WHERE user_id = ?", [userId]);

    if (userRows.length > 0) {
      const isOwnProfile = req.user.user_id === parseInt(userId);
      res.render("user", {
        user: userRows[0],
        isOwnProfile: isOwnProfile,
      });
    } else {
      req.flash("error", "User not found");
      res.redirect("/");
    }
  } catch (err) {
    console.error(err);
    req.flash("error", "Error fetching user data");
    res.redirect("/");
  }
});

// AI chat routes
app.get("/Ai", checkAuthentication, (req, res) => {
  res.render("Ai", { question: "", response: "" });
});

// Handle AI chat requests
app.post("/Ai", checkAuthentication, async (req, res) => {
  const { question } = req.body;

  try {
    // Initialize AI model and chat
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
        {
          role: "model",
          parts: [{ text: "Great to meet you. What would you like to know?" }],
        },
      ],
    });

    // Get AI response
    let result = await chat.sendMessage(question);
    let response = result.response.text();
    response = response.replace(/\*/g, "");

    res.render("Ai", { question, response });
  } catch (error) {
    console.error("Error generating AI response:", error);
    req.flash("error", "Error generating AI response");
    res.render("Ai", {
      question,
      response:
        "Sorry, there was an error generating the response. Please try again.",
    });
  }
});

// Consultation booking routes
router.get("/book-consultation", checkAuthentication, (req, res) => {
  const sql = "SELECT * FROM lawyers";
  db.query(sql, (error, lawyers) => {
    if (error) throw error;
    res.render("book-consultation", { lawyers });
  });
});

// Handle consultation booking
app.post("/book-consultation", (req, res) => {
  const { user_id, lawyer_id, date, time } = req.body;

  const sql =
    "INSERT INTO consultations (user_id, lawyer_id, date, time) VALUES (?, ?, ?, ?)";
  db.query(sql, [clientName, lawyerName, date, time], (error, results) => {
    if (error) throw error;
    res.redirect("/manage-consultation");
  });
});

// Handle consultation submission
app.post("/submit-consultation", (req, res) => {
  const { user_name, lawyer_name, date, time } = req.body;

  const sql =
    "INSERT INTO consultations (user_name, lawyer_name, date, time) VALUES (?, ?, ?, ?)";
  db.query(sql, [user_name, lawyer_name, date, time], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("Internal Server Error");
    }
    res.redirect("/manage-consultation");
  });
});

// Manage consultations route
router.get("/manage-consultation", checkAuthentication, (req, res) => {
  const sql = "SELECT * FROM consultations";
  db.query(sql, (error, results) => {
    if (error) throw error;
    res.render("manage-consultation", { consultations: results });
  });
});

// Use the router
app.use("/", router);

// Export the router for use in other files
module.exports = router;

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
