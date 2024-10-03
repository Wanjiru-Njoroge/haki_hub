const express = require('express');
const path = require('path');
const app = express();

// Set the port
const port = process.env.PORT || 3000;

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,  'index.html'));
});

// About Us route
app.get('/legal-resources', (req, res) => {
  res.sendFile(path.join(__dirname,  'legal-resources.html'));
});

// Lawyers page route
app.get('/lawyers', (req, res) => {
  res.sendFile(path.join(__dirname,  'lawyer.html'));
});

app.get('/login', (req, res) => { 
    res.sendFile(path.join(__dirname,  'login.html')); 
  });
// Consultation Booking route
app.get('/book-consultation', (req, res) => {
  res.sendFile(path.join(__dirname,  'book-consultation.html'));
});

// Consultation Management route
app.get('/manage-consultation', (req, res) => {
  res.sendFile(path.join(__dirname,  'manage-consultation.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
