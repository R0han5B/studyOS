# studyOS

studyOS is an AI-powered learning and career operating system built with Next.js, TypeScript, Prisma, MongoDB, and Bun. It helps learners manage tasks, generate adaptive study plans, track focus sessions, understand productivity trends, and turn skill progress into career direction.

## Overview

The application is built as a dashboard experience on top of the Next.js App Router. After authentication, users move through dedicated sections for dashboard metrics, task management, study planning, productivity tracking, AI insights, analytics, career development, and settings. Data is stored in MongoDB through Prisma, while client-side UI state is managed with Zustand.

## Core Features

- User authentication with email and password
- Optional Google OAuth sign-in through NextAuth
- Task management with status, priority, due date, subject, tags, and time estimates
- Study schedule creation and AI-assisted schedule generation
- Focus and Pomodoro session tracking
- Productivity logs with study hours, completion progress, and focus scoring
- Analytics endpoints for overall, weekly, and monthly reporting
- AI study coach endpoints for recommendations and insights
- Career workspace with target roles, skill levels, skill-gap priorities, learning paths, and resume profile prompts
- Student-controlled skill levels: AI recommends target levels and gaps without silently changing current progress
- Roadmap preview flow with a student-selected timeframe before anything is added to Tasks or Calendar
- ATS resume builder that collects student details and generates a structured resume
- Context-aware AI foundations that use tasks, sessions, completion progress, and tracked skills
- Theme and accent customization persisted in client state

## Tech Stack

- Bun for package management and script execution
- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- MongoDB
- NextAuth
- Zustand
- Recharts
- Framer Motion
- Radix UI and shadcn-style UI components

## How the App Works

### Frontend

The main application entry point is `src/app/page.tsx`. After session resolution, the app renders either the login experience or the authenticated dashboard shell. Navigation is handled in-app through Zustand state rather than route-per-page navigation, which gives the interface a desktop-style dashboard flow.

Primary user sections:

- `Dashboard`: summary cards, quick actions, and recent activity
- `Tasks`: task creation, filtering, updates, and completion tracking
- `Planner`: manual and AI-assisted study planning
- `Productivity`: study sessions, Pomodoro workflow, and focus data
- `Insights`: AI-generated recommendations and coaching responses
- `Analytics`: overall, weekly, and monthly performance reporting
- `Career OS`: target role, current skills, skill gaps, recommended learning paths, and career goals
- `Settings`: user preferences, theme, and related controls

### State Management

Global UI and session-related client state is stored in `src/store/useStore.ts`.

Persisted state includes:

- authenticated user snapshot
- authentication flag
- sidebar state
- theme and accent color
- Pomodoro timer state and settings

### Backend

The backend is implemented with Next.js API routes under `src/app/api`.

Main API groups:

- `api/auth`: register, login, logout, refresh, current user, and NextAuth integration
- `api/tasks`: CRUD operations for study tasks
- `api/schedule`: schedule storage and schedule generation
- `api/productivity`: productivity summaries, sessions, and Pomodoro tracking
- `api/analytics`: overall, weekly, and monthly analytics
- `api/ai`: AI recommendations and personalized insights
- `api/career`: career profile persistence and roadmap preview/commit flow
- `api/career/analyze`: role-specific skill recommendations and gap analysis
- `api/skills`: current skill CRUD and progress tracking
- `api/resume`: ATS resume profile storage and generation

## Product Direction

studyOS brings three connected loops into one workspace:

- **Study**: subjects, exams, tasks, and adaptive planning
- **Productivity**: focus sessions, Pomodoro, completion trends, and streaks
- **Career**: target roles, skills, gaps, projects, and learning roadmaps

The AI layer is designed to become context-aware rather than generic. It can combine tasks, study sessions, completion rate, weak subjects, deadlines, available study time, focus score, and career goals to produce recommendations that are specific to the learner.

## Authentication

This project uses a hybrid authentication setup:

- Custom JWT cookie authentication for credential-based login
- NextAuth integration for provider-based OAuth flows

Credential auth behavior:

- Access tokens are stored in secure HTTP-only cookies
- Refresh tokens are stored in both cookies and the database
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days

Important environment variables for auth:

- `JWT_SECRET`: signs the custom JWT access and refresh tokens
- `NEXTAUTH_SECRET`: secures NextAuth sessions and auth internals
- `NEXTAUTH_URL`: defines the public base URL used by NextAuth for callbacks and redirects
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: enable Google OAuth

## AI Functionality

AI features are implemented through OpenRouter and are optional.

Current AI capabilities:

- personalized study insights
- study coach question and answer responses
- seven-day study schedule generation
- target-role skill analysis and gap recommendations
- career roadmap generation based on target role, current skills, career goal, and available timeframe
- ATS-friendly resume formatting from student-provided details

