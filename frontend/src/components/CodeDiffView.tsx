import React, { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Check, 
  X, 
  Copy, 
  AlertCircle, 
  ExternalLink,
  Cpu,
  Info,
  AlertTriangle,
  Flame,
  CheckCircle2
} from "lucide-react";

interface Comment {
  id: number;
  review_id: number;
  file_path: string;
  line_number: number;
  severity: string;
  category: string;
  issue: string;
  explanation: string;
  suggested_fix?: string | null;
  improved_code?: string | null;
  confidence_score: number;
  status: string;
}

interface DiffLine {
  type: "added" | "deleted" | "context";
  content: string;
  old_line: number | null;
  new_line: number | null;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

interface DiffFile {
  file_path: string;
  hunks: DiffHunk[];
  added_lines_count: number;
  deleted_lines_count: number;
}

interface CodeDiffViewProps {
  files: DiffFile[];
  comments: Comment[];
  onAcceptComment: (commentId: number) => void;
  onRejectComment: (commentId: number) => void;
}

export default function CodeDiffView({ files, comments, onAcceptComment, onRejectComment }: CodeDiffViewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>(() => {
    // Expand the first file by default
    if (files.length > 0) {
      return { [files[0].file_path]: true };
    }
    return {};
  });

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCopyCode = (text: string, commentId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(commentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return {
          bg: "bg-red-500/10 border-red-500/20",
          text: "text-red-400",
          badge: "bg-red-500/20 text-red-300 border-red-500/30",
          icon: Flame
        };
      case "error":
        return {
          bg: "bg-orange-500/10 border-orange-500/20",
          text: "text-orange-400",
          badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
          icon: AlertTriangle
        };
      case "warning":
        return {
          bg: "bg-yellow-500/10 border-yellow-500/20",
          text: "text-yellow-400",
          badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
          icon: AlertCircle
        };
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/20",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          icon: Info
        };
    }
  };

  return (
    <div className="space-y-4">
      {files.map((file) => {
        const isExpanded = expandedFiles[file.file_path];
        return (
          <div key={file.file_path} className="rounded-lg border border-slate-800 bg-slate-900/20 overflow-hidden">
            {/* File Header */}
            <div 
              onClick={() => toggleFile(file.file_path)}
              className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="font-mono text-sm text-slate-200 font-semibold">{file.file_path}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +{file.added_lines_count}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  -{file.deleted_lines_count}
                </span>
              </div>
            </div>

            {/* File Content Diff */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-xs select-text">
                  <tbody>
                    {file.hunks.map((hunk, hunkIdx) => (
                      <React.Fragment key={hunkIdx}>
                        {/* Hunk Header Line */}
                        <tr className="bg-slate-950/40 text-slate-500 select-none">
                          <td className="w-12 text-center py-1 border-r border-slate-900">...</td>
                          <td className="w-12 text-center py-1 border-r border-slate-900">...</td>
                          <td className="px-4 py-1 text-blue-400/70 font-semibold select-none bg-blue-950/10">{hunk.header}</td>
                        </tr>

                        {hunk.lines.map((line, lineIdx) => {
                          const isAdded = line.type === "added";
                          const isDeleted = line.type === "deleted";
                          
                          // Match comments belonging to this specific added/new line
                          const matchingComments = comments.filter(
                            (c) => c.file_path === file.file_path && c.line_number === line.new_line && (isAdded || line.type === "context")
                          );

                          return (
                            <React.Fragment key={lineIdx}>
                              <tr className={`${isAdded ? "diff-added" : isDeleted ? "diff-deleted" : "diff-context"} hover:bg-slate-800/10`}>
                                <td className="w-12 text-center py-1 border-r border-slate-800/40 text-slate-600 select-none text-[10px] pr-2">
                                  {line.old_line || ""}
                                </td>
                                <td className="w-12 text-center py-1 border-r border-slate-800/40 text-slate-600 select-none text-[10px] pr-2">
                                  {line.new_line || ""}
                                </td>
                                <td className="px-4 py-1 whitespace-pre-wrap align-middle pl-6">
                                  {isAdded ? "+" : isDeleted ? "-" : " "}{line.content}
                                </td>
                              </tr>

                              {/* Render AI Comments directly inline below the trigger line */}
                              {matchingComments.map((comment) => {
                                const styles = getSeverityStyles(comment.severity);
                                const SeverityIcon = styles.icon;
                                const isActioned = comment.status !== "pending";

                                return (
                                  <tr key={comment.id} className="bg-slate-950/80">
                                    <td colSpan={2} className="border-r border-slate-800/60 select-none"></td>
                                    <td className="p-4 border-l border-blue-500/40">
                                      <div className={`p-4 rounded-lg border ${styles.bg} space-y-3`}>
                                        {/* Comment Header */}
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <div className="flex items-center gap-2.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${styles.badge} flex items-center gap-1`}>
                                              <SeverityIcon className="w-3.5 h-3.5" />
                                              {comment.severity}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-bold border border-blue-500/20 capitalize font-mono">
                                              {comment.category.replace("_", " ")}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                              Confidence: {(comment.confidence_score * 100).toFixed(0)}%
                                            </span>
                                          </div>

                                          {/* Accept / Reject Status Indicators */}
                                          {isActioned && (
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                              comment.status === "accepted" 
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                            }`}>
                                              {comment.status}
                                            </span>
                                          )}
                                        </div>

                                        {/* Issue Details */}
                                        <div>
                                          <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5 font-outfit">
                                            <Cpu className="w-4 h-4 text-blue-400" />
                                            {comment.issue}
                                          </h4>
                                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{comment.explanation}</p>
                                        </div>

                                        {/* Suggested Fix and Improved Code snippet */}
                                        {comment.suggested_fix && (
                                          <div className="mt-2 text-xs space-y-1 bg-slate-950/60 p-3 rounded border border-slate-800">
                                            <p className="font-semibold text-slate-400 font-sans">Suggested Fix:</p>
                                            <p className="text-slate-300 leading-relaxed font-sans">{comment.suggested_fix}</p>
                                            
                                            {comment.improved_code && (
                                              <div className="mt-2.5 space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 select-none">
                                                  <span>IMPROVED CODE RECOMMENDATION</span>
                                                  <button 
                                                    onClick={() => handleCopyCode(comment.improved_code!, comment.id)}
                                                    className="flex items-center gap-1 hover:text-slate-200 transition-colors bg-slate-900 px-2 py-1 rounded border border-slate-800"
                                                  >
                                                    {copiedId === comment.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    <span>{copiedId === comment.id ? "Copied" : "Copy"}</span>
                                                  </button>
                                                </div>
                                                <pre className="bg-[#05070f] p-3 rounded text-[11px] overflow-x-auto text-emerald-400/90 border border-emerald-950">
                                                  <code>{comment.improved_code}</code>
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Interactive buttons */}
                                        {!isActioned && (
                                          <div className="flex items-center gap-2 pt-1.5 select-none">
                                            <button
                                              onClick={() => onAcceptComment(comment.id)}
                                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all border border-emerald-500/30 shadow-lg shadow-emerald-950/20"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Accept Fix</span>
                                            </button>
                                            <button
                                              onClick={() => onRejectComment(comment.id)}
                                              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs font-semibold transition-all border border-slate-700/50"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                              <span>Reject</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
