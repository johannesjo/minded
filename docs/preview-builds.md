# Preview builds

Every pull request gets a live, clickable preview of the UI — the same idea as
Super Productivity's PR previews, adapted to minded.

minded ships a browser extension and an Android app, neither of which has a
"open a URL and it's running" surface. But the **standalone styleguide** does:
it's a self-contained static site (no extension/Android runtime) that already
renders the real components and interactions, and now also a full **dashboard
simulation** — the real app shell (companion sun, bottom bar, interaction
overlay, dashboard) running on a plain web page over an in-memory data store.
That site is what the preview deploys.

## What gets deployed

`npm run styleguide:build` produces `extension/distStyleguide/` with two pages:

- `index.html` — the component/interaction gallery.
- `dashboard.html` — the dashboard simulation. Seeds a representative dataset by
  default; append `?seed=none` for the fresh first-run state.

The build uses a relative base (`base: "./"`), so it works both at the local
preview root and under the per-PR GitHub Pages subpath.

## The workflow

`.github/workflows/pr-preview.yml` runs on every PR: it builds the styleguide
and deploys it to GitHub Pages under `pr-preview/pr-<N>/` via
[`pr-preview-action`](https://github.com/rossjrw/pr-preview-action), then posts
a sticky comment with the URL. On PR close it removes the preview. It uses only
the built-in `GITHUB_TOKEN` — no external secrets.

Preview URL shape: `https://johannesjo.github.io/minded/pr-preview/pr-<N>/`
(and `…/pr-<N>/dashboard.html` for the simulation).

## One-time setup

- **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages`
  / `(root)`.** The `gh-pages` branch is created automatically on the first
  preview run; select it once it exists.

## Limitations

- Deployment needs a write-scoped `GITHUB_TOKEN`, which PRs **from forks** don't
  receive. Fork PRs still build (so breakage is caught) but skip the deploy
  step. Same-repo branches get full previews.

## Run it locally

```bash
cd extension
npm run styleguide        # build + serve at http://localhost:5174
```

Then open `/` for the gallery or `/dashboard.html` for the dashboard simulation.
