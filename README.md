# CampusIQ AI — Intelligent University Navigation & Query Routing Engine

<div align="center">

[![React](https://img.shields.io/badge/React-18.3_/_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vector RAG](https://img.shields.io/badge/Architecture-Vector_RAG_Pipeline-F59E0B?style=for-the-badge&logo=databricks&logoColor=white)](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Enterprise-grade campus intelligence and student navigation platform featuring multi-department knowledge retrieval, real-time query routing, and automated academic workflows.</strong>
</p>

</div>

---

## Table of Contents

- [Executive Overview](#executive-overview)
- [System Architecture](#system-architecture)
- [Core Features Breakdown](#core-features-breakdown)
  - [1. Multi-Department Knowledge Routing](#1-multi-department-knowledge-routing)
  - [2. Verified Assistant Context Engine](#2-verified-assistant-context-engine)
  - [3. Real-Time Reactive Interface](#3-real-time-reactive-interface)
  - [4. Secure Client-Side Architecture](#4-secure-client-side-architecture)
- [Multi-Modal Query & Interface Modes](#multi-modal-query--interface-modes)
- [Domain Data Coverage & Knowledge Base](#domain-data-coverage--knowledge-base)
- [Administrative Workflows & Role-Based Security](#administrative-workflows--role-based-security)
- [Directory Structure](#directory-structure)
- [Local Setup & Development Guide](#local-setup--development-guide)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Development Server](#development-server)
  - [Automated Testing](#automated-testing)
  - [Production Verification & Build](#production-verification--build)
- [DevSecOps & Secrets Sanitization](#devsecops--secrets-sanitization)
- [License & Attribution](#license--attribution)

---

## Executive Overview

**CampusIQ AI** is an intelligent university navigation and academic query routing platform engineered to streamline institutional information access for students, faculty, and prospective applicants. Built upon a decoupled single-page application (SPA) architecture with TypeScript, Tailwind CSS, and a serverless Supabase backend, CampusIQ AI provides instant, hallucination-resistant answers grounded in verified university documentation.

Rather than relying on generic web search or unconstrained generative AI, CampusIQ AI processes student inquiries through an institutional context retrieval pipeline. Incoming queries are semantically classified across departmental categories—including admissions eligibility, curriculum structures, fee schedules, library inventories, hostel policies, and administrative guidelines—ensuring accurate responses with official source attribution.

---

## System Architecture

```
                       [ Student Query / User Prompt ]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    Context Dispatcher     │
                        │ (Intent & Mode Detection) │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       Knowledge Base / RAG Retrieval            │
             ├──────────────────┬──────────────────────────────┤
             │ • Academic Depts │ • Fee Schedules & Policies   │
             │ • Admissions Hub │ • Library & Research Catalog │
             │ • Campus Portals │ • FAQ Vector Store           │
             └──────────────────┴──────────────┬───────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │       LLM Response Engine      │
                              │  (Grounded Verification Gate)  │
                              └────────────────┬───────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │      Streamed UI Output        │
                              │ (Word-by-Word React Streaming) │
                              └────────────────────────────────┘
```

---

## Core Features Breakdown

### 1. Multi-Department Knowledge Routing
- **Automated Query Triaging**: Dynamically categorizes inquiries across institutional verticals: Academic Regulations, Admissions Eligibility, Fee Structures, Hostel Facilities, Library Holdings, and Examination Schedules.
- **Dynamic Quick Action Chips**: Context-sensitive chips accelerate discoverability for high-frequency queries (e.g., *"B.Tech CSE Fee Structure"*, *"Hostel Allocation Criteria"*, *"Library Digital Repository Access"*).
- **Relational Data Mapping**: Courses, departments, fee components, and frequently asked questions are indexed with relational referential integrity.

### 2. Verified Assistant Context Engine
- **Hallucination-Resistant Grounding**: AI responses are grounded strictly against official institutional catalogs and structured database records, eliminating synthetic confabulation.
- **Official Source Footnotes**: Every factual response provides verifiable citations (`Source: Official University Portal / Academic Catalog`).
- **Creator & Institutional Identity Verification**: Built-in identity routing preserves authentic institutional attribution and developer credits.

### 3. Real-Time Reactive Interface
- **Word-by-Word Conversational Streaming**: Live Server-Sent Events (SSE) streaming delivery replicates natural conversational cadence.
- **Adaptive Ergonomic UI**: Built with accessible Radix UI primitives, featuring smooth drawer sheets, modal dialogs, and customizable typography.
- **High-Contrast Dark & Light Modes**: System-wide theme switcher with persistence in `localStorage`, adhering to WCAG 2.1 AA accessibility contrast standards.

### 4. Secure Client-Side Architecture
- **Zero Client-Exposed Private Keys**: Private model API keys, service role tokens, and database administration credentials remain securely isolated within serverless edge functions.
- **Anonymous Session Initialization**: Automatic guest authentication enables immediate conversational onboarding while preserving rate limits.
- **Role-Based Admin Protection**: Administrative routes (`/admin`, `/admin/dashboard`) are guarded by cryptographic JWT authentication and verified against server-side `user_roles` database tables.

---

## Multi-Modal Query & Interface Modes

CampusIQ AI adapts response length and technical depth based on explicit user mode modifiers:

| Mode Tag | Output Format | Primary Use Case |
| :--- | :--- | :--- |
| `[ULTRA FAST MODE]` | 1–3 concise lines | Rapid lookup of dates, fee totals, or room numbers |
| `[FAST MODE]` | ≤6 lines with action chips | General everyday student inquiries |
| `[MEDIUM MODE]` | Structured paragraphs | Balanced advisory on academic policies and procedures |
| `[THINKING MODE]` | Step-by-step reasoning | Admission eligibility calculations and course prerequisites |
| `[RESEARCH MODE]` | Academic citations & sections | Departmental accreditation, faculty profiles, and syllabus analysis |
| `[PRO MODE]` | Rigorous multi-step technical depth | Code examples, curriculum comparison, and engineering guidelines |

---

## Domain Data Coverage & Knowledge Base

```
Campus Knowledge Domains
├── Academic Programs (UG, PG, Doctoral & Diploma)
├── Admissions & Entrance Examinations
├── Annual Fee Structures & Installment Guidelines
├── Central Library & Digital Research Access
├── Hostel Accommodation, Dining & Transport
├── Examination Guidelines & Grading Scale
└── Administration & Accreditation Records (NAAC A+, UGC, AICTE, NMC, BCI)
```

---

## Administrative Workflows & Role-Based Security

CampusIQ AI provides institutional administrators with an authenticated dashboard for real-time catalog governance:

- **Course Catalog Management**: Create, edit, and archive university academic programs, fee structures, and department affiliations.
- **FAQ Knowledge Base Updating**: Directly maintain institutional Q&A pairs retrieved by the semantic context engine.
- **Cryptographic Access Control**: Enforced through row-level security (RLS) policies on Supabase PostgreSQL tables:
  ```sql
  CREATE POLICY "Admin role access" ON user_roles
    FOR SELECT TO authenticated
    USING (role = 'admin');
  ```

---

## Directory Structure

```
campus-iq-ai/
├── dist/                        # Production build bundle
├── public/                      # Static assets, manifests, and icons
├── src/
│   ├── assets/                  # Brand assets & institutional crests
│   ├── components/              # Reusable UI component library
│   │   ├── ui/                  # Radix UI accessible primitive wrappers
│   │   ├── Chatbot.tsx          # Floating conversational overlay widget
│   │   ├── Footer.tsx           # Global responsive footer
│   │   ├── Navbar.tsx           # Navigation bar with dark mode switcher
│   │   └── ProtectedAdminRoute.tsx # Authenticated route guard
│   ├── data/                    # Seed datasets & static FAQ catalogs
│   ├── hooks/                   # Custom React lifecycle hooks
│   ├── integrations/            # Supabase database client & typed contracts
│   │   └── supabase/
│   │       ├── client.ts        # Hardened client with fallback handling
│   │       └── types.ts         # Autogenerated TypeScript schema definitions
│   ├── lib/                     # Utility helpers (cn, tailwind merge)
│   ├── pages/                   # Application route views
│   │   ├── About.tsx            # Institutional accreditation & platform overview
│   │   ├── AdminDashboard.tsx   # Course & FAQ catalog management portal
│   │   ├── AdminLogin.tsx       # Secure administrator sign-in
│   │   ├── Admissions.tsx       # Intake schedules & eligibility criteria
│   │   ├── Chat.tsx             # Full-screen conversational AI workspace
│   │   ├── Fees.tsx             # Departmental fee matrices
│   │   ├── Index.tsx            # Main university portal landing page
│   │   ├── Library.tsx          # Central library catalog & digital resources
│   │   ├── NotFound.tsx         # 404 recovery view
│   │   └── University.tsx       # Campus history, leadership & vision
│   ├── test/                    # Vitest unit & integration test suite
│   ├── App.tsx                  # Root application route tree
│   ├── index.css                # Tailwind base styles & theme tokens
│   └── main.tsx                 # Client application entry point
├── supabase/
│   ├── config.toml              # Supabase CLI project configuration
│   ├── functions/               # Serverless Edge Functions
│   │   └── chat/                # Context-aware streaming conversational endpoint
│   └── migrations/              # Relational SQL schema migrations & RLS policies
├── .env.example                 # Sanitized environment configuration template
├── .gitignore                   # DevSecOps version control exclusion rules
├── index.html                   # White-labeled HTML application shell
├── package.json                 # Node dependencies & project scripts
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## Local Setup & Development Guide

### Prerequisites
- **Node.js**: `v20.0.0` or newer (tested on Node.js 22 & 26)
- **npm**: `v10.0.0` or newer

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/ahmadsheikh007869-lab/campus-iq-ai.git
cd campus-iq-ai

# 2. Install dependencies
npm install
```

### Environment Configuration
Copy the sanitized environment template to create a local `.env` file:
```bash
cp .env.example .env
```

Populate the required credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Development Server
Start the local development server with instant Hot Module Replacement (HMR):
```bash
npm run dev
```
Open **http://localhost:8080** to navigate the campus intelligence platform.

### Automated Testing
Execute the unit testing suite with Vitest:
```bash
npm test
```

### Production Verification & Build
```bash
# Verify TypeScript integrity (zero errors)
npm run check

# Compile production bundle (outputs optimized assets to dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## DevSecOps & Secrets Sanitization

- **Zero Hardcoded Secrets**: All backend endpoints and keys are dynamically routed through client-safe environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Purged Version Control Artifacts**: `.env` and external builder configurations (`.lovable/`) have been permanently untracked and removed from version control.
- **Strict Git Exclusion Rules**: `.gitignore` strictly prevents local credential files (`.env`, `.env.local`, `*.key`), build artifacts (`dist/`), and dependencies (`node_modules/`) from being staged.
- **Sanitized Presentation**: Third-party branding watermarks and builder embed scripts have been completely eliminated from the DOM.

---

## License & Attribution

Distributed under the open-source **[MIT License](LICENSE)**.

Developed by **Mohd Ahmad** (`ahmadsheikh007869-lab`). Contributions and institutional extensions are warmly welcomed.
