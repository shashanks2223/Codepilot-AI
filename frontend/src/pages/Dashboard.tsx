import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GitPullRequest, 
  Clock, 
  ShieldAlert, 
  FileCode2, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Zap,
  Play
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { api } from "../services/api";

interface AnalyticsCard {
  total_reviews: number;
  total_time_saved_seconds: number;
  security_issues_count: number;
  critical_issues_count: number;
}

interface CategoryDistributionItem {
  category: string;
  count: number;
}

interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  is_active: boolean;
}

interface PullRequest {
  id: number;
  repository_id: number;
  github_number: number;
  title: string;
  state: string;
  author_username: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);
  
  const [analytics, setAnalytics] = useState<{
    cards: AnalyticsCard;
    category_distribution: CategoryDistributionItem[];
    monthly_reviews: any[];
  } | null>(null);
  
  const [repos, setRepos] = useState<Repository[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const analyticsData = await api.get("/review/dashboard/analytics");
      setAnalytics(analyticsData);

      const repositories = await api.get("/repositories");
      setRepos(repositories);

      // Fetch all pull requests for active repositories
      let activePrs: PullRequest[] = [];
      for (const repo of repositories) {
        if (repo.is_active) {
          const repoPrs = await api.get(`/repositories/${repo.id}/prs`);
          // filter only open ones for immediate attention queue
          activePrs = [...activePrs, ...repoPrs.filter((p: any) => p.state === "open")];
        }
      }
      setPrs(activePrs);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStartReview = async (prId: number) => {
    try {
      // Trigger API review initialization
      const review = await api.post("/review/start", { pull_request_id: prId });
      navigate(`/review/${prId}`);
    } catch (err) {
      console.error("Failed to run code review pipeline:", err);
    }
  };

  const handleSyncRepository = async (repoId: number) => {
    setSyncing(repoId);
    try {
      await api.post(`/repositories/${repoId}/sync`);
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to sync repository pull requests:", err);
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-800 rounded-xl lg:col-span-2"></div>
          <div className="h-80 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];
  const formatTimeSaved = (seconds: number) => {
    const hours = Math.round(seconds / 3600);
    return `${hours} hrs`;
  };

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-outfit">Auditor Dashboard</h2>
          <p className="text-slate-400 text-sm">System diagnostic metrics and pull requests awaiting review.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg hover:text-white transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Total Reviews */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between h-28 border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Reviews</p>
              <h3 className="text-2xl font-bold text-white mt-1">{analytics?.cards.total_reviews}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <GitPullRequest className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold select-none">
            <TrendingUp className="w-3 h-3" />
            <span>+15% increase month-over-month</span>
          </div>
        </div>

        {/* Card 2: Time Saved */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between h-28 border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auditor Time Saved</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {formatTimeSaved(analytics?.cards.total_time_saved_seconds || 0)}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 select-none">
            <span>Estimated developer hours saved</span>
          </div>
        </div>

        {/* Card 3: Security Risks */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between h-28 border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security Audits</p>
              <h3 className="text-2xl font-bold text-white mt-1">{analytics?.cards.security_issues_count}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold select-none">
            <span>Vulnerabilities identified</span>
          </div>
        </div>

        {/* Card 4: Critical Blocks */}
        <div className="glass-panel p-6 rounded-xl relative overflow-hidden flex flex-col justify-between h-28 border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical Blocks</p>
              <h3 className="text-2xl font-bold text-white mt-1">{analytics?.cards.critical_issues_count}</h3>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold select-none">
            <span>Requires immediate developer fix</span>
          </div>
        </div>
      </div>

      {/* Graphic charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart */}
        <div className="glass-panel p-6 rounded-xl border-slate-800 lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-base font-bold text-white font-outfit">Review Frequency Trend</h4>
            <p className="text-xs text-slate-500">Volume of AI reviews completed over time.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthly_reviews || []}>
                <defs>
                  <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <ChartTooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="reviews" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReviews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
          <div>
            <h4 className="text-base font-bold text-white font-outfit">Issues Category Distribution</h4>
            <p className="text-xs text-slate-500">Classification of AI identified audit findings.</p>
          </div>
          <div className="h-56 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.category_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="category"
                >
                  {(analytics?.category_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Findings</span>
              <span className="text-xl font-bold text-white">
                {analytics?.category_distribution.reduce((acc, curr) => acc + curr.count, 0) || 0}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-medium text-slate-400">
            {analytics?.category_distribution.map((item, index) => (
              <div key={item.category} className="flex items-center gap-1.5 capitalize">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span>{item.category.replace("_", " ")} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pull Request Audit Queue */}
      <div className="glass-panel rounded-xl border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h4 className="text-base font-bold text-white font-outfit">Pull Request Audit Queue</h4>
            <p className="text-xs text-slate-500">Open pull requests waiting for review cycles.</p>
          </div>
        </div>

        {prs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm space-y-2">
            <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Your review queue is clear! Connect active repositories to start auditing code.</p>
            <Link to="/repositories" className="text-blue-500 hover:text-blue-400 font-semibold text-xs inline-flex items-center gap-1">
              <span>Connect repositories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {prs.map((pr) => {
              const repo = repos.find((r) => r.id === pr.repository_id);
              return (
                <div key={pr.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-500 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {repo?.name || "Repository"}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">#{pr.github_number}</span>
                      <h5 className="text-sm font-bold text-white font-outfit">{pr.title}</h5>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Author: <b className="text-slate-300 font-mono">{pr.author_username}</b></span>
                      <span>•</span>
                      <span>Sync Date: {new Date(pr.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncRepository(pr.repository_id)}
                      disabled={syncing === pr.repository_id}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors disabled:opacity-50 select-none"
                      title="Sync PR"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing === pr.repository_id ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleStartReview(pr.id)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] select-none"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Audit</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
