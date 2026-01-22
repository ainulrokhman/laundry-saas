/**
 * Footer component following AdminLTE 4 structure
 * Structure: app-footer
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="float-end d-none d-sm-inline">
        <strong>Version</strong> 0.1.0
      </div>
      <div>
        <strong>
          Copyright &copy; {currentYear}{" "}
          <a href="/dashboard" className="text-decoration-none">
            Laundry SaaS Platform
          </a>
          .
        </strong>{" "}
        All rights reserved.
      </div>
    </footer>
  );
}
