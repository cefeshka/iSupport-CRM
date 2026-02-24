import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export default function PremiumModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '4xl'
}: PremiumModalProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`modal-container ${maxWidthClasses[maxWidth]}`}
          >
            <div className="modal-header flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="modal-body">
              {children}
            </div>

            {footer && (
              <div className="modal-footer">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PremiumInput({
  label,
  required,
  error,
  helpText,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helpText?: string;
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input {...props} className="input-premium w-full" />
      {helpText && !error && (
        <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
}

export function PremiumTextarea({
  label,
  required,
  error,
  helpText,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  helpText?: string;
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea {...props} className="input-premium w-full resize-none" />
      {helpText && !error && (
        <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
}

export function PremiumSelect({
  label,
  required,
  error,
  helpText,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helpText?: string;
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select {...props} className="input-premium w-full">
        {children}
      </select>
      {helpText && !error && (
        <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
    </div>
  );
}

export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="form-section space-y-4">
      {title && (
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
      )}
      {children}
    </div>
  );
}
