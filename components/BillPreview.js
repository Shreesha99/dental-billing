export default function BillPreview({ data }) {
  return (
    <div className="bill-preview">
      <h2>Bill Preview</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
