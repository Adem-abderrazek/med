/**
 * Delete users from Railway PostgreSQL database
 * Usage: node delete-users.js [email] OR node delete-users.js --all
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUsers() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage:');
    console.log('  node delete-users.js [email]        - Delete specific user');
    console.log('  node delete-users.js --all          - Delete ALL users');
    console.log('  node delete-users.js --type patient - Delete all patients');
    console.log('  node delete-users.js --type tuteur  - Delete all tuteurs');
    console.log('  node delete-users.js --type medecin - Delete all doctors');
    process.exit(1);
  }

  try {
    if (args[0] === '--all') {
      console.log('⚠️  WARNING: This will delete ALL users!');
      console.log('🗑️  Deleting all users...');
      
      const deleted = await prisma.user.deleteMany({});
      console.log(`✅ Deleted ${deleted.count} users`);
      
    } else if (args[0] === '--type' && args[1]) {
      const userType = args[1];
      console.log(`🗑️  Deleting all ${userType}s...`);
      
      const deleted = await prisma.user.deleteMany({
        where: { userType }
      });
      console.log(`✅ Deleted ${deleted.count} ${userType}s`);
      
    } else {
      const email = args[0];
      console.log(`🗑️  Deleting user: ${email}...`);
      
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        console.log('❌ User not found');
        process.exit(1);
      }
      
      await prisma.user.delete({ where: { email } });
      console.log(`✅ Deleted user: ${user.firstName} ${user.lastName} (${email})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUsers();








