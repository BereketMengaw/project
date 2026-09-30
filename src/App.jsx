import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase, demoData, loadAll, updateProgram, addProgram, deleteProgram, setTaskDone, addTask } from "./data.js";

const STATUSES = ["watch", "preparing", "applied", "submitted", "interview", "accepted", "rejected", "skip"];
const STATUS_LABEL = { watch: "Watching", preparing: "Preparing", applied: "Applied", submitted: "Submitted", interview: "Interview", accepted: "Accepted", rejected: "Rejected", skip: "Skipped" };
const KIND_LABEL = { scholarship: "Scholarship", funded: "Funded MS/PhD", "self-funded": "Self-funded" };
const ELIG_LABEL = { yes: "Eligible", borderline: "Borderline", no: "Not eligible" };
const DAY = 86400000;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysLeft = iso => (iso ? Math.round((new Date(iso + "T00:00:00") - today()) / DAY) : null);
const fmtDate = iso => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const slug = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "program";
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const errText = e => (e && e.message) || "Something went wrong. Try again.";

function Pill({ kind, children }) {
  return <span className={"pill p-" + (kind || "none")}>{children}</span>;
}

function Deadline({ p }) {
  const n = daysLeft(p.deadline);
  if (!p.deadline) return <div className="dl"><span className="muted">{p.deadlineText ? "Not fixed" : "—"}</span></div>;
  return (
    <div className="dl">
      {fmtDate(p.deadline)}
      <span className="est">{n < 0 ? "passed" : n === 0 ? "today" : n + " days"}{p.deadlineEstimated ? " · est." : ""}</span>
    </div>
  );
}

function Detail({ p, readOnly, onSaved, onClose }) {
  const initial = { status: p.status || "watch", notes: p.notes || "", deadline: p.deadline || "", deadlineEstimated: !!p.deadlineEstimated };
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  async function save() {
    setSaving(true); setMsg("");
    try { await updateProgram(p.id, draft); setMsg("Saved"); onSaved(); } catch (e) { setMsg(errText(e)); }
    setSaving(false);
  }
  async function remove() {
    try { await deleteProgram(p.id); onSaved(); onClose(); } catch (e) { setMsg(errText(e)); }
  }
  const info = [
    ["Funding / cost", p.funding], ["Deadline as published", p.deadlineText], ["Eligibility", p.eligibilityNote],
    ["Fit", p.fitNote], ["Discounts", p.discounts], ["Found in", p.section],
  ].filter(([, v]) => v && v !== "–");
  const href = p.url ? (p.url.startsWith("http") ? p.url : /\./.test(p.url) ? "https://" + p.url.split(" ")[0] : null) : null;

  return (
    <div className="detail">
      <div className="grid">
        {info.map(([k, v]) => <div key={k}><div className="label">{k}</div><p>{v}</p></div>)}
        {p.url && <div><div className="label">Official page</div><p>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{p.url}</a> : p.url}</p></div>}
      </div>
      {readOnly ? (
        p.notes ? <div><div className="label">Notes</div><p>{p.notes}</p></div> : null
      ) : (
        <>
          <div className="grid">
            <div className="field">
              <label className="label" htmlFor={"st-" + p.id}>Status</label>
              <select id={"st-" + p.id} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor={"dl-" + p.id}>Deadline</label>
              <input id={"dl-" + p.id} type="date" value={draft.deadline} onChange={e => setDraft({ ...draft, deadline: e.target.value, deadlineEstimated: false })} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={"nt-" + p.id}>Notes</label>
            <textarea id={"nt-" + p.id} value={draft.notes} placeholder="Application number, contact person, what's left to do…" onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div className="actions">
            <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
            <button className="btn" onClick={onClose}>Close</button>
            <span className="muted">{msg}</span>
            <span style={{ flex: 1 }} />
            {confirmDel ? (
              <>
                <span className="muted">Remove this program?</span>
                <button className="btn" onClick={remove}>Yes, remove</button>
                <button className="btn" onClick={() => setConfirmDel(false)}>Keep</button>
              </>
            ) : <button className="btn" onClick={() => setConfirmDel(true)}>Remove</button>}
          </div>
        </>
      )}
    </div>
  );
}

