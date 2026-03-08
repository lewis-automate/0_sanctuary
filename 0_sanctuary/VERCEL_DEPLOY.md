# Deploying to Vercel

1. **Connect the repo**  
   In [Vercel](https://vercel.com), import this project (e.g. from GitHub). Use the `0_sanctuary` directory as the **Root Directory** if the repo root is the parent.

2. **Environment variables**  
   In the project’s Vercel **Settings → Environment Variables**, add:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL` (optional; for story generation)

   Use the same values as in `.env.example` (see that file for names). Add them for Production (and Preview if you use preview deployments).

3. **Deploy**  
   Push to your connected branch or trigger a deploy from the Vercel dashboard. The build runs `npm run build` and uses the Next.js preset.

**CLI (optional):**  
From this directory, run `npx vercel` and follow the prompts, then add the env vars in the dashboard.
