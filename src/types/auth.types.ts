export interface JWTPayload {
  userId: string;
  userType: 'tuteur' | 'medecin' | 'patient';
  sessionId: string;
  permissions: string[];
  exp: number;
  iat: number;
}

export interface LoginRequest {
  emailOrPhone: string; // Can be email or phone number
  password: string;
  pushToken?: string; // Optional push token for automatic registration
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'tuteur' | 'medecin' | 'patient';
    phoneNumber: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userType: 'tuteur' | 'medecin' | 'patient';
}

export interface AuthError {
  success: false;
  message: string;
  field?: string;
}
