# Stride

A personal training app: GPS runs and rides, strength workouts that follow a training program, and a food log with a calorie target. Installable on iPhone from Safari (Share → Add to Home Screen) and usable offline.

- **Hosting:** GitHub Pages serves the app code in this repo.
- **Sync and login:** Supabase. Each record syncs on its own, and the most recent edit wins. Row-level security keeps every row private to its owner (`supabase-setup.sql`).
- **Program and recipe content:** private Supabase storage, downloaded after sign-in. It is not in this repo.

Run locally with `node serve.js` and open http://localhost:5173.
