// API service for backend integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mystocknote-backend.onrender.com/api';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    // Check if response is HTML (likely an error page)
    if (contentType && contentType.includes('text/html')) {
      throw new Error('Backend returned HTML instead of JSON. Server may be down or misconfigured.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        // Check if it's an email verification error
        if (data.requiresEmailVerification) {
          const error = new Error(data.message || 'Email verification required') as any;
          error.requiresEmailVerification = true;
          error.email = data.email;
          throw error;
        }
        
        // Token expired or invalid
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        throw new Error('Session expired. Please login again.');
      }
      
      // Return the error with additional data for email verification
      const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`) as any;
      error.requiresEmailVerification = data.requiresEmailVerification;
      error.email = data.email;
      error.errors = data.errors; // Include validation errors
      error.statusCode = response.status;
      throw error;
    }
    
    return data;
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    try {
      const headers = this.getAuthHeaders();
      
      // Debug: Log the request details in development
      if (import.meta.env.DEV) {
        console.log('🌐 Making API request:', {
          url: `${API_BASE_URL}${url}`,
          method: options.method || 'GET',
          hasToken: !!localStorage.getItem('authToken'),
          headers: headers,
          body: options.body
        });
      }
      
      // Log API URL being used for debugging
      console.log('🔗 API Base URL:', API_BASE_URL);
      console.log('🌐 Full request URL:', `${API_BASE_URL}${url}`);
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        },
        // Add timeout for better error handling
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`💥 API Request failed: ${url}`, error);
      console.error('🔗 API Base URL used:', API_BASE_URL);
      
      // Handle network errors more gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection.');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`Unable to connect to server at ${API_BASE_URL}. Please check your internet connection or try again later.`);
        }
      }
      
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const data = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.success && data.data.token) {
      localStorage.setItem('authToken', data.data.token);
      if (import.meta.env.DEV) {
        console.log('Token stored:', data.data.token.substring(0, 20) + '...');
      }
    }
    
    return data;
  }

  async signup(name: string, email: string, password: string) {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  }

  async verifyEmail(email: string, token: string) {
    const data = await this.makeRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, token })
    });
    
    if (data.success && data.data.token) {
      localStorage.setItem('authToken', data.data.token);
      if (import.meta.env.DEV) {
        console.log('Token stored after verification:', data.data.token.substring(0, 20) + '...');
      }
    }
    
    return data;
  }

  async resendVerificationEmail(email: string) {
    return this.makeRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async forgotPassword(email: string) {
    return this.makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    return this.makeRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword })
    });
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  }

  async checkAuthStatus() {
    return this.makeRequest('/auth/status');
  }

  // Journal Entries (Trades) - COMPREHENSIVE FIXES
  async getJournalEntries(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.makeRequest(`/journal-entries${queryString ? `?${queryString}` : ''}`);
  }

  async createJournalEntry(entryData: any) {
    console.log('🚀 API SERVICE - CREATE JOURNAL ENTRY - COMPREHENSIVE DEBUG');
    console.log('📥 Raw entry data received:', JSON.stringify(entryData, null, 2));
    
    // CRITICAL: Validate required fields before sending
    if (!entryData.stockName || !entryData.stockName.trim()) {
      throw new Error('Stock name is required');
    }
    if (!entryData.entryPrice || entryData.entryPrice <= 0) {
      throw new Error('Entry price must be greater than 0');
    }
    if (!entryData.entryDate) {
      throw new Error('Entry date is required');
    }
    if (!entryData.currentPrice || entryData.currentPrice <= 0) {
      throw new Error('Current price must be greater than 0');
    }
    
    // CRITICAL: Validate closed trade requirements with detailed logging
    if (entryData.status === 'closed') {
      console.log('🔒 Validating CLOSED trade requirements...');
      console.log('Exit price check:', {
        value: entryData.exitPrice,
        type: typeof entryData.exitPrice,
        isUndefined: entryData.exitPrice === undefined,
        isNull: entryData.exitPrice === null,
        isEmpty: entryData.exitPrice === '',
        isZero: entryData.exitPrice === 0
      });
      
      if (entryData.exitPrice === undefined || entryData.exitPrice === null || entryData.exitPrice === '') {
        console.log('❌ API Service validation: exitPrice missing for closed trade');
        throw new Error('Exit price is required for closed trades');
      }
      
      const exitPriceNum = Number(entryData.exitPrice);
      if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
        console.log('❌ API Service validation: exitPrice invalid:', entryData.exitPrice, 'converted:', exitPriceNum);
        throw new Error('Exit price must be greater than 0');
      }
      
      if (!entryData.exitDate || entryData.exitDate === '') {
        console.log('❌ API Service validation: exitDate missing for closed trade');
        throw new Error('Exit date is required for closed trades');
      }
      
      console.log('✅ API Service validation: Closed trade requirements passed');
    }

    // CRITICAL: Build clean payload with proper type casting
    const basePayload = {
      stockName: String(entryData.stockName).trim(),
      entryPrice: Number(entryData.entryPrice),
      entryDate: String(entryData.entryDate),
      currentPrice: Number(entryData.currentPrice),
      status: String(entryData.status).toLowerCase(), // Normalize to lowercase
      remarks: entryData.remarks ? String(entryData.remarks).trim() : '',
      quantity: Number(entryData.quantity) || 1,
      isTeamTrade: Boolean(entryData.isTeamTrade)
    };

    // CRITICAL: Only include exit fields for closed trades
    let cleanedPayload;
    if (entryData.status === 'closed') {
      cleanedPayload = {
        ...basePayload,
        exitPrice: Number(entryData.exitPrice),
        exitDate: String(entryData.exitDate)
      };
      console.log('🔒 Built CLOSED trade payload with exit fields');
    } else {
      cleanedPayload = basePayload;
      console.log('🔓 Built ACTIVE trade payload without exit fields');
    }

    console.log('📤 Final cleaned payload:', JSON.stringify(cleanedPayload, null, 2));
    console.log('🔍 Payload validation check:');
    console.log('- stockName:', cleanedPayload.stockName, typeof cleanedPayload.stockName);
    console.log('- entryPrice:', cleanedPayload.entryPrice, typeof cleanedPayload.entryPrice);
    console.log('- status:', cleanedPayload.status, typeof cleanedPayload.status);
    if (cleanedPayload.exitPrice !== undefined) {
      console.log('- exitPrice:', cleanedPayload.exitPrice, typeof cleanedPayload.exitPrice);
      console.log('- exitDate:', cleanedPayload.exitDate, typeof cleanedPayload.exitDate);
    }
    
    return this.makeRequest('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(cleanedPayload)
    });
  }

  async updateJournalEntry(id: string, entryData: any) {
    console.log('🔄 API SERVICE - UPDATE JOURNAL ENTRY - COMPREHENSIVE DEBUG');
    console.log('🆔 Entry ID:', id);
    console.log('📥 Raw entry data received:', JSON.stringify(entryData, null, 2));
    
    // CRITICAL: Validate required fields before sending
    if (!entryData.stockName || !entryData.stockName.trim()) {
      throw new Error('Stock name is required');
    }
    if (!entryData.entryPrice || entryData.entryPrice <= 0) {
      throw new Error('Entry price must be greater than 0');
    }
    if (!entryData.entryDate) {
      throw new Error('Entry date is required');
    }
    if (!entryData.currentPrice || entryData.currentPrice <= 0) {
      throw new Error('Current price must be greater than 0');
    }
    
    // CRITICAL: Validate closed trade requirements with detailed logging
    if (entryData.status === 'closed') {
      console.log('🔒 Validating CLOSED trade requirements for update...');
      console.log('Exit price check:', {
        value: entryData.exitPrice,
        type: typeof entryData.exitPrice,
        isUndefined: entryData.exitPrice === undefined,
        isNull: entryData.exitPrice === null,
        isEmpty: entryData.exitPrice === '',
        isZero: entryData.exitPrice === 0
      });
      
      if (entryData.exitPrice === undefined || entryData.exitPrice === null || entryData.exitPrice === '') {
        console.log('❌ API Service validation: exitPrice missing for closed trade');
        throw new Error('Exit price is required for closed trades');
      }
      
      const exitPriceNum = Number(entryData.exitPrice);
      if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
        console.log('❌ API Service validation: exitPrice invalid:', entryData.exitPrice, 'converted:', exitPriceNum);
        throw new Error('Exit price must be greater than 0');
      }
      
      if (!entryData.exitDate || entryData.exitDate === '') {
        console.log('❌ API Service validation: exitDate missing for closed trade');
        throw new Error('Exit date is required for closed trades');
      }
      
      console.log('✅ API Service validation: Closed trade requirements passed for update');
    }

    // CRITICAL: Build clean payload with proper type casting
    const basePayload = {
      stockName: String(entryData.stockName).trim(),
      entryPrice: Number(entryData.entryPrice),
      entryDate: String(entryData.entryDate),
      currentPrice: Number(entryData.currentPrice),
      status: String(entryData.status).toLowerCase(), // Normalize to lowercase
      remarks: entryData.remarks ? String(entryData.remarks).trim() : '',
      quantity: Number(entryData.quantity) || 1,
      isTeamTrade: Boolean(entryData.isTeamTrade)
    };

    // CRITICAL: Only include exit fields for closed trades
    let cleanedPayload;
    if (entryData.status === 'closed') {
      cleanedPayload = {
        ...basePayload,
        exitPrice: Number(entryData.exitPrice),
        exitDate: String(entryData.exitDate)
      };
      console.log('🔒 Built CLOSED trade update payload with exit fields');
    } else {
      cleanedPayload = basePayload;
      console.log('🔓 Built ACTIVE trade update payload without exit fields');
    }

    console.log('📤 Final cleaned update payload:', JSON.stringify(cleanedPayload, null, 2));

    return this.makeRequest(`/journal-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanedPayload)
    });
  }

  async deleteJournalEntry(id: string) {
    return this.makeRequest(`/journal-entries/${id}`, {
      method: 'DELETE'
    });
  }

  async getJournalStats() {
    return this.makeRequest('/journal-entries/stats');
  }

  async getMonthlyPerformance(year: number) {
    return this.makeRequest(`/journal-entries/monthly/${year}`);
  }

  // Focus Stocks
  async getFocusStocks(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.makeRequest(`/focus-stocks${queryString ? `?${queryString}` : ''}`);
  }

  async createFocusStock(stockData: any) {
    // Validate required fields before sending
    if (!stockData.stockName || !stockData.stockName.trim()) {
      throw new Error('Stock name is required');
    }
    if (!stockData.currentPrice || stockData.currentPrice <= 0) {
      throw new Error('Current price must be greater than 0');
    }
    if (!stockData.targetPrice || stockData.targetPrice <= 0) {
      throw new Error('Target price must be greater than 0');
    }
    if (!stockData.reason || !stockData.reason.trim()) {
      throw new Error('Reason is required');
    }

    if (import.meta.env.DEV) {
      console.log('Creating focus stock with data:', stockData);
    }

    return this.makeRequest('/focus-stocks', {
      method: 'POST',
      body: JSON.stringify(stockData)
    });
  }

  async updateFocusStock(id: string, stockData: any) {
    // Validate required fields before sending
    if (!stockData.stockName || !stockData.stockName.trim()) {
      throw new Error('Stock name is required');
    }
    if (!stockData.currentPrice || stockData.currentPrice <= 0) {
      throw new Error('Current price must be greater than 0');
    }
    if (!stockData.targetPrice || stockData.targetPrice <= 0) {
      throw new Error('Target price must be greater than 0');
    }
    if (!stockData.reason || !stockData.reason.trim()) {
      throw new Error('Reason is required');
    }

    return this.makeRequest(`/focus-stocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stockData)
    });
  }

  async deleteFocusStock(id: string) {
    return this.makeRequest(`/focus-stocks/${id}`, {
      method: 'DELETE'
    });
  }

  async markFocusStockTaken(id: string, tradeTaken: boolean, tradeDate?: string) {
    return this.makeRequest(`/focus-stocks/${id}/mark-taken`, {
      method: 'PATCH',
      body: JSON.stringify({ tradeTaken, tradeDate })
    });
  }

  async getFocusStockStats() {
    return this.makeRequest('/focus-stocks/stats');
  }

  async getPendingFocusStocks() {
    return this.makeRequest('/focus-stocks/pending');
  }

  // Teams
  async getTeams() {
    return this.makeRequest('/teams');
  }

  async createTeam(teamData: any) {
    return this.makeRequest('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  }

  async getTeam(id: string) {
    return this.makeRequest(`/teams/${id}`);
  }

  async updateTeam(id: string, teamData: any) {
    return this.makeRequest(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });
  }

  async addTeamMember(teamId: string, userEmail: string, role: string = 'member') {
    return this.makeRequest(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userEmail, role })
    });
  }

  async removeTeamMember(teamId: string, userId: string) {
    return this.makeRequest(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  async getTeamStats(teamId: string) {
    return this.makeRequest(`/teams/${teamId}/stats`);
  }

  // Team Trades
  async getTeamTrades(teamId: string, params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.makeRequest(`/team-trades/team/${teamId}${queryString ? `?${queryString}` : ''}`);
  }

  async createTeamTrade(tradeData: any) {
    return this.makeRequest('/team-trades', {
      method: 'POST',
      body: JSON.stringify(tradeData)
    });
  }

  async updateTeamTrade(id: string, tradeData: any) {
    return this.makeRequest(`/team-trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tradeData)
    });
  }

  async deleteTeamTrade(id: string) {
    return this.makeRequest(`/team-trades/${id}`, {
      method: 'DELETE'
    });
  }

  async voteOnTeamTrade(tradeId: string, vote: string, comment?: string) {
    return this.makeRequest(`/team-trades/${tradeId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote, comment })
    });
  }

  async getTeamTradeStats(teamId: string) {
    return this.makeRequest(`/team-trades/team/${teamId}/stats`);
  }

  async getTeamMonthlyPerformance(teamId: string, year: number) {
    return this.makeRequest(`/team-trades/team/${teamId}/monthly/${year}`);
  }

  // Books
  async getBooks(params?: any) {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.makeRequest(`/books${queryString ? `?${queryString}` : ''}`);
  }

  async getBook(id: string) {
    return this.makeRequest(`/books/${id}`);
  }

  async getPopularBooks(limit: number = 10) {
    return this.makeRequest(`/books/popular?limit=${limit}`);
  }

  async searchBooks(query: string, options?: any) {
    const params = new URLSearchParams({ q: query, ...options });
    return this.makeRequest(`/books/search?${params.toString()}`);
  }

  async rateBook(bookId: string, rating: number, review?: string) {
    return this.makeRequest(`/books/${bookId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    });
  }

  // User Profile
  async getUserProfile() {
    return this.makeRequest('/auth/me');
  }

  async updateUserProfile(profileData: any) {
    return this.makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.makeRequest('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
  }

  async deleteAccount(password: string) {
    return this.makeRequest('/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmDelete: 'DELETE' })
    });
  }

  async getDashboardData() {
    return this.makeRequest('/users/dashboard');
  }

  // Health Check - Updated with better error handling
  async healthCheck() {
    try {
      // Try the health endpoint first
      const healthUrl = `${API_BASE_URL.replace('/api', '')}/health`;
      console.log('Checking health at:', healthUrl);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const contentType = response.headers.get('content-type');
      
      // Check if response is HTML (likely an error page)
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Backend returned HTML instead of JSON. Server may be down or misconfigured.');
      }
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Health check timed out. Backend server may be slow or down.');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Unable to connect to backend server. Please check if the server is running.');
        }
      }
      
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;