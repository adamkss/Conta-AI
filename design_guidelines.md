# Design Guidelines: AI Chat Interface

## Design Approach
**Selected Approach:** Reference-Based (ChatGPT/Claude/Linear-inspired chat interfaces)

The user has provided specific screenshot references showing a dark, minimalist chat interface. The design should closely follow these aesthetic principles while maintaining functionality and clarity.

## Core Design Principles
1. **Minimalism First:** Clean, distraction-free interface focused on conversation
2. **Dark Theme Foundation:** Deep background with high-contrast text for readability
3. **Progressive Disclosure:** Start simple (empty state), reveal complexity as needed (message thread)
4. **Conversation-Centric:** All design elements support the chat experience

## Typography
- **Primary Font:** Inter or similar modern sans-serif via Google Fonts
- **Hierarchy:**
  - Empty state prompt: text-2xl to text-3xl, font-medium
  - User messages: text-base, font-normal
  - AI responses: text-base, font-normal
  - Input placeholder: text-sm, opacity-60
  - Timestamps (if added): text-xs, opacity-50

## Layout System
**Spacing Units:** Use Tailwind units of 2, 3, 4, 6, 8, 12, 16 for consistent rhythm

### Empty State (Initial View)
- Centered vertically and horizontally in viewport
- Max-width container: max-w-2xl
- Prompt text centered with mb-8
- Input field width: w-full with max-w-3xl
- Vertical padding around prompt: py-24

### Chat Thread View
- Fixed width content area: max-w-3xl mx-auto
- Message spacing: space-y-6 between messages
- Top padding: pt-8
- Bottom padding for input: pb-32 (accommodates fixed input)

## Component Library

### Message Components
**User Message:**
- Right-aligned with ml-auto, max-w-[80%]
- Rounded corners: rounded-2xl
- Padding: px-4 py-3
- Background: Subtle contrast from page background
- Text alignment: left (not center)

**AI Response:**
- Left-aligned, max-w-[80%]
- Rounded corners: rounded-2xl
- Padding: px-4 py-3
- Background: Different subtle shade from user message
- Optional: Avatar/icon on left (w-8 h-8, mr-3)

### Input Component
**Position & Container:**
- Fixed to bottom: fixed bottom-0
- Full width with max-w-3xl mx-auto
- Bottom padding: pb-6
- Background blur effect on parent container

**Input Field:**
- Border: Subtle border, rounded-full or rounded-2xl
- Padding: px-6 py-4
- Focus state: Ring effect (ring-2)
- Shadow: Soft shadow (shadow-lg)
- Multi-line support: min-h-[56px], resize-none
- Max height: max-h-32 with overflow-y-auto

**Send Button:**
- Position: Absolute right within input
- Size: w-10 h-10
- Icon: Send/arrow icon from chosen library
- Rounded: rounded-full
- Disabled state when input empty

### Navigation/Header
- Optional minimal header with app title
- Height: h-16
- Padding: px-6
- Position: sticky top-0 or fixed
- Backdrop blur for scroll effect

## Icon Library
**Selected:** Heroicons (use via CDN)
- Send icon for submit button
- Optional: Sparkles icon for AI responses
- Optional: User icon for messages

## Interaction Patterns

### Message Submission
- Enter key submits (Shift+Enter for new line)
- Auto-focus input after sending
- Clear input after submission
- Scroll to bottom on new message

### Loading States
- Typing indicator: Three animated dots while waiting for AI response
- Position: In AI message container, left-aligned
- Animation: Pulse or bounce

### Empty State Transition
- Fade out empty state prompt
- Slide up message thread
- Smooth transition duration: 300ms

## Animations
**Minimal & Purposeful:**
- Message appearance: Fade in with slight slide (duration-200)
- Input focus: Smooth ring transition
- Typing indicator: Subtle pulse animation
- Scroll behavior: smooth

## Accessibility
- Proper focus management for input field
- Keyboard navigation support (Tab, Enter, Shift+Enter)
- ARIA labels for icon buttons
- Screen reader announcements for new messages
- Sufficient color contrast ratios (WCAG AA minimum)

## Responsive Behavior
- Mobile (< 768px):
  - Reduce max-w to full with px-4
  - Adjust message max-width to 85%
  - Input padding: px-4 py-3
  - Font sizes remain consistent

- Desktop (≥ 768px):
  - Centered content container
  - Maximum width constraints maintained
  - Comfortable reading width

## Visual Hierarchy
1. Input field: Primary focus element (most prominent)
2. Latest message: High visibility
3. Message history: Readable but less prominent than input
4. Empty state prompt: Welcoming and clear

## Critical Implementation Notes
- No hero images or decorative graphics
- Focus entirely on functional UI elements
- Background should be solid dark color (no gradients unless very subtle)
- Maintain consistent vertical rhythm with established spacing units
- All interactive elements must have clear hover/focus states
- Input field should always be immediately accessible