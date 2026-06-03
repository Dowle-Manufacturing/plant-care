import { useState, useEffect, useRef } from "react";

const DEFAULT_IMAGES = {
  "Japanese Bird's Nest Fern": "https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=120&h=120&fit=crop",
  "Bird's Nest Fern":          "https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=120&h=120&fit=crop",
  "Asparagus Fern":            "https://images.unsplash.com/photo-1599598425947-5202edd56bdb?w=120&h=120&fit=crop",
  "Calathea":                  "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=120&h=120&fit=crop",
  "Jade Plant":                "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=120&h=120&fit=crop",
  "Bird of Paradise":          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=120&fit=crop",
  "Spider Plant":              "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=120&h=120&fit=crop",
  "Basil":                     "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=120&h=120&fit=crop",
  "Echeveria":                 "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=120&h=120&fit=crop",
  "Kangaroo Paw Fern":         "https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=120&h=120&fit=crop",
  "Chinese Money Plant":       "https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=120&h=120&fit=crop",
  "Variegated Rubber Plant":   "https://images.unsplash.com/photo-1545241047-6083a3684587?w=120&h=120&fit=crop",
  "Monstera":                  "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=120&h=120&fit=crop",
  "Maranta (Prayer Plant)":    "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=120&h=120&fit=crop",
  "Parlour Palm":              "https://images.unsplash.com/photo-1587334274328-64186a80aeee?w=120&h=120&fit=crop",
};

const DEFAULT_SCHEDULE = [
  {
    day: "Monday", subtitle: "Tropical & Humidity Lovers",
    tasks: [
      { plant: "Calathea",                  action: "Water if top inch is dry — use filtered water.",                    type: "water"    },
      { plant: "Maranta (Prayer Plant)",    action: "Water if top inch is dry — filtered water. Trim browned leaves.",  type: "water"    },
      { plant: "Japanese Bird's Nest Fern", action: "Water around edges if dry — never into the crown.",                type: "water"    },
      { plant: "Bird's Nest Fern",          action: "Water around edges if dry — never into the crown.",                type: "water"    },
      { plant: "Asparagus Fern",            action: "Water if lightly dry. Mist all over the plant.",                   type: "mist"     },
      { plant: "Kangaroo Paw Fern",         action: "Water if dry. Mist around the fronds.",                            type: "mist"     },
      { plant: "Parlour Palm",              action: "Water if top inch is dry. Keep away from radiator!",               type: "water"    },
      { plant: "All pebble trays",          action: "Refill all pebble trays — Calathea, Ferns, Maranta, Palm.",        type: "humidity" },
      { plant: "Basil",                     action: "Water at the base. Pinch off any flower buds.",                    type: "water"    },
    ],
  },
  {
    day: "Thursday", subtitle: "All Plants Check-in",
    tasks: [
      { plant: "Calathea",                  action: "Check soil — water if top inch is dry. Use filtered water.",       type: "water" },
      { plant: "Maranta (Prayer Plant)",    action: "Check soil — water if top inch is dry. Filtered water.",          type: "water" },
      { plant: "Japanese Bird's Nest Fern", action: "Check — water around edges if needed.",                           type: "water" },
      { plant: "Bird's Nest Fern",          action: "Check — water around edges if needed.",                           type: "water" },
      { plant: "Asparagus Fern",            action: "Check soil — water if dry. Mist all over.",                       type: "mist"  },
      { plant: "Kangaroo Paw Fern",         action: "Check soil — water if dry. Mist fronds.",                         type: "mist"  },
      { plant: "Parlour Palm",              action: "Check — water if top inch is dry. Mist fronds.",                  type: "mist"  },
      { plant: "Monstera",                  action: "Water if top 2 inches are dry. Mist moss poles.",                 type: "water" },
      { plant: "Bird of Paradise",          action: "Water thoroughly if top 2 inches are dry.",                       type: "water" },
      { plant: "Chinese Money Plant",       action: "Water if top inch is dry. Rotate pot.",                           type: "water" },
      { plant: "Spider Plant",              action: "Water if top inch is dry. Use filtered water.",                   type: "water" },
      { plant: "Basil",                     action: "Water at the base — keep moist.",                                 type: "water" },
    ],
  },
  {
    day: "Saturday", subtitle: "Low-Maintenance & Health Check",
    tasks: [
      { plant: "Variegated Rubber Plant",   action: "Water if top 2 inches are dry. Wipe leaves — no misting!",       type: "wipe"  },
      { plant: "Jade Plant",                action: "Only water if bone dry. Ensure it's in the sunniest spot.",       type: "water" },
      { plant: "Echeveria",                 action: "Only water if bone dry. Check it's getting direct sun.",          type: "water" },
      { plant: "All plants",                action: "General health check — yellowing, browning, pests. Trim dead leaves.", type: "check" },
      { plant: "Chinese Money Plant",       action: "Check for pups at base — pot up any 5cm+ tall.",                 type: "check" },
      { plant: "Spider Plant",              action: "Check for spiderettes ready to propagate.",                       type: "check" },
    ],
  },
];

