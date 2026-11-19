# How to run the Krishi Bondhu site (location picker)

## What you need

- **Node.js 22 or newer**
- **pnpm 12** (the project pins it; run `corepack enable` once to get it)
- **PostgreSQL** running locally, with a database called `krishi_bondhu`

## Steps

1. **Install packages**

   ```sh
   pnpm install
   ```

2. **Create your settings file**

   ```sh
   cp .env.example .env
   ```

   Open `.env` and set `DATABASE_URL` to your database, for example:

   ```
   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/krishi_bondhu?schema=public"
   ```

   Keep `.env` private. Do not commit it.

3. **Generate the database client and apply the migrations**

   ```sh
   pnpm exec prisma generate
   pnpm exec prisma migrate deploy
   ```

   The migrations create the tables and load the location data (8 divisions, 64 districts, 576 upazilas, 4540 areas).

4. **Start the site**

   ```sh
   pnpm dev
   ```

5. **Open it in your browser**

   - English: http://localhost:3000/en
   - Bangla: http://localhost:3000/bn

   Pick a division, then a district, an upazila and an area. Each choice fills the next list.

## Stop the site

Press `Ctrl+C` in the terminal where `pnpm dev` is running.

## Troubleshooting

- **"Can't reach database server"**: check that PostgreSQL is running and that `DATABASE_URL` in `.env` matches it. If you ran `export DATABASE_URL=...` earlier in your shell, run `unset DATABASE_URL` too, because it overrides `.env`.
- **Empty dropdowns**: step 3 was not run, or the location data did not load. Run `pnpm exec prisma migrate deploy` again.
- **Port 3000 already in use**: stop the other program using it, or run `pnpm dev -p 3001` and open http://localhost:3001/en.

## Optional checks

```sh
pnpm lint          # code style checks
pnpm test          # unit tests
pnpm test:e2e      # browser tests against a production build (port 3100)
```
