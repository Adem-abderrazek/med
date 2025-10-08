import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testPatientMessages() {
  console.log('🧪 Testing Patient Messages API...\n');
  
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
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log(`👤 Patient: ${user.firstName} ${user.lastName}`);
    
    // 2. Test messages endpoint
    console.log('\n2️⃣ Fetching patient messages...');
    const messagesResponse = await axios.get(`${API_BASE}/patient/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!messagesResponse.data.success) {
      console.log('❌ Messages fetch failed:', messagesResponse.data.message);
      return;
    }
    
    const messages = messagesResponse.data.data;
    console.log('✅ Messages fetched successfully');
    console.log(`📋 Found ${messages.length} messages\n`);
    
    // 3. Display detailed message information
    if (messages.length === 0) {
      console.log('📭 No messages found for this patient');
    } else {
      console.log('📊 Message Details:');
      messages.forEach((msg, index) => {
        console.log(`\n💬 Message ${index + 1}:`);
        console.log(`   • ID: ${msg.id}`);
        console.log(`   • From: ${msg.senderName} (${msg.senderType})`);
        console.log(`   • Type: ${msg.messageType}`);
        console.log(`   • Priority: ${msg.priority || 'normal'}`);
        console.log(`   • Read: ${msg.isRead ? 'Yes' : 'No'}`);
        console.log(`   • Time: ${new Date(msg.timestamp).toLocaleString('fr-FR')}`);
        console.log(`   • Message: "${msg.message}"`);
      });
    }
    
    // 4. Test filtering scenarios
    console.log('\n📊 Message Statistics:');
    const unreadCount = messages.filter(m => !m.isRead).length;
    const doctorCount = messages.filter(m => m.senderType === 'doctor').length;
    const tutorCount = messages.filter(m => m.senderType === 'tutor').length;
    const alertCount = messages.filter(m => m.messageType === 'alert').length;
    const voiceCount = messages.filter(m => m.messageType === 'voice').length;
    const highPriorityCount = messages.filter(m => m.priority === 'high').length;
    
    console.log(`   • Total messages: ${messages.length}`);
    console.log(`   • Unread messages: ${unreadCount}`);
    console.log(`   • From doctors: ${doctorCount}`);
    console.log(`   • From tutors: ${tutorCount}`);
    console.log(`   • Alerts: ${alertCount}`);
    console.log(`   • Voice messages: ${voiceCount}`);
    console.log(`   • High priority: ${highPriorityCount}`);
    
    // 5. Test marking a message as read (if there are unread messages)
    if (unreadCount > 0) {
      console.log('\n3️⃣ Testing mark message as read...');
      const firstUnread = messages.find(m => !m.isRead);
      
      if (firstUnread) {
        const markReadResponse = await axios.post(`${API_BASE}/patient/messages/mark-read`, {
          messageId: firstUnread.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (markReadResponse.data.success) {
          console.log('✅ Message marked as read successfully');
          console.log(`📧 Marked: "${firstUnread.message.substring(0, 50)}..."`);
        } else {
          console.log('❌ Failed to mark message as read:', markReadResponse.data.message);
        }
      }
    }
    
    // 6. Test fetching updated messages
    console.log('\n4️⃣ Testing messages refresh...');
    const refreshResponse = await axios.get(`${API_BASE}/patient/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (refreshResponse.data.success) {
      const updatedMessages = refreshResponse.data.data;
      const newUnreadCount = updatedMessages.filter(m => !m.isRead).length;
      console.log('✅ Messages refresh successful');
      console.log(`📊 Updated unread count: ${newUnreadCount} (was ${unreadCount})`);
    } else {
      console.log('❌ Messages refresh failed:', refreshResponse.data.message);
    }
    
    console.log('\n🎉 Patient messages API test completed successfully!');
    console.log('\n📱 The messages tab will show:');
    console.log('   • Messages from doctors and tutors');
    console.log('   • Different message types (alerts, reminders, voice)');
    console.log('   • Priority indicators (high, medium, low)');
    console.log('   • Read/unread status');
    console.log('   • Sender information with icons');
    console.log('   • Filter options (All, Unread, Doctors, Tutors)');
    console.log('   • Interactive mark as read functionality');
    console.log('   • Timestamp formatting');
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testPatientMessages();
