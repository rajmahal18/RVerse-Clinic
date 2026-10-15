# Dependency security remediation — 2026-10-15

Dependency-only patch; no deployment, commit, application, styling, schema, migration, or environment-file changes. React/React DOM remain 19.2.6, Prisma/client 5.22.0, and Tailwind 3.4.19.

## Online audit comparison

| Command | Before | After |
| --- | --- | --- |
| npm audit --omit=dev | 12 (10 high, 2 moderate) | 6 high |
| npm audit | 18 (15 high, 3 moderate) | 8 high |

Current registry baseline differs from the supplied 11 findings. Offline npm configuration initially produced misleading zero-finding results; these were discarded. Final audits used online registry access and exit 1 because findings remain. No critical, moderate, low, or informational findings remain. Counts include propagated parent-package findings, not distinct CVEs.

## Changes and compatibility

- Next and eslint-config-next: 15.5.24 → 15.5.28, preserving the 15.5 line and compatible React peers.
- PostCSS: 8.5.14 → 8.5.30; direct minimum raised to ^8.5.30. Next still pins affected 8.4.31, so a scoped `next > postcss: $postcss` override deliberately replaces it with patched PostCSS 8.
- Sharp: 0.34.5 → 0.35.5 through a scoped Next override, addressing libvips/libheif/librsvg advisories. This crosses a pre-1.0 minor: compatibility was checked with Next build and existing Sharp-backed QR tests. **Requires Node >=20.9.0**; verification used Node 22.19.0/npm 10.9.3. Confirm deployment Node version before rollout. Linux native binaries were not executed on this Windows host.
- NanoID: 3.3.12 → 3.3.20; source-map-js: 1.2.1 → 1.2.2. Both fit existing dependency ranges; no override needed.
- postcss-selector-parser: 6.1.2 → 7.1.6 via override. Patched 6.x does not resolve the flat-selector CPU exhaustion advisory. This deliberate major override covers Tailwind and postcss-nested; compilation and browser layout checks passed. Third-party plugin behavior is not exhaustively tested.
  Its installed changelog identifies the 7.0 change as making insertions during iteration safe. This does not require a Tailwind configuration migration; the unchanged application stylesheet compiled successfully.
- Compatible lockfile updates also remediate full-audit findings in brace-expansion, browserslist, baseline-browser-mapping, and js-yaml. Their supporting transitive changes are listed below. No force audit fix or Tailwind 4 migration.

## Unresolved high findings

Root cause: [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). All published versions through 3.0.3 are affected; no patched version is published at verification time. Deeply nested attacker-controlled brace patterns can cause stack exhaustion and process termination.

| Affected dependency | Exposure / chain | Proposed remediation |
| --- | --- | --- |
| braces 3.0.3 | Vulnerable brace-pattern parser | Adopt a compatible upstream patch when published. |
| chokidar 3.6.0 | Tailwind watcher → braces; malicious watch patterns | Keep watch configuration trusted; adopt upstream fix. |
| micromatch 4.0.8 | Tailwind matching / fast-glob → braces; malicious glob patterns | Keep content globs trusted; adopt upstream fix. |
| fast-glob 3.3.3 | Tailwind and Next ESLint plugin → micromatch → braces | Adopt upstream fix; avoid incompatible glob API substitutions. |
| tailwindcss 3.4.19 | chokidar, fast-glob, micromatch chains | Monitor Tailwind 3 backports. Consider a separately scoped, fully tested Tailwind 4 migration only if necessary for upstream remediation. |
| tailwindcss-animate 1.0.7 | Tailwind peer propagates finding | Same Tailwind remediation; no independent plugin advisory here. |
| @next/eslint-plugin-next 15.5.28 | Development-only fast-glob chain | Adopt upstream fix; trusted lint/build configuration. |
| eslint-config-next 15.5.28 | Development-only ESLint plugin chain | Same ESLint remediation. |

The first six appear with `--omit=dev` because production dependency tailwindcss-animate pulls Tailwind through its peer dependency. Installation classification does not establish request-time exploitability. Tailwind runs through PostCSS at build time with the fixed `./src/**/*.{ts,tsx}` content glob. Source inspection found no request-input use of these glob libraries. Exposure is primarily developer/CI build or watch processing of malicious configuration/patterns. Do not build untrusted submissions in a privileged environment. No request-time exploit was demonstrated; absence of reachability is not formally proven.

