import twilio from 'twilio';

class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    // Get credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    // Remove any spaces from the phone number
    this.fromNumber = (process.env.TWILIO_PHONE_NUMBER || '').replace(/\s/g, '');

    console.log('🔍 Twilio Service Constructor Debug:');
    console.log('🔍 Account SID exists:', !!accountSid);
    console.log('🔍 Auth Token exists:', !!authToken);
    console.log('🔍 Phone Number:', this.fromNumber);
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

    if (!accountSid || !authToken) {
      console.warn('⚠️ Twilio credentials not found. SMS will be simulated.');
      this.client = null as any;
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('✅ Twilio client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
      this.client = null as any;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('🔍 sendSMS Debug:');
      console.log('🔍 To:', to);
      console.log('🔍 Message length:', message.length);
      console.log('🔍 Client exists:', !!this.client);
      console.log('🔍 From number:', this.fromNumber);
      console.log('🔍 Is configured:', this.isConfigured());

      // If Twilio is not configured, simulate SMS
      if (!this.client || !this.fromNumber) {
        console.log('📱 [SIMULATED] SMS would be sent to:', to);
        console.log('📱 [SIMULATED] Message:', message);
        return { success: true, messageId: 'simulated_' + Date.now() };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      // Check if trying to send to the same number
      const formattedTo = this.formatPhoneNumber(to);
      if (formattedTo === this.fromNumber) {
        throw new Error('Cannot send SMS to the same number as your Twilio phone number');
      }

      console.log('🔍 Phone validation passed, sending via Twilio...');

      // Send real SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: this.formatPhoneNumber(to)
      });

      console.log('✅ SMS sent successfully via Twilio:', result.sid);
      return { success: true, messageId: result.sid };

    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      };
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if it's a valid length (7-15 digits)
    if (digits.length < 7 || digits.length > 15) {
      return false;
    }

    return true;
  }

  /**
   * Format phone number for Twilio (add country code if needed)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add Tunisian country code +216
    if (!cleaned.startsWith('+')) {
      // For Tunisian numbers, add +216 prefix
      return '+216' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Check if Twilio is properly configured
   */
  isConfigured(): boolean {
    return !!(this.client && this.fromNumber);
  }
}

export default new TwilioService();
