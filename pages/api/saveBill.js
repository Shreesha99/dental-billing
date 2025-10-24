export default async function handler(req, res) {
  if (req.method === "POST") {
    const bill = req.body;
    // simulate DB save
    console.log("Bill saved:", bill);
    res.status(200).json({ message: "Bill saved successfully", bill });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
