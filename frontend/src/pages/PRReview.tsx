import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  GitPullRequest, 
  Terminal, 
  Send, 
  Cpu, 
  FileCheck2, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  CpuIcon,
  Play
} from "lucide-react";
import { api } from "../services/api";
import CodeDiffView from "../components/CodeDiffView";

interface Review {
  id: number;
  pull_request_id: number;
  commit_sha: string;
  summary: string | null;
  status: string;
  time_saved_seconds: number;
  comments: any[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function PRReview() {
  const { prId } = useParams<{ prId: string }>();
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [prDetails, setPrDetails] = useState<any>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [diffFiles, setDiffFiles] = useState<any[]>([]);

  // Right sidebar state
  const [activeTab, setActiveTab] = useState<"chat" | "generator">("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Generator tool state
  const [genTarget, setGenTarget] = useState<"tests" | "docs">("tests");
  const [genLanguage, setGenLanguage] = useState("python");
  const [genDocType, setGenDocType] = useState("readme");
  const [selectedFile, setSelectedFile] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedGen, setCopiedGen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadPRAndDiff = async () => {
    try {
      // Find the repository and pull request info
      const repos = await api.get("/repositories");
      let foundPr: any = null;
      let foundRepoId: number = 0;
      
      for (const r of repos) {
        const prList = await api.get(`/repositories/${r.id}/prs`);
        const match = prList.find((p: any) => p.id === Number(prId));
        if (match) {
          foundPr = match;
          foundRepoId = r.id;
          break;
        }
      }
      setPrDetails(foundPr);

      // Load parsed diff files
      const parsedDiff = await api.get(`/repositories/prs/${prId}/diff`);
      setDiffFiles(parsedDiff);
      if (parsedDiff.length > 0) {
        setSelectedFile(parsedDiff[0].file_path);
      }
    } catch (err) {
      console.error("Failed to load PR metadata or diff changes:", err);
    }
  };

  const checkReviewStatus = async () => {
    try {
      const reviewData = await api.get(`/review/pr/${prId}`);
      setReview(reviewData);
      
      if (reviewData.status === "pending") {
        setPolling(true);
      } else {
        setPolling(false);
        setLoading(false);
      }
    } catch (err) {
      // No review history found, trigger start
      try {
        const newReview = await api.post("/review/start", { pull_request_id: Number(prId) });
        setReview(newReview);
        setPolling(true);
      } catch (e) {
        console.error("Failed to auto-initiate PR code review:", e);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadPRAndDiff();
    checkReviewStatus();
  }, [prId]);

  // Polling hook if review is pending
  useEffect(() => {
    let timer: any;
    if (polling) {
      timer = setInterval(async () => {
        try {
          const reviewData = await api.get(`/review/pr/${prId}`);
          setReview(reviewData);
          if (reviewData.status !== "pending") {
            setPolling(false);
            setLoading(false);
            clearInterval(timer);
          }
        } catch (e) {
          console.error("Polling review status failed:", e);
        }
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [polling, prId]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleAcceptComment = async (commentId: number) => {
    try {
      await api.post(`/review/comment/${commentId}/action`, { action: "accept" });
      setReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.map((c) => c.id === commentId ? { ...c, status: "accepted" } : c)
        };
      });
    } catch (err) {
      console.error("Failed to accept comment suggestion:", err);
    }
  };

  const handleRejectComment = async (commentId: number) => {
    try {
      await api.post(`/review/comment/${commentId}/action`, { action: "reject" });
      setReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.map((c) => c.id === commentId ? { ...c, status: "rejected" } : c)
        };
      });
    } catch (err) {
      console.error("Failed to reject comment suggestion:", err);
    }
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    if (!textToSend) setChatInput("");
    setSendingChat(true);

    try {
      const response = await api.post("/ai/chat", {
        pull_request_id: Number(prId),
        message: text
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    } catch (err) {
      console.error("Failed to transmit chat message:", err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error communicating with AI Copilot." }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleTriggerGenerator = async () => {
    setGenerating(true);
    setGeneratedOutput("");
    
    // Find the file's raw added contents to send for generation
    const targetFileObj = diffFiles.find((f) => f.file_path === selectedFile);
    let codeContent = "";
    if (targetFileObj) {
      codeContent = targetFileObj.hunks
        .flatMap((h: any) => h.lines)
        .filter((l: any) => l.type === "added" || l.type === "context")
        .map((l: any) => l.content)
        .join("\n");
    }

    try {
      if (genTarget === "tests") {
        const response = await api.post("/ai/generate-tests", {
          file_path: selectedFile,
          code_content: codeContent || "# empty target file",
          language: genLanguage
        });
        setGeneratedOutput(response.test_code);
      } else {
        const response = await api.post("/ai/generate-docs", {
          file_path: selectedFile,
          code_content: codeContent || "# empty target file",
          doc_type: genDocType
        });
        setGeneratedOutput(response.documentation);
      }
    } catch (err) {
      console.error("Generation tools failed:", err);
      setGeneratedOutput("AI Generation failed. Verify system permissions.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyGen = () => {
    navigator.clipboard.writeText(generatedOutput);
    setCopiedGen(true);
    setTimeout(() => setCopiedGen(false), 2000);
  };

  if (loading || review?.status === "pending") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 text-center select-none">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
          <Sparkles className="w-6 h-6 text-yellow-400 absolute top-5 left-5 animate-pulse" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-white font-outfit">Gemini Auditor Reviewing Codebase</h3>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Parsing unified diffs and running AI reviews on bug risks, security, performance, and best practices. Please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header breadcrumb bar */}
      <div className="flex items-center gap-4">
        <Link 
          to="/"
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors select-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              PR #{prDetails?.github_number}
            </span>
            <h2 className="text-xl font-bold text-white font-outfit truncate max-w-xl">{prDetails?.title}</h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Author: <b className="text-slate-300 font-mono">{prDetails?.author_username}</b> • Status: <b className="text-slate-300 capitalize">{review?.status}</b>
          </p>
        </div>
      </div>

      {/* Main workspace layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Summary + Diff file listings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Summary Panel */}
          {review?.summary && (
            <div className="glass-panel p-6 rounded-xl border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2 select-none">
                <FileCheck2 className="w-5 h-5 text-emerald-500" />
                <span>Auditor Executive Summary</span>
              </h3>
              <div 
                className="text-xs text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none select-text border-l-2 border-slate-800 pl-4 py-1"
                dangerouslySetInnerHTML={{ __html: review.summary.replace(/\n/g, "<br/>") }}
              />
            </div>
          )}

          {/* Diffs File Code Blocks */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white font-outfit select-none">Changed Files ({diffFiles.length})</h3>
            <CodeDiffView
              files={diffFiles}
              comments={review?.comments || []}
              onAcceptComment={handleAcceptComment}
              onRejectComment={handleRejectComment}
            />
          </div>
        </div>

        {/* Right Side: Tab panel widgets */}
        <div className="glass-panel rounded-xl border-slate-800 overflow-hidden flex flex-col h-[75vh] sticky top-24">
          
          {/* Tab header buttons */}
          <div className="flex border-b border-slate-800 text-xs font-semibold select-none">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-center transition-all ${
                activeTab === "chat" 
                  ? "bg-slate-900/50 text-blue-400 border-b-2 border-blue-500" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PR Copilot Chat
            </button>
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex-1 py-3 text-center transition-all ${
                activeTab === "generator" 
                  ? "bg-slate-900/50 text-blue-400 border-b-2 border-blue-500" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              AI Generator Tools
            </button>
          </div>

          {/* Tab 1: Chat widget */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20">
              {/* Messages list */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 space-y-3 select-none">
                    <CpuIcon className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="max-w-xs mx-auto">Ask me questions about code logic, vulnerability mitigations, complexity, or optimization strategies.</p>
                    
                    <div className="flex flex-wrap gap-2 justify-center pt-2 select-text">
                      {[
                        "Explain this file changes",
                        "Are there SQL injection risks?",
                        "Suggest refactoring ideas"
                      ].map((item) => (
                        <button
                          key={item}
                          onClick={() => handleSendChat(item)}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-semibold active:scale-[0.98]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg max-w-[85%] select-text font-sans leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-blue-600 text-white ml-auto" 
                          : "bg-slate-900 text-slate-300 border border-slate-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                {sendingChat && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-800 select-none">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Copilot a question..."
                    disabled={sendingChat}
                    className="flex-1 bg-[#05070f] border border-slate-800 focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: Code generators widget */}
          {activeTab === "generator" && (
            <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto bg-slate-950/20 text-xs">
              
              {/* Selectors config */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 select-none">
                  <button
                    onClick={() => {
                      setGenTarget("tests");
                      setGeneratedOutput("");
                    }}
                    className={`py-2 text-center rounded-lg border font-semibold text-[10px] uppercase tracking-wider transition-all ${
                      genTarget === "tests"
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Generate Tests
                  </button>
                  <button
                    onClick={() => {
                      setGenTarget("docs");
                      setGeneratedOutput("");
                    }}
                    className={`py-2 text-center rounded-lg border font-semibold text-[10px] uppercase tracking-wider transition-all ${
                      genTarget === "docs"
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Generate Docs
                  </button>
                </div>

                <div className="space-y-1.5 select-none">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Target File</label>
                  <select
                    value={selectedFile}
                    onChange={(e) => {
                      setSelectedFile(e.target.value);
                      setGeneratedOutput("");
                    }}
                    className="w-full bg-[#05070f] border border-slate-800 focus:outline-none rounded-lg p-2 text-xs font-mono text-slate-300"
                  >
                    {diffFiles.map((f) => (
                      <option key={f.file_path} value={f.file_path}>
                        {f.file_path.split("/").pop()}
                      </option>
                    ))}
                  </select>
                </div>

                {genTarget === "tests" ? (
                  <div className="space-y-1.5 select-none">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Framework/Lang</label>
                    <select
                      value={genLanguage}
                      onChange={(e) => setGenLanguage(e.target.value)}
                      className="w-full bg-[#05070f] border border-slate-800 focus:outline-none rounded-lg p-2 text-xs text-slate-300 font-sans"
                    >
                      <option value="python">pytest (Python)</option>
                      <option value="javascript">Jest (JS/TS)</option>
                      <option value="java">JUnit (Java)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5 select-none">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Doc Target Type</label>
                    <select
                      value={genDocType}
                      onChange={(e) => setGenDocType(e.target.value)}
                      className="w-full bg-[#05070f] border border-slate-800 focus:outline-none rounded-lg p-2 text-xs text-slate-300 font-sans"
                    >
                      <option value="readme">README.md Overview</option>
                      <option value="functions">Function & Class docs</option>
                      <option value="api">API Documentation</option>
                      <option value="architecture">Architecture Summary</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handleTriggerGenerator}
                  disabled={generating || !selectedFile}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 select-none active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{generating ? "Generating..." : "Trigger AI Generation"}</span>
                </button>
              </div>

              {/* Outputs panel */}
              {generating && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-8 select-none text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <p>Assembling file and generating asset...</p>
                </div>
              )}

              {generatedOutput && !generating && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 select-none">
                    <span>GENERATED OUTPUT</span>
                    <button
                      onClick={handleCopyGen}
                      className="flex items-center gap-1 hover:text-slate-200 transition-colors bg-slate-900 border border-slate-800 py-1 px-2.5 rounded"
                    >
                      {copiedGen ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedGen ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <pre className="flex-1 bg-[#05070f] p-3 rounded text-[10px] font-mono text-slate-300 overflow-auto border border-slate-800 select-text">
                    <code>{generatedOutput}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
