import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Test data
const testPhone = '+21612345678';
const testPatient = {
  firstName: 'Ahmed',
  lastName: 'Ben Ali',
  phoneNumber: testPhone
};

async function testCredentialGeneration() {
  console.log('🧪 Testing new credential generation system...\n');
  
  try {
    // First, login as a tutor to get auth token
    console.log('1️⃣ Logging in as tutor...');
    const tutorLogin = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: 'tutor@example.com',
      password: 'password123'
    });
    
    if (!tutorLogin.data.success) {
      console.log('❌ Tutor login failed:', tutorLogin.data.message);
      return;
    }
    
    const tutorToken = tutorLogin.data.token;
    console.log('✅ Tutor logged in successfully');
    
    // Send patient invitation
    console.log('\n2️⃣ Sending patient invitation...');
    const invitation = await axios.post(`${API_BASE}/tutor/patients/invite`, testPatient, {
      headers: { Authorization: `Bearer ${tutorToken}` }
    });
    
    if (!invitation.data.success) {
      console.log('❌ Invitation failed:', invitation.data.message);
      return;
    }
    
    console.log('✅ Invitation sent successfully');
    console.log('📧 Generated email:', invitation.data.generatedEmail);
    
    // Extract credentials from the response
    const generatedEmail = invitation.data.generatedEmail;
    
    // For testing, we know the password is the last 4 digits of the phone
    const phoneDigits = testPhone.replace(/\D/g, '');
    const generatedPassword = phoneDigits.slice(-4);
    
    console.log('\n📋 Generated Credentials:');
    console.log(`📧 Email: ${generatedEmail}`);
    console.log(`🔑 Password: ${generatedPassword}`);
    
    // Test login with email
    console.log('\n3️⃣ Testing login with generated email...');
    const emailLogin = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: generatedEmail,
      password: generatedPassword
    });
    
    if (emailLogin.data.success) {
      console.log('✅ Email login successful!');
      console.log('👤 User:', emailLogin.data.user.firstName, emailLogin.data.user.lastName);
    } else {
      console.log('❌ Email login failed:', emailLogin.data.message);
    }
    
    // Test login with phone number
    console.log('\n4️⃣ Testing login with phone number...');
    const phoneLogin = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: testPhone,
      password: generatedPassword
    });
    
    if (phoneLogin.data.success) {
      console.log('✅ Phone login successful!');
      console.log('👤 User:', phoneLogin.data.user.firstName, phoneLogin.data.user.lastName);
    } else {
      console.log('❌ Phone login failed:', phoneLogin.data.message);
    }
    
    // Test login with phone number without country code
    console.log('\n5️⃣ Testing login with phone number (no country code)...');
    const localPhone = testPhone.replace('+216', '');
    const localPhoneLogin = await axios.post(`${API_BASE}/auth/login`, {
      emailOrPhone: localPhone,
      password: generatedPassword
    });
    
    if (localPhoneLogin.data.success) {
      console.log('✅ Local phone login successful!');
      console.log('👤 User:', localPhoneLogin.data.user.firstName, localPhoneLogin.data.user.lastName);
    } else {
      console.log('❌ Local phone login failed:', localPhoneLogin.data.message);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

// Run the test
testCredentialGeneration();
