# NeuroSwarm Knowledge Base

A comprehensive knowledge base for the NeuroSwarm decentralized AI platform, built with Next.js 14 and TypeScript.

## Features

- **Modular KB Pages**: Structured content covering getting started, governance, community, technical docs, and transparency
- **Search Functionality**: Quick navigation through the knowledge base
- **Responsive Design**: Mobile-first design with dark mode support
- **Static Generation**: Fast loading with Next.js static generation

## KB Structure

- `/kb` - Knowledge Base Homepage with navigation grid
- `/kb/getting-started` - Platform overview and core principles
- `/kb/onboarding` - Step-by-step contributor onboarding guide
- `/kb/governance` - Governance system and voting mechanics
- `/kb/community` - Community resources and events
- `/kb/technical` - Technical documentation and developer guides
- `/kb/transparency` - Decision records and audit trails

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000/kb](http://localhost:3000/kb) with your browser to see the knowledge base.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Static generation for optimal performance

## Project Structure

```
app/
├── kb/
│   ├── page.tsx                    # KB Homepage
│   ├── getting-started/
│   │   └── page.tsx               # Getting Started page
│   ├── onboarding/
│   │   └── page.tsx               # Contributor Onboarding
│   ├── governance/
│   │   └── page.tsx               # Governance System
│   ├── community/
│   │   └── page.tsx               # Community Resources
│   ├── technical/
│   │   └── page.tsx               # Technical Documentation
│   └── transparency/
│       └── page.tsx               # Transparency & Logs
├── layout.tsx                     # Root layout
└── page.tsx                       # Home page
```

## Contributing

This knowledge base is part of the NeuroSwarm ecosystem. For contributions to the platform itself, visit the [main NeuroSwarm repository](https://github.com/neuroswarm/neuroswarm).

## License

This project is part of the NeuroSwarm ecosystem.
