# AI-email-auto-responder
this project generates meaningful info. when asked about the emails it has stored. i used supabase to manage my backend, supabase next.js for front-end, and Gemini AI to generate meaningful sentences.
>>>>>>> d3d4741517842bb6ab4fe18309e3a13f277dcb3a
# AI Email Auto Responder

<p align="center">
 AI-powered email analysis and question answering system built with Next.js, Supabase, and Google Gemini AI
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#setup"><strong>Setup</strong></a> ·
  <a href="#usage"><strong>Usage</strong></a>
</p>
<br/>

## Overview

This project generates meaningful insights from stored emails using AI. When users ask questions about the emails in the system, it provides intelligent responses by analyzing email content, metadata, and context using vector similarity search and Google's Gemini AI.

## Features

- **Email Storage**: Store emails with full metadata (sender, recipient, subject, content)
- **Vector Embeddings**: Generate 768-dimensional vectors using Google Gemini's text-embedding-004 model
- **Intelligent Search**: Vector similarity search to find relevant email sections
- **Smart Q&A**: Ask natural language questions about stored emails and get AI-powered answers
- **Name Recognition**: Intelligent matching between names in questions and email addresses
- **Authentication**: Supabase Auth integration with sign-up, login, and protected routes
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Vector Extensions)
- **AI**: Google Gemini AI (text-embedding-004 + gemini-1.5-flash)
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with pgvector extension for vector similarity search

## Setup

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Google AI API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Node.js**: Version compatible with React 19

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abubakr-2508/AI-email-auto-responder.git
   cd AI-email-auto-responder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   
   Create `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Database Setup**
   
   Run the following SQL in your Supabase SQL Editor:
   ```sql
   -- Enable vector extension
   create extension if not exists vector;
   
   -- Create emails table
   create table emails (
     id bigserial primary key,
     subject text,
     sender text,
     recipient text[],
     body text,
     created_at timestamp with time zone default now()
   );
   
   -- Create email_sections table for vector storage
   create table email_sections (
     id bigserial primary key,
     email_id bigint references emails(id) on delete cascade,
     section_content text,
     embedding vector(768),
     created_at timestamp with time zone default now()
   );
   
   -- Create vector search function
   create or replace function match_filtered_email_sections(
     query_embedding vector(768),
     match_threshold float,
     match_count int
   )
   returns table (
     id bigint,
     email_id bigint,
     section_content text,
     similarity float
   )
   language sql stable
   as $$
     select
       email_sections.id,
       email_sections.email_id,
       email_sections.section_content,
       1 - (email_sections.embedding <=> query_embedding) as similarity
     from email_sections
     where 1 - (email_sections.embedding <=> query_embedding) > match_threshold
     order by email_sections.embedding <=> query_embedding
     limit match_count;
   $$;
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Sign Up / Login
- Visit the application and create an account
- Use Supabase authentication for secure access

### 2. Store Emails
- Navigate to the "Send Email" page
- Fill in email details (sender, recipient, subject, body)
- The system will automatically generate vector embeddings and store the email

### 3. Ask Questions
- Go to the "Ask Question" page
- Ask natural language questions about the stored emails
- Examples:
  - "Where does John want to live?"
  - "What are the location preferences mentioned in the emails?"
  - "Who wants to move to Mumbai?"

### 4. AI-Powered Responses
- The system uses vector similarity search to find relevant email sections
- Gemini AI analyzes the context and provides intelligent answers
- The AI can connect names from email metadata with preferences in email content

## Key Features Explained

### Vector Search
- Emails are split into sections and converted to 768-dimensional vectors
- Questions are embedded using the same model for consistency
- Cosine similarity search finds the most relevant email content

### Smart Name Matching
- The system intelligently matches names in questions with email addresses
- Example: "abubakr" matches with "abubakr.texspira@gmail.com"
- Handles various email address formats and extracts core names

### Context-Aware Responses
- Combines email metadata (sender, recipient, subject) with content
- Provides rich context to the AI for more accurate responses
- Maintains conversation context across multiple questions

## Project Structure

```
app/
├── api/
│   ├── store-email/          # Email storage API
│   └── ask-question/         # Question answering API
├── auth/                     # Authentication pages
├── ask-question/             # Q&A interface
├── send-email/               # Email input form
└── protected/                # Protected routes

components/
├── ui/                       # shadcn/ui components
└── auth-button.tsx           # Authentication components

lib/
└── supabase/                 # Supabase client configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
=======
# AI-email-auto-responder
this project generates meaningful info. when asked about the emails it has stored. i used supabase to manage my backend, supabase next.js for front-end, and Gemini AI to generate meaningful sentences.
>>>>>>> d3d4741517842bb6ab4fe18309e3a13f277dcb3a
