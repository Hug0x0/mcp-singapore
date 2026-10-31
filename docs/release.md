# Releases and distribution

Source code is public on GitHub. npm publication is an explicit step requiring access to the @hug0x0 scope. This document does not claim that a version is already available in the registry.

1. Update CHANGELOG.md and run `npm version <version> --no-git-tag-version`.
2. Run `npm ci`, `npm run build`, `npm test`, `npm run docs:generate`, `npm run docs:check`, `npm run test:package`, and `npm audit`.
3. Review, commit, and push the changes. The server and User-Agent versions come from the package manifest. CI also verifies a package installed in an isolated directory.
4. With npm access configured, explicitly run `npm publish --access public`, using provenance when supported by the publication environment. Push workflows do not automatically publish to npm.
5. After successful publication, verify `npx --yes --package @hug0x0/mcp-singapore@<version> mcp-singapore` through a stdio client, create a matching tag/release, and update the README's unpublished-package notice.

The archive contains dist, bundled metadata, the tool manifest, documentation, and maintenance scripts. It excludes .env files, credentials, and node_modules. A package name in package.json does not prove registry availability.
