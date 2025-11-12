import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Currency Input Component
 * - Formats as dollars ($)
 * - No spinner arrows
 * - Allows direct typing
 * - Auto-formats on blur
 * - Validates input
 */
export const CurrencyInput = React.forwardRef(({ 
  value, 
  onChange, 
  onBlur,
  className,
  placeholder = "0",
  id,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value || 0));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Update display value when external value changes
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value || 0));
    }
  }, [value, isFocused]);

  // Format number as currency string
  function formatCurrency(num) {
    if (num === '' || num === null || num === undefined) return '';
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]/g, '')) : num;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  // Parse currency string to number
  function parseCurrency(str) {
    if (!str) return 0;
    // Remove all non-numeric characters except decimal point
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow typing numbers, commas, and decimal point
    // Remove everything except digits, commas, and decimal
    const cleaned = inputValue.replace(/[^0-9,.-]/g, '');
    
    setDisplayValue(cleaned);
    
    // Parse and call onChange with numeric value
    const numericValue = parseCurrency(cleaned);
    onChange?.(numericValue);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    const numericValue = parseCurrency(displayValue);
    // Remove commas for easier editing
    setDisplayValue(numericValue.toString().replace(/,/g, ''));
    // Select all text for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Format on blur
    const numericValue = parseCurrency(displayValue);
    const formatted = formatCurrency(numericValue);
    setDisplayValue(formatted);
    onBlur?.(e);
  };

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, comma
    if ([8, 9, 27, 13, 46, 110, 190, 188].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        ref={ref || inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("pl-7 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]", className)}
        {...props}
      />
    </div>
  );
});

CurrencyInput.displayName = 'CurrencyInput';

