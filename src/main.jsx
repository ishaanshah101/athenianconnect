import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://thnkaqonmuxzxhybvhdh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobmthcW9ubXV4enhoeWJ2aGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTExOTAsImV4cCI6MjA5MTQyNzE5MH0.MARQ1AQAjoD80CNE-lmRzkcV2WEXMqOYpeSNwEpndZ8";

const db = {
  async query(table, method = "GET", body = null, extra = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${extra}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "Prefer": method === "POST" ? "return=representation" : "",
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },
  get: (table, query = "") => db.query(table, "GET", null, query),
  post: (table, body) => db.query(table, "POST", body),
  patch: (table, body, query) => db.query(table, "PATCH", body, query),
};

const C = {
  primary: "#C8603A", primaryLight: "#F5DDD6", primaryDark: "#A04828",
  black: "#1A1A1A", bg: "#FDFAF8", card: "#FFFFFF", text: "#1C1917",
  muted: "#6B6460", border: "#E5E0DC", borderWarm: "#E8C9BC",
  success: "#16A34A", danger: "#DC2626", subtle: "#F5F0ED", gold: "#C8A84B",
};

const ADMIN_EMAIL = "29IShah@athenian.org";

const ATHENIAN_CONTEXT = `
The Athenian School is a co-ed, college-prep boarding and day school in Danville, CA (grades 6-12),
founded in 1965 by Dyke Brown on a 75-acre campus at the base of Mt. Diablo. ~528 students, 8:1 student-teacher ratio, average class size of 15.
School colors: terra cotta and black.
Key Athenian experiences:
- AWE (Athenian Wilderness Experience): Required 26-day backpacking trip junior year in the High Sierras or Death Valley. Ends with Run-In where students run the final 8 miles back to campus. The Run-In gate reads: "There's more in you than you know" - Kurt Hahn.
- March Term: Two-week immersive mini-course. Travel options include Guatemala, Japan, Greece, France, and local Bay Area.
- Town Meeting: Student governance tradition.
- Carter Innovation Studio: 5,200 sq ft on-campus makerspace.
- Round Square: Athenian is a founding member - international school network, 200 schools worldwide.
- Acropolis Robotics: Team 852 in FIRST Robotics Competition.
- AP culture: Academically intense - 94% of students scored 3+ on APs in 2024.
- Top colleges: Berkeley, UCLA, Cornell, UPenn, USC, Chicago, NYU, Dartmouth, Stanford.
- Sports: 13 interscholastic sports including ultimate frisbee.
`;

const STRUGGLES = [
  "AP/academic stress","AWE prep anxiety","College app pressure","Social anxiety",
  "Making friends","Time management","New to Athenian","Family pressure",
  "Motivation & burnout","Boarding life adjustment","March Term nerves","Town Meeting / leadership stress",
];
const CATEGORIES = ["General","Academic","Social","College","Mental Health","AWE & Wilderness","March Term","Advice","Off-Topic"];
const GRADES = ["6th","7th","8th","9th","10th","11th","12th"];

const BUDDIES = [
  { name: "Alex M.", grade: "12th", struggles: ["AP/academic stress","College app pressure","Time management"], bio: "I survived junior year AP load and AWE in the same semester. Happy to talk through whatever's weighing on you." },
  { name: "Jordan L.", grade: "11th", struggles: ["Social anxiety","Making friends","New to Athenian"], bio: "Transferred here in 9th grade not knowing a single person. I know what it feels like to be the new one." },
  { name: "Sam K.", grade: "12th", struggles: ["Time management","Motivation & burnout","AP/academic stress"], bio: "Reformed procrastinator who figured out how to manage Athenian's workload without completely losing it." },
  { name: "Riley T.", grade: "11th", struggles: ["Family pressure","College app pressure","AP/academic stress"], bio: "High expectations at home and an Athenian course load are a lot to carry. I've learned how to manage both." },
  { name: "Zoe H.", grade: "12th", struggles: ["AWE prep anxiety","Boarding life adjustment","Social anxiety"], bio: "Was terrified before AWE. It ended up being the best 26 days of my life. Also navigated boarding freshman year." },
];

const AZURE = {
  clientId: "6762fbfe-3f29-4acd-9eae-f92f861d63ef",
  tenantId: "29105eb0-c67f-4fc2-9afe-c48e0f334f86",
  redirectUri: window.location.origin,
};

