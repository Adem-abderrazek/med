import { Request, Response } from 'express';
import doctorService from '../services/doctor.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

class DoctorController {
  // Get dashboard data for doctor
  async getDashboardData(req: AuthenticatedRequest, res: Response) {
    try {
      // For debugging, use a default doctor ID if no user is authenticated
      const doctorId = req.user?.userId || 'eb283fac-bacb-416c-ab8d-b239456d3e2a'; // Use the test doctor ID

      const dashboardData = await doctorService.getDashboardData(doctorId);
      res.json({ success: true, data: dashboardData });
    } catch (error: any) {
      console.error('Error getting doctor dashboard:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving dashboard data',
        error: error.message 
      });
    }
  }

  // Get all patients for the doctor
  async getAllPatients(req: AuthenticatedRequest, res: Response) {
    try {
      // For debugging, use a default doctor ID if no user is authenticated
      const doctorId = req.user?.userId || 'eb283fac-bacb-416c-ab8d-b239456d3e2a'; // Use the test doctor ID

      const patients = await doctorService.getAllPatients(doctorId);
      res.json({ success: true, data: patients });
    } catch (error: any) {
      console.error('Error getting doctor patients:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving patients',
        error: error.message 
      });
    }
  }

  // Search patients
  async searchPatients(req: AuthenticatedRequest, res: Response) {
    try {
      const doctorId = req.user?.userId;
      const { query } = req.query;

      if (!doctorId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Search query is required' 
        });
      }

      const patients = await doctorService.searchPatients(doctorId, query);
      res.json({ success: true, data: patients });
    } catch (error: any) {
      console.error('Error searching patients:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error searching patients',
        error: error.message 
      });
    }
  }

  // Get patient profile
  async getPatientProfile(req: AuthenticatedRequest, res: Response) {
    try {
      // For debugging, use a default doctor ID if no user is authenticated
      const doctorId = req.user?.userId || 'eb283fac-bacb-416c-ab8d-b239456d3e2a'; // Use the test doctor ID
      const { patientId } = req.params;

      const patient = await doctorService.getPatientProfile(doctorId, patientId);
      res.json({ success: true, data: patient });
    } catch (error: any) {
      console.error('Error getting patient profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving patient profile',
        error: error.message 
      });
    }
  }

  // Create prescription for patient
  async createPrescription(req: AuthenticatedRequest, res: Response) {
    try {
      const doctorId = req.user?.userId;
      const { patientId, medicationName, dosage, frequency, duration, instructions } = req.body;

      if (!doctorId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const prescription = await doctorService.createPrescription(doctorId, {
        patientId,
        medicationName,
        dosage,
        frequency,
        duration,
        instructions
      });

      res.json({ success: true, data: prescription });
    } catch (error: any) {
      console.error('Error creating prescription:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating prescription',
        error: error.message 
      });
    }
  }

  // Get patient medications
  async getPatientMedications(req: AuthenticatedRequest, res: Response) {
    try {
      // For debugging, use a default doctor ID if no user is authenticated
      const doctorId = req.user?.userId || 'eb283fac-bacb-416c-ab8d-b239456d3e2a'; // Use the test doctor ID
      const { patientId } = req.params;

      const medications = await doctorService.getPatientMedications(doctorId, patientId);
      res.json({ success: true, data: medications });
    } catch (error: any) {
      console.error('Error getting patient medications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving patient medications',
        error: error.message 
      });
    }
  }

  // Add medication to patient
  async addPatientMedication(req: AuthenticatedRequest, res: Response) {
    try {
      const doctorId = req.user?.userId;
      const { patientId } = req.params;
      const medicationData = req.body;

      if (!doctorId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const medication = await doctorService.addPatientMedication(doctorId, patientId, medicationData);
      res.json({ success: true, data: medication });
    } catch (error: any) {
      console.error('Error adding patient medication:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error adding medication',
        error: error.message 
      });
    }
  }

  // Delete patient relationship
  async deletePatient(req: AuthenticatedRequest, res: Response) {
    try {
      // For debugging, use a default doctor ID if no user is authenticated
      const doctorId = req.user?.userId || 'eb283fac-bacb-416c-ab8d-b239456d3e2a'; // Use the test doctor ID
      const { patientId } = req.params;

      const result = await doctorService.deletePatient(doctorId, patientId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting patient relationship',
        error: error.message 
      });
    }
  }
}

export default new DoctorController();
