import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 3000,
      style: {
        background: '#10b981',
        color: 'white',
        border: 'none',
      },
    });
  },

  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 4000,
      style: {
        background: '#ef4444',
        color: 'white',
        border: 'none',
      },
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        background: '#3b82f6',
        color: 'white',
        border: 'none',
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      style: {
        background: 'white',
        border: '1px solid #e5e7eb',
      },
    });
  },

  dismiss: (toastId: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

export function handleSupabaseError(error: any, context: string = 'Operation') {
  console.error(`${context} error:`, error);

  if (!error) {
    toast.error(`${context} failed`);
    return;
  }

  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    toast.error('Network error. Please check your connection.');
    return;
  }

  // Permission errors
  if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
    toast.error('Permission denied. Contact your administrator.');
    return;
  }

  // Unique constraint violation
  if (error.code === '23505') {
    toast.error('This record already exists.');
    return;
  }

  // Foreign key violation
  if (error.code === '23503') {
    toast.error('Cannot complete operation. Referenced data may be missing.');
    return;
  }

  // Generic database error
  if (error.code?.startsWith('P') || error.code?.startsWith('23')) {
    toast.error('Database error. Please try again.');
    return;
  }

  // Default error message
  toast.error(error.message || `${context} failed. Please try again.`);
}
