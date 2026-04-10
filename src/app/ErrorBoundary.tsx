"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "var(--space-lg)",
            fontFamily: "var(--font-modern)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-primary)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              marginBottom: "var(--space-sm)",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-lg)",
              maxWidth: "400px",
            }}
          >
            We hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "var(--space-sm) var(--space-lg)",
              background: "var(--color-action-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-md)",
              cursor: "pointer",
            }}
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
