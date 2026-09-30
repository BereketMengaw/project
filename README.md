# Scholarship Desk

React (Vite) tracker for MSc 2027 scholarships and self-funded programs. Deployed on Vercel: https://scholarship-desk.vercel.app

Without Supabase keys it runs as a read-only preview built from `src/seed.json`. The preview leaves out private notes.

## Connect Supabase (free tier), about 5 minutes
1. Create a project at supabase.com.
2. In SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql` (147 programs + checklist).
3. Under Authentication → URL Configuration, set Site URL to `https://scholarship-desk.vercel.app`.
4. Add the keys to Vercel (Project Settings → API gives you the URL and the anon key):
   ```
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   vercel --prod
   ```
5. Open the site, sign in with your email (link or 6-digit code).
6. Then turn off new sign-ups (Authentication → Sign In / Providers) so only you can log in.

## Local dev
`cp .env.example .env.local`, fill the keys, `npm install && npm run dev`.
