# College Bus Connect - Supabase Online Database

This version uses **Supabase PostgreSQL** instead of local MySQL. The website can run on localhost while all application data is stored online in Supabase.

## 1. Create the Supabase database
1. Create/open your Supabase project.
2. Open **SQL Editor**.
3. Create a **New query**.
4. Copy all contents of `database/supabase_schema.sql` into the query.
5. Click **Run**.

## 2. Get the Supabase connection string
In Supabase open **Connect** and choose the PostgreSQL connection string. For deployed applications, use the **Session pooler** connection string when Supabase provides it.

It will look similar to:
`postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`

Do NOT share the password.

## 3. Configure this project
Open `backend/.env` and replace the example `SUPABASE_DB_URL` with your real Supabase connection string.

Set a long random value for `SESSION_SECRET`.

## 4. Run locally
Open Git Bash or a terminal in the project folder:

```bash
cd backend
npm install
npm start
```

Open:

`http://localhost:3000`

## Demo accounts
- Admin: `YOGESH` / `1234`
- Driver: `TAMIL` / `1234`
- Student: `STU001` / `1234`

## 5. Render deployment
Use the same GitHub project on Render. Keep:
- Build command: `npm install`
- Start command: `npm start`
- Root directory: `backend`

In Render Environment Variables add:
- `SUPABASE_DB_URL` = your Supabase PostgreSQL connection string
- `SESSION_SECRET` = your secret

Do not commit `backend/.env` to GitHub. It is included in this ZIP only as a local configuration template.
