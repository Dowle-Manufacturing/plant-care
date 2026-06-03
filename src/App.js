import { useState, useEffect, useRef, useCallback } from "react";

// ── Empty defaults — collection starts blank ──────────────────────
const EMPTY_COLLECTION = {
  plants:   [],
  schedule: [
    { day: "Monday",   subtitle: "Watering Day 1", tasks: [] },
    { day: "Thursday", subtitle: "Watering Day 2", tasks: [] },
    { day: "Saturday", subtitle: "Health Check",   tasks: [] },
  ],
  misting:  { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  images:   {},
};

const typeColors = {
  water:    { bg: "#dbeafe", text: "#1e40af", icon: "💧" },
  mist:     { bg: "#e0f2fe", text: "#0369a1", icon: "🌫️" },
  humidity: { bg: "#f0fdf4", text: "#166534", icon: "💦" },
  wipe:     { bg: "#fef9c3", text: "#854d0e", icon: "✨" },
  check:    { bg: "#fdf4ff", text: "#7e22ce", icon: "🔍" },
};

const ALL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const monthlyNote = [
  "🌱 Feed all actively growing plants with diluted liquid fertiliser (spring & summer only)",
  "🪴 Check if any plants need repotting",
  "✂️ Trim any brown or dead leaves",
  "🔄 Rotate windowsill plants for even light exposure",
];

const STORAGE_WEEK_PREFIX = "plantcare_week_";
const STORAGE_IMAGES_KEY  = "plant_images_v4";

function getWeekKey() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `${STORAGE_WEEK_PREFIX}${monday.getFullYear()}${String(monday.getMonth()+1).padStart(2,"0")}${String(monday.getDate()).padStart(2,"0")}`;
}

function lsGet(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
function lsSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

// ── API helpers ───────────────────────────────────────────────────
async function callClaude(messages) {
  const res = await fetch("/api/claude", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content.filter(b => b.type === "text").map(b => b.text).join("");
}

async function searchWikiImage(plantKey, latinName) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "image_search", plant: plantKey, latin: latinName }),
    });
    const data = await res.json();
    return data.imageUrl || null;
  } catch { return null; }
}

async function readSharedCollection() {
  try {
    const res = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "read_collection" }),
    });
    const data = await res.json();
    return data.collection || null;
  } catch { return null; }
}

async function writeSharedCollection(collection) {
  try {
    await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "write_collection", collection }),
    });
  } catch {}
}

async function getPlantData(plantName) {
  const prompt = `You are a houseplant expert. For "${plantName}" return ONLY valid raw JSON, no markdown:
{
  "commonName": "display name",
  "latinName": "scientific name",
  "shortNote": "one sentence care highlight",
  "wateringTasks": [{"day":"Monday or Thursday or Saturday","action":"specific watering instruction","type":"water"}],
  "mistingDays": [{"day":"day of week","note":"misting instruction"}],
  "needsMisting": true,
  "care": {
    "watering": "detailed watering instructions including frequency, how much, and technique",
    "light": "preferred light conditions and placement advice",
    "fertiliser": "when to fertilise, what type to use, and how often",
    "growingSeason": "when the plant actively grows and what changes to expect",
    "pottingMix": "ideal soil mix composition and drainage requirements",
    "repotting": "when and how to repot, pot size guidance, and signs it needs repotting",
    "pruning": "pruning schedule, what to remove, and how to do it",
    "diseases": "common pests, diseases and conditions to watch for, and how to treat them"
  }
}
Add 1-2 watering tasks on Monday/Thursday/Saturday only. Add 2-4 misting days if it needs misting.`;
  const raw = await callClaude([{ role: "user", content: prompt }]);
  const clean = raw.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON");
  return JSON.parse(clean.slice(s, e+1));
}

async function identifyPlantFromImage(base64Image, mimeType) {
  const prompt = `Identify this plant from the photo. Return ONLY valid raw JSON, no markdown:
{
  "commonName": "plant common name",
  "latinName": "scientific name",
  "shortNote": "one sentence care highlight",
  "wateringTasks": [{"day":"Monday or Thursday or Saturday","action":"specific watering instruction","type":"water"}],
  "mistingDays": [{"day":"day of week","note":"misting instruction"}],
  "needsMisting": true,
  "confidence": "high or medium or low",
  "care": {
    "watering": "detailed watering instructions including frequency, how much, and technique",
    "light": "preferred light conditions and placement advice",
    "fertiliser": "when to fertilise, what type to use, and how often",
    "growingSeason": "when the plant actively grows and what changes to expect",
    "pottingMix": "ideal soil mix composition and drainage requirements",
    "repotting": "when and how to repot, pot size guidance, and signs it needs repotting",
    "pruning": "pruning schedule, what to remove, and how to do it",
    "diseases": "common pests, diseases and conditions to watch for, and how to treat them"
  }
}`;
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
      { type: "text", text: prompt }
    ]
  }];
  const raw = await callClaude(messages);
  const clean = raw.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON");
  return JSON.parse(clean.slice(s, e+1));
}

async function assessPlantHealth(base64Image, mimeType, plantName) {
  const prompt = `You are a plant health expert. Assess the health of this ${plantName || "plant"} from the photo.
Return ONLY valid raw JSON, no markdown:
{
  "status": "healthy or needs_attention or urgent",
  "summary": "one sentence overall assessment",
  "issues": ["issue 1", "issue 2"],
  "actions": ["specific action to take 1", "specific action 2"],
  "positives": ["what looks good 1"]
}`;
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
      { type: "text", text: prompt }
    ]
  }];
  const raw = await callClaude(messages);
  const clean = raw.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON");
  return JSON.parse(clean.slice(s, e+1));
}

// ── Image helpers ─────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Lightbox ──────────────────────────────────────────────────────
function ImageLightbox({ src, name, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1rem",cursor:"pointer" }}>
      <div style={{ fontSize:"0.78rem",color:"rgba(134,239,172,0.6)",marginBottom:"0.8rem" }}>{name}</div>
      <img src={src} alt={name} onClick={e=>e.stopPropagation()} style={{ maxWidth:"90vw",maxHeight:"75vh",borderRadius:"0.8rem",objectFit:"contain",border:"1px solid rgba(134,239,172,0.2)",cursor:"default" }} />
      <div style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.3)",marginTop:"0.8rem" }}>Tap outside or Esc to close</div>
    </div>
  );
}

