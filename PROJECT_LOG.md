# Project log

## [2026-11-11 14:23 +08:00]

### Goal
Reduce VPS container memory use and release version 1.0.1 after validation.

### Findings
The Node.js server serves only static files, a health endpoint and retired API
responses. Browser code performs AI requests and formula rendering. Each old
Compose healthcheck launches another Node.js process. The Windows host has no
Docker executable; the user authorized testing in WSL2 Ubuntu, which has Docker.

### Actions
Replaced the container runtime with non-root, single-worker Nginx and wget
healthchecks. Kept Node.js development and build workflows. Added runtime smoke
checks to the release workflow and normalized that file's malformed CRCRLF line
endings. Updated deployment instructions, architecture notes and version numbers.
Built the old runtime from HEAD:Dockerfile for comparison against the new image.

### Modified Files
- Dockerfile, nginx.conf: lightweight static runtime and built-in healthcheck.
- compose.yaml, compose.hub.yaml: wget healthchecks with a startup grace period.
- scripts/container-smoke.mjs, package.json: standalone container smoke command.
- .github/workflows/docker-publish.yml: run smoke checks before publishing.
- package.json, package-lock.json: version 1.0.1.
- README.md: deployment changes, update commands and measured results.
- DECISIONS.md, PROJECT_LOG.md: rationale and validation evidence.

### Result
13 unit tests and the frontend build passed. WSL2 container checks passed for
HTML, JS, CSS, bundled fonts, headers, API 404 JSON, wget healthchecks and non-root
execution. A real Nginx reverse proxy also passed /txt2latex/ page, JS, CSS and
health checks. Both Compose configurations and workflow YAML parsed successfully.
The build retains its existing advisory about the frontend chunk exceeding 500 kB.

For both images: linux/amd64, --init, 500 requests each with concurrency 10,
followed by automatic healthchecks. Three successive docker stats samples after
healthchecks were 38.73 MiB for Node.js and 5.254 MiB for Nginx (about 86% lower).
Both containers were healthy. Old Node.js process RSS was 82,812 KiB; RSS and
Docker working-set statistics are different metrics. Temporary test containers
were removed. No VPS deployment was changed.

### Next
Commit and push v1.0.1 as requested; monitor the image publication workflow.
Update the VPS image and Compose healthcheck together after publication, then
measure actual VPS memory using the same statistics command.
