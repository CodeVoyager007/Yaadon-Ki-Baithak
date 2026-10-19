# Supabase setup, step by step

About 20 minutes. At the end, accounts work (email, and Google if you want it), every family
book is saved in the cloud and comes back on any device, voices and paintings are stored
privately, and share links work.

You need: a free account at [supabase.com](https://supabase.com) (sign in with GitHub is easiest).

---

## 1. Create the project

1. Go to the [Supabase dashboard](https://supabase.com/dashboard) → **New project**.
2. **Name:** `baithak`. **Database password:** press *Generate a password* and save it in your
   password manager (you won't need it for the app, but you can't see it again).
3. **Region:** the one closest to your users. For Pakistan, pick **Mumbai (ap-south-1)** or
   **Singapore**.
4. **Create new project** and wait about 2 minutes until the dashboard loads.

> Free projects pause after a week with no activity. If the app suddenly can't sign in,
> open the dashboard and press **Restore project**.

## 2. Create the tables and storage (the SQL)

The database is described by five files in `backend/supabase/migrations/`. They must run
**in order**, once:

| File | What it does |
| --- | --- |
| `0001_init.sql` | Tables (families, elders, sessions, turns, chapters, share links), row level security so each family sees only its own data, and the private `audio` and `images` storage buckets |
| `0002_turn_duration.sql` | How long each answer ran |
| `0003_hardening.sql` | Indexes, locks down the ownership check, forces long random share tokens |
| `0004_restore.sql` | Everything needed to bring a book back on another device |
| `0005_storybook_pages.sql` | The storybook pages |

1. In the dashboard: **SQL Editor** (left sidebar) → **New query**.
2. Open `backend/supabase/migrations/0001_init.sql` in your editor, copy everything, paste it
   into the query box, press **Run**. You should see *Success. No rows returned*.
3. Repeat for `0002`, `0003`, `0004`, `0005`, in that order, each in a fresh query.

Shortcut: all five in one go. From the repo root, run this, then paste the output into one
query and press **Run**:

```bash
cat backend/supabase/migrations/0*.sql          # macOS / Linux / Git Bash
Get-Content backend/supabase/migrations/0*.sql  # Windows PowerShell
```

**Check it worked:**
- **Table Editor** shows six tables: `families`, `elders`, `sessions`, `turns`, `chapters`, `share_links`.
- **Storage** shows two buckets, `audio` and `images`, both marked *Private*.

**If it fails:**
- *relation "families" already exists*: `0001` already ran. Skip it and continue with `0002`.
- *constraint "share_links_token_strong" already exists*: `0003` already ran. Skip it.
- Anything else: copy the red error and send it to me.

## 3. Copy the keys

Dashboard → **Project Settings** (gear icon) → **API Keys**, and **Data API** for the URL.

| What you see in Supabase | Goes in | As |
| --- | --- | --- |
| Project URL (`https://xxxx.supabase.co`) | `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_URL` |
| Project URL | `backend/.env` | `SUPABASE_URL` |
| **Publishable** key (`sb_publishable_...`), or legacy **anon** key | `frontend/.env.local` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| the same publishable / anon key | `backend/.env` | `SUPABASE_ANON_KEY` |
| **Secret** key (`sb_secret_...`), or legacy **service_role** key | `backend/.env` **only** | `SUPABASE_SERVICE_ROLE_KEY` |

Either key style works (new `sb_...` keys, or the legacy JWT keys under the *Legacy API Keys*
tab). Use one style for both.

> **The secret / service_role key bypasses every security rule.** It goes in `backend/.env`
> and your backend host's secrets, nowhere else: never in the frontend, never with a
> `NEXT_PUBLIC_` prefix, never in git (both `.env` files are already git-ignored).

Your files end up like this:

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
# backend/.env  (plus your Gemini and Cloudflare keys)
APP_ENV=development
TRUSTED_PROXY_HOPS=0
ALLOWED_ORIGINS=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxx
```

## 4. Sign-in settings

**Authentication → URL Configuration**
- **Site URL:** `http://localhost:3000` while testing; change it to your Vercel URL when you deploy.
- **Redirect URLs:** add `http://localhost:3000/auth/callback`. When you deploy, also add
  `https://YOUR-SITE.vercel.app/auth/callback`. Nothing else.

**Authentication → Sign In / Providers → Email**
- Keep **Confirm email** ON.
- Minimum password length: **8**.

> The free plan sends only a few confirmation emails per hour, from Supabase's own address,
> so they can land in spam. For testing, check spam, or create the user yourself:
> **Authentication → Users → Add user → Create new user**, tick *Auto Confirm User*.

## 5. Google sign-in (optional)

1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services
   → OAuth consent screen**. Choose **External**, fill in the app name and your email, save.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized redirect URI:** `https://xxxx.supabase.co/auth/v1/callback`. That's the
   **Supabase** address (your project URL + `/auth/v1/callback`), not localhost. This is the
   step everyone gets wrong.
4. Copy the **Client ID** and **Client secret**.
5. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste both, save.

## 6. Check everything

```bash
cd backend
python -m app.check
```

You want to see `ok Supabase storage buckets ready` and `ok Database has storybook pages`.
It also lists, key by key and model by model, which Gemini models still have quota today.

Then run the app (backend, then frontend), and in the browser:
1. **Sign up** with email → confirm → you land on onboarding.
2. Make the family and an elder, record a short story, make the book.
3. In Supabase → **Table Editor → chapters**, your book is there. **Storage → images**
   has its paintings, **audio** has the voice.
4. Sign out and sign in again (or use another browser): the book comes back.
5. Open a book → share → open the link in a private window: it reads, signed out.

## 7. When you deploy

- Supabase **Site URL** and **Redirect URLs**: add the Vercel address (step 4).
- Vercel environment variables: the four `NEXT_PUBLIC_...` values, with `NEXT_PUBLIC_API_URL`
  pointing at the deployed backend.
- Backend host secrets: everything from `backend/.env` **except** `APP_ENV`. Set
  `ALLOWED_ORIGINS` to the Vercel URL, and `TRUSTED_PROXY_HOPS=1` on Hugging Face or Render.
