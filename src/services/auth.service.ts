import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { LoginRequest, LoginResponse, RegisterRequest, JWTPayload } from '../types/auth.types.js';
import { smsService } from './sms.service.js';
import { normalizePhoneNumber, normalizeEmail } from '../utils/phoneNormalizer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory storage for verification codes (in production, use Redis)
const verificationCodes = new Map<string, { code: string; timestamp: number }>();

// Clean up expired codes (older than 10 minutes)
const cleanupExpiredCodes = () => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [key, value] of verificationCodes.entries()) {
    if (now - value.timestamp > tenMinutes) {
      verificationCodes.delete(key);
    }
  }
};

export class AuthService {
  /**
   * Generate JWT token with the specified payload structure
   */
  private generateToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  /**
   * Get user permissions based on user type
   */
  private getUserPermissions(userType: 'tuteur' | 'medecin' | 'patient'): string[] {
    const permissions = {
      tuteur: [
        'read:patient',
        'read:medication',
        'read:reminder',
        'create:reminder',
        'update:reminder',
        'read:alert',
        'create:alert',
        'read:voice_message',
        'create:voice_message'
      ],
      medecin: [
        'read:patient',
        'create:patient',
        'update:patient',
        'read:medication',
        'create:medication',
        'update:medication',
        'delete:medication',
        'read:prescription',
        'create:prescription',
        'update:prescription',
        'delete:prescription',
        'read:reminder',
        'create:reminder',
        'update:reminder',
        'read:alert',
        'create:alert',
        'read:voice_message',
        'create:voice_message'
      ],
      patient: [
        'read:own_medication',
        'read:own_reminder',
        'update:own_reminder',
        'read:own_alert',
        'read:own_voice_message',
        'create:own_voice_message'
      ]
    };

    return permissions[userType] || [];
  }

  /**
   * Create user session
   */
  private async createUserSession(userId: string, deviceInfo?: string): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    // Check if user already has a session and update it, otherwise create new one
    const existingSession = await prisma.userSession.findUnique({
      where: { userId }
    });

    if (existingSession) {
      // Update existing session
      await prisma.userSession.update({
        where: { userId },
        data: {
          id: sessionId,
          sessionToken: sessionId,
          deviceInfo: deviceInfo || 'Unknown device',
          expiresAt,
          lastActivity: new Date()
        }
      });
    } else {
      // Create new session
      await prisma.userSession.create({
        data: {
          id: sessionId,
          userId,
          sessionToken: sessionId,
          deviceInfo: deviceInfo || 'Unknown device',
          expiresAt
        }
      });
    }

