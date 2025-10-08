import { validationResult } from 'express-validator';
import authService from '../services/auth.service.js';
export class AuthController {
    /**
     * Login user
     */
    async login(req, res) {
        console.log('Login controller called😂😂❤️');
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            const { emailOrPhone, password, pushToken } = req.body;
            const deviceInfo = req.headers['user-agent'] || 'Unknown device';
            const result = await authService.login({ emailOrPhone, password, pushToken }, deviceInfo);
            if (!result.success) {
                return res.status(401).json(result);
            }
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Login controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Register new user
     */
    async register(req, res) {
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            const registerData = req.body;
            console.log('Register controller called😂😂❤️', registerData);
            const deviceInfo = req.headers['user-agent'] || 'Unknown device';
            const result = await authService.register(registerData);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json(result);
        }
        catch (error) {
            console.error('Register controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Logout user
     */
    async logout(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
            }
            const payload = authService.verifyToken(token);
            if (!payload) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            const result = await authService.logout(payload.sessionId);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Logout controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Get current user profile
     */
    async getProfile(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
            }
            const payload = authService.verifyToken(token);
            if (!payload) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            // Get user data from database
            const user = await authService.getUserById(payload.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userType: user.userType,
                    phoneNumber: user.phoneNumber
                }
            });
        }
        catch (error) {
            console.error('Get profile controller error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    /**
     * Send verification code to phone number
     */
    async sendVerificationCode(req, res) {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }
            console.log('📱 Sending verification code to:', phoneNumber);
            const result = await authService.sendVerificationCode(phoneNumber);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Send verification code error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to send verification code'
            });
        }
    }
    /**
     * Verify code
     */
    async verifyCode(req, res) {
        try {
            const { phoneNumber, code } = req.body;
            if (!phoneNumber || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number and code are required'
                });
            }
            console.log('🔍 Verifying code for:', phoneNumber);
            const result = await authService.verifyCode(phoneNumber, code);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Verify code error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to verify code'
            });
        }
    }
    /**
     * Reset password with verification code
     */
    async resetPasswordWithCode(req, res) {
        try {
            const { phoneNumber, code, newPassword } = req.body;
            if (!phoneNumber || !code || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number, code, and new password are required'
                });
            }
            console.log('🔑 Resetting password for:', phoneNumber);
            const result = await authService.resetPasswordWithCode(phoneNumber, code, newPassword);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('Reset password error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to reset password'
            });
        }
    }
}
export default new AuthController();
