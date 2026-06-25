# Contributing to minded

Thanks for your interest. This project is small and opinionated — please read this guide before opening a PR so we don't waste each other's time.

## Before you start

- For anything beyond a small fix, **open an issue first** to discuss the approach. Drive-by PRs that change architecture or add dependencies will likely be closed.
- iOS is a deliberately minimal **widget-only variant** (the companion sun — see [`docs/ios-platform-fit.md`](./docs/ios-platform-fit.md)). iOS-specific PRs should stay within that scope (the WidgetKit companion + WebView shell); new *intervention* features still target the browser extension and Android only.
- New dependencies need justification. Check `package.json` first to see if something equivalent is already available.

## Dev setup

See the [Develop](./README.md#develop) section of the README. The minimum loop:

```bash
cd extension
npm install
npm start              # watch-build the extension
# load extension/dist/ as an unpacked extension in chrome://extensions
```

For Android, run `npm run startDroid` from `extension/` and open `/android` in Android Studio.

## Architecture

[`CLAUDE.md`](./CLAUDE.md) is the canonical architecture reference. Key points:

- **Shared UI** lives in `extension/src/shared/`. Reuse it across platforms.
- **Platform code** lives in `extension/src/dataInterface/{extension,android,ios}/` behind a common interface.
- **State**: local with SolidJS signals, global via the dataInterface.
- **Styling**: use the shared `<Btn>` component for buttons and the shared typography classes (`h2`, `txtBig`, etc.) before writing new SCSS modules. Layout-only modules are fine.

## Code style

- TypeScript `strict: true`. Prefer `unknown` over `any`.
- Pure functions and composition over classes.
- Named exports over default exports.
- Functions under ~30 lines, max ~3 parameters.
- Comment the **why**, not the **what**.
- Semantic HTML.

`npm run lint` runs eslint with auto-fix. PRs must pass lint and tests.

## Tests

- Add unit tests for bug fixes (write the failing test first).
- Test behavior, not implementation.
- Mock the dataInterface when testing shared components.
- Android unit tests: `npm run test:android` from `extension/`.

## Commits and PRs

- Commit format: `type(scope): description` — `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Imperative mood, under 72 chars.
- One concern per PR. Keep diffs small and focused.
- Reference the issue you're closing in the PR description.

## Reporting bugs

Open a GitHub issue with:
- Platform (Chrome/Firefox/Android) and version
- Minimal reproduction steps
- What you expected vs. what happened
- Console errors / logcat output where relevant

## Code of conduct

By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
