const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');

dotenv.config();

// Create a connection with the database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Set up body-parser for handling form data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Your EJS files will be in the 'views' folder

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Test connection to the database
db.connect((err) => {
  if (err) {
    return console.log('Error connecting to the database:', err);
  }
  return console.log('Connected to the database successfully:', db.threadId);
});

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

// OpenAI API interaction
app.get('/openAi', (req, res) => {
  res.render('openAi', { question: '', response: '' }); // Initialize with empty values
});

app.post('/openAi', async (req, res) => {
  try {
    const userInput = req.body.question || '';
    console.log('User Input:', userInput); // Log user input
    
    // OpenAI API call with correct structure
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",  // Use the latest model
      messages: [{ role: "user", content: userInput }],
    });

    const aiResponse = completion.choices[0].message.content.trim();
    console.log('AI Response:', aiResponse); // Log AI response
    
    res.render('openAi', {
      question: userInput,    // Reflect back the user's question
      response: aiResponse    // Show the AI response
    });
  } catch (err) {
    console.error('Error:', err); // Log the error
    res.render('openAi', {
      question: req.body.question || '',
      response: 'Error: Unable to get response from AI.',
      error: err.message
    });
  }
});

// Route to display the form for creating or editing a lawyer's profile
app.get('/lawyersProfile', (req, res) => {
  res.render('lawyersProfile');  // This will render the lawyersProfile.ejs form
});

// Save lawyer profile data
// Route to handle the form submission and save the lawyer's profile
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


// Display individual lawyer profile
// Route to display all saved lawyer profiles
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


// Display all lawyer profiles
app.get('/lawyers', (req, res) => {
  const query = "SELECT * FROM lawyers";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send('Error fetching lawyers');
    }
    res.render('lawyer', { lawyers: results }); // Render the lawyer.ejs file
  });
});

// Login page route
app.get('/login', (req, res) => { 
  res.sendFile(path.join(__dirname, 'login.html')); 
});

// Consultation Booking route
app.get('/book-consultation', (req, res) => {
  res.sendFile(path.join(__dirname, 'book-consultation.html'));
});

// Consultation Management route
app.get('/manage-consultation', (req, res) => {
  res.sendFile(path.join(__dirname, 'manage-consultation.html'));
});

// Test if the server is running
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