    return sessionId;
  }

  /**
   * Login user with email/phone and password
   */
  async login(loginData: LoginRequest, deviceInfo?: string): Promise<LoginResponse> {
    try {
      const { emailOrPhone, password, pushToken } = loginData;

      // Trim and clean the input
      const cleanInput = emailOrPhone.trim();

      // Determine if input is email or phone number
      const isEmail = cleanInput.includes('@');
      const isPhone = /^\+?[0-9\s\-\(\)]+$/.test(cleanInput.replace(/\s/g, ''));

      console.log('🔐 Login attempt:', { 
        input: cleanInput, 
        isEmail, 
        isPhone 
      });

      let user = null;

      if (isEmail) {
        // Find user by email
        const emailNormalized = normalizeEmail(cleanInput);
        console.log('📧 Searching for email:', emailNormalized);
        user = await prisma.user.findUnique({
          where: { email: emailNormalized }
        });
        console.log('📧 Email search result:', user ? `Found user ${user.id}` : 'Not found');
      } else if (isPhone) {
        // Normalize phone number
        const phoneResult = normalizePhoneNumber(cleanInput);
        console.log('📱 Normalized phone:', phoneResult.normalized);
        console.log('🔍 Trying phone formats:', phoneResult.formats);

        if (!phoneResult.isValid) {
          console.warn('⚠️ Invalid phone format:', cleanInput);
          return {
            success: false,
            message: 'Format de numéro de téléphone invalide'
          };
        }

        // Find user by phone number (try all possible formats)
        user = await prisma.user.findFirst({
          where: {
            OR: phoneResult.formats.map(phone => ({ phoneNumber: phone }))
          }
        });
        console.log('📱 Phone search result:', user ? `Found user ${user.id}` : 'Not found');
      } else {
        console.warn('⚠️ Input is neither valid email nor phone:', cleanInput);
      }

      if (!user) {
        console.log('❌ Login failed: User not found');
        if (isEmail) {
          return {
            success: false,
            message: 'Aucun compte trouvé avec cette adresse e-mail'
          };
        } else {
          return {
            success: false,
            message: 'Aucun compte trouvé avec ce numéro de téléphone'
          };
        }
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated. Please contact support.'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        console.log('❌ Login failed: Invalid password');
        return {
          success: false,
          message: 'Mot de passe incorrect'
        };
      }

      // Create user session
      const sessionId = await this.createUserSession(user.id, deviceInfo);

      // Update last login and push token if provided
      const updateData: any = { lastLogin: new Date() };

      // 🔥 AUTOMATICALLY SAVE PUSH TOKEN ON LOGIN
      if (pushToken) {
        updateData.expoPushToken = pushToken;
        console.log(`📱 Auto-saving push token for user ${user.id}: ${pushToken}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      // Generate JWT token
      const permissions = this.getUserPermissions(user.userType);
      const tokenPayload: Omit<JWTPayload, 'exp' | 'iat'> = {
        userId: user.id,
        userType: user.userType,
        sessionId,
        permissions
      };

      const token = this.generateToken(tokenPayload);

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          phoneNumber: user.phoneNumber
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Register new user
   */
  async register(registerData: RegisterRequest): Promise<LoginResponse> {
    try {
      const { email, password, firstName, lastName, phoneNumber, userType } = registerData;

      // Normalize email and phone
      const emailNormalized = normalizeEmail(email);
      const phoneResult = normalizePhoneNumber(phoneNumber);

      console.log('📝 Registration attempt:');
      console.log('  📧 Email:', emailNormalized);
      console.log('  📱 Phone (normalized):', phoneResult.normalized);

      // Validate phone number
      if (!phoneResult.isValid) {
        return {
          success: false,
          message: 'Format de numéro de téléphone invalide'
        };
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: emailNormalized }
      });

      if (existingEmail) {
        return {
          success: false,
          message: 'Un compte existe déjà avec cet email'
        };
      }

      // Check if phone already exists (try all formats)
      const existingPhone = await prisma.user.findFirst({
        where: {
          OR: phoneResult.formats.map(phone => ({ phoneNumber: phone }))
        }
      });

      if (existingPhone) {
        return {
          success: false,
          message: 'Un compte existe déjà avec ce numéro de téléphone'
        };
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with normalized data
      const user = await prisma.user.create({
        data: {
          email: emailNormalized,
          passwordHash,
          firstName,
          lastName,
          phoneNumber: phoneResult.normalized, // Save in normalized format
          userType
        }
      });

      // Create user session
      const sessionId = await this.createUserSession(user.id);

      // Generate JWT token
      const permissions = this.getUserPermissions(user.userType);
      const tokenPayload: Omit<JWTPayload, 'exp' | 'iat'> = {
        userId: user.id,
        userType: user.userType,
        sessionId,
        permissions
      };

      const token = this.generateToken(tokenPayload);

      return {
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          phoneNumber: user.phoneNumber
        }
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.userSession.delete({
        where: { id: sessionId }
      });

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string) {
    try {
      return await prisma.userSession.findUnique({
        where: { id: sessionId }
      });
    } catch (error) {
      console.error('Get session by ID error:', error);
      return null;
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string) {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🔐 SENDING VERIFICATION CODE');
      console.log('═══════════════════════════════════════════════════');
      console.log('📱 Phone number (input):', phoneNumber);
      
      // Normalize phone number
      const phoneResult = normalizePhoneNumber(phoneNumber);
      console.log('📱 Phone number (normalized):', phoneResult.normalized);
      
      if (!phoneResult.isValid) {
        return {
          success: false,
          message: 'Format de numéro de téléphone invalide'
        };
      }
      
      // Generate a 4-digit verification code (1000-9999)
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      console.log('🔢 Generated 4-digit code:', verificationCode);
      
      // Store with NORMALIZED phone number as key
      verificationCodes.set(phoneResult.normalized, {
        code: verificationCode,
        timestamp: Date.now()
      });
      
      console.log('💾 Code stored with normalized phone');
      
      // Clean up expired codes
      cleanupExpiredCodes();
      console.log('🧹 Expired codes cleaned up');
      
      // Send SMS via Educanet (use original or normalized)
      console.log('📤 Sending SMS with verification code...');
      const smsResult = await smsService.sendVerificationCode(phoneNumber, verificationCode);
      
      if (smsResult.success) {
        console.log('✅ Verification code sent successfully');
        console.log('═══════════════════════════════════════════════════');
        return {
          success: true,
          message: "Code de vérification envoyé avec succès"
        };
      } else {
        console.error('❌ SMS send failed:', smsResult.error);
        return {
          success: false,
          message: "Erreur lors de l'envoi du SMS: " + smsResult.error
        };
      }
    } catch (error: any) {
      console.error('❌ Error sending verification code:', error);
      return {
        success: false,
        message: "Erreur lors de l'envoi du code de vérification"
      };
    }
  }

  /**
   * Verify code
   */
  async verifyCode(phoneNumber: string, code: string) {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 VERIFYING CODE');
    console.log('═══════════════════════════════════════════════════');
    console.log('📱 Phone number (input):', phoneNumber);
    console.log('🔢 Code provided:', code);
    
    // Normalize phone number
    const phoneResult = normalizePhoneNumber(phoneNumber);
    console.log('📱 Phone number (normalized):', phoneResult.normalized);
    
    if (!phoneResult.isValid) {
      return {
        success: false,
        message: 'Format de numéro de téléphone invalide'
      };
    }
    
    // Clean up expired codes first
    cleanupExpiredCodes();
    
    // Get the stored verification code using NORMALIZED phone
    const storedCodeData = verificationCodes.get(phoneResult.normalized);
    
    if (!storedCodeData) {
      console.log('❌ No code found for this phone number');
      return {
        success: false,
        message: "Code de vérification expiré ou introuvable. Veuillez demander un nouveau code."
      };
    }
    
    console.log('🔢 Stored code:', storedCodeData.code);
    console.log('⏱️ Code age:', Math.floor((Date.now() - storedCodeData.timestamp) / 1000), 'seconds');
    
    // Check if the code matches
    if (storedCodeData.code === code) {
      // DON'T remove the code yet - it will be removed when password is actually reset
      console.log('✅ Code verified successfully (keeping in memory for password reset)');
      console.log('═══════════════════════════════════════════════════');
      
      return {
        success: true,
        message: "Code vérifié avec succès",
        data: { verified: true }
      };
    } else {
      console.log('❌ Code mismatch');
      console.log('═══════════════════════════════════════════════════');
      return {
        success: false,
        message: "Code de vérification incorrect"
      };
    }
  }

  /**
   * Reset password with verification code
   */
  async resetPasswordWithCode(phoneNumber: string, code: string, newPassword: string) {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔑 RESET PASSWORD WITH CODE');
    console.log('═══════════════════════════════════════════════════');
    console.log('📱 Phone number (input):', phoneNumber);
    console.log('🔢 Code:', code);
    
    // Normalize phone number
    const phoneResult = normalizePhoneNumber(phoneNumber);
    console.log('📱 Phone number (normalized):', phoneResult.normalized);
    
    if (!phoneResult.isValid) {
      return {
        success: false,
        message: 'Format de numéro de téléphone invalide'
      };
    }
    
    // Clean up expired codes first
    cleanupExpiredCodes();
    
    // Verify the code exists and matches using NORMALIZED phone
    const storedCodeData = verificationCodes.get(phoneResult.normalized);
    
    if (!storedCodeData) {
      console.log('❌ No code found for this phone number');
      return {
        success: false,
        message: "Code de vérification expiré ou introuvable. Veuillez demander un nouveau code."
      };
    }
    
    if (storedCodeData.code !== code) {
      console.log('❌ Code mismatch');
      return {
        success: false,
        message: "Code de vérification incorrect"
      };
    }
    
    console.log('✅ Code verified, proceeding with password reset...');
    
    try {
      // Find user by phone number using all possible formats
      console.log('🔍 Searching for user with phone formats:', phoneResult.formats);
      
      const user = await prisma.user.findFirst({
        where: {
          OR: phoneResult.formats.map(phone => ({ phoneNumber: phone }))
        }
      });

      if (!user) {
        console.log('❌ User not found with any phone format');
        return {
          success: false,
          message: "Utilisateur non trouvé"
        };
      }

      console.log('👤 User found:', user.id);
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      console.log('🔒 New password hashed');
      
      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });

      // NOW delete the verification code after successful password reset
      verificationCodes.delete(phoneResult.normalized);
      console.log('🗑️ Verification code deleted after successful password reset');

      console.log('✅ Password updated successfully');
      console.log('═══════════════════════════════════════════════════');
      
      return {
        success: true,
        message: "Mot de passe réinitialisé avec succès"
      };
    } catch (error: any) {
      console.error('❌ Error resetting password:', error);
      return {
        success: false,
        message: "Erreur lors de la réinitialisation du mot de passe"
      };
    }
  }
}

export default new AuthService();
