import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import tutorRoutes from './routes/tutor.routes.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { notificationScheduler } from './services/notificationScheduler.service.js';
import { schedulerService } from './services/scheduler.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static file serving for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'mediCare Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Simple test endpoint
app.post('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    body: req.body
  });
});

// Test doctor endpoint (without auth for debugging)
app.get('/api/medecin/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Doctor endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Test doctor dashboard endpoint (without auth for debugging)
app.get('/api/medecin/test-dashboard', async (req: Request, res: Response) => {
  try {
    const doctorService = await import('./services/doctor.service.js');
    const dashboardData = await doctorService.default.getDashboardData('test-doctor-id');
    res.json({
      success: true,
      message: 'Doctor dashboard test successful',
      data: dashboardData
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: 'Doctor dashboard test failed',
      error: error.message
    });
  }
});

// Debug token endpoint (with auth to see user info)
app.get('/api/debug/token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.json({
        success: false,
        message: 'No token provided',
        hasToken: false
      });
    }
    
    // Import auth service
    const authService = await import('./services/auth.service.js');
    const payload = authService.default.verifyToken(token);
    
    if (!payload) {
      return res.json({
        success: false,
        message: 'Invalid token',
        hasToken: true,
        tokenValid: false
      });
    }
    
    res.json({
      success: true,
      message: 'Token is valid',
      hasToken: true,
      tokenValid: true,
      userInfo: {
        userId: payload.userId,
        userType: payload.userType,
        sessionId: payload.sessionId,
        permissions: payload.permissions,
        exp: payload.exp,
        iat: payload.iat
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: 'Error processing token',
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/medecin', doctorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server also accessible on network: http://192.168.1.116:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start the scheduler service
  schedulerService.start();

  // Start notification scheduler
  console.log('🔔 Starting notification scheduler...');
  notificationScheduler.start();
});
