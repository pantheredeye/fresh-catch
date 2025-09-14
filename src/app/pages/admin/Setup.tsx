"use client";

import { useState } from "react";
import { RequestInfo } from "rwsdk/worker";
import {
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyRegistration,
  startPasskeyRegistration,
} from "../user/functions";
import "@/design-system/tokens.css";

export function Setup({ ctx }: { ctx: any }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBusinessOwnerSetup = async (username: string, businessName: string) => {
    setLoading(true);
    try {
      // 1. Get a challenge from the worker for business owner registration
      const options = await startPasskeyRegistration(username);

      // 2. Ask the browser to sign the challenge
      const registration = await startRegistration({ optionsJSON: options });

      // 3. Give the signed challenge to the worker to finish the registration process
      const success = await finishPasskeyRegistration(username, registration);

      if (!success) {
        throw new Error("Business owner setup failed");
      }

      setResult("Business owner setup successful! You can now login.");
      // TODO: Link to existing organization or create new one
      // TODO: Redirect to admin dashboard after successful setup
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const setupStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--soft-white)',
    padding: 'var(--space-md)',
    fontFamily: 'var(--font-display)'
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    maxWidth: '400px',
    width: '100%',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--soft-gray)'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--deep-navy)',
    marginBottom: 'var(--space-sm)',
    textAlign: 'center'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: 'var(--slate-blue)',
    marginBottom: 'var(--space-lg)',
    textAlign: 'center',
    lineHeight: 1.5
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-sm)',
    border: '2px solid var(--soft-gray)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '16px',
    marginBottom: 'var(--space-md)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: loading ? 'var(--soft-gray)' : 'var(--ocean-blue)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-display)'
  };

  const resultStyle: React.CSSProperties = {
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    textAlign: 'center',
    background: result.includes('successful') ? 'var(--mint-green)' : 'var(--coral)',
    color: result.includes('successful') ? 'var(--deep-navy)' : 'white'
  };

  return (
    <div style={setupStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Business Owner Setup</h1>
        <p style={subtitleStyle}>
          Register your business owner account with passkey authentication
        </p>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const username = formData.get('username') as string;
          const businessName = formData.get('businessName') as string;
          handleBusinessOwnerSetup(username, businessName);
        }}>
          <input
            style={inputStyle}
            name="username"
            type="text"
            placeholder="Username (e.g., evan)"
            required
            disabled={loading}
          />

          <input
            style={inputStyle}
            name="businessName"
            type="text"
            placeholder="Business Name"
            defaultValue="Fresh Catch Seafood Markets"
            required
            disabled={loading}
          />

          <button
            style={buttonStyle}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Setup Business Account'}
          </button>
        </form>

        {result && (
          <div style={resultStyle}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}