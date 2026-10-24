import { NextResponse } from "next/server";
import { lookupBarcode } from "@/lib/food/catalog";
import { limited, tooMany } from "@/lib/food/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: Request, { params }: { params: { code: string } }) {
  if (limited(req, "barcode", 30)) return tooMany();
  const code = params.code.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) return NextResponse.json({ error: "Enter an 8 to 14 digit barcode." }, { status: 400 });
  const { food, notices } = await lookupBarcode(code);
  if (!food) return NextResponse.json({ error: "No product found for that barcode.", notices }, { status: 404 });
  return NextResponse.json({ food, notices });
}
