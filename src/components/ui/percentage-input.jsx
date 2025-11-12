import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Percentage Input Component
 * - Formats as percentage (%)
 * - No spinner arrows
 * - Allows direct typing
 * - Auto-formats on blur
 * - Validates input
 */
export const PercentageInput = React.forwardRef(({ 
  value, 
  onChange, 
  onBlur,
  className,
  placeholder = "0",
  id,
  step = 0.1,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = useState(formatPercentage(value || 0));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Update display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatPercentage(value || 0));
    }
  }, [value, isFocused]);

  // Format number as percentage string
  function formatPercentage(num) {
    if (num === '' || num === null || num === undefined) return '';
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]/g, '')) : num;
    if (isNaN(numValue)) return '';
    return numValue.toFixed(1);
  }

  // Parse percentage string to number
  function parsePercentage(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  const handleChange = (e) => {
    const inputValue = e.target.value;
    const cleaned = inputValue.replace(/[^0-9.-]/g, '');
    setDisplayValue(cleaned);
    
    const numericValue = parsePercentage(cleaned);
    onChange?.(numericValue);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    const numericValue = parsePercentage(displayValue);
    // Show raw number for easier editing
    setDisplayValue(numericValue.toString());
    // Select all text for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    const numericValue = parsePercentage(displayValue);
    const formatted = formatPercentage(numericValue);
    setDisplayValue(formatted);
    onBlur?.(e);
  };

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={ref || inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("pr-7 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]", className)}
        {...props}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
    </div>
  );
});

PercentageInput.displayName = 'PercentageInput';

