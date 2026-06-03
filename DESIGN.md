# AI Workspace Design System

## Mode

Product UI. Prioritize utility and readability over brand spectacle.

## Visual Direction

- Clean dashboards and forms
- Consistent spacing rhythm (Tailwind scale)
- Subtle indigo accents for interaction, not decoration
- Minimal motion only when it improves clarity

## Color Guidance

- Backgrounds: neutral light (`gray-50`) / dark (`gray-950`) surfaces
- Primary accent: indigo family for actions and focus states
- Status semantics:
  - Success / ready: green
  - Pending / processing: amber or blue
  - Error / failed: red

## Typography

- Display/body: Manrope (`--font-manrope`)
- Monospace: Geist Mono (`--font-geist-mono`) for code or IDs when needed
- Hierarchy: page title → section title → body → meta/help
- Comfortable line-height in chat and document lists

## Components and Behavior

- **Buttons**: one primary per section; secondary outline/ghost
- **Forms**: visible labels; inline errors beside inputs
- **Cards**: group related tasks; avoid nested card clutter
- **Navigation**: sidebar with clear active route; literal labels (Dashboard, Organizations, Documents, Chat)

## Page-Specific Notes

- **Login / Signup**: single column, distraction-free, strong error messaging
- **Documents**: processing status prominent; short upload flow
- **Chat**: distinct user vs assistant bubbles; comfortable reading width

## Slop to Avoid

- Random mixed border radii
- Inconsistent button styles between pages
- Excessive shadows or neon gradients
- Placeholder text used as label replacement
