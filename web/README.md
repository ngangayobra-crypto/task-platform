# TaskHive Web

This project is now a web-only Vite + React app backed by Supabase for auth, data, and file storage.

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run [supabase/schema.sql](/C:/Users/brayo/OneDrive/Desktop/task-platform/web/supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Install dependencies and start the site:

```bash
npm install
npm run dev
```

## First Admin

Create the first auth user from the Supabase Auth dashboard, then promote that user in SQL:

```sql
update public.profiles
set role = 'admin',
    account_status = 'active'
where id = 'AUTH_USER_UUID_HERE';
```

After that, sign in through the website and use the admin dashboard for the rest of the workflow.

## Notes

- New user signups create their Supabase auth account and the matching signup/payment rows automatically through a database trigger.
- Submission uploads go to the private `submission-files` storage bucket defined in the schema.
- The old Node/SQLite backend is no longer used by the website.
