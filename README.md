# Liftboard (Next.js)

Lift and macro tracker with ranks per lift, a body map, streaks, friends and a shared leaderboard.
This is the prototype ported to Next.js (App Router) so it deploys to Vercel as-is.

## What's in here

- `public/liftboard.js` is the app itself (the prototype script, unchanged apart from the invite link). `lib/markup.ts` is its HTML shell and `app/globals.css` its styles.
- `public/shim.js` gives the app the small database and user API it expects, backed by the routes below. Signed out, the app runs fully local in the browser.
- `app/api/*` are the Route Handlers: `signup`, `login`, `logout`, `me`, `profiles`, and `db` (PRs, social, per-user saved log).
- `components/AuthPanel.tsx` is the create account / sign in form on the Profile tab.
- `lib/store.ts` talks to Upstash Redis over REST. `lib/auth.ts` hashes passwords with scrypt and signs an HttpOnly session cookie. `lib/rules.ts` validates what each user may write.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional locally
npm run dev
```

With no Redis variables, data is held in server memory (lost on restart). Fine for trying it out.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework: Next.js, no build settings to change).
2. Add storage: Project, Storage, Marketplace, **Upstash Redis** (free tier). Vercel fills in `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the older `KV_REST_API_URL` and `KV_REST_API_TOKEN` also work).
3. Add an environment variable `AUTH_SECRET` with a long random string (`openssl rand -base64 32`).
4. Deploy. Create an account on the Profile tab.

## Phone app

The site has a web manifest, so "Add to Home Screen" installs it as an app on iOS and Android. A store-listed native app would be a separate wrapper (Capacitor or similar) around this same site.

## Known limits

- The leaderboard refreshes by polling every few seconds, not live push.
- The video-proof rule for elite lifts is enforced in the browser only; the server checks ranges and shapes but not the rank tables.
- No password reset or email. Usernames are the only identity. Add rate limiting (for example Upstash Ratelimit) before opening to the public.
- The UI is still the prototype's plain script, not React components. It works, but changing it means editing `public/liftboard.js`.
