import { useState, useEffect } from 'react';
import type { Strategy } from '@/types/strategy';
import { toast } from 'sonner';

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/strategies');
      if (!response.ok) {
        throw new Error('Failed to load strategies');
      }
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      console.error('Error loading strategies:', error);
      toast.error('Failed to load strategies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const addStrategy = async (strategy: Strategy) => {
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy),
      });

      if (!response.ok) {
        throw new Error('Failed to save strategy');
      }

      const savedStrategy = await response.json();
      setStrategies(prev => [...prev, savedStrategy]);
      return savedStrategy;
    } catch (error) {
      console.error('Error saving strategy:', error);
      throw error;
    }
  };

  const updateStrategy = async (strategy: Strategy) => {
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy),
      });

      if (!response.ok) {
        throw new Error('Failed to update strategy');
      }

      const updatedStrategy = await response.json();
      setStrategies(prev => 
        prev.map(s => s.id === strategy.id ? updatedStrategy : s)
      );
      return updatedStrategy;
    } catch (error) {
      console.error('Error updating strategy:', error);
      throw error;
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      const response = await fetch('/api/strategies', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete strategy');
      }

      setStrategies(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting strategy:', error);
      throw error;
    }
  };

  return {
    strategies,
    isLoading,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    refreshStrategies: fetchStrategies,
  };
} 