const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDoctorPassword() {
  try {
    const email = 'dr.martin@example.com';
    const newPassword = 'password123'; // Simple password for testing
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { passwordHash: hashedPassword }
    });
    
    console.log('✅ Password reset successfully for:', email);
    console.log('🔑 New password:', newPassword);
    console.log('👤 User:', updatedUser.firstName, updatedUser.lastName);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDoctorPassword();
