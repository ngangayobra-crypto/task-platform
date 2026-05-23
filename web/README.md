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

If you add or change `.env.local`, restart `npm run dev` so Vite reloads the Supabase variables.

4. Install dependencies and start the site:

```bash
npm install
npm run dev
```

## First Admin

Create the first auth user from the Supabase Auth dashboard, then promote that user in SQL:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID_HERE';
```

After that, sign in through the website and use the admin dashboard for the rest of the workflow.

## Notes

- New user signups create their auth account immediately with no admin approval step.
- For instant register-and-login, turn off Confirm email in your Supabase Auth dashboard. Supabase documents that `signUp()` only returns a live session when email confirmations are disabled.
- After sign-in, non-admin users can browse tasks immediately. The M-Pesa prompt appears when they claim a task, and withdrawals unlock at $500 after earnings build up.
- Admins now set each task's reward manually when creating the task, and approved submissions pay that exact task amount into the user's wallet.
- Open tasks stay visible to every user and can be claimed by different users; each user can only hold one assignment for the same task.
- Re-run [supabase/schema.sql](/C:/Users/brayo/OneDrive/Desktop/task-platform/web/supabase/schema.sql) if you have an older Supabase setup from the previous approval-based flow.
- Submission uploads go to the private `submission-files` storage bucket defined in the schema.
- The old Node/SQLite backend is no longer used by the website.
