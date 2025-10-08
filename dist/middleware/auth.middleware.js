import authService from '../services/auth.service.js';
/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        const payload = authService.verifyToken(token);
        if (!payload) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        // Verify session exists and is valid
        const session = await authService.getSessionById(payload.sessionId);
        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Session expired'
            });
        }
        // Add user data to request
        req.user = payload;
        next();
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};
/**
 * Middleware to check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const hasPermission = permissions.some(permission => req.user.permissions.includes(permission));
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};
/**
 * Middleware to check if user has specific user type
 */
export const requireUserType = (userTypes) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!userTypes.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied for this user type'
            });
        }
        next();
    };
};
