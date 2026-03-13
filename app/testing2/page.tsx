'use client';

import { useState, useEffect, useRef, FormEvent } from "react";
import { CSSProperties } from "react";

import {
  QrCode, Barcode, ChevronLeft, XCircle, CheckCircle,
  Edit, AlertCircle, Save, PackagePlus, MapPin, Building2,
  Camera, Zap, Check
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────
const mockLocations = [
  { location_id: "LOC001", name: "Block A - Level 1" },
  { location_id: "LOC002", name: "Block B - Level 2" },
  { location_id: "LOC003", name: "Server Room" },
];
const mockDepartments = [
  { department_id: "DEPT001", name: "IT Department" },
  { department_id: "DEPT002", name: "HR Department" },
  { department_id: "DEPT003", name: "Finance" },
];
const mockAssets: Record<string, { asset_id: string; name: string; category: string; model: string; condition: string; location_id: string; department_id: string; description: string }> = {
  "ASSET-001234": { asset_id: "ASSET-001234", name: "Dell Latitude 5420", category: "Laptop", model: "Latitude 5420", condition: "In-use", location_id: "LOC001", department_id: "DEPT001", description: "" },
  "ASSET-005678": { asset_id: "ASSET-005678", name: "Herman Miller Chair", category: "Furniture", model: "Aeron", condition: "In-store", location_id: "LOC002", department_id: "DEPT002", description: "" },
};
const mockScannableCodes = ["ASSET-001234", "ASSET-005678", "ASSET-NEW999"];
const conditionOptions = ["In-use", "Spoiled", "In-store"];

// ─── Scanner Page ─────────────────────────────────────────────
function ScannerPage({ onItemScanned, onBack, parentScan, title, description }: { onItemScanned: (item: { id: number; code: string; time: string; name: string }) => void; onBack: () => void; parentScan: { type: string; name: string } | null; title: string; description: string }) {
  const [scanning, setScanning] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeIndex = useRef(0);

  const simulateScan = () => {
    setScanning(true);
    let dots = 0;
    intervalRef.current = setInterval(() => {
      dots++;
      if (dots >= 3) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        const code = mockScannableCodes[codeIndex.current % mockScannableCodes.length];
        codeIndex.current++;
        setLastCode(code);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 400);
        setTimeout(() => {
          setScanning(false);
          onItemScanned({ id: Date.now(), code, time: new Date().toLocaleTimeString(), name: `Item - ${code}` });
        }, 600);
      }
    }, 600);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8f7f4" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1rem" }}>
        {/* Header */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(185,28,28,0.15)", marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)", padding: "20px 24px", color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 8 }}>
                  <QrCode size={28} />
                </div>
                <div>
                  {!parentScan ? (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>{description}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>Now Scan an Asset</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>Tagging to {parentScan.type}: <strong>{parentScan.name}</strong></div>
                    </>
                  )}
                </div>
              </div>
              {parentScan && (
                <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "white", padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>
                  <XCircle size={15} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scanner Area */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: 24 }}>
            {!scanning ? (
              <div
                onClick={simulateScan}
                style={{
                  position: "relative", width: "100%", height: 260,
                  border: "3px dashed #fca5a5", borderRadius: 16,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: flashActive ? "#fef2f2" : "linear-gradient(135deg, #fafafa 0%, #fff 100%)",
                  cursor: "pointer", transition: "all 0.2s", overflow: "hidden"
                }}
              >
                {/* Corner decorations */}
                {[["0","0","borderTop","borderLeft"],["0","auto","borderTop","borderRight"],["auto","0","borderBottom","borderLeft"],["auto","auto","borderBottom","borderRight"]].map(([t,r,b1,b2], i) => (
                  <div key={i} style={{ position:"absolute", top: t!=="auto"?8:undefined, right: r!=="auto"?8:undefined, bottom: t==="auto"?8:undefined, left: r==="auto"?8:undefined, width:24, height:24, [b1+"Width"]:3, [b2+"Width"]:3, borderStyle:"solid", borderColor:"#dc2626", borderRadius:4 }} />
                ))}
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <QrCode size={72} color="#dc2626" style={{ opacity: 0.9 }} />
                  <Barcode size={72} color="#000" style={{ position: "absolute", top: 0, left: 0, opacity: 0.08 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>
                  {!parentScan ? `Scan ${title.split(" ")[0]}` : "Scan Asset"}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>Click to simulate a scan</div>
              </div>
            ) : (
              <div style={{ width: "100%", height: 260, background: "#111", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {/* Scanning animation */}
                <div style={{ position: "absolute", width: "100%", height: 3, background: "linear-gradient(90deg, transparent, #dc2626, transparent)", animation: "scanline 1s ease-in-out infinite", top: "50%" }} />
                <style>{`@keyframes scanline { 0%,100%{top:20%} 50%{top:80%} }`}</style>
                <div style={{ width: 200, height: 200, border: "2px solid rgba(220,38,38,0.6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={40} color="rgba(255,255,255,0.4)" />
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 16 }}>Scanning...</div>
                <button onClick={() => { if (intervalRef.current !== null) clearInterval(intervalRef.current); setScanning(false); }}
                  style={{ marginTop: 12, background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
                  Stop
                </button>
              </div>
            )}

            {/* Tips */}
            <div style={{ marginTop: 16, background: "#fef2f2", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#374151", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={14} color="#dc2626" /> Scanning Tips
              </div>
              {["Ensure good lighting conditions", "Hold device steady", "Keep code centered in frame"].map(tip => (
                <div key={tip} style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>• {tip}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          <div style={{ padding: "16px 20px", background: "#f9fafb", borderRadius: 16 }}>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", color: "white", border: "none", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontWeight: 600, fontSize: 14, width: "100%", justifyContent: "center" }}>
              <ChevronLeft size={18} /> Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation Page ────────────────────────────────────────
function ConfirmationPage({ item, onBack, onSuccess, parentScan }: { item: { code: string }; onBack: () => void; onSuccess: (item: any, scanType: string) => void; parentScan: { type: string; name: string } | null }) {
  const [mode, setMode] = useState("loading");
  const [assetDetails, setAssetDetails] = useState<{ asset_id: string; name: string; category: string; model: string; condition: string; location_id: string; department_id: string; description: string } | null>(null);
  const [condition, setCondition] = useState("In-use");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newModel, setNewModel] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const found = mockAssets[item.code];
      if (found) {
        setAssetDetails(found);
        setCondition(found.condition);
        setSelectedLocation(found.location_id);
        setSelectedDepartment(found.department_id);
        setMode("editing");
      } else {
        setMode("registering");
      }
    }, 800);
  }, [item]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "editing" && assetDetails) {
      onSuccess({ ...assetDetails, condition, location_id: selectedLocation, department_id: selectedDepartment }, "Asset Updated");
    } else if (mode === "registering") {
      onSuccess({ asset_id: item.code, name: newName, category: newCategory, model: newModel, condition, location_id: selectedLocation, department_id: selectedDepartment }, "New Asset Registered");
    }
  };

const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 };
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8f7f4" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "1rem" }}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(185,28,28,0.15)", marginBottom: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)", padding: "20px 24px", color: "white", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 8 }}>
                <Edit size={26} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{mode === "registering" ? "Register Asset" : "Confirm Asset"}</div>
                <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "'DM Mono', monospace" }}>Scanned: {item.code}</div>
              </div>
            </div>

            <div style={{ background: "white", padding: 24 }}>
              {submitted && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 600 }}>
                  <CheckCircle size={18} /> Submitted successfully!
                </div>
              )}

              {mode === "loading" && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  Searching for asset...
                </div>
              )}

              {mode === "editing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", borderBottom: "2px solid #f3f4f6", paddingBottom: 8, marginBottom: 12 }}>Asset Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[["Name", assetDetails?.name], ["Asset ID", assetDetails?.asset_id], ["Category", assetDetails?.category], ["Model", assetDetails?.model]].map(([label, val]) => (
                        <div key={label} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginTop: 2, fontFamily: label === "Asset ID" ? "'DM Mono', monospace" : "inherit" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", borderBottom: "2px solid #f3f4f6", paddingBottom: 8, marginBottom: 12 }}>Update Association</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {(!parentScan || parentScan.type !== "location") && (
                        <div>
                          <label style={labelStyle}><MapPin size={12} style={{ display: "inline", marginRight: 4 }} />Location</label>
                          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{ ...inputStyle, background: "white" }}>
                            <option value="">-- None --</option>
                            {mockLocations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                          </select>
                        </div>
                      )}
                      {(!parentScan || parentScan.type !== "department") && (
                        <div>
                          <label style={labelStyle}><Building2 size={12} style={{ display: "inline", marginRight: 4 }} />Department</label>
                          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} style={{ ...inputStyle, background: "white" }}>
                            <option value="">-- None --</option>
                            {mockDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", borderBottom: "2px solid #f3f4f6", paddingBottom: 8, marginBottom: 12 }}>Update Condition</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {conditionOptions.map(opt => (
                        <label key={opt} style={{ flex: 1, border: `2px solid ${condition === opt ? "#dc2626" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: "pointer", background: condition === opt ? "#fef2f2" : "white", color: condition === opt ? "#dc2626" : "#374151", fontWeight: 600, fontSize: 13, transition: "all 0.15s" }}>
                          <input type="radio" name="condition" value={opt} checked={condition === opt} onChange={() => setCondition(opt)} style={{ display: "none" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {mode === "registering" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, color: "#1d4ed8" }}>
                    <PackagePlus size={20} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>New Asset</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>This Asset ID was not found. Please register it.</div>
                    </div>
                  </div>
                  <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Asset ID</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 14, marginTop: 2 }}>{item.code}</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Asset Name (Required)</label>
                    <input style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Dell Latitude 5420" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Category (Required)</label>
                      <input style={inputStyle} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g., Laptop" />
                    </div>
                    <div>
                      <label style={labelStyle}>Model (Required)</label>
                      <input style={inputStyle} value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="e.g., Latitude 5420" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="e.g., 14-inch laptop, 16GB RAM" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {(!parentScan || parentScan.type !== "location") && (
                      <div>
                        <label style={labelStyle}>Location</label>
                        <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{ ...inputStyle, background: "white" }}>
                          <option value="">-- None --</option>
                          {mockLocations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                        </select>
                      </div>
                    )}
                    {(!parentScan || parentScan.type !== "department") && (
                      <div>
                        <label style={labelStyle}>Department</label>
                        <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} style={{ ...inputStyle, background: "white" }}>
                          <option value="">-- None --</option>
                          {mockDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", borderBottom: "2px solid #f3f4f6", paddingBottom: 8, marginBottom: 12 }}>Set Initial Condition</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {conditionOptions.map(opt => (
                        <label key={opt} style={{ flex: 1, border: `2px solid ${condition === opt ? "#dc2626" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: "pointer", background: condition === opt ? "#fef2f2" : "white", color: condition === opt ? "#dc2626" : "#374151", fontWeight: 600, fontSize: 13, transition: "all 0.15s" }}>
                          <input type="radio" name="condition" value={opt} checked={condition === opt} onChange={() => setCondition(opt)} style={{ display: "none" }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: "white", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
            <div style={{ padding: "16px 20px", background: "#f9fafb", borderRadius: 16, display: "flex", gap: 12, justifyContent: "space-between" }}>
              <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", color: "white", border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                <ChevronLeft size={16} /> Back to Scan
              </button>
              {mode === "editing" && (
                <button type="submit" style={{ display: "flex", alignItems: "center", gap: 8, background: "#16a34a", color: "white", border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  <CheckCircle size={16} /> Submit Changes
                </button>
              )}
              {mode === "registering" && (
                <button type="submit" style={{ display: "flex", alignItems: "center", gap: 8, background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  <Save size={16} /> Register New Asset
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Success Page ─────────────────────────────────────────────
function SuccessPage({ item, scanType, onScanMore, onViewAll }: {
  item: any;
  scanType: string;
  onScanMore: () => void;
  onViewAll: () => void;
}) {
  const isBulkOperation = item?.code === 'BULK' || scanType === 'Staff Assignment';

  const getTitle = () => {
    if (scanType === 'New Asset Registered') return "Asset Registered!";
    if (scanType.startsWith('Tagged to')) return "Asset Tagged!";
    if (scanType === 'Staff Assignment') return "Staff Updated!";
    return "Submission Successful!";
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ background: "white", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", padding: "48px 32px", textAlign: "center" }}>

          {/* Bounce icon */}
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 96, height: 96, background: "#dcfce7", borderRadius: "50%", marginBottom: 24, animation: "bounce 1s infinite" }}>
            <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
            <Check size={48} color="#16a34a" />
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", marginBottom: 8 }}>{getTitle()}</h1>
          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 32 }}>
            {scanType === 'New Asset Registered'
              ? `New asset ${item?.name || ''} has been created.`
              : isBulkOperation
                ? `Staff records have been successfully updated.`
                : `1 ${scanType} item has been successfully submitted.`}
          </p>

          {/* Confirmation details card */}
          <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 14, padding: "20px 24px", marginBottom: 32, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#15803d", fontWeight: 700, fontSize: 15, marginBottom: 16, justifyContent: "center" }}>
              <CheckCircle size={20} /> Confirmation Details
            </div>

            {/* Case 1: Single asset */}
            {item && !isBulkOperation && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Asset ID", item.asset_id || item.code, true],
                  ["Name", item.name || "N/A", false],
                  ["Category", item.category || "N/A", false],
                  ["Model", item.model || "N/A", false],
                  ["Condition", item.condition || "N/A", false],
                  ...(item.location_id ? [["Location", item.location_id, false]] : []),
                  ...(item.department_id ? [["Department", item.department_id, false]] : []),
                ].map(([label, value, mono]) => (
                  <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#6b7280", fontWeight: 600 }}>{label}</span>
                    <span style={{ color: "#15803d", fontWeight: 600, fontFamily: mono ? "'DM Mono', monospace" : "inherit" }}>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Case 2: Bulk/Staff */}
            {isBulkOperation && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>{item?.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Transactions completed successfully.</div>
              </div>
            )}

            {/* Case 3: Fallback */}
            {!item && !isBulkOperation && (
              <div style={{ textAlign: "center", fontSize: 13, color: "#15803d" }}>
                <div>Status: <strong>Confirmed</strong></div>
              </div>
            )}

            <div style={{ borderTop: "1.5px solid #bbf7d0", marginTop: 16, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280", fontWeight: 600 }}>Date</span>
                <span style={{ color: "#15803d", fontWeight: 600 }}>{new Date().toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280", fontWeight: 600 }}>Time</span>
                <span style={{ color: "#15803d", fontWeight: 600 }}>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={onScanMore} style={{ width: "100%", padding: "14px", background: "#dc2626", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              Scan More Items
            </button>
            <button onClick={onViewAll} style={{ width: "100%", padding: "14px", background: "#111", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
              View All Submissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────
interface ScannedItem {
    id: number;
    code: string;
    time: string;
    name: string;
}

export default function App() {
  const [page, setPage] = useState("scanner");
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [successItem, setSuccessItem] = useState<any>(null);
  const [successScanType, setSuccessScanType] = useState("Asset Updated");
  const [parentScan, setParentScan] = useState(null);

  const handleItemScanned = (item: ScannedItem) => {
    setScannedItem(item);
    setPage("confirmation");
  };

  const handleConfirmSubmit = (item: any, scanType: string) => {
    setSuccessItem(item);
    setSuccessScanType(scanType);
    setPage("success");
  };

  const navPages = [
    { label: "Scanner", key: "scanner" },
    { label: "Confirm (existing)", key: "confirm-existing" },
    { label: "Confirm (new)", key: "confirm-new" },
    { label: "Success (updated)", key: "success-updated" },
    { label: "Success (registered)", key: "success-registered" },
  ];

  const handleNav = (key: string) => {
    if (key === "confirm-existing") {
      setScannedItem({ code: "ASSET-001234", id: Date.now(), time: new Date().toLocaleTimeString(), name: "Item - ASSET-001234" });
      setPage("confirmation");
    } else if (key === "confirm-new") {
      setScannedItem({ code: "ASSET-NEW999", id: Date.now(), time: new Date().toLocaleTimeString(), name: "Item - ASSET-NEW999" });
      setPage("confirmation");
    } else if (key === "success-updated") {
      setSuccessItem({ asset_id: "ASSET-001234", name: "Dell Latitude 5420", category: "Laptop", model: "Latitude 5420", condition: "In-use", location_id: "LOC001", department_id: "DEPT001" });
      setSuccessScanType("Asset Updated");
      setPage("success");
    } else if (key === "success-registered") {
      setSuccessItem({ asset_id: "ASSET-NEW999", name: "New Projector", category: "Electronics", model: "Epson X500", condition: "In-store", location_id: "", department_id: "" });
      setSuccessScanType("New Asset Registered");
      setPage("success");
    } else {
      setPage("scanner");
    }
  };

  return (
    <div>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Demo nav */}
      <div style={{ background: "#111", color: "white", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>🧪 Demo</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {navPages.map(({ label, key }) => (
            <button key={key} onClick={() => handleNav(key)}
              style={{ background: page === key || (key === "confirm-existing" && page === "confirmation") ? "#dc2626" : "#374151", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {page === "scanner" && (
        <ScannerPage
          title="Scan Asset"
          description="Point camera at QR or barcode"
          onItemScanned={handleItemScanned}
          onBack={() => {}}
          parentScan={parentScan}
        />
      )}
      {page === "confirmation" && scannedItem && (
        <ConfirmationPage
          item={scannedItem}
          onBack={() => setPage("scanner")}
          onSuccess={handleConfirmSubmit}
          parentScan={parentScan}
        />
      )}
      {page === "success" && (
        <SuccessPage
          item={successItem}
          scanType={successScanType}
          onScanMore={() => setPage("scanner")}
          onViewAll={() => setPage("scanner")}
        />
      )}
    </div>
  );
}