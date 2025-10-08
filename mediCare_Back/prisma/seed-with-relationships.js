// prisma/seed-with-relationships.js
import { PrismaClient, UserType, RelationshipType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed process...");
  
  // ✅ Create Tuteur with specific email and ID
  const tuteur = {
      id: "af567578-3317-4d16-9264-46e4f677a274",
      email: "debug@test.com",
      passwordHash: "$2b$10$example_hash_for_debug", // bcrypt hash placeholder
      firstName: "Debug",
      lastName: "Tuteur",
      phoneNumber: "+21612345678",
      userType: UserType.tuteur,
    }

  console.log("✅ Tuteur created:", tuteur.email);

  // ✅ Create 3 Patients
  const patientsData = [
    {
      email: "patientazd1@example.com",
      passwordHash: "$2b$10$example_hash_for_patient1",
      firstName: "Sophie",
      lastName: "Lefevre",
      phoneNumber: "+21611111111",
      userType: UserType.patient,
    },
    {
      email: "patient2zaa@example.com",
      passwordHash: "$2b$10$example_hash_for_patient2",
      firstName: "Marie",
      lastName: "Dubois",
      phoneNumber: "+21622222222",
      userType: UserType.patient,
    },
    {
      email: "patient3dee@example.com",
      passwordHash: "$2b$10$example_hash_for_patient3",
      firstName: "Claire",
      lastName: "Moreau",
      phoneNumber: "+21633333333",
      userType: UserType.patient,
    },
  ];

  const patients = [];
  for (const patientData of patientsData) {
    const patient = await prisma.user.create({
      data: patientData,
    });
    patients.push(patient);
    console.log("✅ Patient created:", patient.email);
  }

  // ✅ Create 3 Doctors
  const doctorsData = [
    {
      email: "dr.martin@example.com",
      passwordHash: "$2b$10$example_hash_for_doctor1",
      firstName: "Dr. Martin",
      lastName: "Leroy",
      phoneNumber: "+21644444444",
      userType: UserType.medecin,
    },
    {
      email: "dr.dupont@example.com",
      passwordHash: "$2b$10$example_hash_for_doctor2",
      firstName: "Dr. Dupont",
      lastName: "Bernard",
      phoneNumber: "+21655555555",
      userType: UserType.medecin,
    },
    {
      email: "dr.petit@example.com",
      passwordHash: "$2b$10$example_hash_for_doctor3",
      firstName: "Dr. Petit",
      lastName: "Laurent",
      phoneNumber: "+21666666666",
      userType: UserType.medecin,
    },
  ];

  const doctors = [];
  for (const doctorData of doctorsData) {
    const doctor = await prisma.user.create({
      data: doctorData,
    });
    doctors.push(doctor);
    console.log("✅ Doctor created:", doctor.email);
  }

  // ✅ Create relationships between tuteur and patients
  const patientRelationships = [];
  for (const patient of patients) {
    const relationship = await prisma.userRelationship.create({
      data: {
        caregiverId: tuteur.id,
        patientId: patient.id,
        relationshipType: RelationshipType.tuteur,
      },
    });
    patientRelationships.push(relationship);
  }
  console.log("✅ Created relationships between tuteur and patients");

  // ✅ Create relationships between tuteur and doctors
  const doctorRelationships = [];
  for (const doctor of doctors) {
    const relationship = await prisma.userRelationship.create({
      data: {
        caregiverId: tuteur.id,
        patientId: doctor.id,
        relationshipType: RelationshipType.medecin,
      },
    });
    doctorRelationships.push(relationship);
  }
  console.log("✅ Created relationships between tuteur and doctors");

  // ✅ Create 3 Medications
  const medicationsData = [
    {
      name: "Paracétamol",
      genericName: "Acétaminophène",
      dosage: "500mg",
      form: "Comprimé",
      description: "Analgésique et antipyrétique",
    },
    {
      name: "Ibuprofène",
      genericName: "Ibuprofène",
      dosage: "200mg",
      form: "Comprimé",
      description: "Anti-inflammatoire non stéroïdien",
    },
    {
      name: "Amoxicilline",
      genericName: "Amoxicilline",
      dosage: "500mg",
      form: "Gélule",
      description: "Antibiotique de la famille des bêta-lactamines",
    },
  ];

  const medications = [];
  for (const medicationData of medicationsData) {
    const medication = await prisma.medication.create({
      data: medicationData,
    });
    medications.push(medication);
    console.log("✅ Medication created:", medication.name);
  }

  // ✅ Create prescriptions linking patients to medications with doctors
  const prescriptionsData = [
    {
      patientId: patients[0].id,
      medicationId: medications[0].id,
      prescribedBy: doctors[0].id,
      customDosage: "1 comprimé 3 fois par jour",
      instructions: "Prendre avec de l'eau après les repas",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    },
    {
      patientId: patients[1].id,
      medicationId: medications[1].id,
      prescribedBy: doctors[1].id,
      customDosage: "1 comprimé 2 fois par jour",
      instructions: "Prendre avec de l'eau 1 heure avant les repas",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
    },
    {
      patientId: patients[2].id,
      medicationId: medications[2].id,
      prescribedBy: doctors[2].id,
      customDosage: "1 gélule 2 fois par jour",
      instructions: "Prendre avec de l'eau pendant les repas",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 10)),
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

  console.log("✅ All seed data created successfully!");
  console.log("📊 Summary:");
  console.log(`  - Tuteur: 1 (${tuteur.email})`);
  console.log(`  - Patients: ${patients.length}`);
  console.log(`  - Doctors: ${doctors.length}`);
  console.log(`  - Medications: ${medications.length}`);
  console.log(`  - Prescriptions: ${prescriptions.length}`);
  console.log(`  - Patient Relationships: ${patientRelationships.length}`);
  console.log(`  - Doctor Relationships: ${doctorRelationships.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });