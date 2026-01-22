"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout";
import { Card, Button } from "@/components/common";

/**
 * Outlet DTO from API
 */
interface OutletDTO {
  id: string;
  name: string;
  slug: string;
  address: string;
  bankInfo: string | null;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    users: number;
    orders: number;
    services: number;
  };
}

/**
 * API Response
 */
interface OutletsResponse {
  success: boolean;
  data: OutletDTO[];
  message: string;
}

/**
 * Outlets List Page
 * SuperAdmin only - displays all outlets in the system
 */
export default function OutletsPage() {
  const [outlets, setOutlets] = useState<OutletDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch outlets on mount
  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/outlets", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("Access denied. SuperAdmin role required.");
        } else {
          setError("Failed to fetch outlets");
        }
        return;
      }

      const data: OutletsResponse = await response.json();

      if (data.success) {
        setOutlets(data.data);
      } else {
        setError(data.message || "Failed to fetch outlets");
      }
    } catch (err) {
      console.error("Error fetching outlets:", err);
      setError("An error occurred while fetching outlets");
    } finally {
      setLoading(false);
    }
  };

  // Filter outlets based on search term
  const filteredOutlets = outlets.filter((outlet) => {
    const search = searchTerm.toLowerCase();
    return (
      outlet.name.toLowerCase().includes(search) ||
      outlet.slug.toLowerCase().includes(search) ||
      outlet.address.toLowerCase().includes(search)
    );
  });

  return (
    <DashboardLayout>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Outlets Management</h1>
            <Button variant="primary" icon="fas fa-plus" iconPosition="left">
              Create Outlet
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search outlets by name, slug, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Outlets Table */}
      <div className="row">
        <div className="col-12">
          <Card title={`Outlets (${filteredOutlets.length})`}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading outlets...</p>
              </div>
            ) : filteredOutlets.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-store fa-3x text-muted mb-3"></i>
                <p className="text-muted">
                  {searchTerm
                    ? "No outlets found matching your search"
                    : "No outlets found"}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Statistics</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutlets.map((outlet) => (
                      <tr key={outlet.id}>
                        <td>
                          <strong>{outlet.name}</strong>
                        </td>
                        <td>
                          <code className="text-primary">{outlet.slug}</code>
                        </td>
                        <td>{outlet.address}</td>
                        <td>
                          {outlet.isPro ? (
                            <span className="badge bg-success">
                              <i className="fas fa-crown me-1"></i>
                              Pro
                            </span>
                          ) : (
                            <span className="badge bg-secondary">Free</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-3">
                            <small className="text-muted">
                              <i className="fas fa-users me-1"></i>
                              {outlet.stats.users} users
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-shopping-cart me-1"></i>
                              {outlet.stats.orders} orders
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-concierge-bell me-1"></i>
                              {outlet.stats.services} services
                            </small>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(outlet.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </small>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              type="button"
                              className="btn btn-sm btn-info"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-warning"
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
