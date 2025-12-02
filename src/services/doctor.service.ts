import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardData {
  totalPatients: number;
  recentPatients: any[];
  upcomingAppointments: any[];
  medicationAlerts: any[];
}

interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  lastVisit?: Date;
  medicationCount: number;
}

class DoctorService {
  // Get dashboard data for doctor/tutor
  async getDashboardData(doctorId: string): Promise<DashboardData> {
    try {
      // Get patients assigned to this doctor/tutor through relationships
      const doctorPatientRelationships = await prisma.userRelationship.findMany({
        where: {
          caregiverId: doctorId,
          relationshipType: { in: ['medecin', 'tuteur'] }, // Support both types
          isActive: true
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
              lastLogin: true
            }
          }
        }
      });

      // If no relationships exist, create initial relationships (same logic as getAllPatients)
      let assignedPatients = doctorPatientRelationships.map(rel => rel.patient);
      
      if (doctorPatientRelationships.length === 0) {
        const allPatients = await prisma.user.findMany({
          where: {
            userType: 'patient'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            lastLogin: true
          },
          orderBy: {
            lastName: 'asc'
          }
        });

        // Create relationships for all patients (active by default)
        const relationships = allPatients.map(patient => ({
          caregiverId: doctorId,
          patientId: patient.id,
          relationshipType: 'medecin' as const,
          isActive: true
        }));

        if (relationships.length > 0) {
          await prisma.userRelationship.createMany({
            data: relationships,
            skipDuplicates: true
          });
        }

        assignedPatients = allPatients;
      }

      // Get total patients count (only assigned patients)
      const totalPatients = assignedPatients.length;

      // Get recent patients (last 10 assigned patients)
      const recentPatients = assignedPatients
        .sort((a, b) => new Date(b.lastLogin || b.createdAt).getTime() - new Date(a.lastLogin || a.createdAt).getTime())
        .slice(0, 10);

      // Get upcoming appointments (mock data for now)
      const upcomingAppointments: any[] = [];

      // Get medication alerts (patients with overdue medications) - only for assigned patients
      const assignedPatientIds = assignedPatients.map(p => p.id);
      const medicationAlerts = await prisma.medicationReminder.findMany({
        where: {
          status: {
            in: ['scheduled', 'sent']
          },
          scheduledFor: {
            lt: new Date()
          },
          patientId: {
            in: assignedPatientIds
          }
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'asc'
        },
        take: 10
      });

