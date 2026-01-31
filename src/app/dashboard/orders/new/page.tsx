"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatCurrency } from "@/lib/utils";
import styles from "./pos-fullscreen.module.css";

// Types derived from original code
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

function allowDecimalQty(type: ServiceType): boolean {
    return type === "KILOAN";
}

export default function NewOrderPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const user = session?.user as any;
    const role = user?.role as string | undefined;

    // -- LOGIC STATES --
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [services, setServices] = useState<PosService[]>([]);
    const [serviceLoading, setServiceLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<ServiceType | "ALL">("ALL");

    const [items, setItems] = useState<CartItem[]>([]);

    // Customer State
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("Umum");
    const [customerPhone, setCustomerPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Customer Search & Add
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
    const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
    const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
    const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [addingCustomer, setAddingCustomer] = useState(false);

    // Mobile UI State
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Payment
    const [paymentNote, setPaymentNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentType, setPaymentType] = useState<"lunas" | "dp">("lunas");
    const [dpAmountDigits, setDpAmountDigits] = useState<string>("0");
    const [cashReceivedDigits, setCashReceivedDigits] = useState<string>("0");
    const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

    // Receipt Modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // -- EFFECTS --
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

    // -- DATA FETCHING --
    async function fetchServices() {
        try {
            setServiceLoading(true);
            const res = await fetch("/api/dashboard/pos/services", { method: "GET" });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) throw new Error(json?.message || "Gagal memuat layanan");
            setServices((json.data || []).filter((s: PosService) => s.isActive));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setServiceLoading(false);
        }
    }

    // Customer Fetching (Simplified for new UI)
    async function fetchRecentCustomers() { /* ... reused logic ... */
        try {
            const res = await fetch(`/api/dashboard/customers?limit=10`);
            const json = await res.json();
            if (res.ok && json?.success) setRecentCustomers(json.data);
        } catch (e) { console.error(e); }
    }

    async function searchCustomers(query: string) {
        try {
            setCustomerSearchLoading(true);
            const res = await fetch(`/api/dashboard/customers?search=${encodeURIComponent(query)}&limit=10`);
            const json = await res.json();
            if (res.ok && json?.success) setSearchedCustomers(json.data);
            else setSearchedCustomers([]);
        } catch (e) {
            setSearchedCustomers([]);
        } finally {
            setCustomerSearchLoading(false);
        }
    }

    useEffect(() => {
        if (showCustomerSearch && recentCustomers.length === 0) void fetchRecentCustomers();
    }, [showCustomerSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (showCustomerSearch && customerSearchQuery.trim().length > 0) void searchCustomers(customerSearchQuery);
            else setSearchedCustomers([]);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearchQuery, showCustomerSearch]);

    async function handleAddCustomer() {
        if (!newCustomerName.trim()) return;
        setAddingCustomer(true);
        try {
            const res = await fetch("/api/dashboard/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() || undefined }),
            });
            const json = await res.json();
            if (res.ok && json?.success && json?.data) {
                selectCustomer(json.data);
                setNewCustomerName(""); setNewCustomerPhone(""); setShowAddCustomerForm(false);
                void fetchRecentCustomers();
            } else {
                alert(json?.message || "Gagal menambah pelanggan");
            }
        } catch (e) { alert("Gagal menambah pelanggan"); }
        finally { setAddingCustomer(false); }
    }

    // -- TOUCH GESTURE LOGIC --
    const minSwipeDistance = 50;
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        // const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
        const isVertical = Math.abs(distanceY) > Math.abs(distanceX);

        if (isVertical) {
            const isSwipeUp = distanceY > minSwipeDistance;
            const isSwipeDown = distanceY < -minSwipeDistance;
            // Swipe Up -> Open Cart
            if (isSwipeUp && !showMobileCart) setShowMobileCart(true);
            // Swipe Down -> Close Cart
            if (isSwipeDown && showMobileCart) setShowMobileCart(false);
        }

        // if (isHorizontal) {
        //     const isSwipeLeft = distanceX > minSwipeDistance;
        //     const isSwipeRight = distanceX < -minSwipeDistance;
        //     // Swipe Left -> Open Cart (Move to Right Tab)
        //     if (isSwipeLeft && !showMobileCart) setShowMobileCart(true);
        //     // Swipe Right -> Close Cart (Back to Left Tab)
        //     if (isSwipeRight && showMobileCart) setShowMobileCart(false);
        // }
    };

    function selectCustomer(c: any) {
        setCustomerId(c.id);
        setCustomerName(c.name);
        setCustomerPhone(c.phone || "");
        setShowCustomerSearch(false);
        setCustomerSearchQuery("");
    }

    // -- CART LOGIC --
    function addService(service: PosService) {
        setItems((prev) => {
            const idx = prev.findIndex((item) => item.serviceId === service.id);
            if (idx !== -1) {
                const newItems = [...prev];
                const inc = allowDecimalQty(service.type) ? 0.1 : 1;
                newItems[idx] = { ...newItems[idx], quantity: Math.round((newItems[idx].quantity + inc) * 10) / 10 };
                return newItems;
            } else {
                return [...prev, {
                    key: `${service.id}-${Date.now()}`,
                    serviceId: service.id,
                    serviceName: service.name,
                    serviceType: service.type,
                    serviceUnit: service.unit ?? null,
                    quantity: defaultQuantity(service.type),
                    unitPrice: Math.round(service.price),
                }];
            }
        });
    }

    function updateItemQuantity(key: string, delta: number) {
        setItems((prev) => prev.map((x) => {
            if (x.key !== key) return x;
            const newQty = Math.round((x.quantity + delta) * 10) / 10;
            const minQty = allowDecimalQty(x.serviceType) ? 0.1 : 1;
            if (newQty < minQty) return x;
            return { ...x, quantity: newQty };
        }));
    }

    function removeItem(key: string) {
        setItems((prev) => prev.filter((x) => x.key !== key));
    }

    function clearCart() {
        setItems([]);
        setCustomerId(null);
        setCustomerName("Umum");
        setCustomerPhone("");
        setAdjustmentAmount(0);
        setDpAmountDigits("0");
        setCashReceivedDigits("0");
    }

    const totals = useMemo(() => {
        const rows = items.map((it) => ({ ...it, subtotal: Math.round(it.quantity * it.unitPrice) }));
        const subtotalAmount = rows.reduce((sum, r) => sum + r.subtotal, 0);
        const totalAmount = subtotalAmount + adjustmentAmount;
        return { rows, subtotalAmount, totalAmount };
    }, [items, adjustmentAmount]);

    // -- PAYMENT HELPER --
    function toDigitsOnly(val: string) { return val.replace(/\D/g, ""); }
    function parseIdr(digits: string) { return parseInt(digits || "0", 10); }
    function formatThousands(digits: string) {
        if (!digits) return "";
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    async function handleSubmit() {
        if (submitting) return;
        const total = totals.totalAmount;
        const dpVal = parseIdr(dpAmountDigits);
        if (paymentType === "dp" && dpVal > total) {
            alert("DP tidak boleh melebihi total"); return;
        }

        setSubmitting(true);
        try {
            const isUmum = !customerId && (!customerName.trim() || customerName.trim() === "Umum");
            const payload = {
                customerId: customerId || undefined,
                customerName: isUmum ? undefined : customerName.trim() || undefined,
                customerPhone: customerPhone.trim() || undefined,
                notes: notes.trim() || undefined,
                items: items.map(it => ({ serviceId: it.serviceId, quantity: it.quantity, unitPrice: it.unitPrice })),
                paid: paymentType === "lunas",
                paymentNote: paymentNote.trim() || undefined,
                dpAmount: paymentType === "dp" ? dpVal : undefined,
                cashReceived: parseIdr(cashReceivedDigits),
            };

            const res = await fetch("/api/dashboard/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Gagal order");

            const trackingCode = json.data?.trackingCode;
            const orderId = json.data?.id;
            const finalCash = parseIdr(cashReceivedDigits);
            const finalType = paymentType;
            const finalTotal = total;
            const finalChange = Math.max(0, finalCash - (finalType === "dp" ? dpVal : finalTotal));

            // Prepare Receipt Data
            setReceiptData({
                orderId,
                trackingCode,
                date: new Date().toLocaleString("id-ID"),
                customerName: isUmum ? "Umum" : (customerName || "Umum"),
                items: [...items], // copy items
                subtotal: totals.subtotalAmount,
                adjustment: adjustmentAmount,
                total: finalTotal,
                paymentType: finalType,
                dpAmount: dpVal,
                cashReceived: finalCash,
                change: finalChange
            });

            clearCart();
            setShowPaymentModal(false);
            setShowReceiptModal(true);

        } catch (e: any) {
            Swal.fire("Gagal", e.message, "error");
        } finally {
            setSubmitting(false);
        }
    }

    // Filter Services
    const filteredServices = useMemo(() => {
        let list = services;
        if (selectedCategory !== "ALL") {
            list = list.filter(s => s.type === selectedCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q));
        }
        return list;
    }, [services, selectedCategory, searchQuery]);


    if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger m-4">{error} <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => fetchServices()}>Retry</button></div>;

    return (
        <div className="d-flex flex-column bg-light" style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>

            <div className="row g-0 h-100">

                {/* LEFT COLUMN: PRODUCTS */}
                <div
                    className={`col-12 col-md-7 col-lg-7 d-flex flex-column border-end h-100 ${showMobileCart ? 'd-none d-md-flex' : 'd-flex'}`}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* CATEGORIES TABS */}
                    <div className="bg-white p-3 border-bottom">
                        <div className={`d-flex gap-2 overflow-auto pb-1 ${styles["custom-scrollbar"]}`}>
                            {(["ALL", "KILOAN", "SATUAN", "PAKET"] as const).map(cat => (
                                <button
                                    key={cat}
                                    className={`btn rounded-pill px-4 fw-medium ${selectedCategory === cat ? "btn-primary" : "btn-light text-dark border"}`}
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {cat === "ALL" ? "SEMUA" : cat}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="mt-3">
                            <input
                                className="form-control form-control-sm bg-light border-0"
                                placeholder="Cari layanan..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* GRID */}
                    <div className={`p-3 bg-light overflow-auto flex-grow-1 ${styles["custom-scrollbar"]}`}>
                        <div className="row g-3">
                            {filteredServices.map(service => {
                                const inCart = items.find(i => i.serviceId === service.id);
                                return (
                                    <div key={service.id} className="col-6 col-sm-4 col-xl-4">
                                        <div
                                            className={`card h-100 border-0 shadow-sm position-relative overflow-hidden ${styles.serviceCard}`}
                                            onClick={() => addService(service)}
                                        >
                                            {/* Selected Overlay */}
                                            {inCart && (
                                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-25" style={{ zIndex: 10 }}>
                                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                                                        <i className="fas fa-check"></i>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="card-body p-2 text-center d-flex flex-column justify-content-between">
                                                <p className="card-title fs-7 text-truncate mb-1 small fw-bold" title={service.name}>{service.name}</p>
                                                <p className="card-text text-primary fw-bold small mb-0">{formatCurrency(service.price)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredServices.length === 0 && <div className="text-center text-muted w-100 py-5">Layanan tidak ditemukan</div>}
                        </div>
                    </div>

                    {/* MOBILE BOTTOM BAR (Visible only on mobile when showing products) */}
                    <div className="d-md-none bg-white border-top p-3 shadow-lg mt-auto">
                        <button
                            className="btn btn-primary w-100 d-flex justify-content-between align-items-center py-2"
                            onClick={() => setShowMobileCart(true)}
                        >
                            <span className="badge bg-white text-primary rounded-pill">{items.length} Item</span>
                            <span className="fw-bold">Lihat Keranjang</span>
                            <span className="fw-bold">{formatCurrency(totals.totalAmount)}</span>
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: CART */}
                <div
                    className={`col-12 col-md-5 col-lg-5 d-flex flex-column h-100 bg-white shadow-lg ${!showMobileCart ? 'd-none d-md-flex' : 'd-flex'}`}
                    style={{ zIndex: 5 }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* MOBILE TOP BAR - BACK TO PRODUCTS */}
                    <div className="d-md-none p-2 border-bottom bg-light">
                        <button className="btn btn-sm btn-link text-decoration-none text-dark fw-bold d-flex align-items-center" onClick={() => setShowMobileCart(false)}>
                            <i className="fas fa-arrow-left me-2"></i> Kembali Pilih Layanan
                        </button>
                    </div>

                    {/* HEADER */}
                    <div
                        className="p-3 border-bottom d-flex align-items-center gap-2"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        {/* Mobile Back Button - REMOVED (Moved to top) */}

                        <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Keranjang</h5>
                                <span className="badge bg-primary rounded-pill">{items.length} Item</span>
                            </div>

                            {/* Customer Selector */}
                            <div className="mt-3 bg-light p-2 rounded d-flex justify-content-between align-items-center cursor-pointer border" onClick={() => setShowCustomerSearch(true)}>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 32, height: 32 }}>
                                        <i className="fas fa-user text-primary small"></i>
                                    </div>
                                    <div>
                                        <div className="small text-muted" style={{ fontSize: "0.7rem" }}>Pelanggan</div>
                                        <div className="fw-bold text-dark small">{customerName || "Umum"}</div>
                                    </div>
                                </div>
                                <i className="fas fa-chevron-right text-muted small"></i>
                            </div>
                        </div>
                    </div>

                    {/* CART LIST */}
                    <div className="flex-grow-1 overflow-auto p-3">
                        {items.length === 0 ? (
                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                <i className="fas fa-shopping-basket fa-3x mb-3"></i>
                                <p>Keranjang kosong</p>
                                <button className="btn btn-sm btn-outline-primary d-md-none mt-3" onClick={() => setShowMobileCart(false)}>
                                    Tambah Layanan
                                </button>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {items.map(item => (
                                    <div key={item.key} className="d-flex align-items-center gap-2">
                                        <button className="btn btn-link text-danger p-0" onClick={() => removeItem(item.key)}>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>

                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fw-bold text-truncate small">{item.serviceName}</div>
                                            <div className="text-muted small">{formatCurrency(item.unitPrice)}</div>
                                        </div>

                                        {/* QTY Control */}
                                        <div className="d-flex align-items-center gap-2">
                                            <button className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center p-0" style={{ width: 24, height: 24 }} onClick={() => updateItemQuantity(item.key, -1)}><i className="fas fa-minus" style={{ fontSize: 10 }}></i></button>
                                            <span className="fw-bold small" style={{ minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                                            <button className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center p-0" style={{ width: 24, height: 24 }} onClick={() => updateItemQuantity(item.key, 1)}><i className="fas fa-plus" style={{ fontSize: 10 }}></i></button>
                                        </div>

                                        <div className="fw-bold small text-end" style={{ minWidth: 70 }}>
                                            {formatCurrency(item.unitPrice * item.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="p-3 bg-light border-top mt-auto">
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">Subtotal</span>
                            <span className="fw-bold">{formatCurrency(totals.subtotalAmount)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1 small">
                            <span className="text-muted">Penyesuaian</span>
                            <div className="d-flex align-items-center gap-1">
                                <button className="btn btn-xs btn-outline-secondary py-0 px-1" onClick={() => setAdjustmentAmount(p => p - 1000)}>-</button>
                                <input
                                    type="text"
                                    className="form-control form-control-sm text-center p-0 mx-1 fw-bold text-primary border-0 bg-transparent"
                                    style={{ width: "80px", appearance: "textfield" }}
                                    value={adjustmentAmount === 0 ? "" : adjustmentAmount.toLocaleString("id-ID")}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9-]/g, "");
                                        if (raw === "-") {
                                            // allow user to type minus sign
                                            setAdjustmentAmount(-0); // temporary state to show minus, though number(0) is 0. we might need better handling or just let 0 be 0.
                                            // actually handling just "-" in number state is hard.
                                            // simple workaround: if just "-", do nothing or set to 0 with special flag? 
                                            // simpler: just parse. if NaN, 0.
                                            return;
                                        }
                                        const val = parseInt(raw.replace(/\./g, "") || "0", 10);
                                        if (!isNaN(val)) setAdjustmentAmount(val);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="0"
                                />
                                <button className="btn btn-xs btn-outline-secondary py-0 px-1" onClick={() => setAdjustmentAmount(p => p + 1000)}>+</button>
                            </div>
                        </div>
                        <div className="d-flex justify-content-between mb-1 fs-5 border-top pt-1">
                            <span className="fw-bold">Total</span>
                            <span className="fw-bold text-primary">{formatCurrency(totals.totalAmount)}</span>
                        </div>

                        <div className="d-flex gap-2">
                            <button className="btn btn-secondary flex-grow-1" onClick={clearCart} disabled={items.length === 0}>
                                <i className="fas fa-refresh me-1"></i> Reset
                            </button>
                            <button className="btn btn-primary flex-grow-1 fw-bold" onClick={() => { if (items.length > 0) { setCashReceivedDigits(String(totals.totalAmount)); setShowPaymentModal(true); } }} disabled={items.length === 0}>
                                <i className="fas fa-money-bill-wave me-1"></i> Bayar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {/* Customer Modal & Payment Modal implementation below (simplified for brevity but functional) */}

            {showCustomerSearch && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-2">
                                <h6 className="modal-title">Pilih Pelanggan</h6>
                                <button className="btn-close" onClick={() => setShowCustomerSearch(false)}></button>
                            </div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Cari nama..." value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} autoFocus />
                                {showAddCustomerForm ? (
                                    <div className="bg-light p-3 rounded">
                                        <h6>Tambah Baru</h6>
                                        <input className="form-control mb-2" placeholder="Nama" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                                        <input className="form-control mb-2" placeholder="HP" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                                        <button className="btn btn-success w-100 btn-sm" onClick={handleAddCustomer} disabled={addingCustomer}>Simpan</button>
                                        <button className="btn btn-link w-100 btn-sm text-muted" onClick={() => setShowAddCustomerForm(false)}>Batal</button>
                                    </div>
                                ) : (
                                    <>
                                        <button className="btn btn-outline-primary w-100 mb-2 btn-sm" onClick={() => setShowAddCustomerForm(true)}>+ Pelanggan Baru</button>
                                        <div className="list-group">
                                            {(customerSearchQuery ? searchedCustomers : recentCustomers).map(c => (
                                                <button key={c.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onClick={() => selectCustomer(c)}>
                                                    <div><div className="fw-bold small">{c.name}</div><div className="small text-muted">{c.phone}</div></div>
                                                    <i className="fas fa-chevron-right small"></i>
                                                </button>
                                            ))}
                                            {!(customerSearchQuery ? searchedCustomers : recentCustomers).length && <div className="text-center p-3 text-muted small">Tidak ada data</div>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-body">
                                <h5 className="fw-bold mb-3 text-center">Pembayaran</h5>
                                <div className="text-center mb-4">
                                    <h2 className="text-primary fw-bold">{formatCurrency(totals.totalAmount)}</h2>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small text-muted">Metode</label>
                                    <div className="btn-group w-100">
                                        <button className={`btn ${paymentType === "lunas" ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setPaymentType("lunas")}>LUNAS</button>
                                        <button className={`btn ${paymentType === "dp" ? "btn-warning" : "btn-outline-secondary"}`} onClick={() => setPaymentType("dp")}>DP / UTANG</button>
                                    </div>
                                </div>

                                {paymentType === "dp" && (
                                    <div className="mb-3">
                                        <label className="form-label small text-muted">Nominal DP</label>
                                        <input className="form-control form-control-lg fw-bold text-center" value={formatThousands(dpAmountDigits)} onChange={e => setDpAmountDigits(toDigitsOnly(e.target.value))} />
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="form-label small text-muted">Uang Diterima</label>
                                    <input className="form-control form-control-lg fw-bold text-center" value={formatThousands(cashReceivedDigits)} onChange={e => setCashReceivedDigits(toDigitsOnly(e.target.value))} />
                                </div>

                                <div className="d-flex justify-content-between alert alert-secondary py-2">
                                    <span>Kembalian</span>
                                    <span className="fw-bold">{formatCurrency(Math.max(0, parseIdr(cashReceivedDigits) - (paymentType === "dp" ? parseIdr(dpAmountDigits) : totals.totalAmount)))}</span>
                                </div>

                                <div className="d-grid gap-2">
                                    <button className="btn btn-primary btn-lg fw-bold" onClick={handleSubmit} disabled={submitting}>{submitting ? "Memproses..." : "Bayar Sekarang"}</button>
                                    <button className="btn btn-link text-muted" onClick={() => setShowPaymentModal(false)}>Batal</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {showReceiptModal && receiptData && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-body p-4 font-monospace">
                                <div id="printable-receipt-content">
                                    <div className="text-center mb-3">
                                        <h5 className="fw-bold mb-0">LAUNDRY RECEIPT</h5>
                                        <small className="text-muted">{receiptData.date}</small>
                                    </div>
                                    <div className="border-bottom border-secondary border-opacity-25 mb-2 pb-2">
                                        <div className="d-flex justify-content-between small">
                                            <span>Order #</span>
                                            <span className="fw-bold">{receiptData.trackingCode}</span>
                                        </div>
                                        <div className="d-flex justify-content-between small">
                                            <span>Cust</span>
                                            <span className="fw-bold text-truncate" style={{ maxWidth: "150px" }}>{receiptData.customerName}</span>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        {receiptData.items.map((it: any, idx: number) => (
                                            <div key={idx} className="mb-1 small">
                                                <div className="fw-bold">{it.serviceName}</div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">{it.quantity} x {formatCurrency(it.unitPrice)}</span>
                                                    <span>{formatCurrency(it.quantity * it.unitPrice)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-top border-secondary border-opacity-25 pt-2 mb-3">
                                        <div className="d-flex justify-content-between small mb-1">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(receiptData.subtotal)}</span>
                                        </div>
                                        {receiptData.adjustment !== 0 && (
                                            <div className="d-flex justify-content-between small mb-1 text-muted">
                                                <span>Adj</span>
                                                <span>{formatCurrency(receiptData.adjustment)}</span>
                                            </div>
                                        )}
                                        <div className="d-flex justify-content-between fw-bold fs-5 mb-2 border-top border-bottom py-1">
                                            <span>TOTAL</span>
                                            <span>{formatCurrency(receiptData.total)}</span>
                                        </div>

                                        <div className="d-flex justify-content-between small mb-1">
                                            <span>{receiptData.paymentType === "dp" ? "DP Bayar" : "Tunai"}</span>
                                            <span>{formatCurrency(receiptData.paymentType === "dp" ? receiptData.dpAmount : receiptData.cashReceived)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between small">
                                            <span>Kembali</span>
                                            <span>{formatCurrency(receiptData.change)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-dark fw-bold"
                                        onClick={() => {
                                            const content = document.getElementById('printable-receipt-content');
                                            const iframe = document.getElementById('printFrame') as HTMLIFrameElement;
                                            if (!content || !iframe) return;

                                            const doc = iframe.contentWindow?.document;
                                            if (!doc) return;

                                            doc.open();
                                            doc.write('<html><head><title>Print Receipt</title>');

                                            // Copy CSS links (Bootstrap etc)
                                            const links = document.querySelectorAll('link[rel="stylesheet"]');
                                            links.forEach(link => doc.write(link.outerHTML));

                                            // Copy Styles (Tailwind usually here)
                                            const styles = document.querySelectorAll('style');
                                            styles.forEach(style => doc.write(style.outerHTML));

                                            doc.write('</head><body style="padding: 20px; font-family: monospace;">');
                                            doc.write(content.innerHTML);
                                            doc.write('</body></html>');
                                            doc.close();

                                            // Small delay for styles to apply
                                            setTimeout(() => {
                                                iframe.contentWindow?.focus();
                                                iframe.contentWindow?.print();
                                            }, 500);
                                        }}
                                    >
                                        <i className="fas fa-print me-2"></i> Cetak Struk
                                    </button>
                                    <button className="btn btn-outline-secondary" onClick={() => setShowReceiptModal(false)}>
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }


            {/* Hidden Iframe for Direct Printing */}
            <iframe
                id="printFrame"
                style={{ position: 'absolute', width: 0, height: 0, border: 0, visibility: 'hidden' }}
                title="printFrame"
            />
        </div>
    );
}
