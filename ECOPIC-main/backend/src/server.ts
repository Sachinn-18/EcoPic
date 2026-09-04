import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with CSP configuration for images and relaxed CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to check posts and image URLs
app.get('/debug/posts', async (_req, res) => {
  try {
    const pool = require('./utils/database').default;
    const result = await pool.query('SELECT id, image_url, description, created_at FROM posts ORDER BY created_at DESC LIMIT 5');
    res.json({ posts: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import postRoutes from './routes/posts'
import rewardsRoutes from './routes/rewards'

import fs from 'fs'

// Ensure uploads directory exists on startup
const uploadsPath = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
}

// Serve static files (uploaded images) with CORS
app.use('/uploads', (_req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(uploadsPath));
console.log('🖼️  Static files served from: uploads/');
console.log('🖼️  Example URL: http://localhost:' + PORT + '/uploads/[filename]');

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/rewards', rewardsRoutes)

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🌿 ReLeaf Backend server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});