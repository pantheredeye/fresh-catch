"use client";

import { forwardRef, ReactNode, useId } from "react";

// Base Input Types
export interface BaseInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  style?: React.CSSProperties;
}

// Text Input
export interface TextInputProps extends BaseInputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  name?: string;
  autoComplete?: string;
}

/**
 * TextInput - Glassmorphism text input with fresh market styling
 *
 * WHY: Based on market-config wireframe patterns and existing LoginForm styling.
 * Supports the warm glassomorphism design with ocean blue focus states.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({
  label,
  error,
  required,
  disabled,
  className = '',
  helperText,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  icon,
  size = 'md',
  style,
  ...props
}, ref) => {
  const inputId = useId();

  return (
    <div className={`input-group ${className}`} style={inputGroupStyles}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </label>
      )}

      <div style={inputWrapperStyles}>
        {icon && <div style={iconStyles}>{icon}</div>}
        <input
          id={inputId}
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          style={{
            ...inputBaseStyles,
            ...sizeStyles[size],
            ...(icon ? { paddingLeft: '44px' } : {}),
            ...(error ? errorInputStyles : {}),
            ...(disabled ? disabledStyles : {}),
            ...style
          }}
          {...props}
        />
      </div>

      {error && <div style={errorTextStyles}>{error}</div>}
      {helperText && !error && <div style={helperTextStyles}>{helperText}</div>}
    </div>
  );
});

// Textarea
export interface TextareaProps extends BaseInputProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * Textarea - Multi-line text input with glassmorphism styling
 *
 * Based on the location/customer info textareas from the wireframe
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  required,
  disabled,
  className = '',
  helperText,
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  rows = 3,
  resize = 'vertical',
  ...props
}, ref) => {
  const inputId = useId();

  return (
    <div className={`input-group ${className}`} style={inputGroupStyles}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </label>
      )}

      <textarea
        id={inputId}
        ref={ref}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        required={required}
        rows={rows}
        style={{
          ...inputBaseStyles,
          ...textareaStyles,
          resize,
          ...(error ? errorInputStyles : {}),
          ...(disabled ? disabledStyles : {})
        }}
        {...props}
      />

      {error && <div style={errorTextStyles}>{error}</div>}
      {helperText && !error && <div style={helperTextStyles}>{helperText}</div>}
    </div>
  );
});

// Time Input (specialized text input for times)
export interface TimeInputProps extends Omit<TextInputProps, 'type'> {
  format?: '12h' | '24h';
}

/**
 * TimeInput - Specialized input for time values
 *
 * Based on the start/end time inputs from the market config wireframe
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(({
  format = '12h',
  placeholder = '8:00 AM',
  ...props
}, ref) => {
  return (
    <TextInput
      ref={ref}
      type="text"
      placeholder={placeholder}
      style={{ textAlign: 'center' }}
      {...props}
    />
  );
});

// Time Row (for start/end time pairs)
export interface TimeRowProps {
  startLabel?: string;
  endLabel?: string;
  startValue?: string;
  endValue?: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

/**
 * TimeRow - Start and end time input pair
 *
 * Matches the "8:00 AM to 2:00 PM" pattern from wireframe
 */
export function TimeRow({
  startLabel = 'Start Time',
  endLabel = 'End Time',
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  disabled,
  error,
  className = ''
}: TimeRowProps) {
  return (
    <div className={`time-row ${className}`} style={timeRowStyles}>
      <TimeInput
        value={startValue}
        onChange={(e) => onStartChange?.(e.target.value)}
        placeholder="8:00 AM"
        disabled={disabled}
        size="sm"
        style={{ flex: 1 }}
      />
      <span style={timeRowLabelStyles}>to</span>
      <TimeInput
        value={endValue}
        onChange={(e) => onEndChange?.(e.target.value)}
        placeholder="2:00 PM"
        disabled={disabled}
        size="sm"
        style={{ flex: 1 }}
      />
      {error && <div style={errorTextStyles}>{error}</div>}
    </div>
  );
}

// Styles using design system tokens
const inputGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  width: '100%',
};

const labelStyles: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '4px',
};

const requiredStyles: React.CSSProperties = {
  color: 'var(--color-action-secondary)',
  marginLeft: '2px',
};

const inputWrapperStyles: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const iconStyles: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  zIndex: 1,
  color: 'var(--color-text-secondary)',
  fontSize: '16px',
};

const inputBaseStyles: React.CSSProperties = {
  width: '100%',
  border: '2px solid var(--color-border-input)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface-primary)',
  color: 'var(--color-text-primary)',
  fontSize: '16px',
  fontFamily: 'var(--font-modern)',
  transition: 'all 0.3s ease',
  outline: 'none',
};

const sizeStyles = {
  sm: {
    padding: '10px 12px',
    fontSize: '14px',
  },
  md: {
    padding: '12px 16px',
    fontSize: '16px',
  },
  lg: {
    padding: '16px 20px',
    fontSize: '18px',
  },
};

const textareaStyles: React.CSSProperties = {
  minHeight: '80px',
  resize: 'vertical',
  lineHeight: 1.5,
  fontFamily: 'inherit',
};

const errorInputStyles: React.CSSProperties = {
  borderColor: 'var(--color-action-secondary)',
  boxShadow: '0 0 0 3px var(--color-status-error-bg)',
};

const disabledStyles: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
  background: 'var(--color-input-disabled-bg)',
};

const errorTextStyles: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-action-secondary)',
  marginTop: '4px',
  fontWeight: 500,
};

const helperTextStyles: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  marginTop: '4px',
};

const timeRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
};

const timeRowLabelStyles: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-secondary)',
  fontWeight: 500,
  minWidth: 'fit-content',
};

// TODO: Add these additional input components:
// - Select dropdown (with custom styling)
// - Radio button group
// - Toggle switch
// - Checkbox
// - Search input with icon
// - Number input with +/- buttons