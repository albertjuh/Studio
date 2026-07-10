
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PartoMa Project - Global Access Middleware
 * 
 * Implements a dynamic maintenance mode. 
 * Checks Firestore via REST API for edge compatibility.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets, next internals, and login/api routes
  if (
    pathname.startsWith('/anc/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Check for Maintenance Mode
  // We use the Firestore REST API because standard SDK is not edge-compatible
  try {
    const projectId = 'nutshell-insights';
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/system_config/maintenance`,
      { next: { revalidate: 30 } } // Cache for 30 seconds
    );
    
    if (res.ok) {
      const data = await res.json();
      const isMaintenanceMode = data?.fields?.enabled?.booleanValue === true;

      if (isMaintenanceMode) {
        // 3. Admin Bypass Check
        // Admins set an 'admin_bypass' cookie during login
        const isAdmin = request.cookies.get('admin_bypass')?.value === 'true';
        
        if (!isAdmin) {
          // Return the Maintenance Page (503 Service Unavailable)
          return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Site Offline | PartoMa Project</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: #0f172a;
                        color: white;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        text-align: center;
                    }
                    .container {
                        max-width: 400px;
                        padding: 2rem;
                    }
                    h1 {
                        font-size: 2.5rem;
                        font-weight: 900;
                        letter-spacing: -0.05em;
                        margin-bottom: 0.5rem;
                        color: #10b981;
                    }
                    .status {
                        font-size: 0.7rem;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 0.3em;
                        color: #94a3b8;
                        margin-bottom: 2rem;
                    }
                    .message-box {
                        padding: 1.5rem;
                        border: 2px dashed #1e293b;
                        border-radius: 1.5rem;
                        background: rgba(255, 255, 255, 0.02);
                    }
                    p {
                        font-size: 0.875rem;
                        line-height: 1.5;
                        color: #cbd5e1;
                        margin: 0;
                    }
                    .icon {
                        margin-bottom: 1.5rem;
                        font-size: 3rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">🔒</div>
                    <h1>SITE OFFLINE</h1>
                    <div class="status">Protocol Sync Active</div>
                    <div class="message-box">
                        <p>The PartoMa clinical database is temporarily locked for scheduled administrative maintenance. Normal operations will resume shortly.</p>
                    </div>
                </div>
            </body>
            </html>`,
            {
              status: 503,
              headers: { 'content-type': 'text/html' },
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Middleware Maintenance Check Error:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/anc/:path*',
};
