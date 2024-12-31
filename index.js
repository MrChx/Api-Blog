const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const router = require('./routes/route');
require('dotenv').config();

const app = express();
app.use(cors({credentials: true, origin: "http://localhost:3001"})); 
app.use(express.json({extended: true})); 
app.use(express.urlencoded({extended: true}));

app.use(router)

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB Connected!');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1); 
  }
};

const startServer = () => {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

connectDB().then(startServer).catch((err) => {
  console.error('Error starting server:', err);
});
