export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword?: boolean;
  phoneNumber?: string | null;
};

export type LoginRequest = {
  identifier?: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  rememberMe?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
};

export type RegisterResponse = {
  accessToken: string;
  user: AuthUser;
};
