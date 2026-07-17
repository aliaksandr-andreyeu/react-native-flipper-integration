# Releasing

Releases are published to npm automatically by [`.github/workflows/release.yml`](.github/workflows/release.yml) when a `v*` tag is pushed. Publishing happens with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) (SLSA attestation via GitHub OIDC).

## One-time setup

- npm organization **cycleport** owns the package; create an **Automation** access token with publish rights and add it to the repository (or org) secrets as **`NPM_TOKEN`**.
- The workflow uses the built-in `GITHUB_TOKEN` to create the GitHub Release — no extra secret needed.

## Cutting a release

1. Bump `version` in [package.json](package.json) (SemVer).
2. Add a matching section to [CHANGELOG.md](CHANGELOG.md): `## [X.Y.Z] - YYYY-MM-DD` followed by `Added` / `Changed` / `Fixed` notes. The workflow extracts this section verbatim for the GitHub Release body.
3. Commit on `main` (e.g. `chore(release): vX.Y.Z`).
4. Tag and push:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

The workflow then verifies the tag matches `package.json`, validates that the CHANGELOG section for the version is present and non-empty, runs `typecheck` / `lint` / `format:check` / the test suite, builds, publishes to npm with provenance, and creates the GitHub Release.

## Notes

- **Tag must equal the version**: pushing `vX.Y.Z` with a mismatched `package.json` version fails the run before publishing.
- **Dry run** before tagging if unsure: `npm publish --dry-run`.
- The tag-triggered run validates the JS package only; native (Android/iOS) builds are gated on pull requests via [`ci.yml`](.github/workflows/ci.yml).
- Breaking changes (e.g. an async `start()`) warrant a major bump and a dedicated changelog entry.
