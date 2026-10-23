# Liftboard (Next.js)

Lift and macro tracker with ranks per lift, a body map, streaks, friends and a shared leaderboard.
This is the prototype ported to Next.js (App Router) so it deploys to Vercel as-is.

## What's in here

- `public/liftboard.js` is the app itself (the prototype script, unchanged apart from the invite link). `lib/markup.ts` is its HTML shell and `app/globals.css` its styles.
- `public/shim.js` gives the app the small database and user API it expects, backed by the routes below. Signed out, the app runs fully local in the browser.
- `app/api/*` are the Route Handlers: `signup`, `login`, `logout`, `me`, `profiles`, and `db` (PRs, social, per-user saved log).
- `components/AuthPanel.tsx` is the create account / sign in form on the Profile tab.
- `lib/store.ts` is the storage layer: **Neon Postgres** holds accounts, PRs and social docs (tables are created automatically on first request), and **Vercel Blob** holds each user's private training log as `liftboard/state/<id>.json`. `lib/auth.ts` hashes passwords with scrypt and signs an HttpOnly session cookie. `lib/rules.ts` validates what each user may write.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional locally
npm run dev
```

With no `DATABASE_URL`, data is held in server memory (lost on restart), which is fine for trying it out. With no `BLOB_READ_WRITE_TOKEN`, training logs are stored in Postgres instead of Blob.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework: Next.js, no build settings to change).
2. Add the database: Project, Storage, Marketplace, **Neon** (free tier). It adds `DATABASE_URL` for you. No manual schema step is needed.
3. Add file storage: Project, Storage, **Blob**, create a **private** store and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
4. Add an environment variable `AUTH_SECRET` with a long random string (`openssl rand -base64 32`).
5. Redeploy so the new variables apply, then create an account on the Profile tab.

## Food search and nutrition

The Fuel tab searches foods instead of asking for typed macros. Search goes through server routes (`/api/foods/*`), so keys stay on the server.

- **Sources:** USDA FoodData Central (basic ingredients and branded foods), Open Food Facts (packaged foods and barcodes), restaurant items you import, and your own foods.
- **Normalized model:** `lib/food/model.ts`. Nutrients are stored per 100 g (or ml) with serving sizes on top; `lib/food/units.ts` converts units and scales nutrients. Weight-to-volume conversions without a known density are flagged as estimated.
- **Quality flags:** records with missing macros or calories that disagree with the macros show as "incomplete"; each result links to its source record.
- **Caching:** merged search results are cached 24 h in Postgres (`lb_food_cache`), requests are debounced and paged, and a failing source shows a notice without breaking results.
- **Accounts:** favorites, recents, your own foods and saved meals live in Postgres (`lb_food_*`, `lb_meals`) and need sign-in. Logged foods are written to the same daily log as before, so totals, macro scores and streaks are unchanged. Each logged entry keeps a nutrient snapshot.
- **Env:** set `USDA_API_KEY` (free at api.data.gov). Without it the rate-limited `DEMO_KEY` is used.
- **Restaurants:** import a chain's own published nutrition table: `DATABASE_URL=... npx tsx scripts/import-restaurant.ts --restaurant "Name" --url https://page-it-came-from --published YYYY-MM-DD menu.csv` (columns in `docs/restaurant-template.csv`). Each item keeps its source URL and publish date. No restaurant data is bundled.
- **Tests:** `npm test` (unit conversions, adapters against recorded-shape fixtures, caching, partial failure, user data, restaurant import).

## First-run tutorial

`components/Tutorial.tsx` is a guided spotlight tour over the real UI: sign in, profile (units, sex, bodyweight, height, age), the sample-data chart, body rank, logging a set, submitting a PR, the leaderboard, the Fuel tab (macro bars, food search, macro calculator), adding the site to the home screen, and removing the sample data. It drives the app through `window.lbTour` (defined near the end of `public/liftboard.js`).

- It starts on a first visit, but not for anyone who already has their own logged sets. Finishing or skipping sets `state.tour.done` (synced with the account) and `liftboard.tour` in localStorage. Profile has a "Replay the tutorial" button.
- The current step is kept in localStorage, so the tour resumes after the sign-in reload.
- The home-screen step is hidden when the site is already running as an installed app (standalone display mode). It also only shows on phones and tablets; computers skip it. iPhone and Android get their own instructions.
- The daily-bonus popup waits until the tour is done.

## Phone app

The site has a web manifest, so "Add to Home Screen" installs it as an app on iOS and Android. A store-listed native app would be a separate wrapper (Capacitor or similar) around this same site.

## Known limits

- The leaderboard refreshes by polling every few seconds, not live push.
- The video-proof rule for elite lifts is enforced in the browser only; the server checks ranges and shapes but not the rank tables.
- No password reset or email. Usernames are the only identity. Add rate limiting before opening to the public.
- The UI is still the prototype's plain script, not React components. It works, but changing it means editing `public/liftboard.js`.
