/**
 * Phone Number Normalization Utility
 * Handles all edge cases and formats for Tunisia phone numbers
 */

export interface PhoneNormalizationResult {
  normalized: string;        // E.g., "+21652536742"
  withoutPlus: string;       // E.g., "21652536742"
  localFormat: string;       // E.g., "52536742"
  isValid: boolean;
  formats: string[];         // All possible formats for searching
}

/**
 * Normalize phone number to standard format: +21652536742
 */
export function normalizePhoneNumber(phone: string | null | undefined): PhoneNormalizationResult {
  // Handle null/undefined
  if (!phone || typeof phone !== 'string') {
    return {
      normalized: '',
      withoutPlus: '',
      localFormat: '',
      isValid: false,
      formats: []
    };
  }

  // Remove all non-digit characters (spaces, dashes, parentheses, etc.)
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Remove + for processing
  const hasPlus = cleanPhone.startsWith('+');
  if (hasPlus) {
    cleanPhone = cleanPhone.substring(1);
  }

  let normalized = '';
  let localFormat = '';

  // Case 1: Already has 216 country code (11 digits: 21652536742)
  if (cleanPhone.startsWith('216') && cleanPhone.length === 11) {
    normalized = `+${cleanPhone}`;
    localFormat = cleanPhone.substring(3); // Remove 216
  }
  // Case 2: Starts with 0 (9 digits: 052536742)
  else if (cleanPhone.startsWith('0') && cleanPhone.length === 9) {
    normalized = `+216${cleanPhone.substring(1)}`;
    localFormat = cleanPhone.substring(1);
  }
  // Case 3: Just 8 digits (52536742)
  else if (cleanPhone.length === 8 && !cleanPhone.startsWith('0')) {
    normalized = `+216${cleanPhone}`;
    localFormat = cleanPhone;
  }
  // Case 4: International number (not Tunisia)
  else if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
    normalized = `+${cleanPhone}`;
    localFormat = cleanPhone;
  }
  else {
    // Invalid format
    return {
      normalized: phone, // Keep original
      withoutPlus: phone,
      localFormat: phone,
      isValid: false,
      formats: [phone]
    };
  }

  const withoutPlus = normalized.substring(1);

  // Generate all possible search formats
  const formats = [
    normalized,           // +21652536742
    withoutPlus,          // 21652536742
    localFormat,          // 52536742
    `0${localFormat}`,    // 052536742
  ];

  // Remove duplicates and empty strings
  const uniqueFormats = [...new Set(formats)].filter(f => f && f.length > 0);

  return {
    normalized,
    withoutPlus,
    localFormat,
    isValid: true,
    formats: uniqueFormats
  };
}

/**
 * Check if two phone numbers are the same (handles different formats)
 */
export function arePhonesEqual(phone1: string, phone2: string): boolean {
  const norm1 = normalizePhoneNumber(phone1);
  const norm2 = normalizePhoneNumber(phone2);
  
  if (!norm1.isValid || !norm2.isValid) {
    return phone1 === phone2; // Fallback to exact match
  }
  
  return norm1.normalized === norm2.normalized;
}

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

