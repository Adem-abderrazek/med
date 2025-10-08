import { patientService } from '../services/patient.service.js';
class PatientController {
    /**
     * Get complete dashboard data for the authenticated patient
     */
    async getDashboardData(req, res) {
        try {
            const patientId = req.user.userId;
            const dashboardData = await patientService.getDashboardData(patientId);
            res.json({
                success: true,
                data: dashboardData,
                message: 'Dashboard data retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error in getDashboardData controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get dashboard data'
            });
        }
    }
    /**
     * Get overdue medications for the authenticated patient
     */
    async getOverdueMedications(req, res) {
        try {
            const patientId = req.user.userId;
            const overdueMedications = await patientService.getOverdueMedications(patientId);
            res.json({
                success: true,
                data: overdueMedications,
                message: `Found ${overdueMedications.length} overdue medications`
            });
        }
        catch (error) {
            console.error('Error in getOverdueMedications controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get overdue medications'
            });
        }
    }
    /**
     * Get next upcoming medications for the authenticated patient
     */
    async getNextMedications(req, res) {
        try {
            const patientId = req.user.userId;
            const limit = parseInt(req.query.limit) || 5;
            const nextMedications = await patientService.getNextMedications(patientId, limit);
            res.json({
                success: true,
                data: nextMedications,
                message: `Found ${nextMedications.length} upcoming medications`
            });
        }
        catch (error) {
            console.error('Error in getNextMedications controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get next medications'
            });
        }
    }
    /**
     * Get latest messages from tutors for the authenticated patient
     */
    async getTutorMessages(req, res) {
        try {
            const patientId = req.user.userId;
            const limit = parseInt(req.query.limit) || 10;
            const tutorMessages = await patientService.getTutorMessages(patientId, limit);
            res.json({
                success: true,
                data: tutorMessages,
                message: `Found ${tutorMessages.length} messages`
            });
        }
        catch (error) {
            console.error('Error in getTutorMessages controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get tutor messages'
            });
        }
    }
    /**
     * Mark a medication as taken by the authenticated patient
     */
    async markMedicationTaken(req, res) {
        try {
            const patientId = req.user.userId;
            const { reminderId } = req.body;
            if (!reminderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Reminder ID is required'
                });
            }
            await patientService.markMedicationTaken(patientId, reminderId);
            res.json({
                success: true,
                message: 'Medication marked as taken successfully'
            });
        }
        catch (error) {
            console.error('Error in markMedicationTaken controller:', error);
            res.status(400).json({
                success: false,
                message: error?.message || 'Failed to mark medication as taken'
            });
        }
    }
    /**
     * Mark a tutor message as read by the authenticated patient
     */
    async markMessageRead(req, res) {
        try {
            const patientId = req.user.userId;
            const { messageId } = req.body;
            if (!messageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Message ID is required'
                });
            }
            await patientService.markMessageRead(patientId, messageId);
            res.json({
                success: true,
                message: 'Message marked as read successfully'
            });
        }
        catch (error) {
            console.error('Error in markMessageRead controller:', error);
            res.status(400).json({
                success: false,
                message: error?.message || 'Failed to mark message as read'
            });
        }
    }
    /**
     * Get all medications for the authenticated patient
     */
    async getPatientMedications(req, res) {
        try {
            const patientId = req.user.userId;
            const medications = await patientService.getPatientMedications(patientId);
            res.json({
                success: true,
                data: medications,
                message: `Found ${medications.length} medications`
            });
        }
        catch (error) {
            console.error('Error in getPatientMedications controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get patient medications'
            });
        }
    }
    /**
     * Get all messages for the authenticated patient from doctors and tutors
     */
    async getPatientMessages(req, res) {
        try {
            const patientId = req.user.userId;
            const limit = parseInt(req.query.limit) || 50;
            const messages = await patientService.getPatientMessages(patientId, limit);
            res.json({
                success: true,
                data: messages,
                message: `Found ${messages.length} messages`
            });
        }
        catch (error) {
            console.error('Error in getPatientMessages controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get patient messages'
            });
        }
    }
    /**
     * Get patient profile data for the authenticated patient
     */
    async getPatientProfile(req, res) {
        try {
            const patientId = req.user.userId;
            const profile = await patientService.getPatientProfile(patientId);
            res.json({
                success: true,
                data: profile,
                message: 'Profile data retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error in getPatientProfile controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get patient profile'
            });
        }
    }
    /**
     * Update patient profile data for the authenticated patient
     */
    async updatePatientProfile(req, res) {
        try {
            const patientId = req.user.userId;
            const profileData = req.body;
            await patientService.updatePatientProfile(patientId, profileData);
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });
        }
        catch (error) {
            console.error('Error in updatePatientProfile controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to update patient profile'
            });
        }
    }
    /**
     * Get medications for a specific date for the authenticated patient
     */
    async getMedicationsByDate(req, res) {
        try {
            const patientId = req.user.userId;
            const { date } = req.query;
            if (!date || typeof date !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required (format: YYYY-MM-DD)'
                });
            }
            const medications = await patientService.getMedicationsByDate(patientId, date);
            res.json({
                success: true,
                data: medications,
                message: 'Medications retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error in getMedicationsByDate controller:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get medications for date'
            });
        }
    }
}
export default new PatientController();
