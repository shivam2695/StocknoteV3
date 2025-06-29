import { useState } from 'react';

export function useEmailValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateEmail = async (email: string): Promise<{ isValid: boolean; message?: string }> => {
    setIsValidating(true);
    
    try {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
      }

      // Check if email exists in the system (simulate API call)
      // In a real app, this would be an API call to check user existence
      const existingUsers = JSON.parse(localStorage.getItem('stockNoteUsers') || '[]');
      const userExists = existingUsers.some((user: any) => user.email === email);
      
      if (!userExists) {
        return { 
          isValid: false, 
          message: 'This email is not registered with StockNote. Please ask the user to sign up first.' 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, message: 'Failed to validate email' };
    } finally {
      setIsValidating(false);
    }
  };

  return { validateEmail, isValidating };
}