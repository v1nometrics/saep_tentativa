'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'loading' | 'info';

type ToastProps = {
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
};

export function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [type, duration, onClose]);
  
  if (!isVisible) return null;
  
  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    loading: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
    info: <div className="h-5 w-5 rounded-full bg-blue-500" />,
  };
  
  const bgColorMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    loading: 'bg-blue-50 border-blue-200',
    info: 'bg-blue-50 border-blue-200',
  };
  
  return (
    <div 
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg',
        bgColorMap[type]
      )}
    >
      {iconMap[type]}
      <span className="text-sm text-gray-800">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type ToastContextType = {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: () => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

type ToastProviderProps = {
  children: React.ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);
  
  const showToast = (message: string, type: ToastType, duration?: number) => {
    setToast({ message, type, duration });
  };
  
  const hideToast = () => {
    setToast(null);
  };
  
  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
