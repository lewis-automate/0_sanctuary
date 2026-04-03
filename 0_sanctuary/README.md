This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This app lives in a monorepo folder (`0_sanctuary`) next to the workspace root `package-lock.json`.

1. In the Vercel project, open **Settings → Build and Deployment → Root Directory** and set it to **`0_sanctuary`** (then save).
2. Framework preset **Next.js**; install/build are defined in `0_sanctuary/vercel.json` (`npm ci` at the repo root, then `next build` in this package).

Without that root directory, the build can finish with `.next` under `0_sanctuary/` while Vercel expects it next to the wrong root, which fails deployment.

More detail: [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
