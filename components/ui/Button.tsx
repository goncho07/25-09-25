import React from 'react';
// FIX: Import HTMLMotionProps for correct typing.
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideProps } from 'lucide-react';

// FIX: Changed props interface to extend HTMLMotionProps<'button'> to resolve type conflicts.
interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  icon?: React.ComponentType<LucideProps>;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, className = '', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 focus-visible:ring-indigo-500',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-indigo-500',
    tertiary: 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 focus-visible:ring-indigo-500',
    danger: 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 focus-visible:ring-rose-500',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </motion.button>
  );
};

export default Button;