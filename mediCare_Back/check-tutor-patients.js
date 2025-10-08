const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTutorPatients() {
  const tutorId = 'a53d9a13-9e7b-447a-ac31-eb9d14b94202';
  
  console.log('🔍 Checking tutor relationships...');
  console.log('Tutor ID:', tutorId);
  console.log('');
  
  // Get all relationships for this tutor
  const relationships = await prisma.userRelationship.findMany({
    where: {
      caregiverId: tutorId
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          email: true,
          userType: true
        }
      }
    }
  });
  
  console.log('📊 Total relationships found:', relationships.length);
  console.log('');
  
  relationships.forEach((rel, index) => {
    console.log(`${index + 1}. Relationship ID: ${rel.id}`);
    console.log(`   Patient: ${rel.patient.firstName} ${rel.patient.lastName}`);
    console.log(`   Phone: ${rel.patient.phoneNumber}`);
    console.log(`   Email: ${rel.patient.email}`);
    console.log(`   Relationship Type: ${rel.relationshipType}`);
    console.log(`   Is Active: ${rel.isActive}`);
    console.log('');
  });
  
  // Now check with the same query the service uses
  console.log('🔍 Checking with service query (medecin, tuteur)...');
  const serviceQuery = await prisma.userRelationship.findMany({
    where: {
      caregiverId: tutorId,
      relationshipType: { in: ['medecin', 'tuteur'] },
      isActive: true,
      patient: {
        isActive: true
      }
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          email: true,
          isActive: true
        }
      }
    }
  });
  
  console.log('📊 Service query results:', serviceQuery.length);
  serviceQuery.forEach((rel, index) => {
    console.log(`${index + 1}. ${rel.patient.firstName} ${rel.patient.lastName} - Type: ${rel.relationshipType}, Active: ${rel.isActive}, Patient Active: ${rel.patient.isActive}`);
  });
  
  await prisma.$disconnect();
}

checkTutorPatients().catch(console.error);

