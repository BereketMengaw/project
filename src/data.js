import { createClient } from "@supabase/supabase-js";
import seed from "./seed.json";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const demoData = seed;

// Database rows are snake_case; the UI uses camelCase.
const toUi = r => ({
  id: r.id, name: r.name, host: r.host, kind: r.kind, section: r.section, funding: r.funding,
  deadline: r.deadline, deadlineText: r.deadline_text, deadlineEstimated: r.deadline_estimated,
  eligibility: r.eligibility, eligibilityNote: r.eligibility_note, fit: r.fit, fitNote: r.fit_note,
  discounts: r.discounts, url: r.url, status: r.status, notes: r.notes, updatedAt: r.updated_at,
});

const toDb = p => {
  const m = {
    name: "name", host: "host", kind: "kind", section: "section", funding: "funding", deadline: "deadline",
    deadlineText: "deadline_text", deadlineEstimated: "deadline_estimated", eligibility: "eligibility",
    eligibilityNote: "eligibility_note", fit: "fit", fitNote: "fit_note", discounts: "discounts",
    url: "url", status: "status", notes: "notes",
  };
  const out = {};
  for (const [k, v] of Object.entries(p)) if (m[k]) out[m[k]] = v === "" && k === "deadline" ? null : v;
  out.updated_at = new Date().toISOString();
  return out;
};

export async function loadAll() {
  const [p, t] = await Promise.all([
    supabase.from("programs").select("*"),
    supabase.from("tasks").select("*").order("sort"),
  ]);
  if (p.error) throw p.error;
  if (t.error) throw t.error;
  return { programs: p.data.map(toUi), tasks: t.data };
}

export async function updateProgram(id, patch) {
  const { error } = await supabase.from("programs").update(toDb(patch)).eq("id", id);
  if (error) throw error;
}

export async function addProgram(id, program) {
  const { error } = await supabase.from("programs").insert({ id, ...toDb(program) });
  if (error) throw error;
}

export async function deleteProgram(id) {
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
}

export async function setTaskDone(id, done) {
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function addTask(id, title) {
  const { error } = await supabase.from("tasks").insert({ id, title, done: false, sort: 50 });
  if (error) throw error;
}
