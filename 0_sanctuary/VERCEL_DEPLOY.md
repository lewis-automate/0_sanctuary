# Deploying to Vercel

1. **Connect the repo**  
   In [Vercel](https://vercel.com), import this project (e.g. from GitHub). Set **Root Directory** to the **Git repository root** (where the top-level `package.json` and `vercel.json` live). The repo is an npm workspace: installs and `npm run build` run from there and build the Next.js app in `0_sanctuary`.

2. **Environment variables**  
   In the project’s Vercel **Settings → Environment Variables**, add:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL` (optional; for story generation)

   Use the same values as in `.env.example` (see that file for names). Add them for Production (and Preview if you use preview deployments).

3. **Deploy**  
   Push to your connected branch or trigger a deploy from the Vercel dashboard. The build runs `npm run build` and uses the Next.js preset.

**CLI (optional):**  
From the repository root, run `npx vercel` and follow the prompts, then add the env vars in the dashboard.
