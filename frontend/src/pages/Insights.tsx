import React, { useState, useEffect } from "react";
import { 
  Award, 
  Activity, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Code2, 
  ChevronRight,
  TrendingDown
} from "lucide-react";
import { api } from "../services/api";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  is_active: boolean;
}

export default function InsightsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const repositories = await api.get("/repositories");
        setRepos(repositories);
        if (repositories.length > 0) {
          setSelectedRepoId(repositories[0].id);
        }
      } catch (err) {
        console.error("Failed to load connected repositories for insights:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const getActiveRepo = () => {
    return repos.find((r) => r.id === selectedRepoId);
  };

  const getMetricStyle = (score: number) => {
    if (score >= 80) return { text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" };
    if (score >= 60) return { text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/10" };
    return { text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/10" };
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Pre-compiled high fidelity insights to render dynamic metrics selector
  const mockInsights: Record<string | number, any> = {
    default: {
      securityScore: 88,
      maintainabilityIndex: 78,
      cyclomaticComplexity: 12,
      technicalDebtHours: 32,
      duplicatedCodePercent: 4.2,
      deadCodeFiles: [
        { file: "app/utils/old_helper.py", lines: 124, rationale: "Unused since PR #12 merge" },
        { file: "src/legacy/sidebar_old.css", lines: 340, rationale: "CSS replaced by tailwind config" }
      ],
      issuesDistribution: {
        security: 1,
        performance: 4,
        style: 12,
        logic: 3
      }
    }
  };

  const activeRepo = getActiveRepo();
  const repoName = activeRepo?.name || "mock-repo";
  const insights = mockInsights[selectedRepoId || 0] || mockInsights.default;

  const securityStyle = getMetricStyle(insights.securityScore);
  const maintainabilityStyle = getMetricStyle(insights.maintainabilityIndex);

  return (
    <div className="space-y-8">
      {/* Header with Repository Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-outfit">Repository Insights</h2>
          <p className="text-slate-400 text-sm font-sans">Repository-wide complexity analysis, metrics, and debt audits.</p>
        </div>

        {repos.length > 0 && (
          <div className="select-none">
            <select
              value={selectedRepoId || ""}
              onChange={(e) => setSelectedRepoId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500/50 rounded-lg p-2.5 text-xs font-semibold font-sans"
            >
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {repos.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-500 rounded-xl border-slate-800/80 text-sm">
          No repositories connected. Connect repositories in the Connections tab to view code health insights.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Security Score */}
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
              <div className="flex justify-between items-start select-none">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Security Score</h4>
                  <p className="text-slate-400 text-[10px] font-sans mt-0.5">Vulnerability rating</p>
                </div>
                <div className={`p-3 rounded-xl border ${securityStyle.border} ${securityStyle.bg} ${securityStyle.text}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{insights.securityScore}%</span>
                <span className="text-xs text-emerald-400 font-semibold font-sans">Excellent</span>
              </div>
            </div>

            {/* Card 2: Maintainability Index */}
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
              <div className="flex justify-between items-start select-none">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Maintainability Index</h4>
                  <p className="text-slate-400 text-[10px] font-sans mt-0.5">Code readability and structure</p>
                </div>
                <div className={`p-3 rounded-xl border ${maintainabilityStyle.border} ${maintainabilityStyle.bg} ${maintainabilityStyle.text}`}>
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{insights.maintainabilityIndex}</span>
                <span className="text-xs text-amber-400 font-semibold font-sans">Good (Tier B)</span>
              </div>
            </div>

            {/* Card 3: Technical Debt */}
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
              <div className="flex justify-between items-start select-none">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Technical Debt</h4>
                  <p className="text-slate-400 text-[10px] font-sans mt-0.5">Estimated remediation time</p>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{insights.technicalDebtHours} hrs</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-0.5 font-sans select-none">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>-4 hrs saved this week</span>
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Detaill grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Complexity and Health Metrics list */}
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-white font-outfit select-none">Complexity Diagnosis</h3>
              
              <div className="space-y-4">
                {/* Metric 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Cyclomatic Complexity (Avg)</span>
                    <span className="text-white font-mono font-bold">{insights.cyclomaticComplexity} / file</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden select-none">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Typical for project size. Keep files modular.</span>
                </div>

                {/* Metric 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Duplicated Code</span>
                    <span className="text-white font-mono font-bold">{insights.duplicatedCodePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden select-none">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "15%" }}></div>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Healthy limits. Below industry average warning thresholds.</span>
                </div>

                {/* Metric 3 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Dead Code Volume</span>
                    <span className="text-white font-mono font-bold">2 files (~464 lines)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden select-none">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "20%" }}></div>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Unused files identified in imports tree. Refactor suggested.</span>
                </div>
              </div>
            </div>

            {/* Dead Code auditor panel */}
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white font-outfit select-none">Dead Code Audit Locations</h3>
              
              <div className="space-y-3">
                {insights.deadCodeFiles.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-200 font-mono">{item.file}</h5>
                      <p className="text-[10px] text-slate-500 font-sans">{item.rationale}</p>
                    </div>
                    <span className="text-[10px] text-rose-400 font-semibold font-mono whitespace-nowrap bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                      {item.lines} lines
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
