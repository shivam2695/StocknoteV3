export interface User {
  email: string;
  name: string;
  verified?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}