function getMicrosoftAuthUrl() {
  const params = new URLSearchParams({
    client_id: AZURE.clientId, response_type: "id_token token",
    redirect_uri: AZURE.redirectUri, scope: "openid profile email User.Read",
    response_mode: "fragment", nonce: crypto.randomUUID(), domain_hint: "athenian.org",
  });
  return `https://login.microsoftonline.com/${AZURE.tenantId}/oauth2/v2.0/authorize?${params}`;
}

function parseTokenFromHash() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const idToken = params.get("id_token");
  if (!idToken) return null;
  try {
    const p = JSON.parse(atob(idToken.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
    if (!p.email?.endsWith("@athenian.org") && !p.preferred_username?.endsWith("@athenian.org")) return null;
    return { name: p.name || p.preferred_username, email: p.email || p.preferred_username, grade: "9th" };
  } catch { return null; }
}

async function moderateContent(text) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 100,
        system: `Content moderator for a high school wellness platform. Respond ONLY with JSON: {"safe":true} or {"safe":false,"reason":"brief reason"}. Flag: self-harm, suicide, bullying, hate speech, sexual content, personal identifying info, threats. Normal stress/anxiety/academic/AWE discussion is SAFE.`,
        messages: [{ role: "user", content: `Moderate: "${text}"` }]
      })
    });
    const data = await res.json();
    return JSON.parse((data.content?.[0]?.text || '{"safe":true}').replace(/```json|```/g,"").trim());
  } catch { return { safe: true }; }
}

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("id_token")) {
      setLoading(true);
      const user = parseTokenFromHash();
      window.location.hash = "";
      if (user) handleUserLogin(user);
      else { setError("Sign-in failed. Use your @athenian.org account."); setLoading(false); }
    }
  }, []);

  const handleUserLogin = async (user) => {
    try {
      const existing = await db.get("registered_users", `?email=eq.${encodeURIComponent(user.email)}`);
      if (existing.length > 0 && existing[0].deleted) {
        setError("This account has been deleted. Contact 29IShah@athenian.org to restore access.");
        setLoading(false); return;
      }
      if (existing.length === 0) {
        await db.post("registered_users", { email: user.email, name: user.name, grade: user.grade, deleted: false });
      }
      onLogin(user);
    } catch { onLogin(user); }
  };

  const handleSignIn = () => {
    setLoading(true);
    window.location.href = getMicrosoftAuthUrl();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0EBE7", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", width: "100%", maxWidth: 400, overflow: "hidden" }}>
        <div style={{ background: C.primary, padding: "30px 32px 24px", textAlign: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: -0.3 }}>AthenianConnect</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 3 }}>The Athenian School · Danville, CA · Est. 1965</div>
        </div>
        <div style={{ padding: "28px 32px 32px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Sign in to continue</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 26, lineHeight: 1.6 }}>
            AthenianConnect uses your school Microsoft account. Only @athenian.org accounts are permitted.
          </p>
          <button onClick={handleSignIn} disabled={loading} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            background: "#fff", color: C.text, border: `1.5px solid ${C.border}`, borderRadius: 8,
            padding: "12px 16px", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            {loading ? "Signing in..." : "Sign in with Microsoft"}
          </button>
          {error && <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 13px", fontSize: 13, color: C.danger }}>{error}</div>}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 22, paddingTop: 18 }}>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: 0 }}>Only <strong>@athenian.org</strong> accounts are permitted.</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Need help? <span style={{ color: C.primary, fontWeight: 600 }}>29IShah@athenian.org</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Nav({ page, setPage, user, onLogout }) {
  const isAdmin = user.email === ADMIN_EMAIL;
  const tabs = [
    { id: "home", label: "Home" }, { id: "intake", label: "Get Support" },
    { id: "buddy", label: "Be a Buddy" }, { id: "forum", label: "Community" },
    { id: "chat", label: "Talk to Someone" },
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];
  return (
    <nav style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <span style={{ color: C.primary, fontWeight: 900, fontSize: 18, cursor: "pointer", padding: "16px 0", whiteSpace: "nowrap" }} onClick={() => setPage("home")}>AthenianConnect</span>
      <div style={{ display: "flex", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setPage(t.id)} style={{
            background: "none", color: page === t.id ? C.primary : C.muted,
            border: "none", borderBottom: page === t.id ? `2.5px solid ${C.primary}` : "2.5px solid transparent",
            padding: "16px 12px", fontWeight: page === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user.name.split(" ")[0]}</div>
          {isAdmin && <div style={{ fontSize: 10, fontWeight: 700, color: C.primary, textTransform: "uppercase" }}>Admin</div>}
        </div>
        <button onClick={onLogout} style={{ background: C.subtle, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: C.muted, cursor: "pointer" }}>Sign out</button>
      </div>
    </nav>
  );
}

function Home({ setPage, user }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 20px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 10 }}>Welcome, {user.name.split(" ")[0]}.</h1>
      <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, maxWidth: 560, marginBottom: 36 }}>
        AthenianConnect is a peer support platform built for Athenian students — to find guidance, share honestly, and feel less alone in whatever you're navigating.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
        {[
          { title: "I need support and want a buddy", sub: "Get matched with an older student who's been where you are.", cta: "Get Support", page: "intake", color: C.primary },
          { title: "I want to talk to the community", sub: "Post anonymously or openly — AWE fears, AP stress, or anything else.", cta: "Open Community", page: "forum", color: "#7C3AED" },
          { title: "I want to support others as a buddy", sub: "Volunteer to be matched with students who share your experiences.", cta: "Become a Buddy", page: "buddy", color: C.success },
          { title: "I just need to talk right now", sub: "Chat with a peer support presence, anytime. Private and immediate.", cta: "Start Chatting", page: "chat", color: "#0369A1" },
        ].map(c => (
          <div key={c.page} onClick={() => setPage(c.page)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.09)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>{c.sub}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.cta} →</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.primaryLight, borderRadius: 14, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.primaryDark, marginBottom: 6 }}>About this platform</div>
        <p style={{ fontSize: 13, color: C.primaryDark, lineHeight: 1.7, margin: 0 }}>
          AthenianConnect is a student-built peer wellness initiative piloting at The Athenian School in Danville, CA.
          Everything shared stays within the Athenian community. If you're in crisis, please reach out to a counselor or call/text <strong>988</strong>.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[{ label: "Founded", val: "1965" }, { label: "Students", val: "~528" }, { label: "Class Size", val: "~15" }, { label: "Student:Teacher", val: "8:1" }].map(f => (
          <div key={f.label} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{f.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Intake({ setPage, setMatchData, user }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ grade: "", struggles: [], note: "" });
  const [match, setMatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const toggle = s => setForm(f => ({ ...f, struggles: f.struggles.includes(s) ? f.struggles.filter(x => x !== s) : [...f.struggles, s] }));

  const findMatch = async () => {
    const scored = BUDDIES.map(b => ({ ...b, score: b.struggles.filter(s => form.struggles.includes(s)).length })).sort((a, b) => b.score - a.score);
    const best = scored[0];
    setMatch(best); setMatchData(best); setSaving(true);
    try { await db.post("intakes", { user_email: user.email, grade: form.grade, struggles: form.struggles, note: form.note, matched: true, buddy_name: best.name }); }
    catch (e) { console.error(e); }
    setSaving(false); setStep(3);
  };

  if (step === 3 && match) return (
    <div style={{ maxWidth: 520, margin: "44px auto", padding: 20 }}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 30 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 6 }}>You've been matched.</div>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>Based on what you shared, here's your peer buddy.</p>
        <div style={{ background: C.subtle, borderRadius: 12, padding: 20, marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: C.primaryDark }}>{match.name.charAt(0)}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{match.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{match.grade} Grade · Peer Buddy</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: C.text, fontStyle: "italic", lineHeight: 1.6, marginBottom: 14 }}>"{match.bio}"</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {match.struggles.map(s => <span key={s} style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{s}</span>)}
          </div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>A school counselor will facilitate your first connection within 48 hours via your Athenian email.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setPage("chat")} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Talk to someone now</button>
          <button onClick={() => { setStep(0); setForm({ grade: "", struggles: [], note: "" }); setMatch(null); }} style={{ background: C.subtle, color: C.muted, border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 600, cursor: "pointer" }}>Start over</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: "44px auto", padding: 20 }}>
      <h2 style={{ fontWeight: 800, fontSize: 24, color: C.text, marginBottom: 6 }}>Get peer support</h2>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginBottom: 26 }}>We'll match you with an older Athenian student who's been through something similar.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 30 }}>
        {["Your grade","What you're navigating","Anything else"].map((l, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 4, background: i <= step ? C.primary : C.border, marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: i <= step ? C.primary : C.muted, fontWeight: i === step ? 700 : 400 }}>{l}</div>
          </div>
        ))}
      </div>
      {step === 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>What grade are you in?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRADES.map(g => (
              <button key={g} onClick={() => { setForm(f => ({ ...f, grade: g })); setStep(1); }}
                style={{ background: form.grade === g ? C.primary : "#fff", color: form.grade === g ? "#fff" : C.text, border: `2px solid ${form.grade === g ? C.primary : C.border}`, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>What are you navigating right now?</div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Select everything that applies. This is completely private.</p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 22 }}>
            {STRUGGLES.map(s => (
              <button key={s} onClick={() => toggle(s)}
                style={{ background: form.struggles.includes(s) ? C.primaryLight : "#fff", color: form.struggles.includes(s) ? C.primaryDark : C.text, border: `1.5px solid ${form.struggles.includes(s) ? C.primary : C.border}`, borderRadius: 20, padding: "7px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} disabled={!form.struggles.length} style={{ background: form.struggles.length ? C.primary : C.border, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, cursor: form.struggles.length ? "pointer" : "not-allowed" }}>Continue</button>
            <button onClick={() => setStep(0)} style={{ background: C.subtle, color: C.muted, border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 600, cursor: "pointer" }}>Back</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>Anything you'd like your buddy to know?</div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Optional. Still completely anonymous.</p>
          <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="For example: I'm a junior terrified about AWE coming up while also trying to stay on top of APs..."
            style={{ width: "100%", minHeight: 100, borderRadius: 10, border: `1.5px solid ${C.border}`, padding: 14, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={findMatch} disabled={saving} style={{ background: saving ? C.border : C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "Find my buddy"}</button>
            <button onClick={() => setStep(1)} style={{ background: C.subtle, color: C.muted, border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 600, cursor: "pointer" }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BuddySignup({ user }) {
  const [form, setForm] = useState({ name: "", grade: "", struggles: [], bio: "" });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const toggle = s => setForm(f => ({ ...f, struggles: f.struggles.includes(s) ? f.struggles.filter(x => x !== s) : [...f.struggles, s] }));

  const submit = async () => {
    setSaving(true);
    try { await db.post("buddies", { user_email: user.email, name: form.name, grade: form.grade, struggles: form.struggles, bio: form.bio }); }
    catch (e) { console.error(e); }
    setSaving(false); setDone(true);
  };

  if (done) return (
    <div style={{ maxWidth: 500, margin: "80px auto", padding: 20 }}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 36, textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 10 }}>You're in.</div>
        <p style={{ color: C.muted, lineHeight: 1.7, fontSize: 14 }}>You've been added to the buddy pool. Thank you for showing up for your community.</p>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 14, fontStyle: "italic" }}>"There is more in you than you know." — Kurt Hahn</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "44px auto", padding: 20 }}>
      <h2 style={{ fontWeight: 800, fontSize: 24, color: C.text, marginBottom: 6 }}>Become a peer buddy</h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 26, lineHeight: 1.7 }}>Juniors and seniors can volunteer to support younger students. You're not a counselor — you're a peer who gets it.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13, color: C.text, display: "block", marginBottom: 6 }}>Your first name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First name"
            style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13, color: C.text, display: "block", marginBottom: 8 }}>Grade</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["11th","12th"].map(g => (
              <button key={g} onClick={() => setForm(f => ({ ...f, grade: g }))}
                style={{ background: form.grade === g ? C.primary : "#fff", color: form.grade === g ? "#fff" : C.text, border: `2px solid ${form.grade === g ? C.primary : C.border}`, borderRadius: 10, padding: "9px 22px", fontWeight: 700, cursor: "pointer" }}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13, color: C.text, display: "block", marginBottom: 8 }}>Areas where you can offer support</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STRUGGLES.map(s => (
              <button key={s} onClick={() => toggle(s)}
                style={{ background: form.struggles.includes(s) ? C.primaryLight : "#fff", color: form.struggles.includes(s) ? C.primaryDark : C.text, border: `1.5px solid ${form.struggles.includes(s) ? C.primary : C.border}`, borderRadius: 20, padding: "6px 13px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13, color: C.text, display: "block", marginBottom: 6 }}>Bio for your profile</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="What have you navigated at Athenian that you wish someone had helped you through?"
            style={{ width: "100%", minHeight: 90, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={submit} disabled={!form.name || !form.grade || !form.struggles.length || !form.bio || saving}
          style={{ background: form.name && form.grade && form.struggles.length && form.bio && !saving ? C.primary : C.border, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
          {saving ? "Saving..." : "Join as a peer buddy"}
        </button>
      </div>
    </div>
  );
}

function Forum({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "General", showIdentity: false });
  const [replyText, setReplyText] = useState("");
  const [replyAnon, setReplyAnon] = useState(true);
  const [moderating, setModerating] = useState(false);
  const [filterCat, setFilterCat] = useState("All");

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoading(true);
    try { setPosts(await db.get("posts", "?order=created_at.desc")); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  const openPost = async (post) => {
    setActivePost(post);
    try { setReplies(await db.get("replies", `?post_id=eq.${post.id}&order=created_at.asc`)); }
    catch (e) { console.error(e); }
  };

  const submitPost = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setModerating(true);
    const result = await moderateContent(form.title + " " + form.body);
    setModerating(false);
    if (!result.safe) { alert(`Post flagged: ${result.reason}\n\nIf you're going through something serious, please reach out to a counselor or call/text 988.`); return; }
    try {
      const saved = await db.post("posts", { user_email: user.email, title: form.title, body: form.body, category: form.category, show_identity: form.showIdentity, display_name: form.showIdentity ? user.name : "Anonymous", grade: user.grade });
      setPosts(p => [saved[0], ...p]);
      setForm({ title: "", body: "", category: "General", showIdentity: false });
      setComposing(false);
      openPost(saved[0]);
    } catch (e) { alert("Failed to save post. Try again."); }
  };

  const submitReply = async () => {
    if (!replyText.trim() || !activePost) return;
    setModerating(true);
    const result = await moderateContent(replyText);
    setModerating(false);
    if (!result.safe) { alert(`Reply flagged: ${result.reason}`); setReplyText(""); return; }
    try {
      const saved = await db.post("replies", { post_id: activePost.id, user_email: user.email, text: replyText, show_identity: !replyAnon, display_name: replyAnon ? "Anonymous" : user.name, grade: user.grade });
      setReplies(r => [...r, saved[0]]);
      setReplyText("");
    } catch (e) { alert("Failed to save reply."); }
  };

  const timeAgo = (ts) => {
    const d = (Date.now() - new Date(ts)) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return `${Math.floor(d/86400)}d ago`;
  };

  const filtered = filterCat === "All" ? posts : posts.filter(p => p.category === filterCat);

  if (activePost) return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 20px" }}>
      <button onClick={() => { setActivePost(null); setReplies([]); }} style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", marginBottom: 18, fontSize: 14 }}>← Back</button>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{activePost.category}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{timeAgo(activePost.created_at)}</span>
        </div>
        <h2 style={{ fontWeight: 800, fontSize: 19, color: C.text, marginBottom: 10 }}>{activePost.title}</h2>
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.75, marginBottom: 14 }}>{activePost.body}</p>
        <div style={{ fontSize: 13, color: C.muted }}>{activePost.show_identity ? <strong style={{ color: C.text }}>{activePost.display_name}</strong> : "Anonymous"} · {activePost.grade} grade</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 10 }}>{replies.length} {replies.length === 1 ? "reply" : "replies"}</div>
      {replies.map(r => (
        <div key={r.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 7 }}>{r.show_identity ? <strong style={{ color: C.text }}>{r.display_name}</strong> : "Anonymous"} · {r.grade} grade · {timeAgo(r.created_at)}</div>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: 0 }}>{r.text}</p>
        </div>
      ))}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 14 }}>
        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..."
          style={{ width: "100%", minHeight: 80, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={!replyAnon} onChange={e => setReplyAnon(!e.target.checked)} />
            Post as {user.name}
          </label>
          <button onClick={submitReply} disabled={!replyText.trim() || moderating}
            style={{ background: replyText.trim() && !moderating ? C.primary : C.border, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            {moderating ? "Reviewing..." : "Post reply"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "22px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 4 }}>Student Community</h2>
          <p style={{ fontSize: 13, color: C.muted, maxWidth: 440 }}>Share, vent, ask questions, and feel heard. Post as yourself or stay anonymous.</p>
        </div>
        <button onClick={() => setComposing(true)} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>New post</button>
      </div>
      {composing && (
        <div style={{ background: "#fff", border: `1.5px solid ${C.primary}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>Create a post</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title..."
              style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 13px", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="What's on your mind?"
              style={{ minHeight: 100, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 13px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff" }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.muted, cursor: "pointer" }}>
                <input type="checkbox" checked={form.showIdentity} onChange={e => setForm(f => ({ ...f, showIdentity: e.target.checked }))} />
                Post as {user.name}
              </label>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button onClick={() => setComposing(false)} style={{ background: C.subtle, color: C.muted, border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={submitPost} disabled={!form.title.trim() || !form.body.trim() || moderating}
                  style={{ background: form.title.trim() && form.body.trim() && !moderating ? C.primary : C.border, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {moderating ? "Reviewing..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 18 }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            style={{ background: filterCat === c ? C.primary : "#fff", color: filterCat === c ? "#fff" : C.muted, border: `1px solid ${filterCat === c ? C.primary : C.border}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: filterCat === c ? 700 : 500, cursor: "pointer" }}>
            {c}
          </button>
        ))}
      </div>
      {loading ? <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>Loading posts...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>No posts yet. Be the first to share.</div>}
          {filtered.map(p => (
            <div key={p.id} onClick={() => openPost(p)} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                <span style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{p.category}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{timeAgo(p.created_at)}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 5 }}>{p.title}</div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.body}</p>
              <div style={{ fontSize: 12, color: C.muted }}>{p.show_identity ? <strong style={{ color: C.text }}>{p.display_name}</strong> : "Anonymous"} · {p.grade} grade</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chat({ user }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", text: `Hey ${user.name.split(" ")[0]} — I'm here to listen. This is a private space. What's been on your mind lately?` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a warm peer support presence for AthenianConnect at The Athenian School in Danville, CA. Speaking with ${user.name}, a ${user.grade} grade student. You are a trusted older peer — warm, real, not clinical.\n\n${ATHENIAN_CONTEXT}\n\nGuidelines: 2-4 sentences. Conversational. Validate before advising. Reference Athenian specifics naturally. Crisis: direct to school counselor or 988.`,
          messages: [...msgs, { role: "user", text: userMsg }].map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }))
        })
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: "assistant", text: data.content?.[0]?.text || "I'm here. Can you tell me more?" }]);
    } catch { setMsgs(m => [...m, { role: "assistant", text: "Something went wrong. Try again in a moment." }]); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 57px)" }}>
      <div style={{ padding: "13px 20px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Peer Support Chat</div>
        <div style={{ fontSize: 12, color: C.muted }}>Private · Available anytime · Responses are not stored</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 11, background: C.bg }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "78%", background: m.role === "user" ? C.primary : "#fff", color: m.role === "user" ? "#fff" : C.text, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", fontSize: 14, lineHeight: 1.65, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: m.role === "assistant" ? `1px solid ${C.border}` : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: "18px 18px 18px 4px", padding: "11px 18px", fontSize: 14, color: C.muted, fontStyle: "italic" }}>typing...</div></div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 16px", background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="What's going on for you right now?"
          style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 24, padding: "10px 16px", fontSize: 14, fontFamily: "inherit", outline: "none", color: C.text }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ background: input.trim() && !loading ? C.primary : C.border, color: "#fff", border: "none", borderRadius: 24, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          Send
        </button>
      </div>
    </div>
  );
}