const DEFAULT_MISTING = {
  Monday:    [{ p: "Asparagus Fern", n: "Mist freely all over" }, { p: "Kangaroo Paw Fern", n: "Mist around the fronds" }, { p: "Calathea", n: "Mist around plant, not on leaves" }, { p: "Maranta (Prayer Plant)", n: "Mist around plant, not on leaves" }],
  Tuesday:   [{ p: "Japanese Bird's Nest Fern", n: "Mist around only — never into crown" }, { p: "Bird's Nest Fern", n: "Mist around only — never into crown" }, { p: "Parlour Palm", n: "Mist the fronds freely" }],
  Wednesday: [{ p: "Asparagus Fern", n: "Mist freely all over" }, { p: "Kangaroo Paw Fern", n: "Mist around the fronds" }, { p: "Spider Plant", n: "Light mist around the plant" }],
  Thursday:  [{ p: "Calathea", n: "Mist around plant only" }, { p: "Maranta (Prayer Plant)", n: "Mist around plant only" }, { p: "Monstera", n: "Mist the moss poles" }, { p: "Parlour Palm", n: "Mist the fronds" }],
  Friday:    [{ p: "Japanese Bird's Nest Fern", n: "Mist around only — never into crown" }, { p: "Bird's Nest Fern", n: "Mist around only — never into crown" }, { p: "Asparagus Fern", n: "Mist freely all over" }, { p: "Kangaroo Paw Fern", n: "Mist around the fronds" }],
  Saturday:  [{ p: "Monstera", n: "Mist the moss poles" }, { p: "Parlour Palm", n: "Mist the fronds" }],
  Sunday:    [{ p: "Calathea", n: "Mist around plant only" }, { p: "Maranta (Prayer Plant)", n: "Mist around plant only" }, { p: "Asparagus Fern", n: "Light mist all over" }],
};

const DEFAULT_PLANT_LIST = [
  { key: "Japanese Bird's Nest Fern", latin: "Asplenium antiquum",       note: "Wavy fronds — fussy about humidity"          },
  { key: "Bird's Nest Fern",          latin: "Asplenium nidus",          note: "Flat glossy fronds — healthier of the two"   },
  { key: "Asparagus Fern",            latin: "Asparagus setaceus",       note: "Feathery & cloud-like — toxic to pets"       },
  { key: "Calathea",                  latin: "Calathea ornata",          note: "Pink stripes — needs filtered water"         },
  { key: "Jade Plant",                latin: "Crassula ovata",           note: "Currently stressed — needs sun & less water" },
  { key: "Bird of Paradise",          latin: "Strelitzia reginae",       note: "Young plant — watch drainage in tin pot"     },
  { key: "Spider Plant",              latin: "Chlorophytum comosum",     note: "Near radiator — move if possible"            },
  { key: "Basil",                     latin: "Ocimum basilicum",         note: "Pinch flowers to keep leaves sweet"          },
  { key: "Echeveria",                 latin: "Echeveria sp.",            note: "Slow-growing — stays small naturally"        },
  { key: "Kangaroo Paw Fern",         latin: "Microsorum diversifolium", note: "In the amazing face pot 😄"                  },
  { key: "Chinese Money Plant",       latin: "Pilea peperomioides",      note: "Rotate weekly for even growth"               },
  { key: "Variegated Rubber Plant",   latin: "Ficus elastica 'Tineke'",  note: "Wipe leaves — never mist"                   },
  { key: "Monstera",                  latin: "Monstera deliciosa",       note: "You have two! Keep moss poles damp"          },
  { key: "Maranta (Prayer Plant)",    latin: "Maranta leuconeura",       note: "Move from fireplace — pet safe ✅"            },
  { key: "Parlour Palm",              latin: "Chamaedorea elegans",      note: "Move away from radiator urgently"            },
];

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
  "🪴 Check if any plants need repotting — especially Monstera and Bird of Paradise",
  "✂️ Trim brown tips on Parlour Palm at an angle for a tidy look",
  "🔄 Rotate all windowsill plants for even light exposure",
];

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return `plantcare_${monday.getFullYear()}${String(monday.getMonth()+1).padStart(2,"0")}${String(monday.getDate()).padStart(2,"0")}`;
}

