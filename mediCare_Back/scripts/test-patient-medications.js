import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testPatientMedications() {
  console.log('🧪 Testing Patient Medications API...\n');
  
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
    
    // 2. Test medications endpoint
    console.log('\n2️⃣ Fetching patient medications...');
    const medicationsResponse = await axios.get(`${API_BASE}/patient/medications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!medicationsResponse.data.success) {
      console.log('❌ Medications fetch failed:', medicationsResponse.data.message);
      return;
    }
    
    const medications = medicationsResponse.data.data;
    console.log('✅ Medications fetched successfully');
    console.log(`📋 Found ${medications.length} medications\n`);
    
    // 3. Display detailed medication information
    medications.forEach((med, index) => {
      console.log(`📊 Medication ${index + 1}:`);
      console.log(`   • Name: ${med.medicationName}`);
      console.log(`   • Dosage: ${med.dosage}`);
      console.log(`   • Prescribed by: ${med.prescribedBy}`);
      console.log(`   • Start date: ${new Date(med.startDate).toLocaleDateString('fr-FR')}`);
      if (med.endDate) {
        console.log(`   • End date: ${new Date(med.endDate).toLocaleDateString('fr-FR')}`);
      }
      console.log(`   • Status: ${med.isActive ? 'Actif' : 'Inactif'}`);
      console.log(`   • Chronic: ${med.isChronic ? 'Oui' : 'Non'}`);
      console.log(`   • Adherence: ${med.adherenceRate}% (${med.takenDoses}/${med.totalDoses})`);
      console.log(`   • Schedules: ${med.schedules.length}`);
      
      med.schedules.forEach((schedule, schedIndex) => {
        const time = new Date(schedule.scheduledTime).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const days = schedule.daysOfWeek.length === 7 ? 'Tous les jours' : 
                    schedule.daysOfWeek.map(d => ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d === 7 ? 0 : d]).join(', ');
        console.log(`     ${schedIndex + 1}. ${time} - ${days}`);
      });
      console.log('');
    });
    
    // 4. Test filtering scenarios
    console.log('📊 Medication Statistics:');
    const activeCount = medications.filter(m => m.isActive).length;
    const chronicCount = medications.filter(m => m.isChronic).length;
    const totalSchedules = medications.reduce((sum, m) => sum + m.schedules.length, 0);
    const avgAdherence = medications.length > 0 
      ? Math.round(medications.reduce((sum, m) => sum + m.adherenceRate, 0) / medications.length)
      : 0;
    
    console.log(`   • Total medications: ${medications.length}`);
    console.log(`   • Active medications: ${activeCount}`);
    console.log(`   • Chronic medications: ${chronicCount}`);
    console.log(`   • Total schedules: ${totalSchedules}`);
    console.log(`   • Average adherence: ${avgAdherence}%`);
    
    console.log('\n🎉 Patient medications API test completed successfully!');
    console.log('\n📱 The medications tab will show:');
    console.log('   • Complete medication list with details');
    console.log('   • Prescribing doctor information');
    console.log('   • Dosage and schedule information');
    console.log('   • Adherence statistics');
    console.log('   • Active/Inactive status');
    console.log('   • Chronic medication indicators');
    console.log('   • Filter options (All, Active, Chronic)');
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testPatientMedications();
