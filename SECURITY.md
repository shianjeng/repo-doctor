# Security policy

Only the latest 0.3.x version is currently supported.

Do not post vulnerability details, tokens, or private repository data in public issues. Use GitHub's **Security → Report a vulnerability** if private reporting is enabled on this repository. If that option is unavailable, contact the maintainer through a verified private contact route on their GitHub profile and ask for a secure disclosure channel before sending details.

Maintainer release checklist: enable private vulnerability reporting in GitHub repository settings before public launch. No response-time commitment is made until the maintainer establishes one.

The CLI reads GITHUB_TOKEN from the environment and sends it only to api.github.com. The website never asks visitors for a token. Its server (`/api/check`) uses the site’s own `GITHUB_TOKEN` secret — a fine-grained token limited to public repositories is recommended — and refuses private repositories regardless of what the token can read; its Content-Security-Policy (`dist/_headers`) only allows scripts from its own origin and network requests to its own origin and api.github.com. Fix links point only to github.com, where you review every change before committing it. This tool never clones repositories or executes repository code. A Repo Doctor score is a repository hygiene indicator, not a vulnerability scan or security guarantee.
