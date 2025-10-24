import { NextRequest, NextResponse } from "next/server";
import { saveBillMetadata } from "../../../lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { patientName, consultations } = await req.json();
    if (!patientName || !consultations) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const id = await saveBillMetadata(patientName, consultations);
    return NextResponse.json({ id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save bill" }, { status: 500 });
  }
}
