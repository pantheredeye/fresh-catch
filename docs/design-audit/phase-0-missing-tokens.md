# Phase 0: Define Missing Tokens

Tokens referenced in code but not defined in `tokens.css`. These silently break (render transparent/default).

## Undefined Color Tokens

Add to `:root` AND `@media (prefers-color-scheme: dark)` in `tokens.css`.

| Token | Used In | Suggested Value (Light) | Suggested Value (Dark) |
|---|---|---|---|
| `--mint-green` | Login, JoinUI, Setup | `#00C9A7` (alias of --mint-fresh?) | `#00A88A` |
| `--sky-blue` | Login, JoinUI, Setup, NewOrderUI | `#0EA5E9` | `#38BDF8` |
| `--soft-gray` | Login, JoinUI, Setup, OrderCard, AdminOrderCard | `#94A3B8` (alias of --cool-gray?) | `#CBD5E1` |
| `--dusty-gray` | ProfileUI | alias `--cool-gray` or remove | alias `--cool-gray` |
| `--coral-red` | ProfileUI | alias `--coral` or remove | alias `--coral` |
| `--text-primary` | admin.css | alias `--deep-navy` | `#E2E8F0` |
| `--text-secondary` | admin.css | alias `--cool-gray` | `#94A3B8` |

## Missing Utility Tokens

| Token | Used Pattern | Suggested Value |
|---|---|---|
| `--letter-spacing-wide` | `letterSpacing: '0.5px'` in 4+ files | `0.5px` |
| `--letter-spacing-wider` | `letterSpacing: '1px'` in 3+ files | `1px` |
| `--blur-sm` | `backdrop-filter: blur(5px)` | `5px` |
| `--blur-md` | `backdrop-filter: blur(10px)` | `10px` |
| `--border-strong` | `border: 2px solid #000` in PrintOrders | `#1A2B3D` / `#E2E8F0` |

## Missing Status Tokens

Used in PrintOrders payment badges (currently Bootstrap colors).

| Token | Light | Dark |
|---|---|---|
| `--status-success-bg` | `#ECFDF5` | `rgba(16,185,129,0.15)` |
| `--status-success-border` | `#10B981` | `#34D399` |
| `--status-warning-bg` | `#FFFBEB` | `rgba(245,158,11,0.15)` |
| `--status-warning-border` | `#F59E0B` | `#FBBF24` |

## Checklist

- [ ] Add undefined color tokens to `:root`
- [ ] Add dark mode overrides for each
- [ ] Add utility tokens (letter-spacing, blur, border-strong)
- [ ] Add status tokens
- [ ] Verify no other undefined tokens remain (grep for `var(--` and cross-ref)
