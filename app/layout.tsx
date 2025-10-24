import "./globals.css";
import BootstrapLoader from "../components/BootstrapLoader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-light text-dark d-flex flex-column min-vh-100">
        <BootstrapLoader />

        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
          <div className="container">
            <a className="navbar-brand fw-bold mx-auto" href="#">
              🦷 Dentist Billing
            </a>
          </div>
        </nav>

        {/* Main */}
        <main className="container grow py-5">{children}</main>

        {/* Footer */}
        <footer className="bg-dark text-light text-center py-3 mt-auto">
          <p className="mb-0 small">
            © {new Date().getFullYear()} Dentist Billing System. All rights
            reserved.
          </p>
        </footer>
      </body>
    </html>
  );
}
