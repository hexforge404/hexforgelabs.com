const editorRouter = require('./routes/editor');
const express = require('express');
const mongoose = require('mongoose');
const blogRoutes = require('./routes/blog');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const toolRoutes = require('./routes/tools');
const path = require('path');                   // ⬅️ move up here
const uploadsRouter = require('./routes/uploads'); // ⬅️ and this
const scriptLabRoutes = require('./routes/scriptLab');

require('dotenv').config();

// Initialize app
const app = express();
app.set('trust proxy', (ip) => {
  return ip === '127.0.0.1' || ip.startsWith('172.') || ip.startsWith('10.') || ip.includes('::ffff:'); 
});
app.disable('x-powered-by');

// Existing static dirs for general assets
app.use(express.static('public'));
app.use(express.static('frontend/build'));

// Shared images directory (this is where multer will write)
const IMAGES_DIR = process.env.IMAGES_DIR || path.join(__dirname, '..', 'uploads');


// Serve uploaded images at /images/filename.ext
app.use('/images', express.static(IMAGES_DIR));

// (Optional) ALSO serve any pre-bundled images from frontend/public/images
app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));







const PORT = process.env.PORT || 8000;

// ======================
// ENHANCED CORS CONFIG
// ======================
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://10.0.0.200:3000',
  'https://10.0.0.200',
  'http://frontend:3000',
];
const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];
const exposedHeaders = ['set-cookie'];
const maxAge = 24 * 60 * 60; // 1 day in seconds
const credentials = true; // Allow credentials (cookies, authorization headers, etc.)
const preflightContinue = false; // Preflight requests should not be passed to the next handler
const optionsSuccessStatus = 200; // Some legacy browsers (IE11, various SmartTVs) choke on 204


const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200
};

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
});

// ======================
// BODY PARSING
// ======================
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());


// ======================
// SESSION CONFIGURATION
// ======================
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'hexforge.sid',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ======================
// ROUTES
// ======================
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const newsletterRoutes = require('./routes/newsletter');
const memoryRoutes = require("./routes/memory");
const notionRoutes = require('./routes/notion');
const mcpRoutes = require('./routes/mcp');
const userAuthRoutes = require('./routes/userAuth');
const assistantSessionsRoutes = require('./routes/assistantSessions');
const assistantProjectsRouter = require("./routes/assistantProjects");



app.use("/api/assistant-projects", assistantProjectsRouter);
app.use('/api/mcp', mcpRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use("/api/memory", memoryRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/blog', blogRoutes);
app.use('/tool', toolRoutes);

app.use('/api/editor', editorRouter);
app.use('/api/tools', toolRoutes);
app.use('/api/uploads', uploadsRouter);
app.use('/api/script-lab', apiLimiter, scriptLabRoutes);
app.use('/api/users', userAuthRoutes);
app.use('/api/assistant-sessions', apiLimiter, assistantSessionsRoutes);

// ======================
// HEALTH CHECK
// ======================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// ======================
// DATABASE CONNECTION
// ======================
const mongooseOptions = {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
};

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🛡️  CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });

    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed');
        process.exit(0);
      });
    });
  })
  .catch(err => {
    console.error('❌ MongoDB initial connection error:', err);
    process.exit(1);
  });

  

// ======================
// ERROR HANDLERS
// ======================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('⚠️  Server error:', err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  process.exit(1);
});
