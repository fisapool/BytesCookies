import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import supportRoutes from './routes/support.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['chrome-extension://*'] 
      : ['http://localhost:3000', 'chrome-extension://*'];
    
    if (!origin || allowedOrigins.some(allowed => 
      allowed.includes('*') ? origin.startsWith(allowed.replace('*', '')) : origin === allowed
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/support', supportRoutes);

// Protected routes
app.use('/api', authMiddleware);

// Protected test route
app.get('/api/protected', (_req, res) => {
  res.json({ message: 'You have access to protected route', user: _req.user });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// Test route
app.get('/', (_req, res) => {
  res.json({ message: 'BytesCookies API is running!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 