Required variables for AI:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

If OpenRouter is unavailable or rejects the API key, the app falls back to contextual study insights and role templates so the core workflows remain usable. A valid OpenRouter key is required for live AI-generated responses.

## Database

Prisma is configured for MongoDB in `prisma/schema.prisma`.

Main models:

- `User`
- `Task`
- `StudySession`
- `ProductivityLog`
- `Skill`
- `Schedule`
- `FocusSession`
- `ResumeProfile`

The schema supports:

- user accounts and roles
- credential and OAuth identity storage
- refresh token persistence
- task planning and progress tracking
- generated schedules
- learning skill progress
- focus and study activity history
- career target role and goal
- ATS resume profile and generated resume text

## Prerequisites

Before running the project, make sure you have:

- Bun 1.0 or later
- a running MongoDB database
- valid environment variables in `.env`

## Installation

Install dependencies with Bun:

```bash
bun install
```

## Environment Variables

This project uses a real `.env` file. Configure the following values before starting the app.

### Required

```env
DATABASE_URL=
JWT_SECRET=
NEXTAUTH_SECRET=
```

### Optional

```env
NEXTAUTH_URL=http://localhost:3000
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Variable Guide

- `DATABASE_URL`: MongoDB connection string used by Prisma
- `JWT_SECRET`: secret used for custom JWT auth token signing
- `NEXTAUTH_SECRET`: secret used by NextAuth
- `NEXTAUTH_URL`: public base URL of the application for auth callbacks
- `OPENROUTER_API_KEY`: API key for OpenRouter requests
- `OPENROUTER_MODEL`: model identifier used for AI requests
- `GOOGLE_CLIENT_ID`: enables Google OAuth login
- `GOOGLE_CLIENT_SECRET`: secret for Google OAuth login

For local development, `NEXTAUTH_URL` should usually be set to:

```env
NEXTAUTH_URL=http://localhost:3000
```

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Generate Prisma Client

```bash
bun run db-generate
```

### 3. Push the Prisma Schema to MongoDB

```bash
bun run db-push
```

### 4. Seed the Demo Workspace

The demo account and its tasks, calendar sessions, productivity history, and skills are defined in `prisma/seed.ts` and shared by the **Try the live demo** button.

```bash
bun run db-seed
```

The demo account is `demo@studyos.app`; the demo button signs it in automatically.

### 5. Start the Development Server

```bash
bun run dev
```

The app runs on:

```text
http://localhost:3000
```

## Available Scripts

- `bun run dev` starts the Next.js development server on port 3000
- `bun run build` creates the production build
- `bun run start` starts the production server
- `bun run lint` runs ESLint across the project
- `bun run db-generate` generates the Prisma client
- `bun run db-push` syncs the Prisma schema to MongoDB
- `bun run db-seed` seeds the repeatable demo account and sample workspace

## Project Structure

```text
prisma/
  schema.prisma         Prisma schema and MongoDB models

src/
  app/
    api/                API routes for auth, tasks, schedule, analytics, AI, career, skills, resume, and productivity
    globals.css         Global styles
    layout.tsx          Root layout
    page.tsx            Main application entry page
  components/
    charts/             Analytics and progress chart components
    dashboard/          Dashboard-specific cards and activity widgets
    layout/             Sidebar and navbar layout components
    pages/              Top-level app section components
    tasks/              Task management UI components
    ui/                 Reusable design system components
  hooks/                Custom React hooks
  lib/                  Auth, API, DB, AI service, demo seed, and utility helpers
  store/                Zustand application store
  types/                Shared TypeScript type definitions
```

## Main User Flows

### Registration and Login

- users can register with email and password
- authenticated sessions can be restored through JWT cookies
- Google OAuth can be enabled by adding provider credentials

### Task Management

- create, edit, delete, and reorder tasks
- track status from pending to completed
- organize tasks by subject, priority, and due date

### Study Planning

- create structured study schedules
- generate AI-assisted study plans based on subjects and priorities
- view saved study sessions in the calendar
- add generated sessions to Tasks and Calendar only when requested

### Career OS

- enter a target role and press **Enter / Analyze target role**
- review role-specific skills and skill gaps
- choose the current level for recommended skills before adding them
- adjust saved skill progress manually at any time
- choose a roadmap timeframe, preview the generated plan, then explicitly add it to Tasks and Calendar
- create an ATS-friendly resume from student-provided profile, education, project, experience, and skill details

### Productivity Tracking

- log study sessions
- run Pomodoro focus sessions
- track focus score, completed sessions, and study time

### Analytics and Insights

- review performance summaries
- check weekly and monthly analytics endpoints
- receive AI-generated guidance based on tracked behavior
