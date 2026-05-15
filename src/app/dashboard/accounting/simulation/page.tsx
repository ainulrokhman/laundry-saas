'use client';

/**
 * HPP Simulation & Calculation Tool
 * Enhanced with Monthly Mode to help owners find HPP from total costs & volume
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Swal from 'sweetalert2';

type SimulationItem = {
  id?: string;
  name: string;
  cost: number;
  usage: number;
  subtotal: number;
};

type Simulation = {
  id: string;
  name: string;
  description: string | null;
  totalCogs: number;
  items: SimulationItem[];
  createdAt: string;
};

type Service = {
  id: string;
  name: string;
};

export default function SimulationPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [calcMode, setCalcMode] = useState<'PER_UNIT' | 'MONTHLY'>('PER_UNIT');
  const [totalVolume, setTotalVolume] = useState<number>(2698); // Example from user image

  const [newSim, setNewSim] = useState<{
    name: string;
    description: string;
    items: SimulationItem[];
  }>({
    name: '',
    description: '',
    items: [{ name: '', cost: 0, usage: 0, subtotal: 0 }],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function fetchData() {
    try {
      setLoading(true);
      const [simRes, svcRes] = await Promise.all([
        fetch('/api/dashboard/accounting/simulations'),
        fetch('/api/dashboard/services'),
      ]);
      const [simJson, svcJson] = await Promise.all([simRes.json(), svcRes.json()]);
      
      if (simJson.success) setSimulations(simJson.data);
      if (svcJson.success) setServices(svcJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setNewSim(prev => ({
      ...prev,
      items: [...prev.items, { name: '', cost: 0, usage: 0, subtotal: 0 }]
    }));
  }

  function updateItem(index: number, field: keyof SimulationItem, value: any) {
    const nextItems = [...newSim.items];
    const item = { ...nextItems[index], [field]: value };
    
    if (calcMode === 'PER_UNIT') {
      if (field === 'cost' || field === 'usage') {
        item.subtotal = Number(item.cost) * Number(item.usage);
      }
    } else {
      if (field === 'cost') {
        item.subtotal = Number(item.cost);
      }
    }
    
    nextItems[index] = item;
    setNewSim(prev => ({ ...prev, items: nextItems }));
  }

  function removeItem(index: number) {
    if (newSim.items.length === 1) return;
    setNewSim(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }

  async function saveSimulation() {
    if (!newSim.name.trim()) return Swal.fire('Error', 'Nama simulasi harus diisi', 'error');
    
    const finalVolume = totalVolume || 1;
    const itemsPayload = newSim.items.map(item => ({
      ...item,
      // If monthly, usage becomes 1/finalVolume and cost remains as total cost
      usage: calcMode === 'PER_UNIT' ? item.usage : 1 / finalVolume,
      cost: item.cost,
    }));

    try {
      const res = await fetch('/api/dashboard/accounting/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSim,
          items: itemsPayload
        }),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Berhasil', 'Simulasi disimpan', 'success');
        setShowModal(false);
        setNewSim({ name: '', description: '', items: [{ name: '', cost: 0, usage: 0, subtotal: 0 }] });
        fetchData();
      } else {
        throw new Error(json.message || json.error);
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  async function applySimulation(simId: string) {
    const { value: serviceId } = await Swal.fire({
      title: 'Terapkan ke Layanan',
      input: 'select',
      inputOptions: Object.fromEntries(services.map(s => [s.id, s.name])),
      inputPlaceholder: 'Pilih layanan...',
      showCancelButton: true,
      confirmButtonText: 'Terapkan',
      cancelButtonText: 'Batal',
    });

    if (serviceId) {
      try {
        const res = await fetch(`/api/dashboard/accounting/simulations/${simId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId }),
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Berhasil', 'HPP layanan diperbarui', 'success');
        } else {
          throw new Error(json.error);
        }
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  }

  async function deleteSimulation(id: string) {
    const res = await Swal.fire({
      title: 'Hapus Simulasi?',
      text: 'Tindakan ini tidak dapat dibatalkan',
      icon: 'warning',
      showCancelButton: true,
    });
    if (res.isConfirmed) {
      await fetch(`/api/dashboard/accounting/simulations/${id}`, { method: 'DELETE' });
      fetchData();
    }
  }

  const totalExpense = newSim.items.reduce((acc, item) => acc + item.subtotal, 0);
  const finalHpp = calcMode === 'PER_UNIT' ? totalExpense : totalExpense / (totalVolume || 1);

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Simulasi HPP</h1>
            </div>
            <div className="col-sm-6 text-sm-end mt-2 mt-sm-0">
               <button className="btn btn-primary btn-sm shadow-sm" onClick={() => setShowModal(true)}>
                 <i className="fas fa-plus me-1"></i> Buat Simulasi Baru
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row">
            {simulations.length === 0 && !loading && (
              <div className="col-12">
                <div className="card text-center py-5 shadow-sm border-0">
                  <div className="card-body text-muted">
                    <i className="fas fa-calculator fa-3x mb-3 opacity-25"></i>
                    <p className="fs-5">Belum ada simulasi HPP.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Mulai Simulasi Sekarang</button>
                  </div>
                </div>
              </div>
            )}

            {simulations.map(sim => (
              <div key={sim.id} className="col-md-6 col-lg-4 mb-4">
                <div className="card shadow-sm border-top border-primary border-4 h-100 transition-hover">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold mb-0">{sim.name}</h5>
                      <span className="badge bg-light text-primary border border-primary border-opacity-25">
                        {sim.items.length} Item
                      </span>
                    </div>
                    <p className="text-muted small mb-3 text-truncate">{sim.description || 'Tidak ada deskripsi'}</p>
                    
                    <div className="bg-primary bg-opacity-10 p-3 rounded-3 mb-3 text-center border border-primary border-opacity-10">
                      <div className="text-primary small mb-1 text-uppercase fw-bold letter-spacing-1">HPP per Unit</div>
                      <div className="h3 fw-bold text-primary mb-0">{formatCurrency(sim.totalCogs)}</div>
                    </div>

                    <div className="mb-4">
                       <div className="text-muted small mb-2 fw-bold">Top Komponen:</div>
                       <div className="d-flex flex-column gap-2">
                         {sim.items.slice(0, 3).map((item, i) => (
                           <div key={i} className="small d-flex justify-content-between align-items-center">
                             <span className="text-muted">{item.name}</span>
                             <span className="fw-semibold">{formatCurrency(item.subtotal)}</span>
                           </div>
                         ))}
                         {sim.items.length > 3 && (
                           <div className="small text-center text-muted mt-1 border-top pt-1 italic">
                             + {sim.items.length - 3} item lainnya
                           </div>
                         )}
                       </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-success btn-sm flex-grow-1 shadow-sm" onClick={() => applySimulation(sim.id)}>
                        <i className="fas fa-check-circle me-1"></i> Terapkan
                      </button>
                      <button className="btn btn-outline-danger btn-sm shadow-sm" onClick={() => deleteSimulation(sim.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-xl border-0 overflow-hidden">
              <div className="modal-header bg-primary text-white p-3">
                <h5 className="modal-title d-flex align-items-center">
                  <div className="bg-white bg-opacity-20 rounded p-2 me-2">
                    <i className="fas fa-calculator"></i>
                  </div>
                  Kalkulator Simulasi HPP
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light bg-opacity-50">
                <div className="row g-3 mb-4">
                  <div className="col-md-7">
                    <label className="form-label fw-bold small text-secondary">Nama Simulasi</label>
                    <input 
                      className="form-control border-0 shadow-sm" 
                      placeholder="Contoh: Estimasi Profit Kiloan" 
                      value={newSim.name}
                      onChange={e => setNewSim(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-bold small text-secondary">Metode Kalkulasi</label>
                    <div className="btn-group w-100 shadow-sm" role="group">
                      <button 
                        type="button" 
                        className={`btn btn-sm ${calcMode === 'PER_UNIT' ? 'btn-primary' : 'btn-white text-primary'}`}
                        onClick={() => setCalcMode('PER_UNIT')}
                      >
                        Per Satuan (Kg/Pcs)
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${calcMode === 'MONTHLY' ? 'btn-primary' : 'btn-white text-primary'}`}
                        onClick={() => setCalcMode('MONTHLY')}
                      >
                        Total Bulanan
                      </button>
                    </div>
                  </div>
                </div>

                {calcMode === 'MONTHLY' && (
                  <div className="card border-0 shadow-sm mb-4 bg-warning bg-opacity-10 border-start border-warning border-4">
                    <div className="card-body p-3">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <h6 className="fw-bold text-warning-emphasis mb-1">Mode Pencarian HPP</h6>
                          <p className="small text-muted mb-0">Masukkan total cucian bulanan (Kg) untuk membagi total biaya secara merata.</p>
                        </div>
                        <div className="col-md-4">
                          <div className="input-group">
                            <input 
                              type="number" 
                              className="form-control form-control-lg fw-bold text-center border-0 shadow-sm" 
                              value={totalVolume}
                              onChange={e => setTotalVolume(Number(e.target.value))}
                            />
                            <span className="input-group-text bg-white border-0 shadow-sm text-muted fw-bold">kg/pcs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 d-flex align-items-center">
                    <i className="fas fa-list-ul me-2 text-primary"></i>
                    Daftar Biaya & Pengeluaran
                  </h6>
                  <button className="btn btn-primary btn-xs px-3 rounded-pill" onClick={addItem}>
                    <i className="fas fa-plus me-1"></i> Tambah Item
                  </button>
                </div>
                
                <div className="simulation-items-list bg-white rounded-3 p-3 shadow-sm" style={{ minHeight: '150px' }}>
                  {newSim.items.map((item, index) => (
                    <div key={index} className="row g-2 mb-3 align-items-center border-bottom border-light pb-3 last-child-no-border">
                      <div className="col-md-4">
                        <input 
                          className="form-control form-control-sm border-0 bg-light rounded-pill px-3" 
                          placeholder="Nama item (misal: Gas)"
                          value={item.name}
                          onChange={e => updateItem(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text border-0 bg-light rounded-start-pill text-muted small">Rp</span>
                          <input 
                            type="number" 
                            className="form-control form-control-sm border-0 bg-light rounded-end-pill" 
                            placeholder={calcMode === 'PER_UNIT' ? 'Harga' : 'Biaya'}
                            value={item.cost}
                            onChange={e => updateItem(index, 'cost', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      {calcMode === 'PER_UNIT' && (
                        <div className="col-md-3">
                          <div className="input-group input-group-sm">
                            <input 
                              type="number" 
                              className="form-control form-control-sm border-0 bg-light text-center rounded-pill px-3" 
                              placeholder="Qty"
                              value={item.usage}
                              onChange={e => updateItem(index, 'usage', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )}
                      <div className={`${calcMode === 'PER_UNIT' ? 'col-md-2' : 'col-md-5'} text-end d-flex align-items-center justify-content-end gap-2`}>
                        <div className="fw-bold text-dark me-2">
                          {formatCurrency(item.subtotal)}
                        </div>
                        <button className="btn btn-link text-danger p-0" onClick={() => removeItem(index)}>
                          <i className="fas fa-times-circle fs-5"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-4 shadow-sm bg-white border-top border-primary border-4">
                   <div className="row align-items-center">
                     <div className="col-md-6">
                        <div className="text-secondary fw-bold text-uppercase small mb-2 opacity-75">
                          {calcMode === 'PER_UNIT' ? 'Total HPP per Unit' : 'Hasil Konversi HPP'}
                        </div>
                        <div className="h1 fw-bold text-primary mb-0">{formatCurrency(finalHpp)}</div>
                     </div>
                     <div className="col-md-6 text-md-end border-md-start ps-md-4 mt-3 mt-md-0">
                        <div className="text-muted small mb-1">Total Biaya:</div>
                        <div className="h4 fw-bold text-dark mb-0">{formatCurrency(totalExpense)}</div>
                        {calcMode === 'MONTHLY' && (
                          <div className="badge bg-light text-muted mt-2 border">
                            Dibagi {totalVolume} kg
                          </div>
                        )}
                     </div>
                   </div>
                </div>
              </div>
              <div className="modal-footer bg-white border-0 p-3">
                <button className="btn btn-link text-muted text-decoration-none" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn btn-primary px-5 rounded-pill shadow" onClick={saveSimulation}>Simpan & Terapkan</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .transition-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .transition-hover:hover { transform: translateY(-5px); box-shadow: 0 1rem 3rem rgba(0,0,0,.1) !important; }
        .letter-spacing-1 { letter-spacing: 1px; }
        .last-child-no-border:last-child { border-bottom: 0 !important; }
        @media (min-width: 768px) {
          .border-md-start { border-left: 1px solid #dee2e6 !important; }
        }
      `}</style>
    </div>
  );
}
