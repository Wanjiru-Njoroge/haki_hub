const crypto = require('crypto');

// Generate a random 64-byte string and convert it to a hexadecimal string
const secret = crypto.randomBytes(64).toString('hex');

// Output the secret
console.log('Generated session secret:', secret);
