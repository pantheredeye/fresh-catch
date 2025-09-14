import { Container, Header, Card, CardTitle, CardContent, FreshBadge, LiveBadge, AvailableBadge, Button, OrderButton, QuickAction, FreshHero, FreshGrid, FreshItem, TodayBanner, MarketCard, QuickActions, BottomNav, SpecialEvents } from '@/design-system'
import { ToggleSwitch, MarketToggle, CompactMarketCard, CompactMarketList, SectionHeader, DateHeader, BulkActionBar, BulkActionButton, AdminButton, CancelButton, AddEventButton, PauseSeasonButton, DeleteMarketButton } from '@/admin-design-system'

/**
 * DesignTest - Simple test page for design system validation
 * 
 * Tests:
 * - Mobile-first container behavior
 * - Design tokens working in React
 * - Component composition
 * - Responsive layout without fake phone constraints
 */
export function DesignTest() {
  return (
    <>
      {/* Import design tokens */}
      <style dangerouslySetInnerHTML={{
        __html: `@import url('/src/design-system/tokens.css');`
      }} />
      
      <Header 
        title="Evan's Fresh Catch"
        action={{
          label: "+ Quick Order",
          href: "#"
        }}
      />
      
      {/* Today Banner */}
      <TodayBanner>LIVE at Livingston Market</TodayBanner>
      
      
      <Container>
        
      {/* Fresh Hero Section */}
      <FreshHero title="Fresh from the Gulf">
        <FreshGrid>
          <FreshItem emoji="🦐">Shrimp</FreshItem>
          <FreshItem emoji="🟠">Redfish</FreshItem>
          <FreshItem emoji="🐟">Flounder</FreshItem>
          <FreshItem emoji="🦀">Crab</FreshItem>
          <FreshItem emoji="🦪">Oysters</FreshItem>
          <FreshItem emoji="🐟">Trout</FreshItem>
        </FreshGrid>
      </FreshHero>
      
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-md)'
          }}>
            <h2 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '24px', 
              fontWeight: 700,
              margin: 0
            }}>
              Your Markets
            </h2>
            <a href="#edit" style={{
              color: 'var(--ocean-blue)',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Edit
            </a>
          </div>
          
          {/* New MarketCard Components */}
          <MarketCard
            name="Oxford City Market"
            date="Tuesday, November 5"
            time="3:00 PM - 6:30 PM"
            distance="3 days away"
            isFavorite={true}
            orderHref="#order"
            pinHref="#directions"
          />
          
          <MarketCard
            name="Hernando Farmers Market"
            date="Saturday, November 9"
            time="10:00 AM - 2:00 PM"
            distance="This Saturday"
            isFavorite={true}
            orderHref="#order"
            pinHref="#directions"
          />
          
          {/* Regular Card for Comparison */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Legacy Card (for comparison)
            </h3>
            <Card>
              <CardTitle>Regular Card Layout</CardTitle>
              <CardContent>
                <div style={{ color: 'var(--ocean-blue)', fontWeight: 600 }}>
                  Saturday, November 9
                </div>
                <div style={{ color: 'var(--cool-gray)', fontSize: '14px' }}>
                  10:00 AM - 2:00 PM
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Test Color Palette */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-xl)'
          }}>
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--ocean-gradient)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Ocean Gradient
            </div>
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--coral-gradient)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Coral Gradient
            </div>
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--mint-fresh)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Mint Fresh
            </div>
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--warm-gold)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              Warm Gold
            </div>
          </div>
          
          {/* Test Typography */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-sm)'
            }}>
              Typography Test
            </h3>
            <p style={{ 
              color: 'var(--cool-gray)', 
              fontFamily: 'var(--font-modern)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-sm)'
            }}>
              Body text using modern font stack. This should feel familiar and readable.
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              color: 'var(--deep-navy)',
              background: 'var(--light-gray)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)'
            }}>
              Monospace: $24.99 • 3:30 PM • #ORDER123
            </div>
          </div>
          
          {/* Test Badge Components */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Badge Components
            </h3>
            
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-lg)'
            }}>
              <FreshBadge size="sm" />
              <FreshBadge size="md" />
              <FreshBadge size="lg" />
              <LiveBadge />
              <AvailableBadge />
              <AvailableBadge timeLeft="2 hours" />
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)'
            }}>
              <strong>Animation Test:</strong> Watch the "Fresh" badges bounce every 2 seconds, and the "Live" pulse effect!
            </div>
          </div>
          
          {/* Test Button System */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Button System
            </h3>
            
            <div style={{ 
              display: 'grid',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)'
            }}>
              {/* Primary Buttons */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Primary Actions (Ocean Gradient)
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm">Small Primary</Button>
                  <Button variant="primary" size="md">Medium Primary</Button>
                  <Button variant="primary" size="lg">Large Primary</Button>
                  <OrderButton size="lg" />
                </div>
              </div>
              
              {/* Secondary Buttons */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Secondary Actions (Coral Gradient)
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm">Save for Later</Button>
                  <Button variant="secondary" size="md">Add to Favorites</Button>
                  <Button variant="secondary" size="lg">Share Market</Button>
                </div>
              </div>
              
              {/* Outline & Ghost */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Subtle Actions
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <Button variant="outline" size="md">View Details</Button>
                  <Button variant="ghost" size="md">Cancel</Button>
                  <QuickAction>Quick Action</QuickAction>
                  <Button variant="primary" size="md" disabled>Disabled</Button>
                </div>
              </div>
              
              {/* Full Width */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Full Width
                </h4>
                <Button variant="primary" size="lg" fullWidth>Complete Order - $47.50</Button>
              </div>
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)'
            }}>
              <strong>Interaction Test:</strong> Hover for lift effect, click for scale feedback. Notice thick borders for confidence!
            </div>
          </div>
        </div>
        
        {/* Admin Components Test */}
        <div style={{ marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-xl)', borderTop: '2px solid var(--light-gray)' }}>
          <h2 style={{ 
            color: 'var(--deep-navy)', 
            fontSize: '28px', 
            fontWeight: 700,
            marginBottom: 'var(--space-md)',
            textAlign: 'center'
          }}>
            Admin Components
          </h2>
          <p style={{ 
            color: 'var(--cool-gray)', 
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
            fontStyle: 'italic'
          }}>
            Testing admin interface components with customer design cohesion
          </p>
          
          {/* Toggle Switch Tests */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Toggle Switches
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
              padding: 'var(--space-md)',
              background: 'var(--light-gray)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '100%'
            }}>
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Default Size
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <ToggleSwitch active={true} label="Active Market" />
                  <ToggleSwitch active={false} label="Paused Market" />
                  <ToggleSwitch active={true} disabled={true} label="Disabled (Active)" />
                </div>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Compact Size
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <MarketToggle active={true} marketName="Hernando Market" />
                  <MarketToggle active={false} marketName="Oxford Market" />
                  <MarketToggle active={true} disabled={true} marketName="Disabled Market" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Compact Market List Tests */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Compact Market Management
            </h3>
            
            {/* Active Markets */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ 
                color: 'var(--cool-gray)', 
                fontSize: '14px', 
                marginBottom: 'var(--space-sm)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
              }}>
                Active Markets
              </h4>
              <CompactMarketList
                markets={[
                  {
                    id: '1',
                    name: 'Hernando',
                    schedule: 'Sat 8-2',
                    active: true
                  },
                  {
                    id: '2', 
                    name: 'Oxford City',
                    schedule: 'Tue 3-6:30',
                    active: true
                  },
                  {
                    id: '3',
                    name: 'Olive Branch',
                    schedule: 'Sat 9-1',
                    active: true
                  },
                  {
                    id: '4',
                    name: 'Adobe Farmers',
                    schedule: 'Fri 4-7',
                    active: true
                  }
                ]}
              />
            </div>
            
            {/* Paused Markets */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ 
                color: 'var(--cool-gray)', 
                fontSize: '14px', 
                marginBottom: 'var(--space-sm)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
              }}>
                Paused Markets
              </h4>
              <CompactMarketList
                markets={[
                  {
                    id: '5',
                    name: 'Senatobia Sunday',
                    schedule: 'Sun 9-2',
                    active: false,
                    paused: true,
                    subtitle: 'Paused until March'
                  },
                  {
                    id: '6',
                    name: 'Holly Springs Night',
                    schedule: 'Fri 5-9',
                    active: false, 
                    paused: true,
                    subtitle: 'Winter break'
                  }
                ]}
              />
            </div>
            
            {/* Empty State */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ 
                color: 'var(--cool-gray)', 
                fontSize: '14px', 
                marginBottom: 'var(--space-sm)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
              }}>
                Empty State
              </h4>
              <CompactMarketList
                markets={[]}
              />
            </div>
            
            {/* Loading State */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h4 style={{ 
                color: 'var(--cool-gray)', 
                fontSize: '14px', 
                marginBottom: 'var(--space-sm)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 600
              }}>
                Loading State
              </h4>
              <CompactMarketList
                markets={[]}
                loading={true}
              />
            </div>
          </div>
          
          {/* Section Headers Test */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Section Headers
            </h3>
            
            <div style={{ 
              border: '1px solid rgba(100, 116, 139, 0.1)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 'var(--space-lg)'
            }}>
              <SectionHeader>Active Markets</SectionHeader>
              <div style={{ padding: 'var(--space-md)', background: 'white' }}>
                Content would go here...
              </div>
              
              <SectionHeader>Paused Markets</SectionHeader>
              <div style={{ padding: 'var(--space-md)', background: 'white' }}>
                More content here...
              </div>
              
              <DateHeader date="Today • Saturday, Nov 2" />
              <div style={{ padding: 'var(--space-md)', background: 'white' }}>
                Today's markets...
              </div>
              
              <DateHeader date="Tuesday, Nov 5" />
              <div style={{ padding: 'var(--space-md)', background: 'white' }}>
                Tuesday's markets...
              </div>
            </div>
          </div>
          
          {/* Admin Buttons Test */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Admin Button System
            </h3>
            
            <div style={{
              display: 'grid',
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              {/* Small Action Buttons */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Small Action Buttons (for inline use)
                </h4>
                <div style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  flexWrap: 'wrap',
                  width: '100%',
                  maxWidth: '100%'
                }}>
                  <CancelButton />
                  <AdminButton variant="cancel" size="sm">Edit</AdminButton>
                  <AdminButton variant="cancel" size="sm">Details</AdminButton>
                </div>
              </div>
              
              {/* Primary Action Buttons */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Primary Admin Actions
                </h4>
                <div style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  flexWrap: 'wrap',
                  width: '100%',
                  maxWidth: '100%'
                }}>
                  <AddEventButton fullWidth={false} />
                  <AdminButton variant="add-event" size="md">Save Changes</AdminButton>
                  <AdminButton variant="add-event" size="lg">Complete Setup</AdminButton>
                </div>
              </div>
              
              {/* Full Width Actions */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Full Width Actions (for forms and major actions)
                </h4>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                  <AddEventButton />
                  <PauseSeasonButton />
                  <DeleteMarketButton />
                </div>
              </div>
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)',
              marginBottom: 'var(--space-md)'
            }}>
              <strong>Admin Button Features:</strong> Hover for lift + color fill effect. 
              Consistent with customer buttons but focused on admin tasks. 
              Cancel (coral), Add Event (ocean blue), Secondary (gold), Danger (coral).
            </div>
          </div>
          
          {/* Bulk Action Bar Test */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Bulk Action Bar
            </h3>
            
            <div style={{
              position: 'relative',
              height: '200px',
              background: 'var(--light-gray)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)'
            }}>
              <p style={{ color: 'var(--cool-gray)', textAlign: 'center', marginTop: 'var(--space-xl)' }}>
                Simulated content area<br/>
                <small>The bulk action bar floats above content</small>
              </p>
              
              {/* Bulk Action Bar - positioned relative to container for demo */}
              <div style={{ position: 'relative', height: '60px' }}>
                <BulkActionBar
                  selectedCount={3}
                  visible={true}
                  actions={
                    <>
                      <BulkActionButton variant="danger">Cancel Markets</BulkActionButton>
                      <BulkActionButton variant="primary">Edit Selected</BulkActionButton>
                    </>
                  }
                />
              </div>
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)'
            }}>
              <strong>Bulk Operations:</strong> Slides up from bottom when items are selected. 
              Dark background for strong contrast. Includes count, actions, and close button. 
              Perfect for weather cancellations or batch edits.
            </div>
          </div>
          
          {/* Complete Admin Layout Example */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Complete Admin Layout Example
            </h3>
            
            <div style={{
              border: '1px solid rgba(100, 116, 139, 0.1)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 'var(--space-md)'
            }}>
              {/* Add Event Button */}
              <div style={{ 
                padding: 'var(--space-md)', 
                background: 'var(--light-gray)',
                borderBottom: '1px solid rgba(100, 116, 139, 0.1)'
              }}>
                <AddEventButton />
              </div>
              
              {/* Today's Schedule */}
              <DateHeader date="Today • Saturday, Nov 2" />
              
              <div style={{
                background: 'var(--surface-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(100, 116, 139, 0.1)',
                overflow: 'hidden',
                margin: '0'
              }}>
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'white',
                  gap: 'var(--space-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                    <MarketToggle active={true} marketName="Hernando" />
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--deep-navy)' }}>Hernando Farmers Market</div>
                      <div style={{ fontSize: '13px', color: 'var(--cool-gray)' }}>8:00 AM - 2:00 PM</div>
                    </div>
                  </div>
                  <CancelButton />
                </div>
                
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'white',
                  gap: 'var(--space-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                    <MarketToggle active={true} marketName="Olive Branch" />
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--deep-navy)' }}>Olive Branch Market</div>
                      <div style={{ fontSize: '13px', color: 'var(--cool-gray)' }}>9:00 AM - 1:00 PM</div>
                    </div>
                  </div>
                  <CancelButton />
                </div>
              </div>
              
              {/* Tuesday's Schedule */}
              <DateHeader date="Tuesday, Nov 5" />
              
              <div style={{
                padding: 'var(--space-sm) var(--space-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                gap: 'var(--space-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                  <MarketToggle active={true} marketName="Oxford City" />
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--deep-navy)' }}>Oxford City Market</div>
                    <div style={{ fontSize: '13px', color: 'var(--cool-gray)' }}>3:00 PM - 6:30 PM</div>
                  </div>
                </div>
                <CancelButton />
              </div>
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)'
            }}>
              <strong>Complete Layout:</strong> This shows how all admin components work together - 
              Add Event button, date headers for grouping, market instances with toggles and cancel buttons. 
              Perfect for the schedule management screen!
            </div>
          </div>
          
          {/* Admin vs Customer Comparison */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ 
              color: 'var(--deep-navy)', 
              fontSize: '20px', 
              fontFamily: 'var(--font-display)',
              marginBottom: 'var(--space-md)'
            }}>
              Visual Cohesion Test
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-lg)',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* Customer Market Card */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Customer View
                </h4>
                <MarketCard
                  name="Oxford City Market"
                  date="Tuesday, November 5"
                  time="3:00 PM - 6:30 PM"
                  distance="3 days away"
                  isFavorite={true}
                  orderHref="#order"
                  pinHref="#directions"
                />
              </div>
              
              {/* Admin Compact Card */}
              <div>
                <h4 style={{ color: 'var(--cool-gray)', fontSize: '14px', marginBottom: 'var(--space-sm)' }}>
                  Admin Management View
                </h4>
                <div style={{
                  background: 'var(--surface-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(100, 116, 139, 0.1)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <CompactMarketCard
                    name="Oxford City"
                    schedule="Tue 3-6:30"
                    active={true}
                  />
                </div>
              </div>
            </div>
            
            <div style={{
              background: 'var(--light-gray)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--cool-gray)',
              marginTop: 'var(--space-md)'
            }}>
              <strong>Design Cohesion:</strong> Notice how both cards use the same design tokens (colors, spacing, typography, shadows). 
              The admin version is more compact and functional, while the customer version is more detailed and engaging - 
              but they feel like part of the same system!
            </div>
          </div>
        </div>
      </Container>
      
      {/* Special Events Test */}
      <SpecialEvents 
        events={[
          {
            name: "Gatorade Field House Pop-up",
            date: "Wednesday, November 6", 
            time: "11:00 AM - 3:00 PM",
            pinHref: "#directions"
          },
          {
            name: "Arts & Crafts Fair - Oxford Square",
            date: "Friday, November 8",
            time: "9:00 AM - 5:00 PM", 
            pinHref: "#directions"
          },
          {
            name: "Holiday Seafood Market - Downtown",
            date: "Saturday, November 9",
            time: "8:00 AM - 1:00 PM",
            variant: "coral",
            pinHref: "#directions"
          }
        ]}
      />
      
      {/* Quick Actions Test */}
      <QuickActions 
        items={[
          { icon: "📅", title: "All Markets", href: "#markets" },
          { icon: "🍳", title: "Recipes", href: "#recipes" },
          { icon: "💬", title: "Text Evan", href: "#text" },
          { icon: "📞", title: "Call", href: "#call" }
        ]} 
      />
      
      {/* Bottom Navigation Test */}
      <BottomNav 
        items={[
          { label: "Home", href: "#home", isActive: true },
          { label: "Markets", href: "#markets" },
          { label: "Orders", href: "#orders", badge: "2" },
          { label: "More", href: "#more" }
        ]} 
      />
    </>
  )
}