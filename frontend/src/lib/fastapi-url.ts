import "server-only";

// Next.js talks to the independently hosted Python API; the browser uses Next routes.
export function fastapiBaseUrl() {
  const configured = process.env.FASTAPI_BASE_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("FASTAPI_BASE_URL must point to the hosted Python service");
  }
  const url = new URL(configured || "http://127.0.0.1:8000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("FASTAPI_BASE_URL must be a service origin without credentials, query or path");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Hosted Python service must use HTTPS");
  }
  return url.origin;
}
