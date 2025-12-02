# mediCare Backend

A TypeScript Express backend for a healthcare medication management system.

## Features

- **Authentication System**: JWT-based authentication with role-based permissions
- **User Management**: Support for patients, doctors, and tutors
- **Medication Management**: Prescriptions, schedules, and reminders
- **Voice Messages**: Audio message system for medication reminders
- **Alert System**: Notifications for missed medications and no responses
- **Database**: PostgreSQL with Prisma ORM

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mediCare_Back
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/medicare_db"
   
   # JWT Configuration
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="24h"
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # (Optional) Seed the database
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "userType": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "patient",
    "phoneNumber": "+1234567890"
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "patient",
    "phoneNumber": "+1234567890"
  }
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

## JWT Token Structure

The JWT token contains the following payload:

```typescript
interface JWTPayload {
  userId: string;
  userType: 'tuteur' | 'medecin' | 'patient';
  sessionId: string;
  permissions: string[];
  exp: number;
  iat: number;
}
```

## User Types and Permissions

### Patient
- `read:own_medication`
- `read:own_reminder`
- `update:own_reminder`
- `read:own_alert`
- `read:own_voice_message`
- `create:own_voice_message`

### Tutor
- `read:patient`
- `read:medication`
- `read:reminder`
- `create:reminder`
- `update:reminder`
- `read:alert`
- `create:alert`
- `read:voice_message`
- `create:voice_message`

### Doctor
- All tutor permissions plus:
- `create:patient`
- `update:patient`
- `create:medication`
- `update:medication`
- `delete:medication`
- `read:prescription`
- `create:prescription`
- `update:prescription`
- `delete:prescription`

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed` - Seed the database with sample data

### Database

The project uses Prisma as the ORM. Key commands:

- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma studio` - Open Prisma Studio for database management

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Session management
- Role-based access control
- Input validation and sanitization
- CORS protection

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // For validation errors
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
