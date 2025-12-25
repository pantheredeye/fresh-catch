// Design System - Primitives Only
// Page-specific components live in their page directories (e.g., src/app/pages/home/components/)

// Layout Primitives
export { Container } from './components/Container'
export { Card, CardTitle, CardContent } from './components/Card'

// Button Primitives (all variants: customer + admin)
export { Button, OrderButton, QuickAction, CancelButton, AddEventButton, PauseSeasonButton, DeleteMarketButton } from './Button'

// Badge Primitives
export { FreshBadge, LiveBadge, AvailableBadge } from './components/FreshBadge'
export { Badge, NotificationBadge } from './components/Badge'

// Composition Components (used on multiple pages)
export { FreshHero, FreshGrid, FreshItem } from './components/FreshHero'
export { LoginForm } from './components/LoginForm'
export { SectionHeader, DateHeader } from './components/SectionHeader'

// Form & Input Components
export {
  TextInput,
  Textarea,
  TimeInput,
  TimeRow
} from './components/Input'
export {
  Select,
  InlineSelect,
  RadioGroup,
  ToggleSwitch,
  MarketToggle
} from './components/FormControls'

// Design System Styles
// Import tokens.css in your main app file or Document.tsx:
// import './design-system/tokens.css'

// TODO: Export additional components as they're created:
// - Fish icons
// - Checkbox, Search input, Number input
// - Loading states