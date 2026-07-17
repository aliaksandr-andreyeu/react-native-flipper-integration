# Contributing

Thanks for your interest in improving **react-native-flipper-kit**.

## Prerequisites

- Node.js **24** for development (see [`.nvmrc`](.nvmrc); run `nvm use`). The published package supports Node **>= 20** (`engines`).
- For native work: JDK 17 + Android SDK (Android), Xcode + CocoaPods (iOS).

## Setup

```bash
npm ci
npm ci --prefix examples/bare-new-arch   # only if working on an example app
```

`npm run prepare` builds the library (`lib/`) and installs git hooks (husky).

## Develop & verify

| Command                                   | What it does                 |
| ----------------------------------------- | ---------------------------- |
| `npm run build`                           | Compile TypeScript to `lib/` |
| `npm run typecheck`                       | Type-check without emitting  |
| `npm run lint` / `npm run lint:fix`       | ESLint                       |
| `npm run format` / `npm run format:check` | Prettier                     |
| `npm test` / `npm run test:coverage`      | Jest (JS API + Expo plugin)  |

Native checks:

- Android unit tests: `cd examples/bare-new-arch/android && ./gradlew :react-native-flipper-kit:testDebugUnitTest`
- iOS gating test: `clang -framework Foundation -I ios __tests__/ios/gating_test.m -o /tmp/t && /tmp/t`

A pre-commit hook runs `lint-staged` (Prettier + ESLint on staged files). Please keep `npm test`, `npm run lint`, and `npm run typecheck` green before opening a PR.

## Pull requests

- Branch off `development`; target `development` (or `main` per maintainer guidance).
- Keep changes focused; update [`CHANGELOG.md`](CHANGELOG.md) under an `Unreleased` or the in-progress version section.
- Note any change to native identifiers, the public JS API, or the minimum React Native version.

## Releasing

Maintainers only — see [`RELEASING.md`](RELEASING.md).
