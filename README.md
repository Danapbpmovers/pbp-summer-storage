# PackStoreShip — student storage site

The new packstoreship.com: Boston student summer storage, Ship Ahead and shipping.
It runs as The UPS Store 0983 program with PBP Movers, legal entity **Piece by Piece Movers LLC**.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind 4, Supabase (Postgres, auth, storage),
Stripe (Checkout + saved payment methods), Resend (email), Twilio (SMS). Hosted on Vercel.

## What's here

| Area | Routes |
| --- | --- |
| Marketing | `/`, `/schools`, `/schools/[slug]`, `/how-it-works`, `/pricing` (live calculator), `/ship-ahead`, `/shipping`, `/for-parents`, `/packing-guidelines`, `/faq`, `/about`, `/contact`, `/employment`, `/reviews`, `/terms`, `/privacy` (drafts) |
| Booking | `/book`: 6 steps (school → you → items → coverage → schedule → review & pay), sticky live total, student/parent toggle, “reserve now, add items later”, saved progress |
| Customer | `/app` (orders), `/app/orders/[id]` (timeline, items, charges, pay, request delivery), `/app/orders/[id]/labels` (QR labels to print), `/app/settings` (share with a parent or student) |
| Staff | `/admin` (overview + open owner questions), `/admin/orders` (search, status, delivery hold, intake, add charge / charge saved card, refunds), `/admin/claims` (claims queue), `/admin/promos` (promo codes), `/admin/catalog` (prices), `/admin/calendar` (dates + slot capacity), `/api/admin/export` (CSV) |
| Crew | `/crew`: phone screen for stations and the warehouse. Scan a QR label with the camera (or type the code), take intake photos, log weight and bin, add unthawed-fridge or shrinkwrap fees, add items that weren't booked, and mark items received. Over 50 lb adds the overweight fee automatically. |

### Pricing rules

- **Dual pricing (Massachusetts):** stored prices are the actual prices and are what **bank transfer (ACH)** pays.
  **Card** pays +3%, shown side by side everywhere. Set in `src/config/site.ts` → `payments`.
- Prices, fees, coverage, dates, stations and capacity are all data in Supabase, editable in `/admin` with no deploy.
- `src/lib/pricing.ts` is the single pricing engine. The browser uses it for the live cart, and the server re-runs it
  against database prices before charging. It never trusts the browser's total.
- Boxes and materials are sold: add them in Admin → Prices under “Boxes & supplies to buy”.

### Branding

`show_ups_affiliation` in `src/config/site.ts` controls every The UPS Store mention. Colors are tokens in
`src/app/globals.css` (`@theme`). Drop official logo files in `public/` and swap `src/components/Brand.tsx`.

## Set up

1. **Supabase:** create a project, then in the SQL editor run `supabase/migrations/0001_schema.sql`,
   `0002_seed.sql`, then `0003_crew_claims_promos.sql`. In Auth → URL configuration, set the site URL and add `https://<your-domain>/auth/callback`.
2. **Env:** copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key and service-role key.
3. **Make yourself admin:** book once or sign up, then run
   `update public.profiles set role = 'admin' where email = 'you@…';`
4. **Stripe (your existing account):** add `STRIPE_SECRET_KEY`. Enable **ACH Direct Debit** (us_bank_account) under
   Payment methods. Add a webhook to `https://<your-domain>/api/stripe/webhook` with the events listed at the top of
   `src/app/api/stripe/webhook/route.ts`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. **Email / SMS (optional):** `RESEND_API_KEY`, `TWILIO_*`. Without them, messages are recorded in `message_log`.
6. `npm install && npm run dev`

Without Supabase keys the public site still runs, using the built-in seed catalog in `src/data/seed.ts`.
Booking, accounts and admin show a “not connected yet” notice.

## Editing the seed

`src/data/seed.ts` is the source for the initial catalog. After changing it, run `npm run gen:seed` to regenerate
`supabase/migrations/0002_seed.sql`. The SQL is safe to re-run.

## Not built yet (next phases)

Message templates, reviews collection, UPS rate quotes, paying approved claims through Stripe (claims are marked
paid by hand today), Boston College / storagebc.com campus, and migrating accounts from the old site.

## Claims

Customers report damage or loss from their order page once it's delivered. The window is the campus
`claim_window_days` (3 by default), counted from `delivered_at`, which is set when staff mark the order Completed.
Damage claims require photos. Staff review in `/admin/claims` next to the intake photos taken at drop-off, set
status and the approved amount, and can email the customer on each status change.
