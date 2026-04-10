# Truth Seeker

Platform for honest truth-seeking engagements.

Post an argument. Question it, support it, or counter it. One point per post.

## How it was built

This project was created from scratch less than a day using [Claude Code](https://claude.ai/claude-code). All ideas, product decisions, and direction are mine — Claude wrote every single line of code.

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Radix Themes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Auth**: Auth.js v5 (Google OAuth + email/password)
- **Object Storage**: Cloudflare R2 (S3-compatible)
- **Hosting**: Vercel

## Features

- Post arguments tagged by topic (tech, politics, religion, etc.)
- Question, support, or counter any argument — responses are themselves arguments that can be engaged with
- Upvote/downvote everything
- Image and GIF attachments
- Collapsible threaded discussions with sort options
- "Hot" replies auto-expand on popular posts
- Topic sidebar for filtering
- Email signup with 7-day verification, or Google OAuth
- User settings (name + profile pic) for email users

## Local development

```bash
# Prerequisites: Node.js, pnpm, Docker

# Start Postgres + MinIO
pnpm db:up

# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Seed sample data (optional)
pnpm exec tsx prisma/seed.ts

# Start dev server
pnpm dev
```

Copy `.env.example` to `.env` and fill in the values.

## Deployment

Deployed on Vercel + Neon + Cloudflare R2. See `.env.example` for required environment variables.
