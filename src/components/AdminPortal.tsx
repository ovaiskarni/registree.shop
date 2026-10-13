import React, { useState, useEffect } from 'react';

export interface LeadItem {
  id: string;
  timestamp: string;
  service: string;
  name: string;
  email: string;
  whatsapp: string;
  query: string;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Converted' | 'Archived';
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
  budget?: string;
  lastUpdated: string;
}

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('registree_admin_token');
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Leads & Dashboard state
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newLeads: 0,
    contacted: 0,
    proposalSent: 0,
    converted: 0,
    archived: 0,
  });
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Manual Add Lead state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    service: 'Website Design (+ Free Logo Bundle)',
    query: '',
    priority: 'High' as 'High' | 'Medium' | 'Low',
    budget: '₹19,999 (~$230 USD)',
    notes: '',
  });

  // Editing notes state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      setLeads(data.leads || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchLeads();
    }
  }, [isOpen, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error('Invalid email or password. Access denied.');
      }

      localStorage.setItem('registree_admin_token', data.token);
      setIsAuthenticated(true);
      fetchLeads();
    } catch (err: any) {
      setLoginError('Invalid email or password. Access denied.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('registree_admin_token');
    setIsAuthenticated(false);
    setLeads([]);
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadItem['status']) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, lastUpdated: new Date().toISOString() } : l))
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handlePriorityChange = async (leadId: string, newPriority: LeadItem['priority']) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, priority: newPriority, lastUpdated: new Date().toISOString() } : l))
        );
      }
    } catch (err) {
      console.error('Error updating priority:', err);
    }
  };

  const handleSaveNotes = async (leadId: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: tempNotes }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, notes: tempNotes, lastUpdated: new Date().toISOString() } : l))
        );
        setEditingNotesId(null);
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadData),
      });
      const data = await res.json();
      if (res.ok && data.lead) {
        setLeads((prev) => [data.lead, ...prev]);
        setShowAddModal(false);
        setNewLeadData({
          name: '',
          email: '',
          whatsapp: '',
          service: 'Website Design (+ Free Logo Bundle)',
          query: '',
          priority: 'High',
          budget: '₹19,999 (~$230 USD)',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Name', 'Service', 'Email', 'WhatsApp', 'Status', 'Priority', 'Budget', 'Notes', 'Query'];
    const rows = leads.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.service.replace(/"/g, '""')}"`,
      l.email,
      `'${l.whatsapp}`,
      l.status,
      l.priority,
      `"${(l.budget || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${l.query.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REGISTREE_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.whatsapp.includes(q) ||
      lead.service.toLowerCase().includes(q) ||
      lead.query.toLowerCase().includes(q) ||
      (lead.notes && lead.notes.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-7xl h-[92vh] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-[#090e1f] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <span
              className="text-lg font-bold tracking-[0.25em] text-white select-none"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              REGISTREE
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#60a5fa] bg-blue-900/40 px-2.5 py-0.5 border border-blue-500/30">
              Admin Lead Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <span className="hidden sm:inline text-xs text-gray-300">
                Logged in: <strong className="text-white">theregistreein@gmail.com</strong>
              </span>
            )}

            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                Logout
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-light leading-none p-1 cursor-pointer"
              aria-label="Close Admin Portal"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isAuthenticated ? (
          /* LOGIN SCREEN */
          <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="w-full max-w-md bg-white border-2 border-gray-200 shadow-xl p-8 sm:p-10">
              <div className="text-center mb-8">
                <span className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#0047ff]/10 text-[#0047ff] flex items-center justify-center text-xl font-bold">
                  🔒
                </span>
                <h3 className="text-2xl font-bold text-[#090e1f]">Administrator Sign In</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Access leads, tracking pipeline & customer actions
                </p>
              </div>

              {loginError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#090e1f] mb-1.5">
                    Admin Email / Username
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email or username"
                    required
                    autoComplete="username"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#090e1f] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 text-xs font-bold uppercase tracking-wider bg-[#090e1f] hover:bg-[#0047ff] text-white transition-colors duration-150 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? 'Authenticating...' : 'Enter Admin Lead Portal'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* LEADS DASHBOARD & TRACKER */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
            {/* Metrics Bar */}
            <div className="p-4 sm:p-6 bg-white border-b border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
              <div
                onClick={() => setStatusFilter('All')}
                className={`p-3 border cursor-pointer transition-all ${
                  statusFilter === 'All' ? 'border-[#0047ff] bg-blue-50/50 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Total Inquiries</span>
                <span className="text-2xl font-black text-[#090e1f]">{stats.total}</span>
              </div>

              <div
                onClick={() => setStatusFilter('New')}
                className={`p-3 border cursor-pointer transition-all ${
                  statusFilter === 'New' ? 'border-[#dc2626] bg-red-50/50 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626] block">New / Uncontacted</span>
                <span className="text-2xl font-black text-[#dc2626]">{stats.newLeads}</span>
              </div>

              <div
                onClick={() => setStatusFilter('Contacted')}
                className={`p-3 border cursor-pointer transition-all ${
                  statusFilter === 'Contacted' ? 'border-[#0047ff] bg-blue-50/50 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0047ff] block">Contacted</span>
                <span className="text-2xl font-black text-[#0047ff]">{stats.contacted}</span>
              </div>

              <div
                onClick={() => setStatusFilter('Proposal Sent')}
                className={`p-3 border cursor-pointer transition-all ${
                  statusFilter === 'Proposal Sent' ? 'border-purple-600 bg-purple-50/50 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Proposal Sent</span>
                <span className="text-2xl font-black text-purple-700">{stats.proposalSent}</span>
              </div>

              <div
                onClick={() => setStatusFilter('Converted')}
                className={`p-3 border cursor-pointer transition-all col-span-2 sm:col-span-1 ${
                  statusFilter === 'Converted' ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Won / Converted</span>
                <span className="text-2xl font-black text-emerald-700">{stats.converted}</span>
              </div>
            </div>

            {/* Filter & Action Bar */}
            <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-1 items-center space-x-3 min-w-[280px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by client name, email, phone, or service..."
                  className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-300 focus:bg-white focus:border-[#0047ff] focus:outline-hidden"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-gray-50 border border-gray-300 focus:outline-hidden"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Converted">Converted</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#0047ff] hover:bg-[#090e1f] text-white transition-colors cursor-pointer"
                >
                  + Add Manual Lead
                </button>

                <button
                  onClick={exportCSV}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                  title="Download all leads as spreadsheet"
                >
                  Export CSV
                </button>

                <button
                  onClick={fetchLeads}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
                  title="Refresh leads list"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Leads Table / Cards Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingLeads ? (
                <div className="py-20 text-center text-sm text-gray-500">
                  Loading lead pipeline...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-base font-bold text-gray-700 mb-1">No leads match your search criteria</p>
                  <p className="text-xs text-gray-400">Clear filters or add a manual lead to get started.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-5 bg-white border border-gray-200 hover:border-[#0047ff] shadow-2xs transition-all relative"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      {/* Left: Lead Identity */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h4 className="text-base font-extrabold text-[#090e1f]">{lead.name}</h4>
                          <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-50 text-[#0047ff] border border-blue-200">
                            {lead.service}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                              lead.priority === 'High'
                                ? 'bg-red-100 text-red-700'
                                : lead.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {lead.priority} Priority
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                          <span>
                            ID: <strong className="text-gray-700 font-mono">{lead.id}</strong>
                          </span>
                          <span>•</span>
                          <span>Submitted: {new Date(lead.timestamp).toLocaleString()}</span>
                          {lead.budget && (
                            <>
                              <span>•</span>
                              <span>
                                Budget: <strong className="text-[#090e1f]">{lead.budget}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Tracker Selector */}
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold text-gray-500">Pipeline Stage:</span>
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadItem['status'])}
                          className={`px-3 py-1.5 text-xs font-bold border focus:outline-hidden ${
                            lead.status === 'New'
                              ? 'bg-red-50 text-[#dc2626] border-red-300'
                              : lead.status === 'Contacted'
                              ? 'bg-blue-50 text-[#0047ff] border-blue-300'
                              : lead.status === 'Proposal Sent'
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : lead.status === 'Converted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                        >
                          <option value="New">🔴 New</option>
                          <option value="Contacted">🔵 Contacted</option>
                          <option value="Proposal Sent">🟣 Proposal Sent</option>
                          <option value="Converted">🟢 Won / Converted</option>
                          <option value="Archived">⚪ Archived</option>
                        </select>
                      </div>
                    </div>

                    {/* Middle: Query Requirements */}
                    <div className="py-4 text-xs sm:text-sm text-gray-700 bg-gray-50/70 p-3.5 my-3 border border-gray-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Client Query / Project Scope:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{lead.query}</p>
                    </div>

                    {/* Internal Admin Notes */}
                    <div className="my-2 p-3 bg-amber-50/50 border border-amber-200/60 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                          Internal Action Notes
                        </span>
                        {editingNotesId !== lead.id ? (
                          <button
                            onClick={() => {
                              setEditingNotesId(lead.id);
                              setTempNotes(lead.notes || '');
                            }}
                            className="text-[#0047ff] hover:underline font-semibold"
                          >
                            Edit Note
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSaveNotes(lead.id)}
                              className="text-emerald-700 hover:underline font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {editingNotesId === lead.id ? (
                        <textarea
                          rows={2}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Type internal notes regarding meetings, calls, proposals..."
                          className="w-full p-2 text-xs bg-white border border-amber-300 focus:outline-hidden"
                        />
                      ) : (
                        <p className="text-gray-700 italic">
                          {lead.notes || 'No notes added yet. Click edit to record customer call updates.'}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Fast Action Buttons ("ACT") */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1-Click WhatsApp Action */}
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${lead.name}, this is the REGISTREE team regarding your inquiry for "${lead.service}". How can we best assist you with your requirements today?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold uppercase tracking-wider transition-colors shadow-2xs"
                        >
                          <span>💬 WhatsApp ({lead.whatsapp})</span>
                        </a>

                        {/* 1-Click Email Action */}
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(
                            `REGISTREE: Proposal & Next Steps for ${lead.service} - [Ref: ${lead.id}]`
                          )}&body=${encodeURIComponent(
                            `Dear ${lead.name},\n\nThank you for reaching out to REGISTREE regarding ${lead.service}.\n\nWe have reviewed your project requirements:\n"${lead.query}"\n\nWe would be pleased to schedule a short consultation to discuss execution timelines, deliverables, and customized pricing.\n\nWarm regards,\nREGISTREE Advisory Team\nNew Delhi, India\n+91-6005534878`
                          )}`}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#0047ff] hover:bg-[#090e1f] text-white font-bold uppercase tracking-wider transition-colors shadow-2xs"
                        >
                          <span>✉️ Send Email ({lead.email})</span>
                        </a>

                        {/* Direct Phone Call */}
                        <a
                          href={`tel:${lead.whatsapp}`}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                        >
                          📞 Call
                        </a>
                      </div>

                      <div className="flex items-center space-x-3">
                        <select
                          value={lead.priority}
                          onChange={(e) => handlePriorityChange(lead.id, e.target.value as LeadItem['priority'])}
                          className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-600"
                        >
                          <option value="High">High Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="Low">Low Priority</option>
                        </select>

                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-red-500 hover:text-red-700 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Manual Lead Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
            <div className="w-full max-w-lg bg-white border border-gray-300 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h4 className="text-lg font-bold text-[#090e1f]">Add New Lead Manually</h4>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-black text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadData.name}
                    onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newLeadData.email}
                      onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-gray-700 mb-1">WhatsApp / Phone *</label>
                    <input
                      type="text"
                      required
                      value={newLeadData.whatsapp}
                      onChange={(e) => setNewLeadData({ ...newLeadData, whatsapp: e.target.value })}
                      placeholder="+91..."
                      className="w-full px-3 py-2 border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Service / Package</label>
                  <select
                    value={newLeadData.service}
                    onChange={(e) => setNewLeadData({ ...newLeadData, service: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                  >
                    <option value="Website Design (+ Free Logo Bundle)">Website Design (+ Free Logo Bundle)</option>
                    <option value="Standalone Logo Design (₹999)">Standalone Logo Design (₹999)</option>
                    <option value="AI Automation">AI Automation</option>
                    <option value="AI Voice Agent for Business">AI Voice Agent for Business</option>
                    <option value="Company Registration in India">Company Registration in India</option>
                    <option value="Trademark Registration">Trademark Registration</option>
                    <option value="GST, PAN & Other Compliances">GST, PAN & Other Compliances</option>
                    <option value="Business Setup & Development in India">Business Setup & Development in India</option>
                    <option value="International Trade Facilitator">International Trade Facilitator</option>
                    <option value="International Cargo Service">International Cargo Service</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Query / Project Notes</label>
                  <textarea
                    rows={3}
                    value={newLeadData.query}
                    onChange={(e) => setNewLeadData({ ...newLeadData, query: e.target.value })}
                    placeholder="Client requirements, timeline, budget notes..."
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#0047ff] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 font-bold uppercase text-gray-500 hover:text-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 font-bold uppercase bg-[#0047ff] text-white hover:bg-[#090e1f] transition-colors cursor-pointer"
                  >
                    Save Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
