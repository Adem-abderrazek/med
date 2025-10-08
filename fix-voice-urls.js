// Fix voice message URLs in database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVoiceUrls() {
  console.log('🔧 Fixing voice message URLs...\n');
  
  try {
    // Get all voice messages
    const voiceMessages = await prisma.voiceMessage.findMany({
      select: {
        id: true,
        fileUrl: true,
        fileName: true
      }
    });
    
    console.log(`📊 Found ${voiceMessages.length} voice messages to check`);
    
    let updatedCount = 0;
    
    for (const message of voiceMessages) {
      console.log(`\n🎵 Checking message ${message.id}:`);
      console.log(`   Current URL: ${message.fileUrl}`);
      
      // Check if URL contains old IP addresses that need updating
      let newUrl = message.fileUrl;
      let needsUpdate = false;
      
      // Replace common old IP patterns with current network IP
      if (message.fileUrl.includes('192.168.1.24')) {
        newUrl = message.fileUrl.replace('192.168.1.24', '192.168.1.79');
        needsUpdate = true;
        console.log(`   🔄 Updating IP from 192.168.1.24 to 192.168.1.79`);
      } else if (message.fileUrl.includes('localhost')) {
        newUrl = message.fileUrl.replace('localhost', '192.168.1.79');
        needsUpdate = true;
        console.log(`   🔄 Updating from localhost to 192.168.1.79`);
      } else if (!message.fileUrl.includes('192.168.1.79') && message.fileUrl.includes('192.168.')) {
        // Replace any other 192.168.x.x with current IP
        newUrl = message.fileUrl.replace(/192\.168\.\d+\.\d+/, '192.168.1.79');
        needsUpdate = true;
        console.log(`   🔄 Updating IP to 192.168.1.79`);
      }
      
      if (needsUpdate) {
        try {
          await prisma.voiceMessage.update({
            where: { id: message.id },
            data: { fileUrl: newUrl }
          });
          console.log(`   ✅ Updated URL: ${newUrl}`);
          updatedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to update: ${error.message}`);
        }
      } else {
        console.log(`   ✅ URL is already correct`);
      }
    }
    
    console.log(`\n🎉 Voice URL fix completed!`);
    console.log(`   • Total messages checked: ${voiceMessages.length}`);
    console.log(`   • Messages updated: ${updatedCount}`);
    
    if (updatedCount > 0) {
      console.log('\n📱 Voice messages should now play correctly in the mobile app!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing voice URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixVoiceUrls();
