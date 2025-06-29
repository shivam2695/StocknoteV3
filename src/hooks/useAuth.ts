import { useState, useEffect } from 'react';
import { AuthState, User } from '../types/Auth';
import { apiService } from '../services/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('authToken');
      const currentUser = localStorage.getItem('currentUser');
      
      console.log('Checking auth status:', { hasToken: !!token, hasUser: !!currentUser });
      
      if (token && currentUser) {
        try {
          // Parse stored user data
          const user = JSON.parse(currentUser);
          
          // Verify token with backend
          const response = await apiService.getUserProfile();
          if (response.success && response.data.user) {
            setAuthState({
              isAuthenticated: true,
              user: response.data.user,
            });
            console.log('Auth verified with backend');
          } else {
            // Invalid token, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            console.log('Invalid token, cleared storage');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          
          // If backend is down but we have valid local data, use it
          if (error instanceof Error && error.message.includes('Backend returned HTML')) {
            try {
              const user = JSON.parse(currentUser);
              setAuthState({
                isAuthenticated: true,
                user: user,
              });
              console.log('Using local auth data (backend offline)');
            } catch (e) {
              localStorage.removeItem('authToken');
              localStorage.removeItem('currentUser');
            }
          } else {
            // Clear invalid tokens
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
          }
        }
      }
      
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const response = await apiService.signup(name, email, password);
      
      if (response.success) {
        // For signup, we need email verification
        return { 
          requiresVerification: response.data?.requiresEmailVerification,
          email,
          success: true
        };
      }
      
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      
      // Fallback to local storage if backend is down
      if (error instanceof Error && error.message.includes('Backend returned HTML')) {
        // Store user locally as fallback
        const user = { name, email };
        const users = JSON.parse(localStorage.getItem('stockNoteUsers') || '[]');
        
        // Check if user already exists
        const existingUser = users.find((u: any) => u.email === email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
        
        users.push({ ...user, password, verified: true });
        localStorage.setItem('stockNoteUsers', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', 'local-token-' + Date.now());
        
        setAuthState({
          isAuthenticated: true,
          user: user,
        });
        
        return { success: true, data: { user } };
      }
      
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.data.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.data.user,
        });
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        console.log('Login successful, user stored');
        
        return response;
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's an email verification error
      if (error.requiresEmailVerification) {
        throw error; // Re-throw with verification info
      }
      
      // Fallback to local storage if backend is down
      if (error instanceof Error && error.message.includes('Backend returned HTML')) {
        const users = JSON.parse(localStorage.getItem('stockNoteUsers') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        
        if (!user) {
          throw new Error('Invalid email or password');
        }
        
        const userData = { name: user.name, email: user.email };
        setAuthState({
          isAuthenticated: true,
          user: userData,
        });
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('authToken', 'local-token-' + Date.now());
        
        return { success: true, data: { user: userData } };
      }
      
      throw error;
    }
  };

  const verifyEmail = async (email: string, token: string) => {
    try {
      const response = await apiService.verifyEmail(email, token);
      
      if (response.success && response.data.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.data.user,
        });
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        console.log('Email verified, user logged in');
      }
      
      return response;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      return await apiService.forgotPassword(email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      return await apiService.resetPassword(email, token, newPassword);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        user: null,
      });
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('redirectAfterLogin');
      console.log('Logged out, storage cleared');
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await apiService.updateUserProfile(profileData);
      
      if (response.success && response.data.user) {
        setAuthState(prev => ({
          ...prev,
          user: response.data.user,
        }));
        localStorage.setItem('currentUser', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  return {
    ...authState,
    loading,
    signUp,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    updateProfile,
  };
};