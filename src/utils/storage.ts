import path from 'path';
import fs from 'fs';

// Local file storage for voice messages (no AWS dependency)
const uploadsDir = process.env.UPLOADS_DIR || './uploads/voice-messages';

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadFile(file: Buffer, fileName: string): Promise<string> {
  const key = `${Date.now()}-${fileName}`;
  const filePath = path.join(uploadsDir, key);

  fs.writeFileSync(filePath, file);

  // Return relative URL path
  return `/uploads/voice-messages/${key}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const key = path.basename(fileUrl);
  const filePath = path.join(uploadsDir, key);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function getSignedFileUrl(key: string): Promise<string> {
  // For local storage, just return the relative URL
  return `/uploads/voice-messages/${key}`;
}