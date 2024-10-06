const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');

const LocalStrategy = require('passport-local').Strategy;
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables
dotenv.config();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Your EJS files will be in the 'views' folder

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.Generated_session_secret,
  resave: false,
  saveUninitialized: false
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Create a connection with the database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Test connection to the database
db.connect((err) => {
  if (err) {
    return console.log('Error connecting to the database:', err);
  }
  return console.log('Connected to the database successfully:', db.threadId);
});

// OpenAI setup
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);  // Save files in 'uploads/' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));  // Rename file with timestamp
  }
});

// Set up multer to handle image uploads
const upload = multer({ storage: storage });

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Legal Resources route
app.get('/legal-resources', (req, res) => {
  const query = 'SELECT * FROM legal_resources';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send('Error fetching legal resources');
    }
    res.render('legal-resources', { resources: results });
  });
});

// Route to display the form for creating or editing a lawyer's profile
app.get('/lawyersProfile', (req, res) => {
  res.render('lawyersProfile');  // This will render the lawyersProfile.ejs form
});

// Save lawyer profile data
app.post('/lawyersProfile/save', upload.single('image'), (req, res) => {
  const { name, description, specialization, location, email, phone_number, license_number, availability } = req.body;
  const image = req.file.filename;

  const query = "INSERT INTO lawyers (image, name, description, specialization, location, email, phone_number, license_number, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  db.query(query, [image, name, description, specialization, location, email, phone_number, license_number, availability], (err, result) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send('Error saving lawyer profile');
    }
    res.redirect('/lawyer');  // After saving, redirect to the page that shows all lawyer profiles (lawyer.ejs)
  });
});

// Display all lawyer profiles
app.get('/lawyer', (req, res) => {
  const query = "SELECT * FROM lawyers";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send('Error fetching lawyers');
    }
    res.render('lawyer', { lawyers: results });  // Render lawyer.ejs with the list of lawyers
  });
});

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Sign-up page route
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// Consultation Booking route
app.get('/book-consultation', (req, res) => {
  res.sendFile(path.join(__dirname, 'book-consultation.html'));
});

// Consultation Management route
app.get('/manage-consultation', (req, res) => {
  res.sendFile(path.join(__dirname, 'manage-consultation.html'));
});

// AI Interaction route
app.get('/Ai', (req, res) => {
  res.render('Ai', { question: '', response: '' }); // Render the form initially
});

app.post('/Ai', async (req, res) => {
  const { question } = req.body; // Get the user's input from the form

  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Start the interactive chat
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Great to meet you. What would you like to know?' }],
        },
      ],
    });

    // Send user's question as a message to the chat
    let result = await chat.sendMessage(question);
    let response = result.response.text();
    response = response.replace(/\*/g, '');

    // Render the result on the page
    res.render('Ai', { question, response });
  } catch (error) {
    console.error('Error generating AI response:', error);
    res.render('Ai', {
      question,
      response: 'Sorry, there was an error generating the response. Please try again.',
    });
  }
});

// Sign Up Route
app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  console.log('Signup Data:', req.body); // Debugging

  // Validate the input
  if (!name || !email || !password || password !== confirmPassword) {
    if (!name) return res.status(400).send('Name is required.');
    if (!email) return res.status(400).send('Email is required.');
    if (!password) return res.status(400).send('Password is required.');
    if (password !== confirmPassword) return res.status(400).send('Passwords do not match.');
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database using password_hash
    await db.promise().query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hashedPassword]);

    // Redirect to login page after signup
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving user.');
  }
});

// Passport Local Strategy
passport.use(new LocalStrategy(
  async (email, password, done) => {
    try {
      const [userRows] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
      if (userRows.length === 0) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      const user = userRows[0];

      // Compare entered password with the hashed password in the database
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize user
passport.serializeUser(function(user, done) {
  done(null, user.user_id);
});

// Deserialize user
passport.deserializeUser(async function(id, done) {
  const [userRows] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [id]);
  if (userRows.length > 0) {
    done(null, userRows[0]);
  } else {
    done(new Error('User not found'));
  }
});

// Login Route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

// Middleware to check authentication
function checkAuthentication(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login'); // Redirect if not authenticated
  }
  next(); // Proceed to the next middleware or route handler
}

// User Profile Route with Authentication
app.get('/user/:userId', checkAuthentication, async (req, res) => {
  const userId = req.params.userId;

  try {
    const [userRows] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [userId]);

    if (userRows.length > 0) {
      res.render('userProfile', { user: userRows[0] });
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user data');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