function PlantImg({ src, name, size=56 }) {
  const [err,setErr] = useState(false);
  const [lb,setLb]   = useState(false);
  const imgSrc = (!src||err) ? null : src;
  return (
    <>
      {lb && imgSrc && <ImageLightbox src={imgSrc} name={name||""} onClose={()=>setLb(false)} />}
      <div onClick={imgSrc?(e)=>{e.stopPropagation();setLb(true);}:undefined}
        style={{ width:size,height:size,borderRadius:"0.5rem",flexShrink:0,cursor:imgSrc?"pointer":"default",position:"relative",overflow:"hidden" }}>
        {imgSrc ? (
          <>
            <img src={imgSrc} alt={name||""} onError={()=>setErr(true)} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"0.5rem",display:"block",border:"1px solid rgba(134,239,172,0.2)" }} />
            <div style={{ position:"absolute",bottom:2,right:2,background:"rgba(0,0,0,0.5)",borderRadius:"3px",padding:"1px 3px",fontSize:"0.5rem",color:"white",lineHeight:1,pointerEvents:"none" }}>🔍</div>
          </>
        ) : (
          <div style={{ width:"100%",height:"100%",background:"rgba(134,239,172,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size>40?"1.4rem":"1rem",border:"1px solid rgba(134,239,172,0.12)",borderRadius:"0.5rem" }}>🌿</div>
        )}
      </div>
    </>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <div onClick={e=>{e.stopPropagation();onChange();}} style={{ width:24,height:24,borderRadius:"6px",flexShrink:0,cursor:"pointer",border:checked?"2px solid #4ade80":"2px solid rgba(134,239,172,0.3)",background:checked?"linear-gradient(135deg,#16a34a,#15803d)":"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s ease" }}>
      {checked && <span style={{ color:"white",fontSize:"14px",lineHeight:1 }}>✓</span>}
    </div>
  );
}

// ── Photo upload button ───────────────────────────────────────────
function PhotoUploadButton({ onPhoto, label, icon, accept }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept||"image/*"} capture="environment" onChange={async e=>{
        const file = e.target.files?.[0];
        if (!file) return;
        const b64 = await fileToBase64(file);
        onPhoto(b64, file.type);
        e.target.value = "";
      }} style={{ display:"none" }} />
      <button onClick={()=>ref.current?.click()} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"0.6rem",padding:"0.6rem 0.9rem",color:"rgba(134,239,172,0.8)",cursor:"pointer",fontSize:"0.82rem",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"0.4rem" }}>
        {icon} {label}
      </button>
    </>
  );
}

