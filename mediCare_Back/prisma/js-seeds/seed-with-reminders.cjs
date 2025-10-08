"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// prisma/seed-with-reminders.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting seed process with medication reminders and alerts...");
    // ✅ Check if tuteur already exists, if not create one
    console.log("👤 Checking for existing tuteur...");
    let tuteur = await prisma.user.findUnique({
        where: {
            email: "debug@test.com"
        }
    });
    if (!tuteur) {
        console.log("🆕 Creating new tuteur...");
        tuteur = await prisma.user.create({
            data: {
                id: "af567578-3317-4d16-9264-46e4f677a274",
                email: "debug@test.com",
                passwordHash: "$2b$10$example_hash_for_debug", // bcrypt hash placeholder
                firstName: "Debug",
                lastName: "Tuteur",
                phoneNumber: "+21612345678",
                userType: client_1.UserType.tuteur,
            },
        });
        console.log("✅ Tuteur created:", tuteur.email);
    }
    else {
        console.log("✅ Using existing tuteur:", tuteur.email);
    }
    // ✅ Create new Patients
    console.log("👤 Creating new patients...");
    const patientsData = [
        {
            email: "patient4@example.com",
            passwordHash: "$2b$10$example_hash_for_patient4",
            firstName: "Jean",
            lastName: "Dupont",
            phoneNumber: "+21644444444",
            userType: client_1.UserType.patient,
        },
        {
            email: "patient5@example.com",
            passwordHash: "$2b$10$example_hash_for_patient5",
            firstName: "Pierre",
            lastName: "Martin",
            phoneNumber: "+21655555555",
            userType: client_1.UserType.patient,
        },
        {
            email: "patient6@example.com",
            passwordHash: "$2b$10$example_hash_for_patient6",
            firstName: "Paul",
            lastName: "Bernard",
            phoneNumber: "+21666666666",
            userType: client_1.UserType.patient,
        },
    ];
    const patients = [];
    for (const patientData of patientsData) {
        // Check if patient already exists
        let patient = await prisma.user.findUnique({
            where: {
                email: patientData.email
            }
        });
        if (!patient) {
            patient = await prisma.user.create({
                data: patientData,
            });
            console.log("✅ Patient created:", patient.email);
        }
        else {
            console.log("✅ Using existing patient:", patient.email);
        }
        patients.push(patient);
    }
    // ✅ Create new Doctors
    console.log("👨‍⚕️ Creating new doctors...");
    const doctorsData = [
        {
            email: "dr.moreau@example.com",
            passwordHash: "$2b$10$example_hash_for_doctor4",
            firstName: "Dr. Moreau",
            lastName: "Claire",
            phoneNumber: "+21677777777",
            userType: client_1.UserType.medecin,
        },
        {
            email: "dr.lefevre@example.com",
            passwordHash: "$2b$10$example_hash_for_doctor5",
            firstName: "Dr. Lefevre",
            lastName: "Sophie",
            phoneNumber: "+21688888888",
            userType: client_1.UserType.medecin,
        },
    ];
    const doctors = [];
    for (const doctorData of doctorsData) {
        // Check if doctor already exists
        let doctor = await prisma.user.findUnique({
            where: {
                email: doctorData.email
            }
        });
        if (!doctor) {
            doctor = await prisma.user.create({
                data: doctorData,
            });
            console.log("✅ Doctor created:", doctor.email);
        }
        else {
            console.log("✅ Using existing doctor:", doctor.email);
        }
        doctors.push(doctor);
    }
    // ✅ Create relationships between tuteur and new patients
    console.log("🔗 Creating relationships between tuteur and new patients...");
    const patientRelationships = [];
    for (const patient of patients) {
        // Check if relationship already exists
        const existingRelationships = await prisma.userRelationship.findMany({
            where: {
                caregiverId: tuteur.id,
                patientId: patient.id,
                relationshipType: client_1.RelationshipType.tuteur
            }
        });
        if (existingRelationships.length === 0) {
            const relationship = await prisma.userRelationship.create({
                data: {
                    caregiverId: tuteur.id,
                    patientId: patient.id,
                    relationshipType: client_1.RelationshipType.tuteur,
                },
            });
            patientRelationships.push(relationship);
            console.log(`✅ Created relationship between ${tuteur.firstName} and ${patient.firstName}`);
        }
        else {
            console.log(`✅ Using existing relationship between ${tuteur.firstName} and ${patient.firstName}`);
        }
    }
    // ✅ Create new Medications
    console.log("💊 Creating new medications...");
    const medicationsData = [
        {
            name: "Aspirine",
            genericName: "Acide acétylsalicylique",
            dosage: "100mg",
            form: "Comprimé",
            description: "Antiagrégant plaquettaire",
        },
        {
            name: "Atorvastatine",
            genericName: "Atorvastatine",
            dosage: "20mg",
            form: "Comprimé",
            description: "Hypolipidémiant",
        },
    ];
    const medications = [];
    for (const medicationData of medicationsData) {
        // Check if medication already exists
        let medication = await prisma.medication.findFirst({
            where: {
                name: medicationData.name,
                dosage: medicationData.dosage
            }
        });
        if (!medication) {
            medication = await prisma.medication.create({
                data: medicationData,
            });
            console.log("✅ Medication created:", medication.name);
        }
        else {
            console.log("✅ Using existing medication:", medication.name);
        }
        medications.push(medication);
    }
    // ✅ Create prescriptions linking new patients to new medications with doctors
    console.log("📝 Creating new prescriptions...");
    const prescriptionsData = [
        {
            patientId: patients[0].id,
            medicationId: medications[0].id,
            prescribedBy: doctors[0].id,
            customDosage: "1 comprimé par jour",
            instructions: "Prendre le soir",
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
        {
            patientId: patients[1].id,
            medicationId: medications[1].id,
            prescribedBy: doctors[1].id,
            customDosage: "1 comprimé le matin",
            instructions: "Prendre avec de l'eau",
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        },
    ];
    const prescriptions = [];
    for (const prescriptionData of prescriptionsData) {
        const prescription = await prisma.prescription.create({
            data: prescriptionData,
        });
        prescriptions.push(prescription);
        console.log("✅ Prescription created for patient:", prescription.patientId);
    }
    // ✅ Create medication reminders for the near future
    console.log("🕒 Creating medication reminders for the near future...");
    // Get current time and add some future times
    const now = new Date();
    // Patient 4 - Aspirine reminders
    const patient4ReminderTimes = [
        new Date(now.getTime() + 5 * 60000), // 5 minutes from now
        new Date(now.getTime() + 30 * 60000), // 30 minutes from now
        new Date(now.getTime() + 60 * 60000), // 1 hour from now
    ];
    // Patient 5 - Atorvastatine reminders
    const patient5ReminderTimes = [
        new Date(now.getTime() + 15 * 60000), // 15 minutes from now
        new Date(now.getTime() + 45 * 60000), // 45 minutes from now
        new Date(now.getTime() + 90 * 60000), // 1.5 hours from now
    ];
    // Store all created reminders for later use
    const allReminders = [];
    // Create reminders for Patient 4
    const patient4Reminders = [];
    for (let i = 0; i < patient4ReminderTimes.length; i++) {
        // Make the first reminder 'sent' to test the message count
        const status = i === 0 ? client_1.ReminderStatus.sent : client_1.ReminderStatus.scheduled;
        const reminder = await prisma.medicationReminder.create({
            data: {
                prescriptionId: prescriptions[0].id,
                patientId: patients[0].id,
                scheduledFor: patient4ReminderTimes[i],
                status: status,
            },
        });
        patient4Reminders.push(reminder);
        allReminders.push(reminder);
        console.log(`✅ Medication reminder created for ${patients[0].firstName} at ${patient4ReminderTimes[i]} with status ${status}`);
    }
    // Create reminders for Patient 5
    const patient5Reminders = [];
    for (let i = 0; i < patient5ReminderTimes.length; i++) {
        // Make the first reminder 'sent' to test the message count
        const status = i === 0 ? client_1.ReminderStatus.sent : client_1.ReminderStatus.scheduled;
        const reminder = await prisma.medicationReminder.create({
            data: {
                prescriptionId: prescriptions[1].id,
                patientId: patients[1].id,
                scheduledFor: patient5ReminderTimes[i],
                status: status,
            },
        });
        patient5Reminders.push(reminder);
        allReminders.push(reminder);
        console.log(`✅ Medication reminder created for ${patients[1].firstName} at ${patient5ReminderTimes[i]} with status ${status}`);
    }
    // ✅ Create some missed medication alerts
    console.log("⚠️ Creating missed medication alerts...");
    // Create some alerts for missed medications (past reminders that were missed)
    const pastDate = new Date(now.getTime() - 60 * 60000); // 1 hour ago
    // Create a missed medication alert for Patient 4
    const missedAlert1 = await prisma.alert.create({
        data: {
            patientId: patients[0].id,
            tuteurId: tuteur.id,
            reminderId: patient4Reminders[0].id,
            alertType: client_1.AlertType.missed_medication,
            title: "Medication Missed",
            message: `${patients[0].firstName} missed their ${medications[0].name} medication`,
            isRead: false,
            status: client_1.AlertStatus.pending,
        },
    });
    console.log(`✅ Missed medication alert created for ${patients[0].firstName}`);
    // Create a missed medication alert for Patient 5
    const missedAlert2 = await prisma.alert.create({
        data: {
            patientId: patients[1].id,
            tuteurId: tuteur.id,
            reminderId: patient5Reminders[0].id,
            alertType: client_1.AlertType.missed_medication,
            title: "Medication Missed",
            message: `${patients[1].firstName} missed their ${medications[1].name} medication`,
            isRead: false,
            status: client_1.AlertStatus.pending,
        },
    });
    console.log(`✅ Missed medication alert created for ${patients[1].firstName}`);
    console.log("✅ All seed data with medication reminders and alerts created successfully!");
    console.log("📊 Summary:");
    console.log(`  - Tuteur: 1 (${tuteur.email})`);
    console.log(`  - New Patients: ${patients.length}`);
    console.log(`  - New Doctors: ${doctors.length}`);
    console.log(`  - New Medications: ${medications.length}`);
    console.log(`  - New Prescriptions: ${prescriptions.length}`);
    console.log(`  - New Patient Relationships: ${patientRelationships.length}`);
    console.log(`  - New Medication Reminders: ${allReminders.length}`);
    console.log(`  - New Sent Reminders: 2`);
    console.log(`  - New Missed Medication Alerts: 2`);
}
main()
    .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
