import { Container, Card, CardTitle, CardContent, FreshBadge, LiveBadge, AvailableBadge, Button, OrderButton, QuickAction, CancelButton, AddEventButton, PauseSeasonButton, DeleteMarketButton, FreshHero, FreshGrid, FreshItem, Badge, NotificationBadge } from '@/design-system'
import { TextInput, Textarea, Select, InlineSelect, RadioGroup, ToggleSwitch } from '@/design-system'

/**
 * DesignTest - Design system primitives test page
 *
 * Tests only the core design system primitives.
 * Page-specific components are tested in their respective pages.
 */
export function DesignTest() {
  return (
    <>
      {/* Import design tokens */}
      <style dangerouslySetInnerHTML={{
        __html: `@import url('/src/design-system/tokens.css');`
      }} />

      <Container>
        <div style={{ padding: 'var(--space-xl) 0' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: 'var(--space-lg)',
            fontFamily: 'var(--font-display)',
            background: 'var(--ocean-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Design System Test
          </h1>

          {/* Fresh Hero Section */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Fresh Hero
            </h2>
            <FreshHero title="Fresh from the Gulf">
              <FreshGrid>
                <FreshItem emoji="🦐">Shrimp</FreshItem>
                <FreshItem emoji="🐟">Redfish</FreshItem>
                <FreshItem emoji="🐠">Flounder</FreshItem>
                <FreshItem emoji="🦀">Crab</FreshItem>
                <FreshItem emoji="🦪">Oysters</FreshItem>
                <FreshItem emoji="🐟">Trout</FreshItem>
              </FreshGrid>
            </FreshHero>
          </section>

          {/* Cards */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Cards
            </h2>
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <Card>
                <CardTitle>Basic Card</CardTitle>
                <CardContent>
                  Simple card with title and content. Uses design tokens for spacing and shadows.
                </CardContent>
              </Card>

              <Card>
                <CardTitle>Card with Custom Content</CardTitle>
                <CardContent>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <FreshBadge />
                    <LiveBadge />
                    <AvailableBadge />
                  </div>
                  Cards can contain any content, including badges and other components.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Badges */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Badges
            </h2>
            <Card>
              <CardContent>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Fresh Badge</div>
                    <FreshBadge />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Live Badge</div>
                    <LiveBadge />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Available Badge</div>
                    <AvailableBadge />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Generic Badge</div>
                    <Badge>New</Badge>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Notification Badge</div>
                    <NotificationBadge>5</NotificationBadge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Customer Buttons */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Customer Buttons
            </h2>
            <Card>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Primary</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <Button variant="primary" size="sm">Small</Button>
                      <Button variant="primary" size="md">Medium</Button>
                      <Button variant="primary" size="lg">Large</Button>
                      <OrderButton>Order Fish</OrderButton>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Secondary</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <Button variant="secondary" size="sm">Small</Button>
                      <Button variant="secondary" size="md">Medium</Button>
                      <Button variant="secondary" size="lg">Large</Button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Ghost</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <Button variant="ghost" size="sm">Small</Button>
                      <Button variant="ghost" size="md">Medium</Button>
                      <Button variant="ghost" size="lg">Large</Button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Outline</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <Button variant="outline" size="sm">Small</Button>
                      <Button variant="outline" size="md">Medium</Button>
                      <Button variant="outline" size="lg">Large</Button>
                      <QuickAction>Quick Action</QuickAction>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Full Width</div>
                    <Button variant="primary" fullWidth>Full Width Button</Button>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Disabled</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <Button variant="primary" disabled>Disabled</Button>
                      <Button variant="secondary" disabled>Disabled</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Admin Buttons */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Admin Buttons
            </h2>
            <Card>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Cancel / Danger</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <CancelButton />
                      <Button variant="cancel" size="sm">Edit</Button>
                      <Button variant="danger" size="md">Delete</Button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Primary Admin Actions</div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <AddEventButton fullWidth={false} />
                      <Button variant="add-event" size="md">Save Changes</Button>
                      <Button variant="add-event" size="lg">Complete Setup</Button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)', marginBottom: 'var(--space-xs)' }}>Full Width Actions</div>
                    <PauseSeasonButton />
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <DeleteMarketButton />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Form Inputs */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Form Inputs
            </h2>
            <Card>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                  <TextInput
                    label="Text Input"
                    placeholder="Enter text..."
                    helperText="Helper text appears below the input"
                  />

                  <TextInput
                    label="With Icon"
                    placeholder="Search..."
                    icon="🔍"
                  />

                  <TextInput
                    label="Error State"
                    placeholder="Invalid input"
                    error="This field has an error"
                  />

                  <Textarea
                    label="Textarea"
                    placeholder="Enter multiple lines..."
                    rows={4}
                  />

                  <Select
                    label="Select Dropdown"
                    options={[
                      { value: '1', label: 'Option 1' },
                      { value: '2', label: 'Option 2' },
                      { value: '3', label: 'Option 3' }
                    ]}
                  />

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Toggle Switch</div>
                    <ToggleSwitch
                      label="Enable notifications"
                      checked={true}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Radio Group</div>
                    <RadioGroup
                      name="delivery"
                      options={[
                        { value: 'pickup', label: 'Pickup' },
                        { value: 'delivery', label: 'Delivery' }
                      ]}
                      value="pickup"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Design Tokens Reference */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-md)', fontFamily: 'var(--font-display)' }}>
              Design Tokens
            </h2>
            <Card>
              <CardContent>
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Colors</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-sm)' }}>
                      {[
                        { name: 'Ocean Blue', color: 'var(--ocean-blue)' },
                        { name: 'Mint Fresh', color: 'var(--mint-fresh)' },
                        { name: 'Coral', color: 'var(--coral)' },
                        { name: 'Warm Gold', color: 'var(--warm-gold)' },
                        { name: 'Deep Navy', color: 'var(--deep-navy)' },
                      ].map(({ name, color }) => (
                        <div key={name} style={{ textAlign: 'center' }}>
                          <div style={{
                            background: color,
                            height: '60px',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-xs)',
                            boxShadow: 'var(--shadow-sm)'
                          }} />
                          <div style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Spacing</div>
                    <div style={{ fontSize: '12px', color: 'var(--cool-gray)' }}>
                      xs (4px) • sm (8px) • md (16px) • lg (24px) • xl (32px) • 2xl (48px)
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Border Radius</div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                      {[
                        { name: 'sm', radius: 'var(--radius-sm)' },
                        { name: 'md', radius: 'var(--radius-md)' },
                        { name: 'lg', radius: 'var(--radius-lg)' },
                        { name: 'xl', radius: 'var(--radius-xl)' },
                        { name: 'full', radius: 'var(--radius-full)' },
                      ].map(({ name, radius }) => (
                        <div key={name} style={{ textAlign: 'center' }}>
                          <div style={{
                            background: 'var(--ocean-blue)',
                            width: '50px',
                            height: '50px',
                            borderRadius: radius,
                            marginBottom: 'var(--space-xs)'
                          }} />
                          <div style={{ fontSize: '11px', color: 'var(--cool-gray)' }}>{name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </Container>
    </>
  )
}
