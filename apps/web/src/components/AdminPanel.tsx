import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../constants";
import {
  Shield,
  Check,
  X,
  Trash2,
  RefreshCw,
  ChevronDown,
  BarChart3,
  Image,
  Clock,
  Users,
  Heart,
  MessageCircle,
  LogIn,
  AlertTriangle,
} from "lucide-react";

interface ModerationItem {
  id: string;
  image_url: string;
  thumbnail_small: string | null;
  contributor_tag: string;
  pin_code: string;
  detected_text: string | null;
  status: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Stats {
  total_uploads: number;
  pending_approvals: number;
  approved: number;
  rejected: number;
  total_cities: number;
  total_likes: number;
  total_comments: number;
}

type Tab = "queue" | "stats";

const SESSION_KEY = "ttl_admin_token";

function getStoredToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

function storeToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// --- Login Form ---

const LoginForm: React.FC<{ onLogin: (token: string) => void }> = ({
  onLogin,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid credentials");
      }
      const data = await res.json();
      storeToken(data.token);
      onLogin(data.token);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20 space-y-8">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-[#cc543a]" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">
          Admin Access
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border-2 border-black px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#cc543a]"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border-2 border-black px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#cc543a]"
            placeholder="Enter password"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border-2 border-red-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-700">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#cc543a] transition-colors disabled:opacity-50"
        >
          <LogIn size={14} />
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

// --- Admin Panel ---

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [tab, setTab] = useState<Tab>("queue");
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleLogout = () => {
    clearToken();
    setToken(null);
  };

  const handleAuthError = () => {
    clearToken();
    setToken(null);
  };

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/moderation?status=${statusFilter}&limit=50&offset=0`,
        { headers: authHeaders(token) },
      );
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch moderation queue:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
        headers: authHeaders(token),
      });
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      setStats(await res.json());
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === "queue") fetchQueue();
    if (tab === "stats") fetchStats();
  }, [tab, fetchQueue, fetchStats, token]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/letterings/${id}/approve`,
        {
          method: "POST",
          headers: authHeaders(token),
        },
      );
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error("Approve failed");
      // Update item status in-place instead of removing
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "APPROVED" } : i)),
      );
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return;
    setActionLoading(id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/letterings/${id}/reject`,
        {
          method: "POST",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: reason || null }),
        },
      );
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error("Reject failed");
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "REJECTED" } : i)),
      );
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (
      !window.confirm(
        "Permanently delete this lettering and all associated data?",
      )
    )
      return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/letterings/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Show login form if not authenticated
  if (!token) {
    return <LoginForm onLogin={(t) => setToken(t)} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-6">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-[#cc543a]" />
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
            Admin Panel
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLogout}
            className="bg-slate-200 text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors border-2 border-black"
          >
            Logout
          </button>
          <button
            onClick={onClose}
            className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#cc543a] transition-colors"
          >
            Back to Gallery
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-2 border-black">
        <button
          onClick={() => setTab("queue")}
          className={`flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${tab === "queue" ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"}`}
        >
          All Letterings
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest border-l-2 border-black transition-colors ${tab === "stats" ? "bg-black text-white" : "bg-white text-black hover:bg-slate-100"}`}
        >
          Statistics
        </button>
      </div>

      {tab === "queue" && (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border-2 border-black px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {total} items
              </span>
            </div>
            <button
              onClick={fetchQueue}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-100 border-2 border-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Queue items */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={32} className="animate-spin text-[#cc543a]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-300">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                No letterings found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-black p-4 flex gap-4 items-start"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-24 flex-shrink-0 bg-slate-100 border border-black overflow-hidden">
                    <img
                      src={item.thumbnail_small || item.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 ${
                          item.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : item.status === "APPROVED"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">
                        {item.contributor_tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-500">
                      <span>PIN: {item.pin_code}</span>
                      <span className="flex items-center gap-1">
                        <Heart size={10} /> {item.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={10} /> {item.comments_count}
                      </span>
                    </div>
                    {item.detected_text && (
                      <p className="text-xs font-bold text-slate-700 truncate">
                        Text: {item.detected_text}
                      </p>
                    )}
                    <p className="text-[8px] font-bold text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}{" "}
                      {new Date(item.created_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {item.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          <X size={12} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-6">
          {!stats ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={32} className="animate-spin text-[#cc543a]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Image size={20} />}
                label="Total Uploads"
                value={stats.total_uploads}
              />
              <StatCard
                icon={<Clock size={20} />}
                label="Pending"
                value={stats.pending_approvals}
                color="text-yellow-600"
              />
              <StatCard
                icon={<Check size={20} />}
                label="Approved"
                value={stats.approved}
                color="text-green-600"
              />
              <StatCard
                icon={<X size={20} />}
                label="Rejected"
                value={stats.rejected}
                color="text-red-600"
              />
              <StatCard
                icon={<Users size={20} />}
                label="Cities"
                value={stats.total_cities}
              />
              <StatCard
                icon={<Heart size={20} />}
                label="Total Likes"
                value={stats.total_likes}
                color="text-[#cc543a]"
              />
              <StatCard
                icon={<MessageCircle size={20} />}
                label="Total Comments"
                value={stats.total_comments}
              />
              <StatCard
                icon={<BarChart3 size={20} />}
                label="Approval Rate"
                value={
                  stats.total_uploads > 0
                    ? `${Math.round((stats.approved / stats.total_uploads) * 100)}%`
                    : "0%"
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-white border-2 border-black p-5 space-y-3">
    <div className={`${color || "text-slate-500"}`}>{icon}</div>
    <p
      className={`text-3xl font-black tracking-tighter ${color || "text-black"}`}
    >
      {value}
    </p>
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
  </div>
);

export default AdminPanel;
