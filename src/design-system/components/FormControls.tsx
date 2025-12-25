"use client";

import { ReactNode, forwardRef } from "react";

// Select Dropdown
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Select - Custom styled dropdown matching the wireframe inline selects
 *
 * WHY: Based on "Every [Saturday]" dropdown pattern from wireframe.
 * Styled to match the blue inline select appearance.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
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
  options,
  size = 'md',
  ...props
}, ref) => {
  const inputId = `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${className}`} style={inputGroupStyles}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </label>
      )}

      <div style={selectWrapperStyles}>
        <select
          id={inputId}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          style={{
            ...selectBaseStyles,
            ...sizeStyles[size],
            ...(error ? errorInputStyles : {}),
            ...(disabled ? disabledStyles : {})
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div style={selectArrowStyles}>▼</div>
      </div>

      {error && <div style={errorTextStyles}>{error}</div>}
      {helperText && !error && <div style={helperTextStyles}>{helperText}</div>}
    </div>
  );
});

// Inline Select (for use within text)
export interface InlineSelectProps extends Omit<SelectProps, 'label' | 'error' | 'helperText'> {
  variant?: 'primary' | 'outline';
}

/**
 * InlineSelect - Compact select for use within text flows
 *
 * Matches the "Every [Saturday]" pattern from the wireframe
 */
export const InlineSelect = forwardRef<HTMLSelectElement, InlineSelectProps>(({
  variant = 'primary',
  size = 'sm',
  className = '',
  ...props
}, ref) => {
  const styles = variant === 'primary' ? inlinePrimaryStyles : inlineOutlineStyles;

  return (
    <div style={inlineWrapperStyles} className={className}>
      <select
        ref={ref}
        style={{
          ...inlineBaseStyles,
          ...styles,
          ...sizeStyles[size],
        }}
        {...props}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

// Radio Button Group
export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  layout?: 'vertical' | 'horizontal';
}

/**
 * RadioGroup - Custom radio buttons matching wireframe pattern
 *
 * Based on the schedule pattern selection from the market config wireframe
 */
export function RadioGroup({
  name,
  label,
  error,
  required,
  disabled,
  className = '',
  helperText,
  value,
  defaultValue,
  onChange,
  options,
  layout = 'vertical'
}: RadioGroupProps) {
  return (
    <div className={`radio-group ${className}`} style={inputGroupStyles}>
      {label && (
        <div style={labelStyles}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </div>
      )}

      <div style={{
        ...radioContainerStyles,
        flexDirection: layout === 'horizontal' ? 'row' : 'column',
        gap: layout === 'horizontal' ? 'var(--space-md)' : 'var(--space-sm)'
      }}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = disabled || option.disabled;

          return (
            <label
              key={option.value}
              style={{
                ...radioLabelStyles,
                ...(isSelected ? radioSelectedStyles : {}),
                ...(isDisabled ? disabledStyles : {})
              }}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                defaultChecked={defaultValue === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={isDisabled}
                style={visuallyHiddenStyles}
              />
              <div style={{
                ...radioIndicatorStyles,
                ...(isSelected ? radioIndicatorSelectedStyles : {})
              }}>
                {isSelected && <div style={radioIndicatorDotStyles} />}
              </div>
              <div style={radioContentStyles}>
                <div style={radioLabelTextStyles}>{option.label}</div>
                {option.description && (
                  <div style={radioDescriptionStyles}>{option.description}</div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <div style={errorTextStyles}>{error}</div>}
      {helperText && !error && <div style={helperTextStyles}>{helperText}</div>}
    </div>
  );
}

// Toggle Switch
export interface ToggleSwitchProps {
  label?: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ToggleSwitch - iOS-style toggle switch
 *
 * Based on the "Market Active" toggle from the wireframe
 */
export function ToggleSwitch({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled,
  className = '',
  size = 'md'
}: ToggleSwitchProps) {
  const inputId = `toggle-${Math.random().toString(36).substr(2, 9)}`;
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : defaultChecked;

  const toggleSizes = {
    sm: { width: 38, height: 22, dot: 18 },
    md: { width: 51, height: 31, dot: 27 },
    lg: { width: 64, height: 38, dot: 34 }
  };

  const sizeConfig = toggleSizes[size];

  return (
    <div className={`toggle-switch ${className}`} style={toggleContainerStyles}>
      <label htmlFor={inputId} style={toggleLabelContainerStyles}>
        <div style={toggleTextContainerStyles}>
          {label && <div style={toggleLabelTextStyles}>{label}</div>}
          {description && <div style={toggleDescriptionStyles}>{description}</div>}
        </div>

        <div style={{
          ...toggleSwitchStyles,
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          backgroundColor: isChecked ? '#4CAF50' : '#e0e0e0',
          ...(disabled ? disabledStyles : {})
        }}>
          <input
            id={inputId}
            type="checkbox"
            checked={isControlled ? checked : undefined}
            defaultChecked={!isControlled ? defaultChecked : undefined}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            style={visuallyHiddenStyles}
          />
          <div style={{
            ...toggleDotStyles,
            width: `${sizeConfig.dot}px`,
            height: `${sizeConfig.dot}px`,
            transform: isChecked
              ? `translateX(${sizeConfig.width - sizeConfig.dot - 4}px)`
              : 'translateX(2px)'
          }} />
        </div>
      </label>
    </div>
  );
}

// Shared Styles
const inputGroupStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  width: '100%',
};

const labelStyles: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--deep-navy)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '4px',
};

const requiredStyles: React.CSSProperties = {
  color: 'var(--coral)',
  marginLeft: '2px',
};

const errorInputStyles: React.CSSProperties = {
  borderColor: 'var(--coral)',
  boxShadow: '0 0 0 3px rgba(255, 107, 107, 0.1)',
};

const disabledStyles: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};

const errorTextStyles: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--coral)',
  marginTop: '4px',
  fontWeight: 500,
};

