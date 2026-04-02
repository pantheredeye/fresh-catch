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
  cancelledAt?: string | null
}

interface CatchPreviewItem {
  name: string
  note: string
}

interface MarketFormModalProps {
  isOpen: boolean
  onClose: () => void
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
  onDelete?: (id: string) => Promise<void>
  onEndPopup?: (id: string) => Promise<void>
  onCancelPopup?: (id: string) => Promise<void>
  market?: Market
  presetType?: "regular" | "popup"
  isPending?: boolean
}

function parseCatchPreview(raw: string | null | undefined): CatchPreviewItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed.items.map((i: { name?: string; note?: string }) => ({
        name: i.name || '',
        note: i.note || '',
      }))
    }
  } catch {}
  return []
}

function serializeCatchPreview(items: CatchPreviewItem[]): string | null {
  const filtered = items.filter(i => i.name.trim())
  if (filtered.length === 0) return null
  return JSON.stringify({ items: filtered })
}

export function MarketFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onEndPopup,
  onCancelPopup,
  market,
  presetType = "regular",
  isPending = false,
}: MarketFormModalProps) {

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

  const [catchItems, setCatchItems] = useState<CatchPreviewItem[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"end" | "cancel" | null>(null)

  useEffect(() => {
    if (market) {
      setFormData({ ...market })
      setCatchItems(parseCatchPreview(market.catchPreview))
      setShowNotes(!!market.notes)
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
      setCatchItems([])
      setShowNotes(false)
    }
    setConfirmAction(null)
  }, [market, presetType])

  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleInputChange = (field: keyof Market, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setValidationError(null)
    if (!formData.name.trim()) {
      setValidationError('Market name is required')
      return
    }
    // Popup validation
    if (formData.type === "popup") {
      if (!formData.expiresAt) {
        setValidationError('Event date is required for popup markets')
        return
      }
      if (new Date(formData.expiresAt) < new Date()) {
        setValidationError('Event date must be in the future')
        return
      }
    }

    setSaving(true)
    try {
      const { id, cancelledAt, ...saveData } = formData
      await onSave({
        ...saveData,
        catchPreview: serializeCatchPreview(catchItems),
      })
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

  const handleEndPopup = async () => {
    if (formData.id && onEndPopup) {
      await onEndPopup(formData.id)
    }
    setConfirmAction(null)
  }

  const handleCancelPopup = async () => {
    if (formData.id && onCancelPopup) {
      await onCancelPopup(formData.id)
    }
    setConfirmAction(null)
  }

  // Catch preview item handlers
  const addCatchItem = () => {
    setCatchItems(prev => [...prev, { name: '', note: '' }])
  }

  const removeCatchItem = (index: number) => {
    setCatchItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateCatchItem = (index: number, field: 'name' | 'note', value: string) => {
    setCatchItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const isEditing = !!market?.id
  const isActivePopup = isEditing && formData.type === "popup" && formData.active && !formData.cancelledAt
  const anyPending = isPending || saving

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

  const segmentedControlStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '2px solid var(--color-border-input)',
  }

  const segmentStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 'var(--space-sm) var(--space-md)',
    background: active ? 'var(--color-action-primary)' : 'var(--color-surface-warm)',
    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    fontFamily: 'var(--font-display)',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  })

  const catchItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-xs)',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-xs)',
  }

  const catchInputStyle: React.CSSProperties = {
    ...inputStyle,
    padding: 'var(--space-xs) var(--space-sm)',
    fontSize: 'var(--font-size-sm)',
  }

  const confirmBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--color-status-warning-bg, #fff8e1)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    marginTop: 'var(--space-sm)',
  }

  return (
    <div style={overlayStyle} onClick={(e) => {
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

        {/* Type Toggle - only for new markets */}
        {!isEditing && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Market Type</label>
            <div style={segmentedControlStyle}>
              <button
                type="button"
                style={segmentStyle(formData.type !== "popup")}
                onClick={() => handleInputChange('type', 'regular')}
              >
                Regular Market
              </button>
              <button
                type="button"
                style={segmentStyle(formData.type === "popup")}
                onClick={() => handleInputChange('type', 'popup')}
              >
                Popup
              </button>
            </div>
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
          <div style={fieldStyle}>
            <label style={labelStyle}>Event Date & Time *</label>
            <input
              type="datetime-local"
              value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => Object.assign(e.target.style, inputStyle)}
            />
          </div>
        )}

        {/* Catch Preview / Usually Available - for both types */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            {formData.type === "popup" ? "Catch Preview" : "Usually Available"}
          </label>
          {catchItems.map((item, index) => (
            <div key={index} style={catchItemStyle}>
              <input
                type="text"
                placeholder="Fish name"
                value={item.name}
                onChange={(e) => updateCatchItem(index, 'name', e.target.value)}
                style={{ ...catchInputStyle, flex: 1 }}
                onFocus={(e) => Object.assign(e.target.style, { ...catchInputStyle, flex: 1, ...inputFocusStyle })}
                onBlur={(e) => Object.assign(e.target.style, { ...catchInputStyle, flex: 1 })}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={item.note}
                onChange={(e) => updateCatchItem(index, 'note', e.target.value)}
                style={{ ...catchInputStyle, flex: 1.5 }}
                onFocus={(e) => Object.assign(e.target.style, { ...catchInputStyle, flex: 1.5, ...inputFocusStyle })}
                onBlur={(e) => Object.assign(e.target.style, { ...catchInputStyle, flex: 1.5 })}
              />
              <button
                type="button"
                onClick={() => removeCatchItem(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-lg)',
                  padding: 'var(--space-xs)',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCatchItem}
            style={{
              background: 'none',
              border: '1px dashed var(--color-border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-xs) var(--space-sm)',
              color: 'var(--color-action-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-modern)',
              width: '100%',
            }}
          >
            + Add Item
          </button>
        </div>

        {/* Notes - shown for popups, toggle for regular */}
        {formData.type === "popup" || showNotes ? (
          <div style={fieldStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Any additional notes..."
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' as const }}
              onFocus={(e) => Object.assign(e.target.style, { ...inputStyle, minHeight: '80px', ...inputFocusStyle })}
              onBlur={(e) => Object.assign(e.target.style, { ...inputStyle, minHeight: '80px' })}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-action-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-modern)',
              padding: 0,
              marginBottom: 'var(--space-md)',
            }}
          >
            + Add notes
          </button>
        )}

        {/* Priority 4: Management Actions */}
        <div style={buttonRowStyle}>
          <Button
            variant="add-event"
            size="md"
            fullWidth={true}
            onClick={handleSave}
            disabled={anyPending}
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
              disabled={anyPending}
            >
              Delete
            </Button>
          )}
        </div>

        {/* Popup-specific actions: End Now / Cancel */}
        {isActivePopup && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            {confirmAction === null && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  onClick={() => setConfirmAction("end")}
                  disabled={anyPending}
                  style={{
                    flex: 1,
                    padding: 'var(--space-sm)',
                    background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-modern)',
                    opacity: anyPending ? 0.5 : 1,
                  }}
                >
                  End Now
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction("cancel")}
                  disabled={anyPending}
                  style={{
                    flex: 1,
                    padding: 'var(--space-sm)',
                    background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-status-error)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-status-error)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-modern)',
                    opacity: anyPending ? 0.5 : 1,
                  }}
                >
                  Cancel Popup
                </button>
              </div>
            )}

            {confirmAction === "end" && (
              <div style={confirmBarStyle}>
                <span style={{ flex: 1 }}>End this popup?</span>
                <button
                  type="button"
                  onClick={handleEndPopup}
                  disabled={anyPending}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--color-action-primary)',
                    color: 'var(--color-text-inverse)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'none',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  No
                </button>
              </div>
            )}

            {confirmAction === "cancel" && (
              <div style={{ ...confirmBarStyle, background: 'var(--color-status-error-bg, #fce4ec)' }}>
                <span style={{ flex: 1, color: 'var(--color-status-error)' }}>Cancel this popup?</span>
                <button
                  type="button"
                  onClick={handleCancelPopup}
                  disabled={anyPending}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--color-status-error)',
                    color: 'var(--color-text-inverse)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'none',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
