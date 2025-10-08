// prisma/seed.ts
import { PrismaClient, UserType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ✅ Create Tuteur
  const tuteur = await prisma.user.create({
    data: {
      email: "tuteur1@example.com",
      passwordHash: "tuteur123", // plain text just for testing
      firstName: "Jean",
      lastName: "Dupont",
      phoneNumber: "+33123456789",
      userType: UserType.tuteur,
    },
  });

  // ✅ Create Médecin
  const medecin = await prisma.user.create({
    data: {
      email: "medecin1@example.com",
      passwordHash: "medecin123",
      firstName: "Dr.",
      lastName: "Martin",
      phoneNumber: "+33987654321",
      userType: UserType.medecin,
    },
  });

  // ✅ Create Patient
  const patient = await prisma.user.create({
    data: {
      email: "patient1@example.com",
      passwordHash: "patient123",
      firstName: "Sophie",
      lastName: "Lefevre",
      phoneNumber: "+33611223344",
      userType: UserType.patient,
    },
  });

  console.log("✅ Users created:", { tuteur, medecin, patient });
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