// ── Fetch a single plant image via the API route ─────────────────
async function searchPlantImage(plantKey, latinName) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "image_search",
        plant: plantKey,
        latin: latinName,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl || null;
  } catch {
    return null;
  }
}

// ── Claude plant data lookup ──────────────────────────────────────
async function askClaude(prompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  if (!text) throw new Error("Empty response");
  return text;
}

async function getPlantData(plantName) {
  const prompt = `You are a houseplant expert. For the houseplant "${plantName}" return ONLY a valid JSON object with no markdown, no explanation, just raw JSON.

Return exactly this structure:
{
  "commonName": "display name for the plant",
  "latinName": "scientific name",
  "shortNote": "one short sentence about the most important care tip",
  "wateringTasks": [
    { "day": "Monday or Thursday or Saturday", "action": "specific watering instruction", "type": "water" }
  ],
  "mistingDays": [
    { "day": "day of week", "note": "brief misting instruction" }
  ],
  "needsMisting": true
}

For wateringTasks add 1-2 tasks on Monday, Thursday, or Saturday only.
For mistingDays use 2-4 days if it needs misting.`;

  const raw = await askClaude(prompt);
  const clean = raw.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(clean.slice(start, end + 1));
}

// ── Sub-components ────────────────────────────────────────────────
function PlantImg({ src, size = 56 }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: "0.5rem", background: "rgba(134,239,172,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 40 ? "1.4rem" : "1rem", flexShrink: 0, border: "1px solid rgba(134,239,172,0.12)" }}>🌿</div>
  );
  return <img src={src} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: "0.5rem", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(134,239,172,0.2)" }} />;
}

function Checkbox({ checked, onChange }) {
  return (
    <div onClick={e => { e.stopPropagation(); onChange(); }} style={{
      width: 24, height: 24, borderRadius: "6px", flexShrink: 0, cursor: "pointer",
      border: checked ? "2px solid #4ade80" : "2px solid rgba(134,239,172,0.3)",
      background: checked ? "linear-gradient(135deg,#16a34a,#15803d)" : "rgba(255,255,255,0.04)",
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease",
    }}>
      {checked && <span style={{ color: "white", fontSize: "14px", lineHeight: 1 }}>✓</span>}
    </div>
  );
}

