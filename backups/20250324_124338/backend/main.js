
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 8000;
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// Middleware
const cors = require('cors');

app.use(cors({
  origin: 'http://10.0.0.200:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.options('*', cors()); // <-- this allows preflight across all routes

app.use(express.json());

// Routes
app.use('/api/products', productRoutes);


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => console.error(err));
