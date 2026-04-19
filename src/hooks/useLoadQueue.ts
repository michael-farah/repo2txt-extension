import { useState, useCallback, useRef } from 'react';
import type { FileNode } from '@/types';
import type { IProvider } from '@/lib/providers/types';

interface LoadTask {
  id: string;
  url: string;
  provider: IProvider;
  abortController: AbortController;
  status: 'loading' | 'completed' | 'cancelled' | 'error';
  error?: Error;
  result?: FileNode[];
}

export function useLoadQueue() {
  const [loading, setLoading] = useState(false);
  const taskRef = useRef<LoadTask | null>(null);

  const start = useCallback(
    async (provider: IProvider, url: string): Promise<FileNode[] | null> => {
      // Cancel previous task if exists
      if (taskRef.current) {
        taskRef.current.abortController.abort();
        taskRef.current.status = 'cancelled';
      }

      // Create new task
      const task: LoadTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        provider,
        abortController: new AbortController(),
        status: 'loading',
      };

      taskRef.current = task;
      setLoading(true);

      try {
        const result = await provider.fetchTree(url, {
          signal: task.abortController.signal,
        });

        // Check if aborted after fetch
        if (task.abortController.signal.aborted) {
          return null;
        }

        task.status = 'completed';
        task.result = result;
        return result;
      } catch (error) {
        // Handle AbortError
        if (error instanceof Error && error.name === 'AbortError') {
          task.status = 'cancelled';
          return null;
        }

        task.status = 'error';
        task.error = error instanceof Error ? error : new Error(String(error));
        throw error;
      } finally {
        // Only clear loading if this task wasn't aborted
        if (!task.abortController.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (taskRef.current) {
      taskRef.current.abortController.abort();
      taskRef.current.status = 'cancelled';
      taskRef.current = null;
      setLoading(false);
    }
  }, []);

  return {
    loading,
    start,
    cancel,
  };
}
