// Reads Acadience score workbooks (the school's "Acadience Reading" and "Acadience Math" Excel calculators)
// and turns them into plain results the report walkthrough can use.
//
// This file does not talk to Excel itself. It takes each sheet as an array of rows (arrays of cell values),
// which is what XLSX.utils.sheet_to_json(sheet, { header: 1 }) gives you, so it can be tested without a browser.

export const ACADIENCE_WINDOWS = [
  { id: "BOY", label: "Beginning of year" },
  { id: "MOY", label: "Middle of year" },
  { id: "EOY", label: "End of year" },
];

// Plain-language names for the measures, in the order a parent should read them.
const MEASURE_NAMES = {
  reading: {
    FSF: "First sound fluency",
    PSF: "Sounds in words",
    "NWF-CLS": "Letter sounds",
    "NWF-WWR": "Reading whole words",
    "ORF-WC": "Words read per minute",
    "ORF-Acc%": "Reading accuracy",
    Retell: "Retelling what was read",
    RetellQ: "Answering questions about what was read",
    Maze: "Reading comprehension",
    "Silent Rdg": "Silent reading",
    Comprehension: "Answering comprehension questions",
  },
  math: {
    BQD: "Comparing quantities",
    NIF: "Naming numbers",
    NNF: "Next number",
    AQD: "Comparing quantities",
    MNF: "Missing numbers",
    Comp: "Computation",
    "C&A": "Concepts and applications",
  },
};
const MEASURE_ORDER = {
  reading: ["FSF", "PSF", "NWF-CLS", "NWF-WWR", "ORF-WC", "ORF-Acc%", "Retell", "RetellQ", "Maze", "Silent Rdg", "Comprehension"],
  math: ["BQD", "NIF", "NNF", "AQD", "MNF", "Comp", "C&A"],
};
const STATUS_OK = ["Well Below", "Below", "At", "Above", "At or Above"];

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

// Lowercase, no punctuation, single spaces. "Shmaya  Grossbaum" and "shmaya grossbaum" match.
export function normalizeName(n) {
  return clean(n).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}

// sheets: { "Grade 1": rows, "Grade 2": rows, ... }  kind: "reading" | "math"  window: "BOY" | "MOY" | "EOY"
// Returns [{ name, tab, composite, compositeStatus, measures: [{ abbr, label, status }] }] for every student who has a result.
export function parseAcadienceSheets(sheets, kind, windowId) {
  const out = [];
  const names = MEASURE_NAMES[kind] || {};
  Object.keys(sheets).forEach((tab) => {
    if (!/^(kindergarten|grade \d+)$/i.test(tab.trim())) return; // skips Instructions, Cutpoints, AccuracyTables
    const rows = sheets[tab] || [];
    const hi = rows.findIndex((r) => clean(r && r[0]).toLowerCase() === "student name");
    if (hi < 0) return;
    const headers = (rows[hi] || []).map(clean);
    const winCol = 1;
    const compCol = headers.findIndex((h) => /^composite score$/i.test(h));
    const compStatCol = headers.findIndex((h) => /^composite status$/i.test(h));
    // Grades 7 and 8 (reading) have no composite score, only the individual measures.
    const measureCols = [];
    headers.forEach((h, i) => {
      const m = /^(.+) Raw$/.exec(h);
      if (!m) return;
      const abbr = m[1];
      if (clean(headers[i + 1]) === `${abbr} Status` && names[abbr]) measureCols.push({ abbr, statusCol: i + 1 }); // measures with no level, or no plain-language name, are left out
    });
    let current = "";
    for (let r = hi + 1; r < rows.length; r += 1) {
      const row = rows[r] || [];
      if (clean(row[0])) current = clean(row[0]);
      if (!current || /^new student\b/i.test(current)) continue; // eslint-disable-line no-continue
      if (clean(row[winCol]).toUpperCase() !== windowId) continue; // eslint-disable-line no-continue
      const rawComposite = compStatCol >= 0 ? clean(row[compStatCol]) : "";
      const compositeStatus = STATUS_OK.includes(rawComposite) ? rawComposite : "";
      const measures = measureCols
        .map((m) => ({ abbr: m.abbr, label: names[m.abbr], status: clean(row[m.statusCol]) }))
        .filter((m) => STATUS_OK.includes(m.status));
      if (!compositeStatus && measures.length === 0) continue; // eslint-disable-line no-continue
      out.push({ name: current, tab: tab.trim(), composite: compCol >= 0 ? row[compCol] : null, compositeStatus, measures });
    }
  });
  return out;
}

// One-letter-off spellings still match ("Shmuel" vs "Shmual"), but only when the choice is unambiguous.
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// roster: [{ id, name }]. Returns { matched: [{ student, result, how }], missing: [student], extras: count of file rows not in this class }
export function matchAcadienceToRoster(results, roster) {
  const byName = new Map();
  results.forEach((r) => { const k = normalizeName(r.name); if (!byName.has(k)) byName.set(k, r); });
  const used = new Set();
  const matched = [];
  const missing = [];
  roster.forEach((s) => {
    const k = normalizeName(s.name);
    let hit = byName.get(k);
    let how = "name";
    if (!hit) {
      const maxEdits = k.length >= 15 ? 2 : 1; // long names can differ by two letters ("Breina" / "Bryna") and still be the same child
      const near = [...byName.entries()].filter(([fk]) => !used.has(fk) && editDistance(fk, k) <= maxEdits);
      if (near.length === 1) { hit = near[0][1]; how = "close spelling"; }
    }
    if (hit) { used.add(normalizeName(hit.name)); matched.push({ student: s, result: hit, how }); } else missing.push(s);
  });
  return { matched, missing, extras: results.filter((r) => !used.has(normalizeName(r.name))).length };
}

// The parts (columns) the report will show, in a sensible order, using only measures at least one matched student actually has.
export function acadienceParts(matched, kind) {
  const order = MEASURE_ORDER[kind] || [];
  const seen = new Map();
  matched.forEach((m) => m.result.measures.forEach((ms) => { if (!seen.has(ms.abbr)) seen.set(ms.abbr, ms.label); }));
  const abbrs = [...seen.keys()].sort((a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)));
  return abbrs.map((abbr) => ({ abbr, label: seen.get(abbr) }));
}

export function acadienceReportLabel(kind, windowId) {
  const when = (ACADIENCE_WINDOWS.find((w) => w.id === windowId) || ACADIENCE_WINDOWS[0]).label;
  return `${kind === "math" ? "Math" : "English"} (${when} assessment)`;
}
