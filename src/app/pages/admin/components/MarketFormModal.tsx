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
  }) => void | Promise<void>
  /** Existing market data for editing (undefined for new market) */
  market?: Market
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
  market
}: MarketFormModalProps) {

  // Form state
  const [formData, setFormData] = useState<Market>({
    name: '',
    schedule: '',
    active: true,
    locationDetails: '', // Consolidated location info
    customerInfo: ''     // Consolidated customer info
  })

  // Reset form when market prop changes
  useEffect(() => {
    if (market) {
      setFormData({ ...market })
    } else {
      setFormData({
        name: '',
        schedule: '',
        active: true,
        locationDetails: '',
        customerInfo: ''
      })
    }
  }, [market])

  // Don't render if not open
  if (!isOpen) return null

  const handleInputChange = (field: keyof Market, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    // Basic validation - only name required
    if (!formData.name.trim()) {
      alert('Market name is required')
      return
    }

    // Extract only the fields needed for save
    const { id, ...saveData } = formData
    onSave(saveData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${formData.name}"?`)) {
      // TODO: Implement delete functionality
      console.log('Delete market:', formData.id)
      onClose()
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
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--space-xl)'
  }

  const modalStyle: React.CSSProperties = {
    background: 'var(--warm-white)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    maxWidth: '420px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    margin: 'var(--space-md)'
  }

  const headerStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--deep-navy)',
    fontFamily: 'var(--font-display)',
    marginBottom: 'var(--space-lg)',
    textAlign: 'center'
  }

  const fieldStyle: React.CSSProperties = {
    marginBottom: 'var(--space-md)'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--deep-navy)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 'var(--space-xs)',
    fontFamily: 'var(--font-display)'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-sm)',
    border: '2px solid #e0e0e0',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--warm-white)',
    color: 'var(--deep-navy)',
    fontSize: '15px',
    fontFamily: 'var(--font-modern)',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  }

  const inputFocusStyle: React.CSSProperties = {
    borderColor: 'var(--ocean-blue)',
    boxShadow: '0 0 0 3px rgba(0, 102, 204, 0.1)',
    background: 'white',
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
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(100, 116, 139, 0.1)'
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
          {isEditing ? `Edit ${formData.name}` : 'Add New Market'}
        </h2>

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
              fontSize: '16px',
              color: 'var(--deep-navy)',
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

        {/* Priority 4: Management Actions */}
        <div style={buttonRowStyle}>
          <Button
            variant="add-event"
            size="md"
            fullWidth={true}
            onClick={handleSave}
          >
            {isEditing ? 'Update Market' : 'Save Market'}
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

// TODO: Add form validation with proper error messages
// TODO: Connect to actual save/delete handlers
// TODO: Add loading states for async operations
// TODO: Consider adding seasonal pause functionality
// TODO: Add escape key to close modal