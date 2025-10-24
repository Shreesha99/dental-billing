// app/api/get-all-bills/route.ts
import { NextResponse } from "next/server";
import { getDocs, collection, getFirestore } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

export async function GET() {
  try {
    const db = getFirestore(firebaseApp);
    const billsCol = collection(db, "bills");
    const snapshot = await getDocs(billsCol);
    const bills = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(bills);
  } catch (error) {
    console.error("Firestore error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
