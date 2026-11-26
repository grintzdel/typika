# 0034 — GitHub: OAuth App, exchange on the app server, readable gist

**Status**: Accepted · 2026-11-20 · slice 6 of M5 · complements
[sharing-and-cli §3, §5](../specs/sharing-and-cli.md) and [security §3.5](../specs/security.md)

## Context

Slice 6 brings sharing through a gist and pushing to a new repository. The specs left open the type of GitHub
application, the location of the exchange endpoint, how to return to the sandbox after signing in, and the format of a
project in a gist. There is neither a public instance nor a production application (#92): everything must be testable
without GitHub.

Checked on 2026-11-20: GitHub has accepted PKCE (`S256`) for OAuth Apps and GitHub Apps since July 2025, but the
`code` → token exchange still requires the `client_secret`, and `github.com/login/oauth/access_token` does not answer
with CORS. `api.github.com` answers with CORS.

## Decision

- **OAuth App.** Scopes requested at the time of the action: `gist` to share, `public_repo` in addition to push. Never
  `repo` in V1: the push only creates public repositories.
- **PKCE and `state`.** The client draws a `state` and a `code_verifier`, kept in `sessionStorage` for the round trip.
  The callback refuses an unknown `state`.
- **The exchange lives in the app's Node server**, `POST /api/github/token`, like the Kotlin relay
  ([0029](0029-kotlin-relay-rate-limit.md)), with the same middleware in dev. It refuses an `Origin` other than the
  app, rate-limits per IP, and logs neither the `code` nor the token. It exists only if `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET` are defined; `/config.json` then publishes `github.clientId`.
- **Full-page redirect, no popup.** "Sign in to GitHub" leaves the page for GitHub, which comes back to
  `/auth/github/callback`. The callback exchanges the code, stores the token in `sessionStorage`, then returns to the
  starting page, where the share dialog reopens.
- **`TYPIKA_GITHUB_URL` and `TYPIKA_GITHUB_API_URL`** replace `https://github.com` and `https://api.github.com`. The
  E2E tests point them to a local fake GitHub (`scripts/serve-fake-github.ts`); a GitHub Enterprise instance uses them
  too. The API origin enters `connect-src`.
- **A gist carries the complete files**, so that it can be read on GitHub. A gist is flat: `/` becomes `__` in the
  file name, with a suffix in case of collision. `typika.share.json` carries the format version, the name, the origin
  ref, the runtime, the exercise, the file name → path table, and the list of empty files, which the gists API
  refuses.
- **`/g/<gistId>`** reads the gist without signing in, and with the token if there is one. The project opens like a
  `/s#…` link: ephemeral sandbox, banner, no automatic run, local id derived from the gist id. As for a link, the
  origin must be a template of the index, until `blank` projects exist.
- **Re-sharing** updates the gist whose id is kept on the local project (`projects.gistId`). A project opened from
  someone else's gist, or never saved, creates a new gist.
- **Two PRs**: (a) sign-in, gist and `/g/<id>`; (b) push to a new repository.

## Consequences

- Without an OAuth application, nothing changes: the share dialog only offers the link, and `/g/<id>` stays readable.
- The development OAuth App is created by hand on the maintainer's account, with the callback
  `http://localhost:3000/auth/github/callback`. The local check never talks to the real GitHub: the check against
  GitHub is done by hand, like the zips of slice 3.
- The redirect reloads the sandbox. A modified project is already saved; an unmodified shared project reopens through
  its URL.
- `public_repo` gives write access to all of the user's public repositories. It is the smallest scope of an OAuth App
  that creates a repository; the UI says so before signing in and gives the revocation link.
- A gist file truncated by the API (more than 1 MB) makes the gist unreadable for Typika: error screen. A project's
  limits are well below that.

## Rejected alternatives

- **GitHub App**: finer permissions, but creating a repository requires installing the app on the account with
  repository administration. That is one more step, for a broader right than `public_repo`.
- **Popup**: the sandbox sends `Cross-Origin-Opener-Policy: same-origin`, which cuts the link with a window that went
  to GitHub. We would need a `BroadcastChannel`, and to cope with popup blockers.
- **Device flow**: no secret or callback, but the user copies a code, and the endpoint does not answer with CORS
  either.
- **TanStack Start server route** ([architecture §3.5](../specs/architecture.md)): the rate limiter and the client's IP
  live in the Node server, as for the Kotlin relay.
- **A delta in the gist**, as in the URL: smaller, but unreadable on GitHub.
