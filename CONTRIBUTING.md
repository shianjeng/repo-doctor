# Contributing

Use Node.js 22 or later. No runtime dependencies or installation step is required.

```bash
npm test
npm run check
npm start
```

Open the URL printed by `npm start`. Change `PORT` if 4173 is occupied.

The browser and CLI share `dist/lib/doctor.js`. Put scoring changes there, explain their weights and false positives, and add a focused regression test in `test/doctor.test.js`. Tests use mocked GitHub responses and do not need network access or a token.

Use a small branch and pull request explaining the user-visible problem, the fix, and validation. Do not include tokens or private repository data in fixtures. Do not change a weight just to make a demo score higher. Maintain the 100-point total and preserve unknown-data handling.

Interface text lives in `dist/i18n.js` (English, 简体中文, 日本語). When you add or change a string, update every language; the tests fail on untranslated text.

Suitable first contributions: recognize another package ecosystem, improve README heading detection for another language, add a regression test for a false positive, or improve a translation. Maintainers should create a `good first issue` label after publishing the repository.
