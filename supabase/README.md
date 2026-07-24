# Supabase backend (P1.1)

This directory contains the P1.1 backend MVP migration. It defines the `users`,
`module_progress`, `quiz_attempts`, `game_attempts`, and `streaks` tables;
tenant-isolating RLS policies; automatic profile creation on sign-up; and the
`get_module_percentile` RPC used by the mobile app.

## Apply the migration

Authenticate with an account that has owner or developer access to the EVATS
Supabase project, then run:

```powershell
npm run supabase:link
npm run supabase:push
```

The linked project ref is `dmcqwfnstddnthvwfqam`. `supabase db push` applies
the checked-in migration; it does not expose a database password in source.

## Mobile environment

Copy `.env.example` to `.env` and set the project's URL and **anon** key. For
EAS builds, set the same two values as build environment variables. Never use a
service-role key in the mobile app.

## Auth provider

The existing app flow uses Google OAuth. In Supabase Dashboard, enable the
Google provider, supply the approved Google OAuth client ID/secret, and add
`evats://auth` to the Auth redirect allow-list. Test it with an Expo development
build or production build, because a custom URI scheme cannot be validated in a
generic Expo Go session.
