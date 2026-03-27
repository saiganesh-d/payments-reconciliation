import { NextResponse } from "next/server";

export async function GET() {
  const phone = process.env.WHATSAPP_NUMBER;
  const message = process.env.WHATSAPP_MESSAGE || "";

  if (!phone) {
    return new NextResponse("Contact unavailable", { status: 503 });
  }

  const url = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;

  return NextResponse.redirect(url, 302);
}
