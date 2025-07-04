# WhatsApp SaaS Automation Platform

## Overview

This is a full-stack WhatsApp SaaS automation platform built with React, Express.js, and PostgreSQL. The application provides businesses with tools to automate WhatsApp communications, manage contacts, create broadcast campaigns, and design conversation flows. The platform features real-time WebSocket communication, a modern dark-themed UI using shadcn/ui components, and a RESTful API architecture.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme variables
- **Build Tool**: Vite for fast development and optimized builds
- **Real-time Communication**: WebSocket client manager for live updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Real-time**: WebSocket server for live communication
- **API Design**: RESTful API with consistent error handling
- **Session Management**: PostgreSQL session store with connect-pg-simple

### Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express.js application
├── shared/          # Shared TypeScript schemas and types
├── migrations/      # Database migration files
└── dist/           # Build output directory
```

## Key Components

### Database Schema (shared/schema.ts)
- **contacts**: Contact management with phone numbers, names, tags, and activity status
- **automations**: Keyword-based automatic response system
- **broadcasts**: Mass messaging campaigns with scheduling and targeting
- **conversationFlows**: Multi-step conversation automation
- **whatsappStatus**: WhatsApp connection status tracking
- **settings**: Application configuration storage

### API Endpoints
- **Contacts**: CRUD operations with tag-based filtering
- **Automations**: Keyword-based response management
- **Broadcasts**: Mass messaging with scheduling capabilities
- **Flows**: Conversation flow automation
- **WhatsApp**: Connection status management
- **Settings**: Application configuration

### Real-time Features
- WebSocket connection for live updates
- Automatic reconnection with exponential backoff
- Connection status monitoring
- Event-based communication system

### UI Components
- **Layout**: Responsive sidebar navigation with header
- **Dashboard**: Statistics overview with real-time data
- **Contact Management**: Table-based contact listing with search and filtering
- **Automation Builder**: Form-based automation creation
- **Broadcast Manager**: Campaign creation and monitoring
- **Flow Designer**: Conversation flow configuration
- **Reports**: Analytics and performance metrics
- **Settings**: Application configuration interface

## Data Flow

1. **User Interaction**: User interacts with React frontend components
2. **API Communication**: Frontend makes HTTP requests to Express.js backend
3. **Database Operations**: Backend uses Drizzle ORM to interact with PostgreSQL
4. **Real-time Updates**: WebSocket server broadcasts changes to connected clients
5. **State Management**: TanStack Query manages server state and caching
6. **UI Updates**: React components re-render based on state changes

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **wouter**: Lightweight routing library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Backend Dependencies
- **drizzle-orm**: Type-safe SQL query builder
- **@neondatabase/serverless**: PostgreSQL database driver
- **express**: Web application framework
- **ws**: WebSocket library
- **connect-pg-simple**: PostgreSQL session store
- **zod**: Schema validation

### Development Dependencies
- **vite**: Frontend build tool
- **tsx**: TypeScript execution for development
- **esbuild**: Backend bundling
- **drizzle-kit**: Database migration tool

## Deployment Strategy

### Development
- Frontend: Vite dev server with HMR
- Backend: tsx with file watching
- Database: Neon Database with connection pooling

### Production Build
- Frontend: Vite build to `dist/public`
- Backend: esbuild bundle to `dist/index.js`
- Database: Drizzle migrations applied via `db:push`

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment flag (development/production)
- WebSocket connection adapts to protocol (ws/wss)

## Changelog

Changelog:
- July 03, 2025. Initial setup
- July 03, 2025. Real WhatsApp integration implemented with Baileys
- July 03, 2025. Production mode with real message sending capabilities
- July 03, 2025. Real-time synchronization with actual WhatsApp conversations

## User Preferences

Preferred communication style: Simple, everyday language.