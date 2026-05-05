import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "todo", message: "Endpoint placeholder" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ status: "todo", message: "Endpoint placeholder" }, { status: 501 });
}

