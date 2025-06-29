import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import OTPVerification from './OTPVerification';
import ForgotPassword from './ForgotPassword';
import { useAuth } from '../hooks/useAuth';

interface AuthContainerProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<any>;
}

export default function AuthContainer({ onLogin, onSignUp }: AuthContainerProps) {
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'otp' | 'forgot-password'>('login');
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    fromLogin?: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signUp, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate]);

  // Set initial view based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/signup') {
      setCurrentView('signup');
    } else {
      setCurrentView('login');
    }
  }, [location.pathname]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setError('');
      await login(email, password);
      
      // Redirect to saved path or dashboard
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } catch (error: any) {
      if (error.requiresEmailVerification) {
        setPendingVerification({ email, fromLogin: true });
        setCurrentView('otp');
      } else {
        setError(error.message || 'Login failed');
      }
    }
  };

  const handleSignUpRequest = async (name: string, email: string, password: string) => {
    try {
      setError('');
      const result = await signUp(name, email, password);
      
      if (result?.requiresVerification) {
        setPendingVerification({ email, fromLogin: false });
        setCurrentView('otp');
      } else {
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'Sign up failed');
    }
  };

  const handleOTPVerified = async () => {
    // After OTP verification, user should be automatically logged in
    setPendingVerification(null);
    
    // Redirect to saved path or dashboard
    const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
    localStorage.removeItem('redirectAfterLogin');
    navigate(redirectPath);
  };

  const handleBackFromOTP = () => {
    setPendingVerification(null);
    if (pendingVerification?.fromLogin) {
      setCurrentView('login');
    } else {
      setCurrentView('signup');
    }
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setError('');
  };

  const handleForgotPassword = () => {
    setCurrentView('forgot-password');
    setError('');
  };

  const handlePasswordReset = () => {
    setCurrentView('login');
    setError('');
  };

  if (currentView === 'otp' && pendingVerification) {
    return (
      <OTPVerification
        email={pendingVerification.email}
        onVerified={handleOTPVerified}
        onBack={handleBackFromOTP}
        purpose={pendingVerification.fromLogin ? 'login' : 'signup'}
      />
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <ForgotPassword
        onBack={handleBackToLogin}
        onPasswordReset={handlePasswordReset}
      />
    );
  }

  if (currentView === 'signup') {
    return (
      <SignUpForm
        onSignUp={handleSignUpRequest}
        onSwitchToLogin={() => setCurrentView('login')}
        error={error}
      />
    );
  }

  return (
    <LoginForm
      onLogin={handleLogin}
      onSwitchToSignUp={() => setCurrentView('signup')}
      onForgotPassword={handleForgotPassword}
      error={error}
    />
  );
}