interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://mon-compte.educanet.pro/mobile/notificationgeneral/sendsms/Medicare';
    console.log('📱 SMS service initialized with Educanet API');
  }

  async sendSMS(to: string, message: string): Promise<SMSResponse> {
    console.log('═══════════════════════════════════════════════════');
    console.log('📱 SMS SERVICE - SENDING SMS');
    console.log('═══════════════════════════════════════════════════');
    
    try {
      console.log('📥 Input phone number:', to);
      console.log('📝 Message length:', message.length);
      console.log('📝 Message preview:', message.substring(0, 100) + '...');
      
      // Clean and format phone number for Educanet API
      let cleanPhoneNumber = to.replace(/[\s\-\(\)]/g, '');
      console.log('🧹 After removing spaces/dashes:', cleanPhoneNumber);
      
      // Remove the + if present
      if (cleanPhoneNumber.startsWith('+')) {
        cleanPhoneNumber = cleanPhoneNumber.substring(1);
        console.log('➖ After removing +:', cleanPhoneNumber);
      }
      
      // Ensure it has the 216 country code
      if (!cleanPhoneNumber.startsWith('216')) {
        // If it starts with 0, remove it and add 216
        if (cleanPhoneNumber.startsWith('0')) {
          cleanPhoneNumber = '216' + cleanPhoneNumber.substring(1);
          console.log('🔢 Added 216 (was 0XX):', cleanPhoneNumber);
        } else {
          // Assume it's just the 8 digits, add 216
          cleanPhoneNumber = '216' + cleanPhoneNumber;
          console.log('🔢 Added 216 (was 8 digits):', cleanPhoneNumber);
        }
      } else {
        console.log('✅ Already has 216 prefix:', cleanPhoneNumber);
      }

      console.log('📱 Final formatted number:', cleanPhoneNumber);

      // Encode the message for URL
      const encodedMessage = encodeURIComponent(message);
      console.log('🔐 Message encoded for URL');
      
      const url = `${this.baseUrl}/${cleanPhoneNumber}/${encodedMessage}`;
      console.log('🌐 Full SMS URL:', url);
      console.log('📏 URL length:', url.length);

      console.log('📤 Sending HTTP GET request to Educanet...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status, response.statusText);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const responseText = await response.text();
        console.log('📥 Response body:', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('📥 Parsed response:', responseData);
          
          // Check if Educanet returned success
          if (responseData.etat === 'ok') {
            console.log('✅ Educanet confirmed SMS sent (etat: ok)');
            console.log('═══════════════════════════════════════════════════');
            return {
              success: true,
              messageId: `educanet_${Date.now()}`,
            };
          } else {
            console.error('⚠️ Educanet response etat not ok:', responseData.etat);
            console.log('═══════════════════════════════════════════════════');
            return {
              success: false,
              error: `Educanet error: ${responseData.etat || 'Unknown'}`,
            };
          }
        } catch (parseErr) {
          console.log('⚠️ Could not parse response as JSON, raw text:', responseText);
          // If we got 200 OK but can't parse, assume success
          console.log('✅ SMS sent successfully via Educanet API (200 OK)');
          console.log('═══════════════════════════════════════════════════');
          return {
            success: true,
            messageId: `educanet_${Date.now()}`,
          };
        }
      } else {
        const errorBody = await response.text();
        console.error('❌ SMS send failed!');
        console.error('❌ Status:', response.status, response.statusText);
        console.error('❌ Response body (first 500 chars):', errorBody.substring(0, 500));
        console.error('❌ Full URL that failed:', url);
        console.log('═══════════════════════════════════════════════════');
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ SMS SERVICE ERROR');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Error type:', error instanceof Error ? 'Error' : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      console.log('═══════════════════════════════════════════════════');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendInvitationSMS(phoneNumber: string, email: string, password: string): Promise<SMSResponse> {
    console.log('───────────────────────────────────────────────────');
    console.log('📨 SENDING INVITATION SMS');
    console.log('───────────────────────────────────────────────────');
    console.log('📱 Phone number:', phoneNumber);
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    
    // Simplified message - single line, no special chars
    const message = `Medicare: Email: ${email} Password: ${password}`;
    console.log('📝 SMS message prepared:', message);
    console.log('📝 Message length:', message.length);

    const result = await this.sendSMS(phoneNumber, message);
    console.log('📨 Invitation SMS result:', result);
    console.log('───────────────────────────────────────────────────');
    
    return result;
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResponse> {
    console.log('───────────────────────────────────────────────────');
    console.log('📨 SENDING VERIFICATION CODE SMS');
    console.log('───────────────────────────────────────────────────');
    console.log('📱 Phone number:', phoneNumber);
    console.log('🔢 Code:', code);
    
    const message = `Votre code de verification MediCare est: ${code}. Ne partagez ce code avec personne.`;
    console.log('📝 SMS message prepared:', message);
    console.log('📝 Message length:', message.length);

    const result = await this.sendSMS(phoneNumber, message);
    console.log('📨 Verification SMS result:', result);
    console.log('───────────────────────────────────────────────────');
    
    return result;
  }
}

export const smsService = new SMSService();