"use client";

import { useState, useEffect } from "react";
import { Container, Card, Button, TextInput, Textarea } from "@/design-system";
import { AuthSheet } from "@/components/AuthSheet";
import { createOrder } from "./functions";

interface NewOrderUIProps {
  csrfToken: string | null; // null only if the session cookie failed to set
  isLoggedIn: boolean;
  vendorName: string;
  vendorId: string;
  vendorSlug: string;
  defaultContact: {
    name: string;
    email: string;
    phone: string;
  };
}

export function NewOrderUI({ csrfToken, isLoggedIn, vendorName, vendorId, vendorSlug, defaultContact }: NewOrderUIProps) {
  const [contactName, setContactName] = useState(defaultContact.name);
  const [contactEmail, setContactEmail] = useState(defaultContact.email);
  const [contactPhone, setContactPhone] = useState(defaultContact.phone);
  const [items, setItems] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  const draftKey = `fc_draft_order:${vendorSlug}`;

  // Restore draft, then let URL prefill (for "Order Again") win over it
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.items) setItems(draft.items);
        if (draft.notes) setNotes(draft.notes);
        if (draft.preferredDate) setPreferredDate(draft.preferredDate);
        if (draft.contactName && !defaultContact.name) setContactName(draft.contactName);
        if (draft.contactEmail && !defaultContact.email) setContactEmail(draft.contactEmail);
        if (draft.contactPhone && !defaultContact.phone) setContactPhone(draft.contactPhone);
      }
    } catch {}

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

  // Persist draft so nothing is lost across auth or accidental navigation
  useEffect(() => {
    try {
      if (!items && !notes && !preferredDate) return;
      localStorage.setItem(draftKey, JSON.stringify({
        items, notes, preferredDate, contactName, contactEmail, contactPhone,
      }));
    } catch {}
  }, [items, notes, preferredDate, contactName, contactEmail, contactPhone, draftKey]);

  const submitOrder = async (token: string) => {
    setStatus('loading');
    setMessage('Submitting your order...');

    try {
      const result = await createOrder(token, {
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        items: items.trim(),
        preferredDate: preferredDate || null,
        notes: notes.trim() || null,
      }, vendorId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      try { localStorage.removeItem(draftKey); } catch {}
      setStatus('success');
      setMessage(`Order submitted! ${vendorName} will confirm soon.`);

      if (isLoggedIn) {
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/orders';
        }, 2000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to submit order');
    }
  };

  const handleAuthed = () => {
    setAuthOpen(false);
    // verifyOtp already claimed this guest order server-side by email.
    window.location.href = '/orders';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!items.trim()) {
      setStatus('error');
      setMessage('Please describe what you want to order');
      return;
    }

    if (!isLoggedIn && !contactEmail.trim()) {
      setStatus('error');
      setMessage('Please enter your email so we can send your confirmation and payment link');
      return;
    }

    if (!csrfToken) {
      setStatus('error');
      setMessage('Your session expired. Please refresh the page and try again.');
      return;
    }

    submitOrder(csrfToken);
  };

  const guestSubmitted = status === 'success' && !isLoggedIn;

  if (guestSubmitted) {
    return (
      <Container size="md" noPadding>
        <Card variant="centered" maxWidth="800px">
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-heading-lg">Order submitted!</h1>
            <p className="text-subheading" style={{ marginBottom: 'var(--space-lg)' }}>
              {vendorName} will confirm and email you a payment link.
            </p>
            <div className="flex-col gap-sm">
              <Button variant="primary" size="lg" fullWidth onClick={() => setAuthOpen(true)}>
                Track this order — create an account
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => { window.location.href = `/?b=${vendorSlug}`; }}
              >
                Back to {vendorName}
              </Button>
            </div>
          </div>
        </Card>

        <AuthSheet
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthed={handleAuthed}
          title="Track your order"
          subtitle={`Verify your email to see this order under Your Orders.`}
          prefillEmail={contactEmail.trim() || undefined}
        />
      </Container>
    );
  }

  return (
    <Container size="md" noPadding>
      <Card variant="centered" maxWidth="800px">
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h1 className="text-heading-lg">
            Order
          </h1>
          <p className="text-subheading">
            Tell {vendorName} what you need and when you'd like to pick it up. They'll confirm availability, price, and pickup details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-md">
          {/* Contact Information */}
          <div className="surface-panel">
            <h3 className="label-md mb-md">
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
              required={!isLoggedIn}
              placeholder="your@email.com"
              helperText="We'll send your confirmation and payment link here"
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
            helperText={`Describe what you want - ${vendorName} will confirm availability and price (${items.length}/1000)`}
          />

          <div>
            <label className="label-sm mb-sm" style={{ display: 'block' }}>
              Preferred Pickup Date
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--color-input-border)',
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
              Optional - {vendorName} will confirm pickup time
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

          <div className="flex gap-sm mt-md">
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
                       'var(--color-status-info)',
            color: status === 'error' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'
          }}>
            {message}
          </div>
        )}
      </Card>
    </Container>
  );
}
