# Architecture decisions

## 2026-11-11: Use Nginx for the container runtime

The application performs AI requests and formula rendering in the browser. The
production Node.js server only serves static files, a health response, and a 404
response for retired API routes. Keep Node.js in the build stage and for local
development; use a non-root, single-worker Nginx process in the final image.
Keep port 3000, relative asset paths, security headers, and API responses. Use
BusyBox wget for healthchecks rather than launching Node.js every 30 seconds.

Reducing the V8 heap was rejected because it retains the unnecessary runtime and
does not cap total process memory. A hard container memory limit was rejected as
the primary fix because it can cause OOM kills without reducing application work.
An additional proxy container is unnecessary; the runtime image itself serves HTTP.

Tradeoffs: Docker and the local Node.js preview use different HTTP servers, so the
release workflow smoke-tests the actual container. Adding server-side features in
future requires revisiting this decision. VPS memory measurements may differ from
the WSL2 comparison. The stable-alpine base tag follows upstream stable releases.

Nginx configuration references:
- https://nginx.org/en/docs/ngx_core_module.html
- https://nginx.org/en/docs/http/ngx_http_core_module.html
