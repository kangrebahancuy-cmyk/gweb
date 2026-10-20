# Cloud service setup (not yet deployed)

This repository does not contain production credentials and does not claim a live deployment.

## Supabase Auth

1. Create a Supabase project and enable email/password sign-in.
2. Configure email confirmation and account recovery policies.
3. Set the project URL in the Cloudflare Worker variable SUPABASE_URL.
4. Configure the project anon key for the Worker as a secret named SUPABASE_ANON_KEY.
5. Keep any service-role key server-only. Never put it in a VITE_ variable or browser bundle.

The Worker validates the bearer access token by calling the Supabase Auth user endpoint. Before public release, add tests for expiry, invalid tokens, account deletion, and character ownership.

## Neon PostgreSQL

1. Create a Neon project and a dedicated application role with least privilege.
2. Apply db/migrations/0001_init.sql through a controlled migration process.
3. Configure a server-only connection path from the Worker (Cloudflare Hyperdrive is the intended production option).
4. Implement transaction-based character creation, inventory updates, farming timers, quest rewards, and idempotency checks.
5. Do not connect a browser directly to the database.

The migration is authored but has not been applied to a database. The current Worker does not yet load character data or persist gameplay state.

## Cloudflare Worker and Durable Objects

1. Install dependencies with npm install.
2. Configure the project-specific Supabase URL and anon key.
3. Run npm run worker:check.
4. Deploy only after Worker typechecking and the dry-run build pass.
5. Add room capacity limits, movement simulation, collision validation, reconnect handling, and integration tests before production.

No Cloudflare account ID, Hyperdrive ID, production domain, or secret is included in this repository.
