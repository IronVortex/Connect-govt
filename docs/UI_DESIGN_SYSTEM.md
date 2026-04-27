# 🎨 UI Design System - CONNECT

## 🌈 Color Palette
Based on the application mockup:

- **Primary**: `#1D61FF` (Main action buttons, stepper active state, logo)
- **Background**: `#F8FAFC` (Global app background)
- **Sidebar BG**: `#F1F5F9` (Left navigation area)
- **Card Background**: `#FFFFFF` (White cards with subtle shadows)
- **Text Primary**: `#0F172A` (Headings, active text)
- **Text Muted**: `#64748B` (Descriptions, secondary navigation items)
- **Success**: `#10B981` (Verified status, success badges)
- **Warning/Pending**: `#F59E0B` (In-progress items)
- **Destructive**: `#EF4444` (Mismatch, errors)
- **Info/Surface**: `#E0F2FE` (Secondary informational panels)

## 📐 Layout Components

### 1. Global Shell
- **Sidebar (Fixed)**: 280px width, `bg-sidebar`.
- **Topbar (Sticky)**: Height 64px, blurred background.
- **Main Content**: Responsive container with max-width for readability.

### 2. Typography
- **Font Family**: Inter / Sans-serif
- **Headings**: Semi-bold, `text-foreground`.
- **Body**: Regular, `text-muted-foreground`.

## 🧩 UI Components (shadcn/ui Based)

### Cards
- **Document Card**: White background, 1px border (`border-border`), rounded corners (`rounded-lg`).
- **Summary Card**: Right-side panel with grouped info items.

### Status Badges
- **Verified**: `bg-success/10` background, `text-success` text.
- **Mismatch**: `bg-destructive/10` background, `text-destructive` text.
- **Unknown**: `bg-muted` background, `text-muted-foreground`.
- **Required**: Small green badge next to document name.

### Stepper
- Circular icons for each step (1-5).
- Blue line connecting active steps.

### Buttons
- **Primary**: `bg-primary`, `text-white`, rounded-md.
- **Secondary/Outline**: `border-primary`, `text-primary`.
- **Upload**: `bg-primary/5`, `text-primary`, with icon.

## 📱 Responsiveness
- **Mobile**: Sidebar becomes a hamburger menu. Right panel stack below main content. Bottom navigation bar (Home, Departments, Apply, My Applications, Wallet).
- **Tablet**: Sidebar remains visible or collapses to icons.
- **Desktop**: Full 3-column layout (Sidebar, Main, Summary Panel).
