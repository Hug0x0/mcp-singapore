# Contributing

Use Node.js 22.12 or later. CI covers Node 22 and 24.

```sh
npm ci
npm run build
npm test
npm run docs:generate
npm run docs:check
npm run test:package
```

Write documentation, code comments, examples, tool descriptions, issues, and pull-request content in English. Link changes to an issue and explain the resulting behavior and verification. Source adapters must preserve URLs, dates, units, and missing-value markers. Add meaningful tests for behavior and failure cases rather than tests that only mirror implementation calls.

Provider fixtures must be synthetic or sanitized and contain no API keys, tokens, or signed download URLs. Pull-request tests stay local; real provider checks use the manual verification workflow and its pass/fail/skipped/pending report.

Register new tools through addTool, declare bounded arguments, describe coverage and pagination, and register the module in createServer. Compile and regenerate the manifest and COVERAGE. Specialized datasets require verified provider metadata and schema expectations. Dataset reference pages are generated from the pinned selection and catalog: update the source metadata or generator, then run `npm run docs:generate`; avoid editing generated pages directly.

Use `trash` rather than permanent local file deletion. Package-test temporary directories are moved to the trash when supported or left to the ephemeral runner lifecycle.
