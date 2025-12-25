"use client";

import { useState } from "react";
import { TextInput, Textarea, TimeInput, TimeRow } from "./Input";
import { Select, InlineSelect, RadioGroup, ToggleSwitch } from "./FormControls";
import { Button } from "../Button";
import { Container } from "./Container";

/**
 * InputDemo - Showcase of all input components
 *
 * WHY: Demonstrates the complete input system with fresh market glassomorphism styling.
 * Based on patterns from the market-config wireframe.
 */
export function InputDemo() {
  // Form state
  const [formData, setFormData] = useState({
    marketName: '',
    description: '',
    startTime: '8:00 AM',
    endTime: '2:00 PM',
    dayOfWeek: 'Saturday',
    schedulePattern: 'weekly',
    isActive: true,
    customerInfo: '',
  });

  const dayOptions = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' },
  ];

  const scheduleOptions = [
    {
      value: 'weekly',
      label: 'Every week',
      description: 'Market happens every week'
    },
    {
      value: 'biweekly',
      label: 'Every other week',
      description: 'Market happens every two weeks'
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'Market happens once per month'
    },
    {
      value: 'custom',
      label: 'Custom schedule...',
      description: 'Set specific dates'
    },
  ];

  return (
    <Container>
      <div style={demoContainerStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <h1 style={titleStyles}>Fresh Market Input System</h1>
          <p style={subtitleStyles}>
            Complete form components with warm glassomorphism styling
          </p>
        </div>

        {/* Form Sections */}
        <div style={formStyles}>
          {/* Basic Inputs */}
          <section style={sectionStyles}>
            <h2 style={sectionTitleStyles}>Basic Inputs</h2>

            <TextInput
              label="Market Name"
              placeholder="e.g., Hernando Farmers Market"
              value={formData.marketName}
              onChange={(e) => setFormData(prev => ({ ...prev, marketName: e.target.value }))}
              required
            />

            <Textarea
              label="Market Description"
              placeholder="Brief description of your market..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              helperText="Tell customers what makes your market special"
            />
          </section>

          {/* Schedule Configuration */}
          <section style={sectionStyles}>
            <h2 style={sectionTitleStyles}>Schedule Pattern</h2>

            <RadioGroup
              name="schedule-pattern"
              label="How often does your market happen?"
              value={formData.schedulePattern}
              onChange={(value) => setFormData(prev => ({ ...prev, schedulePattern: value }))}
              options={scheduleOptions}
            />

            <div style={inlinePatternStyles}>
              <span>Every </span>
              <InlineSelect
                value={formData.dayOfWeek}
                onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                options={dayOptions}
              />
            </div>

            <TimeRow
              startValue={formData.startTime}
              endValue={formData.endTime}
              onStartChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}
              onEndChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
            />

            <div style={previewStyles}>
              <div style={previewLabelStyles}>Upcoming Dates</div>
              <div style={previewTextStyles}>
                Nov 2, Nov 9, Nov 16, Nov 23...
              </div>
            </div>
          </section>

          {/* Toggle & Additional Info */}
          <section style={sectionStyles}>
            <h2 style={sectionTitleStyles}>Market Status & Info</h2>

            <ToggleSwitch
              label="Market Active"
              description="Turn off to pause your market temporarily"
              checked={formData.isActive}
              onChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />

            <Select
              label="Primary Day"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
              options={dayOptions}
              helperText="Main day when your market operates"
            />

            <Textarea
              label="Customer Information"
              placeholder="Payment methods, what to bring, parking info..."
              value={formData.customerInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, customerInfo: e.target.value }))}
              rows={4}
              helperText="Help customers know what to expect"
            />
          </section>

          {/* Actions */}
          <section style={actionSectionStyles}>
            <Button variant="primary" size="lg" fullWidth>
              Save Market Settings
            </Button>
            <Button variant="outline" size="md" fullWidth>
              Preview Customer View
            </Button>
          </section>
        </div>

        {/* Input System Guide */}
        <div style={guideStyles}>
          <h3 style={guideTitleStyles}>Input System Features</h3>
          <ul style={guideListStyles}>
            <li>✨ Warm glassomorphism design matching the fresh market theme</li>
            <li>🎯 Focus states with ocean blue highlights</li>
            <li>📱 Mobile-first responsive design</li>
            <li>♿ Accessible with proper labels and ARIA attributes</li>
            <li>🎨 Consistent with design system tokens</li>
            <li>⚡ Built for React Server Components</li>
          </ul>
        </div>
      </div>
    </Container>
  );
}

// Styles
const demoContainerStyles: React.CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: 'var(--space-xl) var(--space-md)',
};

const headerStyles: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 'var(--space-2xl)',
};

const titleStyles: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: 'var(--deep-navy)',
  fontFamily: 'var(--font-display)',
  marginBottom: 'var(--space-sm)',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '18px',
  color: 'var(--cool-gray)',
  margin: 0,
};

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2xl)',
};

const sectionStyles: React.CSSProperties = {
  background: 'var(--surface-primary)',
  border: '1px solid #f0f0f0',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-xl)',
  boxShadow: 'var(--shadow-sm)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const sectionTitleStyles: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--deep-navy)',
  marginBottom: 'var(--space-sm)',
  fontFamily: 'var(--font-display)',
};

const inlinePatternStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '16px',
  color: 'var(--deep-navy)',
  gap: '8px',
  fontWeight: 500,
};

const previewStyles: React.CSSProperties = {
  marginTop: 'var(--space-md)',
  padding: 'var(--space-md)',
  background: '#f0f8ff',
  border: '1px solid #b3d9ff',
  borderRadius: 'var(--radius-sm)',
};

const previewLabelStyles: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--ocean-blue)',
  fontWeight: 600,
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const previewTextStyles: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--deep-navy)',
};

const actionSectionStyles: React.CSSProperties = {
  ...sectionStyles,
  gap: 'var(--space-md)',
};

const guideStyles: React.CSSProperties = {
  marginTop: 'var(--space-2xl)',
  padding: 'var(--space-xl)',
  background: 'var(--glass-dark)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid rgba(0, 102, 204, 0.1)',
};

const guideTitleStyles: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--deep-navy)',
  marginBottom: 'var(--space-md)',
};

const guideListStyles: React.CSSProperties = {
  margin: 0,
  paddingLeft: 'var(--space-md)',
  color: 'var(--cool-gray)',
  lineHeight: 1.6,
};