# Service Marketplace MVP

## Overview

This is a service marketplace application built as a full-stack web application where users can search for local service providers, view their profiles, and book services. The platform connects clients with service providers based on location proximity and service type, featuring a clean interface for browsing providers and making bookings.

**Phase 1 MVP Status**: ✅ Complete
- Fully functional location-based search
- Provider profiles with ratings and reviews
- Booking system with database persistence
- Modern responsive UI with PostgreSQL backend

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and design tokens
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas for request/response validation
- **Development**: Hot module replacement with Vite integration

### Data Storage Solutions
- **Database**: PostgreSQL (configured for Neon serverless)
- **Connection**: Connection pooling with @neondatabase/serverless
- **Schema**: Relational schema with users, providers, services, bookings, and reviews tables
- **Migrations**: Drizzle Kit for database schema management

### Key Features
- **Service Search**: Location-based provider search with distance calculation
- **Provider Profiles**: Detailed provider information with ratings and services offered
- **Booking System**: Service booking with scheduling and contact information
- **Review System**: Client reviews and ratings for providers
- **Geographic Search**: Latitude/longitude based proximity search

### Authentication and Authorization
- **User Roles**: Multi-role system (client, provider, admin)
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Password Security**: Hashed password storage (implementation pending)

### Project Structure
- **Monorepo Layout**: Shared schema and types between client and server
- **Client**: React frontend in `/client` directory
- **Server**: Express backend in `/server` directory  
- **Shared**: Common TypeScript definitions in `/shared` directory
- **Component Organization**: UI components in `/client/src/components/ui`

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **WebSocket Support**: Real-time database connections via WebSocket constructor

### Development Tools
- **Replit Integration**: Development environment with runtime error overlay
- **Cartographer**: Code mapping and visualization (development only)
- **ESBuild**: Production bundling for server code

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for managing component style variants
- **Tailwind Merge**: Utility for merging Tailwind classes

### Utility Libraries
- **Date-fns**: Date manipulation and formatting
- **clsx**: Conditional CSS class construction
- **Zod**: Runtime type validation and schema definition
- **UUID/Nanoid**: Unique identifier generation

### Development Dependencies
- **TypeScript**: Static type checking and development experience
- **Vite**: Build tool and development server
- **PostCSS**: CSS processing with Tailwind integration