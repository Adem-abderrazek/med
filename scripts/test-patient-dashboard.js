import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testPatientDashboard() {
  console.log('🧪 Testing Patient Dashboard API...\n');
  
  try {
    // First, login as a patient to get auth token
    console.log('1️⃣ Logging in as patient...');
    // Try with the seed data patient
    const patientLogin = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: 'patient4@example.com',
      password: 'Test123'
    });
    
    if (!patientLogin.data.success) {
      console.log('❌ Patient login failed:', patientLogin.data.message);
      return;
    }
    
    const patientToken = patientLogin.data.token;
    console.log('✅ Patient logged in successfully');
    console.log('👤 Patient:', patientLogin.data.user.firstName, patientLogin.data.user.lastName);
    
    // Test dashboard endpoint
    console.log('\n2️⃣ Testing dashboard endpoint...');
    try {
      const dashboard = await axios.get(`${API_BASE}/patient/dashboard`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      
      if (dashboard.data.success) {
        console.log('✅ Dashboard data retrieved successfully');
        console.log('📊 Dashboard stats:');
        console.log(`   • Overdue medications: ${dashboard.data.data.overdueMedications.length}`);
        console.log(`   • Next medications: ${dashboard.data.data.nextMedications.length}`);
        console.log(`   • Tutor messages: ${dashboard.data.data.tutorMessages.length}`);
        console.log(`   • Total medications today: ${dashboard.data.data.totalMedicationsToday}`);
        console.log(`   • Taken today: ${dashboard.data.data.takenToday}`);
        console.log(`   • Adherence rate: ${dashboard.data.data.adherenceRate}%`);
      } else {
        console.log('❌ Dashboard failed:', dashboard.data.message);
      }
    } catch (error) {
      console.log('❌ Dashboard error:', error.response?.data?.message || error.message);
    }
    
    // Test overdue medications endpoint
    console.log('\n3️⃣ Testing overdue medications endpoint...');
    try {
      const overdue = await axios.get(`${API_BASE}/patient/medications/overdue`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      
      if (overdue.data.success) {
        console.log('✅ Overdue medications retrieved successfully');
        console.log(`📋 Found ${overdue.data.data.length} overdue medications`);
        overdue.data.data.forEach((med, index) => {
          console.log(`   ${index + 1}. ${med.medicationName} (${med.dosage}) - ${med.minutesOverdue} minutes overdue`);
        });
      } else {
        console.log('❌ Overdue medications failed:', overdue.data.message);
      }
    } catch (error) {
      console.log('❌ Overdue medications error:', error.response?.data?.message || error.message);
    }
    
    // Test next medications endpoint
    console.log('\n4️⃣ Testing next medications endpoint...');
    try {
      const next = await axios.get(`${API_BASE}/patient/medications/next`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      
      if (next.data.success) {
        console.log('✅ Next medications retrieved successfully');
        console.log(`📋 Found ${next.data.data.length} upcoming medications`);
        next.data.data.forEach((med, index) => {
          console.log(`   ${index + 1}. ${med.medicationName} (${med.dosage}) - in ${med.minutesUntil} minutes`);
        });
      } else {
        console.log('❌ Next medications failed:', next.data.message);
      }
    } catch (error) {
      console.log('❌ Next medications error:', error.response?.data?.message || error.message);
    }
    
    // Test tutor messages endpoint
    console.log('\n5️⃣ Testing tutor messages endpoint...');
    try {
      const messages = await axios.get(`${API_BASE}/patient/messages/tutors`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      
      if (messages.data.success) {
        console.log('✅ Tutor messages retrieved successfully');
        console.log(`📋 Found ${messages.data.data.length} messages`);
        messages.data.data.forEach((msg, index) => {
          console.log(`   ${index + 1}. From ${msg.tutorName}: ${msg.message.substring(0, 50)}...`);
        });
      } else {
        console.log('❌ Tutor messages failed:', messages.data.message);
      }
    } catch (error) {
      console.log('❌ Tutor messages error:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Patient dashboard API tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testPatientDashboard();
