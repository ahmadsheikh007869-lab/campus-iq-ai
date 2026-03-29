
# Integral University Chatbot System

## Overview
A professional, responsive university information website with an AI-powered chatbot, admin dashboard, and database-driven content management — built with React + Tailwind CSS and Lovable Cloud backend.

## Pages & Features

### 1. Homepage
- Clean hero section with university name, tagline, and campus imagery
- Quick navigation cards: Library, Admissions, Fees, About, Chatbot
- Key stats section (students, courses, years established)
- Smooth scroll animations

### 2. University Details Page
- History section (Integral University, established 2004, Lucknow, UP)
- Campus details with image gallery
- Facilities grid: hostels, labs, sports, library, cafeteria, medical center

### 3. Library Page
- Library info, timing, rules
- Available resources: books, journals, e-resources
- Digital access links section

### 4. Admissions Page
- Step-by-step admission process with visual timeline
- Eligibility criteria by program
- Important dates section
- "Apply Now" CTA button

### 5. Fees Page
- Dynamic table of courses fetched from database
- Columns: Course Name, Duration, Annual Fee, Total Fee
- Search bar + filter by department/duration
- Responsive card layout on mobile

### 6. About & Settings (3-dot menu in navbar)
- About the app & developer info
- Dark mode toggle
- Notification toggle

### 7. Admin Dashboard (protected route)
- Login page with JWT authentication
- Dashboard to add/update/delete courses & fees
- Upload campus images
- Manage FAQ data for chatbot

### 8. AI Chatbot (floating widget)
- Floating chat button (bottom-right corner)
- WhatsApp-style chat UI with message bubbles
- Powered by Lovable AI (Gemini) via edge function
- Answers questions about courses, fees, admissions, campus info
- Voice input support via Web Speech API
- Local FAQ fallback for common questions
- Markdown rendering for responses

## Database Tables (Lovable Cloud)
- **courses**: id, name, department, duration, annual_fee, total_fee, description
- **university_info**: id, section, title, content, image_url
- **faqs**: id, question, answer, category
- **admin_users**: managed via Supabase Auth
- **user_roles**: id, user_id, role (admin)

## Backend (Edge Functions)
- `chat` — AI chatbot endpoint using Lovable AI gateway with university context
- `courses` — CRUD API for courses/fees data

## Design
- Clean minimal design with consistent spacing
- University brand colors (green/white theme)
- Responsive: mobile-first approach
- Loading skeletons for data fetching
- Smooth page transitions
