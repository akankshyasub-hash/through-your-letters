import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../constants";
import { useToastStore } from "../store/useToastStore";
import {
  Shield,
  Check,
  X,
  Trash2,
  RefreshCw,
  BarChart3,
  Image as ImageIcon,
  AlertTriangle,
  LogIn,
  Clock,
  Users,
  Heart,
  MessageCircle,
  ExternalLink,
  MapPin,
  Filter,
} from "lucide-react";
import { Lettering } from "../types";

const SESSION_KEY = "ttl_admin_token";

interface AdminStats {
  total_uploads: number;
  pending_approvals: number;
  approved: number;
  rejected: number;
  total_cities: number;
  total_likes: number;
  total_comments: number;
}

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addToast } = useToastStore();
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY),
  );
  const [tab, setTab] = useState<"queue" | "reports" | "stats">("queue");
  const [items, setItems] = useState<Lettering[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Stats synchronization failed");
    }
  }, [token]);

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const status = tab === "reports" ? "REPORTED" : statusFilter;
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/moderation?status=${status}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        setToken(null);
        addToast("Session expired", "error");
        return;
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      addToast("Failed to fetch queue", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, token, addToast]);

  useEffect(() => {
    if (token) {
      fetchQueue();
      fetchStats();
    }
  }, [token, tab, statusFilter, fetchQueue, fetchStats]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, data.token);
        setToken(data.token);
        addToast("Admin Access Granted", "success");
      } else {
        addToast(data.error || "Credentials invalid", "error");
      }
    } catch (err) {
      addToast("Auth service offline", "error");
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (
    id: string,
    action: "approve" | "reject" | "delete" | "keep",
  ) => {
    if (!token) return;

    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection:");
      if (reason === null) return; // User cancelled prompt
    }

    if (action === "delete" && !window.confirm("Purge artifact from database?"))
      return;

    setActionId(id);
    try {
      let url = `${API_BASE_URL}/api/v1/admin/letterings/${id}`;
      let method = "POST";
      let body: string | null = null;

      if (action === "approve") url += "/approve";
      if (action === "keep") url += "/clear-reports";
      if (action === "reject") {
        url += "/reject";
        body = JSON.stringify({ reason: reason || "Administrative rejection" });
      }
      if (action === "delete") method = "DELETE";

      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      if (body) headers["Content-Type"] = "application/json";

      const res = await fetch(url, { method, headers, body });

      if (res.ok) {
        addToast(
          `Artifact ${action === "keep" ? "cleared" : action + "ed"}`,
          "success",
        );
        setItems((prev) => prev.filter((i) => i.id !== id));
        fetchStats();
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast(errData.error || `Server declined ${action}`, "error");
      }
    } catch (e) {
      addToast("Network failure", "error");
    } finally {
      setActionId(null);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto pt-20 space-y-8 animate-in">
        <div className="flex items-center gap-4">
          <Shield className="text-[#cc543a]" size={32} />
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Admin Portal
          </h1>
        </div>
        <form
          onSubmit={handleLogin}
          className="space-y-4 bg-white p-10 border-4 border-black brutalist-shadow"
        >
          <input
            type="email"
            placeholder="Email"
            className="w-full border-2 border-black p-4 font-black"
            onChange={(e) =>
              setLoginData({ ...loginData, email: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border-2 border-black p-4 font-black"
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:translate-y-1 transition-all"
          >
            {loading ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}{" "}
            Initialize Node
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-black pb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Shield className="text-[#cc543a]" size={20} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Curator Control
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="bg-black text-white px-6 py-2 text-[10px] font-black uppercase hover:bg-[#cc543a] transition-all"
          >
            Exit Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<ImageIcon size={18} />}
          label="Total Artifacts"
          value={stats?.total_uploads || 0}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Pending Review"
          value={stats?.pending_approvals || 0}
          color="text-[#cc543a]"
        />
        <StatCard
          icon={<Heart size={18} />}
          label="Archive Likes"
          value={stats?.total_likes || 0}
        />
        <StatCard
          icon={<MessageCircle size={18} />}
          label="Notes/Comments"
          value={stats?.total_comments || 0}
        />
      </div>

      <div className="flex border-4 border-black bg-white sticky top-0 z-20 brutalist-shadow-sm">
        <button
          onClick={() => setTab("queue")}
          className={`flex-1 py-5 font-black uppercase text-xs flex items-center justify-center gap-2 ${tab === "queue" ? "bg-black text-white" : "hover:bg-slate-50"}`}
        >
          <Filter size={16} /> Moderation
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`flex-1 py-5 font-black uppercase text-xs border-l-4 border-black flex items-center justify-center gap-2 ${tab === "reports" ? "bg-[#cc543a] text-white" : "hover:bg-slate-50"}`}
        >
          <AlertTriangle size={16} /> Flags
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex-1 py-5 font-black uppercase text-xs border-l-4 border-black flex items-center justify-center gap-2 ${tab === "stats" ? "bg-black text-white" : "hover:bg-slate-50"}`}
        >
          <BarChart3 size={16} /> Activity
        </button>
      </div>

      {tab === "queue" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-slate-50 p-4 border-2 border-black">
            <div className="flex gap-4 items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Queue Filter:
              </span>
              {["PENDING", "APPROVED", "REJECTED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-[9px] font-black uppercase border-2 border-black ${statusFilter === s ? "bg-black text-white" : "bg-white"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={fetchQueue}
              className="text-[#cc543a] hover:rotate-180 transition-transform"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          <div className="grid gap-6">
            {loading ? (
              <RefreshCw
                className="animate-spin mx-auto text-[#cc543a]"
                size={40}
              />
            ) : items.length === 0 ? (
              <div className="text-center py-32 border-4 border-dashed border-black/10 font-black uppercase text-slate-300">
                Nothing here requires attention
              </div>
            ) : (
              items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  isProcessing={actionId === item.id}
                  onApprove={() => performAction(item.id, "approve")}
                  onReject={() => performAction(item.id, "reject")}
                  onDelete={() => performAction(item.id, "delete")}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-8">
          <div className="bg-yellow-50 border-4 border-yellow-600 p-6 flex items-center gap-4">
            <AlertTriangle className="text-yellow-600" size={32} />
            <div>
              <h2 className="font-black uppercase text-lg text-yellow-900 leading-none">
                Priority Content flagged
              </h2>
              <p className="text-[10px] font-bold text-yellow-700 mt-1 uppercase tracking-widest">
                Review reports and decide whether to retain or purge artifacts.
              </p>
            </div>
          </div>
          <div className="grid gap-6">
            {loading ? (
              <RefreshCw
                className="animate-spin mx-auto text-[#cc543a]"
                size={40}
              />
            ) : items.length === 0 ? (
              <div className="text-center py-32 border-4 border-dashed border-black/10 font-black uppercase text-slate-300">
                No active reports
              </div>
            ) : (
              items.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  isProcessing={actionId === item.id}
                  isReported
                  onApprove={() => performAction(item.id, "keep")}
                  onDelete={() => performAction(item.id, "delete")}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="space-y-12 bg-white border-4 border-black p-12 brutalist-shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="space-y-8">
              <h3 className="text-4xl font-black uppercase tracking-tighter border-b-4 border-black pb-4">
                Node Insights
              </h3>
              <div className="space-y-4 font-black uppercase text-sm">
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Total Discovery Entries</span>
                  <span className="text-[#cc543a]">{stats.total_uploads}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Curation Accuracy</span>
                  <span className="text-[#cc543a]">
                    {Math.round(
                      (stats.approved / (stats.total_uploads || 1)) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span>Unique Contributors</span>
                  <span className="text-[#cc543a]">{stats.total_cities}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-4 border-black p-8 relative">
              <h4 className="text-xl font-black uppercase mb-6 tracking-tighter">
                Infrastructure
              </h4>
              <div className="space-y-4">
                <HealthIndicator
                  label="PostgreSQL Core"
                  value="Online"
                  color="bg-green-500"
                />
                <HealthIndicator
                  label="R2 File Storage"
                  value="Stable"
                  color="bg-green-500"
                />
                <HealthIndicator
                  label="ML Processing Node"
                  value="Idle"
                  color="bg-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color = "text-black" }: any) => (
  <div className="bg-white border-4 border-black p-6 brutalist-shadow-sm space-y-4">
    <div className="text-slate-400">{icon}</div>
    <div>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
        {label}
      </p>
    </div>
  </div>
);

const ModerationCard = ({
  item,
  onApprove,
  onReject,
  onDelete,
  isProcessing,
  isReported,
}: any) => (
  <div className="bg-white border-4 border-black p-6 flex flex-col md:flex-row gap-8 transition-all hover:bg-slate-50">
    <div className="w-full md:w-56 h-56 flex-shrink-0 border-2 border-black bg-slate-100 overflow-hidden relative group">
      <img
        src={item.image_url}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        alt="Artifact"
      />
      <a
        href={item.image_url}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
      >
        <ExternalLink className="text-white" size={24} />
      </a>
    </div>
    <div className="flex-1 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-[#cc543a] flex items-center gap-2">
            <MapPin size={10} /> {item.pin_code} // <Users size={10} />{" "}
            {item.contributor_tag}
          </p>
          <h3 className="text-2xl font-black uppercase tracking-tighter break-words">
            {item.detected_text || "Awaiting Scan"}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
        {isReported && (
          <div className="bg-red-50 border-2 border-red-600 px-4 py-2 flex items-center gap-2 text-red-700 font-black text-[10px] uppercase">
            <AlertTriangle size={14} /> {item.report_count || 1} Flags
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Description
          </p>
          <p className="text-sm font-medium text-slate-700 leading-relaxed italic break-words line-clamp-3">
            "{item.description || "No context provided."}"
          </p>
        </div>
        <div className="space-y-2 border-l-2 border-slate-100 pl-6">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Signals
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-[10px] font-black">
              <Heart size={12} /> {item.likes_count || 0}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black">
              <MessageCircle size={12} /> {item.comments_count || 0}
            </span>
          </div>
          {item.ml_metadata && (
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                {item.ml_metadata.style}
              </span>
              <span className="bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                {item.ml_metadata.script}
              </span>
            </div>
          )}
        </div>
      </div>

      {item.cultural_context && (
        <div className="bg-slate-50 p-4 border-l-4 border-[#2d5a27] space-y-1">
          <p className="text-[10px] font-black uppercase text-[#2d5a27] tracking-widest">
            Neighborhood History (Wikipedia)
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic line-clamp-4">
            {item.cultural_context}
          </p>
        </div>
      )}

      {isReported && item.report_reasons && (
        <div className="bg-red-50/50 p-4 border-l-4 border-red-600 space-y-1">
          <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">
            User Complaints:
          </p>
          {item.report_reasons.map((r: string, i: number) => (
            <p key={i} className="text-sm font-bold text-red-900">
              • {r}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-4 pt-2">
        <button
          disabled={isProcessing}
          onClick={onApprove}
          className="flex-1 bg-black text-white py-4 font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Check size={18} />
          )}
          {isReported ? "Clear Flags" : "Approve"}
        </button>
        {!isReported && (
          <button
            disabled={isProcessing}
            onClick={onReject}
            className="flex-1 border-2 border-black py-4 font-black uppercase text-[11px] flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            <X size={18} /> Reject
          </button>
        )}
        <button
          disabled={isProcessing}
          onClick={onDelete}
          className="px-8 border-2 border-black py-4 font-black uppercase text-[11px] text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  </div>
);

const HealthIndicator = ({ label, value, color }: any) => (
  <div className="flex items-center justify-between border-b border-black/5 pb-2">
    <span className="text-[10px] font-black uppercase text-slate-500">
      {label}
    </span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase">{value}</span>
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
    </div>
  </div>
);

export default AdminPanel;
