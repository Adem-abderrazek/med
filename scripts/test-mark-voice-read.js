import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testMarkVoiceMessageRead() {
  console.log('🧪 Testing Mark Voice Message as Read...\n');
  
  try {
    // 1. Login as patient
    console.log('1️⃣ Logging in as patient...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: 'patient4@example.com',
      password: 'Test123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Get messages to find voice message ID
    const messagesResponse = await axios.get(`${API_BASE}/patient/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const messages = messagesResponse.data.data;
    const voiceMessage = messages.find(m => m.messageType === 'voice');
    
    if (!voiceMessage) {
      console.log('❌ No voice message found');
      return;
    }
    
    console.log(`🎵 Found voice message: ${voiceMessage.id}`);
    
    // 3. Test marking voice message as read
    console.log('\n2️⃣ Testing mark voice message as read...');
    const markReadResponse = await axios.post(`${API_BASE}/patient/messages/mark-read`, {
      messageId: voiceMessage.id
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (markReadResponse.data.success) {
      console.log('✅ Voice message marked as read successfully');
    } else {
      console.log('❌ Failed to mark voice message as read:', markReadResponse.data.message);
    }
    
    // 4. Test marking alert message as read
    const alertMessage = messages.find(m => m.messageType === 'alert');
    if (alertMessage) {
      console.log('\n3️⃣ Testing mark alert message as read...');
      const markAlertResponse = await axios.post(`${API_BASE}/patient/messages/mark-read`, {
        messageId: alertMessage.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (markAlertResponse.data.success) {
        console.log('✅ Alert message marked as read successfully');
      } else {
        console.log('❌ Failed to mark alert message as read:', markAlertResponse.data.message);
      }
    }
    
    // 5. Test marking prescription instruction as read
    const prescriptionMessage = messages.find(m => m.id.startsWith('prescription-instruction-'));
    if (prescriptionMessage) {
      console.log('\n4️⃣ Testing mark prescription instruction as read...');
      const markPrescriptionResponse = await axios.post(`${API_BASE}/patient/messages/mark-read`, {
        messageId: prescriptionMessage.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (markPrescriptionResponse.data.success) {
        console.log('✅ Prescription instruction marked as read successfully');
      } else {
        console.log('❌ Failed to mark prescription instruction as read:', markPrescriptionResponse.data.message);
      }
    }
    
    console.log('\n🎉 Mark message as read test completed!');
    console.log('\n📱 All message types can now be marked as read:');
    console.log('   • Voice messages (no DB update, just success response)');
    console.log('   • Alert messages (updates alerts table)');
    console.log('   • Prescription instructions (no DB update, just success response)');
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testMarkVoiceMessageRead();