// ── Health Check Modal ────────────────────────────────────────────
function HealthCheckModal({ plants, images, onClose }) {
  const [selectedPlant, setSelectedPlant] = useState(plants[0]?.key || "");
  const [status,  setStatus]  = useState("idle");
  const [result,  setResult]  = useState(null);
  const [errMsg,  setErrMsg]  = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const steps = ["Uploading photo...","Analysing plant health...","Checking for issues...","Preparing care advice..."];

  useEffect(() => {
    if (status !== "loading") { setStepIdx(0); return; }
    const t = setInterval(() => setStepIdx(i=>(i+1)%4), 1400);
    return () => clearInterval(t);
  }, [status]);

  const analyse = async (b64, mime) => {
    setStatus("loading"); setResult(null); setErrMsg("");
    try {
      const data = await assessPlantHealth(b64, mime, selectedPlant);
      setResult(data); setStatus("success");
    } catch(e) {
      setErrMsg(`Analysis failed: ${e.message}`);
      setStatus("error");
    }
  };

  const statusColor = result?.status === "healthy" ? "#4ade80" : result?.status === "urgent" ? "#f87171" : "#fde68a";
  const statusIcon  = result?.status === "healthy" ? "✅" : result?.status === "urgent" ? "🚨" : "⚠️";

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }}>
      <div style={{ background:"linear-gradient(135deg,#0d2318,#0a1a0f)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"1rem",padding:"1.5rem",width:"100%",maxWidth:"440px",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem" }}>
          <h2 style={{ margin:0,fontSize:"1.1rem",color:"#86efac",fontWeight:"400" }}>🔬 Plant Health Check</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(134,239,172,0.5)",cursor:"pointer",fontSize:"1.3rem",lineHeight:1 }}>×</button>
        </div>

        {plants.length > 0 && (
          <div style={{ marginBottom:"1rem" }}>
            <div style={{ fontSize:"0.7rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.4rem" }}>Which plant?</div>
            <select value={selectedPlant} onChange={e=>setSelectedPlant(e.target.value)}
              style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"0.6rem",padding:"0.5rem 0.8rem",color:"#e8f5e9",fontSize:"0.85rem",fontFamily:"inherit",outline:"none" }}>
              <option value="">Unknown / not in my collection</option>
              {plants.map(p=><option key={p.key} value={p.key}>{p.key}</option>)}
            </select>
          </div>
        )}

        {status === "idle" && (
          <div style={{ display:"flex",flexDirection:"column",gap:"0.6rem" }}>
            <div style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.5)",marginBottom:"0.4rem" }}>Take or upload a photo of your plant to get an instant health assessment.</div>
            <PhotoUploadButton onPhoto={analyse} label="Take a photo" icon="📷" />
            <PhotoUploadButton onPhoto={analyse} label="Upload from gallery" icon="🖼️" accept="image/*" />
          </div>
        )}

        {status === "loading" && (
          <div style={{ textAlign:"center",padding:"2rem",color:"rgba(134,239,172,0.6)",fontSize:"0.82rem" }}>
            <div style={{ fontSize:"2rem",marginBottom:"0.5rem",animation:"spin 2s linear infinite" }}>🔬</div>
            <div>{steps[stepIdx]}</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {status === "error" && (
          <div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"0.6rem",padding:"0.8rem",color:"rgba(252,165,165,0.8)",fontSize:"0.8rem",marginBottom:"0.8rem" }}>{errMsg}</div>
        )}

        {status === "success" && result && (
          <div>
            <div style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${statusColor}40`,borderRadius:"0.8rem",padding:"1rem",marginBottom:"1rem" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.8rem" }}>
                <span style={{ fontSize:"1.5rem" }}>{statusIcon}</span>
                <div>
                  <div style={{ fontSize:"0.9rem",fontWeight:"600",color:statusColor,textTransform:"capitalize" }}>{result.status?.replace("_"," ")}</div>
                  <div style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.6)",marginTop:"0.15rem" }}>{result.summary}</div>
                </div>
              </div>

              {result.positives?.length > 0 && (
                <div style={{ marginBottom:"0.7rem" }}>
                  <div style={{ fontSize:"0.68rem",color:"rgba(74,222,128,0.6)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.3rem" }}>Looking good</div>
                  {result.positives.map((p,i)=><div key={i} style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.6)",padding:"0.15rem 0" }}>✓ {p}</div>)}
                </div>
              )}

              {result.issues?.length > 0 && (
                <div style={{ marginBottom:"0.7rem" }}>
                  <div style={{ fontSize:"0.68rem",color:"rgba(253,224,71,0.7)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.3rem" }}>Issues spotted</div>
                  {result.issues.map((issue,i)=><div key={i} style={{ fontSize:"0.76rem",color:"rgba(253,224,71,0.8)",padding:"0.15rem 0" }}>⚠ {issue}</div>)}
                </div>
              )}

              {result.actions?.length > 0 && (
                <div>
                  <div style={{ fontSize:"0.68rem",color:"rgba(134,239,172,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.3rem" }}>What to do</div>
                  {result.actions.map((a,i)=><div key={i} style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.7)",padding:"0.15rem 0" }}>→ {a}</div>)}
                </div>
              )}
            </div>
            <button onClick={()=>{setStatus("idle");setResult(null);}} style={{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(134,239,172,0.15)",borderRadius:"0.6rem",padding:"0.7rem",color:"rgba(134,239,172,0.6)",cursor:"pointer",fontSize:"0.82rem",fontFamily:"inherit" }}>Check another photo</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Plant Detail Modal ────────────────────────────────────────────
function PlantDetailModal({ plant, imageUrl, onClose, onRemove }) {
  const care = plant.care || {};
  const sections = [
    { icon: "💧", label: "Watering",      key: "watering"     },
    { icon: "☀️", label: "Light",          key: "light"        },
    { icon: "🌱", label: "Fertiliser",     key: "fertiliser"   },
    { icon: "📅", label: "Growing Season", key: "growingSeason"},
    { icon: "🪴", label: "Potting Mix",    key: "pottingMix"   },
    { icon: "🔄", label: "Repotting",      key: "repotting"    },
    { icon: "✂️", label: "Pruning",        key: "pruning"      },
    { icon: "🔍", label: "Diseases & Pests",key: "diseases"    },
  ];

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:150,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0" }}>
      <div style={{ background:"linear-gradient(180deg,#0d2318,#0a1a0f)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"1.2rem 1.2rem 0 0",width:"100%",maxWidth:"520px",maxHeight:"90vh",overflowY:"auto",paddingBottom:"2rem" }}>

        {/* Header with image */}
        <div style={{ position:"relative",background:"linear-gradient(135deg,rgba(22,163,74,0.15),rgba(10,26,15,0.9))",padding:"1.5rem 1.2rem 1rem",borderBottom:"1px solid rgba(134,239,172,0.1)" }}>
          <button onClick={onClose} style={{ position:"absolute",top:"1rem",right:"1rem",background:"rgba(255,255,255,0.08)",border:"none",borderRadius:"50%",width:32,height:32,color:"rgba(134,239,172,0.6)",cursor:"pointer",fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
          <div style={{ display:"flex",gap:"1rem",alignItems:"center" }}>
            {imageUrl && (
              <img src={imageUrl} alt={plant.key} style={{ width:80,height:80,borderRadius:"0.7rem",objectFit:"cover",border:"1px solid rgba(134,239,172,0.2)",flexShrink:0 }} />
            )}
            <div>
              <h2 style={{ margin:0,fontSize:"1.2rem",fontWeight:"600",color:"#86efac" }}>{plant.key}</h2>
              <div style={{ fontSize:"0.78rem",color:"rgba(134,239,172,0.5)",fontStyle:"italic",marginTop:"0.2rem" }}>{plant.latin}</div>
              {plant.note && <div style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.55)",marginTop:"0.4rem",lineHeight:"1.4" }}>{plant.note}</div>}
            </div>
          </div>
        </div>

        {/* Care sections */}
        <div style={{ padding:"1rem" }}>
          {Object.keys(care).length === 0 ? (
            <div style={{ textAlign:"center",padding:"2rem",color:"rgba(134,239,172,0.3)",fontSize:"0.8rem" }}>
              No detailed care info available for this plant yet.
            </div>
          ) : sections.map(({ icon, label, key }) => {
            if (!care[key]) return null;
            return (
              <div key={key} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(134,239,172,0.08)",borderRadius:"0.7rem",padding:"0.85rem 1rem",marginBottom:"0.5rem" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.4rem" }}>
                  <span style={{ fontSize:"1rem" }}>{icon}</span>
                  <span style={{ fontSize:"0.75rem",fontWeight:"600",color:"#86efac",letterSpacing:"0.08em",textTransform:"uppercase" }}>{label}</span>
                </div>
                <div style={{ fontSize:"0.8rem",color:"rgba(232,245,233,0.65)",lineHeight:"1.6" }}>{care[key]}</div>
              </div>
            );
          })}
        </div>

        {/* Remove button */}
        <div style={{ padding:"0 1rem" }}>
          <button onClick={()=>{ onRemove(plant.key); onClose(); }} style={{ width:"100%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"0.7rem",padding:"0.7rem",color:"rgba(252,165,165,0.6)",cursor:"pointer",fontSize:"0.8rem",fontFamily:"inherit" }}>
            Remove from collection
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Plant Modal ───────────────────────────────────────────────
function AddPlantModal({ onClose, onAdd }) {
  const [mode,    setMode]    = useState("name"); // name | photo
  const [query,   setQuery]   = useState("");
  const [status,  setStatus]  = useState("idle");
  const [result,  setResult]  = useState(null);
  const [errMsg,  setErrMsg]  = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (mode==="name") inputRef.current?.focus(); }, [mode]);

  const steps = ["Searching plant info...","Looking up care requirements...","Finding a Wikipedia photo...","Building your schedule..."];
  useEffect(() => {
    if (status !== "loading") { setStepIdx(0); return; }
    const t = setInterval(()=>setStepIdx(i=>(i+1)%4), 1200);
    return ()=>clearInterval(t);
  }, [status]);

  const search = async () => {
    if (!query.trim()) return;
    setStatus("loading"); setResult(null); setErrMsg("");
   try {
      const data = await getPlantData(query.trim());
      console.log("Plant data received:", JSON.stringify(data).slice(0, 500));
      console.log("Care object:", JSON.stringify(data.care));
      const imageUrl = await searchWikiImage(data.commonName, data.latinName);
      data.imageUrl = imageUrl;
      setResult(data); setStatus("success");
    } catch(e) {
      setErrMsg(`Could not find plant: ${e.message}`);
      setStatus("error");
    }
  };
  const searchByPhoto = async (b64, mime) => {
    setStatus("loading"); setResult(null); setErrMsg("");
    try {
      const data = await identifyPlantFromImage(b64, mime);
      const imageUrl = await searchWikiImage(data.commonName, data.latinName);
      data.imageUrl = imageUrl;
      setResult(data); setStatus("success");
    } catch(e) {
      setErrMsg(`Could not identify plant: ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }}>
      <div style={{ background:"linear-gradient(135deg,#0d2318,#0a1a0f)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"1rem",padding:"1.5rem",width:"100%",maxWidth:"440px",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem" }}>
          <h2 style={{ margin:0,fontSize:"1.1rem",color:"#86efac",fontWeight:"400" }}>🌱 Add a New Plant</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(134,239,172,0.5)",cursor:"pointer",fontSize:"1.3rem",lineHeight:1 }}>×</button>
        </div>

        {/* Mode toggle */}
        {status === "idle" && (
          <div style={{ display:"flex",gap:"0.4rem",marginBottom:"1rem" }}>
            {[{id:"name",label:"🔤 By name"},{id:"photo",label:"📷 By photo"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setErrMsg("");}} style={{
                flex:1,background:mode===m.id?"linear-gradient(135deg,#16a34a,#15803d)":"rgba(255,255,255,0.04)",
                border:mode===m.id?"1px solid #4ade80":"1px solid rgba(134,239,172,0.15)",
                borderRadius:"0.6rem",padding:"0.5rem",color:mode===m.id?"#fff":"rgba(134,239,172,0.6)",
                cursor:"pointer",fontSize:"0.8rem",fontFamily:"inherit",
              }}>{m.label}</button>
            ))}
          </div>
        )}

        {/* Name search */}
        {status === "idle" && mode === "name" && (
          <div style={{ display:"flex",gap:"0.5rem",marginBottom:"0.6rem" }}>
            <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="e.g. Boston Fern, Peace Lily..."
              style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(134,239,172,0.2)",borderRadius:"0.6rem",padding:"0.6rem 0.9rem",color:"#e8f5e9",fontSize:"0.85rem",fontFamily:"inherit",outline:"none" }} />
            <button onClick={search} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"0.6rem",padding:"0.6rem 1rem",color:"white",cursor:"pointer",fontSize:"0.85rem",fontFamily:"inherit" }}>Search</button>
          </div>
        )}

        {/* Photo search */}
        {status === "idle" && mode === "photo" && (
          <div style={{ display:"flex",flexDirection:"column",gap:"0.6rem",marginBottom:"0.6rem" }}>
            <div style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.5)" }}>Take or upload a photo and I'll identify the plant and add its care schedule automatically.</div>
            <PhotoUploadButton onPhoto={searchByPhoto} label="Take a photo" icon="📷" />
            <PhotoUploadButton onPhoto={searchByPhoto} label="Upload from gallery" icon="🖼️" />
          </div>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div style={{ textAlign:"center",padding:"1.5rem",color:"rgba(134,239,172,0.6)",fontSize:"0.82rem" }}>
            <div style={{ fontSize:"1.5rem",marginBottom:"0.5rem",animation:"spin 2s linear infinite" }}>🌿</div>
            <div>{steps[stepIdx]}</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div style={{ background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"0.6rem",padding:"0.8rem",color:"rgba(252,165,165,0.8)",fontSize:"0.8rem",marginBottom:"0.8rem" }}>{errMsg}</div>
            <button onClick={()=>{setStatus("idle");setResult(null);}} style={{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(134,239,172,0.15)",borderRadius:"0.6rem",padding:"0.6rem",color:"rgba(134,239,172,0.6)",cursor:"pointer",fontSize:"0.82rem",fontFamily:"inherit" }}>Try again</button>
          </>
        )}

        {/* Result */}
        {status === "success" && result && (
          <div>
            <div style={{ background:"rgba(22,163,74,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"0.8rem",padding:"1rem",marginBottom:"1rem" }}>
              <div style={{ display:"flex",gap:"0.8rem",alignItems:"center",marginBottom:"0.8rem" }}>
                <PlantImg src={result.imageUrl} name={result.commonName} size={60} />
                <div>
                  <div style={{ fontSize:"0.95rem",fontWeight:"600",color:"#86efac" }}>{result.commonName}</div>
                  <div style={{ fontSize:"0.72rem",color:"rgba(134,239,172,0.5)",fontStyle:"italic" }}>{result.latinName}</div>
                  <div style={{ fontSize:"0.74rem",color:"rgba(232,245,233,0.6)",marginTop:"0.2rem" }}>{result.shortNote}</div>
                  {result.confidence && <div style={{ fontSize:"0.68rem",color:"rgba(134,239,172,0.4)",marginTop:"0.2rem" }}>Confidence: {result.confidence}</div>}
                </div>
              </div>
              {result.wateringTasks?.length > 0 && (
                <div style={{ marginBottom:"0.5rem" }}>
                  <div style={{ fontSize:"0.68rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.3rem" }}>Watering:</div>
                  {result.wateringTasks.map((t,i)=><div key={i} style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.65)",padding:"0.15rem 0" }}>💧 <strong style={{ color:"#86efac" }}>{t.day}:</strong> {t.action}</div>)}
                </div>
              )}
              {result.needsMisting && result.mistingDays?.length > 0 && (
                <div>
                  <div style={{ fontSize:"0.68rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.3rem" }}>Misting:</div>
                  {result.mistingDays.map((m,i)=><div key={i} style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.65)",padding:"0.15rem 0" }}>🌫️ <strong style={{ color:"#86efac" }}>{m.day}:</strong> {m.note}</div>)}
                </div>
              )}
            </div>
            <div style={{ display:"flex",gap:"0.5rem" }}>
              <button onClick={()=>{setStatus("idle");setResult(null);setQuery("");}} style={{ flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(134,239,172,0.15)",borderRadius:"0.6rem",padding:"0.7rem",color:"rgba(134,239,172,0.6)",cursor:"pointer",fontSize:"0.82rem",fontFamily:"inherit" }}>Search again</button>
              <button onClick={()=>onAdd(result)} style={{ flex:2,background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"0.6rem",padding:"0.7rem",color:"white",cursor:"pointer",fontSize:"0.82rem",fontFamily:"inherit",fontWeight:"600" }}>✓ Add to collection</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [tab,           setTab]           = useState("schedule");
  const [activeDay,     setActiveDay]     = useState(0);
  const [weekKey]                         = useState(getWeekKey);
  const [showAdd,       setShowAdd]       = useState(false);
  const [showHealth,    setShowHealth]    = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [imgRefreshing, setImgRefreshing] = useState(false);
  const [syncStatus,    setSyncStatus]    = useState("idle"); // idle | syncing | synced | offline

  const [collection,   setCollection]   = useState(EMPTY_COLLECTION);
  const [plantImages,  setPlantImages]  = useState(() => lsGet(STORAGE_IMAGES_KEY) || {});
  const [waterChecked, setWaterChecked] = useState(() => lsGet(weekKey)?.water || {});
  const [mistChecked,  setMistChecked]  = useState(() => lsGet(weekKey)?.mist  || {});

const plants      = collection?.plants   || [];
const schedule    = collection?.schedule || EMPTY_COLLECTION.schedule;
const mistingData = collection?.misting  || EMPTY_COLLECTION.misting;

  // ── Load from shared DB on mount ────────────────────────────────
  useEffect(() => {
    setSyncStatus("syncing");
    readSharedCollection().then(remote => {
      if (remote) {
        setCollection(remote);
        // Merge images
        if (remote.images) {
          setPlantImages(prev => {
            const merged = { ...prev, ...remote.images };
            lsSet(STORAGE_IMAGES_KEY, merged);
            return merged;
          });
        }
        setSyncStatus("synced");
      } else {
        // Try local fallback
        const local = lsGet("plant_collection_local");
        if (local) setCollection(local);
        setSyncStatus("offline");
      }
    }).catch(() => {
      const local = lsGet("plant_collection_local");
      if (local) setCollection(local);
      setSyncStatus("offline");
    });
  }, []);

  // ── Save collection to shared DB and localStorage ───────────────
  const saveCollection = useCallback((newCollection) => {
    const withImages = { ...newCollection, images: lsGet(STORAGE_IMAGES_KEY) || {} };
    setCollection(newCollection);
    lsSet("plant_collection_local", newCollection);
    writeSharedCollection(withImages);
  }, []);

  // ── Persist check state locally ─────────────────────────────────
  useEffect(() => {
    lsSet(weekKey, { water: waterChecked, mist: mistChecked });
  }, [waterChecked, mistChecked, weekKey]);

  // ── Refresh images for any plants missing them ──────────────────
  useEffect(() => {
    if (!plants?.length) return;
    let cancelled = false;
    const refresh = async () => {
      setImgRefreshing(true);
      for (const plant of plants) {
        if (cancelled) break;
        if (plantImages[plant.key]) continue; // skip if already have image
        try {
          const url = await searchWikiImage(plant.key, plant.latin);
          if (url && !cancelled) {
            setPlantImages(prev => {
              const updated = { ...prev, [plant.key]: url };
              lsSet(STORAGE_IMAGES_KEY, updated);
              return updated;
            });
          }
        } catch {}
        await new Promise(r=>setTimeout(r, 700));
      }
      if (!cancelled) setImgRefreshing(false);
    };
    const t = setTimeout(refresh, 1500);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants]);

  const toggleWater = (day,idx) => setWaterChecked(prev=>{const d={...(prev[day]||{})};d[idx]=!d[idx];return{...prev,[day]:d};});
  const toggleMist  = (day,idx) => setMistChecked(prev=>{const d={...(prev[day]||{})};d[idx]=!d[idx];return{...prev,[day]:d};});

  const isWaterDayComplete = (day) => { const dd = (schedule||[]).find(d=>d.day===day); if(!dd||!dd.tasks?.length) return false; return dd.tasks.every((_,i)=>(waterChecked[day]||{})[i]); };
  const isMistDayComplete  = (day) => { const pl = mistingData[day]; if(!pl?.length) return false; return pl.every((_,i)=>(mistChecked[day]||{})[i]); };

  const resetAll = () => {
    setWaterChecked({}); setMistChecked({});
    lsSet(weekKey, { water:{}, mist:{} });
  };

  const handleAddPlant = (data) => {
    const name = data.commonName;
    const newPlants   = [...plants, { key:name, latin:data.latinName, note:data.shortNote }];
    const newSchedule = schedule.map(dayObj => {
      const tasks = (data.wateringTasks||[]).filter(t=>t.day===dayObj.day);
      if (!tasks.length) return dayObj;
      return { ...dayObj, tasks:[...dayObj.tasks, ...tasks.map(t=>({plant:name,action:t.action,type:t.type||"water"}))] };
    });
    const newMisting = { ...mistingData };
    if (data.needsMisting && data.mistingDays?.length) {
      data.mistingDays.forEach(({day,note})=>{
        if (!ALL_DAYS.includes(day)) return;
        newMisting[day] = [...(newMisting[day]||[]), {p:name,n:note}];
      });
    }
    // Save image
    if (data.imageUrl) {
      const imgs = { ...lsGet(STORAGE_IMAGES_KEY)||{}, [name]:data.imageUrl };
      lsSet(STORAGE_IMAGES_KEY, imgs);
      setPlantImages(imgs);
    }
    saveCollection({ ...collection, plants:newPlants, schedule:newSchedule, misting:newMisting });
    setShowAdd(false);
  };

  const handleRemovePlant = (plantName) => {
    const newPlants   = plants.filter(p=>p.key!==plantName);
    const newSchedule = schedule.map(d=>({...d,tasks:d.tasks.filter(t=>t.plant!==plantName)}));
    const newMisting  = Object.fromEntries(Object.entries(mistingData).map(([day,arr])=>[day,arr.filter(m=>m.p!==plantName)]));
    const newImgs     = {...lsGet(STORAGE_IMAGES_KEY)||{}}; delete newImgs[plantName];
    lsSet(STORAGE_IMAGES_KEY, newImgs); setPlantImages(newImgs);
    saveCollection({ ...collection, plants:newPlants, schedule:newSchedule, misting:newMisting });
  };

const totalWater = (schedule||[]).reduce((s,d)=>s+(d.tasks||[]).length,0);
const doneWater  = (schedule||[]).reduce((s,d)=>s+(d.tasks||[]).filter((_,i)=>(waterChecked[d.day]||{})[i]).length,0);
const totalMist  = ALL_DAYS.reduce((s,day)=>s+(mistingData[day]||[]).length,0);
const doneMist   = ALL_DAYS.reduce((s,day)=>s+(mistingData[day]||[]).filter((_,i)=>(mistChecked[day]||{})[i]).length,0);
  const doneAll    = doneWater+doneMist;
  const totalAll   = totalWater+totalMist;
  const allComplete = doneAll===totalAll && totalAll>0;
  const getImg     = (name) => plantImages[name]||null;

  const syncIcon = syncStatus==="syncing"?"🔄" : syncStatus==="synced"?"☁️" : syncStatus==="offline"?"📵" : "☁️";
  const syncTip  = syncStatus==="syncing"?"Syncing..." : syncStatus==="synced"?"Synced across devices" : "Offline — changes saved locally";

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0a1a0f 0%,#0d2318 40%,#0a1a0f 100%)",fontFamily:"'Georgia','Times New Roman',serif",color:"#e8f5e9" }}>

      {showAdd    && <AddPlantModal     onClose={()=>setShowAdd(false)}    onAdd={handleAddPlant} />}
      {showHealth && <HealthCheckModal  onClose={()=>setShowHealth(false)} plants={plants} images={plantImages} />}
      {selectedPlant && <PlantDetailModal plant={selectedPlant} imageUrl={getImg(selectedPlant.key)} onClose={()=>setSelectedPlant(null)} onRemove={handleRemovePlant} />}

      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 100%)",borderBottom:"1px solid rgba(134,239,172,0.15)",padding:"1.5rem 1.5rem 1.2rem",textAlign:"center" }}>
        <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:"-1rem" }}>
          <div title={syncTip} style={{ fontSize:"0.9rem",opacity:0.6 }}>{syncIcon}</div>
        </div>
        <div style={{ fontSize:"1.8rem",marginBottom:"0.3rem" }}>🌿</div>
        <h1 style={{ fontSize:"clamp(1.3rem,5vw,1.8rem)",fontWeight:"400",letterSpacing:"0.08em",color:"#86efac",margin:"0 0 0.5rem",textTransform:"uppercase" }}>Weekly Plant Care</h1>
        {imgRefreshing && <div style={{ fontSize:"0.68rem",color:"rgba(134,239,172,0.4)",marginBottom:"0.3rem" }}>🌿 Updating images...</div>}

        {plants.length === 0 ? (
          <div style={{ fontSize:"0.8rem",color:"rgba(134,239,172,0.5)",marginBottom:"0.5rem" }}>Add your first plant to get started</div>
        ) : (
          <div style={{ maxWidth:"280px",margin:"0 auto" }}>
            {[{label:"Watering",done:doneWater,total:totalWater,color:"#4ade80"},{label:"Misting",done:doneMist,total:totalMist,color:"#67e8f9"}].map(({label,done,total,color})=>(
              <div key={label} style={{ marginBottom:"0.4rem" }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.68rem",color:"rgba(134,239,172,0.5)",marginBottom:"0.2rem" }}>
                  <span>{label}</span><span>{done}/{total}</span>
                </div>
                <div style={{ height:"5px",background:"rgba(134,239,172,0.1)",borderRadius:"3px",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${total?(done/total)*100:0}%`,background:color,borderRadius:"3px",transition:"width 0.4s ease" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {doneAll > 0 && (
          <button onClick={resetAll} style={{ marginTop:"0.6rem",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"2rem",padding:"0.3rem 0.9rem",color:"rgba(252,165,165,0.8)",cursor:"pointer",fontSize:"0.72rem",fontFamily:"inherit" }}>
            {allComplete?"🎉 All done! Reset for next week":"Reset week"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:"0.4rem",padding:"1rem 1rem 0",justifyContent:"center",flexWrap:"wrap" }}>
        {[{id:"schedule",label:"💧 Schedule"},{id:"misting",label:"🌫️ Misting"},{id:"plants",label:"🌿 My Plants"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:tab===t.id?"linear-gradient(135deg,#16a34a,#15803d)":"rgba(255,255,255,0.04)",
            border:tab===t.id?"1px solid #4ade80":"1px solid rgba(134,239,172,0.15)",
            borderRadius:"2rem",padding:"0.45rem 1rem",color:tab===t.id?"#fff":"rgba(134,239,172,0.6)",
            cursor:"pointer",fontSize:"0.78rem",letterSpacing:"0.05em",fontFamily:"inherit",transition:"all 0.2s ease",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"1.2rem 1rem 2rem" }}>

        {/* ══ SCHEDULE ══ */}
        {tab==="schedule" && <>
          {plants.length === 0 ? (
            <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(134,239,172,0.4)" }}>
              <div style={{ fontSize:"3rem",marginBottom:"1rem" }}>🌱</div>
              <div style={{ fontSize:"0.9rem",marginBottom:"0.5rem" }}>No plants yet</div>
              <div style={{ fontSize:"0.76rem",marginBottom:"1.5rem" }}>Add your first plant to build your watering schedule</div>
              <button onClick={()=>setTab("plants")} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"2rem",padding:"0.6rem 1.5rem",color:"white",cursor:"pointer",fontSize:"0.85rem",fontFamily:"inherit" }}>+ Add Plant</button>
            </div>
          ) : (<>
            <div style={{ display:"flex",gap:"0.4rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"1rem" }}>
              {schedule.map((d,i)=>{
                const complete  = isWaterDayComplete(d.day);
                const dc        = waterChecked[d.day]||{};
                const doneCount = d.tasks.filter((_,idx)=>dc[idx]).length;
                const inProg    = doneCount>0 && !complete;
                return (
                  <button key={d.day} onClick={()=>setActiveDay(i)} style={{
                    background:complete?"linear-gradient(135deg,#15803d,#166534)":activeDay===i?"linear-gradient(135deg,#16a34a,#15803d)":"rgba(255,255,255,0.04)",
                    border:(complete||activeDay===i)?"1px solid #4ade80":"1px solid rgba(134,239,172,0.15)",
                    borderRadius:"2rem",padding:"0.5rem 1.1rem",color:(complete||activeDay===i)?"#fff":"rgba(134,239,172,0.6)",
                    cursor:"pointer",fontSize:"0.78rem",letterSpacing:"0.08em",fontFamily:"inherit",transition:"all 0.2s ease",
                  }}>
                    {complete?"✓ ":""}{d.day}{inProg&&<span style={{ marginLeft:"0.3rem",fontSize:"0.65rem",color:"#fde68a" }}>({doneCount}/{d.tasks.length})</span>}
                  </button>
                );
              })}
            </div>
            {(()=>{
              const d = schedule[activeDay]||schedule[0];
              if (!d) return null;
              const complete  = isWaterDayComplete(d.day);
              const dc        = waterChecked[d.day]||{};
              const doneCount = d.tasks.filter((_,i)=>dc[i]).length;
              return (
                <div style={{ background:complete?"rgba(22,163,74,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${complete?"#4ade80":"rgba(134,239,172,0.12)"}`,borderRadius:"1rem",overflow:"hidden",marginBottom:"1rem",transition:"all 0.4s ease" }}>
                  <div style={{ background:complete?"linear-gradient(135deg,rgba(22,163,74,0.4),rgba(21,128,61,0.3))":"linear-gradient(135deg,rgba(22,163,74,0.2),rgba(21,128,61,0.1))",padding:"0.9rem 1.2rem",borderBottom:"1px solid rgba(134,239,172,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <h2 style={{ margin:0,fontSize:"1.2rem",fontWeight:"400",color:complete?"#4ade80":"#86efac" }}>{complete?"✓ ":""}{d.day}</h2>
                      <p style={{ margin:"0.15rem 0 0",fontSize:"0.72rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.1em",textTransform:"uppercase" }}>
                        {d.tasks.length===0?"No tasks yet":` ${doneCount}/${d.tasks.length} done`}
                      </p>
                    </div>
                    {complete && <span style={{ fontSize:"1.5rem" }}>🎉</span>}
                  </div>
                  <div style={{ padding:"0.7rem" }}>
                    {d.tasks.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"1rem",fontSize:"0.76rem",color:"rgba(134,239,172,0.3)" }}>Add plants to populate this day</div>
                    ) : d.tasks.map((task,i)=>{
                      const s = typeColors[task.type]||typeColors.water;
                      const isChecked = !!((waterChecked[d.day]||{})[i]);
                      return (
                        <div key={i} onClick={()=>toggleWater(d.day,i)} style={{ display:"flex",gap:"0.7rem",padding:"0.75rem",marginBottom:i<d.tasks.length-1?"0.4rem":0,background:isChecked?"rgba(22,163,74,0.08)":"rgba(255,255,255,0.03)",borderRadius:"0.6rem",border:`1px solid ${isChecked?"rgba(74,222,128,0.3)":"rgba(134,239,172,0.08)"}`,alignItems:"center",cursor:"pointer",transition:"all 0.2s ease",opacity:isChecked?0.7:1 }}>
                          <Checkbox checked={isChecked} onChange={()=>toggleWater(d.day,i)} />
                          <PlantImg src={getImg(task.plant)} name={task.plant} size={40} />
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:"0.82rem",fontWeight:"600",color:isChecked?"#4ade80":"#86efac",marginBottom:"0.2rem",textDecoration:isChecked?"line-through":"none" }}>{task.plant}</div>
                            <div style={{ fontSize:"0.74rem",color:isChecked?"rgba(232,245,233,0.35)":"rgba(232,245,233,0.6)",lineHeight:"1.4" }}>{task.action}</div>
                          </div>
                          <div style={{ fontSize:"0.62rem",background:s.bg,color:s.text,padding:"0.2rem 0.45rem",borderRadius:"1rem",fontFamily:"sans-serif",textTransform:"uppercase",whiteSpace:"nowrap",flexShrink:0,fontWeight:"600" }}>{s.icon} {task.type}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(134,239,172,0.12)",borderRadius:"1rem",overflow:"hidden",marginBottom:"1rem" }}>
              <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.2),rgba(109,40,217,0.1))",padding:"0.75rem 1.2rem",borderBottom:"1px solid rgba(134,239,172,0.1)" }}>
                <h3 style={{ margin:0,fontSize:"0.85rem",fontWeight:"400",color:"#d8b4fe",letterSpacing:"0.1em",textTransform:"uppercase" }}>Monthly Reminders</h3>
              </div>
              <div style={{ padding:"0.6rem" }}>
                {monthlyNote.map((note,i)=><div key={i} style={{ padding:"0.45rem 0.6rem",fontSize:"0.76rem",color:"rgba(232,245,233,0.6)",lineHeight:"1.4",borderBottom:i<monthlyNote.length-1?"1px solid rgba(134,239,172,0.06)":"none" }}>{note}</div>)}
              </div>
            </div>
          </>)}
        </>}

        {/* ══ MISTING ══ */}
        {tab==="misting" && <>
          {plants.length === 0 ? (
            <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(134,239,172,0.4)" }}>
              <div style={{ fontSize:"3rem",marginBottom:"1rem" }}>🌫️</div>
              <div style={{ fontSize:"0.9rem",marginBottom:"0.5rem" }}>No plants yet</div>
              <div style={{ fontSize:"0.76rem",marginBottom:"1.5rem" }}>Add plants to build your misting schedule</div>
              <button onClick={()=>setTab("plants")} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"2rem",padding:"0.6rem 1.5rem",color:"white",cursor:"pointer",fontSize:"0.85rem",fontFamily:"inherit" }}>+ Add Plant</button>
            </div>
          ) : (<>
            <div style={{ background:"rgba(14,116,144,0.12)",border:"1px solid rgba(103,232,249,0.2)",borderRadius:"0.8rem",padding:"0.8rem 1rem",marginBottom:"1rem",fontSize:"0.76rem",color:"rgba(232,245,233,0.65)",lineHeight:"1.5" }}>
              🌫️ <strong style={{ color:"#67e8f9" }}>Daily misting guide</strong> — mist in the morning. Resets every Monday.
            </div>
            {ALL_DAYS.map(day=>{
              const dayPlants = mistingData[day]||[];
              const dc        = mistChecked[day]||{};
              const doneCount = dayPlants.filter((_,i)=>dc[i]).length;
              const complete  = isMistDayComplete(day);
              return (
                <div key={day} style={{ background:complete?"rgba(6,78,59,0.2)":"rgba(255,255,255,0.03)",border:`1px solid ${complete?"rgba(103,232,249,0.5)":"rgba(134,239,172,0.1)"}`,borderRadius:"0.8rem",overflow:"hidden",marginBottom:"0.6rem",transition:"all 0.3s ease" }}>
                  <div style={{ background:complete?"rgba(6,148,162,0.3)":"rgba(14,116,144,0.15)",padding:"0.6rem 1rem",borderBottom:dayPlants.length?"1px solid rgba(134,239,172,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontSize:"0.85rem",color:"#67e8f9",fontWeight:complete?"600":"400" }}>{complete?"✓ ":""}{day}</span>
                    <span style={{ fontSize:"0.7rem",color:complete?"rgba(103,232,249,0.8)":"rgba(103,232,249,0.5)" }}>{dayPlants.length>0?`${doneCount}/${dayPlants.length}`:"no misting"}{complete&&" 🎉"}</span>
                  </div>
                  {dayPlants.length > 0 && (
                    <div style={{ padding:"0.4rem 0.6rem" }}>
                      {dayPlants.map(({p,n},i)=>{
                        const isChecked = !!(dc[i]);
                        return (
                          <div key={i} onClick={()=>toggleMist(day,i)} style={{ display:"flex",alignItems:"center",gap:"0.7rem",padding:"0.45rem 0.3rem",borderBottom:i<dayPlants.length-1?"1px solid rgba(134,239,172,0.05)":"none",cursor:"pointer",opacity:isChecked?0.6:1,transition:"opacity 0.2s ease" }}>
                            <Checkbox checked={isChecked} onChange={()=>toggleMist(day,i)} />
                            <PlantImg src={getImg(p)} name={p} size={34} />
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:"0.8rem",color:isChecked?"#4ade80":"#86efac",textDecoration:isChecked?"line-through":"none" }}>{p}</div>
                              <div style={{ fontSize:"0.7rem",color:"rgba(232,245,233,0.45)" }}>{n}</div>
                            </div>
                            <span style={{ fontSize:"1rem" }}>🌫️</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(134,239,172,0.08)",borderRadius:"0.8rem",padding:"0.9rem 1rem",marginTop:"0.5rem" }}>
              <div style={{ fontSize:"0.72rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"0.6rem" }}>Plants that don't need misting</div>
              <div style={{ fontSize:"0.76rem",color:"rgba(232,245,233,0.4)",lineHeight:"1.6" }}>Succulents, Jade Plants, Cacti, Rubber Plants — wipe leaves instead.</div>
            </div>
          </>)}
        </>}

        {/* ══ PLANTS ══ */}
        {tab==="plants" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.8rem",flexWrap:"wrap",gap:"0.5rem" }}>
            <div style={{ fontSize:"0.72rem",color:"rgba(134,239,172,0.4)",letterSpacing:"0.12em",textTransform:"uppercase" }}>
              {plants.length===0?"No plants yet":`Your collection · ${plants.length} plant${plants.length!==1?"s":""}`}
              {imgRefreshing && <span style={{ color:"rgba(134,239,172,0.3)" }}> · updating...</span>}
            </div>
            <div style={{ display:"flex",gap:"0.5rem" }}>
              <button onClick={()=>setShowHealth(true)} style={{ background:"rgba(14,116,144,0.2)",border:"1px solid rgba(103,232,249,0.3)",borderRadius:"2rem",padding:"0.4rem 0.9rem",color:"#67e8f9",cursor:"pointer",fontSize:"0.75rem",fontFamily:"inherit" }}>🔬 Health Check</button>
              <button onClick={()=>setShowAdd(true)} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"2rem",padding:"0.4rem 0.9rem",color:"white",cursor:"pointer",fontSize:"0.75rem",fontFamily:"inherit",fontWeight:"600" }}>+ Add Plant</button>
            </div>
          </div>

          {plants.length === 0 ? (
            <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(134,239,172,0.4)" }}>
              <div style={{ fontSize:"4rem",marginBottom:"1rem" }}>🪴</div>
              <div style={{ fontSize:"0.95rem",marginBottom:"0.5rem",color:"rgba(134,239,172,0.6)" }}>Your collection is empty</div>
              <div style={{ fontSize:"0.78rem",marginBottom:"2rem",lineHeight:"1.6" }}>Add plants by name or take a photo<br/>and I'll identify them for you</div>
              <button onClick={()=>setShowAdd(true)} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"2rem",padding:"0.8rem 2rem",color:"white",cursor:"pointer",fontSize:"0.9rem",fontFamily:"inherit",fontWeight:"600" }}>+ Add your first plant</button>
            </div>
          ) : plants.map((plant,i)=>(
            <div key={i} onClick={()=>setSelectedPlant(plant)} style={{ display:"flex",gap:"0.9rem",alignItems:"center",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(134,239,172,0.08)",borderRadius:"0.7rem",padding:"0.7rem",marginBottom:"0.5rem",cursor:"pointer",transition:"all 0.2s ease" }}>
              <PlantImg src={getImg(plant.key)} name={plant.key} size={56} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:"0.88rem",fontWeight:"600",color:"#86efac",marginBottom:"0.2rem" }}>{plant.key}</div>
                <div style={{ fontSize:"0.72rem",color:"rgba(134,239,172,0.4)",fontStyle:"italic" }}>{plant.latin}</div>
              </div>
              <div style={{ color:"rgba(134,239,172,0.3)",fontSize:"1rem",flexShrink:0 }}>›</div>
            </div>
          ))}
        </>}

      </div>
    </div>
  );
}