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

## Hyperdrive binding

After creating a Hyperdrive configuration in Cloudflare for the Neon connection, uncomment the Hyperdrive binding in wrangler.toml and replace its ID with the actual configuration ID. Keep the Neon connection string inside Hyperdrive; do not put it in browser environment variables. The character API returns HTTP 503 until the binding is present.

Set ALLOWED_ORIGIN to the exact production frontend origin before launch. The current wildcard CORS default is intended only to make local prototype setup easier; restrict it in production.

The character endpoint creates at most one starter character per authenticated Supabase account and initializes starter skill/inventory rows in a SQL transaction. It does not yet synchronize the Phaser local inventory, crop timers, combat rewards, or quest state into Neon. Those game actions still need authenticated, server-authoritative endpoints before the economy can be considered persistent or secure.