// ── Add Plant Modal ───────────────────────────────────────────────
function AddPlantModal({ onClose, onAdd }) {
  const [query,   setQuery]   = useState("");
  const [status,  setStatus]  = useState("idle");
  const [result,  setResult]  = useState(null);
  const [errMsg,  setErrMsg]  = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const steps = ["Searching for plant info...","Looking up care requirements...","Finding a photo...","Building your schedule entries..."];

  useEffect(() => {
    if (status !== "loading") { setStepIdx(0); return; }
    const stepsLen = 4;
    const t = setInterval(() => setStepIdx(i => (i + 1) % stepsLen), 1200);
    return () => clearInterval(t);
  }, [status]);

  const search = async () => {
    if (!query.trim()) return;
    setStatus("loading");
    setResult(null);
    setErrMsg("");
    try {
      const data = await getPlantData(query.trim());
      // Fetch image separately via Unsplash
      const imageUrl = await searchPlantImage(data.commonName, data.latinName);
      data.imageUrl = imageUrl;
      setResult(data);
      setStatus("success");
    } catch (e) {
      setErrMsg(`Could not find plant: ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "linear-gradient(135deg,#0d2318,#0a1a0f)", border: "1px solid rgba(134,239,172,0.2)", borderRadius: "1rem", padding: "1.5rem", width: "100%", maxWidth: "420px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#86efac", fontWeight: "400" }}>🌱 Add a New Plant</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(134,239,172,0.5)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="e.g. Boston Fern, Peace Lily..."
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(134,239,172,0.2)", borderRadius: "0.6rem", padding: "0.6rem 0.9rem", color: "#e8f5e9", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" }} />
          <button onClick={search} disabled={status === "loading"} style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: "0.6rem", padding: "0.6rem 1rem", color: "white", cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit", opacity: status === "loading" ? 0.6 : 1 }}>
            {status === "loading" ? "..." : "Search"}
          </button>
        </div>
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "rgba(134,239,172,0.6)", fontSize: "0.82rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", animation: "spin 2s linear infinite" }}>🌿</div>
            <div>{steps[stepIdx]}</div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.6rem", padding: "0.8rem", color: "rgba(252,165,165,0.8)", fontSize: "0.8rem" }}>{errMsg}</div>
        )}
        {status === "success" && result && (
          <div>
            <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.8rem", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", marginBottom: "0.8rem" }}>
                <PlantImg src={result.imageUrl} size={60} />
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#86efac" }}>{result.commonName}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(134,239,172,0.5)", fontStyle: "italic" }}>{result.latinName}</div>
                  <div style={{ fontSize: "0.74rem", color: "rgba(232,245,233,0.6)", marginTop: "0.2rem" }}>{result.shortNote}</div>
                </div>
              </div>
              <div style={{ marginBottom: "0.6rem" }}>
                <div style={{ fontSize: "0.68rem", color: "rgba(134,239,172,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Will be added to watering schedule:</div>
                {result.wateringTasks?.map((t, i) => (
                  <div key={i} style={{ fontSize: "0.76rem", color: "rgba(232,245,233,0.65)", padding: "0.2rem 0" }}>
                    💧 <strong style={{ color: "#86efac" }}>{t.day}:</strong> {t.action}
                  </div>
                ))}
              </div>
              {result.needsMisting && result.mistingDays?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(134,239,172,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Will be added to misting schedule:</div>
                  {result.mistingDays.map((m, i) => (
                    <div key={i} style={{ fontSize: "0.76rem", color: "rgba(232,245,233,0.65)", padding: "0.2rem 0" }}>
                      🌫️ <strong style={{ color: "#86efac" }}>{m.day}:</strong> {m.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => { setStatus("idle"); setResult(null); setQuery(""); }} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(134,239,172,0.15)", borderRadius: "0.6rem", padding: "0.7rem", color: "rgba(134,239,172,0.6)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit" }}>Search again</button>
              <button onClick={() => onAdd(result)} style={{ flex: 2, background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: "0.6rem", padding: "0.7rem", color: "white", cursor: "pointer", fontSize: "0.82rem", fontFamily: "inherit", fontWeight: "600" }}>✓ Add to my collection</button>
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
  const [weekKey,       setWeekKey]       = useState(getWeekKey());
  const [showAdd,       setShowAdd]       = useState(false);
  const [imgRefreshing, setImgRefreshing] = useState(false);

  const [plantImages,  setPlantImages]  = useState({ ...DEFAULT_IMAGES });
  const [schedule,     setSchedule]     = useState(DEFAULT_SCHEDULE);
  const [mistingData,  setMistingData]  = useState(DEFAULT_MISTING);
  const [plantList,    setPlantList]    = useState(DEFAULT_PLANT_LIST);
  const [waterChecked, setWaterChecked] = useState({});
  const [mistChecked,  setMistChecked]  = useState({});

  // ── Load saved data from storage ────────────────────────────────
  useEffect(() => {
    const key = getWeekKey();
    setWeekKey(key);
    if (!window.storage) return;
    window.storage.get(key).then(r => {
      if (r?.value) { try { const s = JSON.parse(r.value); if (s.water) setWaterChecked(s.water); if (s.mist) setMistChecked(s.mist); } catch {} }
    }).catch(() => {});
    window.storage.get("plant_data").then(r => {
      if (r?.value) {
        try {
          const d = JSON.parse(r.value);
          if (d.images)   setPlantImages(d.images);
          if (d.schedule) setSchedule(d.schedule);
          if (d.misting)  setMistingData(d.misting);
          if (d.plants)   setPlantList(d.plants);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // ── Refresh all plant images on mount ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    const refreshAllImages = async () => {
      setImgRefreshing(true);
      const freshImages = {};

      for (const plant of DEFAULT_PLANT_LIST) {
        if (cancelled) break;
        try {
          const url = await searchPlantImage(plant.key, plant.latin);
          if (url && !cancelled) {
            freshImages[plant.key] = url;
            // Update images one by one as they arrive
            setPlantImages(prev => ({ ...prev, [plant.key]: url }));
          }
        } catch {}
        // Stagger requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 700));
      }

      if (!cancelled && Object.keys(freshImages).length > 0) {
        // Persist the updated images
        if (window.storage) {
          window.storage.get("plant_data").then(r => {
            const existing = r?.value ? JSON.parse(r.value) : {};
            window.storage.set("plant_data", JSON.stringify({
              ...existing,
              images: { ...DEFAULT_IMAGES, ...freshImages },
            })).catch(() => {});
          }).catch(() => {});
        }
      }

      if (!cancelled) setImgRefreshing(false);
    };

    // Wait 1.5s for storage to load first, then refresh
    const t = setTimeout(refreshAllImages, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // ── Save check state ─────────────────────────────────────────────
  useEffect(() => {
    if (!window.storage) return;
    if (!Object.keys(waterChecked).length && !Object.keys(mistChecked).length) return;
    window.storage.set(weekKey, JSON.stringify({ water: waterChecked, mist: mistChecked })).catch(() => {});
  }, [waterChecked, mistChecked, weekKey]);

  const savePlantData = (imgs, sched, mist, plants) => {
    if (!window.storage) return;
    window.storage.set("plant_data", JSON.stringify({ images: imgs, schedule: sched, misting: mist, plants })).catch(() => {});
  };

  const toggleWater = (day, idx) => setWaterChecked(prev => { const d = { ...(prev[day]||{}) }; d[idx] = !d[idx]; return { ...prev, [day]: d }; });
  const toggleMist  = (day, idx) => setMistChecked(prev  => { const d = { ...(prev[day]||{}) }; d[idx] = !d[idx]; return { ...prev, [day]: d }; });

  const isWaterDayComplete = (day) => { const dd = schedule.find(d => d.day === day); if (!dd) return false; const dc = waterChecked[day]||{}; return dd.tasks.every((_,i) => dc[i]); };
  const isMistDayComplete  = (day) => { const pl = mistingData[day]; if (!pl?.length) return false; const dc = mistChecked[day]||{}; return pl.every((_,i) => dc[i]); };

  const resetAll = () => {
    setWaterChecked({}); setMistChecked({});
    if (window.storage) window.storage.set(weekKey, JSON.stringify({ water: {}, mist: {} })).catch(() => {});
  };

  const handleAddPlant = (data) => {
    const name = data.commonName;
    const newImages   = { ...plantImages, [name]: data.imageUrl };
    const newPlants   = [...plantList, { key: name, latin: data.latinName, note: data.shortNote }];
    const newSchedule = schedule.map(dayObj => {
      const tasksForDay = (data.wateringTasks || []).filter(t => t.day === dayObj.day);
      if (!tasksForDay.length) return dayObj;
      return { ...dayObj, tasks: [...dayObj.tasks, ...tasksForDay.map(t => ({ plant: name, action: t.action, type: t.type || "water" }))] };
    });
    let newMisting = { ...mistingData };
    if (data.needsMisting && data.mistingDays?.length) {
      data.mistingDays.forEach(({ day, note }) => {
        if (!ALL_DAYS.includes(day)) return;
        newMisting[day] = [...(newMisting[day] || []), { p: name, n: note }];
      });
    }
    setPlantImages(newImages); setPlantList(newPlants); setSchedule(newSchedule); setMistingData(newMisting);
    savePlantData(newImages, newSchedule, newMisting, newPlants);
    setShowAdd(false);
  };

  const handleRemovePlant = (plantName) => {
    const newPlants   = plantList.filter(p => p.key !== plantName);
    const newImages   = { ...plantImages }; delete newImages[plantName];
    const newSchedule = schedule.map(d => ({ ...d, tasks: d.tasks.filter(t => t.plant !== plantName) }));
    const newMisting  = Object.fromEntries(Object.entries(mistingData).map(([day, arr]) => [day, arr.filter(m => m.p !== plantName)]));
    setPlantList(newPlants); setPlantImages(newImages); setSchedule(newSchedule); setMistingData(newMisting);
    savePlantData(newImages, newSchedule, newMisting, newPlants);
  };

  const totalWater  = schedule.reduce((s,d) => s + d.tasks.length, 0);
  const doneWater   = schedule.reduce((s,d) => s + d.tasks.filter((_,i) => (waterChecked[d.day]||{})[i]).length, 0);
  const totalMist   = ALL_DAYS.reduce((s,day) => s + (mistingData[day]||[]).length, 0);
  const doneMist    = ALL_DAYS.reduce((s,day) => s + (mistingData[day]||[]).filter((_,i) => (mistChecked[day]||{})[i]).length, 0);
  const doneAll     = doneWater + doneMist;
  const totalAll    = totalWater + totalMist;
  const allComplete = doneAll === totalAll && totalAll > 0;
  const getImg      = (name) => plantImages[name === "Monstera (x2)" ? "Monstera" : name] || null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a1a0f 0%,#0d2318 40%,#0a1a0f 100%)", fontFamily: "'Georgia','Times New Roman',serif", color: "#e8f5e9" }}>

      {showAdd && <AddPlantModal onClose={() => setShowAdd(false)} onAdd={handleAddPlant} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 100%)", borderBottom: "1px solid rgba(134,239,172,0.15)", padding: "1.5rem 1.5rem 1.2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>🌿</div>
        <h1 style={{ fontSize: "clamp(1.3rem,5vw,1.8rem)", fontWeight: "400", letterSpacing: "0.08em", color: "#86efac", margin: "0 0 0.5rem", textTransform: "uppercase" }}>Weekly Plant Care</h1>
        {imgRefreshing && <div style={{ fontSize: "0.68rem", color: "rgba(134,239,172,0.4)", marginBottom: "0.4rem" }}>🌿 Refreshing plant images...</div>}
        <div style={{ maxWidth: "280px", margin: "0 auto" }}>
          {[{ label: "Watering", done: doneWater, total: totalWater, color: "#4ade80" }, { label: "Misting", done: doneMist, total: totalMist, color: "#67e8f9" }].map(({ label, done, total, color }) => (
            <div key={label} style={{ marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "rgba(134,239,172,0.5)", marginBottom: "0.2rem" }}>
                <span>{label}</span><span>{done}/{total}</span>
              </div>
              <div style={{ height: "5px", background: "rgba(134,239,172,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${total ? (done/total)*100 : 0}%`, background: color, borderRadius: "3px", transition: "width 0.4s ease" }} />
              </div>
            </div>
          ))}
        </div>
        {doneAll > 0 && (
          <button onClick={resetAll} style={{ marginTop: "0.7rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "2rem", padding: "0.3rem 0.9rem", color: "rgba(252,165,165,0.8)", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit" }}>
            {allComplete ? "🎉 All done! Reset for next week" : "Reset week"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", padding: "1rem 1rem 0", justifyContent: "center", flexWrap: "wrap" }}>
        {[{ id: "schedule", label: "💧 Schedule" }, { id: "misting", label: "🌫️ Misting" }, { id: "plants", label: "🌿 My Plants" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "linear-gradient(135deg,#16a34a,#15803d)" : "rgba(255,255,255,0.04)",
            border: tab === t.id ? "1px solid #4ade80" : "1px solid rgba(134,239,172,0.15)",
            borderRadius: "2rem", padding: "0.45rem 1rem", color: tab === t.id ? "#fff" : "rgba(134,239,172,0.6)",
            cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.05em", fontFamily: "inherit", transition: "all 0.2s ease",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "1.2rem 1rem 2rem" }}>

        {/* ══ SCHEDULE ══ */}
        {tab === "schedule" && <>
          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
            {schedule.map((d, i) => {
              const complete  = isWaterDayComplete(d.day);
              const dc        = waterChecked[d.day] || {};
              const doneCount = d.tasks.filter((_,idx) => dc[idx]).length;
              const inProg    = doneCount > 0 && !complete;
              return (
                <button key={d.day} onClick={() => setActiveDay(i)} style={{
                  background: complete ? "linear-gradient(135deg,#15803d,#166534)" : activeDay === i ? "linear-gradient(135deg,#16a34a,#15803d)" : "rgba(255,255,255,0.04)",
                  border: (complete || activeDay === i) ? "1px solid #4ade80" : "1px solid rgba(134,239,172,0.15)",
                  borderRadius: "2rem", padding: "0.5rem 1.1rem", color: (complete || activeDay === i) ? "#fff" : "rgba(134,239,172,0.6)",
                  cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.08em", fontFamily: "inherit", transition: "all 0.2s ease",
                }}>
                  {complete ? "✓ " : ""}{d.day}{inProg && <span style={{ marginLeft: "0.3rem", fontSize: "0.65rem", color: "#fde68a" }}>({doneCount}/{d.tasks.length})</span>}
                </button>
              );
            })}
          </div>
          {(() => {
            const d = schedule[activeDay] || schedule[0];
            if (!d) return null;
            const complete  = isWaterDayComplete(d.day);
            const dc        = waterChecked[d.day] || {};
            const doneCount = d.tasks.filter((_,i) => dc[i]).length;
            return (
              <div style={{ background: complete ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${complete ? "#4ade80" : "rgba(134,239,172,0.12)"}`, borderRadius: "1rem", overflow: "hidden", marginBottom: "1rem", transition: "all 0.4s ease" }}>
                <div style={{ background: complete ? "linear-gradient(135deg,rgba(22,163,74,0.4),rgba(21,128,61,0.3))" : "linear-gradient(135deg,rgba(22,163,74,0.2),rgba(21,128,61,0.1))", padding: "0.9rem 1.2rem", borderBottom: "1px solid rgba(134,239,172,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "400", color: complete ? "#4ade80" : "#86efac" }}>{complete ? "✓ " : ""}{d.day}</h2>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "rgba(134,239,172,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{d.subtitle} · {doneCount}/{d.tasks.length} done</p>
                  </div>
                  {complete && <span style={{ fontSize: "1.5rem" }}>🎉</span>}
                </div>
                <div style={{ padding: "0.7rem" }}>
                  {d.tasks.map((task, i) => {
                    const s = typeColors[task.type] || typeColors.water;
                    const isChecked = !!(dc[i]);
                    return (
                      <div key={i} onClick={() => toggleWater(d.day, i)} style={{ display: "flex", gap: "0.7rem", padding: "0.75rem", marginBottom: i < d.tasks.length-1 ? "0.4rem" : 0, background: isChecked ? "rgba(22,163,74,0.08)" : "rgba(255,255,255,0.03)", borderRadius: "0.6rem", border: `1px solid ${isChecked ? "rgba(74,222,128,0.3)" : "rgba(134,239,172,0.08)"}`, alignItems: "center", cursor: "pointer", transition: "all 0.2s ease", opacity: isChecked ? 0.7 : 1 }}>
                        <Checkbox checked={isChecked} onChange={() => toggleWater(d.day, i)} />
                        <PlantImg src={getImg(task.plant)} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: "600", color: isChecked ? "#4ade80" : "#86efac", marginBottom: "0.2rem", textDecoration: isChecked ? "line-through" : "none" }}>{task.plant}</div>
                          <div style={{ fontSize: "0.74rem", color: isChecked ? "rgba(232,245,233,0.35)" : "rgba(232,245,233,0.6)", lineHeight: "1.4" }}>{task.action}</div>
                        </div>
                        <div style={{ fontSize: "0.62rem", background: s.bg, color: s.text, padding: "0.2rem 0.45rem", borderRadius: "1rem", fontFamily: "sans-serif", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0, fontWeight: "600" }}>{s.icon} {task.type}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(134,239,172,0.12)", borderRadius: "1rem", overflow: "hidden", marginBottom: "1rem" }}>
            <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(109,40,217,0.1))", padding: "0.75rem 1.2rem", borderBottom: "1px solid rgba(134,239,172,0.1)" }}>
              <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "400", color: "#d8b4fe", letterSpacing: "0.1em", textTransform: "uppercase" }}>Monthly Reminders</h3>
            </div>
            <div style={{ padding: "0.6rem" }}>
              {monthlyNote.map((note, i) => <div key={i} style={{ padding: "0.45rem 0.6rem", fontSize: "0.76rem", color: "rgba(232,245,233,0.6)", lineHeight: "1.4", borderBottom: i < monthlyNote.length-1 ? "1px solid rgba(134,239,172,0.06)" : "none" }}>{note}</div>)}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(134,239,172,0.08)", borderRadius: "1rem", padding: "0.9rem 1.1rem" }}>
            <h3 style={{ margin: "0 0 0.7rem", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(134,239,172,0.4)" }}>Golden Rules</h3>
            {["💧 Always use filtered water for Calathea, Maranta, Ferns & Spider Plant","🔥 Keep all plants away from radiators — especially Parlour Palm & Spider Plant","🌵 Jade & Echeveria: when in doubt, don't water","💦 Pebble trays benefit: Ferns, Calathea, Maranta, Asparagus Fern & Palm"].map((tip, i) => (
              <div key={i} style={{ fontSize: "0.76rem", color: "rgba(232,245,233,0.55)", padding: "0.28rem 0", lineHeight: "1.4" }}>{tip}</div>
            ))}
          </div>
        </>}

        {/* ══ MISTING ══ */}
        {tab === "misting" && <>
          <div style={{ background: "rgba(14,116,144,0.12)", border: "1px solid rgba(103,232,249,0.2)", borderRadius: "0.8rem", padding: "0.8rem 1rem", marginBottom: "1rem", fontSize: "0.76rem", color: "rgba(232,245,233,0.65)", lineHeight: "1.5" }}>
            🌫️ <strong style={{ color: "#67e8f9" }}>Daily misting guide</strong> — mist in the morning so leaves dry before evening. Resets every Monday.
          </div>
          {ALL_DAYS.map(day => {
            const plants    = mistingData[day] || [];
            const dc        = mistChecked[day] || {};
            const doneCount = plants.filter((_,i) => dc[i]).length;
            const complete  = isMistDayComplete(day);
            return (
              <div key={day} style={{ background: complete ? "rgba(6,78,59,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${complete ? "rgba(103,232,249,0.5)" : "rgba(134,239,172,0.1)"}`, borderRadius: "0.8rem", overflow: "hidden", marginBottom: "0.6rem", transition: "all 0.3s ease" }}>
                <div style={{ background: complete ? "rgba(6,148,162,0.3)" : "rgba(14,116,144,0.15)", padding: "0.6rem 1rem", borderBottom: plants.length ? "1px solid rgba(134,239,172,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", color: "#67e8f9", fontWeight: complete ? "600" : "400" }}>{complete ? "✓ " : ""}{day}</span>
                  <span style={{ fontSize: "0.7rem", color: complete ? "rgba(103,232,249,0.8)" : "rgba(103,232,249,0.5)" }}>{plants.length > 0 ? `${doneCount}/${plants.length}` : "no misting"}{complete && " 🎉"}</span>
                </div>
                {plants.length > 0 && (
                  <div style={{ padding: "0.4rem 0.6rem" }}>
                    {plants.map(({ p, n }, i) => {
                      const isChecked = !!(dc[i]);
                      return (
                        <div key={i} onClick={() => toggleMist(day, i)} style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.45rem 0.3rem", borderBottom: i < plants.length-1 ? "1px solid rgba(134,239,172,0.05)" : "none", cursor: "pointer", opacity: isChecked ? 0.6 : 1, transition: "opacity 0.2s ease" }}>
                          <Checkbox checked={isChecked} onChange={() => toggleMist(day, i)} />
                          <PlantImg src={getImg(p)} size={34} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.8rem", color: isChecked ? "#4ade80" : "#86efac", textDecoration: isChecked ? "line-through" : "none" }}>{p}</div>
                            <div style={{ fontSize: "0.7rem", color: "rgba(232,245,233,0.45)" }}>{n}</div>
                          </div>
                          <span style={{ fontSize: "1rem" }}>🌫️</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(134,239,172,0.08)", borderRadius: "0.8rem", padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", color: "rgba(134,239,172,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Never mist these</div>
            {["🚫 Variegated Rubber Plant — wipe leaves instead","🚫 Jade Plant — causes rot and spots","🚫 Echeveria — water sits in rosette and rots","🚫 Bird of Paradise — not needed","🚫 Basil — causes fungal disease"].map((note, i) => (
              <div key={i} style={{ fontSize: "0.76rem", color: "rgba(232,245,233,0.5)", padding: "0.25rem 0", lineHeight: "1.4" }}>{note}</div>
            ))}
          </div>
        </>}

        {/* ══ PLANTS ══ */}
        {tab === "plants" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
            <div style={{ fontSize: "0.72rem", color: "rgba(134,239,172,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Your collection · {plantList.length} plants {imgRefreshing && <span style={{ color: "rgba(134,239,172,0.3)" }}>· updating images...</span>}
            </div>
            <button onClick={() => setShowAdd(true)} style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: "2rem", padding: "0.4rem 0.9rem", color: "white", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit", fontWeight: "600" }}>+ Add Plant</button>
          </div>
          {plantList.map((plant, i) => (
            <div key={i} style={{ display: "flex", gap: "0.9rem", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(134,239,172,0.08)", borderRadius: "0.7rem", padding: "0.7rem", marginBottom: "0.5rem" }}>
              <PlantImg src={getImg(plant.key)} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#86efac", marginBottom: "0.15rem" }}>{plant.key}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(134,239,172,0.4)", fontStyle: "italic", marginBottom: "0.2rem" }}>{plant.latin}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(232,245,233,0.5)", lineHeight: "1.3" }}>{plant.note}</div>
              </div>
              <button onClick={() => handleRemovePlant(plant.key)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.4rem", padding: "0.3rem 0.5rem", color: "rgba(252,165,165,0.6)", cursor: "pointer", fontSize: "0.7rem", fontFamily: "inherit", flexShrink: 0 }}>Remove</button>
            </div>
          ))}
        </>}

      </div>
    </div>
  );
}