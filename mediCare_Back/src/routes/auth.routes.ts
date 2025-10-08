import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller.js';

const router = Router();

// Validation middleware
const loginValidation = [
  body('emailOrPhone')
    .notEmpty()
    .withMessage('Email ou numéro de téléphone requis')
    .custom((value) => {
      // Check if it's a valid email or phone number
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?[0-9\s\-\(\)]{8,15}$/.test(value);

      if (!isEmail && !isPhone) {
        throw new Error('Veuillez fournir un email ou numéro de téléphone valide');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Mot de passe doit contenir au moins 4 caractères')
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  body('phoneNumber')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('userType')
    .isIn(['tuteur', 'medecin', 'patient'])
    .withMessage('User type must be one of: tuteur, medecin, patient')
];

// Routes
router.post('/login', loginValidation, authController.login);
router.post('/register', registerValidation, authController.register);
router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);

// Verification code routes
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code', authController.verifyCode);
router.post('/reset-password-with-code', authController.resetPasswordWithCode);

export default router;
