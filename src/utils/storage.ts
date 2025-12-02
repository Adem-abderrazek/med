import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = process.env.AWS_BUCKET_NAME || '';

export async function uploadFile(file: Buffer, fileName: string): Promise<string> {
  const key = `voice-messages/${Date.now()}-${fileName}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: 'audio/mpeg'
  }));

  // Generate a signed URL that expires in 24 hours
  const signedUrl = await getSignedUrl(s3Client, 
    new PutObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn: 86400 }
  );

  return signedUrl;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const key = path.basename(fileUrl);
  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: `voice-messages/${key}`
  }));
}

export async function getSignedFileUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `voice-messages/${key}`
  });

  return getSignedUrl(s3Client, command, { expiresIn: 86400 });
}