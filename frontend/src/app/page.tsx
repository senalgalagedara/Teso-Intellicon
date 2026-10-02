"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Database, 
  HardDrive, 
  Server, 
  Cpu, 
  Send, 
  UploadCloud, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal,
  Activity,
  Layers
} from "lucide-react";

interface ServiceStatus {
  nextjs_frontend: string;
  nextjs_backend_api: string;
  fastapi_python_ai: {
    status: string;
    url: string;
    details?: { status?: string; version?: string; ai_configured?: boolean; supabase_configured?: boolean };
  };
  supabase: {
    configured: boolean;
    database_status: string;
    url: string;
    bucket: string;
  };
}

interface StorageFile {
  name: string;
  fullPath?: string;
  size?: number;
  created_at?: string;
  publicUrl?: string;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  ai_category?: string;
  created_at?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"ai" | "storage" | "database" | "setup">("ai");
  const [services, setServices] = useState<ServiceStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // AI Tab State
  const [aiMode, setAiMode] = useState<"chat" | "analyze" | "embeddings">("chat");
  const [aiPrompt, setAiPrompt] = useState("Explain how Next.js backend and FastAPI collaborate in this architecture.");
  const [aiAnalysisTask, setAiAnalysisTask] = useState("summary");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiMetadata, setAiMetadata] = useState<Record<string, unknown> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Storage Tab State
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [storageStatusMessage, setStorageStatusMessage] = useState<string | null>(null);

  // Database Tab State
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch Health & Service Status
  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
      }
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Fetch Storage Files
  const fetchStorageFiles = async () => {
    try {
      const res = await fetch("/api/storage/files");
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setStorageFiles(data.files);
        }
      }
    } catch (err) {
      console.error("Storage fetch error:", err);
    }
  };

  // Fetch Notes
  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        if (data.notes) {
          setNotes(data.notes);
        }
      }
    } catch (err) {
      console.error("Notes fetch error:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHealth();
      fetchStorageFiles();
      fetchNotes();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Handle AI Submission
  const handleExecuteAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setAiMetadata(null);

    const startTime = performance.now();

    try {
      let payload = {};
      if (aiMode === "chat") {
        payload = {
          action: "chat",
          payload: {
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.7,
          },
        };
      } else if (aiMode === "analyze") {
        payload = {
          action: "analyze",
          payload: {
            text: aiPrompt,
            task: aiAnalysisTask,
          },
        };
      } else if (aiMode === "embeddings") {
        payload = {
          action: "embeddings",
          payload: {
            texts: [aiPrompt],
          },
        };
      }

      // Next.js backend proxy calls FastAPI
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        if (aiMode === "chat") {
          setAiResponse(data.reply);
          setAiMetadata({ model: data.model, latency: `${latencyMs}ms`, usage: data.usage });
        } else if (aiMode === "analyze") {
          setAiResponse(data.result);
          setAiMetadata({ task: data.task, latency: `${latencyMs}ms`, ...data.metadata });
        } else if (aiMode === "embeddings") {
          setAiResponse(`Generated vector embedding with ${data.dimension} dimensions for text.`);
          setAiMetadata({ count: data.count, dimension: data.dimension, sampleVector: data.embeddings?.[0]?.slice(0, 5) });
        }
      } else {
        const err = await res.json();
        setAiResponse(`Error from backend: ${err.error || "Request failed"}`);
      }
    } catch (err: unknown) {
      setAiResponse(`Failed to dispatch request: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Storage Upload via Next.js Backend Route
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setUploadingFile(true);
    setStorageStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "uploads");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStorageStatusMessage(`Uploaded "${selectedFile.name}" successfully!`);
        setSelectedFile(null);
        fetchStorageFiles();
      } else {
        setStorageStatusMessage(`Upload error: ${data.error || data.hint || "Upload failed"}`);
      }
    } catch (err: unknown) {
      setStorageStatusMessage(`Upload error: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Note Creation
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          ai_category: newCategory,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        fetchNotes();
      }
    } catch (err) {
      console.error("Create note error:", err);
    }
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(`-- Run in Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) VALUES ('app-storage', 'app-storage', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'app-storage');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-storage');
CREATE TABLE IF NOT EXISTS public.notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, content TEXT NOT NULL, ai_category TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.notes FOR ALL USING (true);`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const isFastApiOnline = services?.fastapi_python_ai?.status === "online";
  const isSupabaseConfigured = services?.supabase?.configured;

  return (
    <main>
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      <div className="container">
        {/* Top Header */}
        <header style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className="badge badge-blue">
                  <Layers size={13} /> Full-Stack Multi-Service Template
                </span>
                <span className="badge badge-green">
                  <CheckCircle2 size={13} /> Ready to Develop
                </span>
              </div>
              <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Next.js <span className="gradient-text">+ FastAPI AI</span> + Supabase
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
                Next.js App Router (Frontend & Backend API) • Supabase DB & Storage • Python FastAPI AI Service
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button 
                onClick={fetchHealth} 
                disabled={loadingHealth}
                className="btn btn-secondary"
                title="Refresh system health diagnostics"
              >
                <RefreshCw size={14} className={loadingHealth ? "animate-spin" : ""} />
                Check Services
              </button>
            </div>
          </div>

          {/* Diagnostic System Health Bar */}
          <div className="glass-card" style={{ marginTop: "1.5rem", padding: "1.125rem 1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
              
              {/* Service 1: Next.js Frontend */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-purple)" }}>
                  <Cpu size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Frontend</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className="pulse-dot green" /> Next.js App Router
                  </div>
                </div>
              </div>

              {/* Service 2: Next.js Backend */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)" }}>
                  <Server size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Next.js Backend</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className="pulse-dot green" /> /api/* Route Handlers
                  </div>
                </div>
              </div>

              {/* Service 3: FastAPI AI Backend */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isFastApiOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: isFastApiOnline ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Python FastAPI AI</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className={`pulse-dot ${isFastApiOnline ? "green" : "yellow"}`} />
                    {isFastApiOnline ? "FastAPI Online (:8000)" : "Waiting on :8000"}
                  </div>
                </div>
              </div>

              {/* Service 4: Supabase DB & Storage */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isSupabaseConfigured ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: isSupabaseConfigured ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  <Database size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Supabase</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className={`pulse-dot ${isSupabaseConfigured ? "green" : "red"}`} />
                    {isSupabaseConfigured ? "Connected" : "Needs Credentials"}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="tabs-nav" style={{ marginBottom: "1.75rem" }}>
          <button 
            className={`tab-btn ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            <Sparkles size={16} /> Python FastAPI AI Studio
          </button>
          <button 
            className={`tab-btn ${activeTab === "storage" ? "active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            <HardDrive size={16} /> Supabase Storage
          </button>
          <button 
            className={`tab-btn ${activeTab === "database" ? "active" : ""}`}
            onClick={() => setActiveTab("database")}
          >
            <Database size={16} /> Supabase Database (CRUD)
          </button>
          <button 
            className={`tab-btn ${activeTab === "setup" ? "active" : ""}`}
            onClick={() => setActiveTab("setup")}
          >
            <Terminal size={16} /> Architecture & Run Guide
          </button>
        </nav>

        {/* TAB 1: AI STUDIO */}
        {activeTab === "ai" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            
            {/* Input Card */}
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} color="var(--accent-purple)" /> AI Feature Selector
                </h2>
                <span className="badge badge-green">Pydantic & FastAPI</span>
              </div>

              {/* Mode Select */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {(["chat", "analyze", "embeddings"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAiMode(mode);
                      if (mode === "chat") setAiPrompt("What are the advantages of combining Next.js with FastAPI for AI applications?");
                      if (mode === "analyze") setAiPrompt("Next.js handles seamless frontend rendering and edge API routes, while FastAPI provides asynchronous Python execution with high throughput, native support for ML libraries (PyTorch, TensorFlow, HuggingFace, OpenAI, LangChain), and Pydantic data validation.");
                      if (mode === "embeddings") setAiPrompt("Vector embeddings enable semantic similarity search in Supabase pgvector.");
                    }}
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      fontSize: "0.8rem",
                      background: aiMode === mode ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      border: aiMode === mode ? "1px solid var(--accent-purple)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: aiMode === mode ? "#ffffff" : "var(--text-muted)",
                    }}
                  >
                    {mode === "chat" ? "💬 Chat" : mode === "analyze" ? "🔍 NLP Analyze" : "📐 Embeddings"}
                  </button>
                ))}
              </div>

              {/* Task select if analyze */}
              {aiMode === "analyze" && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                    Analysis Task
                  </label>
                  <select 
                    value={aiAnalysisTask} 
                    onChange={(e) => setAiAnalysisTask(e.target.value)}
                    className="select"
                  >
                    <option value="summary">Summary</option>
                    <option value="sentiment">Sentiment Analysis</option>
                    <option value="key_points">Key Points Extraction</option>
                  </select>
                </div>
              )}

              {/* Prompt Textarea */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                  {aiMode === "chat" ? "User Prompt" : "Input Text"}
                </label>
                <textarea
                  className="textarea"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Enter text or prompt..."
                  rows={6}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "0.375rem" }}>Quick Test Prompts:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  <button 
                    onClick={() => setAiPrompt("Generate a recommended project structure for AI agent workflows.")} 
                    className="btn btn-secondary" 
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  >
                    Agent Workflow
                  </button>
                  <button 
                    onClick={() => setAiPrompt("How to store and query embeddings in Supabase PostgreSQL?")} 
                    className="btn btn-secondary" 
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  >
                    Supabase pgvector
                  </button>
                </div>
              </div>

              {/* Dispatch Button */}
              <button
                onClick={handleExecuteAI}
                disabled={aiLoading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Processing via FastAPI...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Execute via Python AI Backend
                  </>
                )}
              </button>
            </div>

            {/* Output Card */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Activity size={18} color="var(--accent-emerald)" /> Backend Response
                </h2>
                {aiMetadata && (
                  <span className="badge badge-green">
                    {(aiMetadata.latency as string) || "Fast response"}
                  </span>
                )}
              </div>

              {aiResponse ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div 
                    style={{
                      flex: 1,
                      background: "rgba(7, 9, 14, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "var(--radius-sm)",
                      padding: "1.25rem",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.9rem",
                      color: "#e2e8f0",
                      lineHeight: "1.6",
                      overflowY: "auto",
                      maxHeight: "360px",
                    }}
                  >
                    {aiResponse}
                  </div>

                  {aiMetadata && (
                    <div className="code-block" style={{ fontSize: "0.75rem", padding: "0.75rem" }}>
                      <strong>Response Metadata:</strong>
                      <pre style={{ marginTop: "0.375rem" }}>
                        {JSON.stringify(aiMetadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", textAlign: "center", padding: "2rem" }}>
                  <Sparkles size={40} style={{ opacity: 0.3, marginBottom: "1rem" }} />
                  <p style={{ fontSize: "0.95rem" }}>Click &quot;Execute via Python AI Backend&quot; to test the integration.</p>
                  <p style={{ fontSize: "0.8rem", marginTop: "0.5rem", maxWidth: "340px" }}>
                    Requests pass through Next.js backend proxy (<code style={{ color: "var(--accent-purple)" }}>/api/ai</code>) to FastAPI (<code style={{ color: "var(--accent-cyan)" }}>:8000/api/ai/*</code>).
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: SUPABASE STORAGE */}
        {activeTab === "storage" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "1.5rem" }}>
            
            {/* Upload Box */}
            <div className="glass-card">
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <HardDrive size={18} color="var(--accent-cyan)" /> Upload to Supabase Storage
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                Bucket: <code style={{ color: "var(--accent-cyan)" }}>{services?.supabase?.bucket || "app-storage"}</code>
              </p>

              <div 
                style={{
                  border: "2px dashed rgba(255, 255, 255, 0.15)",
                  borderRadius: "var(--radius-md)",
                  padding: "2rem 1.5rem",
                  textAlign: "center",
                  background: "rgba(13, 18, 31, 0.5)",
                  marginBottom: "1.25rem",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <UploadCloud size={36} color="var(--accent-cyan)" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  {selectedFile ? selectedFile.name : "Choose a file to upload"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Supports PDF, TXT, Images, JSON (up to 50MB)"}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {storageStatusMessage && (
                <div 
                  style={{ 
                    padding: "0.75rem 1rem", 
                    borderRadius: "var(--radius-sm)", 
                    background: storageStatusMessage.includes("error") ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)",
                    border: storageStatusMessage.includes("error") ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                    fontSize: "0.8rem",
                    marginBottom: "1rem",
                    color: storageStatusMessage.includes("error") ? "#fb7185" : "#34d399"
                  }}
                >
                  {storageStatusMessage}
                </div>
              )}

              <button
                onClick={handleUploadFile}
                disabled={!selectedFile || uploadingFile}
                className="btn btn-storage"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                {uploadingFile ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Uploading to Supabase...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} /> Upload via Next.js Backend API
                  </>
                )}
              </button>

              <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(7, 9, 14, 0.7)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <strong>💡 Client & Server Storage Options:</strong>
                <p style={{ marginTop: "0.25rem" }}>
                  • <strong>Server upload:</strong> Handled by <code style={{ color: "#38bdf8" }}>/api/storage/upload</code> (with size limits & auth validation).<br />
                  • <strong>Client upload:</strong> Using <code style={{ color: "#38bdf8" }}>uploadFileToSupabase()</code> directly from browser.
                </p>
              </div>
            </div>

            {/* Storage Files List */}
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileText size={18} color="var(--accent-cyan)" /> Stored Files
                </h2>
                <button onClick={fetchStorageFiles} className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {storageFiles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "420px", overflowY: "auto" }}>
                  {storageFiles.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.875rem 1rem",
                        background: "rgba(13, 18, 31, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#f8fafc" }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                          {f.size ? `${(f.size / 1024).toFixed(1)} KB` : "Stored object"} {f.created_at ? `• ${new Date(f.created_at).toLocaleDateString()}` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {f.publicUrl && (
                          <a
                            href={f.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setActiveTab("ai");
                            setAiMode("analyze");
                            setAiPrompt(`Analyze stored document "${f.name}". Check contents and extract key entities.`);
                          }}
                          className="btn btn-primary"
                          style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                        >
                          <Sparkles size={12} /> Send to AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-dim)" }}>
                  <HardDrive size={36} style={{ opacity: 0.3, margin: "0 auto 0.75rem auto" }} />
                  <p style={{ fontSize: "0.9rem" }}>No files uploaded yet in bucket <code>app-storage</code>.</p>
                  <p style={{ fontSize: "0.75rem", marginTop: "0.35rem" }}>
                    Select a test file on the left and upload to test Supabase Storage integration!
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: SUPABASE DATABASE (CRUD) */}
        {activeTab === "database" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "1.5rem" }}>
            
            {/* Create Note Card */}
            <div className="glass-card">
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Database size={18} color="var(--accent-amber)" /> Insert Database Record
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                Interacts with Supabase PostgreSQL <code style={{ color: "var(--accent-amber)" }}>public.notes</code> table via Next.js backend.
              </p>

              <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                    Title
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., AI Experiment Log #1"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="select"
                  >
                    <option value="General">General</option>
                    <option value="AI Insights">AI Insights</option>
                    <option value="Storage Specs">Storage Specs</option>
                    <option value="API Pipeline">API Pipeline</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                    Content
                  </label>
                  <textarea
                    className="textarea"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter record details..."
                    rows={4}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: "var(--gradient-db)",
                    color: "#ffffff",
                    fontWeight: 600,
                    padding: "0.75rem",
                  }}
                >
                  Insert into Supabase Table
                </button>
              </form>
            </div>

            {/* Notes List */}
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Database size={18} color="var(--accent-amber)" /> Database Records
                </h2>
                <button onClick={fetchNotes} className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}>
                  <RefreshCw size={12} className={loadingNotes ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              {notes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "420px", overflowY: "auto" }}>
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "1rem",
                        background: "rgba(13, 18, 31, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                          {n.title}
                        </div>
                        {n.ai_category && (
                          <span className="badge badge-yellow" style={{ fontSize: "0.7rem" }}>
                            {n.ai_category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                        {n.content}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
                        ID: {n.id} {n.created_at ? `• ${new Date(n.created_at).toLocaleString()}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-dim)" }}>
                  <Database size={36} style={{ opacity: 0.3, margin: "0 auto 0.75rem auto" }} />
                  <p style={{ fontSize: "0.9rem" }}>No records found in database.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: ARCHITECTURE & SETUP GUIDE */}
        {activeTab === "setup" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            
            {/* Quickstart commands */}
            <div className="glass-card">
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Terminal size={18} color="var(--accent-purple)" /> Running the Stack
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Both servers run seamlessly in development:
              </p>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-purple)", marginBottom: "0.375rem" }}>
                  1. Launch Next.js (Frontend & Backend API)
                </div>
                <div className="code-block">
                  cd frontend<br />
                  npm run dev
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                  Runs on http://localhost:3000
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "0.375rem" }}>
                  2. Launch FastAPI (Python AI Engine)
                </div>
                <div className="code-block">
                  cd backend<br />
                  .\.venv\Scripts\activate<br />
                  uvicorn app.main:app --reload --port 8000
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                  Runs on http://127.0.0.1:8000 (Interactive docs at /docs)
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "0.375rem" }}>
                  3. Run Both from Root (with concurrently)
                </div>
                <div className="code-block">
                  npm run dev
                </div>
              </div>
            </div>

            {/* Supabase SQL Migration */}
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Database size={18} color="var(--accent-emerald)" /> Supabase SQL Schema
                </h2>
                <button onClick={copySqlSchema} className="btn btn-secondary" style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}>
                  {copiedSql ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  {copiedSql ? "Copied SQL!" : "Copy SQL"}
                </button>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Paste into your <strong>Supabase Dashboard → SQL Editor</strong> to create tables & storage policies:
              </p>

              <div className="code-block" style={{ maxHeight: "320px", fontSize: "0.75rem" }}>
                <pre>{`-- 1. Create app-storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-storage', 'app-storage', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'app-storage');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-storage');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'app-storage');

-- 3. Documents Table (with AI summary metadata)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public policies for dev template
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All Documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow All Notes" ON public.notes FOR ALL USING (true);`}</pre>
              </div>
            </div>

          </div>
        )}

        {/* Footer info */}
        <footer style={{ marginTop: "3.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-dim)", fontSize: "0.8rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            Built with <strong>Next.js 16</strong> App Router • <strong>FastAPI 0.115+</strong> • <strong>Supabase JS v2 & Storage</strong>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <span>Backend: <code style={{ color: "var(--accent-purple)" }}>http://127.0.0.1:8000</code></span>
            <span>Frontend: <code style={{ color: "var(--accent-cyan)" }}>http://localhost:3000</code></span>
          </div>
        </footer>
      </div>
    </main>
  );
}
