// Starter files offered as one-click fixes. Short, original, and meant to be edited.

export const SECURITY = repo => `# Security policy

## Supported versions

Only the latest release of ${repo} receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use **Security → Report a vulnerability** on GitHub to send a private report. Include the affected version, steps to reproduce, and the impact you observed.

We will acknowledge your report, keep you updated while we investigate, and credit you in the release notes if you wish.
`;

export const CONTRIBUTING = repo => `# Contributing to ${repo}

Thanks for helping out!

## Getting started

1. Fork the repository and create a branch from the default branch.
2. Install the dependencies and run the tests (see the README).
3. Make your change, adding a test when you fix a bug or add a feature.

## Pull requests

- Keep each pull request focused on one change.
- Explain the problem, the fix, and how you tested it.
- Make sure the checks pass before asking for review.

## Reporting bugs and ideas

Open an issue with the steps to reproduce, what you expected, and what happened instead. Look for issues labeled **good first issue** if you are new here.
`;

export const README = repo => `# ${repo.split('/')[1]}

One sentence on what this project does and who it is for.

## Installation

\`\`\`bash
# the command a new user should run first
\`\`\`

## Usage

\`\`\`bash
# a minimal example and its output
\`\`\`

## License

See [LICENSE](LICENSE).
`;

export const EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`;

const DEPENDABOT_ECOSYSTEMS = [
  [/(?:^|\/)package\.json$/, 'npm'], [/(?:^|\/)(?:pyproject\.toml|requirements[^/]*\.txt|setup\.py)$/, 'pip'],
  [/(?:^|\/)Cargo\.toml$/, 'cargo'], [/(?:^|\/)go\.mod$/, 'gomod'], [/(?:^|\/)Gemfile$/, 'bundler'],
  [/(?:^|\/)composer\.json$/, 'composer'], [/(?:^|\/)(?:pom\.xml)$/, 'maven'], [/(?:^|\/)build\.gradle(?:\.kts)?$/, 'gradle'],
  [/(?:^|\/)Dockerfile$/, 'docker'], [/^\.github\/workflows\//, 'github-actions'],
];

export function dependabot(files) {
  const found = DEPENDABOT_ECOSYSTEMS.filter(([pattern]) => files.some(f => pattern.test(f))).map(([, name]) => name);
  const ecosystems = [...new Set(found.length ? found : ['github-actions'])];
  return `version: 2
updates:
${ecosystems.map(name => `  - package-ecosystem: ${name}
    directory: /
    schedule:
      interval: weekly`).join('\n')}
`;
}

const CI_STEPS = [
  [/^package\.json$/, 'Node.js', files => `      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
      - run: npm ${files.includes('package-lock.json') ? 'ci' : 'install'}
      - run: npm test`],
  [/^requirements\.txt$/, 'Python', () => `      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - run: pip install -r requirements.txt pytest
      - run: pytest`],
  [/^(?:pyproject\.toml|setup\.py)$/, 'Python', () => `      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - run: pip install -e . pytest
      - run: pytest`],
  [/^go\.mod$/, 'Go', () => `      - uses: actions/setup-go@v6
        with:
          go-version: stable
      - run: go test ./...`],
  [/^Cargo\.toml$/, 'Rust', () => `      - run: cargo test --all`],
];

// Returns null when the ecosystem is unknown; the caller then links to GitHub's workflow picker.
export function ciWorkflow(files) {
  const match = CI_STEPS.find(([pattern]) => files.some(f => pattern.test(f)));
  if (!match) return null;
  return `name: CI
on:
  push:
  pull_request:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
${match[2](files)}
`;
}