const helperTextStyles: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--cool-gray)',
  marginTop: '4px',
};

const sizeStyles = {
  sm: {
    padding: '6px 10px',
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

// Select Styles
const selectWrapperStyles: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  width: '100%',
};

const selectBaseStyles: React.CSSProperties = {
  width: '100%',
  border: '2px solid #e0e0e0',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--warm-white)',
  color: 'var(--deep-navy)',
  fontSize: '16px',
  fontFamily: 'var(--font-modern)',
  transition: 'all 0.3s ease',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: '40px',

  ':focus': {
    borderColor: 'var(--ocean-blue)',
    boxShadow: '0 0 0 3px rgba(0, 102, 204, 0.1)',
    background: 'white',
  },
};

const selectArrowStyles: React.CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '12px',
  color: 'var(--cool-gray)',
  pointerEvents: 'none',
};

// Inline Select Styles
const inlineWrapperStyles: React.CSSProperties = {
  display: 'inline-block',
  position: 'relative',
};

const inlineBaseStyles: React.CSSProperties = {
  border: '2px solid',
  borderRadius: '6px',
  fontWeight: 600,
  cursor: 'pointer',
  appearance: 'none',
  outline: 'none',
  transition: 'all 0.3s ease',
};

const inlinePrimaryStyles: React.CSSProperties = {
  backgroundColor: 'white',
  borderColor: 'var(--ocean-blue)',
  color: 'var(--ocean-blue)',
};

const inlineOutlineStyles: React.CSSProperties = {
  backgroundColor: 'transparent',
  borderColor: '#e0e0e0',
  color: 'var(--deep-navy)',
};

// Radio Styles
const radioContainerStyles: React.CSSProperties = {
  display: 'flex',
};

const radioLabelStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: 'var(--space-md)',
  border: '2px solid #e0e0e0',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  background: 'var(--warm-white)',
};

const radioSelectedStyles: React.CSSProperties = {
  backgroundColor: '#e8f4ff',
  borderColor: 'var(--ocean-blue)',
};

const radioIndicatorStyles: React.CSSProperties = {
  width: '20px',
  height: '20px',
  border: '2px solid #ccc',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.3s ease',
};

const radioIndicatorSelectedStyles: React.CSSProperties = {
  borderColor: 'var(--ocean-blue)',
  backgroundColor: 'var(--ocean-blue)',
};

const radioIndicatorDotStyles: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: 'white',
};

const radioContentStyles: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const radioLabelTextStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 500,
  color: 'var(--deep-navy)',
};

const radioDescriptionStyles: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--cool-gray)',
};

// Toggle Styles
const toggleContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const toggleLabelContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  cursor: 'pointer',
  gap: 'var(--space-md)',
};

const toggleTextContainerStyles: React.CSSProperties = {
  flex: 1,
};

const toggleLabelTextStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 500,
  color: 'var(--deep-navy)',
  marginBottom: '2px',
};

const toggleDescriptionStyles: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--cool-gray)',
};

const toggleSwitchStyles: React.CSSProperties = {
  position: 'relative',
  borderRadius: '20px',
  transition: 'background-color 0.3s ease',
  flexShrink: 0,
};

const toggleDotStyles: React.CSSProperties = {
  position: 'absolute',
  top: '2px',
  backgroundColor: 'white',
  borderRadius: '50%',
  transition: 'transform 0.3s ease',
};

const visuallyHiddenStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

// Specialized Variants

interface MarketToggleProps {
  /** Market active state */
  active?: boolean;
  /** Market name for accessibility */
  marketName?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * MarketToggle - Specialized toggle for market active/paused states
 *
 * WHY: Common pattern in admin interface for toggling markets on/off.
 * Adapts active/onClick API to ToggleSwitch checked/onChange API.
 */
export function MarketToggle({
  active = false,
  marketName = 'market',
  disabled = false,
  onClick
}: MarketToggleProps) {
  return (
    <ToggleSwitch
      checked={active}
      onChange={onClick}
      disabled={disabled}
      size="sm"
      className="market-toggle"
    />
  );
}

// TODO: Add these additional form controls:
// - Checkbox
// - Search input with search icon
// - Number input with increment/decrement buttons
// - File upload with drag & drop
// - Date/time pickers
// - Multi-select dropdown