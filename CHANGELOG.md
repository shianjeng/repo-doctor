# Changelog

## 0.3.0 — 2026-09-28

### Added

- Server checks: `/api/check` on Cloudflare Workers runs checks with the site’s own `GITHUB_TOKEN` secret (5,000 requests per hour instead of 60 per visitor IP) and caches each repository for ten minutes. Without the secret, the page keeps calling GitHub from the browser. The server refuses private repositories even if its token could read them.
- The website in English, 简体中文, and 日本語: follows the browser language, with a switcher and `?lang=` links. Every check, fix, note, roast, and error is translated.
- README translations (README.zh-CN.md, README.ja.md) and screenshots of the website and CLI.

### Changed

- Rate-limit errors are friendlier and show the reset time in the visitor’s local time.
- The search box starts empty, and the example repository buttons were removed.
- `npm start` serves `/api/check` too; run it with `GITHUB_TOKEN` to test server checks locally.
- 使用说明.md was replaced by README.zh-CN.md.

## 0.2.0 — 2026-09-28

### Added

- One-click fixes: every finding links to the GitHub page that fixes it. SECURITY.md, CONTRIBUTING.md, README.md, `.editorconfig`, `dependabot.yml`, and a CI workflow are prefilled with starter content that matches the detected ecosystem.
- Copyable CI badge snippet for the repository’s own workflow.
- Repo Doctor score badge (`--badge` in the CLI, “Add a badge” on the website).
- Export the prescription as a GitHub issue task list (`--issue`, “Track fixes in a GitHub issue”).
- Website: shareable `?repo=owner/repo` links, JSON export, “Unknown” filter, the five most recent checks, and the remaining GitHub API quota.
- A repository website (About → Website) now counts as a live demo.
- Notes for forks and for repositories without topics.
- Cloudflare Workers deployment (`wrangler.jsonc`) and strict security headers (`dist/_headers`), mirrored by `npm start`.
- CODE_OF_CONDUCT.md and this changelog.

### Changed

- Input parsing accepts any github.com page inside a repository (`/tree/main`, `?tab=readme-ov-file`, `#readme`), `www.github.com`, scheme-less `github.com/owner/repo`, and SSH clone URLs.
- “Good first issue” now requires at least one issue that uses the label. GitHub creates the label in every repository, so the label alone passed for everyone.
- Recognizes more ecosystems and tools: Bitbucket, Buildkite, Drone, and Woodpecker CI; Deno, Dart, Elixir, Scala, .NET, Julia, R, Meson, and Nix manifests; more lockfiles, formatters, and security scanners; more install commands and Chinese/Japanese headings.

### Fixed

- Private repositories no longer end up as a “Partial check” (and fail `--min-score`) just because GitHub’s community profile is only available for public repositories.
- The CLI warns when fewer than 12 unauthenticated GitHub API requests remain.

## 0.1.0 — 2026-09-27

First release: 20 checks across five categories, website and CLI, Markdown/JSON output, roast mode, and CI thresholds.
