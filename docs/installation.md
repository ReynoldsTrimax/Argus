# Installation guide

## 1. Clone and install

```bash
cd /path/to/parent
git clone <repo-url> frame
cd frame
npm install
```

## 2. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project
2. Wait for the database to finish provisioning
3. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep secret)

## 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Frame
```

## 4. Apply the database migration

1. Open Supabase → **SQL Editor**
2. Paste the contents of `database/migrations/001_foundation.sql`
3. Run the script
4. Confirm tables exist under **Table Editor**: `profiles`, `user_settings`, `user_preferences`

## 5. Configure authentication

### Email

- Authentication → Providers → **Email** → enable

### Google

1. Create OAuth credentials in Google Cloud Console
2. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Paste Client ID / Secret into Supabase Google provider

### GitHub

1. Create a GitHub OAuth App
2. Authorization callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Paste Client ID / Secret into Supabase GitHub provider

### URL configuration

Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

## 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`, create an account, and confirm a profile row appears in Supabase.

## 7. Deploy to Vercel

1. Push the repo to GitHub
2. Import into Vercel
3. Add the same env vars
4. Update Supabase Site URL + Redirect URLs for production
5. Deploy

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `Invalid client environment` | Missing/invalid `.env.local` values |
| OAuth returns to login with error | Check redirect URLs and provider secrets |
| No profile after signup | Re-run migration; check `on_auth_user_created` trigger |
| Theme flash | Ensure root layout includes the inline boot script and `suppressHydrationWarning` on `<html>` |
