# Maintenance

`npm run refresh:catalog` starts a fresh collection of all catalog pages. Changed pagination, duplicate IDs, an empty catalog, a missing specialized dataset, or a removed required field causes failure before replacing the valid index. A dataset-count change above 10% requires review and the explicit `--accept-large-change` option. Temporary errors respect Retry-After up to 60 seconds, with at most three attempts per request. Resume a moving catalog by restarting collection rather than trusting an old page offset.

The script writes a change report, updates specialized dataset metadata, and regenerates documented counts and tools. `npm run check:schema` checks reference fields without changing files. Changes to `data/schema-expectations.json` require reviewing the affected tool mappings.

Catalog refresh and provider verification workflows are manual. Catalog refresh proposes a reviewable pull request without merging it. The repository must allow pull requests created by GitHub Actions. Provider verification supports core/all/auth and stores its report as an artifact. Optional credentials are configured as repository Actions secrets; missing credentials produce an explicit skipped status, not a claim of authenticated verification.

After compiling, `npm run docs:generate` generates the README summary, COVERAGE.md, and data/tool-manifest.json from the actual MCP registrations. `npm run docs:check` rejects generated-file drift. Repository documentation, generated text, examples, issue templates, and maintainer-authored issue content use English.

Verification reports distinguish pass, fail, skipped, and pending. A pending export does not prove a completed export cycle. Reports retain non-sensitive test arguments; credentials are never tool arguments.