Patched risk distinctions: Sharp can process images at runtime through Next image optimization, and this app imports next/image. PostCSS, selector parsing and source-map handling are primarily build-time here; malicious CSS/maps can threaten file disclosure or availability where processed. NanoID advisories require invalid generator sizes; no direct application NanoID use was found. Next cache poisoning is a framework runtime risk addressed by the framework update.

## Verification

- Workspace `npm ci`: repeatedly blocked by Windows EBUSY file locks deleting existing node_modules.
- Workspace dependencies were restored with `npm install --ignore-scripts`, followed by explicit Prisma generation. Workspace typecheck passed. The final workspace lockfile SHA256 matches the isolated copy used for successful clean installation/build; installation did not alter it.
- Isolated clean copy of working tracked files in a temporary directory, excluding .env files: `npm ci` passed, including Prisma generation.
- Initial typecheck/build found missing generated Prisma exports. Explicit `npm run prisma:generate` with the unchanged schema/client resolved this; subsequent `npm run typecheck` passed.
- `npm run check:production`: unavailable; package.json has no such script. No misleading alias was added.
- `npm run build`: passed after regeneration; Next 15.5.28 compiled and generated 23 static pages. No staging or live database integration test.
- `npm run check:patient-labels`: passed isolated PostgreSQL numbering and Sharp-backed QR decoding checks.
- `npm run check:clinic-layout`: passed after build, covering 320/375/768/1024/1280 px layouts, mobile scrolling, forms and QR printing.
- Both online audits completed with remaining findings above. Passing tests does not establish security.

## Files changed

- package.json
- package-lock.json
- docs/dependency-security-remediation-2026-10-15.md

## Exact lockfile changes

Includes supporting and platform-specific packages; unchanged packages are omitted.

| Package path | Before | After |
| --- | --- | --- |
| node_modules/@emnapi/runtime | 1.10.0 | 1.11.3 |
| node_modules/@img/sharp-darwin-arm64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-darwin-x64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-freebsd-wasm32 | absent | 0.35.5 |
| node_modules/@img/sharp-libvips-darwin-arm64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-darwin-x64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-arm | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-arm64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-ppc64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-riscv64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-s390x | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linux-x64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linuxmusl-arm64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-libvips-linuxmusl-x64 | 1.2.4 | 1.3.4 |
| node_modules/@img/sharp-linux-arm | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linux-arm64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linux-ppc64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linux-riscv64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linux-s390x | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linux-x64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linuxmusl-arm64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-linuxmusl-x64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-wasm32 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-webcontainers-wasm32 | absent | 0.35.5 |
| node_modules/@img/sharp-win32-arm64 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-win32-ia32 | 0.34.5 | 0.35.5 |
| node_modules/@img/sharp-win32-x64 | 0.34.5 | 0.35.5 |
| node_modules/@next/env | 15.5.24 | 15.5.28 |
| node_modules/@next/eslint-plugin-next | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-darwin-arm64 | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-darwin-x64 | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-linux-arm64-gnu | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-linux-arm64-musl | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-linux-x64-gnu | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-linux-x64-musl | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-win32-arm64-msvc | 15.5.24 | 15.5.28 |
| node_modules/@next/swc-win32-x64-msvc | 15.5.24 | 15.5.28 |
| node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion | 5.0.6 | 5.0.12 |
| node_modules/baseline-browser-mapping | 2.10.29 | 2.11.28 |
| node_modules/brace-expansion | 1.1.14 | 1.1.21 |
| node_modules/browserslist | 4.28.2 | 4.29.3 |
| node_modules/caniuse-lite | 1.0.30001792 | 1.0.30001816 |
| node_modules/electron-to-chromium | 1.5.354 | 1.5.456 |
| node_modules/eslint-config-next | 15.5.24 | 15.5.28 |
| node_modules/js-yaml | 4.1.1 | 4.3.2 |
| node_modules/nanoid | 3.3.12 | 3.3.20 |
| node_modules/next | 15.5.24 | 15.5.28 |
| node_modules/node-releases | 2.0.44 | 2.0.58 |
| node_modules/postcss | 8.5.14 | 8.5.30 |
| node_modules/postcss-selector-parser | 6.1.2 | 7.1.6 |
| node_modules/semver | 7.8.0 | 7.8.5 |
| node_modules/sharp | 0.34.5 | 0.35.5 |
| node_modules/source-map-js | 1.2.1 | 1.2.2 |
| node_modules/update-browserslist-db | 1.2.3 | 1.3.4 |
| node_modules/next/node_modules/postcss | 8.4.31 | removed / deduplicated |
