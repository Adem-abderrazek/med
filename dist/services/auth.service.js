import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { smsService } from './sms.service.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
// In-memory storage for verification codes (in production, use Redis)
const verificationCodes = new Map();
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
    generateToken(payload) {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    }
    /**
     * Get user permissions based on user type
     */
    getUserPermissions(userType) {
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
    async createUserSession(userId, deviceInfo) {
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
        }
        else {
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
    async login(loginData, deviceInfo) {
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
                const emailLower = cleanInput.toLowerCase();
                console.log('📧 Searching for email:', emailLower);
                user = await prisma.user.findUnique({
                    where: { email: emailLower }
                });
                console.log('📧 Email search result:', user ? `Found user ${user.id}` : 'Not found');
            }
            else if (isPhone) {
                // Clean phone number (remove spaces, dashes, parentheses)
                const cleanPhone = cleanInput.replace(/[\s\-\(\)]/g, '');
                console.log('📱 Searching for phone:', cleanPhone);
                // Build search array with different formats including Tunisia country code
                const phoneFormats = [
                    cleanPhone, // Original: 52536742
                    `+${cleanPhone}`, // With +: +52536742
                    cleanPhone.startsWith('+') ? cleanPhone.substring(1) : `+${cleanPhone}` // Toggle +
                ];
                // If phone doesn't start with country code, try Tunisia (+216)
                if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('216')) {
                    phoneFormats.push(`+216${cleanPhone}`); // +21652536742
                    phoneFormats.push(`216${cleanPhone}`); // 21652536742
                }
                console.log('🔍 Trying phone formats:', phoneFormats);
                // Find user by phone number (try different formats)
                user = await prisma.user.findFirst({
                    where: {
                        OR: phoneFormats.map(phone => ({ phoneNumber: phone }))
                    }
                });
                console.log('📱 Phone search result:', user ? `Found user ${user.id}` : 'Not found');
            }
            else {
                console.warn('⚠️ Input is neither valid email nor phone:', cleanInput);
            }
            if (!user) {
                console.log('❌ Login failed: User not found');
                return {
                    success: false,
                    message: 'Identifiants invalides'
                };
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
                return {
                    success: false,
                    message: 'Identifiants invalides'
                };
            }
            // Create user session
            const sessionId = await this.createUserSession(user.id, deviceInfo);
            // Update last login and push token if provided
            const updateData = { lastLogin: new Date() };
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
            const tokenPayload = {
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
        }
        catch (error) {
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
    async register(registerData) {
        try {
            const { email, password, firstName, lastName, phoneNumber, userType } = registerData;
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (existingUser) {
                return {
                    success: false,
                    message: 'User with this email already exists'
                };
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            // Create user
            const user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    passwordHash,
                    firstName,
                    lastName,
                    phoneNumber,
                    userType
                }
            });
            // Create user session
            const sessionId = await this.createUserSession(user.id);
            // Generate JWT token
            const permissions = this.getUserPermissions(user.userType);
            const tokenPayload = {
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
        }
        catch (error) {
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
    async logout(sessionId) {
        try {
            await prisma.userSession.delete({
                where: { id: sessionId }
            });
            return {
                success: true,
                message: 'Logout successful'
            };
        }
        catch (error) {
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
    verifyToken(token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            return payload;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            return await prisma.user.findUnique({
                where: { id: userId }
            });
        }
        catch (error) {
            console.error('Get user by ID error:', error);
            return null;
        }
    }
    /**
     * Get session by ID
     */
    async getSessionById(sessionId) {
        try {
            return await prisma.userSession.findUnique({
                where: { id: sessionId }
            });
        }
        catch (error) {
            console.error('Get session by ID error:', error);
            return null;
        }
    }
    /**
     * Send verification code via SMS
     */
    async sendVerificationCode(phoneNumber) {
        try {
            console.log('═══════════════════════════════════════════════════');
            console.log('🔐 SENDING VERIFICATION CODE');
            console.log('═══════════════════════════════════════════════════');
            console.log('📱 Phone number:', phoneNumber);
            // Generate a 6-digit verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log('🔢 Generated code:', verificationCode);
            // Store the verification code with timestamp
            verificationCodes.set(phoneNumber, {
                code: verificationCode,
                timestamp: Date.now()
            });
            console.log('💾 Code stored in memory');
            // Clean up expired codes
            cleanupExpiredCodes();
            console.log('🧹 Expired codes cleaned up');
            // Send SMS via Educanet
            console.log('📤 Sending SMS with verification code...');
            const smsResult = await smsService.sendVerificationCode(phoneNumber, verificationCode);
            if (smsResult.success) {
                console.log('✅ Verification code sent successfully');
                console.log('═══════════════════════════════════════════════════');
                return {
                    success: true,
                    message: "Code de vérification envoyé avec succès"
                };
            }
            else {
                console.error('❌ SMS send failed:', smsResult.error);
                return {
                    success: false,
                    message: "Erreur lors de l'envoi du SMS: " + smsResult.error
                };
            }
        }
        catch (error) {
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
    async verifyCode(phoneNumber, code) {
        console.log('═══════════════════════════════════════════════════');
        console.log('🔍 VERIFYING CODE');
        console.log('═══════════════════════════════════════════════════');
        console.log('📱 Phone number:', phoneNumber);
        console.log('🔢 Code provided:', code);
        // Clean up expired codes first
        cleanupExpiredCodes();
        // Get the stored verification code
        const storedCodeData = verificationCodes.get(phoneNumber);
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
        }
        else {
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
    async resetPasswordWithCode(phoneNumber, code, newPassword) {
        console.log('═══════════════════════════════════════════════════');
        console.log('🔑 RESET PASSWORD WITH CODE');
        console.log('═══════════════════════════════════════════════════');
        console.log('📱 Phone number:', phoneNumber);
        console.log('🔢 Code:', code);
        // Clean up expired codes first
        cleanupExpiredCodes();
        // Verify the code exists and matches
        const storedCodeData = verificationCodes.get(phoneNumber);
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
            // Find user by phone number - handle multiple formats including Tunisia country code
            const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
            console.log('🔍 Searching for phone number:', cleanPhone);
            // Build search array with different formats
            const phoneFormats = [
                cleanPhone, // Original: 52536742
                `+${cleanPhone}`, // With +: +52536742
                cleanPhone.startsWith('+') ? cleanPhone.substring(1) : `+${cleanPhone}` // Toggle +
            ];
            // If phone doesn't start with country code, try Tunisia (+216)
            if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('216')) {
                phoneFormats.push(`+216${cleanPhone}`); // +21652536742
                phoneFormats.push(`216${cleanPhone}`); // 21652536742
            }
            console.log('🔍 Trying phone formats:', phoneFormats);
            const user = await prisma.user.findFirst({
                where: {
                    OR: phoneFormats.map(phone => ({ phoneNumber: phone }))
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
            verificationCodes.delete(phoneNumber);
            console.log('🗑️ Verification code deleted after successful password reset');
            console.log('✅ Password updated successfully');
            console.log('═══════════════════════════════════════════════════');
            return {
                success: true,
                message: "Mot de passe réinitialisé avec succès"
            };
        }
        catch (error) {
            console.error('❌ Error resetting password:', error);
            return {
                success: false,
                message: "Erreur lors de la réinitialisation du mot de passe"
            };
        }
    }
}
export default new AuthService();
