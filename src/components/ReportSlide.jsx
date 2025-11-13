import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

/**
 * ReportSlide - Wrapper for individual report slides
 * 
 * Provides consistent formatting, animations, and styling for presentation mode
 */
export const ReportSlide = ({ 
  title, 
  description, 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const variants = {
    default: 'border-gray-200',
    primary: 'border-primary bg-primary/5',
    success: 'border-green-500 bg-green-50',
    warning: 'border-yellow-500 bg-yellow-50',
    danger: 'border-red-500 bg-red-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`h-full ${className}`}
    >
      <Card className={`border-2 ${variants[variant] || variants.default} h-full`}>
        {title && (
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-bold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-lg mt-2">
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className="space-y-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

