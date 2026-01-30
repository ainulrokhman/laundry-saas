"use client";

/**
 * POS Fullscreen - Buat Order Baru (OWNER/STAFF)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatCurrency } from "@/lib/utils";
import styles from "./pos-fullscreen.module.css";

type ServiceType = "KILOAN" | "SATUAN" | "PAKET";

type PosService = {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  unit: string | null;
  description: string | null;
  isActive: boolean;
};

type CartItem = {
  key: string;
  serviceId: string;
  serviceName: string;
  serviceType: ServiceType;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
};

function defaultQuantity(type: ServiceType): number {
  return type === "KILOAN" ? 1 : 1;
}

function typeLabel(type: ServiceType): string {
  if (type === "KILOAN") return "Kiloan";
  if (type === "SATUAN") return "Satuan";
  return "Paket";
}

function allowDecimalQty(type: ServiceType): boolean {
  return type === "KILOAN";
}

export default function NewOrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<PosService[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [items, setItems] = useState<CartItem[]>([]);

  // Customer State
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Umum");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Customer Search State
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  // Inline Add Customer State
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment State
  const [paymentType, setPaymentType] = useState<"lunas" | "dp">("lunas");
  const [dpAmountDigits, setDpAmountDigits] = useState<string>("0");
  const [cashReceivedDigits, setCashReceivedDigits] = useState<string>("0");

  // Adjustment State
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

  // Fullscreen Detection
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if (role !== "OWNER" && role !== "STAFF") {
        router.push("/dashboard");
        return;
      }
      if (!user?.outletId) {
        setError("Outlet context required. Silakan hubungi admin.");
        setLoading(false);
        return;
      }

      setLoading(false);
      void fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  async function fetchServices() {
    try {
      setServiceLoading(true);
      const res = await fetch("/api/dashboard/pos/services", { method: "GET" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Gagal memuat layanan");
      }
      const list: PosService[] = Array.isArray(json.data) ? json.data : [];
      setServices(list.filter((s) => s.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat layanan");
    } finally {
      setServiceLoading(false);
    }
  }

  // Fetch recent customers when modal opens
  useEffect(() => {
    if (showCustomerSearch && recentCustomers.length === 0) {
      void fetchRecentCustomers();
    }
  }, [showCustomerSearch]);

  // Customer Search Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCustomerSearch && customerSearchQuery.trim().length > 0) {
        void searchCustomers(customerSearchQuery);
      } else {
        setSearchedCustomers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, showCustomerSearch]);

  async function fetchRecentCustomers() {
    try {
      const res = await fetch(`/api/dashboard/customers?limit=10`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        setRecentCustomers(json.data);
      }
    } catch (e) {
      console.error("Fetch recent customers error", e);
    }
  }

  async function searchCustomers(query: string) {
    try {
      setCustomerSearchLoading(true);
      const res = await fetch(
        `/api/dashboard/customers?search=${encodeURIComponent(query)}&limit=10`,
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        setSearchedCustomers(json.data);
      } else {
        setSearchedCustomers([]);
      }
    } catch (e) {
      console.error("Customer search error", e);
      setSearchedCustomers([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }

  async function handleAddCustomer() {
    if (!newCustomerName.trim()) return;
    setAddingCustomer(true);
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        // Select the newly created customer
        selectCustomer(json.data);
        setNewCustomerName("");
        setNewCustomerPhone("");
        setShowAddCustomerForm(false);
        // Refresh recent customers
        void fetchRecentCustomers();
      } else {
        alert(json?.message || "Gagal menambah pelanggan");
      }
    } catch (e) {
      alert("Gagal menambah pelanggan");
    } finally {
      setAddingCustomer(false);
    }
  }

  function selectCustomer(c: any) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
    if (c.address) {
      // Optional: populate address if we had a field for it or append to notes
      // setNotes(prev => prev ? `${prev}\nAlamat: ${c.address}` : `Alamat: ${c.address}`);
    }
    setShowCustomerSearch(false);
    setCustomerSearchQuery("");
  }

  function clearResultCustomer() {
    setCustomerId(null);
    setCustomerName("Umum");
    setCustomerPhone("");
  }

  // Filter services by search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        typeLabel(s.type).toLowerCase().includes(q),
    );
  }, [services, searchQuery]);

  // Paginated services
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredServices.slice(start, end);
  }, [filteredServices, currentPage]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const totals = useMemo(() => {
    const rows = items.map((it) => ({
      ...it,
      subtotal: Math.round(it.quantity * it.unitPrice),
    }));
    const subtotalAmount = rows.reduce((sum, r) => sum + r.subtotal, 0);
    const totalAmount = subtotalAmount + adjustmentAmount;
    return { rows, subtotalAmount, totalAmount };
  }, [items, adjustmentAmount]);

  function addService(service: PosService) {
    setItems((prev) => {
      // Check if service already exists in cart
      const existingItemIndex = prev.findIndex(
        (item) => item.serviceId === service.id,
      );

      if (existingItemIndex !== -1) {
        // If exists, increment quantity
        const newItems = [...prev];
        const incrementAmount = allowDecimalQty(service.type) ? 0.1 : 1;
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity:
            Math.round(
              (newItems[existingItemIndex].quantity + incrementAmount) * 10,
            ) / 10,
        };
        return newItems;
      } else {
        // If not exists, add new item
        const key = `${service.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return [
          ...prev,
          {
            key,
            serviceId: service.id,
            serviceName: service.name,
            serviceType: service.type,
            serviceUnit: service.unit ?? null,
            quantity: defaultQuantity(service.type),
            unitPrice: Math.round(service.price),
          },
        ];
      }
    });
  }

  function updateItemQuantity(key: string, delta: number) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.key !== key) return x;
        const newQty = Math.round((x.quantity + delta) * 10) / 10;
        const minQty = allowDecimalQty(x.serviceType) ? 0.1 : 1;
        if (newQty < minQty) return x;
        return { ...x, quantity: newQty };
      }),
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }

  function setItemQuantity(key: string, value: number) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.key !== key) return x;
        const minQty = allowDecimalQty(x.serviceType) ? 0.1 : 1;
        const newQty = Math.max(minQty, Math.round(value * 10) / 10);
        return { ...x, quantity: newQty };
      }),
    );
  }

  function toDigitsOnly(val: string) {
    return val.replace(/\D/g, "");
  }

  function parseIdrFromDigits(digits: string) {
    return parseInt(digits || "0", 10);
  }

  // Payment Calculations
  const dpAmount =
    paymentType === "dp" ? parseIdrFromDigits(dpAmountDigits) : 0;
  const cashReceived = parseIdrFromDigits(cashReceivedDigits);

  const totalAmount = totals.totalAmount; // Use totals.totalAmount which includes adjustment
  const amountToPay = paymentType === "lunas" ? totalAmount : dpAmount;
  const remainingAmount = Math.max(0, totalAmount - amountToPay);
  const changeDue = Math.max(0, cashReceived - amountToPay);
  const shortfall = Math.max(0, amountToPay - cashReceived);

  function handleOpenPayment() {
    if (items.length === 0) {
      alert("Pilih minimal satu layanan");
      return;
    }
    setShowPaymentModal(true);
  }

  async function handleSubmit() {
    if (submitting) return;

    // Validation for DP
    if (paymentType === "dp" && dpAmount > totalAmount) {
      alert("Nominal DP tidak boleh melebihi total tagihan");
      return;
    }

    setSubmitting(true);
    try {
      // Jika pelanggan "Umum", tidak perlu kirim nama/id
      const isUmum =
        !customerId && (!customerName.trim() || customerName.trim() === "Umum");

      const payload = {
        customerId: customerId || undefined, // Relasi ke Customer (null = pelanggan umum)
        customerName: isUmum ? undefined : customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          serviceId: it.serviceId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        paid: paymentType === "lunas" && shortfall === 0,
        paymentNote: paymentNote.trim() || undefined,
        dpAmount: paymentType === "dp" ? dpAmount : undefined,
      };

      const res = await fetch("/api/dashboard/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Gagal membuat order");
      }

      const trackingCode = String(json?.data?.trackingCode || "");
      await Swal.fire({
        icon: "success",
        title: "Order berhasil dibuat",
        html: trackingCode
          ? `Kode tracking: <code>${trackingCode}</code><br/>Simpan kode ini untuk pelanggan.`
          : "Order berhasil dibuat.",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });

      // Clear cart and reset form - stay on POS page
      setItems([]);
      setCustomerId(null);
      setCustomerName("Umum");
      setCustomerPhone("");
      setNotes("");
      setPaymentNote("");
      setPaymentType("lunas");
      setDpAmountDigits("0");
      setCashReceivedDigits("0");
      setAdjustmentAmount(0);
      setShowPaymentModal(false);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: e instanceof Error ? e.message : "Gagal membuat order",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className={styles.posContainer}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Memuat POS...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.posContainer}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>
            <i className="fas fa-cash-register"></i>
            KASIR
          </h1>
          <button
            className={styles.exitButton}
            onClick={() => router.push("/dashboard/orders")}
          >
            <i className="fas fa-times me-1"></i>
            Keluar
          </button>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div className="alert alert-danger">
            <h4 className="alert-heading">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Error!
            </h4>
            <p>{error}</p>
            <hr />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void fetchServices()}
            >
              <i className="fas fa-redo me-1"></i>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Landscape hint for mobile portrait */}
      <div className={styles.landscapeHint}>
        <i className="fas fa-mobile-alt"></i>
        <h3>Putar Layar ke Landscape</h3>
        <p>Untuk pengalaman terbaik, gunakan mode landscape (horizontal)</p>
      </div>

      <div className={styles.posContainer}>
        {/* Header - Ultra Compact */}
        <div
          className="d-flex justify-content-between align-items-center px-2 text-white"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            height: "28px",
            minHeight: "28px",
          }}
        >
          <span
            className="fw-semibold d-flex align-items-center gap-1"
            style={{ fontSize: "0.7rem" }}
          >
            <i
              className="fas fa-cash-register"
              style={{ fontSize: "0.65rem" }}
            ></i>
            KASIR
          </span>
          <button
            className="btn btn-sm border-0 text-white py-0 px-1"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              fontSize: "0.65rem",
              lineHeight: 1,
            }}
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                router.push("/dashboard/orders");
              }
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Main Content - 2 Columns */}
        <div className={styles.mainContent}>
          {/* Left Panel - Services List */}
          <div className="bg-white d-flex flex-column overflow-hidden border-end">
            {/* Search Bar - Compact */}
            <div className="p-2 border-bottom bg-light">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Cari layanan..."
                style={{ fontSize: "0.75rem" }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Services Grid */}
            <div className={styles.servicesGrid}>
              {serviceLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Memuat layanan...</p>
                </div>
              ) : paginatedServices.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#95a5a6",
                  }}
                >
                  <i
                    className="fas fa-inbox"
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      opacity: 0.5,
                    }}
                  ></i>
                  <p>
                    {searchQuery
                      ? "Tidak ada layanan ditemukan"
                      : "Belum ada layanan"}
                  </p>
                </div>
              ) : (
                paginatedServices.map((service) => (
                  <div
                    key={service.id}
                    className={styles.serviceCard}
                    onClick={() => addService(service)}
                  >
                    <div className={styles.serviceCardName}>{service.name}</div>
                    <div className={styles.serviceCardPrice}>
                      {formatCurrency(service.price)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination - Compact */}
            {filteredServices.length > itemsPerPage && (
              <div className="d-flex justify-content-between align-items-center px-2 py-1 border-top bg-light">
                <button
                  className="btn btn-sm btn-outline-secondary py-0 px-2"
                  style={{ fontSize: "0.7rem" }}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                  {currentPage}/{totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary py-0 px-2"
                  style={{ fontSize: "0.7rem" }}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Order Summary (Prioritized) */}
          <div
            className="d-flex flex-column h-100"
            style={{ background: "#f0f4ff" }}
          >
            {/* Customer Section - Compact */}
            <div
              className="bg-white px-2 py-1 border-bottom flex-shrink-0 d-flex justify-content-between align-items-center"
              style={{ borderLeft: "3px solid #667eea" }}
            >
              <div
                className="d-flex align-items-center gap-2"
                style={{ cursor: "pointer" }}
                onClick={() => setShowCustomerSearch(true)}
              >
                <div
                  className={`rounded-circle bg-light d-flex align-items-center justify-content-center ${customerId ? "text-primary" : "text-secondary"}`}
                  style={{ width: 28, height: 28, fontSize: "0.7rem" }}
                >
                  <i className="fas fa-user"></i>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: "0.6rem" }}>
                    Pelanggan
                  </div>
                  <div
                    className="fw-semibold text-dark text-truncate"
                    style={{ maxWidth: "120px", fontSize: "0.75rem" }}
                  >
                    {customerName || "Umum"}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-sm btn-light text-primary rounded-circle p-0"
                  style={{ width: "24px", height: "24px", fontSize: "0.65rem" }}
                  onClick={() => setShowCustomerSearch(true)}
                  title="Cari Pelanggan"
                >
                  <i className="fas fa-search"></i>
                </button>
                <button
                  className="btn btn-sm btn-light text-danger rounded-circle p-0"
                  style={{ width: "24px", height: "24px", fontSize: "0.65rem" }}
                  onClick={clearResultCustomer}
                  title="Reset Pelanggan (Umum)"
                  disabled={!customerId && customerName === "Umum"}
                >
                  <i className="fas fa-eraser"></i>
                </button>
              </div>
            </div>

            {/* Cart Section - Scrollable */}
            <div
              className={`flex-grow-1 overflow-auto bg-white mx-2 mt-2 rounded shadow-sm ${styles.cartSection}`}
              style={{ minHeight: 0 }}
            >
              {items.length === 0 ? (
                <div className="p-2">
                  <div className="alert alert-success border-0 bg-success bg-opacity-10 rounded-3 py-2 px-3 mb-0">
                    <div className="d-flex align-items-center gap-1 mb-2 text-success">
                      <i
                        className="fas fa-info-circle"
                        style={{ fontSize: "0.8rem" }}
                      ></i>
                      <span className="fw-bold" style={{ fontSize: "0.75rem" }}>
                        Petunjuk
                      </span>
                    </div>
                    <ul
                      className="ps-3 mb-0 text-success"
                      style={{ listStyleType: "disc", fontSize: "0.7rem" }}
                    >
                      <li className="mb-1">Pilih layanan dari panel kiri</li>
                      <li className="mb-1">
                        Klik pelanggan untuk mengganti nama
                      </li>
                      <li>
                        Klik <i className="fas fa-trash-alt mx-1"></i> untuk
                        hapus item
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  {totals.rows.map((item) => (
                    <div key={item.key} className={styles.cartItem + " px-2"}>
                      {/* Row 1: Title */}
                      <div className={styles.cartItemTitle}>
                        {item.serviceName}
                      </div>

                      {/* Row 2: Price & Controls */}
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <div className={styles.cartItemPrice}>
                          {formatCurrency(item.unitPrice)}
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          {/* Qty Controls */}
                          <div
                            className="d-flex align-items-center bg-light rounded"
                            style={{ border: "1px solid #e2e8f0" }}
                          >
                            <button
                              className="btn btn-sm d-flex align-items-center justify-content-center p-0 text-muted"
                              style={{
                                width: "20px",
                                height: "20px",
                                background: "#e2e8f0",
                                border: "none",
                                fontSize: "0.75rem",
                              }}
                              onClick={() =>
                                updateItemQuantity(
                                  item.key,
                                  allowDecimalQty(item.serviceType) ? -0.1 : -1,
                                )
                              }
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className={`text-center fw-semibold border-0 bg-transparent ${styles.quantityInput}`}
                              style={{
                                width: "32px",
                                fontSize: "0.75rem",
                                color: "#334155",
                                height: "20px",
                              }}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  setItemQuantity(item.key, val);
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val <= 0) {
                                  setItemQuantity(
                                    item.key,
                                    allowDecimalQty(item.serviceType) ? 0.1 : 1,
                                  );
                                }
                              }}
                              step={allowDecimalQty(item.serviceType) ? 0.1 : 1}
                              min={allowDecimalQty(item.serviceType) ? 0.1 : 1}
                            />
                            <button
                              className="btn btn-sm d-flex align-items-center justify-content-center p-0 text-muted"
                              style={{
                                width: "20px",
                                height: "20px",
                                background: "#e2e8f0",
                                border: "none",
                                fontSize: "0.75rem",
                              }}
                              onClick={() =>
                                updateItemQuantity(
                                  item.key,
                                  allowDecimalQty(item.serviceType) ? 0.1 : 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div
                            className="fw-bold text-dark text-end"
                            style={{ fontSize: "0.75rem", minWidth: "65px" }}
                          >
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </div>

                          {/* Trash */}
                          <button
                            className="btn btn-sm text-danger p-0 d-flex align-items-center justify-content-center"
                            style={{
                              width: "18px",
                              height: "20px",
                              border: "none",
                              background: "none",
                              fontSize: "0.7rem",
                            }}
                            onClick={() => removeItem(item.key)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Summary & Payment Section - Compact on Mobile */}
            <div className={styles.summarySection}>
              {/* Sub Total & Adjustment Row */}
              <div
                className="d-flex justify-content-between align-items-center text-white"
                style={{ fontSize: "0.65rem", opacity: 0.9 }}
              >
                <span>{formatCurrency(totals.subtotalAmount)}</span>
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center p-0"
                    style={{
                      width: "14px",
                      height: "14px",
                      background: "rgba(255,255,255,0.3)",
                      color: "white",
                      border: "none",
                      fontSize: "0.6rem",
                      borderRadius: "3px",
                    }}
                    onClick={() => setAdjustmentAmount((prev) => prev - 100)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="text-center border-0 py-0"
                    style={{
                      width: "40px",
                      fontSize: "0.6rem",
                      height: "14px",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: "2px",
                      color: "#333",
                    }}
                    value={adjustmentAmount}
                    onChange={(e) =>
                      setAdjustmentAmount(Number(e.target.value) || 0)
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-sm d-flex align-items-center justify-content-center p-0"
                    style={{
                      width: "14px",
                      height: "14px",
                      background: "rgba(255,255,255,0.3)",
                      color: "white",
                      border: "none",
                      fontSize: "0.6rem",
                      borderRadius: "3px",
                    }}
                    onClick={() => setAdjustmentAmount((prev) => prev + 100)}
                  >
                    +
                  </button>
                </div>
              </div>
              {/* Total */}
              <div className="d-flex justify-content-between align-items-center text-white">
                <span className="fw-bold" style={{ fontSize: "0.75rem" }}>
                  TOTAL
                </span>
                <span className="fw-bold" style={{ fontSize: "1rem" }}>
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              className={`btn d-flex align-items-center justify-content-center gap-1 ${styles.paymentButton}`}
              onClick={handleOpenPayment}
              disabled={items.length === 0}
            >
              <i className="fas fa-money-bill-wave"></i>
              Bayar {formatCurrency(totals.totalAmount)}
            </button>
          </div>
        </div>

        {/* Customer Search Modal - Compact for Mobile */}
        {showCustomerSearch && (
          <>
            <div
              className="modal-backdrop fade show"
              style={{ zIndex: 1050 }}
            ></div>
            <div
              className="modal fade show d-block"
              tabIndex={-1}
              style={{ zIndex: 1055 }}
            >
              <div
                className="modal-dialog modal-dialog-centered modal-sm"
                style={{ margin: "0.5rem auto" }}
              >
                <div className="modal-content" style={{ maxHeight: "85vh" }}>
                  {/* Header - Ultra Compact */}
                  <div
                    className="modal-header py-1 px-2"
                    style={{ minHeight: "auto" }}
                  >
                    <span
                      className="fw-semibold"
                      style={{ fontSize: "0.7rem" }}
                    >
                      <i
                        className="fas fa-user me-1"
                        style={{ fontSize: "0.6rem" }}
                      ></i>
                      Pelanggan
                    </span>
                    <button
                      type="button"
                      className="btn-close p-1"
                      style={{
                        fontSize: "0.5rem",
                        width: "16px",
                        height: "16px",
                        backgroundSize: "8px",
                      }}
                      onClick={() => {
                        setShowCustomerSearch(false);
                        setShowAddCustomerForm(false);
                      }}
                    ></button>
                  </div>

                  <div
                    className="modal-body p-2"
                    style={{ overflowY: "auto", maxHeight: "70vh" }}
                  >
                    {/* Toggle: Search / Add - Ultra Compact */}
                    <div className="btn-group w-100 mb-2" role="group">
                      <button
                        type="button"
                        className={`btn ${!showAddCustomerForm ? "btn-primary" : "btn-outline-primary"}`}
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.2rem 0.4rem",
                        }}
                        onClick={() => setShowAddCustomerForm(false)}
                      >
                        <i
                          className="fas fa-search me-1"
                          style={{ fontSize: "0.55rem" }}
                        ></i>
                        Cari
                      </button>
                      <button
                        type="button"
                        className={`btn ${showAddCustomerForm ? "btn-success" : "btn-outline-success"}`}
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.2rem 0.4rem",
                        }}
                        onClick={() => setShowAddCustomerForm(true)}
                      >
                        <i
                          className="fas fa-plus me-1"
                          style={{ fontSize: "0.55rem" }}
                        ></i>
                        Tambah
                      </button>
                    </div>

                    {/* Add Customer Form - Compact */}
                    {showAddCustomerForm ? (
                      <div>
                        <input
                          type="text"
                          className="form-control mb-1"
                          placeholder="Nama pelanggan *"
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.25rem 0.5rem",
                            height: "auto",
                          }}
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          autoFocus
                        />
                        <input
                          type="text"
                          className="form-control mb-1"
                          placeholder="No. WhatsApp (opsional)"
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.25rem 0.5rem",
                            height: "auto",
                          }}
                          value={newCustomerPhone}
                          onChange={(e) =>
                            setNewCustomerPhone(
                              e.target.value.replace(/\D/g, ""),
                            )
                          }
                          inputMode="numeric"
                        />
                        <button
                          className="btn btn-success w-100"
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.25rem 0.5rem",
                          }}
                          onClick={() => void handleAddCustomer()}
                          disabled={!newCustomerName.trim() || addingCustomer}
                        >
                          {addingCustomer ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                style={{ width: "10px", height: "10px" }}
                              ></span>
                              Simpan...
                            </>
                          ) : (
                            <>
                              <i
                                className="fas fa-check me-1"
                                style={{ fontSize: "0.55rem" }}
                              ></i>
                              Simpan & Pilih
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Search Input - Compact */}
                        <div className="input-group mb-2">
                          <span
                            className="input-group-text"
                            style={{
                              fontSize: "0.6rem",
                              padding: "0.2rem 0.4rem",
                            }}
                          >
                            <i className="fas fa-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Cari nama/telepon..."
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.25rem 0.5rem",
                              height: "auto",
                            }}
                            value={customerSearchQuery}
                            onChange={(e) =>
                              setCustomerSearchQuery(e.target.value)
                            }
                            autoFocus
                          />
                          {customerSearchQuery && (
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.6rem",
                              }}
                              onClick={() => setCustomerSearchQuery("")}
                            >
                              <i
                                className="fas fa-times"
                                style={{ fontSize: "0.65rem" }}
                              ></i>
                            </button>
                          )}
                        </div>

                        {/* Customer List - Compact */}
                        <div style={{ fontSize: "0.65rem" }}>
                          {customerSearchLoading && (
                            <div className="text-center py-1">
                              <span
                                className="spinner-border spinner-border-sm text-primary"
                                style={{ width: "12px", height: "12px" }}
                              ></span>
                            </div>
                          )}

                          {/* Show search results or recent customers */}
                          {!customerSearchLoading && (
                            <>
                              {customerSearchQuery.trim() ? (
                                // Search Results
                                searchedCustomers.length > 0 ? (
                                  <div className="list-group list-group-flush">
                                    {searchedCustomers.map((c) => (
                                      <button
                                        key={c.id}
                                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                        style={{
                                          fontSize: "0.65rem",
                                          padding: "0.3rem 0.4rem",
                                        }}
                                        onClick={() => selectCustomer(c)}
                                      >
                                        <div>
                                          <div className="fw-semibold">
                                            {c.name}
                                          </div>
                                          {c.phone && (
                                            <div
                                              className="text-muted"
                                              style={{ fontSize: "0.55rem" }}
                                            >
                                              {c.phone}
                                            </div>
                                          )}
                                        </div>
                                        <i
                                          className="fas fa-chevron-right text-muted"
                                          style={{ fontSize: "0.5rem" }}
                                        ></i>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div
                                    className="text-center text-muted py-1"
                                    style={{ fontSize: "0.6rem" }}
                                  >
                                    <div>Tidak ditemukan</div>
                                    <button
                                      className="btn btn-link p-0 mt-1"
                                      style={{ fontSize: "0.6rem" }}
                                      onClick={() => {
                                        setNewCustomerName(customerSearchQuery);
                                        setShowAddCustomerForm(true);
                                      }}
                                    >
                                      + Tambah "{customerSearchQuery}"
                                    </button>
                                  </div>
                                )
                              ) : (
                                // Recent Customers
                                <>
                                  <div
                                    className="text-muted mb-1"
                                    style={{ fontSize: "0.55rem" }}
                                  >
                                    <i className="fas fa-clock me-1"></i>
                                    Pelanggan Terakhir
                                  </div>
                                  {recentCustomers.length > 0 ? (
                                    <div className="list-group list-group-flush">
                                      {recentCustomers.map((c) => (
                                        <button
                                          key={c.id}
                                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                          style={{
                                            fontSize: "0.65rem",
                                            padding: "0.3rem 0.4rem",
                                          }}
                                          onClick={() => selectCustomer(c)}
                                        >
                                          <div>
                                            <div className="fw-semibold">
                                              {c.name}
                                            </div>
                                            {c.phone && (
                                              <div
                                                className="text-muted"
                                                style={{ fontSize: "0.55rem" }}
                                              >
                                                {c.phone}
                                              </div>
                                            )}
                                          </div>
                                          <i
                                            className="fas fa-chevron-right text-muted"
                                            style={{ fontSize: "0.5rem" }}
                                          ></i>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div
                                      className="text-center text-muted py-1"
                                      style={{ fontSize: "0.6rem" }}
                                    >
                                      Belum ada pelanggan
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer - Quick Actions - Compact */}
                  <div
                    className="modal-footer py-1 px-2"
                    style={{ minHeight: "auto" }}
                  >
                    <button
                      className="btn btn-outline-secondary w-100"
                      style={{ fontSize: "0.6rem", padding: "0.2rem 0.4rem" }}
                      onClick={() => {
                        if (customerSearchQuery.trim()) {
                          setCustomerName(customerSearchQuery);
                        }
                        setCustomerId(null);
                        setCustomerPhone("");
                        setShowCustomerSearch(false);
                        setShowAddCustomerForm(false);
                      }}
                    >
                      <i
                        className="fas fa-user-edit me-1"
                        style={{ fontSize: "0.55rem" }}
                      ></i>
                      Gunakan: "{customerSearchQuery || customerName || "Umum"}"
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show d-block" tabIndex={-1}>
              <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fas fa-cash-register me-2 text-primary"></i>
                      Pembayaran
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPaymentModal(false)}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    {/* Payment Section */}
                    <div>
                      <h6 className="fw-bold mb-2">
                        <i className="fas fa-money-bill-wave me-1 text-secondary"></i>
                        Pembayaran
                      </h6>

                      {/* Total Display */}
                      <div className="alert alert-info mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-semibold">Total Tagihan:</span>
                          <span className="fs-4 fw-bold">
                            {formatCurrency(totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Type */}
                      <div className="mb-3">
                        <label className="form-label small">
                          Tipe Pembayaran
                        </label>
                        <div className="btn-group w-100" role="group">
                          <input
                            type="radio"
                            className="btn-check"
                            name="modalPaymentType"
                            id="modalPaymentTypeLunas"
                            value="lunas"
                            checked={paymentType === "lunas"}
                            onChange={(e) =>
                              setPaymentType(e.target.value as "lunas" | "dp")
                            }
                          />
                          <label
                            className="btn btn-outline-success"
                            htmlFor="modalPaymentTypeLunas"
                          >
                            <i className="fas fa-check-circle me-1"></i>
                            Lunas
                          </label>
                          <input
                            type="radio"
                            className="btn-check"
                            name="modalPaymentType"
                            id="modalPaymentTypeDP"
                            value="dp"
                            checked={paymentType === "dp"}
                            onChange={(e) =>
                              setPaymentType(e.target.value as "lunas" | "dp")
                            }
                          />
                          <label
                            className="btn btn-outline-warning"
                            htmlFor="modalPaymentTypeDP"
                          >
                            <i className="fas fa-hand-holding-usd me-1"></i>
                            DP (Uang Muka)
                          </label>
                        </div>
                      </div>

                      {/* DP Amount */}
                      {paymentType === "dp" && (
                        <div className="mb-3">
                          <label
                            className="form-label small"
                            htmlFor="modalDpAmount"
                          >
                            Nominal DP
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">Rp</span>
                            <input
                              id="modalDpAmount"
                              className="form-control"
                              inputMode="numeric"
                              value={dpAmountDigits}
                              onChange={(e) => {
                                const digits = toDigitsOnly(e.target.value);
                                const amount = parseIdrFromDigits(digits);
                                if (amount <= totalAmount) {
                                  setDpAmountDigits(digits);
                                }
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-text small">
                            Max: {formatCurrency(totalAmount)}
                          </div>
                        </div>
                      )}

                      {/* Cash Received */}
                      <div className="mb-3">
                        <label
                          className="form-label small"
                          htmlFor="modalCashReceived"
                        >
                          Uang Diterima
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">Rp</span>
                          <input
                            id="modalCashReceived"
                            className="form-control"
                            inputMode="numeric"
                            value={cashReceivedDigits}
                            onChange={(e) =>
                              setCashReceivedDigits(
                                toDigitsOnly(e.target.value),
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="alert alert-light">
                        {paymentType === "dp" && dpAmount > 0 && (
                          <>
                            <div className="d-flex justify-content-between small mb-1">
                              <span>DP:</span>
                              <span>{formatCurrency(dpAmount)}</span>
                            </div>
                            <div className="d-flex justify-content-between small text-warning mb-2">
                              <span>Sisa:</span>
                              <strong>{formatCurrency(remainingAmount)}</strong>
                            </div>
                          </>
                        )}
                        <div className="d-flex justify-content-between text-success">
                          <span>Kembalian:</span>
                          <strong>{formatCurrency(changeDue)}</strong>
                        </div>
                        {shortfall > 0 && (
                          <div className="d-flex justify-content-between text-danger">
                            <span>Kurang:</span>
                            <strong>{formatCurrency(shortfall)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Payment Note */}
                      <div>
                        <label
                          className="form-label small"
                          htmlFor="modalPaymentNote"
                        >
                          Catatan Pembayaran
                        </label>
                        <textarea
                          id="modalPaymentNote"
                          className="form-control"
                          rows={2}
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Catatan pembayaran (opsional)"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowPaymentModal(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle me-2"></i>
                          Simpan Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
