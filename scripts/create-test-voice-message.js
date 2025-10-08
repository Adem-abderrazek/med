import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestVoiceMessage() {
  console.log('🎤 Creating test voice message...\n');
  
  try {
    // Find the patient (Jean Dupont)
    const patient = await prisma.user.findFirst({
      where: {
        email: 'patient4@example.com'
      }
    });

    if (!patient) {
      console.log('❌ Patient not found');
      return;
    }

    // Find a tutor to be the creator
    const tutor = await prisma.user.findFirst({
      where: {
        userType: 'tuteur'
      }
    });

    if (!tutor) {
      console.log('❌ Tutor not found');
      return;
    }

    console.log(`👤 Patient: ${patient.firstName} ${patient.lastName}`);
    console.log(`👥 Tutor: ${tutor.firstName} ${tutor.lastName}`);

    // Create a test voice message
    const voiceMessage = await prisma.voiceMessage.create({
      data: {
        creatorId: tutor.id,
        patientId: patient.id,
        fileUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Test audio file
        fileName: 'test-voice-message.wav',
        durationSeconds: 15,
        isActive: true
      }
    });

    console.log('✅ Voice message created successfully!');
    console.log(`🎵 Voice Message ID: ${voiceMessage.id}`);
    console.log(`📁 File URL: ${voiceMessage.fileUrl}`);
    console.log(`⏱️  Duration: ${voiceMessage.durationSeconds}s`);
    console.log(`📅 Created: ${voiceMessage.createdAt}`);

    // Test fetching the voice message through the API
    console.log('\n🧪 Testing voice message in patient messages...');
    
    // Import axios for API testing
    const axios = (await import('axios')).default;
    const API_BASE = 'http://localhost:5000/api';

    // Login as patient
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: 'patient4@example.com',
      password: 'Test123'
    });

    if (loginResponse.data.success) {
      const token = loginResponse.data.token;
      
      // Fetch messages
      const messagesResponse = await axios.get(`${API_BASE}/patient/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (messagesResponse.data.success) {
        const messages = messagesResponse.data.data;
        const voiceMessages = messages.filter(m => m.messageType === 'voice');
        
        console.log(`📋 Total messages: ${messages.length}`);
        console.log(`🎤 Voice messages: ${voiceMessages.length}`);
        
        if (voiceMessages.length > 0) {
          const voiceMsg = voiceMessages[0];
          console.log('\n🎵 Voice Message Details:');
          console.log(`   • ID: ${voiceMsg.id}`);
          console.log(`   • From: ${voiceMsg.senderName}`);
          console.log(`   • Message: ${voiceMsg.message}`);
          console.log(`   • File URL: ${voiceMsg.fileUrl}`);
          console.log(`   • Duration: ${voiceMsg.durationSeconds}s`);
          console.log(`   • Type: ${voiceMsg.messageType}`);
        }
      }
    }

    console.log('\n🎉 Test voice message setup completed!');
    console.log('\n📱 The patient can now:');
    console.log('   • See voice messages in the messages tab');
    console.log('   • Play/pause audio with the play button');
    console.log('   • See duration information');
    console.log('   • Filter voice messages specifically');

  } catch (error) {
    console.error('❌ Error creating test voice message:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestVoiceMessage();
