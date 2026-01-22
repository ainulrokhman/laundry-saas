import { DashboardLayout } from "@/components/layout";
import { Card, InfoBox, Button } from "@/components/common";

/**
 * Dashboard page
 * Main dashboard with statistics and overview
 */
export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Dashboard</h1>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="row mb-4">
        <div className="col-md-3">
          <InfoBox
            title="Orders Today"
            value="12"
            icon="fas fa-shopping-cart"
            color="info"
          />
        </div>
        <div className="col-md-3">
          <InfoBox
            title="Revenue Today"
            value="Rp 1.250.000"
            icon="fas fa-money-bill-wave"
            color="success"
          />
        </div>
        <div className="col-md-3">
          <InfoBox
            title="Pending Orders"
            value="5"
            icon="fas fa-clock"
            color="warning"
          />
        </div>
        <div className="col-md-3">
          <InfoBox
            title="Failed Orders"
            value="0"
            icon="fas fa-exclamation-triangle"
            color="danger"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="row">
        <div className="col-md-6">
          <Card title="Recent Orders" className="card-primary">
            <p>Recent orders will be displayed here.</p>
            <Button variant="primary" icon="fas fa-plus" iconPosition="left">
              New Order
            </Button>
          </Card>
        </div>
        <div className="col-md-6">
          <Card title="Quick Actions">
            <div className="d-flex flex-column gap-2">
              <Button variant="success" icon="fas fa-plus" iconPosition="left">
                Create Order
              </Button>
              <Button variant="info" icon="fas fa-concierge-bell" iconPosition="left">
                Manage Services
              </Button>
              <Button variant="warning" icon="fas fa-users" iconPosition="left">
                Manage Users
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
