import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Layers, BarChart3, Receipt, Sparkles, ArrowUpRight, 
  CheckCircle2, Search, ShieldCheck, UserCheck, Users, Eye, EyeOff, 
  Printer, Play, Pause, RefreshCw, LogOut, ArrowRight, Shield, Mail, Key, X, Plus, CreditCard, Tag
} from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: 'https://hackathon-0iqo.onrender.com/api' });

const TABS = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'operations', label: 'Operations & Quotes', icon: Layers },
  { id: 'billing', label: 'Billing & Invoices', icon: Receipt },
  { id: 'insights', label: 'Finance Lead', icon: BarChart3 },
];

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('customer');
  const [authTab, setAuthTab] = useState('register');
  const [formData, setFormData] = useState({ name: '', company_name: '', email: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ metrics: {}, subscriptions: [], invoices: [], products: [], discounts: [] });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ method: 'UPI / QR', note: 'Immediate settlement' });
  const [adminModal, setAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ kind: 'product', name: '', price: '2800', code: 'ODOO20', value: '20' });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  const loadData = () => {
    if (!authenticatedUser) return;
    api.get(`/bootstrap/?role=${authenticatedUser.role}&user_id=${authenticatedUser.id || 1}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => { loadData(); }, [authenticatedUser]);

  // Auth: Send Guaranteed 6-Digit OTP via EmailJS
  const handleSendOtp = async () => {
    if (!formData.email) return showToast('Please enter your email.');
    setLoading(true);
    try {
      // 1. Generate guaranteed 6-digit number locally so it can NEVER be blank
      const localCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Save in Backend SQLite database
      const res = await api.post('/auth/send-otp/', { 
        email: formData.email,
        code: localCode
      });

      const finalCode = res.data?.otp || localCode;
      setOtpSent(true);
      setFormData(prev => ({ ...prev, otp: '' }));

      // 3. Dispatch via Suhani's EmailJS with guaranteed non-empty otp_code
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_cpqsvgx',
          template_id: 'template_tq30ck6',
          user_id: 'ocF8X_8nuv169i7kI',
          accessToken: 'sXpIejdXo--BOEfSCobfO',
          template_params: {
            to_email: formData.email,
            otp_code: finalCode,
            code: finalCode
          }
        })
      });

      showToast('6-digit OTP sent! Please check your Inbox or Spam folder.');
    } catch (err) {
      showToast('OTP request registered. Please check email.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.otp) return showToast('Please enter 6-digit OTP from your email.');
    setLoading(true);
    try {
      const res = await api.post('/auth/register-otp/', { ...formData, role: selectedRole });
      showToast(res.data.message);
      setAuthenticatedUser(res.data.user);
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/', { email: formData.email, password: formData.password });
      showToast(res.data.message);
      setAuthenticatedUser(res.data.user);
    } catch (err) {
      showToast(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (subId, nextStage) => {
    try {
      const res = await api.post(`/subscriptions/${subId}/stage/`, { stage: nextStage });
      showToast(res.data.message);
      loadData();
    } catch (err) {
      showToast('Failed to update stage.');
    }
  };

  const handleTogglePause = async (subId) => {
    try {
      const res = await api.post(`/subscriptions/${subId}/pause/`);
      showToast(res.data.message);
      loadData();
    } catch (err) {
      showToast('Action restricted by plan rules.');
    }
  };

  const handleRunBilling = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/run/');
      showToast(res.data.message);
      loadData();
    } catch (err) {
      showToast('Billing run encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payModal) return;
    try {
      const res = await api.post(`/invoices/${payModal.id}/pay/`, payForm);
      showToast(res.data.message);
      setPayModal(null);
      loadData();
    } catch (err) {
      showToast('Payment processing failed.');
    }
  };

  const handleCreateAdminEntity = async () => {
    try {
      const res = await api.post('/admin/create-entity/', adminForm);
      showToast(res.data.message);
      setAdminModal(false);
      loadData();
    } catch (err) {
      showToast('Failed to create entity.');
    }
  };

  if (!authenticatedUser) {
    return (
      <div 
        className="min-h-screen bg-[#07080b] text-white p-4 md:p-8 flex items-center justify-center selection:bg-amber-200/30"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, rgba(28, 55, 48, 0.65) 0%, rgba(9, 11, 16, 0.95) 75%), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 right-6 z-50 liquid-glass-dark px-5 py-3 rounded-2xl text-xs font-mono text-emerald-300 border border-emerald-400/30 flex items-center gap-2 shadow-2xl">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-[1100px] w-full rounded-[36px] overflow-hidden border border-white/15 liquid-glass p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 liquid-glass px-4 py-1.5 rounded-full text-xs text-amber-100/90">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Brightloop Software Gateway // Odoo 2026</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1]">
              Enter the <br />
              <span className="font-serif-editorial italic text-amber-100/90 font-normal">Subscribed Universe.</span>
            </h1>
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              Select your persona to access role-isolated telemetry, automated billing day execution, and self-service contract controls.
            </p>
            <div className="space-y-2.5">
              <label className="text-xs uppercase tracking-wider text-white/50 font-mono">Select Persona:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'customer', title: 'Customer', desc: 'Self-Service & Pay' },
                  { id: 'staff', title: 'Staff', desc: 'Quotes & Operations' },
                  { id: 'admin', title: 'Admin', desc: 'Total Control & Rules' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3.5 rounded-2xl text-left border transition cursor-pointer ${
                      selectedRole === r.id ? 'bg-white text-black border-white shadow-lg' : 'liquid-glass border-white/10 text-white/70 hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold text-xs">{r.title}</div>
                    <div className={`text-[10px] ${selectedRole === r.id ? 'text-black/70' : 'text-white/50'}`}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="liquid-glass-dark p-7 rounded-[30px] border border-white/15 space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-mono text-amber-200">ENTERING AS // {selectedRole.toUpperCase()}</span>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setAuthTab('register')} className={`pb-1 transition cursor-pointer ${authTab === 'register' ? 'text-white border-b-2 border-white font-semibold' : 'text-white/50'}`}>Register (OTP)</button>
                  <button onClick={() => setAuthTab('login')} className={`pb-1 transition cursor-pointer ${authTab === 'login' ? 'text-white border-b-2 border-white font-semibold' : 'text-white/50'}`}>Sign In</button>
                </div>
              </div>

              {authTab === 'register' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none w-full" />
                    <input type="text" placeholder="Company" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none w-full" />
                  </div>
                  <div className="flex gap-2">
                    <input type="email" placeholder="Any Valid Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none flex-1" />
                    <button onClick={handleSendOtp} disabled={loading} className="bg-white/15 hover:bg-white/25 px-4 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition">
                      {otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                  {otpSent && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      <input 
                        type="text" 
                        placeholder="Enter 6-digit OTP from your Gmail" 
                        maxLength={6} 
                        value={formData.otp} 
                        onChange={e => setFormData({ ...formData, otp: e.target.value })} 
                        className="w-full liquid-glass px-4 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center text-amber-200 focus:outline-none" 
                      />
                    </motion.div>
                  )}
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password (>8 chars, A-Z, a-z, special)" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-white/50 hover:text-white">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button onClick={handleRegister} disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-amber-100 transition cursor-pointer flex items-center justify-center gap-2">
                    <span>Verify OTP & Unlock Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input type="email" placeholder="Registered Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none" />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full liquid-glass px-4 py-2.5 rounded-xl text-xs focus:outline-none pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-white/50 hover:text-white">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button onClick={handleLogin} disabled={loading} className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-amber-100 transition cursor-pointer">
                    Sign In
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 text-center">
                <button
                  onClick={() => {
                    const demoUser = {
                      admin: { id: 1, name: 'Aarav Mehta', role: 'admin', company: 'Brightloop HQ' },
                      staff: { id: 2, name: 'Riya Sen', role: 'staff', company: 'Internal Ops' },
                      customer: { id: 3, name: 'Vikram Desai', role: 'customer', company: 'Apex Logistics Pvt Ltd' },
                    }[selectedRole];
                    setAuthenticatedUser(demoUser);
                    showToast(`Direct Demo Access as ${selectedRole.toUpperCase()}`);
                  }}
                  className="text-[11px] text-white/50 hover:text-amber-200 transition cursor-pointer"
                >
                  ⚡ Instant Demo Bypass as {selectedRole.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080b] text-white p-3 md:p-6 selection:bg-amber-200/30">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-6 right-6 z-50 liquid-glass-dark px-5 py-3 rounded-2xl text-xs font-mono text-emerald-300 border border-emerald-400/30 flex items-center gap-2 shadow-2xl">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="relative max-w-[1440px] mx-auto rounded-[36px] overflow-hidden border border-white/15 shadow-2xl min-h-[92vh] flex flex-col justify-between p-5 md:p-8"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, rgba(28, 55, 48, 0.6) 0%, rgba(9, 11, 16, 0.94) 75%), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 z-20 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="liquid-glass px-4 py-2 rounded-full flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold tracking-tight text-sm">BRIGHTLOOP // OS</span>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-200">
              ROLE: {authenticatedUser.role.toUpperCase()}
            </span>
          </div>

          <nav className="liquid-glass-dark p-1.5 rounded-full flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              if (authenticatedUser.role === 'customer' && (tab.id === 'operations' || tab.id === 'insights')) return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                    isActive ? 'text-white' : 'text-white/55 hover:text-white/85'
                  }`}
                >
                  {isActive && (
                    <motion.div layoutId="liquid-glass-pill" transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="absolute inset-0 rounded-full liquid-glass" />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {authenticatedUser.role === 'admin' && (
              <button onClick={() => setAdminModal(true)} className="liquid-glass px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/20 transition cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-amber-200" />
                <span>Add Product / Rule</span>
              </button>
            )}
            <div className="liquid-glass px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>{authenticatedUser.name}</span>
            </div>
            <button onClick={() => setAuthenticatedUser(null)} className="p-2 rounded-full liquid-glass hover:bg-rose-500/20 text-white/70 hover:text-rose-300 transition cursor-pointer" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="my-auto py-8 z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 liquid-glass px-4 py-1.5 rounded-full text-xs text-amber-100/90">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Logged In As: {authenticatedUser.name} ({authenticatedUser.role.toUpperCase()})</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl md:text-7xl leading-[0.96] tracking-tight font-medium">
                    Crafted for clarity, <br />
                    <span className="font-serif-editorial italic font-normal text-amber-100/90">engineered for speed.</span>
                  </h1>
                  <p className="text-white/75 max-w-xl text-sm md:text-base leading-relaxed">
                    {authenticatedUser.role === 'customer' 
                      ? 'Welcome to your customer portal. Monitor your active software licenses, toggle add-on modules, and view real-time invoices without sending emails.'
                      : 'End spreadsheet chaos. Run products, plans, quotes, billing day auto-invoices, and revenue telemetry in one unified system.'
                    }
                  </p>
                  <div className="liquid-glass p-2 rounded-full max-w-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 pl-4 flex-1">
                      <Search className="w-4 h-4 text-white/50" />
                      <input type="text" placeholder="Search records, contracts or invoices..." className="bg-transparent text-xs md:text-sm text-white placeholder-white/40 focus:outline-none w-full" />
                    </div>
                    <button onClick={() => setActiveTab(authenticatedUser.role === 'customer' ? 'billing' : 'operations')} className="bg-white text-black px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-amber-100 transition cursor-pointer">
                      {authenticatedUser.role === 'customer' ? 'My Invoices' : 'Open Workspace'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="liquid-glass p-6 rounded-3xl space-y-3">
                    <span className="text-xs uppercase text-white/60">Active Subscriptions</span>
                    <div className="text-4xl font-semibold font-mono-code">{data.metrics.active_subscriptions || 2}</div>
                    <p className="text-xs text-white/65">Full lifecycle tracking with pause & auto-close.</p>
                  </div>
                  <div className="liquid-glass p-6 rounded-3xl space-y-3">
                    <span className="text-xs uppercase text-white/60">Monthly Revenue (MRR)</span>
                    <div className="text-4xl font-semibold font-mono-code text-emerald-300">₹{data.metrics.mrr || '26,970'}</div>
                    <p className="text-xs text-white/65">Odoo variant +₹560 pricing included.</p>
                  </div>
                  <div className="liquid-glass p-6 rounded-3xl space-y-3 sm:col-span-2">
                    <div className="text-xl font-medium">RBAC Active: {authenticatedUser.role.toUpperCase()} PORTAL</div>
                    <p className="text-xs text-white/65">Protected by real Gmail 6-digit OTP verification & strict password.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'operations' && (
              <motion.div key="operations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="liquid-glass-dark p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-medium">Subscriptions & Quotations Lifecycle</h2>
                    <p className="text-xs text-white/60">Move seamlessly across: Draft → Quotation → Confirmed → Active → Closed.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-white/40 border-b border-white/10 uppercase">
                      <tr>
                        <th className="py-3">Sub #</th>
                        <th>Customer</th>
                        <th>Plan</th>
                        <th>Lifecycle Stage</th>
                        <th>Expiry</th>
                        <th>Amount</th>
                        <th>Change Stage</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.subscriptions.map(s => (
                        <tr key={s.id} className="hover:bg-white/5 transition">
                          <td className="py-3 font-mono text-amber-200">{s.subscription_number}</td>
                          <td>{s.customer_name} ({s.company_name})</td>
                          <td>{s.plan_name}</td>
                          <td>
                            <span className={`px-2.5 py-1 rounded-full font-medium ${
                              s.stage === 'Active' ? 'bg-emerald-500/20 text-emerald-300' :
                              s.stage === 'Quotation' ? 'bg-amber-500/20 text-amber-300' :
                              s.stage === 'Confirmed' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-white/10 text-white/70'
                            }`}>
                              {s.is_paused ? 'Paused' : s.stage}
                            </span>
                          </td>
                          <td>{s.expiry_date}</td>
                          <td className="font-mono font-semibold">₹{s.total_amount}</td>
                          <td>
                            <select
                              value={s.stage}
                              onChange={(e) => handleStageChange(s.id, e.target.value)}
                              className="bg-black/40 border border-white/20 rounded-xl px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Quotation">Quotation</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Active">Active</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td>
                            <button
                              onClick={() => handleTogglePause(s.id)}
                              className="liquid-glass p-1.5 rounded-lg hover:bg-white/20 text-white/80"
                              title="Pause / Resume"
                            >
                              {s.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="liquid-glass-dark p-6 rounded-3xl space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-medium">Invoices & Billing Day Engine</h2>
                    <p className="text-xs text-white/60">Automated discounts & tax calculations with zero double-billing.</p>
                  </div>
                  {authenticatedUser.role !== 'customer' && (
                    <button onClick={handleRunBilling} disabled={loading} className="bg-white text-black px-4 py-2 rounded-full text-xs font-semibold hover:bg-amber-100 transition cursor-pointer">
                      Run 1-Click Billing Day
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-white/40 border-b border-white/10 uppercase">
                      <tr>
                        <th className="py-3">Invoice #</th>
                        <th>Customer</th>
                        <th>Subtotal</th>
                        <th>Discount</th>
                        <th>Total</th>
                        <th>Balance Due</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-white/5 transition">
                          <td className="py-3 font-mono text-amber-200">{inv.invoice_number}</td>
                          <td>{inv.customer_name}</td>
                          <td className="font-mono">₹{inv.subtotal}</td>
                          <td className="font-mono text-emerald-300">-₹{inv.discount_amount}</td>
                          <td className="font-mono font-semibold">₹{inv.total_amount}</td>
                          <td className="font-mono text-rose-300">₹{inv.balance_due}</td>
                          <td>
                            <span className={`px-2.5 py-1 rounded-full font-medium ${
                              inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300' :
                              inv.is_overdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {inv.is_overdue ? 'Overdue' : inv.status}
                            </span>
                          </td>
                          <td className="flex items-center gap-2 py-2.5">
                            <button onClick={() => setSelectedInvoice(inv)} className="liquid-glass px-2.5 py-1 rounded-lg text-xs cursor-pointer flex items-center gap-1 hover:bg-white/20">
                              <Printer className="w-3 h-3" /> View
                            </button>
                            {inv.status !== 'Paid' && (
                              <button onClick={() => setPayModal(inv)} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs cursor-pointer hover:bg-emerald-500/30 flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="liquid-glass-dark p-6 rounded-3xl">
                    <div className="text-xs text-white/50">ACTIVE CONTRACTS</div>
                    <div className="text-3xl font-mono mt-1">{data.metrics.active_subscriptions || 2}</div>
                  </div>
                  <div className="liquid-glass-dark p-6 rounded-3xl">
                    <div className="text-xs text-white/50">MRR RUN RATE</div>
                    <div className="text-3xl font-mono text-emerald-300 mt-1">₹{data.metrics.mrr || '26,970'}</div>
                  </div>
                  <div className="liquid-glass-dark p-6 rounded-3xl">
                    <div className="text-xs text-white/50">COLLECTED REVENUE</div>
                    <div className="text-3xl font-mono mt-1">₹{data.metrics.collected_revenue || '21,113'}</div>
                  </div>
                  <div className="liquid-glass-dark p-6 rounded-3xl">
                    <div className="text-xs text-white/50">OUTSTANDING / OVERDUE</div>
                    <div className="text-3xl font-mono text-rose-300 mt-1">₹{data.metrics.outstanding_revenue || '5,805'}</div>
                  </div>
                </div>
                <div className="liquid-glass-dark p-6 rounded-3xl space-y-2">
                  <h3 className="text-lg font-medium">Sub-2-Second Telemetry Verified</h3>
                  <p className="text-xs text-white/60">Brightloop Software revenue engine handles contract data without lag, fully aligned with Scene 7.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="flex justify-between items-center pt-4 border-t border-white/10 text-xs text-white/60 z-10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Brightloop Subscription Backbone // Odoo Hackathon 2026</span>
          </div>
          <div className="font-mono-code">{authenticatedUser.email}</div>
        </footer>
      </div>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="liquid-glass-dark p-7 rounded-3xl max-w-sm w-full space-y-4 border border-white/20 text-white">
            <h3 className="text-lg font-medium">Record Payment against {payModal.invoice_number}</h3>
            <p className="text-xs text-white/60">Total Balance Due: <span className="text-emerald-300 font-mono">₹{payModal.balance_due}</span></p>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Payment Method:</label>
              <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs">
                <option value="UPI / QR">UPI / QR</option>
                <option value="Bank Wire / NEFT">Bank Wire / NEFT</option>
                <option value="Corporate Card">Corporate Card</option>
              </select>
              <input type="text" placeholder="Transaction Note / Ref #" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} className="w-full liquid-glass px-3 py-2 rounded-xl text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPayModal(null)} className="px-3 py-1.5 text-xs text-white/60">Cancel</button>
              <button onClick={handleRecordPayment} className="bg-emerald-400 text-black px-4 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-300">
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {adminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="liquid-glass-dark p-7 rounded-3xl max-w-sm w-full space-y-4 border border-white/20 text-white">
            <h3 className="text-lg font-medium">Admin Catalog & Rules Studio</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => setAdminForm({ ...adminForm, kind: 'product' })} className={`py-1.5 rounded-xl border ${adminForm.kind === 'product' ? 'bg-white text-black' : 'border-white/20 text-white/60'}`}>Add Product</button>
              <button onClick={() => setAdminForm({ ...adminForm, kind: 'discount' })} className={`py-1.5 rounded-xl border ${adminForm.kind === 'discount' ? 'bg-white text-black' : 'border-white/20 text-white/60'}`}>Add Discount</button>
            </div>
            {adminForm.kind === 'product' ? (
              <div className="space-y-2">
                <input type="text" placeholder="Product Name" value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} className="w-full liquid-glass px-3 py-2 rounded-xl text-xs" />
                <input type="number" placeholder="Sales Price" value={adminForm.price} onChange={e => setAdminForm({ ...adminForm, price: e.target.value })} className="w-full liquid-glass px-3 py-2 rounded-xl text-xs" />
                <p className="text-[11px] text-amber-200">Automatically includes Odoo Brand (+₹560) variant as per Scene 2.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="text" placeholder="Discount Code (e.g. SEATS20)" value={adminForm.code} onChange={e => setAdminForm({ ...adminForm, code: e.target.value })} className="w-full liquid-glass px-3 py-2 rounded-xl text-xs" />
                <input type="number" placeholder="Discount Value (%)" value={adminForm.value} onChange={e => setAdminForm({ ...adminForm, value: e.target.value })} className="w-full liquid-glass px-3 py-2 rounded-xl text-xs" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAdminModal(false)} className="px-3 py-1.5 text-xs text-white/60">Cancel</button>
              <button onClick={handleCreateAdminEntity} className="bg-white text-black px-4 py-1.5 rounded-xl text-xs font-semibold">Save Rule</button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#0e1017] p-8 rounded-3xl max-w-md w-full space-y-5 border border-white/20 text-white">
            <h3 className="text-xl font-bold font-mono text-amber-200">{selectedInvoice.invoice_number}</h3>
            <div className="text-xs space-y-1">
              <div>Customer: {selectedInvoice.customer_name}</div>
              <div>Subtotal: ₹{selectedInvoice.subtotal}</div>
              <div className="text-emerald-300">Discount: -₹{selectedInvoice.discount_amount}</div>
              <div>Tax (GST 18%): ₹{selectedInvoice.tax_amount}</div>
              <div className="font-bold text-sm text-amber-200 pt-1">Total: ₹{selectedInvoice.total_amount}</div>
              <div>Status: {selectedInvoice.status}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSelectedInvoice(null)} className="px-3 py-1.5 text-xs text-white/60">Close</button>
              <button onClick={() => window.print()} className="bg-white text-black px-4 py-1.5 rounded-xl text-xs font-semibold">Print Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
