import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "120px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: 44 }}>Page not found</h1>
      <p className="lede" style={{ margin: "12px auto 28px" }}>Miso may have knocked it off the desk.</p>
      <Link href="/" className="btn lg primary">Back home</Link>
    </div>
  );
}
