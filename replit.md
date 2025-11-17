# AI Chat Interface

## Overview

This is a minimalist AI chat application featuring a dark-themed interface inspired by modern chat platforms like ChatGPT and Claude. The application provides a clean, conversation-centric user experience with an empty state that transitions to a message thread as users interact with the AI.

The stack consists of:
- **Frontend**: React with TypeScript, Vite for build tooling
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Backend**: Express.js server
- **Data Layer**: Drizzle ORM with PostgreSQL support (currently using in-memory storage)
- **State Management**: TanStack Query for server state

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure**
- The application follows a component-based architecture using React functional components with TypeScript
- Custom chat components (`ChatInput`, `ChatMessage`, `ChatThread`, `EmptyState`) handle the core chat functionality
- Components are organized in a feature-based structure under `client/src/components/`
- shadcn/ui provides a comprehensive set of pre-built UI primitives (40+ components) that can be composed together

**Routing**
- Uses Wouter for client-side routing (lightweight alternative to React Router)
- Single main route (`/`) displays the chat interface
- 404 handling with a dedicated NotFound page

**State Management**
- TanStack Query manages server state and API calls
- React hooks (`useState`) handle local component state
- Message state is managed at the Chat page level and passed down to child components

**Styling System**
- Tailwind CSS with custom configuration and design tokens
- HSL-based color system with CSS custom properties for theming
- Dark theme foundation with high-contrast text for readability
- Custom spacing units (2, 3, 4, 6, 8, 12, 16) for consistent rhythm
- Inter font family from Google Fonts for typography
- Design guidelines documented in `design_guidelines.md` emphasizing minimalism and progressive disclosure

### Backend Architecture

**Server Framework**
- Express.js web server handling HTTP requests
- Custom middleware for request logging with duration tracking
- JSON body parsing with raw body preservation for webhook support
- Vite integration for development with HMR support

**API Structure**
- RESTful API endpoints under `/api` prefix
- `POST /api/chat` - Accepts user messages and returns mock AI responses
- `GET /api/messages` - Retrieves message history
- Currently returns mock AI responses; designed to integrate with real AI services in production

**Data Storage Pattern**
- Abstract `IStorage` interface defines data access methods
- `MemStorage` class provides in-memory implementation for development
- Storage layer supports users and messages
- Designed for easy migration to database-backed storage using Drizzle ORM

**Request/Response Handling**
- Request validation using Zod schemas via `insertMessageSchema`
- Structured error responses (400 for validation errors)
- JSON response format with captured response logging
- Automatic response truncation in logs (80 char limit)

### Database Schema (Drizzle ORM)

**Schema Definition**
- PostgreSQL-oriented schema using Drizzle ORM
- Two main tables: `messages` and `users`

**Messages Table**
- `id`: UUID primary key (auto-generated)
- `role`: Text field for message role (user/assistant)
- `content`: Text field for message content
- `timestamp`: Timestamp with auto-default to current time

**Users Table**
- `id`: UUID primary key (auto-generated)
- `username`: Unique text field
- `password`: Text field for authentication

**Type Safety**
- Zod schemas generated from Drizzle tables via `createInsertSchema`
- TypeScript types inferred from schema using `$inferSelect`
- Separation of insert types (`InsertMessage`, `InsertUser`) and select types (`Message`, `User`)

**Configuration**
- Drizzle config points to PostgreSQL database via `DATABASE_URL` environment variable
- Migrations directory: `./migrations`
- Schema location: `./shared/schema.ts`

### External Dependencies

**UI Component Library**
- shadcn/ui with "new-york" style preset
- Radix UI primitives for accessible components (accordion, dialog, dropdown, select, etc.)
- Components configured for TypeScript with path aliases

**Database & ORM**
- Drizzle ORM for type-safe database queries
- Neon Database serverless driver (`@neondatabase/serverless`)
- PostgreSQL dialect
- Database connection requires `DATABASE_URL` environment variable

**Form Handling**
- React Hook Form for form state management
- Hookform resolvers for schema validation integration
- Zod for runtime type validation

**Development Tools**
- Vite for fast development server and build process
- TypeScript for type safety across frontend and backend
- ESBuild for production server bundling
- PostCSS with Tailwind CSS and Autoprefixer

**Styling & Utilities**
- Tailwind CSS for utility-first styling
- class-variance-authority (CVA) for variant-based component styling
- clsx and tailwind-merge for conditional class names
- date-fns for date manipulation

**Additional Libraries**
- cmdk for command palette functionality
- embla-carousel for carousel components
- Lucide React for icon system
- vaul for drawer components
- input-otp for OTP input functionality

**Replit Integration**
- Custom Vite plugins for Replit development environment
- Runtime error overlay for better debugging
- Development banner and cartographer for Replit-specific features