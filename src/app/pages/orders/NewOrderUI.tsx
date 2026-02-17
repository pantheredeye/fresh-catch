"use client";

import { useState, useEffect } from "react";
import { Container, Card, Button, TextInput, Textarea } from "@/design-system";
import { createOrder } from "./functions";
import type { AppContext } from "@/worker";

interface NewOrderUIProps {
  ctx: AppContext;
  defaultContact: {
    name: string;
    phone: string;
  };
}

export function NewOrderUI({ ctx, defaultContact }: NewOrderUIProps) {
  const [contactName, setContactName] = useState(defaultContact.name);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState(defaultContact.phone);
  const [items, setItems] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  // Handle prefill from URL params (for "Order Again")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillData = params.get('prefill');

    if (prefillData) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillData));
        if (data.items) setItems(data.items);
        if (data.notes) setNotes(data.notes);
        if (data.preferredDate) setPreferredDate(data.preferredDate);
      } catch (e) {
        console.error('Failed to parse prefill data:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!items.trim()) {
      setStatus('error');
      setMessage('Please describe what you want to order');
      return;
    }

    setStatus('loading');
    setMessage('Submitting your order...');

    try {
      const result = await createOrder({
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        items: items.trim(),
        preferredDate: preferredDate || null,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      setStatus('success');
      setMessage('Order submitted! Evan will confirm soon.');

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/orders';
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to submit order');
    }
  };

  return (
    <Container size="md" noPadding>
      <Card variant="centered" maxWidth="800px">
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            marginBottom: 'var(--space-xs)'
          }}>
            Quick Order
          </h1>
          <p style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 'var(--line-height-base)'
          }}>
            Tell Evan what you need and when you'd like to pick it up. He'll confirm availability, price, and pickup details.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)'
        }}>
          {/* Contact Information */}
          <div style={{
            background: 'var(--color-surface-secondary)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <h3 style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-wider)',
              marginBottom: 'var(--space-md)'
            }}>
              Contact Information
            </h3>

            <TextInput
              label="Your Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              placeholder="John Smith"
              size="md"
            />

            <TextInput
              label="Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              helperText="For order confirmations and updates"
              size="md"
            />

            <TextInput
              label="Phone Number"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              helperText="Optional"
              size="md"
            />
          </div>

          {/* Order Details */}
          <Textarea
            label="What would you like to order?"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            required
            placeholder="Example: 2 lbs shrimp, 1 lb redfish fillets, dozen oysters"
            rows={4}
            helperText={`Describe what you want - Evan will confirm availability and price (${items.length}/1000)`}
          />

          <div>
            <label style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-wider)',
              marginBottom: 'var(--space-sm)',
              display: 'block'
            }}>
              Preferred Pickup Date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-warm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-modern)',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
            />
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              marginTop: '4px'
            }}>
              Optional - Evan will confirm pickup time
            </div>
          </div>

          <Textarea
            label="Special Requests or Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special preparation requests or delivery notes..."
            rows={3}
            helperText={`Optional (${notes.length}/500)`}
          />

          <div style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-md)'
          }}>
            <Button
              type="button"
              variant="cancel"
              size="lg"
              onClick={() => window.history.back()}
              disabled={status === 'loading'}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? 'Submitting...' :
               status === 'success' ? '✓ Submitted' :
               'Submit Order'}
            </Button>
          </div>
        </form>

        {/* Status Message */}
        {message && (
          <div style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
            background: status === 'success' ? 'var(--color-status-success)' :
                       status === 'error' ? 'var(--color-action-secondary)' :
                       'var(--sky-blue)',
            color: status === 'error' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'
          }}>
            {message}
          </div>
        )}
      </Card>
    </Container>
  );
}
