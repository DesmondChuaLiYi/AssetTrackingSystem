'use client';

import { useState } from "react";
import { Sparkles, PenLine, Camera, Upload, CheckCircle, RefreshCw, ChevronDown, AlertTriangle, Info } from "lucide-react";

const conditionOptions = ["In-use", "Spoiled", "In-store"];

const mockAiResult = {
  condition: "In-use",
  maintenanceNeeded: true,
  priority: "medium",
  issues: ["Minor scratches on surface", "One wheel slightly worn", "Armrest padding compressing"],
};

function ConditionSelector({ condition, setCondition }: { condition: string; setCondition: (value: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {conditionOptions.map((opt) => (
        <label key={opt} style={{
          flex: 1, border: `2px solid ${condition === opt ? "#dc2626" : "#e5e7eb"}`,
          borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: "pointer",
          background: condition === opt ? "#fef2f2" : "white",
          color: condition === opt ? "#dc2626" : "#374151",
          fontWeight: 600, fontSize: 13, transition: "all 0.15s"
        }}>
          <input type="radio" name="condition" value={opt} checked={condition === opt}
            onChange={() => setCondition(opt)} style={{ display: "none" }} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function AIAssistPanel({ onApply }: { onApply: (condition: string) => void }) {
  const [step, setStep] = useState("idle"); // idle | capturing | analyzing | result
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<typeof mockAiResult | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target && typeof ev.target.result === "string") {
        setImagePreview(ev.target.result);
        setStep("ready");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    setStep("analyzing");
    setTimeout(() => {
      setResult(mockAiResult);
      setStep("result");
    }, 2000);
  };

  const handleApply = () => {
    onApply(mockAiResult.condition);
  };

  const reset = () => {
    setStep("idle");
    setImagePreview(null);
    setResult(null);
  };

  const priorityColor = {
    high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
    medium: { bg: "#fff7ed", border: "#fdba74", text: "#ea580c" },
    low: { bg: "#fefce8", border: "#fde047", text: "#ca8a04" },
    none: { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" },
  };

  return (
    <div style={{ border: "2px solid #e0e7ff", borderRadius: 14, overflow: "hidden", background: "#fafafe" }}>
      {/* AI Header */}
      <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={18} color="white" />
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>AI Condition Assessment</span>
        <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Gemini</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Step: idle - choose input */}
        {step === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Take or upload a photo of the asset. AI will assess its condition automatically.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setStep("camera")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", background: "white", border: "2px solid #e0e7ff", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>
                <Camera size={22} color="#4f46e5" />
                Open Camera
              </button>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", background: "white", border: "2px dashed #e0e7ff", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>
                <Upload size={22} color="#4f46e5" />
                Upload Photo
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        )}

        {/* Step: camera (simulated) */}
        {step === "camera" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#111", borderRadius: 12, height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 120, height: 120, border: "2px solid rgba(99,102,241,0.6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera size={32} color="rgba(255,255,255,0.4)" />
              </div>
              <div style={{ position: "absolute", top: 10, left: 12, background: "#ef4444", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, background: "white", borderRadius: "50%", display: "inline-block" }} />
                Live
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ flex: 1, background: "#4f46e5", color: "white", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
                📸 Capture
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
              </label>
              <button onClick={reset} style={{ padding: "10px 16px", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step: ready - image uploaded, ready to analyze */}
        {step === "ready" && imagePreview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <img src={imagePreview} alt="Preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10, border: "1.5px solid #e0e7ff" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAnalyze} style={{ flex: 1, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Sparkles size={15} /> Analyze with AI
              </button>
              <button onClick={reset} style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "white", cursor: "pointer", fontSize: 13 }}>
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step: analyzing */}
        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 48, height: 48, border: "3px solid #e0e7ff", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontWeight: 600, color: "#4f46e5", fontSize: 14 }}>Analyzing asset condition...</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Gemini is reviewing the image</div>
          </div>
        )}

        {/* Step: result */}
        {step === "result" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Condition badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "10px 14px" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Suggested Condition</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d", marginTop: 2 }}>{result.condition}</div>
              </div>
              <CheckCircle size={28} color="#16a34a" />
            </div>

            {/* Priority + Maintenance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: priorityColor[result.priority as keyof typeof priorityColor].bg, border: `1.5px solid ${priorityColor[result.priority as keyof typeof priorityColor].border}`, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Priority</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: priorityColor[result.priority as keyof typeof priorityColor].text, marginTop: 2, textTransform: "capitalize" }}>{result.priority}</div>
              </div>
              <div style={{ background: result.maintenanceNeeded ? "#fff7ed" : "#f0fdf4", border: `1.5px solid ${result.maintenanceNeeded ? "#fdba74" : "#86efac"}`, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Maintenance</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: result.maintenanceNeeded ? "#ea580c" : "#16a34a", marginTop: 2 }}>{result.maintenanceNeeded ? "⚠️ Needed" : "✓ Not needed"}</div>
              </div>
            </div>

            {/* Issues */}
            {result.issues?.length > 0 && (
              <div style={{ background: "white", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", marginBottom: 6 }}>Issues Detected</div>
                {result.issues.map((issue, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: "#4f46e5", marginTop: 1 }}>•</span> {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Apply / Retake */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleApply} style={{ flex: 1, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <CheckCircle size={15} /> Apply Suggestion
              </button>
              <button onClick={reset} style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>
                Retake
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [conditionMode, setConditionMode] = useState("manual"); // manual | ai
  const [condition, setCondition] = useState("In-use");
  const [aiApplied, setAiApplied] = useState(false);

  const handleAiApply = (suggestedCondition: string) => {
    setCondition(suggestedCondition);
    setConditionMode("manual");
    setAiApplied(true);
    setTimeout(() => setAiApplied(false), 3000);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#f8f7f4", padding: "1rem" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* Page context header */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(185,28,28,0.12)", marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)", padding: "18px 22px", color: "white", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 8 }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Confirm Asset</div>
              <div style={{ fontSize: 12, opacity: 0.8, fontFamily: "monospace" }}>Scanned: ASSET-001234</div>
            </div>
          </div>

          <div style={{ background: "white", padding: "20px 20px 24px" }}>

            {/* Asset details (greyed out for context) */}
            <div style={{ opacity: 0.45, pointerEvents: "none", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", borderBottom: "2px solid #f3f4f6", paddingBottom: 6, marginBottom: 10 }}>Asset Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Name", "Dell Latitude 5420"], ["Asset ID", "ASSET-001234"], ["Category", "Laptop"], ["Model", "Latitude 5420"]].map(([l, v]) => (
                  <div key={l} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CONDITION SECTION ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                  {conditionMode === "manual" ? "Update Condition" : "AI Condition Assessment"}
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, gap: 2 }}>
                  <button onClick={() => setConditionMode("manual")} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none",
                    background: conditionMode === "manual" ? "white" : "transparent",
                    color: conditionMode === "manual" ? "#111" : "#9ca3af",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                    boxShadow: conditionMode === "manual" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s"
                  }}>
                    <PenLine size={13} /> Manual
                  </button>
                  <button onClick={() => setConditionMode("ai")} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none",
                    background: conditionMode === "ai" ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "transparent",
                    color: conditionMode === "ai" ? "white" : "#9ca3af",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                    boxShadow: conditionMode === "ai" ? "0 1px 6px rgba(79,70,229,0.3)" : "none",
                    transition: "all 0.15s"
                  }}>
                    <Sparkles size={13} /> AI Assist
                  </button>
                </div>
              </div>

              {/* AI applied banner */}
              {aiApplied && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                  <CheckCircle size={15} /> AI suggestion applied — you can still adjust manually
                </div>
              )}

              {/* Manual mode */}
              {conditionMode === "manual" && (
                <ConditionSelector condition={condition} setCondition={setCondition} />
              )}

              {/* AI mode */}
              {conditionMode === "ai" && (
                <AIAssistPanel onApply={handleAiApply} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 18px", background: "#f9fafb", borderRadius: 16, display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", color: "white", border: "none", borderRadius: 10, padding: "11px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              ← Back to Scan
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "white", border: "none", borderRadius: 10, padding: "11px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              <CheckCircle size={15} /> Submit Changes
            </button>
          </div>
        </div>

        {/* Current value display */}
        <div style={{ marginTop: 12, background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={14} /> Current condition value: <strong>{condition}</strong>
        </div>
      </div>
    </div>
  );
}