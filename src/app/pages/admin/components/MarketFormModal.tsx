import { useState, useEffect } from 'react'
import { Button } from '@/design-system'

interface Market {
  id?: string
  name: string
  schedule: string
  active: boolean
  subtitle?: string | null
  locationDetails?: string | null
  customerInfo?: string | null
  type?: string
  expiresAt?: string | null
  catchPreview?: string | null
  notes?: string | null
}

interface MarketFormModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Function to close modal */
  onClose: () => void
  /** Function to save market */
  onSave: (market: {
    name: string;
    schedule: string;
    subtitle?: string | null;
    locationDetails?: string | null;
    customerInfo?: string | null;
    active?: boolean;
    type?: string;
    expiresAt?: string | null;
    catchPreview?: string | null;
    notes?: string | null;
  }) => void | Promise<void>
  /** Function to delete market */
  onDelete?: (id: string) => Promise<void>
  /** Existing market data for editing (undefined for new market) */
  market?: Market
  /** Pre-set market type for new markets */
  presetType?: "regular" | "popup"
}

/**
 * MarketFormModal - Modal for adding/editing market configuration
 *
 * WHY: Single component for both add and edit flows, keeping UX simple.
 * Priority-guided layout with core config at top, details below.
 * Modal overlay for focused interaction without navigation.
 */
export function MarketFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  market,
  presetType = "regular"
}: MarketFormModalProps) {

  // Form state
  const [formData, setFormData] = useState<Market>({
    name: '',
    schedule: '',
    active: true,
    locationDetails: '',
    customerInfo: '',
    type: presetType,
    expiresAt: null,
    notes: null,
  })

  // Reset form when market prop or presetType changes
  useEffect(() => {
    if (market) {
      setFormData({ ...market })
    } else {
      setFormData({
        name: '',
        schedule: '',
        active: true,
        locationDetails: '',
        customerInfo: '',
        type: presetType,
        expiresAt: null,
        notes: null,
      })
    }
  }, [market, presetType])

  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Don't render if not open
  if (!isOpen) return null

  const handleInputChange = (field: keyof Market, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setValidationError(null)
    // Basic validation - only name required
    if (!formData.name.trim()) {
      setValidationError('Market name is required')
      return
    }

    setSaving(true)
    try {
      // Extract only the fields needed for save
      const { id, ...saveData } = formData
      await onSave(saveData)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${formData.name}"?`)) {
      if (formData.id && onDelete) {
        await onDelete(formData.id)
      }
    }
  }

  const isEditing = !!market?.id

  // Modal styles following design patterns
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--color-surface-overlay)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--space-xl)'
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--color-surface-warm)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    maxWidth: '420px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--color-glass-border-light)',
    margin: 'var(--space-md)'
  }

  const headerStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-display)',
    marginBottom: 'var(--space-lg)',
    textAlign: 'center'
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: 'var(--space-md)'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-primary)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--letter-spacing-wider)',
    marginBottom: 'var(--space-xs)',
    fontFamily: 'var(--font-display)'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-sm)',
    border: '2px solid var(--color-border-input)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface-warm)',
    color: 'var(--color-text-primary)',
    fontSize: '15px',
    fontFamily: 'var(--font-modern)',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  }

  const inputFocusStyle: React.CSSProperties = {
    borderColor: 'var(--color-action-primary)',
    boxShadow: '0 0 0 3px rgba(0, 102, 204, 0.1)',
    background: 'var(--color-surface-primary)',
    outline: 'none'
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '140px',
    resize: 'vertical',
    fontFamily: 'var(--font-modern)'
  }

  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    background: 'var(--color-glass-medium)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border-subtle)'
  }

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-xl)'
  }

  return (
    <div style={overlayStyle} onClick={(e) => {
      // Only close if clicking directly on the overlay, not when mouse up occurs outside modal
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}>
      <div style={modalStyle}>

        {/* Header */}
        <h2 style={headerStyle}>
          {isEditing
            ? `Edit ${formData.name}`
            : formData.type === "popup"
              ? "Add Popup Market"
              : "Add New Market"}
        </h2>

        {validationError && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 'var(--space-md)'
          }}>
            <span>{validationError}</span>
            <button onClick={() => setValidationError(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-status-error)'}}>✕</button>
          </div>
        )}

        {/* Priority 1: Core Configuration */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Market Name *</label>
          <input
            type="text"
            placeholder="Enter market name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Schedule</label>
          <input
            type="text"
            placeholder="e.g., 'Saturdays 8am-2pm' or 'Every other Tuesday 3-6pm'"
            value={formData.schedule}
            onChange={(e) => handleInputChange('schedule', e.target.value)}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Status</label>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => handleInputChange('active', e.target.checked)}
            />
            <label htmlFor="active" style={{
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-modern)',
              margin: 0
            }}>
              Market is active and accepting orders
            </label>
          </div>
        </div>

        {/* Priority 2 & 3: Consolidated sections */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Location & Setup Details</label>
          <textarea
            placeholder="Include booth location, setup notes, parking info, and any other location details. Example: 'Booth #12 near main entrance. Bring your own table and chairs. Free parking behind the building.'"
            value={formData.locationDetails || ''}
            onChange={(e) => handleInputChange('locationDetails', e.target.value)}
            style={textareaStyle}
            onFocus={(e) => Object.assign(e.target.style, { ...textareaStyle, ...inputFocusStyle })}
            onBlur={(e) => Object.assign(e.target.style, textareaStyle)}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Customer Information</label>
          <textarea
            placeholder="Include payment methods, what customers should bring, best times to visit, and any other customer info. Example: 'Cash, Venmo, credit cards accepted. Bring cooler for cold items and reusable bags. Early morning for best selection.'"
            value={formData.customerInfo || ''}
            onChange={(e) => handleInputChange('customerInfo', e.target.value)}
            style={textareaStyle}
            onFocus={(e) => Object.assign(e.target.style, { ...textareaStyle, ...inputFocusStyle })}
            onBlur={(e) => Object.assign(e.target.style, textareaStyle)}
          />
        </div>

        {/* Popup-specific fields */}
        {formData.type === "popup" && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Event Date & Time</label>
              <input
                type="datetime-local"
                value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleInputChange('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Notes</label>
              <textarea
                placeholder="Any additional notes about this popup..."
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }}
                onFocus={(e) => Object.assign(e.target.style, { ...inputStyle, minHeight: '80px', ...inputFocusStyle })}
                onBlur={(e) => Object.assign(e.target.style, { ...inputStyle, minHeight: '80px' })}
              />
            </div>
          </>
        )}

        {/* Priority 4: Management Actions */}
        <div style={buttonRowStyle}>
          <Button
            variant="add-event"
            size="md"
            fullWidth={true}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Update Market' : 'Save Market'}
          </Button>

          <Button
            variant="cancel"
            size="md"
            onClick={handleCancel}
          >
            Cancel
          </Button>

          {isEditing && (
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}