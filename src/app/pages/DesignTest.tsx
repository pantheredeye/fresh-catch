import { Container, Header, Card, CardTitle, CardContent, FreshBadge, LiveBadge, AvailableBadge, Button, OrderButton, QuickAction, FreshHero, FreshGrid, FreshItem, TodayBanner, MarketCard, QuickActions, BottomNav, SpecialEvents } from '@/design-system'

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
      
      <Container>
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