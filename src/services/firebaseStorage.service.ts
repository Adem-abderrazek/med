/**
 * Firebase Storage Service
 * Handles voice message file uploads to Firebase Cloud Storage
 */

import * as admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin if not already initialized
let firebaseInitialized = false;

try {
  if (admin.apps.length === 0) {
    // Check if we have environment variables (production)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      // Production: Use environment variables
      console.log('🔥 Initializing Firebase with environment variables');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
        storageBucket: `${projectId}.appspot.com`,
      });
      firebaseInitialized = true;
      console.log('✅ Firebase initialized with env vars');
    } else {
      // Development: Use service account file
      console.log('🔥 Initializing Firebase with service account file (development)');
      try {
        const serviceAccountPath = path.join(process.cwd(), 'medicare-244b3-firebase-adminsdk-fbsvc-21e2b2edf9.json');
        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'medicare-244b3.appspot.com',
        });
        firebaseInitialized = true;
        console.log('✅ Firebase initialized with service account file');
      } catch (fileError) {
        console.error('❌ Firebase service account file not found');
      }
    }
  } else {
    firebaseInitialized = true;
    console.log('✅ Firebase already initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  firebaseInitialized = false;
}

export class FirebaseStorageService {
  private bucket: ReturnType<typeof admin.storage> | null = null;

  constructor() {
    if (firebaseInitialized && admin.apps.length > 0) {
      try {
        this.bucket = admin.storage();
        console.log('✅ Firebase Storage initialized');
      } catch (error) {
        console.error('❌ Failed to get Firebase Storage:', error);
      }
    }
  }

  /**
   * Check if Firebase Storage is available
   */
  isAvailable(): boolean {
    return !!this.bucket && firebaseInitialized;
  }

  /**
   * Upload a voice message file to Firebase Storage
   */
  async uploadVoiceFile(
    fileBase64: string,
    fileName: string,
    contentType: string = 'audio/m4a'
  ): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Firebase Storage is not initialized',
      };
    }

    try {
      console.log('📤 Uploading voice file to Firebase Storage:', fileName);
      console.log('📊 File size (base64):', fileBase64.length, 'bytes');

      // Convert base64 to buffer
      const buffer = Buffer.from(fileBase64, 'base64');
      console.log('📊 Actual file size:', buffer.length, 'bytes');

      // Create file path in Firebase Storage
      const storagePath = `voice-messages/${fileName}`;
      const bucket = this.bucket!.bucket();
      const file = bucket.file(storagePath);

      // Upload the file
      await file.save(buffer, {
        contentType,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: this.generateToken(),
          },
        },
        public: true, // Make file publicly accessible
      });

      // Get public URL
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

      console.log('✅ Voice file uploaded to Firebase Storage');
      console.log('🔗 Public URL:', publicUrl);

      return {
        success: true,
        fileUrl: publicUrl,
      };
    } catch (error) {
      console.error('❌ Error uploading to Firebase Storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a voice file from Firebase Storage
   */
  async deleteVoiceFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Firebase Storage is not initialized',
      };
    }

    try {
      // Extract file path from URL
      const match = fileUrl.match(/voice-messages%2F([^?]+)/);
      if (!match) {
        throw new Error('Invalid file URL format');
      }

      const fileName = decodeURIComponent(match[1]);
      const storagePath = `voice-messages/${fileName}`;

      console.log('🗑️ Deleting voice file from Firebase Storage:', storagePath);

      const bucket = this.bucket!.bucket();
      const file = bucket.file(storagePath);
      await file.delete();

      console.log('✅ Voice file deleted from Firebase Storage');

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting from Firebase Storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a random token for download URLs
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export const firebaseStorageService = new FirebaseStorageService();
export default firebaseStorageService;