function AddForm({ onDone, onSaved }) {
  const blank = { name: "", host: "", kind: "scholarship", funding: "", deadline: "", url: "", eligibility: "yes", notes: "" };
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState("");
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) { setMsg("Give the program a name."); return; }
    const id = slug(f.name + "-" + f.host) + "-" + Date.now().toString(36);
    try {
      await addProgram(id, { ...f, deadlineText: f.deadline ? fmtDate(f.deadline) : "", deadlineEstimated: false, fit: "", status: "watch", section: "Added by hand" });
      setF(blank); onSaved(); onDone();
    } catch (err) { setMsg(errText(err)); }
  }
  return (
    <form className="form" onSubmit={submit}>
      <h2>Add a program</h2>
      <div className="grid-form">
        <div className="field"><label className="label" htmlFor="af-name">Program</label><input id="af-name" value={f.name} onChange={set("name")} placeholder="MSc Civil Engineering" /></div>
        <div className="field"><label className="label" htmlFor="af-host">University, country</label><input id="af-host" value={f.host} onChange={set("host")} placeholder="TU Graz, Austria" /></div>
        <div className="field"><label className="label" htmlFor="af-kind">Type</label><select id="af-kind" value={f.kind} onChange={set("kind")}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="af-fund">Funding / tuition</label><input id="af-fund" value={f.funding} onChange={set("funding")} placeholder="Full ride, or €3,000/yr" /></div>
        <div className="field"><label className="label" htmlFor="af-dl">Deadline</label><input id="af-dl" type="date" value={f.deadline} onChange={set("deadline")} /></div>
        <div className="field"><label className="label" htmlFor="af-el">Eligible?</label><select id="af-el" value={f.eligibility} onChange={set("eligibility")}>{Object.entries(ELIG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor="af-url">Official page</label><input id="af-url" value={f.url} onChange={set("url")} placeholder="https://…" /></div>
      </div>
      <div className="field"><label className="label" htmlFor="af-notes">Notes</label><textarea id="af-notes" value={f.notes} onChange={set("notes")} /></div>
      <div className="actions">
        <button className="btn primary" type="submit">Add program</button>
        <button className="btn" type="button" onClick={onDone}>Cancel</button>
        <span className="muted">{msg}</span>
      </div>
    </form>
  );
}

function Todos({ tasks, readOnly, onSaved }) {
  const [text, setText] = useState("");
  const [local, setLocal] = useState(tasks);
  useEffect(() => setLocal(tasks), [tasks]);
  const list = local.slice().sort((a, b) => (a.done - b.done) || ((a.sort ?? 99) - (b.sort ?? 99)));
  async function toggle(t) {
    setLocal(local.map(x => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try { await setTaskDone(t.id, !t.done); onSaved(); } catch { setLocal(tasks); }
  }
  async function add(e) {
    e.preventDefault();
    const v = text.trim(); if (!v) return;
    try { await addTask("t-" + Date.now().toString(36), v); setText(""); onSaved(); } catch {}
  }
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Before you apply</h2><span className="label">{list.filter(t => !t.done).length} open</span>
      </div>
      {list.length === 0 ? <p className="muted">No tasks yet. Add the first one below.</p> : (
        <div className="todo">
          {list.map(t => (
            <label key={t.id} className={t.done ? "done" : ""}>
              <input type="checkbox" checked={!!t.done} disabled={readOnly} onChange={() => toggle(t)} /><span>{t.title}</span>
            </label>
          ))}
        </div>
      )}
      {!readOnly && (
        <form className="addtodo" onSubmit={add}>
          <input id="todo-new" value={text} onChange={e => setText(e.target.value)} placeholder="Add a task" aria-label="New task" />
          <button className="btn" type="submit">Add</button>
        </form>
      )}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  async function send(e) {
    e.preventDefault(); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) setMsg(error.message); else { setSent(true); setMsg("Check your email for the sign-in link or 6-digit code."); }
  }
  async function verify(e) {
    e.preventDefault(); setMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) setMsg(error.message);
  }
  return (
    <div className="login">
      <div><div className="label">MSc 2027</div><h1>Scholarship Desk</h1></div>
      <form className="card" onSubmit={sent ? verify : send}>
        <label className="label" htmlFor="login-email">Email</label>
        <input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={sent} />
        {sent && (<>
          <label className="label" htmlFor="login-code">Code from the email</label>
          <input id="login-code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" />
        </>)}
        <button className="btn primary" type="submit">{sent ? "Sign in" : "Send sign-in email"}</button>
        {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
      </form>
    </div>
  );
}

function Desk({ programs, tasks, readOnly, reload, userEmail, demo }) {
  const [kind, setKind] = useState(() => ls.get("sd.kind", "all"));
  const [status, setStatus] = useState(() => ls.get("sd.status", "active"));
  const [showNo, setShowNo] = useState(() => ls.get("sd.showNo", false));
  const [sort, setSort] = useState(() => ls.get("sd.sort", "deadline"));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => { ls.set("sd.kind", kind); ls.set("sd.status", status); ls.set("sd.showNo", showNo); ls.set("sd.sort", sort); }, [kind, status, showNo, sort]);

  const upcoming = useMemo(() => programs
    .filter(p => p.deadline && daysLeft(p.deadline) >= 0 && p.eligibility !== "no" && !["skip", "rejected", "accepted", "submitted"].includes(p.status))
    .sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 8), [programs]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = programs.filter(p =>
      (kind === "all" || p.kind === kind) &&
      (showNo || p.eligibility !== "no") &&
      (status === "all" || (status === "active" ? !["skip", "rejected"].includes(p.status) : p.status === status)) &&
      (!needle || [p.name, p.host, p.funding, p.notes, p.section].join(" ").toLowerCase().includes(needle)));
    const byDl = (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999");
    const fitRank = { strong: 0, ok: 1, stretch: 2 };
    if (sort === "deadline") r.sort(byDl);
    else if (sort === "fit") r.sort((a, b) => ((fitRank[a.fit] ?? 3) - (fitRank[b.fit] ?? 3)) || byDl(a, b));
    else r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [programs, kind, status, showNo, sort, q]);

  const counts = useMemo(() => {
    const c = { total: programs.length, preparing: 0, applied: 0, soon: 0 };
    for (const p of programs) {
      if (p.status === "preparing") c.preparing++;
      if (["applied", "submitted", "interview", "accepted"].includes(p.status)) c.applied++;
      const n = daysLeft(p.deadline);
      if (n !== null && n >= 0 && n <= 45 && p.eligibility !== "no" && p.status !== "skip") c.soon++;
    }
    return c;
  }, [programs]);

  const jumpTo = id => {
    setOpen(id); setStatus("all"); setKind("all"); setQ("");
    setTimeout(() => document.getElementById("row-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <div className="wrap">
      <header className="top">
        <div><div className="label">MSc 2027</div><h1>Scholarship Desk</h1></div>
        <div className="stats">
          <div className="stat"><b>{counts.total}</b><span className="muted">programs</span></div>
          <div className="stat"><b>{counts.soon}</b><span className="muted">due in 45 days</span></div>
          <div className="stat"><b>{counts.preparing}</b><span className="muted">preparing</span></div>
          <div className="stat"><b>{counts.applied}</b><span className="muted">applied</span></div>
        </div>
      </header>

      {demo && <div className="banner">Read-only preview. Connect Supabase (see README) to sign in, edit statuses and keep notes.</div>}
      {userEmail && (
        <div className="userbar muted">Signed in as {userEmail}
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
      )}

      <section style={{ display: "grid", gap: 10 }}>
        <div className="label">Next deadlines</div>
        {upcoming.length === 0 ? <p className="muted">No upcoming deadlines yet. Add a program with a date and it will show here.</p> : (
          <div className="strip">
            {upcoming.map(p => {
              const n = daysLeft(p.deadline);
              return (
                <button key={p.id} className={"due" + (n <= 30 ? " soon" : "")} onClick={() => jumpTo(p.id)}>
                  <span className="days">{n === 0 ? "Today" : n + "d"}</span>
                  <span className="nm">{p.name}</span>
                  <span className="muted mono" style={{ fontSize: 12 }}>{fmtDate(p.deadline)}{p.deadlineEstimated ? " · est." : ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="main">
        <section style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div className="filters">
            <input type="search" id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="Search programs, countries, notes" aria-label="Search" />
            <div className="seg" role="group" aria-label="Type">
              {[["all", "All"], ["scholarship", "Scholarships"], ["funded", "Funded MS/PhD"], ["self-funded", "Self-funded"]].map(([k, v]) =>
                <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{v}</button>)}
            </div>
            <select id="status-filter" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option><option value="all">Every status</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select id="sort" aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="deadline">Soonest deadline</option><option value="fit">Best fit</option><option value="name">Name</option>
            </select>
            <label className="chk"><input type="checkbox" id="showno" checked={showNo} onChange={e => setShowNo(e.target.checked)} /> Show not eligible</label>
            {!readOnly && <button className="btn primary" onClick={() => setAdding(!adding)}>{adding ? "Close form" : "Add program"}</button>}
          </div>
          {adding && <AddForm onDone={() => setAdding(false)} onSaved={reload} />}
          <div className="ledger">
            <div className="row head">
              <span className="label">Program</span><span className="label">Funding / cost</span><span className="label">Deadline</span>
              <span className="label col-elig">Eligible</span><span className="label">Status</span>
            </div>
            {shown.length === 0 ? (
              <div className="empty">{programs.length === 0 ? "No programs yet. Add the first one with the Add program button." : "Nothing matches these filters."}</div>
            ) : shown.map(p => (
              <React.Fragment key={p.id}>
                <div id={"row-" + p.id} className="row" tabIndex={0} role="button" aria-expanded={open === p.id}
                  onClick={() => setOpen(open === p.id ? null : p.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === p.id ? null : p.id); } }}>
                  <div className="nm">{p.name}<div className="sub">{p.host}{p.kind ? " · " + KIND_LABEL[p.kind] : ""}</div></div>
                  <div className="fund">{p.funding || "—"}</div>
                  <Deadline p={p} />
                  <div className="col-elig">
                    <Pill kind={p.eligibility}>{ELIG_LABEL[p.eligibility] || "—"}</Pill>
                    {p.fit ? <> <Pill kind={p.fit}>{p.fit}</Pill></> : null}
                  </div>
                  <div><span className={"st st-" + (p.status || "watch")}>{STATUS_LABEL[p.status || "watch"]}</span></div>
                </div>
                {open === p.id && <Detail p={p} readOnly={readOnly} onSaved={reload} onClose={() => setOpen(null)} />}
              </React.Fragment>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>"est." means the date comes from last year's cycle. Check the official page once the new call opens.</p>
        </section>
        <aside>
          <Todos tasks={tasks} readOnly={readOnly} onSaved={reload} />
          <div className="card">
            <h2>How to use it</h2>
            <p className="muted" style={{ margin: 0 }}>Click a program to update its status, deadline or notes. Paste a new program page to Claude and it gets added here.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [data, setData] = useState(supabase ? null : demoData);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!supabase || !session) return;
    try { setData(await loadAll()); setErr(""); } catch (e) { setErr(errText(e)); }
  }, [session]);

  useEffect(() => { reload(); }, [reload]);

  if (!authReady) return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (supabase && !session) return <Login />;
  if (err) return <div className="wrap"><div className="banner">Could not load your programs: {err}</div></div>;
  if (!data) return <div className="wrap"><p className="muted">Loading your programs…</p></div>;
  return (
    <Desk programs={data.programs} tasks={data.tasks} readOnly={!supabase} reload={reload}
      userEmail={session?.user?.email} demo={!supabase} />
  );
}
