# AI Development Guidelines - CONNECT

This document serves as the comprehensive guideline for AI assistants working on the CONNECT project. All development work must adhere to these standards to ensure consistency, scalability, and maintainability.

## Core Principles

### 1. Dynamic Content from Database
- **ALL** text, labels, titles, descriptions, error messages, and UI content must be dynamic and fetched from the database/API.
- **NO hardcoded text strings** in components unless they are technical/developer-only constants.
- All user-facing content must be configurable via API.
- Use props to pass all dynamic content from parent components.
- **Example**: Instead of `<h1>Welcome</h1>`, use `<h1>{title}</h1>` where `title` is passed as a prop or fetched from an API.

### 2. UI Components - shadcn/ui Only
- **ALL** UI components must be from the **shadcn/ui** library.
- Do not create custom UI components when shadcn/ui equivalents exist.
- Available components include: Button, Input, Label, Card, Dialog, Dropdown, Tabs, Table, etc.
- Custom components should only be created for business logic, not for UI primitives.
- Use existing components in `apps/web/components/ui/`.

### 3. Responsive Design - All Devices
- All pages and components must be fully responsive.
- Must work seamlessly on: Mobile, Tablet, Desktop, and Large screens.
- Use Tailwind CSS responsive classes: `sm:`, `md:`, `lg:`, `xl:`.
- Test layouts on multiple screen sizes and follow a mobile-first approach.
- Ensure touch targets are at least 44x44 pixels on mobile.

### 4. Color Palette Compliance
- Use only the defined color palette from `globals.css` and the **[UI Design System](../docs/UI_DESIGN_SYSTEM.md)**.
- **NO hardcoded color values** (e.g., #000000, rgb(255,0,0)).
- Available tokens include:
  - `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive` 
  - `bg-background`, `bg-card`, `bg-sidebar`, `surface-low`, `surface-lowest` 
  - `border-border`, `border-destructive` 
  - `ring-ring`, `ring-primary` 
- Use semantic color names that map to the design system.

### 5. Form Validation Standards
- All mandatory fields must be marked with an asterisk (*).
- Validation errors must appear in red using `text-destructive`.
- Invalid fields must have a red border using `border-destructive`.
- Clear, real-time or submit-time validation feedback for individual fields.

### 6. Authentication & Authorization
- **Phone + OTP** is the primary authentication flow.
- No password-based authentication.
- Role-based Access Control (RBAC): User, Staff, Manager, Admin.
- Protected routes must strictly check user roles and permissions.

## Technical Standards

### File Structure
- Follow Next.js App Router structure in `apps/web/`.
- Components: `apps/web/components/` 
- Pages: `apps/web/app/` 
- Shared utilities: `apps/web/lib/` 
- API calls: `apps/web/lib/api/` 

### Component Architecture
- Use **TypeScript** for all components with strict mode.
- Define clear prop interfaces.
- Separate business logic from UI.
- Use Server Components where possible; use Client Components for interactivity.

### API Integration
- All API calls through centralized functions in `lib/api/`.
- Handle loading and error states for all async operations.
- Ensure type-safe API responses.

## Review Checklist
Before submitting any code, verify:
- [ ] All text/content is dynamic from API.
- [ ] Only shadcn/ui components are used.
- [ ] UI is responsive on all device sizes.
- [ ] Only defined color tokens are used.
- [ ] Proper form validation is implemented.
- [ ] TypeScript strict mode is compliant (no `any`).
- [ ] All errors are handled gracefully.
