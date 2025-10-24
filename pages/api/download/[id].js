export default function handler(req, res) {
  const { id } = req.query;

  // mock file download
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ message: `Downloaded bill with ID: ${id}` });
}
