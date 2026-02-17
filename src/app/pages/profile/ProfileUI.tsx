"use client";

import { useState } from "react";
import { Container, Card, CardTitle, CardContent, Button, TextInput, CancelButton } from "@/design-system";
import { updateProfile, deleteAccount } from "./functions";

interface ProfileUIProps {
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    deliveryStreet: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
    deliveryZip: string | null;
    deliveryNotes: string | null;
    credentials: Array<{ id: string; createdAt: Date }>;
  };
}

export function ProfileUI({ user }: ProfileUIProps) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [deliveryStreet, setDeliveryStreet] = useState(user.deliveryStreet || "");
  const [deliveryCity, setDeliveryCity] = useState(user.deliveryCity || "");
  const [deliveryState, setDeliveryState] = useState(user.deliveryState || "");
  const [deliveryZip, setDeliveryZip] = useState(user.deliveryZip || "");
  const [deliveryNotes, setDeliveryNotes] = useState(user.deliveryNotes || "");

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('Saving...');

    try {
      const result = await updateProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
        deliveryStreet: deliveryStreet.trim() || null,
        deliveryCity: deliveryCity.trim() || null,
        deliveryState: deliveryState.trim() || null,
        deliveryZip: deliveryZip.trim() || null,
        deliveryNotes: deliveryNotes.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      setStatus('success');
      setMessage('Profile saved!');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleDelete = async () => {
    setStatus('loading');
    setMessage('Deleting account...');

    try {
      await deleteAccount();
      // Redirect happens in the server function
    } catch (error) {
      setStatus('error');
      setMessage('Failed to delete account');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Container>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-sm)',
        }}>
          Profile
        </h1>
      </div>

      <form onSubmit={handleSave}>
        {/* Contact Information */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Card>
            <CardTitle>Contact Information</CardTitle>
          <CardContent>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                Email (login)
              </label>
              <TextInput
                type="text"
                value={user.email || user.username}
                disabled
                placeholder="Not set"
              />
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                marginTop: 'var(--space-xs)',
              }}>
                Your email is used for passkey login
              </p>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                Name
              </label>
              <TextInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                Phone
              </label>
              <TextInput
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
              />
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Delivery Address */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Card>
            <CardTitle>Delivery Address</CardTitle>
          <CardContent>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-md)',
            }}>
              Optional. Save for future home delivery.
            </p>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                Street Address
              </label>
              <TextInput
                type="text"
                value={deliveryStreet}
                onChange={(e) => setDeliveryStreet(e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                }}>
                  City
                </label>
                <TextInput
                  type="text"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--space-xs)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                }}>
                  State
                </label>
                <TextInput
                  type="text"
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                ZIP Code
              </label>
              <TextInput
                type="text"
                value={deliveryZip}
                onChange={(e) => setDeliveryZip(e.target.value)}
                placeholder="12345"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--space-xs)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                Delivery Instructions
              </label>
              <TextInput
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Gate code, special instructions, etc."
              />
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ width: '100%' }}>
            <Button
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {message && (
            <p style={{
              marginTop: 'var(--space-sm)',
              fontSize: 'var(--font-size-sm)',
              color: status === 'error' ? 'var(--color-status-error)' : 'var(--color-action-primary)',
              textAlign: 'center',
            }}>
              {message}
            </p>
          )}
        </div>
      </form>

      {/* Account Settings */}
      <Card>
        <CardTitle>Account</CardTitle>
        <CardContent>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-xs)',
            }}>
              Passkeys: {user.credentials.length}
            </p>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}>
              Account created: {new Date(user.credentials[0]?.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          {!showDeleteConfirm ? (
            <div style={{ width: '100%' }}>
              <CancelButton onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </CancelButton>
            </div>
          ) : (
            <div>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-md)',
                textAlign: 'center',
              }}>
                Are you sure? This will permanently delete your account and all orders.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-md)',
              }}>
                <Button onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <CancelButton onClick={handleDelete}>
                  Confirm Delete
                </CancelButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
