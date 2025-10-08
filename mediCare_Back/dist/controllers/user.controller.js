import { userService } from '../services/user.service.js';
export class UserController {
    /**
     * Get user profile for any user type
     */
    async getUserProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profile = await userService.getUserProfile(userId);
            res.json({
                success: true,
                data: profile,
                message: 'Profile data retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error in getUserProfile controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get user profile'
            });
        }
    }
    /**
     * Update user profile for any user type
     */
    async updateUserProfile(req, res) {
        try {
            const userId = req.user.userId;
            const profileData = req.body;
            await userService.updateUserProfile(userId, profileData);
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        }
        catch (error) {
            console.error('Error in updateUserProfile controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to update user profile'
            });
        }
    }
}
export const userController = new UserController();