      return {
        totalPatients,
        recentPatients,
        upcomingAppointments,
        medicationAlerts
      };
    } catch (error) {
      console.error('Error getting doctor dashboard data:', error);
      throw error;
    }
  }

  // Get all patients for the doctor/tutor
  async getAllPatients(doctorId: string): Promise<PatientSearchResult[]> {
    try {
      // First, get all patients assigned to this doctor/tutor through relationships
      const doctorPatientRelationships = await prisma.userRelationship.findMany({
        where: {
          caregiverId: doctorId,
          relationshipType: { in: ['medecin', 'tuteur'] }, // Support both types
          isActive: true
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
              lastLogin: true,
              reminders: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      });

      // If no relationships exist, create initial relationships for all patients
      if (doctorPatientRelationships.length === 0) {
        const allPatients = await prisma.user.findMany({
          where: {
            userType: 'patient'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
            lastLogin: true,
            reminders: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            lastName: 'asc'
          }
        });

        // Create relationships for all patients (active by default)
        const relationships = allPatients.map(patient => ({
          caregiverId: doctorId,
          patientId: patient.id,
          relationshipType: 'medecin' as const,
          isActive: true
        }));

        if (relationships.length > 0) {
          await prisma.userRelationship.createMany({
            data: relationships,
            skipDuplicates: true
          });
        }

        return allPatients.map(patient => ({
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phoneNumber: patient.phoneNumber,
          lastVisit: patient.lastLogin || patient.createdAt,
          medicationCount: patient.reminders.length
        }));
      }

      // Return only patients assigned to this doctor
      return doctorPatientRelationships.map(relationship => ({
        id: relationship.patient.id,
        firstName: relationship.patient.firstName,
        lastName: relationship.patient.lastName,
        email: relationship.patient.email,
        phoneNumber: relationship.patient.phoneNumber,
        lastVisit: relationship.patient.lastLogin || relationship.patient.createdAt,
        medicationCount: relationship.patient.reminders.length
      }));
    } catch (error) {
      console.error('Error getting doctor patients:', error);
      throw error;
    }
  }

  // Search patients by name, email, or phone
  async searchPatients(doctorId: string, query: string): Promise<PatientSearchResult[]> {
    try {
      // Get all patients for this doctor using the same logic as getAllPatients
      const allPatients = await this.getAllPatients(doctorId);
      
      // Filter the patients based on the search query
      const filteredPatients = allPatients.filter(patient => 
        patient.firstName.toLowerCase().includes(query.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(query.toLowerCase()) ||
        patient.email.toLowerCase().includes(query.toLowerCase()) ||
        patient.phoneNumber.includes(query)
      );

      return filteredPatients;
    } catch (error) {
      console.error('Error searching patients:', error);
      throw error;
    }
  }

  // Get patient profile
  async getPatientProfile(doctorId: string, patientId: string) {
    try {
      const patient = await prisma.user.findUnique({
        where: {
          id: patientId,
          userType: 'patient'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
          lastLogin: true,
          reminders: {
            include: {
              prescription: {
                include: {
                  medication: true
                }
              }
            },
            orderBy: {
              scheduledFor: 'desc'
            }
          }
        }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Transform to match frontend expectations
      const patientData = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        lastVisit: patient.lastLogin || patient.createdAt,
        medicationCount: patient.reminders.length,
      };

      return patientData;
    } catch (error) {
      console.error('Error getting patient profile:', error);
      throw error;
    }
  }

  // Create prescription for patient
  async createPrescription(doctorId: string, prescriptionData: {
    patientId: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }) {
    try {
      // Create medication first
      const medication = await prisma.medication.create({
        data: {
          name: prescriptionData.medicationName,
          dosage: prescriptionData.dosage,
          description: prescriptionData.instructions
        }
      });

      // Create prescription first
      const prescription = await prisma.prescription.create({
        data: {
          patientId: prescriptionData.patientId,
          medicationId: medication.id,
          prescribedBy: doctorId,
          instructions: prescriptionData.instructions,
          startDate: new Date(),
          isChronic: true
        }
      });

      // Create medication reminder
      const reminder = await prisma.medicationReminder.create({
        data: {
          patientId: prescriptionData.patientId,
          prescriptionId: prescription.id,
          scheduledFor: new Date(), // This should be calculated based on frequency
          status: 'scheduled'
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          },
          patient: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return reminder;
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }
  }

  // Get patient medications
  async getPatientMedications(doctorId: string, patientId: string) {
    try {
      // Verify doctor/tutor has access to this patient (support both relationship types)
      const relationship = await prisma.userRelationship.findFirst({
        where: {
          caregiverId: doctorId,
          patientId: patientId,
          relationshipType: { in: ['medecin', 'tuteur'] }, // Support both types
          isActive: true
        }
      });

      if (!relationship) {
        throw new Error('Unauthorized: not linked to this patient');
      }

      // Get all active prescriptions with full details
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
          isActive: true
        },
        include: {
          medication: true,
          schedules: {
            where: {
              isActive: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform prescriptions to include schedule details
      const medications = prescriptions.map(prescription => {
        // Transform schedules to match frontend expectations
        const schedules = prescription.schedules.map(schedule => {
          // Extract HH:mm from scheduledTime
          const time = new Date(schedule.scheduledTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          return {
            time: time,
            days: schedule.daysOfWeek
          };
        });

        return {
          id: prescription.id,
          name: prescription.medication.name,
          dosage: prescription.medication.dosage || prescription.customDosage,
          customDosage: prescription.customDosage,
          instructions: prescription.instructions,
          startDate: prescription.startDate,
          endDate: prescription.endDate,
          isActive: prescription.isActive,
          isChronic: prescription.isChronic,
          medication: {
            id: prescription.medication.id,
            name: prescription.medication.name,
            dosage: prescription.medication.dosage,
            form: prescription.medication.form,
            genericName: prescription.medication.genericName,
            description: prescription.medication.description
          },
          schedules: schedules,
          scheduleType: prescription.schedules[0]?.scheduleType || 'daily',
          intervalHours: prescription.schedules[0]?.intervalHours
        };
      });

      return medications;
    } catch (error) {
      console.error('Error getting patient medications:', error);
      throw error;
    }
  }

  // Add medication to patient
  async addPatientMedication(doctorId: string, patientId: string, medicationData: any) {
    try {
      // Create medication
      const medication = await prisma.medication.create({
        data: {
          name: medicationData.name,
          dosage: medicationData.dosage,
          description: medicationData.instructions || ''
        }
      });

      // Create prescription first
      const prescription = await prisma.prescription.create({
        data: {
          patientId: patientId,
          medicationId: medication.id,
          prescribedBy: doctorId,
          instructions: medicationData.instructions || '',
          startDate: new Date(),
          isChronic: true
        }
      });

      // Create reminder
      const reminder = await prisma.medicationReminder.create({
        data: {
          patientId: patientId,
          prescriptionId: prescription.id,
          scheduledFor: new Date(),
          status: 'scheduled'
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          }
        }
      });

      return reminder;
    } catch (error) {
      console.error('Error adding patient medication:', error);
      throw error;
    }
  }

  // Delete patient relationship (deactivate relationship)
  async deletePatient(doctorId: string, patientId: string) {
    try {
      // Check if patient exists
      const patient = await prisma.user.findUnique({
        where: { id: patientId, userType: 'patient' }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Check if there's an existing relationship
      const existingRelationship = await prisma.userRelationship.findFirst({
        where: {
          caregiverId: doctorId,
          patientId: patientId,
          relationshipType: 'medecin'
        }
      });

      if (existingRelationship) {
        // Deactivate the existing relationship
        await prisma.userRelationship.update({
          where: { id: existingRelationship.id },
          data: { isActive: false }
        });
        
        console.log(`Deactivated relationship between doctor ${doctorId} and patient ${patientId}`);
      } else {
        // If no relationship exists, this means the patient was shown as part of the "initial setup"
        // We need to create a relationship and immediately deactivate it to prevent future display
        await prisma.userRelationship.create({
          data: {
            caregiverId: doctorId,
            patientId: patientId,
            relationshipType: 'medecin',
            isActive: false
          }
        });
        
        console.log(`Created and deactivated relationship between doctor ${doctorId} and patient ${patientId}`);
      }
      
      return {
        success: true,
        message: 'Patient removed from your patient list successfully'
      };
    } catch (error) {
      console.error('Error deleting patient relationship:', error);
      throw error;
    }
  }
}

export default new DoctorService();
