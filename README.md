# 🩺 Repo Doctor

**Find what’s missing from your GitHub repository before your users do.**

Paste a GitHub repository URL. Get a 30-second open-source health check.

Twenty transparent checks. Five vital signs. A practical prescription. An optional, gentle roast. **No AI key. No runtime dependencies.**

> Typical checks take a few seconds. Network conditions, large repositories, and GitHub API limits affect timing. Requests share a 25-second timeout.

## Quick start / Installation

Requires **Node.js 22+**. From this project directory:

```bash
node bin/repo-doctor.js shianjeng/FX-Pulses
node bin/repo-doctor.js fastapi/fastapi --roast
node bin/repo-doctor.js https://github.com/vercel/next.js --json
```

To enable the short command locally:

```bash
npm link
repo-doctor shianjeng/FX-Pulses
```

The package is **not yet published to npm**. These commands run the source you downloaded; do not assume an unrelated unscoped npm package is this project. The prepared package name is `@shianjeng/repo-doctor`; registry availability and ownership must be verified before publishing.

## Real example

Live result for `shianjeng/FX-Pulses`, checked **2026-09-27 UTC** with v0.1.0 rules:

```text
╭─────────────────────────────────────╮
│ Repo Doctor 🩺                      │
├─────────────────────────────────────┤
│ Score                         66/100│
│ Documentation                100/100│
│ Community                     50/100│
│ CI/CD                         80/100│
│ Security                       0/100│
│ Structure                    100/100│
╰─────────────────────────────────────╯
```

Top suggestions: add a security policy, contribution guide, dependency update configuration, security automation, and a published release. This is a recorded check, not a hard-coded application result. The security category measures visible hygiene signals; a zero does **not** establish that a repository is insecure.

The machine-readable snapshot is in [examples/FX-Pulses.json](examples/FX-Pulses.json). The CLI and website always request current GitHub data.

## Usage

```bash
repo-doctor owner/repo --json > health.json
repo-doctor owner/repo --markdown > health.md
repo-doctor owner/repo --roast
repo-doctor owner/repo --min-score 80
repo-doctor --help
```

Optional `GITHUB_TOKEN` enables authenticated requests and private repositories in the CLI. Set it through your shell environment or CI secret manager; never commit it. It needs read access to the repository data being checked. Some community metadata may be unavailable for private repositories and will be marked unknown.

Exit codes: **0** completed / threshold met; **1** below the requested threshold; **2** invalid input, API failure, or incomplete data when enforcing a threshold. JSON output stays machine-readable; errors go to stderr.

### Website / demo

```bash
npm start
```

Open `http://127.0.0.1:4173`. The website supports public repositories and calls GitHub directly from the browser. It includes a score breakdown, expandable evidence, priority fixes, Doctor/Roast modes, and Markdown export. It sends no repository data to an application server. Fonts may be loaded from Google Fonts with local fallbacks.

The static `dist/` directory can be hosted on any static host. `.openai/hosting.json` records the private Sites preview deployment; remove that file if distributing a copy that should create a different Site. No build is required.

## Scoring

| Category | Weight | Signals |
| --- | ---: | --- |
| Documentation | 25 | README 10, installation 5, usage 5, demo 3, CI badge 2 |
| Community | 20 | license 8, contributing 5, conduct 2, issue templates 3, first-issue label 2 |
| CI/CD | 20 | CI configuration 10, test files 6, published release 4 |
| Security | 20 | policy 10, dependency updates 5, security workflow signal 5 |
| Structure | 15 | manifest 6, lockfile 4, source/docs layout 3, formatting config 2 |

`score = round(passed weight / verified weight × 100)`

Unknown data is excluded from the denominator; scoring coverage is always shown. Reports below 100% coverage are labeled **Partial check** and cannot pass a CI threshold. A truncated GitHub tree never turns unseen paths into missing-file warnings. A lockfile is treated as satisfied if no lockfile ecosystem is detected. Fixes are ordered by weight, not by an assertion of security severity.

### Limits and interpretation

- This is a **heuristic repository hygiene check**, not a security audit, legal review, test execution, or code-quality measurement.
- CI detection means a recognizable automation file exists; it does not verify test jobs, successful runs, or branch protection.
- Security automation detection uses filenames. GitHub default setup, organization-level scanners, inherited security policies, custom names, and unsupported ecosystems may require manual review.
- A demo image can be a screenshot or logo; image contents are not interpreted. README pattern checks can miss alternative languages and formats.
- A license file can pass without GitHub identifying its SPDX license. Review actual license terms separately.
- Latest release means a published non-draft, non-prerelease GitHub release. Tags alone do not count.
- Browser requests are unauthenticated and subject to GitHub rate limits. One check normally makes six API requests. API failures are reported rather than replaced with invented data.
- The scanner reads the default branch; repositories may change during collection. It is not an atomic commit snapshot.

GitHub API references: [repository contents](https://docs.github.com/en/rest/repos/contents), [Git trees](https://docs.github.com/en/rest/git/trees), [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## Development

```bash
npm test
npm run check
npm pack --dry-run
```

```text
bin/repo-doctor.js       CLI, output formats, exit codes
dist/lib/doctor.js       Shared GitHub client and scoring engine
dist/index.html         Web interface
dist/app.js             UI state and report rendering
dist/style.css          Responsive visual design
scripts/serve.js         Local static server
test/doctor.test.js      Offline regression tests
.github/workflows/       Node CI and CodeQL
```

The optional WebMCP `check_repository` tool uses the same scanning action as the interface and is feature-detected. It is skipped by browsers without support.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Licensed under [MIT](LICENSE).

## Public launch checklist

- Create the GitHub repository and push this source.
- Enable private vulnerability reporting and set a verified maintainer contact route.
- Enable Actions and check CI/CodeQL results; create `good first issue` labels.
- Record a short GIF from a real check and add it above Quick start; add a CI badge using the final repository URL.
- Review package name availability, publish to npm when ready, and tag a release. No npm or public GitHub publication is performed by this scaffold.