function Admin({ user }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user.email !== ADMIN_EMAIL) return (
    <div style={{ maxWidth: 500, margin: "80px auto", padding: 20, textAlign: "center" }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: C.danger, marginBottom: 10 }}>Access Denied</div>
      <p style={{ color: C.muted }}>This page is only accessible to the platform administrator.</p>
    </div>
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, i, b, p] = await Promise.all([
          db.get("registered_users", "?order=registered_at.desc"),
          db.get("intakes", "?order=created_at.desc"),
          db.get("buddies", "?order=created_at.desc"),
          db.get("posts", "?order=created_at.desc"),
        ]);
        setUsers(u); setIntakes(i); setBuddies(b); setPosts(p);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const deleteUser = async (email) => {
    if (!confirm(`Mark ${email} as deleted?`)) return;
    await db.patch("registered_users", { deleted: true }, `?email=eq.${encodeURIComponent(email)}`);
    setUsers(u => u.map(x => x.email === email ? { ...x, deleted: true } : x));
  };

  const restoreUser = async (email) => {
    await db.patch("registered_users", { deleted: false }, `?email=eq.${encodeURIComponent(email)}`);
    setUsers(u => u.map(x => x.email === email ? { ...x, deleted: false } : x));
  };

  return (
    <div style={{ maxWidth: 760, margin: "28px auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: C.text }}>Admin Dashboard</h2>
        <span style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>Ishaan Shah only</span>
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Live data from Supabase. Only visible to you.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
        {[{ label: "Registered Users", val: users.length }, { label: "Intakes", val: intakes.length }, { label: "Peer Buddies", val: buddies.length }, { label: "Community Posts", val: posts.length }].map(c => (
          <div key={c.label} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: C.text }}>{c.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
        {["users","intakes","buddies","posts"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? `2.5px solid ${C.primary}` : "2.5px solid transparent", color: tab === t ? C.primary : C.muted, padding: "10px 16px", fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      {loading ? <div style={{ color: C.muted }}>Loading...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tab === "users" && users.map(u => (
            <div key={u.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: u.deleted ? C.muted : C.text, textDecoration: u.deleted ? "line-through" : "none" }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.email} · {new Date(u.registered_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ background: u.deleted ? "#FEF2F2" : "#F0FDF4", color: u.deleted ? C.danger : C.success, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{u.deleted ? "Deleted" : "Active"}</span>
                {u.deleted
                  ? <button onClick={() => restoreUser(u.email)} style={{ background: C.subtle, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.success }}>Restore</button>
                  : <button onClick={() => deleteUser(u.email)} style={{ background: C.subtle, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.danger }}>Delete</button>
                }
              </div>
            </div>
          ))}
          {tab === "intakes" && intakes.map(i => (
            <div key={i.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{i.user_email} · {i.grade}</span>
                <span style={{ background: i.matched ? "#F0FDF4" : "#FEF9C3", color: i.matched ? C.success : "#92400E", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{i.matched ? `Matched: ${i.buddy_name}` : "Pending"}</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {(i.struggles || []).map(s => <span key={s} style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{s}</span>)}
              </div>
              {i.note && <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic", marginTop: 6 }}>"{i.note}"</div>}
            </div>
          ))}
          {tab === "buddies" && buddies.map(b => (
            <div key={b.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>{b.name} · {b.grade} · {b.user_email}</div>
              <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic", marginBottom: 6 }}>"{b.bio}"</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {(b.struggles || []).map(s => <span key={s} style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{s}</span>)}
              </div>
            </div>
          ))}
          {tab === "posts" && posts.map(p => (
            <div key={p.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.title}</span>
                <span style={{ background: C.primaryLight, color: C.primaryDark, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{p.category}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{p.show_identity ? p.display_name : "Anonymous"} · {p.grade} · {p.user_email}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{p.body?.substring(0,120)}{p.body?.length > 120 ? "..." : ""}</div>
            </div>
          ))}
          {tab !== "users" && eval(`${tab === "intakes" ? "intakes" : tab === "buddies" ? "buddies" : "posts"}`).length === 0 && (
            <div style={{ color: C.muted, fontSize: 14 }}>No data yet.</div>
          )}
        </div>
      )}
      <p style={{ marginTop: 20, fontSize: 11, color: C.muted }}>Platform built and maintained by Ishaan Shah '29 · AthenianConnect · The Athenian School</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [matchData, setMatchData] = useState(null);

  if (!user) return <Login onLogin={u => setUser(u)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Nav page={page} setPage={setPage} user={user} onLogout={() => { setUser(null); setPage("home"); }} />
      {page === "home"   && <Home setPage={setPage} user={user} />}
      {page === "intake" && <Intake setPage={setPage} setMatchData={setMatchData} user={user} />}
      {page === "buddy"  && <BuddySignup user={user} />}
      {page === "forum"  && <Forum user={user} />}
      {page === "chat"   && <Chat user={user} />}
      {page === "admin"  && <Admin user={user} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
