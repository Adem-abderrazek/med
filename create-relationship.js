import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function createRelationship() {
  try {
    console.log('🔗 Creating tutor-patient relationship...');
    
    await prisma.$connect();
    console.log('✅ Connected to Railway database');
    
    const tutorId = '7c3549fa-fc51-46a1-abd3-36ca2068f16b';
    const patientId = '1c5f6fc7-2caf-4297-9328-6ef252b14d05';
    
    // Create the relationship
    const relationship = await prisma.userRelationship.create({
      data: {
        caregiverId: tutorId,
        patientId: patientId,
        relationshipType: 'tuteur',
        isActive: true
      }
    });
    
    console.log('✅ Relationship created:', relationship);
    
    // Verify the relationship
    const verification = await prisma.userRelationship.findFirst({
      where: {
        caregiverId: tutorId,
        patientId: patientId,
        relationshipType: 'tuteur',
        isActive: true
      }
    });
    
    console.log('✅ Relationship verified:', !!verification);
    
  } catch (error) {
    console.error('❌ Error creating relationship:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRelationship();
