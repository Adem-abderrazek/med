import { PrismaClient } from '@prisma/client';

// Configure Prisma Client with connection pooling for Prisma Data Platform
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Handle connection errors gracefully
prisma.$connect().catch((error) => {
  console.error('❌ Failed to connect to database:', error.message);
  if (error.message.includes('db.prisma.io')) {
    console.error('💡 Tip: Check your Prisma Data Platform connection string in .env');
    console.error('   Make sure the connection string is up to date from Prisma Console');
  }
});

export default prisma;
