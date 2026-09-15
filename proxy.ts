// Optional HTTP Basic Auth for the whole dashboard (it shows health data).
// Set DASHBOARD_PASSWORD to turn it on — the browser shows a login prompt and
// any username works. /api/cron is excluded because Vercel Cron authenticates
// with its own `Authorization: Bearer <CRON_SECRET>` header.

import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice("Basic ".length));
      if (decoded.slice(decoded.indexOf(":") + 1) === password) {
        return NextResponse.next();
      }
    } catch {
      // Malformed base64 — fall through to the login prompt.
    }
  }

  return new NextResponse("Login diperlukan", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dashboard Lari", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico).*)"],
};
