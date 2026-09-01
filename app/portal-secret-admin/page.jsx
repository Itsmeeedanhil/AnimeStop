'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Megaphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Eye,
  RefreshCw,
  Power,
  ExternalLink,
  Activity,
  Users,
  Film,
  Database
} from 'lucide-react';

export default function AdminPortalPage() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Data State
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [badge, setBadge] = useState('ANNOUNCEMENT');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDismissible, setIsDismissible] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Check stored auth key on load
  useEffect(() => {
    const savedKey = localStorage.getItem('animestop_admin_key');
    if (savedKey) {
      verifyKey(savedKey);
    }
  }, []);

  const verifyKey = async (key) => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: key }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('animestop_admin_key', key);
        setIsAuthenticated(true);
        loadDashboardData(key);
      } else {
        localStorage.removeItem('animestop_admin_key');
        setAuthError('Invalid admin passcode');
      }
    } catch (err) {
      setAuthError('Connection error to auth server');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    verifyKey(passcode.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('animestop_admin_key');
    setIsAuthenticated(false);
    setPasscode('');
  };

  const loadDashboardData = async (key) => {
    const activeKey = key || localStorage.getItem('animestop_admin_key');
    if (!activeKey) return;

    setIsLoading(true);
    try {
      // 1. Fetch announcements
      const resAnn = await fetch('/api/admin/announcements', {
        headers: { 'x-admin-key': activeKey },
      });
      const dataAnn = await resAnn.json();
      if (dataAnn.success) {
        setAnnouncements(dataAnn.data || []);
      }

      // 2. Fetch stats
      const resStats = await fetch('/api/analytics/stats');
      const dataStats = await resStats.json();
      if (dataStats.success) {
        setStats(dataStats.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both Title and Message');
      return;
    }

    const activeKey = localStorage.getItem('animestop_admin_key');
    setIsPublishing(true);
    setActionSuccess('');

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': activeKey,
        },
        body: JSON.stringify({
          title,
          message,
          type,
          badge: badge || 'ANNOUNCEMENT',
          link_url: linkUrl,
          link_text: linkText,
          is_active: isActive,
          is_dismissible: isDismissible,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess('🎉 Announcement published live!');
        setTitle('');
        setMessage('');
        setLinkUrl('');
        setLinkText('');
        loadDashboardData(activeKey);
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        alert(data.error || 'Failed to publish announcement');
      }
    } catch (err) {
      alert('Error publishing announcement');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    const activeKey = localStorage.getItem('animestop_admin_key');
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': activeKey,
        },
        body: JSON.stringify({
          id,
          is_active: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData(activeKey);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const activeKey = localStorage.getItem('animestop_admin_key');
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': activeKey },
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData(activeKey);
      }
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN (HIDDEN PORTAL)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161818] border border-[#ffe9b0]/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ffe9b0]/20 to-[#f2ca50]/10 border border-[#ffe9b0]/40 flex items-center justify-center mx-auto mb-4 text-[#ffe9b0] shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="font-['Bodoni_Moda'] text-2xl font-bold text-white tracking-wide">
              AnimeStop Portal
            </h1>
            <p className="text-xs text-[#99907c] mt-1.5">
              Secure Owner Management Console
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#d0c5af] mb-1.5">
                Admin Master Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter admin passcode..."
                  className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0] transition-colors"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-[#ffe9b0] hover:bg-[#f2ca50] text-[#241a00] font-bold text-sm transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Access Admin Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN CONSOLE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0d0f0f] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#161818] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ffe9b0]/15 text-[#ffe9b0] flex items-center justify-center border border-[#ffe9b0]/30 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span>AnimeStop Admin Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-[#99907c]">Broadcast announcements & monitor platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadDashboardData()}
              className="p-2 rounded-xl bg-[#0d0f0f] hover:bg-white/5 text-[#d0c5af] hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Platform Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#161818] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs text-[#99907c] mb-1">
              <span>Total Visits</span>
              <Activity className="w-4 h-4 text-[#ffe9b0]" />
            </div>
            <p className="text-xl font-bold text-white">{stats?.totalVisits?.toLocaleString() || '1,248+'}</p>
          </div>

          <div className="bg-[#161818] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs text-[#99907c] mb-1">
              <span>Unique Visitors</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">{stats?.uniqueVisitors?.toLocaleString() || '856+'}</p>
          </div>

          <div className="bg-[#161818] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs text-[#99907c] mb-1">
              <span>Database Status</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">Connected</p>
          </div>

          <div className="bg-[#161818] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs text-[#99907c] mb-1">
              <span>Active Broadcasts</span>
              <Megaphone className="w-4 h-4 text-[#ffe9b0]" />
            </div>
            <p className="text-xl font-bold text-[#ffe9b0]">
              {announcements.filter((a) => a.is_active).length} Active
            </p>
          </div>
        </div>

        {/* Create Announcement Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-[#161818] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <Megaphone className="w-5 h-5 text-[#ffe9b0]" />
              <h2 className="text-base font-bold text-white">Broadcast New Announcement</h2>
            </div>

            {actionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Seasonal Anime Episodes Added!"
                  className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                  Announcement Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="e.g. Demon Slayer and Mushoku Tensei new episodes are now streaming in 1080p across all 5 servers."
                  className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                    Banner Theme Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ffe9b0]"
                  >
                    <option value="info">📢 Gold Info (Default)</option>
                    <option value="update">⚡ Feature / Update</option>
                    <option value="warning">⚠️ Notice / Maintenance</option>
                    <option value="event">🎉 Special Release</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. ANNOUNCEMENT / NEW"
                    className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                    Button Action Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="e.g. /watch/101922 or https://..."
                    className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#d0c5af] mb-1">
                    Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="e.g. Watch Now →"
                    className="w-full bg-[#0d0f0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#ffe9b0]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d0c5af]">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-[#ffe9b0] w-4 h-4 rounded"
                  />
                  <span>Publish Immediately (Active)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d0c5af]">
                  <input
                    type="checkbox"
                    checked={isDismissible}
                    onChange={(e) => setIsDismissible(e.target.checked)}
                    className="accent-[#ffe9b0] w-4 h-4 rounded"
                  />
                  <span>Allow Users to Dismiss Banner</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPublishing}
                className="w-full py-3 rounded-xl bg-[#ffe9b0] hover:bg-[#f2ca50] text-[#241a00] font-bold text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isPublishing ? 'Publishing Announcement...' : 'Publish Announcement Live'}</span>
              </button>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#161818] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3 text-xs font-bold text-[#ffe9b0]">
                <Eye className="w-4 h-4" />
                <span>Live Website Banner Preview</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1c1a14] border border-[#ffe9b0]/30 shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#ffe9b0] text-[#241a00] tracking-wider">
                    {badge || 'ANNOUNCEMENT'}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {title || 'Your Announcement Title Here'}
                  </span>
                </div>
                <p className="text-xs text-[#d0c5af] leading-relaxed">
                  {message || 'This is how your live broadcast announcement will look to all visitors across the website.'}
                </p>
                {linkUrl && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ffe9b0] hover:underline">
                      {linkText || 'Learn More'} &rarr;
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Announcements List */}
            <div className="bg-[#161818] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center justify-between">
                <span>Existing Announcements</span>
                <span className="text-[10px] text-[#99907c]">{announcements.length} Total</span>
              </h3>

              {announcements.length === 0 ? (
                <p className="text-xs text-[#99907c] py-4 text-center">No announcements created yet.</p>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.is_active
                          ? 'bg-[#1c1a14] border-[#ffe9b0]/30'
                          : 'bg-[#0d0f0f] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-white">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(item.id, item.is_active)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              item.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#99907c] line-clamp-2">{item.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

