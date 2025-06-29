import React, { useState } from 'react';
import { Mail, ArrowLeft, Lock } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  onPasswordReset: () => void;
}

export default function ForgotPassword({ onBack, onPasswordReset }: ForgotPasswordProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    
    // Check if user exists
    const existingUsers = JSON.parse(localStorage.getItem('stockNoteUsers') || '[]');
    const userExists = existingUsers.find((user: any) => user.email === email);
    
    if (!userExists) {
      setError('No account found with this email address');
      setIsLoading(false);
      return;
    }

    // Generate OTP
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem(`reset_otp_${email}`, newOTP);
    localStorage.setItem(`reset_otp_expiry_${email}`, (Date.now() + 300000).toString());
    
    console.log(`Password Reset OTP for ${email}: ${newOTP}`);
    alert(`Password reset OTP sent to ${email}: ${newOTP} (Check console for development)`);
    
    setStep('otp');
    setIsLoading(false);
    setError('');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpVerify = async () => {
    const enteredOTP = otp.join('');
    
    if (enteredOTP.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    setIsLoading(true);
    
    const storedOTP = localStorage.getItem(`reset_otp_${email}`);
    const expiryTime = localStorage.getItem(`reset_otp_expiry_${email}`);
    
    if (!storedOTP || !expiryTime || Date.now() > parseInt(expiryTime)) {
      setError('OTP expired. Please try again.');
      setIsLoading(false);
      return;
    }

    if (enteredOTP === storedOTP) {
      localStorage.removeItem(`reset_otp_${email}`);
      localStorage.removeItem(`reset_otp_expiry_${email}`);
      setStep('newPassword');
      setError('');
    } else {
      setError('Invalid OTP. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword) {
      setError('Password is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    // Update user password
    const existingUsers = JSON.parse(localStorage.getItem('stockNoteUsers') || '[]');
    const updatedUsers = existingUsers.map((user: any) => 
      user.email === email ? { ...user, password: newPassword } : user
    );
    
    localStorage.setItem('stockNoteUsers', JSON.stringify(updatedUsers));
    
    setIsLoading(false);
    alert('Password reset successfully! You can now login with your new password.');
    onPasswordReset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl transform rotate-6 opacity-20"></div>
          <div className="relative bg-white rounded-3xl p-12 shadow-2xl">
            <div className="w-64 h-64 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
              <Lock className="w-32 h-32 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/Black White Minimalist Fierce Bull Logo.png" 
                alt="MyStockNote Logo" 
                className="h-16 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'email' && 'Reset Password'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'newPassword' && 'New Password'}
            </h1>
            <p className="text-gray-600">
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'otp' && `Enter the code sent to ${email}`}
              {step === 'newPassword' && 'Create your new password'}
            </p>
          </div>

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                  Enter Verification Code
                </label>
                <div className="flex justify-center space-x-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`reset-otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className={`w-12 h-12 text-center text-xl font-bold border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        error ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  ))}
                </div>
                {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
              </div>

              <button
                onClick={handleOtpVerify}
                disabled={isLoading || otp.join('').length !== 6}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          )}

          {/* New Password Step */}
          {step === 'newPassword' && (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}