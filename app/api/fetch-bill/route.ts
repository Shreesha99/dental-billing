import { NextRequest, NextResponse } from "next/server";
import { getBillMetadata } from "../../../lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const bill = await getBillMetadata(id);
    return NextResponse.json(bill);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
}
