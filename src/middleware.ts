import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client from request cookies
  let isAdmin = false;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return request.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    isAdmin = data.user?.email === process.env.ADMIN_EMAIL;
  } catch {
    // Auth check failed — treat as unauthenticated
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
