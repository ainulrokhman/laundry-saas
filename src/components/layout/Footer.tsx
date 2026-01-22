/**
 * Footer component for AdminLTE layout
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="float-end d-none d-sm-block">
        <strong>Version</strong> 0.1.0
      </div>
      <strong>
        Copyright &copy; {currentYear}{" "}
        <a href="#">Laundry SaaS Platform</a>.
      </strong>{" "}
      All rights reserved.
    </footer>
  );
}
