"""Shared frontend helpers loaded on every page.

Provides the XSRF token + a fetch wrapper that sends it automatically, so
Tornado's xsrf_cookies protection can stay enabled for JSON endpoints.
"""

function olkilCookie(name) {
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function olkilXsrfToken() {
  const meta = document.querySelector('meta[name="_xsrf"]');
  return (meta && meta.content) || olkilCookie("_xsrf") || "";
}

// Drop-in replacement for fetch() that attaches the XSRF header on writes.
function apiFetch(url, options = {}) {
  const opts = Object.assign({ credentials: "same-origin" }, options);
  const method = (opts.method || "GET").toUpperCase();
  const headers = new Headers(opts.headers || {});

  if (method !== "GET" && method !== "HEAD") {
    const token = olkilXsrfToken();
    if (token) headers.set("X-Xsrftoken", token);
    if (!headers.has("Content-Type") && opts.body instanceof FormData === false) {
      headers.set("Content-Type", "application/json");
    }
  }
  opts.headers = headers;
  return fetch(url, opts);
}

// Post JSON and parse the JSON response; throws on network/parse errors.
async function apiPost(url, payload) {
  const res = await apiFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : {} };
  } catch (err) {
    return { ok: res.ok, status: res.status, data: { success: false, error: "Bad response" } };
  }
}

// Clear the session server-side and go back to the login page.
async function olkilLogout() {
  try {
    await apiPost("/logout", {});
  } catch (err) {
    /* ignore */
  }
  window.location.href = "/";
}