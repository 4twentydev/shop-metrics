import { NextResponse } from "next/server";

// Better Auth catch-all removed. Auth is now handled by:
//   POST /api/auth/sign-in
//   POST /api/auth/sign-out
export function GET() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
