import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const response = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SID!,
      to,
    });

    return NextResponse.json({ success: true, sid: response.sid });
  } catch (error: any) {
    console.error("❌ Twilio SMS Error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
