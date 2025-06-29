import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>(
  apiCall: () => Promise<any>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { immediate = false, onSuccess, onError } = options;

  const execute = async (...args: any[]) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiCall();
      const responseData = result.data || result;
      
      setData(responseData);
      
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute
  };
}

// Specific hooks for common operations
export function useJournalEntries() {
  return useApi(() => apiService.getJournalEntries());
}

export function useFocusStocksApi() {
  return useApi(() => apiService.getFocusStocks());
}

export function useTeams() {
  return useApi(() => apiService.getTeams());
}

export function useBooks() {
  return useApi(() => apiService.getBooks());
}

export function useDashboardData() {
  return useApi(() => apiService.getDashboardData());
}