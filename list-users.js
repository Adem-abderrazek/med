/**
 * List users from Railway PostgreSQL database
 * Usage: node list-users.js [userType]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  const args = process.argv.slice(2);
  const userType = args[0]; // optional: patient, tuteur, medecin

  try {
    const where = userType ? { userType } : {};
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        userType: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📊 Found ${users.length} user(s)${userType ? ` (${userType})` : ''}:\n`);
    
    if (users.length === 0) {
      console.log('   No users found.');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 Phone: ${user.phoneNumber}`);
      console.log(`   👤 Type: ${user.userType}`);
      console.log(`   ✅ Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${user.createdAt.toISOString().split('T')[0]}`);
      console.log(`   🆔 ID: ${user.id}\n`);
    });

    console.log(`\n💡 To delete a user, run:`);
    console.log(`   node delete-users.js [email]\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();









