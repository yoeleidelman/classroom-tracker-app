// Tailwind color safelist — many classes in this file are built dynamically (e.g. `bg-${color}-500`),
// which Tailwind's build step can't detect from source alone, so it silently skips generating their CSS.
// Listing every actual combination here as plain text fixes that — a button set to any of these colors
// will now render correctly instead of turning invisible. Add a color to this list if it's ever added to
// COLOR_CHOICES below.
// bg-emerald-100 bg-emerald-200 bg-emerald-400 bg-emerald-500 bg-emerald-600 text-emerald-700 text-emerald-800 border-emerald-500
// bg-amber-100 bg-amber-200 bg-amber-400 bg-amber-500 bg-amber-600 text-amber-700 text-amber-800 border-amber-500
// bg-rose-100 bg-rose-200 bg-rose-400 bg-rose-500 bg-rose-600 text-rose-700 text-rose-800 border-rose-500
// bg-indigo-100 bg-indigo-200 bg-indigo-400 bg-indigo-500 bg-indigo-600 text-indigo-700 text-indigo-800 border-indigo-500
// bg-sky-100 bg-sky-200 bg-sky-400 bg-sky-500 bg-sky-600 text-sky-700 text-sky-800 border-sky-500
// bg-stone-100 bg-stone-200 bg-stone-400 bg-stone-500 bg-stone-600 text-stone-700 text-stone-800 border-stone-500
// bg-violet-100 bg-violet-200 bg-violet-400 bg-violet-500 bg-violet-600 text-violet-700 text-violet-800 border-violet-500
// bg-teal-100 bg-teal-200 bg-teal-400 bg-teal-500 bg-teal-600 text-teal-700 text-teal-800 border-teal-500
// bg-fuchsia-100 bg-fuchsia-200 bg-fuchsia-400 bg-fuchsia-500 bg-fuchsia-600 text-fuchsia-700 text-fuchsia-800 border-fuchsia-500

import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import {
  ChevronLeft, Plus, AlertTriangle, Mic, ArrowRight, Loader2,
  Trash2, Settings as SettingsIcon, ChevronDown, ChevronUp,
  Home as HomeIcon, BookOpen, ClipboardList, Mail, RefreshCw, Copy, Check,
  Star, Minus, Calendar, Bell, ChevronRight, MessageCircle
} from "lucide-react";

// ---------- Default content (all editable later via Settings) ----------

const DEFAULT_LETTERS = [
  { id: "alef", char: "א", label: "Alef" },
  { id: "beis", char: "בּ", label: "Beis" },
  { id: "veis", char: "ב", label: "Veis" },
  { id: "gimmel", char: "ג", label: "Gimmel" },
  { id: "daled", char: "ד", label: "Daled" },
  { id: "hei", char: "ה", label: "Hei" },
  { id: "vav", char: "ו", label: "Vav" },
  { id: "zayin", char: "ז", label: "Zayin" },
  { id: "ches", char: "ח", label: "Ches" },
  { id: "tes", char: "ט", label: "Tes" },
  { id: "yud", char: "י", label: "Yud" },
  { id: "kaf", char: "כּ", label: "Kaf" },
  { id: "chaf", char: "כ", label: "Chaf" },
  { id: "chaf-sofis", char: "ך", label: "Chaf Sofis" },
  { id: "lamed", char: "ל", label: "Lamed" },
  { id: "mem", char: "מ", label: "Mem" },
  { id: "mem-sofis", char: "ם", label: "Mem Sofis" },
  { id: "nun", char: "נ", label: "Nun" },
  { id: "nun-sofis", char: "ן", label: "Nun Sofis" },
  { id: "samech", char: "ס", label: "Samech" },
  { id: "ayin", char: "ע", label: "Ayin" },
  { id: "pei", char: "פּ", label: "Pei" },
  { id: "fei", char: "פ", label: "Fei" },
  { id: "fei-sofis", char: "ף", label: "Fei Sofis" },
  { id: "tzadik", char: "צ", label: "Tzadik" },
  { id: "tzadik-sofis", char: "ץ", label: "Tzadik Sofis" },
  { id: "kuf", char: "ק", label: "Kuf" },
  { id: "reish", char: "ר", label: "Reish" },
  { id: "shin", char: "שׁ", label: "Shin" },
  { id: "sin", char: "שׂ", label: "Sin" },
  { id: "tav", char: "ת", label: "Tav" },
];

const DEFAULT_NEKUDOS = [
  { id: "kamatz", char: "◌ָ", label: "Kamatz" },
  { id: "patach", char: "◌ַ", label: "Patach" },
  { id: "tzeirei", char: "◌ֵ", label: "Tzeirei" },
  { id: "segol", char: "◌ֶ", label: "Segol" },
  { id: "chirik", char: "◌ִ", label: "Chirik" },
  { id: "cholam", char: "◌ֹ", label: "Cholam" },
  { id: "kubutz", char: "◌ֻ", label: "Kubutz" },
  { id: "shuruk", char: "וּ", label: "Shuruk" },
  { id: "shva", char: "◌ְ", label: "Shva" },
];

const DEFAULT_BLENDING_CONCEPTS = [
  { id: "blend-cv", label: "Letter + Vowel Blend", desc: "Blends a single letter with a vowel smoothly" },
  { id: "blend-transition", label: "Sound Transition", desc: "Moves from one sound to the next without losing the first" },
];

const DEFAULT_BLENDING_WORDS = [
  { id: "abba", char: "אָבָא", label: "Abba — Kamatz/Patach" },
  { id: "imma", char: "אִמָּא", label: "Imma — Chirik/Kamatz" },
  { id: "kelev", char: "כֶּלֶב", label: "Kelev — Segol/Segol" },
  { id: "sefer", char: "סֵפֶר", label: "Sefer — Tzeirei/Segol" },
  { id: "gadol", char: "גָּדוֹל", label: "Gadol — Kamatz/Cholam" },
  { id: "katan", char: "קָטָן", label: "Katan — Kamatz/Kamatz" },
  { id: "shalom", char: "שָׁלוֹם", label: "Shalom — Kamatz/Cholam" },
  { id: "chalav", char: "חָלָב", label: "Chalav — Kamatz/Kamatz" },
  { id: "delet", char: "דֶּלֶת", label: "Delet — Segol/Segol" },
  { id: "zahav", char: "זָהָב", label: "Zahav — Kamatz/Kamatz" },
];

const DEFAULT_RULES = [
  { id: "shva-na", label: "Shva Na", desc: "Vocal shva — pronounced quickly" },
  { id: "shva-nach", label: "Shva Nach", desc: "Silent shva" },
  { id: "dagesh-chazak", label: "Dagesh Chazak", desc: "Doubling dagesh in a letter" },
];

const DEFAULT_CONFIG = {
  flagThreshold: 2,
  masteryThreshold: 2,
  tierMessages: {
    1: "Give extra practice next session",
    2: "Send a practice note home",
    3: "Reach out to parent for a check-in",
    4: "Flag for admin / consider extra support",
  },
  statusColors: { mastered: "emerald", flagged: "amber" },
  gradeOptions: [
    { id: "got-it", label: "Got it", weight: "positive", color: "emerald" },
    { id: "hesitated", label: "Hesitated", weight: "neutral", color: "amber" },
    { id: "struggled", label: "Struggled", weight: "negative", color: "rose" },
  ],
  categories: [
    { id: "lname", title: "Letter Recognition — Name", mode: "char", items: DEFAULT_LETTERS, active: false },
    { id: "lsound", title: "Letter Sounds", mode: "char", items: DEFAULT_LETTERS, active: false },
    { id: "nname", title: "Nekudos — Name", mode: "char", items: DEFAULT_NEKUDOS, active: false },
    { id: "nsound", title: "Nekudos — Sound", mode: "char", items: DEFAULT_NEKUDOS, active: false },
    { id: "blend-concepts", title: "Blending — Concepts", mode: "skill", items: DEFAULT_BLENDING_CONCEPTS, active: false },
    { id: "blend-words", title: "Blending — Two-Syllable Words", mode: "char", items: DEFAULT_BLENDING_WORDS, active: false },
    { id: "rules", title: "Reading Rules", mode: "skill", items: DEFAULT_RULES, active: false },
  ],
  attendance: {
    statuses: [
      { id: "present", label: "Present", color: "emerald", flagType: "none" },
      { id: "late", label: "Late", color: "amber", flagType: "late" },
      { id: "absent", label: "Absent", color: "rose", flagType: "absent" },
      { id: "excused", label: "Excused", color: "sky", flagType: "none" },
    ],
    lateRule: { threshold: 3, windowDays: 30 },
    absentRule: { threshold: 3, windowDays: 30 },
    classStartTime: "",
    lateTierMessages: { 1: "Mention it to the student", 2: "Send a note home about lateness", 3: "Call the parent", 4: "Flag for admin" },
    absentTierMessages: { 1: "Note the pattern", 2: "Send a note home", 3: "Call the parent", 4: "Flag for admin" },
  },
  periodAttendance: {
    types: [
      { id: "late-to-class", label: "Late to class", color: "amber" },
      { id: "absent-subject", label: "Absent from subject", color: "rose" },
      { id: "left-early", label: "Left early", color: "violet" },
      { id: "returned-appointment", label: "Returned from appointment", color: "sky" },
    ],
  },
  incidents: {
    categories: [
      { id: "discipline", label: "Discipline", color: "rose" },
      { id: "social", label: "Social / Peer", color: "violet" },
      { id: "lost-item", label: "Lost item or work", color: "amber" },
    ],
    flagRule: { threshold: 3, windowDays: 7 },
    tierMessages: { 1: "Make a note, keep an eye on it", 2: "Send a note home", 3: "Schedule a parent meeting", 4: "Flag for admin" },
  },
  points: {
    categories: [],
    behaviorLog: {
      markTypes: [
        { id: "check", label: "Check", color: "emerald" },
        { id: "x", label: "X", color: "rose" },
      ],
      summaryMode: "daily", // 'daily' | 'weekly' | 'both'
    },
  },
  monthlyReports: {
    dayOfMonth: 25,
    avoidFriday: false,
  },
  planner: {
    dayTypes: [
      { id: "school", label: "School Day", color: "emerald", hidesAttendance: false, scheduleTemplate: "full" },
      { id: "half-day", label: "Half Day", color: "amber", hidesAttendance: false, scheduleTemplate: "half" },
      { id: "no-school", label: "No School", color: "stone", hidesAttendance: true, scheduleTemplate: "none" },
    ],
    fullDaySchedule: [],
    halfDaySchedule: [],
  },
};

const COLOR_CHOICES = ["emerald", "amber", "rose", "indigo", "sky", "violet", "stone", "teal", "fuchsia"];
const PAGE = "app-page";

function skillKey(catId, itemId) { return `${catId}:${itemId}`; }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function waLink(phone, message) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
function WhatsAppButton({ phone, message, className }) {
  if (!phone) return null;
  return (
    <a href={waLink(phone, message)} target="_blank" rel="noopener noreferrer"
      className={className || "flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 hover:bg-emerald-700"}>
      <MessageCircle size={12} /> Send WhatsApp
    </a>
  );
}
function withinWindow(dateStr, windowDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  return dateStr >= cutoff.toISOString().slice(0, 10);
}
function tierFor(count, threshold) { return Math.max(1, Math.min(4, count - threshold + 1)); }

function monthKey(year, monthIdx) { return `${year}-${String(monthIdx + 1).padStart(2, "0")}`; }
function monthLabel(year, monthIdx) {
  return new Date(year, monthIdx, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function shabbosAwareReminderDate(year, monthIdx, dayOfMonth, avoidFriday) {
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), daysInMonth);
  const date = new Date(year, monthIdx, day);
  const weekday = date.getDay(); // 0=Sun ... 5=Fri, 6=Sat
  if (weekday === 6) date.setDate(date.getDate() + 1); // Saturday -> Sunday
  else if (avoidFriday && weekday === 5) date.setDate(date.getDate() - 1); // Friday -> Thursday
  return date;
}

function isoDate(d) { return d.toISOString().slice(0, 10); }
function addDaysISO(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function buildMonthGrid(year, monthIdx) {
  const first = new Date(year, monthIdx, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(new Date(year, monthIdx, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function eachDateInRange(startStr, endStr) {
  const out = [];
  let cur = startStr;
  let guard = 0;
  while (cur <= endStr && guard < 3660) { out.push(cur); cur = addDaysISO(cur, 1); guard++; }
  return out;
}

function computeSkillStatus(history, config) {
  if (!history || history.length === 0) return { status: "new", streak: 0 };
  const weightOf = (id) => config.gradeOptions.find((o) => o.id === id)?.weight || "neutral";
  let i = history.length - 1;
  const lastWeight = weightOf(history[i].result);
  let streak = 0;
  while (i >= 0 && weightOf(history[i].result) === lastWeight) { streak++; i--; }
  if (lastWeight === "negative" && streak >= config.flagThreshold) return { status: "flagged", streak };
  if (lastWeight === "positive" && streak >= config.masteryThreshold) return { status: "mastered", streak };
  return { status: "practicing", streak };
}

function emptyStudentData() { return { skills: {}, fluency: [], attendance: [], periodAttendance: [], points: {}, communications: [] }; }

function buildSampleData() {
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid();
  const roster = [
    { id: s1, name: "Chana G.", parentEmail: "", parentPhone: "", notes: "" },
    { id: s2, name: "Mendel S.", parentEmail: "", parentPhone: "", notes: "" },
    { id: s3, name: "Yossi B.", parentEmail: "", parentPhone: "", notes: "" },
    { id: s4, name: "Rivka L.", parentEmail: "", parentPhone: "", notes: "" },
  ];
  const today = todayISO();
  const d = (n) => addDaysISO(today, -n);

  const studentData = {
    [s1]: {
      skills: {
        [skillKey("lname", "alef")]: { history: [{ date: d(10), result: "got-it" }, { date: d(5), result: "got-it" }], status: "mastered", flagCount: 0 },
        [skillKey("lname", "beis")]: { history: [{ date: d(6), result: "struggled" }, { date: d(2), result: "struggled" }], status: "flagged", flagCount: 1 },
      },
      fluency: [{ date: d(3), wordsRead: 14, hesitation: "some", mode: "decoding", notes: "Improving steadily" }],
      attendance: [{ date: d(9), status: "present", time: "" }, { date: d(8), status: "present", time: "" }, { date: d(7), status: "late", time: "9:12" }, { date: d(2), status: "present", time: "" }],
      points: {}, communications: [],
    },
    [s2]: {
      skills: { [skillKey("lname", "alef")]: { history: [{ date: d(6), result: "got-it" }], status: "practicing", flagCount: 0 } },
      fluency: [],
      attendance: [{ date: d(9), status: "present", time: "" }, { date: d(4), status: "absent", time: "" }],
      points: {}, communications: [],
    },
    [s3]: {
      skills: {},
      fluency: [],
      attendance: [{ date: d(9), status: "present", time: "" }, { date: d(7), status: "late", time: "9:20" }, { date: d(3), status: "late", time: "9:15" }, { date: d(1), status: "late", time: "9:08" }],
      points: {}, communications: [],
    },
    [s4]: {
      skills: {}, fluency: [],
      attendance: [{ date: d(9), status: "present", time: "" }],
      points: {}, communications: [],
    },
  };

  const incidents = [
    { id: uid(), date: d(5), category: "social", description: "Disagreement over supplies during table work", studentIds: [s2, s3] },
  ];
  const classAssessments = [
    { id: uid(), title: "Friday Parsha Quiz (sample)", date: d(2), results: { [s1]: "95%", [s2]: "Pass", [s3]: "82%", [s4]: "90%" } },
  ];

  const ptsCatId = uid();
  studentData[s1].points = { [ptsCatId]: 6 };
  studentData[s2].points = { [ptsCatId]: 3 };
  studentData[s3].points = { [ptsCatId]: 8 };
  studentData[s4].points = { [ptsCatId]: 4 };

  const period1 = uid(), period2 = uid(), period3 = uid();
  const sampleSchedule = [
    { id: period1, label: "Kriya", startTime: "09:00", endTime: "09:45" },
    { id: period2, label: "Chumash", startTime: "09:50", endTime: "10:30" },
    { id: period3, label: "Recess", startTime: "10:30", endTime: "11:00" },
  ];

  const plannerDays = {
    [d(9)]: { dayType: "school", notes: "" },
    [d(4)]: { dayType: "no-school", notes: "Sample: no school this day" },
    [d(3)]: { dayType: "half-day", notes: "Sample half day", slotContent: {} },
    [today]: {
      dayType: "school", notes: "",
      slotContent: {
        [period1]: "Reviewing Kamatz/Patach, quiz Thursday",
        [period2]: "Parshas Vayeira — continuing from yesterday",
      },
    },
  };
  const plannerEvents = [
    { id: uid(), date: addDaysISO(today, 5), title: "Sample: Kriya benchmark check-in", reminderLeadDays: 3 },
  ];
  const benchmarkSubjects = [
    {
      id: uid(), label: "Kriya (sample)",
      segments: [
        { id: uid(), label: "Letters A–M", startDate: d(20), endDate: d(6), color: "sky" },
        { id: uid(), label: "Letters N–Z", startDate: d(5), endDate: addDaysISO(today, 15), color: "violet" },
      ],
    },
  ];

  return {
    roster, studentData, incidents, classAssessments, classPoints: {}, plannerDays, plannerEvents, benchmarkSubjects, sampleSchedule,
    pointsCategory: { id: ptsCatId, label: "Diligence Points (sample)", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "Sample reward: extra recess" },
  };
}

// ---------- Storage helpers ----------

async function loadJSON(key, fallback, shared = false) {
  try {
    const ref = doc(db, "data", key);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().value : fallback;
  } catch (e) {
    console.error("Load failed", key, e);
    return fallback;
  }
}

async function saveJSON(key, value, shared = false) {
  try {
    const ref = doc(db, "data", key);
    await setDoc(ref, { value });
  } catch (e) {
    console.error("Save failed", key, e);
  }
}

const ClassContext = createContext({ className: "", onSwitchClass: () => {} });

// ---------- Flags ----------

function getFlags(data, studentId, incidents, config) {
  if (!data) return [];
  const flags = [];
  for (const cat of config.categories) {
    for (const item of cat.items) {
      const key = skillKey(cat.id, item.id);
      const skill = data.skills[key];
      if (skill && skill.status === "flagged") {
        const tier = Math.min(4, skill.flagCount);
        flags.push({ key: `skill-${key}`, type: "skill", label: `${item.label} (${cat.title})`, tier, message: config.tierMessages[tier] || config.tierMessages[4] });
      }
    }
  }
  const statusMap = {};
  config.attendance.statuses.forEach((s) => (statusMap[s.id] = s));
  const lateCount = (data.attendance || []).filter((a) => statusMap[a.status]?.flagType === "late" && withinWindow(a.date, config.attendance.lateRule.windowDays)).length;
  if (lateCount >= config.attendance.lateRule.threshold) {
    const tier = tierFor(lateCount, config.attendance.lateRule.threshold);
    flags.push({ key: "attendance-late", type: "late", label: `Lateness — ${lateCount} in last ${config.attendance.lateRule.windowDays} days`, tier, message: config.attendance.lateTierMessages[tier] });
  }
  const absentCount = (data.attendance || []).filter((a) => statusMap[a.status]?.flagType === "absent" && withinWindow(a.date, config.attendance.absentRule.windowDays)).length;
  if (absentCount >= config.attendance.absentRule.threshold) {
    const tier = tierFor(absentCount, config.attendance.absentRule.threshold);
    flags.push({ key: "attendance-absent", type: "absent", label: `Absences — ${absentCount} in last ${config.attendance.absentRule.windowDays} days`, tier, message: config.attendance.absentTierMessages[tier] });
  }
  const myIncidents = (incidents || []).filter((i) => i.studentIds?.includes(studentId));
  const incCount = myIncidents.filter((i) => withinWindow(i.date, config.incidents.flagRule.windowDays)).length;
  if (incCount >= config.incidents.flagRule.threshold) {
    const tier = tierFor(incCount, config.incidents.flagRule.threshold);
    flags.push({ key: "incidents", type: "incident", label: `Incidents — ${incCount} in last ${config.incidents.flagRule.windowDays} days`, tier, message: config.incidents.tierMessages[tier] });
  }
  for (const cat of config.points?.categories || []) {
    if (cat.scope !== "individual") continue;
    const pts = data.points?.[cat.id] || 0;
    if (pts >= cat.threshold) {
      flags.push({ key: `points-${cat.id}`, type: "points", label: `${cat.label} — reward ready (${pts}/${cat.threshold})`, tier: 1, message: cat.rewardMessage || "Reward earned" });
    }
  }
  return flags.sort((a, b) => b.tier - a.tier);
}

// ---------- App ----------

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [registry, setRegistry] = useState([]);
  const [classId, setClassId] = useState(null);
  const [className, setClassName] = useState("");
  const [isAdminSession, setIsAdminSession] = useState(false);

  useEffect(() => {
    (async () => {
      // Deliberately does NOT remember the last class or admin session across app opens.
      // Every visit starts at the login screen, and a password is required every time —
      // this is intentional, not a bug: nobody should land in a classroom that isn't theirs
      // just because it was the last one open on this device.
      const reg = await loadJSON("schoolClasses", [], true);
      setRegistry(reg);
      setCheckingSession(false);
    })();
  }, []);

  const selectClass = (cls) => {
    setClassId(cls.id);
    setClassName(cls.name);
  };

  const switchClass = () => {
    setClassId(null);
    setClassName("");
  };

  const createClass = async (name, password) => {
    const id = uid();
    const cls = { id, name, password };
    const next = [...registry, cls];
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
    return cls;
  };

  const renameClass = async (newName) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === classId ? { ...c, name: newName } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
    setClassName(newName);
  };

  const changeClassPassword = async (newPassword) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === classId ? { ...c, password: newPassword } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
  };

  const archiveClass = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === classId ? { ...c, archived: true } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
    switchClass();
  };

  const restoreClass = async (id) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === id ? { ...c, archived: false } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
  };

  const refreshRegistry = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    setRegistry(reg);
  };

  const loginAdmin = async (password) => {
    const settings = await loadJSON("adminSettings", null, true);
    if (!settings) {
      // first time — this submission sets the admin password
      await saveJSON("adminSettings", { password }, true);
      setIsAdminSession(true);
      return { ok: true, created: true };
    }
    if (password === settings.password) {
      setIsAdminSession(true);
      return { ok: true, created: false };
    }
    return { ok: false };
  };

  const logoutAdmin = () => {
    setIsAdminSession(false);
    switchClass();
  };

  const enterClassAsAdmin = (cls) => {
    setClassId(cls.id);
    setClassName(cls.name);
    // deliberately not saved as selectedClassId — admin browsing shouldn't hijack this device's normal teacher login
  };

  const backToAdminDashboard = () => {
    setClassId(null);
    setClassName("");
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-slate-700" size={28} /></div>;
  }
  if (!classId) {
    if (isAdminSession) {
      return <AdminDashboard registry={registry} onEnterClass={enterClassAsAdmin} onCreate={createClass} onRefresh={refreshRegistry} onLogout={logoutAdmin} onRestore={restoreClass} />;
    }
    return <ClassGateScreen registry={registry} onSelect={selectClass} onCreate={createClass} onRefresh={refreshRegistry} onLoginAdmin={loginAdmin} />;
  }
  return (
    <ClassApp classId={classId} className={className}
      onSwitchClass={isAdminSession ? backToAdminDashboard : switchClass}
      switchLabel={isAdminSession ? "Admin \u00b7 Back to dashboard" : "Switch class"}
      onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} />
  );
}

function AdminDashboard({ registry, onEnterClass, onCreate, onRefresh, onLogout, onRestore }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const activeClasses = registry.filter((c) => !c.archived);
  const archivedClasses = registry.filter((c) => c.archived);

  useEffect(() => { onRefresh(); }, []); // eslint-disable-line

  const submitCreate = async () => {
    if (!newName.trim() || !newPw.trim()) return;
    await onCreate(newName.trim(), newPw.trim());
    setNewName(""); setNewPw(""); setShowCreate(false);
    onRefresh();
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="display-font text-2xl font-bold text-stone-900">Admin Dashboard</h1>
          <button onClick={onLogout} className="text-xs font-semibold text-stone-400 hover:text-red-500">Log out</button>
        </div>
        <p className="text-stone-500 text-sm mb-6">Every class in the school. Tap one to open it with full access.</p>

        {activeClasses.length === 0 && <p className="text-stone-400 text-sm text-center py-10 bg-white rounded-xl border border-stone-200">No classes yet.</p>}
        <ul className="space-y-2 mb-6">
          {activeClasses.map((cls) => (
            <li key={cls.id}>
              <button onClick={() => onEnterClass(cls)} className="w-full text-left bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-semibold text-stone-800 hover:border-slate-300 flex items-center justify-between">
                {cls.name}
                <ArrowRight size={14} className="text-stone-300" />
              </button>
            </li>
          ))}
        </ul>

        {archivedClasses.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-stone-400 uppercase mb-2">Archived</p>
            <ul className="space-y-2">
              {archivedClasses.map((cls) => (
                <li key={cls.id} className="flex items-center justify-between bg-stone-100 rounded-xl px-4 py-3">
                  <span className="text-sm text-stone-500">{cls.name}</span>
                  <button onClick={() => onRestore(cls.id)} className="text-xs font-semibold text-slate-700 hover:text-slate-900">Restore</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showCreate ? (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-800 mb-3">Create a new class</p>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Class name" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Set a password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={submitCreate} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Create class</button>
              <button onClick={() => setShowCreate(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="w-full text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl">
            <Plus size={12} /> Create a new class
          </button>
        )}

        <p className="text-[10px] text-stone-400 text-center mt-6 leading-relaxed">
          Entering a class here gives full access to that class's data, same as its teacher sees \u2014 this is a soft admin gate, not enforced security.
        </p>
      </div>
    </div>
  );
}

function ClassGateScreen({ registry, onSelect, onCreate, onRefresh, onLoginAdmin }) {
  const [pendingClass, setPendingClass] = useState(null);
  const [pwInput, setPwInput] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(registry.length === 0);
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => { onRefresh(); }, []); // eslint-disable-line

  const tryUnlock = () => {
    if (!pendingClass) return;
    if (pwInput === pendingClass.password) onSelect(pendingClass);
    else setError("That password doesn't match. Try again.");
  };

  const submitCreate = async () => {
    if (!newName.trim() || !newPw.trim()) return;
    const cls = await onCreate(newName.trim(), newPw.trim());
    onSelect(cls);
  };

  const tryAdminLogin = async () => {
    if (!adminPw.trim()) return;
    const result = await onLoginAdmin(adminPw.trim());
    if (!result.ok) setAdminError("That admin password doesn't match. Try again.");
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full">
        <img src="/logo-transparent.png" alt="Classroom Tracker" className="w-56 mx-auto mb-4" />
        <p className="text-stone-500 text-sm text-center mb-6">Select your class to continue</p>

        {!showCreate && registry.filter((c) => !c.archived).length > 0 && (
          <div className="space-y-2 mb-4">
            {registry.filter((c) => !c.archived).map((cls) => (
              <button key={cls.id} onClick={() => { setPendingClass(cls); setError(""); setPwInput(""); }}
                className={`w-full text-left bg-white border rounded-xl px-4 py-3 text-sm font-semibold text-stone-800 hover:border-slate-300 ${pendingClass?.id === cls.id ? "border-slate-500" : "border-stone-200"}`}>
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {pendingClass && !showCreate && (
          <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-stone-800 mb-2">Password for {pendingClass.name}</p>
            <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" placeholder="Class password" />
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button onClick={tryUnlock} className="w-full bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Enter</button>
          </div>
        )}

        {showCreate ? (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-800 mb-3">{registry.length === 0 ? "Create the first class" : "Create a new class"}</p>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Class name (e.g. Grade 1)" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Set a password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={submitCreate} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Create class</button>
              {registry.length > 0 && <button onClick={() => setShowCreate(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>}
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowCreate(true); setPendingClass(null); }} className="w-full text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 mt-2 py-2">
            <Plus size={12} /> Create a new class
          </button>
        )}

        <p className="text-[10px] text-stone-400 text-center mt-6 leading-relaxed">
          This password is a simple gate to keep classes organized — it isn't real security. Don't rely on it to protect sensitive information from someone determined to bypass it.
        </p>

        <div className="mt-6 pt-4 border-t border-stone-200">
          {!showAdminLogin ? (
            <button onClick={() => setShowAdminLogin(true)} className="w-full text-xs font-semibold text-stone-400 hover:text-slate-700 text-center">
              Administration login
            </button>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-stone-800 mb-2">Administration</p>
              <input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryAdminLogin()}
                placeholder="Admin password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
              {adminError && <p className="text-xs text-red-500 mb-2">{adminError}</p>}
              <button onClick={tryAdminLogin} className="w-full bg-stone-800 text-white rounded-lg py-2 text-sm font-semibold hover:bg-stone-900">Enter as admin</button>
              <p className="text-[10px] text-stone-400 mt-2">If no admin password has been set yet, whatever you enter here becomes it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassApp({ classId, className, onSwitchClass, switchLabel, onRenameClass, onChangePassword, onArchiveClass }) {
  const loadC = useCallback((key, fallback) => loadJSON(`class:${classId}:${key}`, fallback, true), [classId]);
  const saveC = useCallback((key, value) => saveJSON(`class:${classId}:${key}`, value, true), [classId]);

  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [studentData, setStudentData] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [classAssessments, setClassAssessments] = useState([]);
  const [classPoints, setClassPoints] = useState({});
  const [monthlyReportState, setMonthlyReportState] = useState({ dismissedMonth: null });
  const [plannerDays, setPlannerDays] = useState({});
  const [plannerEvents, setPlannerEvents] = useState([]);
  const [benchmarkSubjects, setBenchmarkSubjects] = useState([]);
  const [behaviorLogData, setBehaviorLogData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [view, setView] = useState("home");
  const [currentId, setCurrentId] = useState(null);
  const [sessionCat, setSessionCat] = useState(null);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [incidentPreset, setIncidentPreset] = useState(null);
  const [incidentReturn, setIncidentReturn] = useState("home");
  const [periodAttPreset, setPeriodAttPreset] = useState(null);
  const [periodAttReturn, setPeriodAttReturn] = useState("home");
  const [messageFlag, setMessageFlag] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedFluencyEntry, setSelectedFluencyEntry] = useState(null);
  const [selectedSkillCat, setSelectedSkillCat] = useState(null);
  const [selectedSkillReportCat, setSelectedSkillReportCat] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await loadC("roster", []);
      const c = await loadC("config", DEFAULT_CONFIG);
      const inc = await loadC("incidents", []);
      const ca = await loadC("classAssessments", []);
      const cp = await loadC("classPoints", {});
      const mrs = await loadC("monthlyReportState", { dismissedMonth: null });
      const pd = await loadC("plannerDays", {});
      const pe = await loadC("plannerEvents", []);
      const bs = await loadC("benchmarkSubjects", []);
      const bl = await loadC("behaviorLogData", {});
      const al = await loadC("alerts", []);
      const initialized = await loadC("appInitialized", false);

      let finalRoster = r, finalConfig = c, finalIncidents = inc, finalCA = ca, finalCP = cp, finalPD = pd, finalPE = pe, finalBS = bs;
      let sampleStudentData = null;

      if (!initialized && r.length === 0) {
        const sample = buildSampleData();
        finalRoster = sample.roster;
        finalIncidents = sample.incidents;
        finalCA = sample.classAssessments;
        finalCP = sample.classPoints;
        finalPD = sample.plannerDays;
        finalPE = sample.plannerEvents;
        finalBS = sample.benchmarkSubjects;
        const basePoints = c.points || DEFAULT_CONFIG.points;
        const baseCategories = (c.categories || DEFAULT_CONFIG.categories).map((cat) => cat.id === "lname" ? { ...cat, active: true } : cat);
        const basePlanner = c.planner || DEFAULT_CONFIG.planner;
        finalConfig = {
          ...c, categories: baseCategories,
          points: { ...basePoints, categories: [...(basePoints.categories || []), sample.pointsCategory] },
          planner: { ...basePlanner, fullDaySchedule: sample.sampleSchedule },
        };
        sampleStudentData = sample.studentData;
        await saveC("roster", finalRoster);
        await saveC("incidents", finalIncidents);
        await saveC("classAssessments", finalCA);
        await saveC("classPoints", finalCP);
        await saveC("plannerDays", finalPD);
        await saveC("plannerEvents", finalPE);
        await saveC("benchmarkSubjects", finalBS);
        await saveC("config", finalConfig);
        for (const [sid, sd] of Object.entries(sampleStudentData)) await saveC(`kriya:${sid}`, sd);
      }
      if (!initialized) await saveC("appInitialized", true);

      setRoster(finalRoster);
      const mergedPoints = { ...DEFAULT_CONFIG.points, ...(finalConfig.points || {}), behaviorLog: { ...DEFAULT_CONFIG.points.behaviorLog, ...((finalConfig.points || {}).behaviorLog || {}) } };
      setConfig({ ...DEFAULT_CONFIG, ...finalConfig, points: mergedPoints, monthlyReports: finalConfig.monthlyReports || DEFAULT_CONFIG.monthlyReports, planner: finalConfig.planner || DEFAULT_CONFIG.planner });
      setIncidents(finalIncidents);
      setClassAssessments(finalCA);
      setClassPoints(finalCP);
      setMonthlyReportState(mrs);
      setPlannerDays(finalPD);
      setPlannerEvents(finalPE);
      setBenchmarkSubjects(finalBS);
      setBehaviorLogData(bl);
      setAlerts(al);
      const dataMap = {};
      for (const s of finalRoster) {
        if (sampleStudentData && sampleStudentData[s.id]) { dataMap[s.id] = sampleStudentData[s.id]; continue; }
        const d = await loadC(`kriya:${s.id}`, emptyStudentData());
        dataMap[s.id] = { ...emptyStudentData(), ...d };
      }
      setStudentData(dataMap);
      setLoading(false);
    })();
  }, [classId]);

  const persistConfig = (next) => { setConfig(next); saveC("config", next); };
  const persistStudent = (id, newData) => { setStudentData((prev) => ({ ...prev, [id]: newData })); saveC(`kriya:${id}`, newData); };
  const persistIncidents = (next) => { setIncidents(next); saveC("incidents", next); };
  const persistClassAssessments = (next) => { setClassAssessments(next); saveC("classAssessments", next); };
  const persistClassPoints = (next) => { setClassPoints(next); saveC("classPoints", next); };
  const persistMonthlyReportState = (next) => { setMonthlyReportState(next); saveC("monthlyReportState", next); };
  const persistPlannerDays = (next) => { setPlannerDays(next); saveC("plannerDays", next); };
  const persistPlannerEvents = (next) => { setPlannerEvents(next); saveC("plannerEvents", next); };
  const persistRoster = (next) => { setRoster(next); saveC("roster", next); };

  const setPlannerDay = (dateStr, fields) => {
    const existing = plannerDays[dateStr] || {};
    persistPlannerDays({ ...plannerDays, [dateStr]: { ...existing, ...fields } });
  };
  const clearPlannerDayType = (dateStr) => {
    const existing = plannerDays[dateStr] || {};
    persistPlannerDays({ ...plannerDays, [dateStr]: { ...existing, dayType: null } });
  };
  const bulkSetByWeekday = (weekdays, dayType, startStr, endStr) => {
    const next = { ...plannerDays };
    for (const d of eachDateInRange(startStr, endStr)) {
      const wd = new Date(d + "T00:00:00").getDay();
      if (weekdays.includes(wd)) next[d] = { ...(next[d] || {}), dayType };
    }
    persistPlannerDays(next);
  };
  const bulkSetByRange = (dayType, startStr, endStr) => {
    const next = { ...plannerDays };
    for (const d of eachDateInRange(startStr, endStr)) next[d] = { ...(next[d] || {}), dayType };
    persistPlannerDays(next);
  };

  const importSchoolCalendar = () => {
    // Ensure a "Late Start" day type exists (Shushan Purim needs it; nothing else in the app currently has one).
    if (!config.planner.dayTypes.some((t) => t.id === "late-start")) {
      persistConfig({
        ...config,
        planner: { ...config.planner, dayTypes: [...config.planner.dayTypes, { id: "late-start", label: "Late Start", color: "sky", hidesAttendance: false, scheduleTemplate: "half" }] },
      });
    }
    const YEAR_START = "2026-08-19", YEAR_END = "2027-06-16";
    let next = { ...plannerDays };
    const setRange = (dayType, start, end) => { for (const d of eachDateInRange(start, end)) next[d] = { ...(next[d] || {}), dayType }; };
    const setWeekdays = (weekdays, dayType, start, end) => {
      for (const d of eachDateInRange(start, end)) {
        const wd = new Date(d + "T00:00:00").getDay();
        if (weekdays.includes(wd)) next[d] = { ...(next[d] || {}), dayType };
      }
    };
    // Default: every weekday in the school year is a School Day, every weekend is No School —
    // then the specific breaks/holidays below override on top of that.
    setWeekdays([1, 2, 3, 4, 5], "school", YEAR_START, YEAR_END);
    setWeekdays([0, 6], "no-school", YEAR_START, YEAR_END);

    setRange("no-school", "2026-09-11", "2026-09-11");   // Erev Rosh Hashana
    setRange("half-day", "2026-09-14", "2026-09-14");    // Fast of Gedalia — early dismissal
    setRange("no-school", "2026-09-21", "2026-09-21");   // Yom Kippur
    setRange("no-school", "2026-09-25", "2026-09-25");   // Erev Sukkos
    setRange("no-school", "2026-09-28", "2026-10-05");   // Sukkos / Shmini Atzeres — K-8 (Gan opens earlier, not relevant here)
    setRange("no-school", "2026-12-28", "2027-01-01");   // Winter Break
    setRange("no-school", "2027-02-11", "2027-02-15");   // February Break
    setRange("half-day", "2027-03-22", "2027-03-22");    // Taanis Esther — early dismissal
    setRange("no-school", "2027-03-23", "2027-03-23");   // Purim
    setRange("late-start", "2027-03-24", "2027-03-24");  // Shushan Purim — late start
    setRange("no-school", "2027-04-16", "2027-04-30");   // Passover Break
    setRange("half-day", "2027-06-10", "2027-06-10");    // Erev Shavuos — early dismissal
    setRange("no-school", "2027-06-11", "2027-06-11");   // Shavuos

    persistPlannerDays(next);
    addPlannerEvent({ date: "2027-05-25", title: "Lag B'Omer — school-wide celebration", reminderLeadDays: 3 });
  };

  const addPlannerEvent = (entry) => persistPlannerEvents([{ id: uid(), ...entry }, ...plannerEvents]);
  const removePlannerEvent = (id) => persistPlannerEvents(plannerEvents.filter((e) => e.id !== id));

  const persistBenchmarkSubjects = (next) => { setBenchmarkSubjects(next); saveC("benchmarkSubjects", next); };
  const addBenchmarkSubject = (label) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;
    persistBenchmarkSubjects([...benchmarkSubjects, { id: uid(), label: trimmed, segments: [] }]);
  };
  const removeBenchmarkSubject = (id) => persistBenchmarkSubjects(benchmarkSubjects.filter((s) => s.id !== id));
  const addBenchmarkSegment = (subjectId, segment) => {
    persistBenchmarkSubjects(benchmarkSubjects.map((s) => s.id === subjectId ? { ...s, segments: [...s.segments, { id: uid(), ...segment }] } : s));
  };
  const updateBenchmarkSegment = (subjectId, segmentId, fields) => {
    persistBenchmarkSubjects(benchmarkSubjects.map((s) => s.id !== subjectId ? s : {
      ...s, segments: s.segments.map((seg) => seg.id === segmentId ? { ...seg, ...fields } : seg),
    }));
  };
  const removeBenchmarkSegment = (subjectId, segmentId) => {
    persistBenchmarkSubjects(benchmarkSubjects.map((s) => s.id !== subjectId ? s : { ...s, segments: s.segments.filter((seg) => seg.id !== segmentId) }));
  };

  const persistBehaviorLogData = (next) => { setBehaviorLogData(next); saveC("behaviorLogData", next); };
  const adjustBehaviorMark = (date, periodId, markId, delta) => {
    const dayEntry = behaviorLogData[date] || {};
    const periodEntry = dayEntry[periodId] || {};
    const current = periodEntry[markId] || 0;
    const next = Math.max(0, current + delta);
    persistBehaviorLogData({
      ...behaviorLogData,
      [date]: { ...dayEntry, [periodId]: { ...periodEntry, [markId]: next } },
    });
  };

  const loadSampleData = () => {
    const sample = buildSampleData();
    persistRoster(sample.roster);
    setStudentData(sample.studentData);
    for (const [sid, sd] of Object.entries(sample.studentData)) saveC(`kriya:${sid}`, sd);
    persistIncidents(sample.incidents);
    persistClassAssessments(sample.classAssessments);
    persistClassPoints(sample.classPoints);
    persistPlannerDays(sample.plannerDays);
    persistPlannerEvents(sample.plannerEvents);
    persistBenchmarkSubjects(sample.benchmarkSubjects);
    persistConfig({
      ...config,
      categories: config.categories.map((cat) => (cat.id === "lname" ? { ...cat, active: true } : cat)),
      points: { ...config.points, categories: [...(config.points.categories || []), sample.pointsCategory] },
      planner: { ...config.planner, fullDaySchedule: sample.sampleSchedule },
    });
  };

  const clearAllData = () => {
    persistRoster([]);
    setStudentData({});
    persistIncidents([]);
    persistClassAssessments([]);
    persistClassPoints({});
    persistPlannerDays({});
    persistPlannerEvents([]);
    persistBenchmarkSubjects([]);
    persistBehaviorLogData({});
  };

  const addCommunication = (studentId, entry) => {
    const data = studentData[studentId];
    persistStudent(studentId, { ...data, communications: [{ id: uid(), ...entry }, ...(data.communications || [])] });
  };

  const addStudent = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const id = uid();
    persistRoster([...roster, { id, name: trimmed, parentEmail: "", parentPhone: "", notes: "" }]);
    setStudentData((prev) => ({ ...prev, [id]: emptyStudentData() }));
  };

  const removeStudent = (id) => {
    persistRoster(roster.filter((s) => s.id !== id));
    if (currentId === id) { setView("home"); setCurrentId(null); }
  };

  const updateStudentField = (id, field, value) => {
    persistRoster(roster.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const persistAlerts = (next) => { setAlerts(next); saveC("alerts", next); };
  const upsertAlert = (studentId, type, message) => {
    setAlerts((prev) => {
      const existing = prev.find((a) => a.studentId === studentId && a.type === type && !a.dismissed);
      const next = existing
        ? prev.map((a) => (a === existing ? { ...a, message, date: todayISO() } : a))
        : [{ id: uid(), studentId, type, message, date: todayISO(), dismissed: false }, ...prev];
      saveC("alerts", next);
      return next;
    });
  };
  const dismissAlert = (alertId) => persistAlerts(alerts.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a)));

  const gradeItem = useCallback((catId, itemId, result) => {
    const id = currentId;
    const data = studentData[id] || emptyStudentData();
    const key = skillKey(catId, itemId);
    const existing = data.skills[key] || { history: [] };
    const history = [...existing.history, { date: todayISO(), result }];
    const { status, streak } = computeSkillStatus(history, config);
    const flagCount = status === "flagged" ? streak - config.flagThreshold + 1 : 0;
    const newSkills = { ...data.skills, [key]: { history, status, flagCount } };
    persistStudent(id, { ...data, skills: newSkills });
    if (status === "flagged") {
      const cat = config.categories.find((c) => c.id === catId);
      const item = cat?.items.find((it) => it.id === itemId);
      const studentName = roster.find((s) => s.id === id)?.name || "Student";
      upsertAlert(id, `skill-${key}`, `${studentName} — struggling with ${item?.label || "a skill"} (${cat?.title || catId})`);
    }
  }, [currentId, config, studentData, roster, alerts]);

  const acknowledgeFlag = (studentId, key) => {
    const data = studentData[studentId];
    if (key.startsWith("skill-")) {
      const skillK = key.replace("skill-", "");
      const skill = data.skills[skillK];
      const newSkills = { ...data.skills, [skillK]: { ...skill, status: "practicing", flagCount: 0 } };
      persistStudent(studentId, { ...data, skills: newSkills });
    } else if (key.startsWith("points-")) {
      const catId = key.replace("points-", "");
      const newPoints = { ...data.points, [catId]: 0 };
      persistStudent(studentId, { ...data, points: newPoints });
    }
  };

  const addFluencyEntry = (studentId, entry) => {
    const data = studentData[studentId];
    persistStudent(studentId, { ...data, fluency: [{ ...entry, date: todayISO() }, ...data.fluency] });
  };

  const addIncident = (entry) => {
    const next = [{ id: uid(), ...entry }, ...incidents];
    persistIncidents(next);
    // Fire an alert immediately if this just pushed someone over the incident-frequency threshold.
    (entry.studentIds || []).forEach((sid) => {
      const flags = getFlags(studentData[sid], sid, next, config);
      const incFlag = flags.find((f) => f.type === "incident");
      if (incFlag) {
        const studentName = roster.find((s) => s.id === sid)?.name || "Student";
        upsertAlert(sid, "incident", `${studentName} — ${incFlag.label}`);
      }
    });
  };
  const updateIncident = (incidentId, fields) => {
    persistIncidents(incidents.map((i) => (i.id === incidentId ? { ...i, ...fields } : i)));
  };

  const addPeriodAttendance = (studentIds, entry) => {
    studentIds.forEach((sid) => {
      const data = studentData[sid] || emptyStudentData();
      const next = [{ id: uid(), ...entry }, ...(data.periodAttendance || [])];
      persistStudent(sid, { ...data, periodAttendance: next });
    });
  };
  const addClassAssessment = (entry) => persistClassAssessments([{ id: uid(), ...entry }, ...classAssessments]);

  const setAttendance = (studentId, date, statusId) => {
    const data = studentData[studentId];
    const without = (data.attendance || []).filter((a) => a.date !== date);
    const prevEntry = (data.attendance || []).find((a) => a.date === date);
    const isLate = config.attendance.statuses.find((st) => st.id === statusId)?.flagType === "late";
    const defaultTime = isLate && !prevEntry?.time ? new Date().toTimeString().slice(0, 5) : (prevEntry?.time || "");
    const newData = { ...data, attendance: [...without, { date, status: statusId, time: defaultTime }] };
    persistStudent(studentId, newData);
    const flags = getFlags(newData, studentId, incidents, config);
    const attFlag = flags.find((f) => f.type === "late" || f.type === "absent");
    if (attFlag) {
      const studentName = roster.find((s) => s.id === studentId)?.name || "Student";
      upsertAlert(studentId, attFlag.type === "late" ? "attendance-late" : "attendance-absent", `${studentName} — ${attFlag.label}`);
    }
  };
  const setAttendanceTime = (studentId, date, time) => {
    const data = studentData[studentId];
    const attendance = (data.attendance || []).map((a) => (a.date === date ? { ...a, time } : a));
    persistStudent(studentId, { ...data, attendance });
  };

  const addPoints = (studentId, catId, amount) => {
    const data = studentData[studentId];
    const current = data.points?.[catId] || 0;
    const next = Math.max(0, current + amount);
    persistStudent(studentId, { ...data, points: { ...data.points, [catId]: next } });
  };
  const addClassPointsFn = (catId, amount) => {
    const current = classPoints[catId] || 0;
    persistClassPoints({ ...classPoints, [catId]: Math.max(0, current + amount) });
  };
  const resetClassPointsFn = (catId) => persistClassPoints({ ...classPoints, [catId]: 0 });
  const addPointsCategory = (cat) => {
    const next = { ...config, points: { ...config.points, categories: [...(config.points?.categories || []), cat] } };
    persistConfig(next);
  };

  const activateAssessment = (catId) => {
    persistConfig({ ...config, categories: config.categories.map((c) => (c.id === catId ? { ...c, active: true } : c)) });
  };
  const hideAssessment = (catId) => {
    persistConfig({ ...config, categories: config.categories.map((c) => (c.id === catId ? { ...c, active: false } : c)) });
  };
  const createCustomAssessment = (newCat) => {
    persistConfig({ ...config, categories: [...config.categories, { ...newCat, id: uid(), active: true }] });
  };

  const openIncidentForm = (studentId, returnTo) => { setIncidentPreset(studentId); setIncidentReturn(returnTo); setView("incident"); };
  const openPeriodAttendanceForm = (studentId, returnTo) => { setPeriodAttPreset(studentId); setPeriodAttReturn(returnTo); setView("period-attendance"); };
  const todaysScheduleForForm = (() => {
    const entry = plannerDays?.[todayISO()];
    const dayType = (config.planner?.dayTypes || []).find((t) => t.id === entry?.dayType);
    if (!dayType) return null;
    if (dayType.scheduleTemplate === "full") return config.planner?.fullDaySchedule || [];
    if (dayType.scheduleTemplate === "half") return config.planner?.halfDaySchedule || [];
    return null;
  })();
  const openMessageDraft = (flag) => { setMessageFlag(flag); setView("message-draft"); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-slate-700" size={28} /></div>;
  }

  return (
    <ClassContext.Provider value={{ className, onSwitchClass, switchLabel }}>
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Work+Sans:wght@400;500;600&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .display-font { font-family: 'Fraunces', serif; }
        .heb-font { font-family: 'Frank Ruhl Libre', serif; }

        /* Structural layout guarantees — written by hand so these never depend on
           dynamic utility-CSS generation keeping pace with React's render cycle. */
        .flex { display: flex; }
        .inline-flex { display: inline-flex; }
        .grid { display: grid; }
        .hidden { display: none; }
        .block { display: block; }
        .flex-wrap { flex-wrap: wrap; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1 1 0%; }
        .shrink-0 { flex-shrink: 0; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .items-end { align-items: flex-end; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .justify-end { justify-content: flex-end; }
        .ml-auto { margin-left: auto; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
        .gap-0\\.5 { gap: 0.125rem; } .gap-1 { gap: 0.25rem; } .gap-1\\.5 { gap: 0.375rem; }
        .gap-2 { gap: 0.5rem; } .gap-3 { gap: 0.75rem; } .gap-4 { gap: 1rem; } .gap-6 { gap: 1.5rem; }
        .gap-x-3 { column-gap: 0.75rem; } .gap-x-6 { column-gap: 1.5rem; }
        .gap-y-2 { row-gap: 0.5rem; }
        .space-y-0 > * + * { margin-top: 0; } .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
        .space-y-1 > * + * { margin-top: 0.25rem; } .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; } .space-y-3 > * + * { margin-top: 0.75rem; } .space-y-4 > * + * { margin-top: 1rem; }
        .sticky { position: sticky; } .fixed { position: fixed; } .relative { position: relative; } .absolute { position: absolute; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .overflow-hidden { overflow: hidden; } .overflow-y-auto { overflow-y: auto; }
        .whitespace-nowrap { white-space: nowrap; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .content-shift { transition: margin-right 300ms ease-in-out; }
        .content-shift.open { margin-right: 100%; }
        @media (min-width: 640px) { .content-shift.open { margin-right: 24rem; } }
        @media (min-width: 1024px) { .content-shift.open { margin-right: 50%; } }
        /* Page width containers — hand-written so the app actually widens on real
           tablet/desktop screens, instead of depending on responsive utility classes
           that may not reliably generate at every breakpoint. */
        .app-page { max-width: 28rem; margin-left: auto; margin-right: auto; padding: 1.5rem 1rem; }
        @media (min-width: 768px) { .app-page { max-width: 48rem; padding-left: 2rem; padding-right: 2rem; } }
        @media (min-width: 1024px) { .app-page { max-width: 64rem; } }
        .app-page-wide { max-width: 28rem; margin-left: auto; margin-right: auto; padding: 1.5rem 1rem; }
        @media (min-width: 768px) { .app-page-wide { max-width: 48rem; padding-left: 2rem; padding-right: 2rem; } }
        @media (min-width: 1024px) { .app-page-wide { max-width: 80rem; } }
        @media (min-width: 1536px) { .app-page-wide { max-width: 100rem; } }
        @media (min-width: 640px) { .sm\\:w-96 { width: 24rem; } }
        @media (min-width: 768px) {
          .md\\:flex { display: flex; } .md\\:grid { display: grid; } .md\\:hidden { display: none; }
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .md\\:items-start { align-items: flex-start; }
          .md\\:col-span-2 { grid-column: span 2 / span 2; }
          .md\\:mb-0 { margin-bottom: 0; } .md\\:mt-0 { margin-top: 0; }
          .md\\:space-y-0 > * + * { margin-top: 0; }
        }
        @media (min-width: 1024px) {
          .lg\\:hidden { display: none; }
          .lg\\:w-1\\/2 { width: 50%; }
          .lg\\:mr-\\[50\\%\\] { margin-right: 50%; }
          .lg\\:sticky { position: sticky; } .lg\\:top-6 { top: 1.5rem; }
        }
      `}</style>

      {view === "home" && (
        <HomeView roster={roster} studentData={studentData} incidents={incidents} config={config}
          removeStudent={removeStudent}
          setAttendance={setAttendance} setAttendanceTime={setAttendanceTime}
          openDetail={(id) => { setCurrentId(id); setView("detail"); }}
          openIncidentForm={(id) => openIncidentForm(id, "home")} openPeriodAttendance={(id) => openPeriodAttendanceForm(id, "home")} navigate={setView}
          monthlyReportState={monthlyReportState}
          onDismissMonthlyReminder={(key) => persistMonthlyReportState({ ...monthlyReportState, dismissedMonth: key })}
          plannerDays={plannerDays} plannerEvents={plannerEvents}
          setPlannerDay={setPlannerDay} addPoints={addPoints} behaviorLogData={behaviorLogData}
          alerts={alerts} dismissAlert={dismissAlert} />
      )}

      {view === "day-recap" && (
        <DayRecapView roster={roster} studentData={studentData} incidents={incidents} behaviorLogData={behaviorLogData}
          plannerDays={plannerDays} config={config} onBack={() => setView("home")} />
      )}

      {view === "communication" && (
        <CommunicationListView roster={roster} studentData={studentData} navigate={setView}
          openStudent={(id) => { setCurrentId(id); setView("comm-entry"); }} />
      )}

      {view === "comm-entry" && currentId && (
        <CommunicationEntryView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          onBack={() => setView("communication")} onAddEntry={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "monthly-reports" && (
        <MonthlyReportsView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config}
          onBack={() => setView("home")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "range-report" && (
        <CustomRangeReportView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config}
          onBack={() => setView("communication")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "assessments" && (
        <AssessmentsListView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config}
          openStudent={(id) => { setCurrentId(id); setView("assessment-entry"); }}
          openClassAssessment={() => setView("class-assessment-form")}
          openAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          openSkillCategoryReport={(catId) => { setSelectedSkillReportCat(catId); setView("skill-category-report"); }}
          activateAssessment={activateAssessment} hideAssessment={hideAssessment} createCustomAssessment={createCustomAssessment}
          navigate={setView} />
      )}

      {view === "assessment-report" && selectedAssessmentId && (
        <AssessmentReportView assessment={classAssessments.find((ca) => ca.id === selectedAssessmentId)} roster={roster}
          onBack={() => setView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "skill-category-report" && selectedSkillReportCat && (
        <SkillCategoryReportView category={config.categories.find((c) => c.id === selectedSkillReportCat)} roster={roster} studentData={studentData} config={config}
          onBack={() => setView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "points" && (
        <PointsView roster={roster} studentData={studentData} classPoints={classPoints} config={config}
          addPoints={addPoints} addClassPoints={addClassPointsFn} resetClassPoints={resetClassPointsFn}
          onAddCategory={addPointsCategory} navigate={setView}
          plannerDays={plannerDays} behaviorLogData={behaviorLogData} adjustBehaviorMark={adjustBehaviorMark} />
      )}

      {view === "planner" && (
        <PlannerView config={config} plannerDays={plannerDays} plannerEvents={plannerEvents} navigate={setView}
          setPlannerDay={setPlannerDay} clearPlannerDayType={clearPlannerDayType}
          bulkSetByWeekday={bulkSetByWeekday} bulkSetByRange={bulkSetByRange}
          addPlannerEvent={addPlannerEvent} removePlannerEvent={removePlannerEvent}
          importSchoolCalendar={importSchoolCalendar}
          benchmarkSubjects={benchmarkSubjects} addBenchmarkSubject={addBenchmarkSubject}
          removeBenchmarkSubject={removeBenchmarkSubject} addBenchmarkSegment={addBenchmarkSegment}
          updateBenchmarkSegment={updateBenchmarkSegment} removeBenchmarkSegment={removeBenchmarkSegment} />
      )}

      {view === "class-assessment-form" && (
        <ClassAssessmentForm roster={roster} onCancel={() => setView("assessments")}
          onSave={(entry) => { addClassAssessment(entry); setView("assessments"); }} />
      )}

      {view === "assessment-entry" && currentId && (
        <AssessmentEntryView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]} config={config} classAssessments={classAssessments}
          onBack={() => setView("assessments")}
          onStartSession={(catId) => { setSessionCat(catId); setSessionIdx(0); setView("session"); }}
          onLogFluency={() => setView("fluency")}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          onOpenFluencyDetail={(entry) => { setSelectedFluencyEntry(entry); setView("fluency-detail"); }}
          onOpenSkillDetail={(catId) => { setSelectedSkillCat(catId); setView("skill-detail"); }} />
      )}

      {view === "detail" && currentId && (
        <StudentDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          incidents={incidents} classAssessments={classAssessments} config={config}
          onBack={() => setView("home")} onAcknowledge={(key) => acknowledgeFlag(currentId, key)}
          onLogIncident={() => openIncidentForm(currentId, "detail")} onLogPeriodAttendance={() => openPeriodAttendanceForm(currentId, "detail")} onGoToAssessments={() => setView("assessment-entry")}
          onDraftMessage={openMessageDraft} onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onUpdateField={(field, value) => updateStudentField(currentId, field, value)}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          onOpenFluencyDetail={(entry) => { setSelectedFluencyEntry(entry); setView("fluency-detail"); }}
          onOpenSkillDetail={(catId) => { setSelectedSkillCat(catId); setView("skill-detail"); }}
          onOpenIncidentDetail={(id) => { setSelectedIncidentId(id); setView("incident-detail"); }} />
      )}

      {view === "incident-detail" && selectedIncidentId && (
        <IncidentDetailView incident={incidents.find((i) => i.id === selectedIncidentId)} roster={roster} config={config}
          onBack={() => setView(currentId ? "detail" : "home")}
          onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(studentId, email) => updateStudentField(studentId, "parentEmail", email)}
          onUpdateIncident={updateIncident} />
      )}

      {view === "fluency-detail" && currentId && selectedFluencyEntry && (
        <FluencyDetailView student={roster.find((s) => s.id === currentId)} entry={selectedFluencyEntry}
          onBack={() => setView("detail")} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "skill-detail" && currentId && selectedSkillCat && (
        <SkillDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          category={config.categories.find((c) => c.id === selectedSkillCat)} config={config}
          onBack={() => setView("detail")} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "session" && currentId && sessionCat && (
        <SessionView category={config.categories.find((c) => c.id === sessionCat)} config={config}
          idx={sessionIdx} setIdx={setSessionIdx}
          onGrade={(itemId, result) => gradeItem(sessionCat, itemId, result)}
          onFinish={() => setView("assessment-entry")} />
      )}

      {view === "fluency" && currentId && (
        <FluencyForm student={roster.find((s) => s.id === currentId)} onCancel={() => setView("assessment-entry")}
          onSave={(entry) => { addFluencyEntry(currentId, entry); setView("assessment-entry"); }} />
      )}

      {view === "incident" && (
        <IncidentForm roster={roster} config={config} presetId={incidentPreset}
          onCancel={() => setView(incidentReturn)}
          onSave={(entry) => { addIncident(entry); setView(incidentReturn); }} />
      )}

      {view === "period-attendance" && (
        <PeriodAttendanceForm roster={roster} config={config} presetId={periodAttPreset} todaysPeriods={todaysScheduleForForm}
          onCancel={() => setView(periodAttReturn)}
          onSave={(studentIds, entry) => { addPeriodAttendance(studentIds, entry); setView(periodAttReturn); }} />
      )}

      {view === "message-draft" && currentId && messageFlag && (
        <MessageDraftView student={roster.find((s) => s.id === currentId)} flag={messageFlag}
          onBack={() => setView("detail")} onSaveParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onLogSent={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "settings" && (
        <SettingsView config={config} setConfig={persistConfig} onBack={() => setView("home")}
          roster={roster} addStudent={addStudent} removeStudent={removeStudent} updateStudentField={updateStudentField}
          loadSampleData={loadSampleData} clearAllData={clearAllData}
          className={className} onRenameClass={onRenameClass} onChangePassword={onChangePassword} onArchiveClass={onArchiveClass} />
      )}
    </div>
    </ClassContext.Provider>
  );
}

// ---------- Shared header / nav ----------

function Header({ navigate }) {
  const { className, onSwitchClass, switchLabel } = useContext(ClassContext);
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <img src="/logo-transparent.png" alt="" className="w-11 h-11 object-contain shrink-0" />
        <div>
          <h1 className="display-font text-2xl font-bold text-stone-900">Classroom Tracker</h1>
          {className && (
            <button onClick={onSwitchClass} className="text-xs text-stone-400 hover:text-slate-700">{className} · {switchLabel || "Switch class"}</button>
          )}
        </div>
      </div>
      <button onClick={() => navigate("settings")} className="text-stone-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-stone-100">
        <SettingsIcon size={18} />
      </button>
    </div>
  );
}

function MainTabs({ active, navigate }) {
  const tabs = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "assessments", label: "Assessments", icon: BookOpen },
    { id: "points", label: "Points", icon: Star },
    { id: "communication", label: "Comm", icon: Mail },
    { id: "planner", label: "Planner", icon: Calendar },
  ];
  return (
    <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 md:w-[36rem] overflow-x-auto">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => navigate(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold whitespace-nowrap px-1 ${isActive ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>
            <Icon size={14} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Home ----------

function HomeView({ roster, studentData, incidents, config, removeStudent, setAttendance, setAttendanceTime, openDetail, openIncidentForm, openPeriodAttendance, navigate, monthlyReportState, onDismissMonthlyReminder, plannerDays, plannerEvents, setPlannerDay, addPoints, behaviorLogData, alerts, dismissAlert }) {
  const [date, setDate] = useState(todayISO());
  const [showPlan, setShowPlan] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedAttendance, setExpandedAttendance] = useState([]);
  useEffect(() => { setExpandedAttendance([]); }, [date]);
  const statusMap = {};
  config.attendance.statuses.forEach((s) => (statusMap[s.id] = s));

  const now = new Date();
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth());
  const reminderDate = shabbosAwareReminderDate(now.getFullYear(), now.getMonth(), config.monthlyReports?.dayOfMonth || 25, config.monthlyReports?.avoidFriday);
  const reminderDue = now >= reminderDate && monthlyReportState?.dismissedMonth !== thisMonthKey;

  const todayStr = todayISO();
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const selectedDayType = plannerDays?.[date]?.dayType ? dayTypeMap[plannerDays[date].dayType] : null;
  const attendanceHidden = selectedDayType?.hidesAttendance;

  const upcomingEvents = (plannerEvents || []).filter((e) => {
    if (!e.reminderLeadDays && e.reminderLeadDays !== 0) return false;
    const remindFrom = addDaysISO(e.date, -e.reminderLeadDays);
    return todayStr >= remindFrom && todayStr <= e.date;
  }).sort((a, b) => (a.date < b.date ? -1 : 1));

  const individualPointCats = (config.points?.categories || []).filter((c) => c.scope === "individual");

  return (
    <div className="app-page-wide">
      <Header navigate={navigate} />
      <div className="flex items-center justify-between gap-2 md:w-full">
        <MainTabs active="home" navigate={navigate} />
        <button onClick={() => setShowPlan((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50 mb-5">
          <Calendar size={13} /> Class Tools
        </button>
      </div>

      {alerts.filter((a) => !a.dismissed).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm font-semibold text-rose-900 mb-2">Needs attention</p>
          <ul className="space-y-1.5">
            {alerts.filter((a) => !a.dismissed).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-rose-800">{a.message}</span>
                <button onClick={() => dismissAlert(a.id)} className="shrink-0 text-[10px] font-semibold text-rose-600 border border-rose-300 rounded-full px-2 py-1 hover:bg-rose-100">Dismiss</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reminderDue && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-900">Monthly reports are ready to generate</p>
            <p className="text-xs text-slate-700">For {monthLabel(now.getFullYear(), now.getMonth())} — review and send whenever you're ready.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("monthly-reports")} className="text-xs font-semibold bg-slate-700 text-white rounded-lg px-3 py-1.5 hover:bg-slate-800">Generate now</button>
            <button onClick={() => onDismissMonthlyReminder(thisMonthKey)} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100">Dismiss</button>
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5 mb-1"><Bell size={14} /> Upcoming</p>
          <ul className="space-y-0.5">
            {upcomingEvents.map((e) => <li key={e.id} className="text-xs text-amber-800">{e.date} — {e.title}</li>)}
          </ul>
        </div>
      )}

      <div className={`content-shift ${showPlan ? "open" : ""}`}>
        <div className="w-full">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Attendance for</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </div>
            {selectedDayType && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-full bg-${selectedDayType.color}-100 text-${selectedDayType.color}-700`}>
                {selectedDayType.label}
              </span>
            )}
          </div>

          <div>
            {roster.length === 0 && <p className="text-stone-400 text-sm text-center py-10">No students yet. Add students from Settings.</p>}
            {attendanceHidden && (
              <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center mb-3">
                {selectedDayType.label} — attendance isn't applicable for this date.
              </p>
            )}
            {roster.length > 0 && (
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {individualPointCats.length > 0 && (
                    <button onClick={() => { setMultiSelect((v) => !v); setSelectedIds([]); }} className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      {multiSelect ? "Done selecting" : "Select multiple students"}
                    </button>
                  )}
                  <button onClick={() => openPeriodAttendance(null)} className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <Calendar size={12} /> Log period attendance
                  </button>
                </div>
                {multiSelect && selectedIds.length > 0 && <span className="text-xs text-stone-400">{selectedIds.length} selected</span>}
              </div>
            )}
            <ul className="space-y-2">
              {roster.map((s) => {
                const entry = (studentData[s.id]?.attendance || []).find((a) => a.date === date);
                const isLateType = entry?.status && statusMap[entry.status]?.flagType === "late";
                const flags = getFlags(studentData[s.id], s.id, incidents, config);
                const isSelected = selectedIds.includes(s.id);
                const isExpanded = expandedAttendance.includes(s.id);
                const showFullPicker = !entry || isExpanded;
                return (
                  <li key={s.id} className={`bg-white rounded-xl border px-3 py-2 ${isSelected ? "border-slate-400 ring-1 ring-slate-200" : "border-stone-200"}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {multiSelect && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds((prev) => (isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]))}
                          className="w-4 h-4 shrink-0" />
                      )}
                      <button onClick={() => openDetail(s.id)} className="font-medium text-stone-800 text-sm hover:text-slate-700 flex items-center gap-1.5 shrink-0 text-left whitespace-nowrap w-36">
                        <span className="truncate">{s.name}</span>
                        {flags.length > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-700 bg-amber-50 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                            <AlertTriangle size={10} /> {flags.length}
                          </span>
                        )}
                      </button>

                      <div className="shrink-0 w-72">
                        {!attendanceHidden && showFullPicker && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {config.attendance.statuses.map((st) => {
                              const selected = entry?.status === st.id;
                              return (
                                <button key={st.id} onClick={() => { setAttendance(s.id, date, st.id); setExpandedAttendance((prev) => prev.filter((id) => id !== s.id)); }}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${selected ? `bg-${st.color}-500 text-white border-${st.color}-500` : `text-stone-500 border-stone-200`}`}>
                                  {st.label}
                                </button>
                              );
                            })}
                            {isLateType && (
                              <span className="flex items-center gap-1">
                                <label className="text-xs text-stone-500">at</label>
                                <input type="time" value={entry?.time || ""} onChange={(e) => setAttendanceTime(s.id, date, e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1 text-xs" />
                              </span>
                            )}
                          </div>
                        )}
                        {!attendanceHidden && !showFullPicker && (
                          <button onClick={() => setExpandedAttendance((prev) => [...prev, s.id])} title="Tap to change"
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-${statusMap[entry.status]?.color || "stone"}-500 text-white`}>
                            {statusMap[entry.status]?.label}{isLateType && entry.time ? ` ${entry.time}` : ""}
                          </button>
                        )}
                        {attendanceHidden && <span className="text-xs text-stone-400 italic">No school</span>}
                      </div>

                      {individualPointCats.map((cat) => {
                        const pts = studentData[s.id]?.points?.[cat.id] || 0;
                        return (
                          <div key={cat.id} className="flex items-center gap-1 bg-stone-50 rounded-full pl-2 pr-1 py-0.5 shrink-0">
                            <span className={`text-[10px] font-semibold text-${cat.color}-700 whitespace-nowrap`}>{cat.label}</span>
                            <span className="text-xs font-bold text-stone-800 w-4 text-center">{pts}</span>
                            <button onClick={() => addPoints(s.id, cat.id, -(cat.increment || 1))} className="w-5 h-5 flex items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100"><Minus size={10} /></button>
                            <button onClick={() => addPoints(s.id, cat.id, cat.increment || 1)} className={`w-5 h-5 flex items-center justify-center rounded-full bg-${cat.color}-500 text-white hover:opacity-90`}><Plus size={10} /></button>
                          </div>
                        );
                      })}

                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <button onClick={() => openIncidentForm(s.id)} className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-full px-2 py-1 hover:bg-rose-100 whitespace-nowrap">
                          <ClipboardList size={11} /> Report incident
                        </button>
                        <ConfirmDelete onConfirm={() => removeStudent(s.id)} size={13} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {multiSelect && selectedIds.length > 0 && (
              <div className="sticky bottom-3 mt-3 bg-white border border-slate-200 shadow-lg rounded-xl p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700">Award to {selectedIds.length} selected:</span>
                {individualPointCats.map((cat) => (
                  <button key={cat.id} onClick={() => selectedIds.forEach((id) => addPoints(id, cat.id, cat.increment || 1))}
                    className={`flex items-center gap-1 text-xs font-semibold text-white rounded-full px-3 py-1.5 bg-${cat.color}-500 hover:opacity-90`}>
                    <Plus size={11} /> {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Tools drawer — slides in from the right and pushes the roster over to share the screen (like a Gmail side panel) — never dims or blocks it, at any width. Position/transform/transition are inline styles deliberately, so they never depend on utility-CSS generation timing. */}
      <div className="w-full sm:w-96 lg:w-1/2 bg-stone-50 border-l border-stone-200 shadow-2xl overflow-y-auto"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", zIndex: 40, transform: showPlan ? "translateX(0)" : "translateX(100%)", transition: "transform 300ms ease-in-out" }}>
        <div className="p-4 space-y-4 lg:max-w-xl">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-stone-800">Class Tools</p>
            <button onClick={() => setShowPlan(false)} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={20} /></button>
          </div>
          <TodaysPlanPanel config={config} plannerDays={plannerDays} setPlannerDay={setPlannerDay} navigate={navigate} />
          <TimerWidget />
          <ScratchpadWidget plannerDays={plannerDays} setPlannerDay={setPlannerDay} />
          <button onClick={() => navigate("day-recap")} className="w-full flex items-center justify-center gap-2 bg-stone-800 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-900">
            End of day recap <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TodaysPlanPanel({ config, plannerDays, setPlannerDay, navigate }) {
  const today = todayISO();
  const entry = plannerDays?.[today] || {};
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const dayType = entry.dayType ? dayTypeMap[entry.dayType] : null;
  const template = dayType?.scheduleTemplate === "full" ? config.planner?.fullDaySchedule || []
    : dayType?.scheduleTemplate === "half" ? config.planner?.halfDaySchedule || [] : null;
  const [slotDrafts, setSlotDrafts] = useState(entry.slotContent || {});

  useEffect(() => { setSlotDrafts(plannerDays?.[today]?.slotContent || {}); }, [today, plannerDays]);

  const saveSlot = (slotId, text) => setPlannerDay(today, { slotContent: { ...(plannerDays?.[today]?.slotContent || {}), [slotId]: text } });

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-stone-800 text-sm">Today's Plan</p>
        {dayType && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${dayType.color}-100 text-${dayType.color}-700`}>{dayType.label}</span>}
      </div>
      <p className="text-xs text-stone-400 mb-3">{today}</p>

      {!dayType && (
        <p className="text-xs text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center">
          No day type set for today. <button onClick={() => navigate("planner")} className="text-slate-700 font-semibold underline">Set it in Planner</button>
        </p>
      )}
      {dayType && !template && (
        <p className="text-xs text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center">
          "{dayType.label}" has no schedule template assigned. <button onClick={() => navigate("planner")} className="text-slate-700 font-semibold underline">Set one up</button>
        </p>
      )}
      {template && template.length > 0 && (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {template.map((slot) => (
            <div key={slot.id} className="border border-stone-200 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-700">{slot.label}</span>
                <span className="text-[10px] text-stone-400">{slot.startTime}–{slot.endTime}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <textarea
                  value={slotDrafts[slot.id] || ""}
                  onChange={(e) => setSlotDrafts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                  onBlur={(e) => saveSlot(slot.id, e.target.value)}
                  rows={2} placeholder="What's being covered..."
                  className="flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs" />
                <MicButton onResult={(spoken) => {
                  const next = slotDrafts[slot.id] ? `${slotDrafts[slot.id]} ${spoken}` : spoken;
                  setSlotDrafts((prev) => ({ ...prev, [slot.id]: next }));
                  saveSlot(slot.id, next);
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => navigate("planner")} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-3">
        Open full planner <ArrowRight size={11} />
      </button>
    </div>
  );
}

function TimerWidget() {
  const PRESETS = [1, 3, 5, 10];
  const RINGTONES = [
    { id: "bell", label: "Bell" },
    { id: "chime", label: "Chime" },
    { id: "buzz", label: "Buzz" },
  ];
  const [totalSeconds, setTotalSeconds] = useState(5 * 60);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [done, setDone] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [ringtone, setRingtone] = useState("bell");
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); setDone(true); if (soundOn) playRing(ringtone); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, soundOn, ringtone]);

  const unlockAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch { /* audio not available on this device/browser */ }
  };

  const pluck = (ctx, t, freq, duration, peak, type) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  };

  // Each pattern rings for roughly 5 seconds — enough to actually catch a room's attention.
  const playRing = (tone) => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return; // never unlocked (e.g. Start was never tapped) — skip silently
      const now = ctx.currentTime;
      if (tone === "chime") {
        // Two-note ding-dong, repeated
        for (let i = 0; i < 4; i++) {
          pluck(ctx, now + i * 1.3, 880, 0.5, 0.2, "sine");
          pluck(ctx, now + i * 1.3 + 0.3, 659.25, 0.55, 0.2, "sine");
        }
      } else if (tone === "buzz") {
        // Lower, sharper pulses — a buzzer feel
        for (let i = 0; i < 8; i++) {
          pluck(ctx, now + i * 0.65, 220, 0.4, 0.16, "square");
        }
      } else {
        // Bell — bright, repeated rings
        for (let i = 0; i < 5; i++) {
          pluck(ctx, now + i * 1.0, 1046.5, 0.4, 0.25, "sine");
        }
      }
    } catch { /* audio not available — visual flash still shows */ }
  };

  const testRing = () => { unlockAudio(); playRing(ringtone); };

  const start = () => { unlockAudio(); setDone(false); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setDone(false); setRemaining(totalSeconds); };
  const setPreset = (min) => { const secs = min * 60; setTotalSeconds(secs); setRemaining(secs); setRunning(false); setDone(false); };
  const setCustom = () => {
    const min = Number(customMin);
    if (!min || min <= 0) return;
    const secs = Math.round(min * 60);
    setTotalSeconds(secs); setRemaining(secs); setRunning(false); setDone(false); setCustomMin("");
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className={`bg-white border rounded-xl p-4 ${done ? "border-amber-400 bg-amber-50" : "border-stone-200"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-stone-800 text-sm">Timer</p>
        <button onClick={() => setSoundOn((v) => !v)} title={soundOn ? "Sound on — tap to mute" : "Sound off — tap to unmute"}
          className={`text-xs font-semibold px-2 py-1 rounded-full ${soundOn ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
          {soundOn ? "🔔 On" : "🔕 Off"}
        </button>
      </div>
      <p className={`text-4xl font-bold text-center mb-3 ${done ? "text-amber-700" : "text-stone-900"}`}>{mm}:{ss}</p>
      {done && <p className="text-xs text-amber-700 font-semibold text-center mb-3">Time's up!</p>}

      <div className="flex items-center justify-center gap-1.5 mb-3">
        {RINGTONES.map((r) => (
          <button key={r.id} onClick={() => setRingtone(r.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ringtone === r.id ? "bg-slate-600 text-white border-slate-600" : "text-stone-500 border-stone-300"}`}>
            {r.label}
          </button>
        ))}
        <button onClick={testRing} title="Preview this ring" className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-full px-2.5 py-1 hover:bg-stone-50">▶ Test</button>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
        {PRESETS.map((m) => (
          <button key={m} onClick={() => setPreset(m)} className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-50">{m}m</button>
        ))}
        <input value={customMin} onChange={(e) => setCustomMin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setCustom()}
          placeholder="min" className="w-14 rounded-full border border-stone-300 px-2 py-1 text-xs text-center" />
        <button onClick={setCustom} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50">Set</button>
      </div>
      <div className="flex gap-2">
        {!running ? (
          <button onClick={start} disabled={remaining === 0} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">Start</button>
        ) : (
          <button onClick={pause} className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-amber-600">Pause</button>
        )}
        <button onClick={reset} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Reset</button>
      </div>
    </div>
  );
}

function ScratchpadWidget({ plannerDays, setPlannerDay }) {
  const today = todayISO();
  const [text, setText] = useState(plannerDays?.[today]?.notes || "");
  useEffect(() => { setText(plannerDays?.[today]?.notes || ""); }, [today, plannerDays]);
  const appendDictation = (spoken) => {
    const next = text ? `${text} ${spoken}` : spoken;
    setText(next);
    setPlannerDay(today, { notes: next });
  };
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-stone-800 text-sm">Scratchpad</p>
        <MicButton onResult={appendDictation} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setPlannerDay(today, { notes: text })}
        rows={4} placeholder="Loose notes for today — anything that doesn't need its own spot"
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
    </div>
  );
}

function DayRecapView({ roster, studentData, incidents, behaviorLogData, plannerDays, config, onBack }) {
  const today = todayISO();
  const statusMap = {};
  config.attendance.statuses.forEach((s) => (statusMap[s.id] = s));

  const attendanceCounts = {};
  config.attendance.statuses.forEach((s) => (attendanceCounts[s.id] = 0));
  const noEntry = [];
  roster.forEach((s) => {
    const entry = (studentData[s.id]?.attendance || []).find((a) => a.date === today);
    if (entry) attendanceCounts[entry.status] = (attendanceCounts[entry.status] || 0) + 1;
    else noEntry.push(s.name);
  });

  const todaysIncidents = (incidents || []).filter((i) => i.date === today);
  const catMap = {};
  config.incidents.categories.forEach((c) => (catMap[c.id] = c));
  const rosterMap = {};
  roster.forEach((s) => (rosterMap[s.id] = s.name));

  const markTypes = config.points?.behaviorLog?.markTypes || [];
  const classLogTotals = {};
  markTypes.forEach((m) => (classLogTotals[m.id] = 0));
  const todaysLog = behaviorLogData?.[today] || {};
  Object.values(todaysLog).forEach((periodMarks) => {
    Object.entries(periodMarks || {}).forEach(([markId, count]) => { classLogTotals[markId] = (classLogTotals[markId] || 0) + count; });
  });
  const hasClassLogActivity = Object.values(classLogTotals).some((v) => v > 0);

  const todaysPeriodAttendance = [];
  roster.forEach((s) => {
    ((studentData[s.id]?.periodAttendance) || []).filter((pa) => pa.date === today).forEach((pa) => {
      todaysPeriodAttendance.push({ ...pa, studentName: s.name });
    });
  });
  const periodAttTypeMap = {};
  config.periodAttendance.types.forEach((t) => (periodAttTypeMap[t.id] = t));

  const scratchpadNote = plannerDays?.[today]?.notes;

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Home</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">End of Day Recap</h1>
      <p className="text-stone-500 text-sm mb-5">{today}</p>

      <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="font-semibold text-stone-800 text-sm mb-2">Attendance</p>
          <ul className="space-y-1">
            {config.attendance.statuses.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{s.label}</span>
                <span className={`font-semibold text-${s.color}-700`}>{attendanceCounts[s.id] || 0}</span>
              </li>
            ))}
          </ul>
          {noEntry.length > 0 && <p className="text-xs text-stone-400 mt-2">Not marked: {noEntry.join(", ")}</p>}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="font-semibold text-stone-800 text-sm mb-2">Incidents today</p>
          {todaysIncidents.length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
          <ul className="space-y-2">
            {todaysIncidents.map((inc) => (
              <li key={inc.id} className="text-xs border-l-2 border-stone-200 pl-2">
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${catMap[inc.category]?.color || "stone"}-100 text-${catMap[inc.category]?.color || "stone"}-700`}>
                  {catMap[inc.category]?.label || inc.category || "Uncategorized"}
                </span>
                <span className="text-stone-600">{(inc.studentIds || []).map((id) => rosterMap[id]).filter(Boolean).join(", ")}</span>
                {inc.description && <p className="text-stone-500 mt-0.5">{inc.description}</p>}
              </li>
            ))}
          </ul>
        </div>

        {markTypes.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="font-semibold text-stone-800 text-sm mb-2">Class Log totals today</p>
            {!hasClassLogActivity && <p className="text-xs text-stone-400">Nothing logged today.</p>}
            {hasClassLogActivity && (
              <div className="flex gap-4">
                {markTypes.map((m) => (
                  <span key={m.id} className="text-sm">
                    <span className={`font-bold text-${m.color}-700`}>{classLogTotals[m.id] || 0}</span>
                    <span className="text-stone-500 ml-1">{m.label}{(classLogTotals[m.id] || 0) === 1 ? "" : "s"}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="font-semibold text-stone-800 text-sm mb-2">Period attendance today</p>
          {todaysPeriodAttendance.length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
          <ul className="space-y-1">
            {todaysPeriodAttendance.map((pa) => (
              <li key={pa.id} className="text-xs">
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${periodAttTypeMap[pa.typeId]?.color || "stone"}-100 text-${periodAttTypeMap[pa.typeId]?.color || "stone"}-700`}>
                  {periodAttTypeMap[pa.typeId]?.label || pa.typeId}
                </span>
                <span className="text-stone-600">{pa.studentName}</span>
                <span className="text-stone-400"> · {pa.time}{pa.minutesLate ? ` · ${pa.minutesLate} min late` : ""}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="font-semibold text-stone-800 text-sm mb-2">Today's scratchpad</p>
          {!scratchpadNote && <p className="text-xs text-stone-400">Nothing jotted down today.</p>}
          {scratchpadNote && <p className="text-sm text-stone-700 whitespace-pre-wrap">{scratchpadNote}</p>}
        </div>
      </div>
    </div>
  );
}

// ---------- Points ----------

function PointsView({ roster, studentData, classPoints, config, addPoints, addClassPoints, resetClassPoints, onAddCategory, navigate, plannerDays, behaviorLogData, adjustBehaviorMark }) {
  const [subTab, setSubTab] = useState("rewards");
  const cats = config.points?.categories || [];
  const [activeId, setActiveId] = useState(cats[0]?.id || null);
  const active = cats.find((c) => c.id === activeId) || cats[0];
  const [showForm, setShowForm] = useState(cats.length === 0);
  const [form, setForm] = useState({ label: "", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "" });

  useEffect(() => { if (!activeId && cats[0]) setActiveId(cats[0].id); }, [cats, activeId]);

  const submitForm = () => {
    const label = form.label.trim();
    if (!label) return;
    const newCat = { id: uid(), ...form, label };
    onAddCategory(newCat);
    setActiveId(newCat.id);
    setShowForm(false);
    setForm({ label: "", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "" });
  };

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="points" navigate={navigate} />

      <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 md:w-72">
        <button onClick={() => setSubTab("rewards")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "rewards" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Rewards</button>
        <button onClick={() => setSubTab("classlog")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "classlog" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Class Log</button>
      </div>

      {subTab === "classlog" ? (
        <ClassLogView config={config} plannerDays={plannerDays} behaviorLogData={behaviorLogData} adjustBehaviorMark={adjustBehaviorMark} />
      ) : (
      <>
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        {cats.map((c) => (
          <button key={c.id} onClick={() => { setActiveId(c.id); setShowForm(false); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${activeId === c.id && !showForm ? `bg-${c.color}-500 text-white border-${c.color}-500` : "text-stone-600 border-stone-300"}`}>
            {c.label}
          </button>
        ))}
        <button onClick={() => setShowForm(true)}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showForm ? "bg-slate-700 text-white border-slate-700" : "text-slate-700 border-slate-300"}`}>
          <Plus size={12} /> Add category
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
          <p className="text-sm font-semibold text-stone-800 mb-3">New points category</p>
          <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
          <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Diligence Points" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tracked</label>
              <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value="individual">Per-student</option>
                <option value="class">Whole class</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Display</label>
              <select value={form.displayMode} onChange={(e) => setForm((f) => ({ ...f, displayMode: e.target.value }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value="bar">Fill-up visual</option>
                <option value="counter">Simple counter</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Add amount</label>
              <input type="number" min={1} value={form.increment} onChange={(e) => setForm((f) => ({ ...f, increment: Math.max(1, Number(e.target.value) || 1) }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Reward at</label>
              <input type="number" min={0} value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: Math.max(0, Number(e.target.value) || 0) }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
              <select value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label className="block text-xs font-medium text-stone-500 mb-1">Reward description</label>
          <input value={form.rewardMessage} onChange={(e) => setForm((f) => ({ ...f, rewardMessage: e.target.value }))}
            placeholder="e.g. Pizza party" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

          <div className="flex gap-2">
            <button onClick={submitForm} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Create category</button>
            {cats.length > 0 && <button onClick={() => setShowForm(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>}
          </div>
        </div>
      )}

      {!showForm && active && (
        active.scope === "class" ? (
          <ClassPointsCard cat={active} value={classPoints[active.id] || 0}
            onAdd={() => addClassPoints(active.id, active.increment || 1)}
            onSubtract={() => addClassPoints(active.id, -(active.increment || 1))}
            onReset={() => resetClassPoints(active.id)} />
        ) : (
          <div className="space-y-1.5">
            {roster.map((s) => {
              const pts = studentData[s.id]?.points?.[active.id] || 0;
              const ready = pts >= active.threshold;
              return (
                <div key={s.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2 flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-stone-800 text-sm w-36 truncate shrink-0">{s.name}</span>
                  <span className="text-sm font-bold text-stone-800 w-12 shrink-0">{pts}{active.threshold ? ` / ${active.threshold}` : ""}</span>
                  {active.displayMode === "bar" && active.threshold > 0 && (
                    <div className="w-24 shrink-0"><FillMeter value={pts} max={active.threshold} color={active.color} size="sm" /></div>
                  )}
                  {ready && <span className="text-xs text-amber-700 font-semibold">🎉 Ready</span>}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button onClick={() => addPoints(s.id, active.id, -(active.increment || 1))} className="w-7 h-7 flex items-center justify-center text-stone-400 border border-stone-200 rounded-full hover:bg-stone-50">
                      <Minus size={12} />
                    </button>
                    <button onClick={() => addPoints(s.id, active.id, active.increment || 1)} className={`w-7 h-7 flex items-center justify-center text-white bg-${active.color}-500 rounded-full hover:opacity-90`}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      </>
      )}
    </div>
  );
}

function FillMeter({ value, max, color, size = "lg" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  if (size === "sm") {
    return (
      <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden mt-1.5 mb-2">
        <div className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return (
    <div className="relative mx-auto" style={{ width: 96, height: 140 }}>
      <div className="absolute inset-0 rounded-t-xl rounded-b-[2rem] border-2 border-stone-300 bg-stone-50 overflow-hidden">
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-${color}-600 to-${color}-400 transition-all duration-700 ease-out`} style={{ height: `${pct}%` }}>
          <div className="absolute -top-1 left-0 right-0 h-2 bg-white/30 rounded-full" />
        </div>
        <div className="absolute top-3 left-3 w-3 h-8 bg-white/40 rounded-full rotate-6 pointer-events-none" />
      </div>
    </div>
  );
}

// ---------- Class behavior log (period-by-period daily tally) ----------

function weekRange(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDaysISO(isoDate(sunday), i));
  return days;
}

function ClassLogView({ config, plannerDays, behaviorLogData, adjustBehaviorMark }) {
  const [date, setDate] = useState(todayISO());
  const [summaryView, setSummaryView] = useState("day"); // day | week

  const markTypes = config.points?.behaviorLog?.markTypes || [];
  const summaryMode = config.points?.behaviorLog?.summaryMode || "daily";
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));

  const entry = plannerDays?.[date] || {};
  const dayType = entry.dayType ? dayTypeMap[entry.dayType] : null;
  const template = dayType?.scheduleTemplate === "full" ? config.planner?.fullDaySchedule || []
    : dayType?.scheduleTemplate === "half" ? config.planner?.halfDaySchedule || [] : null;
  const noSchool = dayType?.hidesAttendance;

  const dayTotals = (dateKey) => {
    const dayData = behaviorLogData?.[dateKey] || {};
    const totals = {};
    markTypes.forEach((m) => (totals[m.id] = 0));
    Object.values(dayData).forEach((periodMarks) => {
      Object.entries(periodMarks || {}).forEach(([markId, count]) => {
        totals[markId] = (totals[markId] || 0) + count;
      });
    });
    return totals;
  };

  const weekDates = weekRange(date);
  const weekTotalsByPeriod = (periodId) => {
    const totals = {};
    markTypes.forEach((m) => (totals[m.id] = 0));
    weekDates.forEach((d) => {
      const marks = behaviorLogData?.[d]?.[periodId] || {};
      markTypes.forEach((m) => (totals[m.id] += marks[m.id] || 0));
    });
    return totals;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        {dayType && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-${dayType.color}-100 text-${dayType.color}-700`}>{dayType.label}</span>
        )}
        {(summaryMode === "weekly" || summaryMode === "both") && (
          <div className="flex gap-1 bg-stone-100 rounded-lg p-1 ml-auto">
            <button onClick={() => setSummaryView("day")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${summaryView === "day" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Today</button>
            <button onClick={() => setSummaryView("week")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${summaryView === "week" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>This Week</button>
          </div>
        )}
      </div>

      {noSchool ? (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-6 text-center">{dayType.label} — no classes logged this day.</p>
      ) : !template || template.length === 0 ? (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-6 text-center">
          {entry.dayType ? `No schedule template assigned to "${dayType?.label}" yet — set one in Settings.` : "Set this day's type in the Planner calendar first, so its class periods show up here."}
        </p>
      ) : summaryView === "week" ? (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-3 py-2 font-semibold text-stone-600">Period</th>
                {markTypes.map((m) => <th key={m.id} className="text-center px-3 py-2 font-semibold text-stone-600">{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {template.map((slot) => {
                const totals = weekTotalsByPeriod(slot.id);
                return (
                  <tr key={slot.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2 text-stone-700 font-medium">{slot.label}</td>
                    {markTypes.map((m) => <td key={m.id} className="text-center px-3 py-2 text-stone-800 font-semibold">{totals[m.id]}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-stone-400 px-3 py-2">Week of {weekDates[0]} – {weekDates[6]}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {template.map((slot) => {
              const marks = behaviorLogData?.[date]?.[slot.id] || {};
              return (
                <div key={slot.id} className="bg-white border border-stone-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-stone-800">{slot.label}</span>
                    <span className="text-[10px] text-stone-400">{slot.startTime}–{slot.endTime}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {markTypes.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-stone-50 rounded-lg px-2 py-1">
                        <span className={`text-xs font-semibold text-${m.color}-700`}>{m.label}</span>
                        <span className="text-sm font-bold text-stone-800 w-5 text-center">{marks[m.id] || 0}</span>
                        <button onClick={() => adjustBehaviorMark(date, slot.id, m.id, 1)} className={`flex items-center justify-center w-6 h-6 rounded-full bg-${m.color}-500 text-white hover:opacity-90`}><Plus size={12} /></button>
                        <button onClick={() => adjustBehaviorMark(date, slot.id, m.id, -1)} className="flex items-center justify-center w-6 h-6 rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100"><Minus size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {(summaryMode === "daily" || summaryMode === "both") && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-900 mb-1.5">Today's totals</p>
              <div className="flex gap-4">
                {markTypes.map((m) => (
                  <span key={m.id} className="text-sm">
                    <span className={`font-bold text-${m.color}-700`}>{dayTotals(date)[m.id] || 0}</span>
                    <span className="text-stone-500 ml-1">{m.label}{(dayTotals(date)[m.id] || 0) === 1 ? "" : "s"}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClassPointsCard({ cat, value, onAdd, onSubtract, onReset }) {
  const ready = cat.threshold > 0 && value >= cat.threshold;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 md:w-96">
      <p className="text-stone-500 text-sm mb-1">{cat.label}</p>
      <p className="display-font text-4xl font-bold text-stone-900 mb-3">{value}{cat.threshold ? <span className="text-lg text-stone-400"> / {cat.threshold}</span> : null}</p>
      {cat.displayMode === "bar" && cat.threshold > 0 && (
        <div className="flex justify-center mb-4"><FillMeter value={value} max={cat.threshold} color={cat.color} size="lg" /></div>
      )}
      {ready && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-sm font-semibold text-amber-900">🎉 Reward ready</p>
          <p className="text-xs text-amber-700">{cat.rewardMessage}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onAdd} className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-${cat.color}-500 rounded-lg py-2.5 hover:opacity-90`}>
          <Plus size={14} /> Add {cat.increment || 1}
        </button>
        <button onClick={onSubtract} className="px-4 flex items-center justify-center text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50"><Minus size={14} /></button>
        {ready && <button onClick={onReset} className="px-4 flex items-center justify-center text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50">Reward given — reset</button>}
      </div>
    </div>
  );
}

// ---------- Assessments ----------

function AssessmentsListView({ roster, studentData, incidents, classAssessments, config, openStudent, openClassAssessment, openAssessmentReport, openSkillCategoryReport, activateAssessment, hideAssessment, createCustomAssessment, navigate }) {
  const [showAdd, setShowAdd] = useState(false);
  const activeCats = config.categories.filter((c) => c.active !== false);
  const libraryCats = config.categories.filter((c) => c.active === false);

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="assessments" navigate={navigate} />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Your class's assessments</p>
          <button onClick={() => setShowAdd((v) => !v)} className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Plus size={12} /> {showAdd ? "Close" : "Add assessment"}
          </button>
        </div>

        {activeCats.length === 0 && !showAdd && (
          <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center mb-2">No assessments active yet — add one to get started.</p>
        )}
        {activeCats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {activeCats.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full pl-1 pr-1.5 py-1">
                <button onClick={() => openSkillCategoryReport(cat.id)} title="See the whole class's results" className="text-xs font-semibold text-stone-700 hover:text-slate-700 px-2 py-0.5">
                  {cat.title}
                </button>
                <button onClick={() => hideAssessment(cat.id)} title="Hide from class" className="text-stone-300 hover:text-red-500 w-4 h-4 flex items-center justify-center text-sm leading-none">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {showAdd && (
          <AddAssessmentPanel libraryCats={libraryCats} onActivate={(id) => { activateAssessment(id); setShowAdd(false); }}
            onCreate={(cat) => { createCustomAssessment(cat); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
        )}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        <div>
          <p className="text-stone-500 text-sm mb-3">Select a student for one-on-one work, or to see everything recorded for them.</p>
          {roster.length === 0 && <p className="text-stone-400 text-sm text-center py-10">Add students from the Home tab first.</p>}
          <ul className="space-y-2">
            {roster.map((s) => {
              const flags = getFlags(studentData[s.id], s.id, incidents, config).filter((f) => f.type === "skill");
              const rows = buildUnifiedAssessmentRows(s, studentData[s.id] || emptyStudentData(), classAssessments, config).filter((r) => r.sortDate !== "0000-00-00");
              const lastDate = rows[0]?.sortDate;
              return (
                <li key={s.id} onClick={() => openStudent(s.id)} className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between cursor-pointer hover:border-slate-300">
                  <div>
                    <span className="font-medium text-stone-800 block">{s.name}</span>
                    <span className="text-xs text-stone-400">{rows.length} recorded{lastDate ? ` · last ${lastDate}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {flags.length > 0 && <span className="flex items-center gap-1 text-amber-700 bg-amber-50 text-xs font-semibold px-2 py-1 rounded-full"><AlertTriangle size={12} /> {flags.length}</span>}
                    <ArrowRight size={14} className="text-stone-300" />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 md:mt-0">
          <button onClick={openClassAssessment} className="w-full mb-4 flex items-center justify-center gap-2 bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800">
            <Plus size={16} /> Log an assessment
          </button>
          <p className="text-xs text-stone-400 mb-2 font-semibold uppercase tracking-wide">Recent class assessments</p>
          {classAssessments.length === 0 && <p className="text-xs text-stone-400">None logged yet.</p>}
          <ul className="space-y-2">
            {classAssessments.slice(0, 8).map((ca) => (
              <li key={ca.id} className="bg-white rounded-lg border border-stone-200 px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-stone-700">{ca.title}</span>
                  <span className="text-stone-400">{ca.date}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-stone-400">{Object.keys(ca.results || {}).length} students graded</span>
                  <button onClick={() => openAssessmentReport(ca.id)} className="text-slate-700 font-semibold hover:text-slate-900">Generate parent reports</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AddAssessmentPanel({ libraryCats, onActivate, onCreate, onCancel }) {
  const [tab, setTab] = useState(libraryCats.length > 0 ? "library" : "create");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("char");
  const [items, setItems] = useState([]);
  const [itemChar, setItemChar] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const addItem = () => {
    if (!itemLabel.trim()) return;
    if (mode === "char") setItems((prev) => [...prev, { id: uid(), char: itemChar, label: itemLabel.trim() }]);
    else setItems((prev) => [...prev, { id: uid(), label: itemLabel.trim(), desc: itemDesc.trim() }]);
    setItemChar(""); setItemLabel(""); setItemDesc("");
  };
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const addBulkItems = () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newItems = lines.map((line) => {
      const commaIdx = line.indexOf(",");
      const first = commaIdx === -1 ? line : line.slice(0, commaIdx).trim();
      const second = commaIdx === -1 ? "" : line.slice(commaIdx + 1).trim();
      return mode === "char" ? { id: uid(), label: first, char: second } : { id: uid(), label: first, desc: second };
    });
    setItems((prev) => [...prev, ...newItems]);
    setBulkText(""); setShowBulkAdd(false);
  };
  const handleBulkFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBulkText(reader.result);
    reader.readAsText(file);
  };

  const submitCreate = () => {
    if (!title.trim() || items.length === 0) return;
    onCreate({ title: title.trim(), mode, items });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-2">
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1 mb-4 md:w-72">
        <button onClick={() => setTab("library")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${tab === "library" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>From library</button>
        <button onClick={() => setTab("create")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${tab === "create" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Create new</button>
      </div>

      {tab === "library" ? (
        <div>
          {libraryCats.length === 0 && <p className="text-xs text-stone-400 mb-2">No hidden or unused assessments right now — everything's already active, or create a new one instead.</p>}
          <ul className="space-y-2">
            {libraryCats.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-stone-700">{cat.title} <span className="text-stone-400 font-normal">· {cat.items.length} items</span></span>
                <button onClick={() => onActivate(cat.id)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Add to class</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Assessment name</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Letter Writing" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <label className="block text-xs font-medium text-stone-500 mb-1">Format</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3 bg-white">
            <option value="char">Character grid (like letters — a symbol + label per item)</option>
            <option value="skill">Skill checklist (a label + description per item)</option>
          </select>

          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-stone-500">Items</label>
            <button onClick={() => setShowBulkAdd((v) => !v)} className="text-xs font-semibold text-slate-700">
              {showBulkAdd ? "Add one at a time instead" : "Bulk add from a list"}
            </button>
          </div>
          <ul className="space-y-1.5 mb-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-2 py-1.5 text-xs">
                <span className="text-stone-700">{mode === "char" ? `${it.char ? it.char + " — " : ""}${it.label}` : `${it.label}${it.desc ? " — " + it.desc : ""}`}</span>
                <button onClick={() => removeItem(it.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={12} /></button>
              </li>
            ))}
            {items.length === 0 && <li className="text-xs text-stone-400">No items yet — add your first one below.</li>}
          </ul>

          {showBulkAdd ? (
            <div className="bg-stone-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-stone-500 mb-2">
                One item per line. Add a comma for a second detail — {mode === "char" ? "a symbol (e.g. \"Alef, א\")" : "a description (e.g. \"Shva Na, silent under a letter\")"} — or leave it off for a plain list of words.
              </p>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={5}
                placeholder={mode === "char" ? "Alef, א\nBeis, ב\nGimmel, ג" : "cat\ndog\nhouse"}
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                  Upload a file instead
                  <input type="file" accept=".txt,.csv" className="hidden" onChange={(e) => handleBulkFile(e.target.files[0])} />
                </label>
              </div>
              <button onClick={addBulkItems} disabled={!bulkText.trim()} className="w-full bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
                Add these items
              </button>
            </div>
          ) : (
          <div className="flex gap-1.5 mb-3">
            {mode === "char" && (
              <input value={itemChar} onChange={(e) => setItemChar(e.target.value)} dir="rtl" placeholder="א" className="heb-font w-14 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-center" />
            )}
            <input value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder={mode === "char" ? "Label (e.g. Alef)" : "Label (e.g. Shva Na)"} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            {mode === "skill" && (
              <input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Description" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            )}
            <button onClick={addItem} className="bg-stone-100 text-stone-600 rounded-lg px-3 hover:bg-stone-200"><Plus size={14} /></button>
          </div>
          )}

          <div className="flex gap-2">
            <button onClick={submitCreate} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Save assessment</button>
            <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassAssessmentForm({ roster, onCancel, onSave }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [results, setResults] = useState({});
  const [selectedIds, setSelectedIds] = useState(roster.map((s) => s.id)); // defaults to everyone, adjustable

  const allSelected = selectedIds.length === roster.length;
  const toggleStudent = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allSelected ? [] : roster.map((s) => s.id));

  const submit = () => {
    const filteredResults = {};
    selectedIds.forEach((id) => { if (results[id] !== undefined && results[id] !== "") filteredResults[id] = results[id]; });
    onSave({ title: title || "Untitled assessment", date, results: filteredResults });
  };

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-5">Log an assessment</h1>
      <div className="md:flex md:gap-4 mb-4">
        <div className="flex-1 mb-4 md:mb-0">
          <label className="block text-sm font-semibold text-stone-700 mb-1">Assessment name</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Parsha quiz" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-stone-700">Who took this assessment?</label>
        <button onClick={toggleAll} className="text-xs font-semibold text-slate-700 hover:text-slate-900">{allSelected ? "Deselect all" : "Select all"}</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {roster.map((s) => {
          const sel = selectedIds.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggleStudent(s.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${sel ? "bg-slate-700 text-white border-slate-700" : "text-stone-600 border-stone-300"}`}>
              {s.name}
            </button>
          );
        })}
      </div>

      <label className="block text-sm font-semibold text-stone-700 mb-2">Grades</label>
      {selectedIds.length === 0 && <p className="text-xs text-stone-400 mb-2">Select at least one student above.</p>}
      <div className="md:grid md:grid-cols-2 md:gap-2">
        {roster.filter((s) => selectedIds.includes(s.id)).map((s) => (
          <div key={s.id} className="flex items-center gap-2 mb-2">
            <span className="flex-1 text-sm text-stone-700">{s.name}</span>
            <input value={results[s.id] || ""} onChange={(e) => setResults((prev) => ({ ...prev, [s.id]: e.target.value }))}
              placeholder="e.g. 90%, Pass, B+" className="w-32 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={selectedIds.length === 0}
        className="w-full mt-4 bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
        Save assessment
      </button>
    </div>
  );
}

function AssessmentEntryView({ student, data, config, classAssessments, onBack, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail }) {
  const activeCats = config.categories.filter((c) => c.active !== false);
  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Assessments</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-4">{student?.name}</h1>
      <button onClick={onLogFluency} className="w-full md:w-72 mb-5 flex items-center justify-center gap-2 bg-slate-50 text-slate-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100">
        <Mic size={16} /> Log fluency check
      </button>
      {activeCats.length === 0 && (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-6 text-center">No assessments active yet — add one from the Assessments tab.</p>
      )}
      <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0 mb-6">
        {activeCats.map((cat) => {
          const total = cat.items.length;
          const mastered = cat.items.filter((it) => data.skills[skillKey(cat.id, it.id)]?.status === "mastered").length;
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-stone-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-800 text-sm">{cat.title}</span>
                <span className="text-xs text-stone-400">{mastered}/{total} mastered</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {cat.items.map((it) => {
                  const skill = data.skills[skillKey(cat.id, it.id)];
                  const status = skill?.status || "new";
                  const color = status === "mastered" ? `bg-${config.statusColors.mastered}-500`
                    : status === "flagged" ? `bg-${config.statusColors.flagged}-500`
                    : status === "practicing" ? "bg-slate-300" : "bg-stone-200";
                  return <span key={it.id} title={it.label} className={`w-2.5 h-2.5 rounded-full ${color}`} />;
                })}
              </div>
              <button onClick={() => onStartSession(cat.id)} className="text-xs font-semibold text-slate-700 flex items-center gap-1 hover:text-slate-900">
                Start session <ArrowRight size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <Section title="All assessments">
        <AssessmentRowsList rows={buildUnifiedAssessmentRows(student, data, classAssessments, config)}
          onOpenSkillDetail={onOpenSkillDetail} onOpenClassAssessmentReport={onOpenClassAssessmentReport} onOpenFluencyDetail={onOpenFluencyDetail}
          emptyText="Nothing recorded yet for this student." />
      </Section>
    </div>
  );
}

// ---------- Student detail ----------

function parseGradeNumber(val) {
  if (val == null) return null;
  const m = String(val).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
function gradeTrend(prevVal, currVal) {
  const p = parseGradeNumber(prevVal), c = parseGradeNumber(currVal);
  if (p != null && c != null) {
    if (c > p) return { dir: "up", text: `+${(c - p).toFixed(c % 1 || p % 1 ? 1 : 0)} from last time (${prevVal})` };
    if (c < p) return { dir: "down", text: `-${(p - c).toFixed(c % 1 || p % 1 ? 1 : 0)} from last time (${prevVal})` };
    return { dir: "same", text: `Same as last time (${prevVal})` };
  }
  if (String(prevVal).trim().toLowerCase() === String(currVal).trim().toLowerCase()) return { dir: "same", text: `Same as last time (${prevVal})` };
  return { dir: "flat", text: `Previously: ${prevVal}` };
}

function buildUnifiedAssessmentRows(student, data, classAssessments, config) {
  const rows = [];
  config.categories.filter((c) => c.active !== false).forEach((cat) => {
    const total = cat.items.length;
    const mastered = cat.items.filter((it) => data.skills[skillKey(cat.id, it.id)]?.status === "mastered").length;
    const dates = cat.items.flatMap((it) => (data.skills[skillKey(cat.id, it.id)]?.history || []).map((h) => h.date));
    const lastDate = dates.length ? dates.sort().slice(-1)[0] : null;
    rows.push({
      key: `skill-${cat.id}`, sortDate: lastDate || "0000-00-00", type: "skill", catId: cat.id,
      left: cat.title, right: `${mastered}/${total} mastered`, sub: null,
    });
  });
  const myClassAssessments = (classAssessments || []).filter((ca) => ca.results && ca.results[student.id] !== undefined).sort((a, b) => (a.date < b.date ? 1 : -1));
  myClassAssessments.forEach((ca, i) => {
    const prior = myClassAssessments.slice(i + 1).find((other) => other.title === ca.title);
    const trend = prior ? gradeTrend(prior.results[student.id], ca.results[student.id]) : null;
    rows.push({
      key: `ca-${ca.id}`, sortDate: ca.date, type: "classAssessment", assessmentId: ca.id,
      left: `${ca.title} · ${ca.date}`, right: ca.results[student.id],
      sub: trend ? { dir: trend.dir, text: trend.text } : null,
    });
  });
  (data.fluency || []).forEach((f, i) => {
    rows.push({
      key: `fl-${i}`, sortDate: f.date, type: "fluency", entry: f,
      left: `Fluency check · ${f.date}`, right: `${f.wordsRead} words · ${f.hesitation}`, sub: null,
    });
  });
  rows.sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));
  return rows;
}

function AssessmentRowsList({ rows, onOpenSkillDetail, onOpenClassAssessmentReport, onOpenFluencyDetail, emptyText }) {
  if (rows.length === 0) return <p className="text-xs text-stone-400">{emptyText || "No assessments yet."}</p>;
  const handleClick = (r) => {
    if (r.type === "skill") onOpenSkillDetail(r.catId);
    else if (r.type === "classAssessment") onOpenClassAssessmentReport(r.assessmentId);
    else if (r.type === "fluency") onOpenFluencyDetail(r.entry);
  };
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.key}>
          <button onClick={() => handleClick(r)} className="w-full flex items-center justify-between text-xs py-1.5 hover:bg-stone-50 rounded-lg px-1 -mx-1">
            <span className="text-stone-700 font-medium">{r.left}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-stone-400">{r.right}</span>
              <ArrowRight size={11} className="text-stone-300" />
            </span>
          </button>
          {r.sub && (
            <p className={`text-[10px] pl-1 ${r.sub.dir === "up" ? "text-emerald-600" : r.sub.dir === "down" ? "text-rose-600" : "text-stone-400"}`}>
              {r.sub.dir === "up" ? "↑ " : r.sub.dir === "down" ? "↓ " : ""}{r.sub.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function ContactInfoSection({ student, onUpdateField, onUpdateParentEmail }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-400 uppercase mb-1">Parent / Guardian 1</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
          <input defaultValue={student?.parent1Name || ""} onBlur={(e) => onUpdateField("parent1Name", e.target.value)}
            placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
          <input type="tel" defaultValue={student?.parentPhone || ""} onBlur={(e) => onUpdateField("parentPhone", e.target.value)}
            placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
      </div>
      <label className="block text-[10px] text-stone-400 mb-0.5">Email</label>
      <input type="email" defaultValue={student?.parentEmail || ""} onBlur={(e) => onUpdateParentEmail(e.target.value)}
        placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

      <p className="text-xs font-semibold text-stone-400 uppercase mb-1 pt-3 border-t border-stone-100">Parent / Guardian 2</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
          <input defaultValue={student?.parent2Name || ""} onBlur={(e) => onUpdateField("parent2Name", e.target.value)}
            placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
          <input type="tel" defaultValue={student?.parent2Phone || ""} onBlur={(e) => onUpdateField("parent2Phone", e.target.value)}
            placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
      </div>
      <label className="block text-[10px] text-stone-400 mb-0.5">Email</label>
      <input type="email" defaultValue={student?.parent2Email || ""} onBlur={(e) => onUpdateField("parent2Email", e.target.value)}
        placeholder="parent2@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

      <label className="block text-[10px] text-stone-400 mb-0.5">Home address</label>
      <input defaultValue={student?.homeAddress || ""} onBlur={(e) => onUpdateField("homeAddress", e.target.value)}
        placeholder="Street, city, zip" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

      <label className="block text-[10px] text-stone-400 mb-0.5">Notes</label>
      <textarea defaultValue={student?.notes || ""} onBlur={(e) => onUpdateField("notes", e.target.value)} rows={2}
        placeholder="Anything worth remembering" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
    </div>
  );
}

function StudentDetailView({ student, data, incidents, classAssessments, config, onBack, onAcknowledge, onLogIncident, onLogPeriodAttendance, onGoToAssessments, onDraftMessage, onUpdateParentEmail, onUpdateField, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, onOpenIncidentDetail }) {
  const [showContact, setShowContact] = useState(false);
  const flags = getFlags(data, student.id, incidents, config);
  const catMap = {};
  config.incidents.categories.forEach((c) => (catMap[c.id] = c));
  const myIncidents = (incidents || []).filter((i) => i.studentIds?.includes(student.id)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const attendanceHistory = [...(data.attendance || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const individualPointCats = (config.points?.categories || []).filter((c) => c.scope === "individual");

  return (
    <div className={PAGE}>
      <div className={`content-shift ${showContact ? "open" : ""}`}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={onBack} className="flex items-center text-stone-500 text-sm hover:text-stone-800"><ChevronLeft size={16} /> Home</button>
          <button onClick={() => setShowContact(true)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
            Contact info
          </button>
        </div>
        <h1 className="display-font text-2xl font-bold text-stone-900 mb-4">{student?.name}</h1>

        {flags.length > 0 && (
          <div className="mb-6 space-y-2">
            {flags.map((f) => (
              <div key={f.key} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{f.label}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{f.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {f.type !== "points" && (
                      <button onClick={() => onDraftMessage(f)} className="flex items-center gap-1 text-xs whitespace-nowrap bg-slate-700 text-white rounded-md px-2 py-1 hover:bg-slate-800">
                        <Mail size={11} /> Draft message
                      </button>
                    )}
                    {(f.type === "skill" || f.type === "points") && (
                      <button onClick={() => onAcknowledge(f.key)} className="text-xs whitespace-nowrap bg-white border border-amber-300 text-amber-800 rounded-md px-2 py-1 hover:bg-amber-100">
                        {f.type === "points" ? "Redeem & reset" : "Mark addressed"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6 md:w-96 flex-wrap">
          <button onClick={onGoToAssessments} className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100">
            <BookOpen size={16} /> Assessments
          </button>
          <button onClick={onLogIncident} className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-rose-100">
            <ClipboardList size={16} /> Log incident
          </button>
          <button onClick={onLogPeriodAttendance} className="flex-1 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-amber-100">
            <Calendar size={16} /> Period attendance
          </button>
        </div>

        <div className="md:flex md:gap-6 md:items-start">
          <div className="flex-1 space-y-4">
            <Section title="Attendance history">
              {attendanceHistory.length === 0 && <p className="text-xs text-stone-400">No attendance logged yet.</p>}
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {attendanceHistory.map((a) => {
                  const st = config.attendance.statuses.find((x) => x.id === a.status);
                  return (
                    <li key={a.date} className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">{a.date}</span>
                      <span className="flex items-center gap-2">
                        {a.time && <span className="text-stone-400">{a.time}</span>}
                        <span className={`px-2 py-0.5 rounded-full font-semibold bg-${st?.color || "stone"}-100 text-${st?.color || "stone"}-700`}>{st?.label || a.status}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>

            <Section title="Period attendance">
              <p className="text-[10px] text-stone-400 mb-2">Separate from morning attendance — mid-day changes only.</p>
              {(data.periodAttendance || []).length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {(data.periodAttendance || []).map((pa) => {
                  const t = config.periodAttendance.types.find((x) => x.id === pa.typeId);
                  const periodLabel = pa.periodId ? (config.planner?.fullDaySchedule || []).concat(config.planner?.halfDaySchedule || []).find((p) => p.id === pa.periodId)?.label : null;
                  return (
                    <li key={pa.id} className="text-xs border-l-2 border-stone-200 pl-2 py-0.5">
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${t?.color || "stone"}-100 text-${t?.color || "stone"}-700`}>
                        {t?.label || pa.typeId}
                      </span>
                      <span className="text-stone-400">{pa.date} {pa.time}{periodLabel ? ` · ${periodLabel}` : ""}{pa.minutesLate ? ` · ${pa.minutesLate} min late` : ""}</span>
                      {pa.notes && <p className="text-stone-600 mt-0.5">{pa.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            </Section>

            {individualPointCats.length > 0 && (
              <Section title="Points">
                <ul className="space-y-1.5">
                  {individualPointCats.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-stone-700">{c.label}</span>
                      <span className="font-semibold text-stone-800">{data.points?.[c.id] || 0}{c.threshold ? ` / ${c.threshold}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          <div className="flex-1 space-y-4 mt-4 md:mt-0">
            <Section title="Incidents">
              {myIncidents.length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
              <ul className="space-y-1">
                {myIncidents.map((inc) => (
                  <li key={inc.id}>
                    <button onClick={() => onOpenIncidentDetail(inc.id)} className="w-full text-left border-l-2 border-stone-200 pl-2 py-1 hover:bg-stone-50 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <span>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${catMap[inc.category]?.color || "stone"}-100 text-${catMap[inc.category]?.color || "stone"}-700`}>
                            {catMap[inc.category]?.label || inc.category || "Uncategorized"}
                          </span>
                          <span className="text-stone-400 text-xs">{inc.date}</span>
                          {inc.studentIds?.length > 1 && <span className="text-stone-400 text-xs"> · involved {inc.studentIds.length} students</span>}
                        </span>
                        <ArrowRight size={11} className="text-stone-300 shrink-0" />
                      </div>
                      {inc.description && <p className="text-stone-600 text-xs mt-0.5">{inc.description}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Assessments">
              <AssessmentRowsList rows={buildUnifiedAssessmentRows(student, data, classAssessments, config)}
                onOpenSkillDetail={onOpenSkillDetail} onOpenClassAssessmentReport={onOpenClassAssessmentReport} onOpenFluencyDetail={onOpenFluencyDetail}
                emptyText="No assessments active for this class yet." />
            </Section>
          </div>
        </div>
      </div>

      {showContact && (
        <div onClick={() => setShowContact(false)} className="lg:hidden" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.2)", zIndex: 30 }} />
      )}
      <div className="w-full sm:w-96 lg:w-1/2 bg-stone-50 border-l border-stone-200 shadow-2xl overflow-y-auto"
        style={{ position: "fixed", top: 0, right: 0, height: "100%", zIndex: 40, transform: showContact ? "translateX(0)" : "translateX(100%)", transition: "transform 300ms ease-in-out" }}>
        <div className="p-4 lg:max-w-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-stone-800">Contact info — {student?.name}</p>
            <button onClick={() => setShowContact(false)} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={20} /></button>
          </div>
          <ContactInfoSection student={student} onUpdateField={onUpdateField} onUpdateParentEmail={onUpdateParentEmail} />
        </div>
      </div>
    </div>
  );
}

// ---------- Parent communication log ----------

function CommunicationListView({ roster, studentData, navigate, openStudent }) {
  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="communication" navigate={navigate} />

      <div className="flex flex-col md:flex-row gap-2 mb-5">
        <button onClick={() => navigate("monthly-reports")} className="flex-1 md:w-80 flex items-center justify-center gap-2 bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800">
          <Mail size={16} /> Generate monthly reports
        </button>
        <button onClick={() => navigate("range-report")} className="flex-1 md:w-80 flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-50">
          <Calendar size={16} /> Custom date range report
        </button>
      </div>

      {roster.length === 0 && <p className="text-stone-400 text-sm text-center py-10">Add students from Settings first.</p>}
      <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
        {roster.map((s) => {
          const count = (studentData[s.id]?.communications || []).length;
          const lastEntry = (studentData[s.id]?.communications || [])[0];
          return (
            <li key={s.id} onClick={() => openStudent(s.id)} className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between cursor-pointer hover:border-slate-300">
              <div>
                <span className="font-medium text-stone-800 block">{s.name}</span>
                {lastEntry && <span className="text-xs text-stone-400">Last: {lastEntry.date} · {lastEntry.subject || lastEntry.channel}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-stone-400">{count} {count === 1 ? "entry" : "entries"}</span>
                <ArrowRight size={14} className="text-stone-300" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CommunicationEntryView({ student, data, onBack, onAddEntry }) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [channel, setChannel] = useState("phone");
  const [notes, setNotes] = useState("");
  const [adminRelayed, setAdminRelayed] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const entries = [...(data.communications || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  const submit = () => {
    onAddEntry({ date, channel, type: "manual", source: "manual", subject: "Manual log entry", body: notes, adminRelayed, adminNotes: adminRelayed ? adminNotes : "" });
    setShowForm(false); setNotes(""); setAdminRelayed(false); setAdminNotes(""); setDate(todayISO());
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Parent Communication</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-5">{student?.name}</h1>

      <button onClick={() => setShowForm((v) => !v)} className="w-full md:w-96 mb-4 flex items-center justify-center gap-2 bg-slate-50 text-slate-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-100">
        <Plus size={16} /> Add log entry
      </button>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
          <label className="block text-xs font-medium text-stone-500 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <label className="block text-xs font-medium text-stone-500 mb-1">Method</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3 bg-white">
            <option value="phone">Phone call</option>
            <option value="in-person">In-person conversation</option>
            <option value="text">Text message</option>
            <option value="email">Email</option>
            <option value="other">Other</option>
          </select>
          <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" placeholder="What was discussed" />
          <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
            <input type="checkbox" checked={adminRelayed} onChange={(e) => setAdminRelayed(e.target.checked)} />
            Also relayed to administration
          </label>
          {adminRelayed && (
            <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="How it was communicated to admin" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          )}
          <button onClick={submit} className="w-full bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Save entry</button>
        </div>
      )}

      {entries.length === 0 && <p className="text-stone-400 text-sm">No communication logged yet.</p>}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="bg-white rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${e.type === "automated" ? "bg-slate-100 text-slate-700" : "bg-stone-100 text-stone-600"}`}>
                  {e.type === "automated" ? "Automated" : "Manual"}
                </span>
                <span className="text-xs text-stone-500 capitalize">{e.channel}</span>
              </span>
              <span className="text-xs text-stone-400">{e.date}</span>
            </div>
            {e.subject && <p className="text-xs font-semibold text-stone-700">{e.subject}</p>}
            {e.body && <p className="text-xs text-stone-600 mt-0.5 whitespace-pre-wrap">{e.body}</p>}
            {e.adminRelayed && (
              <p className="text-[10px] text-amber-700 bg-amber-50 inline-block px-1.5 py-0.5 rounded-full mt-1.5">
                Relayed to admin{e.adminNotes ? ` — ${e.adminNotes}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Monthly reports (hybrid: AI-worded, data-constrained, month-scoped) ----------

function timeToMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Builds ONLY the facts for the given month, split by section, so nothing outside
// the selected month or unchecked sections ever reaches the prompt.
function buildRangeFacts(student, data, incidents, classAssessments, config, startDate, endDate, opts) {
  const inRange = (d) => d >= startDate && d <= endDate;
  const statusMap = {};
  config.attendance.statuses.forEach((s) => (statusMap[s.id] = s));
  const startMin = timeToMinutes(config.attendance.classStartTime);

  let attendanceLines = null;
  if (opts.attendance) {
    const entriesInRange = (data.attendance || []).filter((a) => inRange(a.date));
    attendanceLines = [];
    for (const st of config.attendance.statuses) {
      const entries = entriesInRange.filter((a) => a.status === st.id);
      if (entries.length === 0 && st.flagType === "none") continue;
      let line = `${st.label}: ${entries.length} day(s)`;
      if (st.flagType === "late" && entries.length > 0) {
        const times = entries.filter((e) => e.time).map((e) => e.time);
        if (times.length) line += ` (arrived at ${times.join(", ")})`;
        if (startMin != null) {
          const totalLateMin = entries.reduce((sum, e) => {
            const t = timeToMinutes(e.time);
            if (t == null) return sum;
            const diff = t - startMin;
            return sum + (diff > 0 ? diff : 0);
          }, 0);
          line += ` — total ${totalLateMin} min late`;
        }
      }
      attendanceLines.push(line);
    }
    // Fold in period-level lateness (separate from morning attendance) so the two add up into one real total.
    const periodLateEntries = (data.periodAttendance || []).filter((pa) => pa.typeId === "late-to-class" && inRange(pa.date) && pa.minutesLate);
    if (periodLateEntries.length > 0) {
      const periodLateTotal = periodLateEntries.reduce((sum, pa) => sum + (pa.minutesLate || 0), 0);
      attendanceLines.push(`Late to class (mid-day, separate from morning attendance): ${periodLateEntries.length} time(s) — total ${periodLateTotal} min late`);
    }
    if (entriesInRange.length === 0 && periodLateEntries.length === 0) attendanceLines.push("No attendance recorded in this range.");
  }

  let incidentLines = null;
  if (opts.incidents) {
    const catMap = {};
    config.incidents.categories.forEach((c) => (catMap[c.id] = c.label));
    const incidentsInRange = (incidents || []).filter((i) => i.studentIds?.includes(student.id) && inRange(i.date));
    incidentLines = incidentsInRange.length === 0
      ? ["No incidents in this range."]
      : incidentsInRange.map((i) => `${i.date} — ${catMap[i.category] || i.category}${i.description ? `: ${i.description}` : ""}`);
  }

  let assessmentLines = null;
  if (opts.assessments) {
    const lines = [];
    const gradeLabel = {};
    config.gradeOptions.forEach((g) => (gradeLabel[g.id] = g.label));
    for (const cat of config.categories.filter((c) => c.active !== false)) {
      for (const item of cat.items) {
        const key = skillKey(cat.id, item.id);
        const skill = data.skills[key];
        if (!skill || !skill.history) continue;
        const inRangeEntries = skill.history.filter((h) => inRange(h.date));
        if (inRangeEntries.length === 0) continue;
        const last = inRangeEntries[inRangeEntries.length - 1];
        lines.push(`${item.label} (${cat.title}): ${gradeLabel[last.result] || last.result}${skill.status === "mastered" ? " — mastered" : ""}`);
      }
    }
    const caInRange = (classAssessments || []).filter((ca) => inRange(ca.date) && ca.results && ca.results[student.id] !== undefined);
    for (const ca of caInRange) lines.push(`${ca.title} (${ca.date}): ${ca.results[student.id]}`);
    const fluencyInRange = (data.fluency || []).filter((f) => inRange(f.date));
    for (const f of fluencyInRange) lines.push(`Fluency check (${f.date}): ${f.wordsRead} words, hesitation ${f.hesitation}, ${f.mode}`);
    assessmentLines = lines; // may be empty — handled by caller (section omitted entirely if empty)
  }

  return { attendanceLines, incidentLines, assessmentLines };
}

function buildMonthlyFacts(student, data, incidents, classAssessments, config, year, monthIdx, opts) {
  const start = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(monthIdx + 1).padStart(2, "0")}-31`;
  return buildRangeFacts(student, data, incidents, classAssessments, config, start, end, opts);
}

function factsToPlainText(student, label, facts) {
  const lines = [`${student.name} — ${label}`, ""];
  if (facts.attendanceLines) { lines.push("ATTENDANCE"); facts.attendanceLines.forEach((l) => lines.push(`• ${l}`)); lines.push(""); }
  if (facts.incidentLines) { lines.push("INCIDENTS"); facts.incidentLines.forEach((l) => lines.push(`• ${l}`)); lines.push(""); }
  if (facts.assessmentLines && facts.assessmentLines.length > 0) { lines.push("ASSESSMENT ACTIVITY"); facts.assessmentLines.forEach((l) => lines.push(`• ${l}`)); }
  return lines.join("\n").trim();
}

async function generateHybridReport(student, label, facts) {
  const sections = [];
  if (facts.attendanceLines) sections.push(`ATTENDANCE (${label}):\n${facts.attendanceLines.map((l) => `- ${l}`).join("\n")}`);
  if (facts.incidentLines) sections.push(`INCIDENTS (${label}):\n${facts.incidentLines.map((l) => `- ${l}`).join("\n")}`);
  if (facts.assessmentLines && facts.assessmentLines.length > 0) sections.push(`ASSESSMENT ACTIVITY (${label}):\n${facts.assessmentLines.map((l) => `- ${l}`).join("\n")}`);

  if (sections.length === 0) return "Nothing was logged for this student in the selected sections for this period.";

  const prompt = `You are drafting a short note from a Hebrew school teacher to a parent, covering ${label}.

STRICT RULES:
- Use ONLY the facts listed below. Do not add, infer, guess, or embellish any detail not explicitly present.
- Do not mention any topic (attendance, incidents, assessments) that has no section below — if a section is missing, that topic did not happen or was not tracked this month, so say nothing about it.
- Keep every number exact as given.
- Do not compare to other students or to class averages.
- Do not invent reasons behind any number (e.g. do not guess why a student was late).

Student: ${student.name}

${sections.join("\n\n")}

Write 2-3 short paragraphs, warm but factual, weaving the exact figures above into natural sentences. Sign off as "[Your name]". Output only the message text, nothing else.`;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function MonthlyReportsView({ roster, studentData, incidents, classAssessments, config, onBack, onLogSent, onUpdateParentEmail }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(false);
  const [reports, setReports] = useState({}); // studentId -> { loading, draft, dataUsed, email, logged }
  const label = monthLabel(year, monthIdx);
  const opts = { attendance: includeAttendance, incidents: includeIncidents, assessments: includeAssessments };

  const generateOne = async (student) => {
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    const data = studentData[student.id] || emptyStudentData();
    const facts = buildMonthlyFacts(student, data, incidents, classAssessments, config, year, monthIdx, opts);
    const dataUsed = factsToPlainText(student, label, facts);
    try {
      const text = await generateHybridReport(student, label, facts);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    } catch {
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: "Could not generate — here's the raw data instead:\n\n" + dataUsed, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    }
  };

  const generateAll = async () => { for (const s of roster) await generateOne(s); };

  const logSent = (student) => {
    const r = reports[student.id];
    if (!r) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "monthly-report", subject: `Monthly report — ${label}`, body: r.draft });
    setReports((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">Monthly reports</h1>
      <p className="text-xs text-stone-400 mb-4">AI-worded, but every figure comes from what's logged for the selected month only.</p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={monthIdx} onChange={(e) => setMonthIdx(Number(e.target.value))} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
          {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" })}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={generateAll} className="ml-auto text-xs font-semibold bg-slate-700 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Generate all</button>
      </div>

      <div className="flex flex-wrap gap-4 mb-5 bg-white border border-stone-200 rounded-lg px-3 py-2.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAttendance} onChange={(e) => setIncludeAttendance(e.target.checked)} /> Attendance</label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeIncidents} onChange={(e) => setIncludeIncidents(e.target.checked)} /> Incidents</label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAssessments} onChange={(e) => setIncludeAssessments(e.target.checked)} /> Assessment activity</label>
      </div>

      <div className="space-y-3">
        {roster.map((s) => {
          const r = reports[s.id];
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-800 text-sm">{s.name}</span>
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-slate-700" size={16} />}
              </div>
              {r && !r.loading && (
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Parent email</label>
                  <input type="email" value={r.email} onChange={(e) => { const v = e.target.value; setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], email: v } })); onUpdateParentEmail(s.id, v); }}
                    placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                  <div className="flex items-start gap-1.5 mb-2">
                    <textarea value={r.draft} onChange={(e) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value } }))}
                      rows={6} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                    <MicButton onResult={(spoken) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken } }))} />
                  </div>
                  <button onClick={() => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], showData: !prev[s.id].showData } }))}
                    className="text-xs text-stone-500 underline mb-2">
                    {r.showData ? "Hide" : "Show"} data used
                  </button>
                  {r.showData && <pre className="text-[11px] text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-2 mb-2 whitespace-pre-wrap font-mono">{r.dataUsed}</pre>}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => generateOne(s)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={() => navigator.clipboard.writeText(r.draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><Copy size={12} /> Copy</button>
                    <a href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(`Monthly report — ${label}`)}&body=${encodeURIComponent(r.draft)}`}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-800"><Mail size={12} /> Open in Mail</a>
                    <WhatsAppButton phone={s.parentPhone} message={r.draft} className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 hover:bg-emerald-700" />
                    <button onClick={() => logSent(s)} disabled={r.logged}
                      className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 ${r.logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
                      {r.logged ? <Check size={12} /> : null} {r.logged ? "Logged as sent" : "Log as sent"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400 text-center mt-4">Nothing sends automatically. Review each report — check "Show data used" if you want to verify the figures — then send it yourself and mark it logged.</p>
    </div>
  );
}

function CustomRangeReportView({ roster, studentData, incidents, classAssessments, config, onBack, onLogSent, onUpdateParentEmail }) {
  const today = todayISO();
  const [startDate, setStartDate] = useState(addDaysISO(today, -13));
  const [endDate, setEndDate] = useState(today);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(false);
  const [reports, setReports] = useState({});
  const label = `${startDate} to ${endDate}`;
  const opts = { attendance: includeAttendance, incidents: includeIncidents, assessments: includeAssessments };

  const generateOne = async (student) => {
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    const data = studentData[student.id] || emptyStudentData();
    const facts = buildRangeFacts(student, data, incidents, classAssessments, config, startDate, endDate, opts);
    const dataUsed = factsToPlainText(student, label, facts);
    try {
      const text = await generateHybridReport(student, label, facts);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    } catch {
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: "Could not generate — here's the raw data instead:\n\n" + dataUsed, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    }
  };

  const generateAll = async () => { for (const s of roster) await generateOne(s); };

  const logSent = (student) => {
    const r = reports[student.id];
    if (!r) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "range-report", subject: `Report — ${label}`, body: r.draft });
    setReports((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">Custom date range report</h1>
      <p className="text-xs text-stone-400 mb-4">AI-worded, but every figure comes from what's logged between these two dates only.</p>

      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white" />
        </div>
        <button onClick={generateAll} className="ml-auto text-xs font-semibold bg-slate-700 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Generate all</button>
      </div>

      <div className="flex flex-wrap gap-4 mb-5 bg-white border border-stone-200 rounded-lg px-3 py-2.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAttendance} onChange={(e) => setIncludeAttendance(e.target.checked)} /> Attendance</label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeIncidents} onChange={(e) => setIncludeIncidents(e.target.checked)} /> Incidents</label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAssessments} onChange={(e) => setIncludeAssessments(e.target.checked)} /> Assessment activity</label>
      </div>

      <div className="space-y-3">
        {roster.map((s) => {
          const r = reports[s.id];
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-800 text-sm">{s.name}</span>
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-slate-700" size={16} />}
              </div>
              {r && !r.loading && (
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Parent email</label>
                  <input type="email" value={r.email} onChange={(e) => { const v = e.target.value; setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], email: v } })); onUpdateParentEmail(s.id, v); }}
                    placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                  <div className="flex items-start gap-1.5 mb-2">
                    <textarea value={r.draft} onChange={(e) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value } }))}
                      rows={6} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                    <MicButton onResult={(spoken) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken } }))} />
                  </div>
                  <button onClick={() => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], showData: !prev[s.id].showData } }))}
                    className="text-xs text-stone-500 underline mb-2">
                    {r.showData ? "Hide" : "Show"} data used
                  </button>
                  {r.showData && <pre className="text-[11px] text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-2 mb-2 whitespace-pre-wrap font-mono">{r.dataUsed}</pre>}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => generateOne(s)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={() => navigator.clipboard.writeText(r.draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><Copy size={12} /> Copy</button>
                    <a href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(`Report — ${label}`)}&body=${encodeURIComponent(r.draft)}`}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-800"><Mail size={12} /> Open in Mail</a>
                    <WhatsAppButton phone={s.parentPhone} message={r.draft} className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 hover:bg-emerald-700" />
                    <button onClick={() => logSent(s)} disabled={r.logged}
                      className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 ${r.logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
                      {r.logged ? <Check size={12} /> : null} {r.logged ? "Logged as sent" : "Log as sent"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400 text-center mt-4">Nothing sends automatically. Review each report — check "Show data used" if you want to verify the figures — then send it yourself and mark it logged.</p>
    </div>
  );
}

// ---------- Per-assessment reports (one-off, tied to a single class assessment) ----------

async function generateAssessmentReport(student, assessment, grade) {
  const prompt = `You are drafting a short note from a Hebrew school teacher to a parent about one specific assessment.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context, comparisons, or reasons for the result.
- Report the grade exactly as given, do not reinterpret or convert it.

Student: ${student.name}
Assessment: ${assessment.title}
Date: ${assessment.date}
Result: ${grade}

Write 2-3 sentences, warm but factual. Sign off as "[Your name]". Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function AssessmentReportView({ assessment, roster, onBack, onLogSent, onUpdateParentEmail }) {
  const [reports, setReports] = useState({});
  const students = roster.filter((s) => assessment.results && assessment.results[s.id] !== undefined);

  const generateOne = async (student) => {
    const grade = assessment.results[student.id];
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    try {
      const text = await generateAssessmentReport(student, assessment, grade);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, email: student.parentEmail || "", logged: false } }));
    } catch {
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: `${assessment.title} (${assessment.date}): ${grade}`, email: student.parentEmail || "", logged: false } }));
    }
  };
  const generateAll = async () => { for (const s of students) await generateOne(s); };

  const logSent = (student) => {
    const r = reports[student.id];
    if (!r) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "assessment-report", subject: `${assessment.title} — Report`, body: r.draft });
    setReports((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Assessments</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">{assessment.title}</h1>
      <p className="text-xs text-stone-400 mb-4">{assessment.date} — reports use only this assessment's result, nothing else.</p>
      <button onClick={generateAll} className="mb-4 text-xs font-semibold bg-slate-700 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Generate all</button>

      <div className="space-y-3">
        {students.map((s) => {
          const r = reports[s.id];
          const grade = assessment.results[s.id];
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-800 text-sm">{s.name} <span className="text-stone-400 font-normal">— {grade}</span></span>
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-slate-700" size={16} />}
              </div>
              {r && !r.loading && (
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Parent email</label>
                  <input type="email" value={r.email} onChange={(e) => { const v = e.target.value; setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], email: v } })); onUpdateParentEmail(s.id, v); }}
                    placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                  <div className="flex items-start gap-1.5 mb-2">
                    <textarea value={r.draft} onChange={(e) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value } }))}
                      rows={4} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                    <MicButton onResult={(spoken) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken } }))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => generateOne(s)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={() => navigator.clipboard.writeText(r.draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><Copy size={12} /> Copy</button>
                    <a href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(`${assessment.title} — Report`)}&body=${encodeURIComponent(r.draft)}`}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-800"><Mail size={12} /> Open in Mail</a>
                    <WhatsAppButton phone={s.parentPhone} message={r.draft} className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 hover:bg-emerald-700" />
                    <button onClick={() => logSent(s)} disabled={r.logged}
                      className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 ${r.logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
                      {r.logged ? <Check size={12} /> : null} {r.logged ? "Logged as sent" : "Log as sent"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillCategoryReportView({ category, roster, studentData, config, onBack, onLogSent, onUpdateParentEmail }) {
  const [reports, setReports] = useState({});
  const gradeLabel = {};
  (config.gradeOptions || []).forEach((g) => (gradeLabel[g.id] = g.label));

  const summaryFor = (student) => {
    const data = studentData[student.id] || emptyStudentData();
    const total = category.items.length;
    const mastered = category.items.filter((it) => data.skills[skillKey(category.id, it.id)]?.status === "mastered").length;
    const rows = category.items
      .map((it) => ({ item: it, skill: data.skills[skillKey(category.id, it.id)] }))
      .filter((r) => r.skill?.history?.length > 0);
    const lastDate = rows.length ? rows.map((r) => r.skill.history[r.skill.history.length - 1].date).sort().slice(-1)[0] : null;
    const summaryLines = rows.map((r) => {
      const last = r.skill.history[r.skill.history.length - 1];
      return `${r.item.label}: ${gradeLabel[last.result] || last.result}${r.skill.status === "mastered" ? " (mastered)" : r.skill.status === "flagged" ? " (struggling)" : ""}`;
    });
    return { total, mastered, lastDate, summaryLines, hasHistory: rows.length > 0 };
  };

  const generateOne = async (student) => {
    const { summaryLines } = summaryFor(student);
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    try {
      const text = await generateSkillReport(student, category, summaryLines);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, email: student.parentEmail || "", logged: false } }));
    } catch {
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: `Could not generate — write manually.`, email: student.parentEmail || "", logged: false } }));
    }
  };

  const logSent = (student) => {
    const r = reports[student.id];
    if (!r) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "skill-report", subject: `${category.title} — Progress note`, body: r.draft });
    setReports((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Assessments</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">{category.title}</h1>
      <p className="text-xs text-stone-400 mb-4">Whole class — {category.items.length} items each. Reports use only what's actually been graded for that student.</p>

      <div className="space-y-3">
        {roster.map((s) => {
          const { total, mastered, lastDate, summaryLines, hasHistory } = summaryFor(s);
          const r = reports[s.id];
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="font-semibold text-stone-800 text-sm">
                  {s.name} <span className="text-stone-400 font-normal">— {mastered}/{total} mastered{lastDate ? ` · last ${lastDate}` : ""}</span>
                </span>
                {!r && hasHistory && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Generate report</button>}
                {!hasHistory && <span className="text-xs text-stone-400">No results yet</span>}
                {r?.loading && <Loader2 className="animate-spin text-slate-700" size={16} />}
              </div>
              {r && !r.loading && (
                <div>
                  <label className="block text-[10px] text-stone-400 mb-0.5">Parent email</label>
                  <input type="email" value={r.email} onChange={(e) => { const v = e.target.value; setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], email: v } })); onUpdateParentEmail(s.id, v); }}
                    placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                  <div className="flex items-start gap-1.5 mb-2">
                    <textarea value={r.draft} onChange={(e) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value } }))}
                      rows={4} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                    <MicButton onResult={(spoken) => setReports((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken } }))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => generateOne(s)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={() => navigator.clipboard.writeText(r.draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-50"><Copy size={12} /> Copy</button>
                    <a href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(`${category.title} — Progress note`)}&body=${encodeURIComponent(r.draft)}`}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-800"><Mail size={12} /> Open in Mail</a>
                    <WhatsAppButton phone={s.parentPhone} message={r.draft} className="flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-2.5 py-1.5 hover:bg-emerald-700" />
                    <button onClick={() => logSent(s)} disabled={r.logged}
                      className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 ${r.logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
                      {r.logged ? <Check size={12} /> : null} {r.logged ? "Logged as sent" : "Log as sent"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Fluency & Skill detail (clickable, with report generation) ----------

async function generateFluencyReport(student, entry) {
  const prompt = `You are drafting a short note from a Hebrew school teacher to a parent about one specific reading fluency check.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context, comparisons, or reasons for the result.

Student: ${student.name}
Date: ${entry.date}
Words read: ${entry.wordsRead}
Hesitation level: ${entry.hesitation}
Mode: ${entry.mode === "automatic" ? "reading automatically" : "still decoding letter-by-letter"}
${entry.notes ? `Teacher's note: ${entry.notes}` : ""}

Write 2-3 sentences, warm but factual. Sign off as "[Your name]". Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function FluencyDetailView({ student, entry, onBack, onLogSent, onUpdateParentEmail }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);

  const generate = async () => {
    setLoading(true);
    try { setDraft(await generateFluencyReport(student, entry)); }
    catch { setDraft("Could not generate — write manually."); }
    finally { setLoading(false); }
  };

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "fluency-report", subject: `Fluency check — ${entry.date}`, body: draft });
    setLogged(true);
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Fluency check</h1>
      <p className="text-stone-500 text-sm mb-5">{student?.name} — {entry.date}</p>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-stone-400 text-xs block">Words read</span><span className="font-semibold text-stone-800">{entry.wordsRead}</span></div>
          <div><span className="text-stone-400 text-xs block">Hesitation</span><span className="font-semibold text-stone-800">{entry.hesitation}</span></div>
          <div className="col-span-2"><span className="text-stone-400 text-xs block">Mode</span><span className="font-semibold text-stone-800">{entry.mode === "automatic" ? "Reading automatically" : "Still decoding"}</span></div>
        </div>
        {entry.notes && <p className="text-sm text-stone-600 mt-3 pt-3 border-t border-stone-100">{entry.notes}</p>}
      </div>

      {!draft ? (
        <button onClick={generate} disabled={loading} className="flex items-center gap-2 bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />} Generate parent report
        </button>
      ) : (
        <div className="md:w-96">
          <label className="block text-xs font-medium text-stone-500 mb-1">Parent email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onUpdateParentEmail(email)}
            placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
          <div className="flex items-start gap-1.5 mb-3">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setLogged(false); }} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => { setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken)); setLogged(false); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
            <button onClick={() => navigator.clipboard.writeText(draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><Copy size={13} /> Copy</button>
            <a href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Fluency check — ${entry.date}`)}&body=${encodeURIComponent(draft)}`} className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-3 py-2 hover:bg-slate-800"><Mail size={13} /> Open in Mail</a>
            <WhatsAppButton phone={student?.parentPhone} message={draft} />
            <button onClick={logSent} disabled={logged} className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-2 ${logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
              {logged ? <Check size={13} /> : null} {logged ? "Logged as sent" : "Log as sent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function generateSkillReport(student, category, summaryLines) {
  const prompt = `You are drafting a short note from a Hebrew school teacher to a parent about a specific skill area.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context or reasons.

Student: ${student.name}
Skill area: ${category.title}
Recent results:
${summaryLines.map((l) => `- ${l}`).join("\n")}

Write 2-3 sentences, warm but factual. Sign off as "[Your name]". Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function SkillDetailView({ student, data, category, config, onBack, onLogSent, onUpdateParentEmail }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);

  const gradeLabel = {};
  (config.gradeOptions || []).forEach((g) => (gradeLabel[g.id] = g.label));

  const rows = category.items
    .map((it) => ({ item: it, skill: data.skills[skillKey(category.id, it.id)] }))
    .filter((r) => r.skill?.history?.length > 0);

  const summaryLines = rows.map((r) => {
    const last = r.skill.history[r.skill.history.length - 1];
    return `${r.item.label}: ${gradeLabel[last.result] || last.result}${r.skill.status === "mastered" ? " (mastered)" : r.skill.status === "flagged" ? " (struggling)" : ""}`;
  });

  const generate = async () => {
    setLoading(true);
    try { setDraft(await generateSkillReport(student, category, summaryLines)); }
    catch { setDraft("Could not generate — write manually."); }
    finally { setLoading(false); }
  };

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "skill-report", subject: `${category.title} — Progress note`, body: draft });
    setLogged(true);
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">{category.title}</h1>
      <p className="text-stone-500 text-sm mb-5">{student?.name}</p>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96 max-h-64 overflow-y-auto">
        {summaryLines.length === 0 && <p className="text-xs text-stone-400">No results recorded yet.</p>}
        <ul className="space-y-1.5">
          {summaryLines.map((l, i) => <li key={i} className="text-sm text-stone-700">{l}</li>)}
        </ul>
      </div>

      {!draft ? (
        <button onClick={generate} disabled={loading || summaryLines.length === 0} className="flex items-center gap-2 bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />} Generate parent report
        </button>
      ) : (
        <div className="md:w-96">
          <label className="block text-xs font-medium text-stone-500 mb-1">Parent email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onUpdateParentEmail(email)}
            placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
          <div className="flex items-start gap-1.5 mb-3">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setLogged(false); }} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => { setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken)); setLogged(false); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
            <button onClick={() => navigator.clipboard.writeText(draft)} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><Copy size={13} /> Copy</button>
            <a href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`${category.title} — Progress note`)}&body=${encodeURIComponent(draft)}`} className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-700 rounded-lg px-3 py-2 hover:bg-slate-800"><Mail size={13} /> Open in Mail</a>
            <WhatsAppButton phone={student?.parentPhone} message={draft} />
            <button onClick={logSent} disabled={logged} className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-2 ${logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
              {logged ? <Check size={13} /> : null} {logged ? "Logged as sent" : "Log as sent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Incident detail (named students, per-student message drafting) ----------

async function generateIncidentMessage(student, incident, categoryLabel, othersInvolved) {
  const prompt = `You are drafting a short note from a Hebrew school teacher to a parent about a specific classroom incident.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context or reasons beyond what's stated.
- If other students were involved, you may mention that others were involved without naming them (never name other students to this parent).

Student: ${student.name}
Date: ${incident.date}
Category: ${categoryLabel}
Description: ${incident.description || "(no additional description given)"}
${othersInvolved > 0 ? `Other students involved: ${othersInvolved}` : "No other students involved."}

Write 2-3 sentences, warm but factual and non-alarming. Sign off as "[Your name]". Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function IncidentDetailView({ incident, roster, config, onBack, onLogSent, onUpdateParentEmail, onUpdateIncident }) {
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [drafts, setDrafts] = useState({}); // studentId -> { draft, email, loading, logged }
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(incident?.category || "");
  const [editDescription, setEditDescription] = useState(incident?.description || "");

  if (!incident) {
    return (
      <div className={PAGE}>
        <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
        <p className="text-sm text-stone-400">This incident could not be found.</p>
      </div>
    );
  }

  const catMap = {};
  config.incidents.categories.forEach((c) => (catMap[c.id] = c));
  const cat = catMap[incident.category];
  const involvedStudents = (incident.studentIds || []).map((id) => roster.find((s) => s.id === id)).filter(Boolean);

  const generateFor = async (student) => {
    setDrafts((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    try {
      const text = await generateIncidentMessage(student, incident, cat?.label || incident.category || "Uncategorized", involvedStudents.length - 1);
      setDrafts((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, email: student.parentEmail || "", logged: false } }));
    } catch {
      setDrafts((prev) => ({ ...prev, [student.id]: { loading: false, draft: "Could not generate — write manually.", email: student.parentEmail || "", logged: false } }));
    }
    setActiveStudentId(student.id);
  };

  const logSent = (student) => {
    const d = drafts[student.id];
    if (!d) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "incident-report", subject: `About ${student.name} — ${cat?.label || incident.category || "Uncategorized"}`, body: d.draft });
    setDrafts((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Incident</h1>
      <p className="text-stone-500 text-sm mb-5">{incident.date}</p>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-[28rem]">
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full bg-${cat?.color || "stone"}-100 text-${cat?.color || "stone"}-700`}>
            {cat?.label || incident.category || "Uncategorized"}
          </span>
          {incident.time && <span className="text-xs text-stone-400">Logged at {incident.time}</span>}
        </div>
        {!editing ? (
          <>
            <p className="text-sm text-stone-700 mb-3">{incident.description || "No additional description yet."}</p>
            <button onClick={() => { setEditCategory(incident.category || ""); setEditDescription(incident.description || ""); setEditing(true); }}
              className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              {incident.category || incident.description ? "Edit details" : "+ Add details now"}
            </button>
          </>
        ) : (
          <div className="mb-1">
            <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3 bg-white">
              <option value="">Not set</option>
              {config.incidents.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className="block text-xs font-medium text-stone-500 mb-1">What happened</label>
            <div className="flex items-start gap-1.5 mb-3">
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Type, or use the mic" />
              <MicButton onResult={(spoken) => setEditDescription((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onUpdateIncident(incident.id, { category: editCategory, description: editDescription }); setEditing(false); }}
                className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Save details</button>
              <button onClick={() => setEditing(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Students involved</p>
        <ul className="space-y-2">
          {involvedStudents.map((s) => {
            const d = drafts[s.id];
            return (
              <li key={s.id} className="border border-stone-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-stone-800">{s.name}</span>
                  {!d && (
                    <button onClick={() => generateFor(s)} className="flex items-center gap-1 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                      <Mail size={12} /> Draft message
                    </button>
                  )}
                  {d?.loading && <Loader2 className="animate-spin text-slate-700" size={16} />}
                </div>
                {d && !d.loading && (
                  <div className="mt-2">
                    <label className="block text-[10px] text-stone-400 mb-0.5">Parent email</label>
                    <input type="email" value={d.email} onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], email: e.target.value } }))}
                      onBlur={(e) => onUpdateParentEmail(s.id, e.target.value)} placeholder="parent@example.com"
                      className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs mb-2" />
                    <div className="flex items-start gap-1.5 mb-2">
                      <textarea value={d.draft} onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value, logged: false } }))}
                        rows={4} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                      <MicButton onResult={(spoken) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken, logged: false } }))} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => generateFor(s)} className="flex items-center gap-1 text-[10px] font-semibold text-stone-600 border border-stone-300 rounded-lg px-2 py-1 hover:bg-stone-50"><RefreshCw size={11} /> Regenerate</button>
                      <button onClick={() => navigator.clipboard.writeText(d.draft)} className="flex items-center gap-1 text-[10px] font-semibold text-stone-600 border border-stone-300 rounded-lg px-2 py-1 hover:bg-stone-50"><Copy size={11} /> Copy</button>
                      <a href={`mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(`About ${s.name} — ${cat?.label || incident.category || "Uncategorized"}`)}&body=${encodeURIComponent(d.draft)}`}
                        className="flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-700 rounded-lg px-2 py-1 hover:bg-slate-800"><Mail size={11} /> Open in Mail</a>
                      <WhatsAppButton phone={s.parentPhone} message={d.draft} className="flex items-center gap-1 text-[10px] font-semibold text-white bg-emerald-600 rounded-lg px-2 py-1 hover:bg-emerald-700" />
                      <button onClick={() => logSent(s)} disabled={d.logged}
                        className={`flex items-center gap-1 text-[10px] font-semibold rounded-lg px-2 py-1 ${d.logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
                        {d.logged ? "Logged as sent" : "Log as sent"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ---------- Planner ----------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PlannerView({ config, plannerDays, plannerEvents, navigate, setPlannerDay, clearPlannerDayType, bulkSetByWeekday, bulkSetByRange, addPlannerEvent, removePlannerEvent, importSchoolCalendar, benchmarkSubjects, addBenchmarkSubject, removeBenchmarkSubject, addBenchmarkSegment, updateBenchmarkSegment, removeBenchmarkSegment }) {
  const [subTab, setSubTab] = useState("calendar");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showDocImport, setShowDocImport] = useState(false);
  const dayTypes = config.planner?.dayTypes || [];
  const dayTypeMap = {};
  dayTypes.forEach((t) => (dayTypeMap[t.id] = t));

  const applyCalendarImport = (items) => {
    items.forEach((it) => bulkSetByRange(it.status, it.start, it.end));
  };

  const grid = buildMonthGrid(year, monthIdx);
  const changeMonth = (delta) => {
    let m = monthIdx + delta, y = year;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setMonthIdx(m); setYear(y);
  };

  const eventsForDate = (d) => (plannerEvents || []).filter((e) => e.date === d);

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="planner" navigate={navigate} />

      <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 md:w-72">
        <button onClick={() => setSubTab("calendar")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "calendar" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Calendar</button>
        <button onClick={() => setSubTab("benchmarks")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "benchmarks" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Benchmarks</button>
      </div>

      {subTab === "benchmarks" ? (
        <BenchmarksView subjects={benchmarkSubjects} addSubject={addBenchmarkSubject} removeSubject={removeBenchmarkSubject}
          addSegment={addBenchmarkSegment} updateSegment={updateBenchmarkSegment} removeSegment={removeBenchmarkSegment}
          plannerDays={plannerDays} dayTypes={dayTypes} />
      ) : (
      <div className="md:flex md:gap-6 md:items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-1.5 text-stone-400 hover:text-stone-700"><ChevronLeft size={18} /></button>
            <p className="display-font text-lg font-bold text-stone-900">{monthLabel(year, monthIdx)}</p>
            <button onClick={() => changeMonth(1)} className="p-1.5 text-stone-400 hover:text-stone-700"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-[10px] font-semibold text-stone-400">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-5">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const dayType = plannerDays?.[d]?.dayType ? dayTypeMap[plannerDays[d].dayType] : null;
              const hasNotes = !!plannerDays?.[d]?.notes;
              const evCount = eventsForDate(d).length;
              const isToday = d === todayISO();
              const dayNum = Number(d.slice(-2));
              return (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`relative aspect-square rounded-lg text-xs font-semibold flex flex-col items-center justify-center border ${
                    selectedDate === d ? "border-slate-600" : "border-transparent"
                  } ${dayType ? `bg-${dayType.color}-100 text-${dayType.color}-800` : "bg-stone-50 text-stone-600 hover:bg-stone-100"} ${isToday ? "ring-2 ring-slate-400" : ""}`}>
                  {dayNum}
                  <span className="flex gap-0.5 mt-0.5">
                    {hasNotes && <span className="w-1 h-1 rounded-full bg-stone-400" />}
                    {evCount > 0 && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {dayTypes.map((t) => (
              <span key={t.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${t.color}-100 text-${t.color}-700`}>{t.label}</span>
            ))}
          </div>

          <button onClick={() => setShowBulk((v) => !v)} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-3">
            {showBulk ? "Hide" : "Bulk-set day types"} <ChevronDown size={12} className={showBulk ? "rotate-180" : ""} />
          </button>
          {showBulk && <BulkDayTypeForm dayTypes={dayTypes} bulkSetByWeekday={bulkSetByWeekday} bulkSetByRange={bulkSetByRange} />}

          {importSchoolCalendar && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs font-semibold text-stone-700 mb-1">School calendar (2026–2027)</p>
              <p className="text-xs text-stone-400 mb-2">Sets every school day, weekend, holiday, and early-dismissal day for the year in one go, based on your school's official calendar. Overwrites any day types you've already set in that range.</p>
              <ConfirmDelete onConfirm={importSchoolCalendar} label="Import 2026–2027 school calendar"
                className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50"
                confirmText="Apply calendar — overwrites existing day types?"
                armedClassName="text-xs font-semibold text-white bg-slate-600 rounded-lg px-3 py-2 whitespace-nowrap" />
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-1">Have your own calendar or document?</p>
            <p className="text-xs text-stone-400 mb-2">Upload or paste any other schedule — a different calendar version, a district document, anything with dates in it — and pull the day types out of it the same way.</p>
            {!showDocImport ? (
              <button onClick={() => setShowDocImport(true)} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50">
                Import from a document
              </button>
            ) : (
              <DocumentImportPanel mode="calendar" dayTypeOptions={dayTypes} onApplyCalendar={applyCalendarImport} onClose={() => setShowDocImport(false)} />
            )}
          </div>
        </div>

        {selectedDate && (
          <div className="md:w-80 shrink-0 mt-5 md:mt-0">
            <DayDetailPanel date={selectedDate} dayTypes={dayTypes} plannerDays={plannerDays} plannerEvents={eventsForDate(selectedDate)}
              fullDaySchedule={config.planner?.fullDaySchedule || []} halfDaySchedule={config.planner?.halfDaySchedule || []}
              setPlannerDay={setPlannerDay} clearPlannerDayType={clearPlannerDayType}
              addPlannerEvent={addPlannerEvent} removePlannerEvent={removePlannerEvent}
              onClose={() => setSelectedDate(null)} />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function schoolYearStart(refDate, yearOffset) {
  const m = refDate.getMonth(); // 0-indexed
  const y = m >= 5 ? refDate.getFullYear() : refDate.getFullYear() - 1; // Jun-Dec -> this year, Jan-May -> last year
  return new Date(y + (yearOffset || 0), 7, 1); // Aug 1
}
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function BenchmarksView({ subjects, addSubject, removeSubject, addSegment, updateSegment, removeSegment, plannerDays, dayTypes }) {
  const [activeId, setActiveId] = useState(subjects[0]?.id || null);
  const [showAddSubject, setShowAddSubject] = useState(subjects.length === 0);
  const [showDocImport, setShowDocImport] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showSegForm, setShowSegForm] = useState(false);
  const [segLabel, setSegLabel] = useState("");
  const [segStart, setSegStart] = useState(todayISO());
  const [segEnd, setSegEnd] = useState(addDaysISO(todayISO(), 13));
  const [yearOffset, setYearOffset] = useState(0);
  const [viewMode, setViewMode] = useState("timeline"); // timeline | calendar
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [editingSegId, setEditingSegId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [pendingCascade, setPendingCascade] = useState(null); // { delta, items: [{id,label,newStart,newEnd}] }

  useEffect(() => { if (!activeId && subjects[0]) setActiveId(subjects[0].id); }, [subjects, activeId]);
  const active = subjects.find((s) => s.id === activeId);

  const yearStart = schoolYearStart(new Date(), yearOffset);
  const yearEnd = new Date(yearStart.getFullYear() + 1, 6, 31);
  const totalDays = daysBetween(yearStart, yearEnd);
  const months = Array.from({ length: 12 }).map((_, i) => new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1));

  const submitSubject = () => { addSubject(newSubjectName); setNewSubjectName(""); setShowAddSubject(false); };
  const submitSegment = () => {
    if (!segLabel.trim() || !active) return;
    const color = COLOR_CHOICES[(active.segments.length) % COLOR_CHOICES.length];
    addSegment(active.id, { label: segLabel.trim(), startDate: segStart, endDate: segEnd, color });
    setSegLabel(""); setShowSegForm(false);
  };

  const openSegForm = () => {
    let defaultStart = todayISO();
    if (active && active.segments.length > 0) {
      const maxEnd = active.segments.reduce((m, s) => (s.endDate > m ? s.endDate : m), active.segments[0].endDate);
      defaultStart = addDaysISO(maxEnd, 1);
    }
    setSegStart(defaultStart);
    setSegEnd(addDaysISO(defaultStart, 13));
    setEditingSegId(null);
    setPendingCascade(null);
    setShowSegForm(true);
  };

  const openEditSegment = (seg) => {
    setShowSegForm(false);
    setEditingSegId(seg.id);
    setEditLabel(seg.label);
    setEditStart(seg.startDate);
    setEditEnd(seg.endDate);
    setPendingCascade(null);
  };

  const saveSegmentEdit = () => {
    if (!active) return;
    const oldSeg = active.segments.find((s) => s.id === editingSegId);
    if (!oldSeg) return;
    updateSegment(active.id, editingSegId, { label: editLabel.trim() || oldSeg.label, startDate: editStart, endDate: editEnd });

    if (editEnd !== oldSeg.endDate) {
      const delta = daysBetween(new Date(oldSeg.endDate + "T00:00:00"), new Date(editEnd + "T00:00:00"));
      const sorted = [...active.segments].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
      const idx = sorted.findIndex((s) => s.id === editingSegId);
      const cascadeItems = [];
      let prevOriginalEnd = oldSeg.endDate;
      for (let k = idx + 1; k < sorted.length; k++) {
        const seg = sorted[k];
        if (seg.startDate === addDaysISO(prevOriginalEnd, 1)) {
          cascadeItems.push({ id: seg.id, label: seg.label, newStart: addDaysISO(seg.startDate, delta), newEnd: addDaysISO(seg.endDate, delta) });
          prevOriginalEnd = seg.endDate;
        } else break;
      }
      if (cascadeItems.length > 0) {
        setPendingCascade({ delta, items: cascadeItems });
        return;
      }
    }
    setEditingSegId(null);
  };

  const applyCascade = () => {
    if (pendingCascade) {
      for (const item of pendingCascade.items) {
        updateSegment(active.id, item.id, { startDate: item.newStart, endDate: item.newEnd });
      }
    }
    setPendingCascade(null);
    setEditingSegId(null);
  };
  const dismissCascade = () => { setPendingCascade(null); setEditingSegId(null); };

  const barStyle = (seg) => {
    const s = new Date(seg.startDate + "T00:00:00");
    const e = new Date(seg.endDate + "T00:00:00");
    const left = Math.max(0, daysBetween(yearStart, s)) / totalDays * 100;
    const width = Math.max(0.5, daysBetween(s, e) + 1) / totalDays * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  const segmentForDate = (dateStr) => {
    if (!active) return null;
    return active.segments.find((seg) => dateStr >= seg.startDate && dateStr <= seg.endDate) || null;
  };

  const dayTypeMap = {};
  (dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));

  // 'full' = normal school day, 'half' = half-day schedule, 'none' = no school (Shabbos, etc.)
  const scheduleKindForDate = (dateStr) => {
    const dt = plannerDays?.[dateStr]?.dayType ? dayTypeMap[plannerDays[dateStr].dayType] : null;
    if (dt?.hidesAttendance) return "none";
    if (dt?.scheduleTemplate === "half") return "half";
    return "full";
  };

  const calMonthIdx0 = yearStart.getMonth() + calMonthOffset;
  const calYear = yearStart.getFullYear() + Math.floor(calMonthIdx0 / 12);
  const calMonthIdx = ((calMonthIdx0 % 12) + 12) % 12;
  const calGrid = buildMonthGrid(calYear, calMonthIdx);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        {subjects.map((s) => (
          <button key={s.id} onClick={() => { setActiveId(s.id); setShowAddSubject(false); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${activeId === s.id && !showAddSubject ? "bg-slate-700 text-white border-slate-700" : "text-stone-600 border-stone-300"}`}>
            {s.label}
          </button>
        ))}
        <button onClick={() => setShowAddSubject(true)}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showAddSubject ? "bg-slate-700 text-white border-slate-700" : "text-slate-700 border-slate-300"}`}>
          <Plus size={12} /> Add subject
        </button>
      </div>

      {showAddSubject && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
          <p className="text-sm font-semibold text-stone-800 mb-3">New benchmark subject</p>
          <p className="text-xs text-stone-400 mb-2">Academic or not — Kriya, Chumash, routines, behavior goals, anything you want to pace out over the year.</p>
          <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitSubject()}
            placeholder="e.g. Kriya, Chumash, Lining Up" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <div className="flex gap-2">
            <button onClick={submitSubject} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Create subject</button>
            {subjects.length > 0 && <button onClick={() => setShowAddSubject(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>}
          </div>
        </div>
      )}

      {!showAddSubject && active && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setYearOffset((y) => y - 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronLeft size={16} /></button>
              <p className="text-sm font-semibold text-stone-800">{active.label} — {yearStart.getFullYear()}–{yearStart.getFullYear() + 1}</p>
              <button onClick={() => setYearOffset((y) => y + 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
                <button onClick={() => setViewMode("timeline")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${viewMode === "timeline" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Timeline</button>
                <button onClick={() => setViewMode("calendar")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${viewMode === "calendar" ? "bg-white text-slate-700 shadow-sm" : "text-stone-500"}`}>Calendar</button>
              </div>
              <ConfirmDelete onConfirm={() => removeSubject(active.id)} label="Delete subject" />
            </div>
          </div>

          {viewMode === "timeline" ? (
            <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 overflow-x-auto">
              <div className="relative h-12 bg-stone-100 rounded-lg mb-1" style={{ minWidth: 700 }}>
                {months.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-stone-200" style={{ left: `${(i / 12) * 100}%` }} />
                ))}
                {active.segments.map((seg) => {
                  const dates = eachDateInRange(seg.startDate, seg.endDate);
                  return (
                    <div key={seg.id} title={`${seg.label}: ${seg.startDate} – ${seg.endDate} (tap to edit)`}
                      className="absolute top-1 bottom-1 cursor-pointer" style={barStyle(seg)} onClick={() => openEditSegment(seg)}>
                      <div className={`absolute inset-0 rounded-md bg-${seg.color}-100`} />
                      <div className="absolute inset-0 flex items-end rounded-md overflow-hidden">
                        {dates.map((d) => {
                          const kind = scheduleKindForDate(d);
                          if (kind === "none") return <div key={d} className="flex-1 h-full" />;
                          return <div key={d} className={`flex-1 bg-${seg.color}-500 ${kind === "half" ? "h-1/2" : "h-full"}`} />;
                        })}
                      </div>
                      <span className="absolute -top-4 left-0.5 text-[9px] font-semibold text-stone-600 whitespace-nowrap">{seg.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="relative h-4" style={{ minWidth: 700 }}>
                {months.map((m, i) => (
                  <span key={i} className="absolute text-[9px] text-stone-400" style={{ left: `${(i / 12) * 100}%` }}>
                    {m.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 mt-2">Full-height = school day, half-height = half day, gap = no school. Tap a bar to edit its dates.</p>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalMonthOffset((m) => m - 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronLeft size={16} /></button>
                <p className="text-sm font-semibold text-stone-800">{monthLabel(calYear, calMonthIdx)}</p>
                <button onClick={() => setCalMonthOffset((m) => m + 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-[9px] font-semibold text-stone-400">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calGrid.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const seg = segmentForDate(d);
                  const kind = scheduleKindForDate(d);
                  const dayNum = Number(d.slice(-2));
                  const colorClass = !seg || kind === "none"
                    ? "bg-stone-50 text-stone-400"
                    : kind === "half"
                      ? `bg-${seg.color}-200 text-stone-700`
                      : `bg-${seg.color}-400 text-white`;
                  return (
                    <div key={d} title={kind === "none" ? "No school" : seg ? `${seg.label}${kind === "half" ? " (half day)" : ""}` : ""}
                      className={`relative aspect-square rounded-lg text-[10px] font-semibold flex items-center justify-center ${colorClass}`}>
                      {dayNum}
                      {kind === "none" && <span className="absolute -top-0.5 -right-0.5 text-stone-300 text-[8px]">•</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-stone-400 mt-2">Solid = full school day in a benchmark, light = half day, blank = no school.</p>
            </div>
          )}

          <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Segments</p>
          <ul className="space-y-1.5 mb-4">
            {active.segments.length === 0 && <li className="text-xs text-stone-400">No segments yet — add your first benchmark period below.</li>}
            {active.segments.map((seg) => (
              <li key={seg.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs">
                <button onClick={() => openEditSegment(seg)} className="flex items-center gap-2 text-left hover:opacity-70">
                  <span className={`w-2.5 h-2.5 rounded-full bg-${seg.color}-400 shrink-0`} />
                  <span className="font-medium text-stone-700">{seg.label}</span>
                  <span className="text-stone-400">{seg.startDate} → {seg.endDate}</span>
                </button>
                <ConfirmDelete onConfirm={() => removeSegment(active.id, seg.id)} size={13} />
              </li>
            ))}
          </ul>

          {editingSegId && !pendingCascade && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:w-96 mb-4">
              <p className="text-sm font-semibold text-stone-800 mb-3">Edit segment</p>
              <label className="block text-xs font-medium text-stone-500 mb-1">Label</label>
              <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">From</label>
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">To</label>
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveSegmentEdit} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Save changes</button>
                <button onClick={() => setEditingSegId(null)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          )}

          {pendingCascade && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:w-96 mb-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">Shift the following segment{pendingCascade.items.length > 1 ? "s" : ""} too?</p>
              <p className="text-xs text-amber-700 mb-3">
                {pendingCascade.items.map((it) => it.label).join(", ")} {pendingCascade.items.length > 1 ? "were" : "was"} lined up right after this one.
                Moving the end date by {Math.abs(pendingCascade.delta)} day{Math.abs(pendingCascade.delta) === 1 ? "" : "s"} {pendingCascade.delta > 0 ? "later" : "earlier"} can carry them forward automatically, keeping everything connected.
              </p>
              <div className="flex gap-2">
                <button onClick={applyCascade} className="flex-1 bg-amber-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-amber-700">Yes, shift them too</button>
                <button onClick={dismissCascade} className="px-4 text-sm text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100">No, just this one</button>
              </div>
            </div>
          )}

          {showSegForm ? (
            <div className="bg-white border border-stone-200 rounded-xl p-4 md:w-96">
              <label className="block text-xs font-medium text-stone-500 mb-1">Label</label>
              <input value={segLabel} onChange={(e) => setSegLabel(e.target.value)} placeholder="e.g. Kamatz/Patach" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">From</label>
                  <input type="date" value={segStart} onChange={(e) => setSegStart(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">To</label>
                  <input type="date" value={segEnd} onChange={(e) => setSegEnd(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={submitSegment} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Add segment</button>
                <button onClick={() => setShowSegForm(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={openSegForm} className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Plus size={12} /> Add segment</button>
              <button onClick={() => setShowDocImport((v) => !v)} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-2.5 py-1 hover:bg-stone-50">
                Import from a document
              </button>
            </div>
          )}
          {showDocImport && (
            <DocumentImportPanel mode="benchmark"
              onApplyBenchmark={(items) => {
                items.forEach((it, i) => addSegment(active.id, { label: it.label, startDate: it.start, endDate: it.end, color: COLOR_CHOICES[(active.segments.length + i) % COLOR_CHOICES.length] }));
              }}
              onClose={() => setShowDocImport(false)} />
          )}
        </div>
      )}
    </div>
  );
}

function DocumentImportPanel({ mode, dayTypeOptions, onApplyCalendar, onApplyBenchmark, onClose }) {
  const [rawText, setRawText] = useState("");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState(null); // null = not extracted yet
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setRawText(""); setPdfBase64(null); setItems(null); setError("");
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => setPdfBase64(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => setRawText(reader.result);
      reader.readAsText(file);
    }
  };

  const extract = async () => {
    setExtracting(true); setError(""); setItems(null);
    try {
      const instructions = mode === "calendar"
        ? `Extract every distinct date range and its school status from this document. Valid statuses are exactly: ${dayTypeOptions.map((t) => t.id).join(", ")}. Infer the closest matching status from context (a holiday or break = "no-school", an early dismissal = "half-day" if that option exists, a late start = "late-start" if that option exists, otherwise pick the closest available option). Output ONLY a JSON array, no other text, no markdown fences: [{"start":"YYYY-MM-DD","end":"YYYY-MM-DD","status":"...","label":"short description"}]. Use the same date for "start" and "end" if it's a single day.`
        : `Extract every distinct benchmark, unit, or pacing period and its date range from this document. Output ONLY a JSON array, no other text, no markdown fences: [{"start":"YYYY-MM-DD","end":"YYYY-MM-DD","label":"short name of this unit/benchmark"}]`;
      const content = pdfBase64
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }, { type: "text", text: instructions }]
        : `${instructions}\n\nDocument text:\n${rawText}`;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 2000, messages: [{ role: "user", content }] }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
      const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || parsed.length === 0) { setError("Nothing recognizable was found in this document."); setItems(null); }
      else setItems(parsed.map((p) => ({ ...p, id: uid() })));
    } catch (e) {
      setError("Could not read this document — try pasting the text directly instead.");
    } finally {
      setExtracting(false);
    }
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id, field, value) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const apply = () => {
    if (mode === "calendar") onApplyCalendar(items);
    else onApplyBenchmark(items);
    onClose();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-stone-800 mb-1">Import from a document</p>
      <p className="text-xs text-stone-400 mb-3">Paste the text, or upload a plain text/CSV file or a PDF. Nothing is applied until you review it below.</p>

      {items === null && (
        <>
          <textarea value={rawText} onChange={(e) => { setRawText(e.target.value); setPdfBase64(null); setFileName(""); }} rows={5}
            placeholder="Paste your document text here..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
              Upload a file
              <input type="file" accept=".txt,.csv,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </label>
            {fileName && <span className="text-xs text-stone-500">{fileName}</span>}
          </div>
          {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={extract} disabled={extracting || (!rawText.trim() && !pdfBase64)}
              className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-2">
              {extracting ? <Loader2 className="animate-spin" size={16} /> : null} {extracting ? "Reading document..." : "Extract dates"}
            </button>
            <button onClick={onClose} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </>
      )}

      {items !== null && (
        <>
          <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Review before applying — {items.length} found</p>
          <ul className="space-y-1.5 mb-3 max-h-72 overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-1.5 bg-stone-50 rounded-lg p-2">
                <input value={it.label} onChange={(e) => updateItem(it.id, "label", e.target.value)} className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs" />
                <input type="date" value={it.start} onChange={(e) => updateItem(it.id, "start", e.target.value)} className="rounded border border-stone-200 px-1.5 py-1 text-xs" />
                <span className="text-stone-400 text-xs">→</span>
                <input type="date" value={it.end} onChange={(e) => updateItem(it.id, "end", e.target.value)} className="rounded border border-stone-200 px-1.5 py-1 text-xs" />
                {mode === "calendar" && (
                  <select value={it.status} onChange={(e) => updateItem(it.id, "status", e.target.value)} className="rounded border border-stone-200 px-1 py-1 text-xs bg-white">
                    {dayTypeOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                )}
                <button onClick={() => removeItem(it.id)} className="text-stone-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button onClick={apply} disabled={items.length === 0} className="flex-1 bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
              Apply {items.length} item{items.length === 1 ? "" : "s"}
            </button>
            <button onClick={() => setItems(null)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Start over</button>
          </div>
        </>
      )}
    </div>
  );
}

function BulkDayTypeForm({ dayTypes, bulkSetByWeekday, bulkSetByRange }) {
  const [mode, setMode] = useState("weekday"); // weekday | range
  const [dayType, setDayType] = useState(dayTypes[0]?.id || "");
  const [weekdays, setWeekdays] = useState([5]); // default Friday
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(addDaysISO(todayISO(), 180));

  const toggleWeekday = (i) => setWeekdays((prev) => (prev.includes(i) ? prev.filter((w) => w !== i) : [...prev, i]));

  const apply = () => {
    if (!dayType) return;
    if (mode === "weekday") bulkSetByWeekday(weekdays, dayType, start, end);
    else bulkSetByRange(dayType, start, end);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode("weekday")} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border ${mode === "weekday" ? "bg-slate-700 text-white border-slate-700" : "border-stone-300 text-stone-600"}`}>By weekday (e.g. every Friday)</button>
        <button onClick={() => setMode("range")} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border ${mode === "range" ? "bg-slate-700 text-white border-slate-700" : "border-stone-300 text-stone-600"}`}>By date range (e.g. a whole week off)</button>
      </div>

      {mode === "weekday" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {WEEKDAY_LABELS.map((w, i) => (
            <button key={w} onClick={() => toggleWeekday(i)} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${weekdays.includes(i) ? "bg-slate-700 text-white border-slate-700" : "border-stone-300 text-stone-600"}`}>{w}</button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-stone-400 mb-0.5">From</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-stone-400 mb-0.5">Through</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
      </div>

      <label className="block text-[10px] text-stone-400 mb-0.5">Set as</label>
      <select value={dayType} onChange={(e) => setDayType(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3 bg-white">
        {dayTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <button onClick={apply} className="w-full bg-slate-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800">Apply</button>
    </div>
  );
}

function DayDetailPanel({ date, dayTypes, plannerDays, plannerEvents, setPlannerDay, clearPlannerDayType, addPlannerEvent, removePlannerEvent, fullDaySchedule, halfDaySchedule, onClose }) {
  const entry = plannerDays?.[date] || {};
  const [notes, setNotes] = useState(entry.notes || "");
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evLead, setEvLead] = useState(1);
  const [slotDrafts, setSlotDrafts] = useState(entry.slotContent || {});

  useEffect(() => { setNotes(plannerDays?.[date]?.notes || ""); setSlotDrafts(plannerDays?.[date]?.slotContent || {}); }, [date, plannerDays]);

  const saveNotes = () => setPlannerDay(date, { notes });
  const saveSlot = (slotId, text) => setPlannerDay(date, { slotContent: { ...(plannerDays?.[date]?.slotContent || {}), [slotId]: text } });
  const saveEvent = () => {
    if (!evTitle.trim()) return;
    addPlannerEvent({ date, title: evTitle.trim(), reminderLeadDays: Number(evLead) || 0 });
    setEvTitle(""); setEvLead(1); setShowEventForm(false);
  };

  const dayType = dayTypes.find((t) => t.id === entry.dayType);
  const template = dayType?.scheduleTemplate === "full" ? fullDaySchedule : dayType?.scheduleTemplate === "half" ? halfDaySchedule : null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-stone-800 text-sm">{date}</p>
        <button onClick={onClose} className="text-stone-400 text-xs hover:text-stone-700">Close</button>
      </div>

      <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Day type</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {dayTypes.map((t) => (
          <button key={t.id} onClick={() => setPlannerDay(date, { dayType: t.id })}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${entry.dayType === t.id ? `bg-${t.color}-500 text-white border-${t.color}-500` : "border-stone-300 text-stone-600"}`}>
            {t.label}
          </button>
        ))}
        {entry.dayType && <button onClick={() => clearPlannerDayType(date)} className="text-xs text-stone-400 underline">Clear</button>}
      </div>

      {template && template.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Today's schedule</p>
          <div className="space-y-2">
            {template.map((slot) => (
              <div key={slot.id} className="border border-stone-200 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-stone-700">{slot.label}</span>
                  <span className="text-[10px] text-stone-400">{slot.startTime}–{slot.endTime}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <textarea
                    value={slotDrafts[slot.id] || ""}
                    onChange={(e) => setSlotDrafts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                    onBlur={(e) => saveSlot(slot.id, e.target.value)}
                    rows={2} placeholder="What's being covered..."
                    className="flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs" />
                  <MicButton onResult={(spoken) => {
                    const next = slotDrafts[slot.id] ? `${slotDrafts[slot.id]} ${spoken}` : spoken;
                    setSlotDrafts((prev) => ({ ...prev, [slot.id]: next }));
                    saveSlot(slot.id, next);
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {entry.dayType && !template && (
        <p className="text-[10px] text-stone-400 mb-4">No schedule template assigned to "{dayType?.label}" — set one in Settings if you want period-by-period slots for this day type.</p>
      )}

      <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Notes</p>
      <div className="flex items-start gap-1.5 mb-4">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3}
          className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Lesson plan, what to prep, anything worth remembering" />
        <MicButton onResult={(spoken) => {
          const next = notes ? `${notes} ${spoken}` : spoken;
          setNotes(next);
          setPlannerDay(date, { notes: next });
        }} />
      </div>

      <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Events / reminders</p>
      <ul className="space-y-1.5 mb-2">
        {plannerEvents.map((e) => (
          <li key={e.id} className="flex items-center justify-between text-xs bg-stone-50 rounded-lg px-2 py-1.5">
            <span className="text-stone-700">{e.title}{e.reminderLeadDays > 0 ? ` (remind ${e.reminderLeadDays}d before)` : ""}</span>
            <ConfirmDelete onConfirm={() => removePlannerEvent(e.id)} size={12} />
          </li>
        ))}
        {plannerEvents.length === 0 && <li className="text-xs text-stone-400">None yet.</li>}
      </ul>

      {showEventForm ? (
        <div className="border-t border-stone-100 pt-3">
          <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <label className="block text-[10px] text-stone-400 mb-0.5">Remind me this many days before</label>
          <input type="number" min={0} value={evLead} onChange={(e) => setEvLead(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <div className="flex gap-2">
            <button onClick={saveEvent} className="flex-1 bg-slate-700 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-slate-800">Save</button>
            <button onClick={() => setShowEventForm(false)} className="px-3 text-xs text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowEventForm(true)} className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Plus size={12} /> Add event</button>
      )}
    </div>
  );
}

// ---------- Session (flashcards) ----------

function SessionView({ category, config, idx, setIdx, onGrade, onFinish }) {
  const item = category.items[idx];
  const isLast = idx >= category.items.length - 1;
  const handleGrade = (resultId) => { onGrade(item.id, resultId); if (isLast) onFinish(); else setIdx(idx + 1); };
  return (
    <div className={`${PAGE} flex flex-col min-h-screen`}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={onFinish} className="flex items-center text-stone-500 text-sm hover:text-stone-800"><ChevronLeft size={16} /> End session</button>
        <span className="text-xs text-stone-400 font-medium">{idx + 1} / {category.items.length}</span>
      </div>
      <p className="text-center text-stone-500 text-sm mb-6">{category.title}</p>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm w-full md:w-96 py-14 flex flex-col items-center justify-center mb-8">
          {category.mode !== "skill" ? (
            <span className="heb-font text-7xl text-stone-900" dir="rtl">{item.char}</span>
          ) : (
            <div className="px-6 text-center">
              <p className="display-font text-xl font-semibold text-stone-900 mb-2">{item.label}</p>
              <p className="text-stone-500 text-sm">{item.desc}</p>
            </div>
          )}
          {category.mode !== "skill" && <p className="text-stone-400 text-xs mt-4">{item.label}</p>}
        </div>
        <div className="grid gap-2 w-full md:w-96" style={{ gridTemplateColumns: `repeat(${config.gradeOptions.length}, 1fr)` }}>
          {config.gradeOptions.map((opt) => (
            <button key={opt.id} onClick={() => handleGrade(opt.id)} className={`flex flex-col items-center gap-1 text-white rounded-xl py-3 bg-${opt.color}-500 hover:bg-${opt.color}-600`}>
              <span className="text-xs font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Fluency form ----------

function FluencyForm({ student, onCancel, onSave }) {
  const [words, setWords] = useState("");
  const [hesitation, setHesitation] = useState("some");
  const [mode, setMode] = useState("decoding");
  const [notes, setNotes] = useState("");
  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Fluency check</h1>
      <p className="text-stone-500 text-sm mb-5">{student?.name}</p>
      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Words read correctly</label>
        <input type="number" value={words} onChange={(e) => setWords(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" placeholder="e.g. 12" />
        <label className="block text-sm font-semibold text-stone-700 mb-1">Hesitation level</label>
        <select value={hesitation} onChange={(e) => setHesitation(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4 bg-white">
          <option value="none">None — smooth reading</option>
          <option value="some">Some — occasional pauses</option>
          <option value="frequent">Frequent — stops often</option>
        </select>
        <label className="block text-sm font-semibold text-stone-700 mb-1">Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4 bg-white">
          <option value="decoding">Still decoding letter-by-letter</option>
          <option value="automatic">Reading automatically</option>
        </select>
        <label className="block text-sm font-semibold text-stone-700 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-5" placeholder="Anything else worth remembering" />
        <button onClick={() => onSave({ wordsRead: Number(words) || 0, hesitation, mode, notes })} className="w-full bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800">
          Save fluency check
        </button>
      </div>
    </div>
  );
}

// ---------- Incident form ----------

function IncidentForm({ roster, config, presetId, onCancel, onSave }) {
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time] = useState(() => new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState("");
  const [studentIds, setStudentIds] = useState(presetId ? [presetId] : []);
  const [showDetails, setShowDetails] = useState(false);
  const toggleStudent = (id) => setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => onSave({ category, date, time, description, studentIds });

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Report incident</h1>
      <p className="text-xs text-stone-400 mb-5">Logged at {time} — add details now, or come back and fill them in later.</p>
      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Students involved</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roster.map((s) => {
            const selected = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${selected ? "bg-slate-700 text-white border-slate-700" : "text-stone-600 border-stone-300"}`}>
                {s.name}
              </button>
            );
          })}
        </div>

        <button disabled={studentIds.length === 0} onClick={save}
          className="w-full bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 mb-2">
          Log it — that's enough for now
        </button>
        {studentIds.length === 0 && <p className="text-xs text-stone-400 text-center mb-3">Select at least one student</p>}

        {!showDetails ? (
          <button onClick={() => setShowDetails(true)} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mx-auto mt-1">
            + Add details now instead
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <label className="block text-sm font-semibold text-stone-700 mb-1">Category <span className="text-stone-400 font-normal">(optional)</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4 bg-white">
              <option value="">Not set yet</option>
              {config.incidents.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" />
            <label className="block text-sm font-semibold text-stone-700 mb-1">What happened <span className="text-stone-400 font-normal">(optional)</span></label>
            <div className="flex items-start gap-1.5 mb-5">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="Type, or use the mic" />
              <MicButton onResult={(spoken) => setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
            </div>
            <button disabled={studentIds.length === 0} onClick={save}
              className="w-full bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
              Save with these details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Period attendance (separate from morning attendance) ----------

function PeriodAttendanceForm({ roster, config, presetId, todaysPeriods, onCancel, onSave }) {
  const [typeId, setTypeId] = useState(config.periodAttendance.types[0]?.id || "");
  const [periodId, setPeriodId] = useState("");
  const [minutesLate, setMinutesLate] = useState("");
  const [notes, setNotes] = useState("");
  const [time] = useState(() => new Date().toTimeString().slice(0, 5));
  const [studentIds, setStudentIds] = useState(presetId ? [presetId] : []);
  const toggleStudent = (id) => setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    if (studentIds.length === 0 || !typeId) return;
    onSave(studentIds, { date: todayISO(), time, typeId, periodId: periodId || null, notes, minutesLate: typeId === "late-to-class" && minutesLate ? Number(minutesLate) : null });
  };

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Log period attendance</h1>
      <p className="text-xs text-stone-400 mb-5">Logged at {time} — separate from morning attendance, for mid-day changes.</p>

      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Students</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roster.map((s) => {
            const selected = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${selected ? "bg-slate-700 text-white border-slate-700" : "text-stone-600 border-stone-300"}`}>
                {s.name}
              </button>
            );
          })}
        </div>

        <label className="block text-sm font-semibold text-stone-700 mb-1">What happened</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {config.periodAttendance.types.map((t) => (
            <button key={t.id} onClick={() => setTypeId(t.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${typeId === t.id ? `bg-${t.color}-500 text-white border-${t.color}-500` : "text-stone-600 border-stone-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {typeId === "late-to-class" && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-stone-700 mb-1">Minutes late <span className="text-stone-400 font-normal">(optional)</span></label>
            <input type="number" min="0" value={minutesLate} onChange={(e) => setMinutesLate(e.target.value)} placeholder="e.g. 15"
              className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <p className="text-[10px] text-stone-400 mt-1">Adds to this student's total lateness minutes when you generate a report later.</p>
          </div>
        )}

        {todaysPeriods && todaysPeriods.length > 0 && (
          <>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Period <span className="text-stone-400 font-normal">(optional)</span></label>
            <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4 bg-white">
              <option value="">Not specified</option>
              {todaysPeriods.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.startTime}–{p.endTime})</option>)}
            </select>
          </>
        )}

        <label className="block text-sm font-semibold text-stone-700 mb-1">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything worth adding" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-5" />

        <button disabled={studentIds.length === 0 || !typeId} onClick={save}
          className="w-full bg-slate-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40">
          Log it
        </button>
        {studentIds.length === 0 && <p className="text-xs text-stone-400 text-center mt-2">Select at least one student</p>}
      </div>
    </div>
  );
}

// ---------- Message draft (AI-generated, never auto-sent) ----------

async function generateMessage(student, flag) {
  const prompt = `Write a warm, brief, professional message from a Hebrew school teacher to a parent.
Student's first name: ${student.name}
Situation: ${flag.label}
Suggested next step: ${flag.message}
Keep it under 120 words, friendly but direct, no exaggeration. Sign off as "[Your name]". Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

function MessageDraftView({ student, flag, onBack, onSaveParentEmail, onLogSent }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  const run = useCallback(async () => {
    setLoading(true); setError(false); setLogged(false);
    try {
      const text = await generateMessage(student, flag);
      setDraft(text || "Could not generate a draft — please write one manually.");
    } catch { setError(true); } finally { setLoading(false); }
  }, [student, flag]);

  useEffect(() => { run(); }, [run]);

  const subject = `About ${student.name} — ${flag.label.split(" — ")[0]}`;
  const mailtoHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "flag-message", subject, body: draft });
    setLogged(true);
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Draft message</h1>
      <p className="text-stone-500 text-sm mb-5">{student?.name} — {flag.label}</p>
      <div className="md:w-[32rem]">
        <label className="block text-xs font-medium text-stone-500 mb-1">Parent email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onSaveParentEmail(email)}
          placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" />
        <label className="block text-xs font-medium text-stone-500 mb-1">Message — edit before sending</label>
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-stone-200 rounded-lg mb-4"><Loader2 className="animate-spin text-slate-700" size={22} /></div>
        ) : error ? (
          <p className="text-xs text-rose-600 py-4">Couldn't generate a draft right now. Try again, or write the message yourself below.</p>
        ) : null}
        {!loading && (
          <div className="flex items-start gap-1.5 mb-4">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setLogged(false); }} rows={8} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => { setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken)); setLogged(false); }} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-2">
          <button onClick={run} className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
          <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy message"}
          </button>
          <a href={mailtoHref} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 rounded-lg px-3 py-2 hover:bg-slate-800"><Mail size={13} /> Open in Mail</a>
          <button onClick={logSent} disabled={logged}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2 ${logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
            {logged ? <Check size={13} /> : null} {logged ? "Logged as sent" : "Log as sent"}
          </button>
        </div>
        <p className="text-xs text-stone-400">Nothing sends automatically — review the message, send it yourself, then log it so it's on record in Parent Communication.</p>
      </div>
    </div>
  );
}

// ---------- Settings ----------

function SettingsView({ config, setConfig, onBack, roster, addStudent, removeStudent, updateStudentField, loadSampleData, clearAllData, className, onRenameClass, onChangePassword, onArchiveClass }) {
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [newName, setNewName] = useState("");
  const [classNameInput, setClassNameInput] = useState(className || "");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const update = (mutator) => setConfig(mutator(structuredClone(config)));
  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));
  const toggleStudent = (id) => setExpandedStudents((p) => ({ ...p, [id]: !p[id] }));
  const submitNewStudent = () => { addStudent(newName); setNewName(""); };

  const saveClassName = () => { if (classNameInput.trim() && onRenameClass) onRenameClass(classNameInput.trim()); };
  const savePassword = () => {
    if (!newPw1.trim() || newPw1 !== newPw2 || !onChangePassword) return;
    onChangePassword(newPw1.trim());
    setNewPw1(""); setNewPw2(""); setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  return (
    <div className={`${PAGE} pb-16`}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-6">Settings</h1>

      <div className="md:grid md:grid-cols-2 md:gap-x-6 md:items-start">
        <div className="md:col-span-2">
          {onRenameClass && (
            <Section title="Class management">
              <label className="block text-xs font-medium text-stone-500 mb-1">Class name</label>
              <div className="flex gap-2 mb-4">
                <input value={classNameInput} onChange={(e) => setClassNameInput(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <button onClick={saveClassName} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50">Save</button>
              </div>

              <label className="block text-xs font-medium text-stone-500 mb-1">Change class password</label>
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <input type="password" value={newPw1} onChange={(e) => setNewPw1(e.target.value)} placeholder="New password" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="Confirm new password" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <button onClick={savePassword} disabled={!newPw1.trim() || newPw1 !== newPw2} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-40">Update password</button>
              </div>
              {newPw1 && newPw2 && newPw1 !== newPw2 && <p className="text-xs text-red-500 mb-2">Passwords don't match.</p>}
              {pwSaved && <p className="text-xs text-emerald-600 mb-2">Password updated.</p>}

              <div className="mt-4 pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400 mb-2">Archiving hides this class from the class picker — nothing is deleted, and an admin can restore it anytime from the Admin Dashboard.</p>
                <ConfirmDelete onConfirm={onArchiveClass} label="Archive this class" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" />
              </div>
            </Section>
          )}

          <Section title="Demo & data reset">
            <p className="text-xs text-stone-400 mb-3">Useful when sharing this with another teacher for feedback, or starting fresh. Both replace your current roster, attendance, incidents, points, planner entries, and benchmarks — your Settings customizations (categories, thresholds, schedule templates) are kept either way.</p>
            <div className="flex flex-wrap gap-2">
              <ConfirmDelete onConfirm={loadSampleData} label="Load sample data" className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50" />
              <ConfirmDelete onConfirm={clearAllData} label="Clear all data" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" />
            </div>
          </Section>

          <Section title="Students">
            <div className="flex gap-2 mb-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewStudent()}
                placeholder="Add a student's name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <button onClick={submitNewStudent} className="bg-slate-700 text-white rounded-lg px-3 py-1.5 flex items-center justify-center hover:bg-slate-800"><Plus size={16} /></button>
            </div>
            {roster.length === 0 && <p className="text-xs text-stone-400">No students yet — add one above.</p>}
            <div className="space-y-2">
              {roster.map((s) => (
                <div key={s.id} className="border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input value={s.name} onChange={(e) => updateStudentField(s.id, "name", e.target.value)} className="flex-1 text-sm font-semibold text-stone-800 border-none focus:outline-none bg-transparent" />
                    <button onClick={() => toggleStudent(s.id)} className="text-stone-400 p-1">{expandedStudents[s.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                    <ConfirmDelete onConfirm={() => removeStudent(s.id)} size={14} />
                  </div>
                  {expandedStudents[s.id] && (
                    <div className="px-3 pb-3 border-t border-stone-100 pt-2 md:grid md:grid-cols-2 md:gap-2">
                      <p className="md:col-span-2 text-[10px] font-semibold text-stone-400 uppercase mt-1 mb-0.5">Parent / Guardian 1</p>
                      <div>
                        <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
                        <input value={s.parent1Name || ""} onChange={(e) => updateStudentField(s.id, "parent1Name", e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
                        <input type="tel" value={s.parentPhone || ""} onChange={(e) => updateStudentField(s.id, "parentPhone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-stone-400 mb-0.5">Email (primary contact)</label>
                        <input type="email" value={s.parentEmail || ""} onChange={(e) => updateStudentField(s.id, "parentEmail", e.target.value)} placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>

                      <p className="md:col-span-2 text-[10px] font-semibold text-stone-400 uppercase mt-1 mb-0.5">Parent / Guardian 2</p>
                      <div>
                        <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
                        <input value={s.parent2Name || ""} onChange={(e) => updateStudentField(s.id, "parent2Name", e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
                        <input type="tel" value={s.parent2Phone || ""} onChange={(e) => updateStudentField(s.id, "parent2Phone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-stone-400 mb-0.5">Email</label>
                        <input type="email" value={s.parent2Email || ""} onChange={(e) => updateStudentField(s.id, "parent2Email", e.target.value)} placeholder="parent2@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-stone-400 mb-0.5">Home address</label>
                        <input value={s.homeAddress || ""} onChange={(e) => updateStudentField(s.id, "homeAddress", e.target.value)} placeholder="Street, city, zip" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-stone-400 mb-0.5">Notes</label>
                        <textarea value={s.notes || ""} onChange={(e) => updateStudentField(s.id, "notes", e.target.value)} rows={2} placeholder="Anything worth remembering about this student" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Planner day types">
          {(config.planner?.dayTypes || []).map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 mb-2 flex-wrap">
              <input value={t.label} onChange={(e) => update((c) => { c.planner.dayTypes[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <select value={t.color} onChange={(e) => update((c) => { c.planner.dayTypes[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={t.scheduleTemplate || "none"} onChange={(e) => update((c) => { c.planner.dayTypes[i].scheduleTemplate = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                <option value="full">Full day schedule</option>
                <option value="half">Half day schedule</option>
                <option value="none">No schedule</option>
              </select>
              <label className="flex items-center gap-1 text-[10px] text-stone-500 whitespace-nowrap">
                <input type="checkbox" checked={!!t.hidesAttendance} onChange={(e) => update((c) => { c.planner.dayTypes[i].hidesAttendance = e.target.checked; return c; })} />
                Hides attendance
              </label>
              <ConfirmDelete onConfirm={() => update((c) => { c.planner.dayTypes.splice(i, 1); return c; })} size={14} />
            </div>
          ))}
          <button onClick={() => update((c) => { c.planner = c.planner || { dayTypes: [] }; c.planner.dayTypes.push({ id: uid(), label: "New type", color: "sky", hidesAttendance: false, scheduleTemplate: "none" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add day type</button>
        </Section>

        <div className="md:col-span-2">
          <Section title="Daily schedule templates">
            <p className="text-xs text-stone-400 mb-3">Set up your bell schedule once — it applies to every day of that type. Order matters (drag isn't available, so use the arrows).</p>
            {["fullDaySchedule", "halfDaySchedule"].map((key) => (
              <div key={key} className="mb-5">
                <p className="text-sm font-semibold text-stone-700 mb-2">{key === "fullDaySchedule" ? "Full Day Schedule" : "Half Day Schedule"}</p>
                {(config.planner?.[key] || []).map((slot, i) => (
                  <div key={slot.id} className="flex items-center gap-1.5 mb-1.5">
                    <input value={slot.label} onChange={(e) => update((c) => { c.planner[key][i].label = e.target.value; return c; })} placeholder="Subject / period" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                    <input type="time" value={slot.startTime} onChange={(e) => update((c) => { c.planner[key][i].startTime = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                    <span className="text-stone-400 text-xs">–</span>
                    <input type="time" value={slot.endTime} onChange={(e) => update((c) => { c.planner[key][i].endTime = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                    <button disabled={i === 0} onClick={() => update((c) => { const arr = c.planner[key]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return c; })} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronUp size={13} /></button>
                    <button disabled={i === (config.planner?.[key] || []).length - 1} onClick={() => update((c) => { const arr = c.planner[key]; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; return c; })} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronDown size={13} /></button>
                    <ConfirmDelete onConfirm={() => update((c) => { c.planner[key].splice(i, 1); return c; })} size={13} />
                  </div>
                ))}
                <button onClick={() => update((c) => { c.planner[key] = c.planner[key] || []; c.planner[key].push({ id: uid(), label: "New period", startTime: "09:00", endTime: "09:45" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add period</button>
              </div>
            ))}
          </Section>
        </div>

        <Section title="Class Log — mark types">
          <p className="text-xs text-stone-400 mb-3">The check/X (or whatever you define) system used in Points → Class Log, tallied per class period per day.</p>
          {(config.points?.behaviorLog?.markTypes || []).map((m, i) => (
            <div key={m.id} className="flex items-center gap-2 mb-2">
              <input value={m.label} onChange={(e) => update((c) => { c.points.behaviorLog.markTypes[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <select value={m.color} onChange={(e) => update((c) => { c.points.behaviorLog.markTypes[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ConfirmDelete onConfirm={() => update((c) => { if (c.points.behaviorLog.markTypes.length > 1) c.points.behaviorLog.markTypes.splice(i, 1); return c; })} size={14} />
            </div>
          ))}
          <button onClick={() => update((c) => { c.points.behaviorLog.markTypes.push({ id: uid(), label: "New mark", color: "sky" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1 mb-4"><Plus size={12} /> Add mark type</button>

          <label className="block text-xs font-medium text-stone-500 mb-1">Summarize totals</label>
          <select value={config.points?.behaviorLog?.summaryMode || "daily"} onChange={(e) => update((c) => { c.points.behaviorLog.summaryMode = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
            <option value="daily">End of day</option>
            <option value="weekly">End of week</option>
            <option value="both">Both</option>
          </select>
        </Section>

        <Section title="Points categories">
          {(config.points?.categories || []).map((cat, i) => (
            <div key={cat.id} className="border border-stone-200 rounded-lg p-2.5 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <input value={cat.label} onChange={(e) => update((c) => { c.points.categories[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="e.g. Diligence Points" />
                <select value={cat.color} onChange={(e) => update((c) => { c.points.categories[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                  {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ConfirmDelete onConfirm={() => update((c) => { c.points.categories.splice(i, 1); return c; })} size={14} />
              </div>
              <div className="flex gap-2 mb-2">
                <select value={cat.scope} onChange={(e) => update((c) => { c.points.categories[i].scope = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs bg-white">
                  <option value="individual">Per-student</option>
                  <option value="class">Whole class</option>
                </select>
                <select value={cat.displayMode} onChange={(e) => update((c) => { c.points.categories[i].displayMode = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs bg-white">
                  <option value="bar">Fill-up visual</option>
                  <option value="counter">Simple counter</option>
                </select>
              </div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-stone-400 mb-0.5">Add amount</label>
                  <input type="number" min={1} value={cat.increment} onChange={(e) => update((c) => { c.points.categories[i].increment = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-stone-400 mb-0.5">Reward threshold</label>
                  <input type="number" min={0} value={cat.threshold} onChange={(e) => update((c) => { c.points.categories[i].threshold = Math.max(0, Number(e.target.value) || 0); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                </div>
              </div>
              <label className="block text-[10px] text-stone-400 mb-0.5">Reward description</label>
              <input value={cat.rewardMessage} onChange={(e) => update((c) => { c.points.categories[i].rewardMessage = e.target.value; return c; })} placeholder="e.g. Pizza party" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
            </div>
          ))}
          {(config.points?.categories || []).length === 0 && <p className="text-xs text-stone-400">No categories yet — add one from the Points tab.</p>}
        </Section>

        <Section title="Monthly reports">
          <label className="block text-xs font-medium text-stone-500 mb-1">Remind me around day of the month</label>
          <input type="number" min={1} max={28} value={config.monthlyReports?.dayOfMonth ?? 25}
            onChange={(e) => update((c) => { c.monthlyReports = c.monthlyReports || {}; c.monthlyReports.dayOfMonth = Math.min(28, Math.max(1, Number(e.target.value) || 1)); return c; })}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <label className="flex items-center gap-2 text-xs text-stone-600 mb-2">
            <input type="checkbox" checked={!!config.monthlyReports?.avoidFriday}
              onChange={(e) => update((c) => { c.monthlyReports = c.monthlyReports || {}; c.monthlyReports.avoidFriday = e.target.checked; return c; })} />
            Also avoid Fridays (shifts to Thursday instead)
          </label>
          <p className="text-[11px] text-stone-400">If the day lands on Saturday, the reminder always shifts to Sunday. This is a simple calendar rule, not a zmanim calculation.</p>
        </Section>

        <Section title="Kriya grading scale">
          {config.gradeOptions.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2 mb-2">
              <input value={opt.label} onChange={(e) => update((c) => { c.gradeOptions[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <select value={opt.weight} onChange={(e) => update((c) => { c.gradeOptions[i].weight = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
              </select>
              <select value={opt.color} onChange={(e) => update((c) => { c.gradeOptions[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ConfirmDelete onConfirm={() => update((c) => { if (c.gradeOptions.length > 2) c.gradeOptions.splice(i, 1); return c; })} size={14} />
            </div>
          ))}
          <button onClick={() => update((c) => { c.gradeOptions.push({ id: uid(), label: "New option", weight: "neutral", color: "sky" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add grading option</button>
        </Section>

        <Section title="Kriya flag & mastery rules">
          <label className="block text-xs font-medium text-stone-500 mb-1">Negative results in a row before flagging</label>
          <input type="number" min={1} value={config.flagThreshold} onChange={(e) => update((c) => { c.flagThreshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <label className="block text-xs font-medium text-stone-500 mb-1">Positive results in a row to mark mastered</label>
          <input type="number" min={1} value={config.masteryThreshold} onChange={(e) => update((c) => { c.masteryThreshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </Section>

        <Section title="Kriya escalation messages">
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="mb-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tier {tier}{tier === 4 ? "+" : ""}</label>
              <input value={config.tierMessages[tier]} onChange={(e) => update((c) => { c.tierMessages[tier] = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </Section>

        <Section title="Attendance statuses">
          <label className="block text-xs font-medium text-stone-500 mb-1">Class start time (optional — used to calculate minutes late in monthly reports)</label>
          <input type="time" value={config.attendance.classStartTime || ""} onChange={(e) => update((c) => { c.attendance.classStartTime = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <div className="border-t border-stone-100 pt-3">
          {config.attendance.statuses.map((st, i) => (
            <div key={st.id} className="flex items-center gap-2 mb-2">
              <input value={st.label} onChange={(e) => update((c) => { c.attendance.statuses[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <select value={st.flagType} onChange={(e) => update((c) => { c.attendance.statuses[i].flagType = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                <option value="none">No flag</option><option value="late">Counts as late</option><option value="absent">Counts as absent</option>
              </select>
              <select value={st.color} onChange={(e) => update((c) => { c.attendance.statuses[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ConfirmDelete onConfirm={() => update((c) => { if (c.attendance.statuses.length > 1) c.attendance.statuses.splice(i, 1); return c; })} size={14} />
            </div>
          ))}
          <button onClick={() => update((c) => { c.attendance.statuses.push({ id: uid(), label: "New status", color: "stone", flagType: "none" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add status</button>
          </div>
        </Section>

        <Section title="Lateness rule">
          <label className="block text-xs font-medium text-stone-500 mb-1">Lates within window before flagging</label>
          <div className="flex gap-2 mb-3">
            <input type="number" min={1} value={config.attendance.lateRule.threshold} onChange={(e) => update((c) => { c.attendance.lateRule.threshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Count" />
            <input type="number" min={1} value={config.attendance.lateRule.windowDays} onChange={(e) => update((c) => { c.attendance.lateRule.windowDays = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Days" />
          </div>
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="mb-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tier {tier}{tier === 4 ? "+" : ""}</label>
              <input value={config.attendance.lateTierMessages[tier]} onChange={(e) => update((c) => { c.attendance.lateTierMessages[tier] = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </Section>

        <Section title="Absence rule">
          <label className="block text-xs font-medium text-stone-500 mb-1">Absences within window before flagging</label>
          <div className="flex gap-2 mb-3">
            <input type="number" min={1} value={config.attendance.absentRule.threshold} onChange={(e) => update((c) => { c.attendance.absentRule.threshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Count" />
            <input type="number" min={1} value={config.attendance.absentRule.windowDays} onChange={(e) => update((c) => { c.attendance.absentRule.windowDays = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Days" />
          </div>
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="mb-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tier {tier}{tier === 4 ? "+" : ""}</label>
              <input value={config.attendance.absentTierMessages[tier]} onChange={(e) => update((c) => { c.attendance.absentTierMessages[tier] = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </Section>

        <Section title="Incident categories">
          {config.incidents.categories.map((cat, i) => (
            <div key={cat.id} className="flex items-center gap-2 mb-2">
              <input value={cat.label} onChange={(e) => update((c) => { c.incidents.categories[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <select value={cat.color} onChange={(e) => update((c) => { c.incidents.categories[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ConfirmDelete onConfirm={() => update((c) => { if (c.incidents.categories.length > 1) c.incidents.categories.splice(i, 1); return c; })} size={14} />
            </div>
          ))}
          <button onClick={() => update((c) => { c.incidents.categories.push({ id: uid(), label: "New category", color: "stone" }); return c; })} className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add category</button>
        </Section>

        <Section title="Incident flag rule">
          <label className="block text-xs font-medium text-stone-500 mb-1">Incidents within window before flagging</label>
          <div className="flex gap-2 mb-3">
            <input type="number" min={1} value={config.incidents.flagRule.threshold} onChange={(e) => update((c) => { c.incidents.flagRule.threshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Count" />
            <input type="number" min={1} value={config.incidents.flagRule.windowDays} onChange={(e) => update((c) => { c.incidents.flagRule.windowDays = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Days" />
          </div>
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="mb-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tier {tier}{tier === 4 ? "+" : ""}</label>
              <input value={config.incidents.tierMessages[tier]} onChange={(e) => update((c) => { c.incidents.tierMessages[tier] = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
          ))}
        </Section>

        <div className="md:col-span-2">
          <Section title="Assessment library">
            <p className="text-xs text-stone-400 mb-3">Every assessment ever created for this class, active or not. Create new ones from the Assessments tab — this is where you edit, hide, or permanently remove them.</p>
            {config.categories.map((cat, ci) => (
              <div key={cat.id} className={`border rounded-lg mb-2 ${cat.active === false ? "border-stone-200 opacity-60" : "border-stone-200"}`}>
                <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                  <input value={cat.title} onChange={(e) => update((c) => { c.categories[ci].title = e.target.value; return c; })} className="flex-1 text-sm font-semibold text-stone-800 border-none focus:outline-none bg-transparent min-w-[8rem]" />
                  <button
                    onClick={() => update((c) => { c.categories[ci].active = c.categories[ci].active === false; return c; })}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full ${cat.active === false ? "bg-stone-100 text-stone-500" : "bg-emerald-100 text-emerald-700"}`}>
                    {cat.active === false ? "Hidden — tap to show" : "Active — tap to hide"}
                  </button>
                  <button onClick={() => toggleCat(cat.id)} className="text-stone-400 p-1">{expandedCats[cat.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                  <ConfirmDelete onConfirm={() => update((c) => { c.categories.splice(ci, 1); return c; })} size={14} />
                </div>
                {expandedCats[cat.id] && (
                  <div className="px-3 pb-3 space-y-2 border-t border-stone-100 pt-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                    {cat.items.map((item, ii) => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        {cat.mode !== "skill" ? (
                          <>
                            <input value={item.char} dir="rtl" onChange={(e) => update((c) => { c.categories[ci].items[ii].char = e.target.value; return c; })} className="heb-font w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-center" />
                            <input value={item.label} onChange={(e) => update((c) => { c.categories[ci].items[ii].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Label" />
                          </>
                        ) : (
                          <>
                            <input value={item.label} onChange={(e) => update((c) => { c.categories[ci].items[ii].label = e.target.value; return c; })} className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Label" />
                            <input value={item.desc} onChange={(e) => update((c) => { c.categories[ci].items[ii].desc = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Description" />
                          </>
                        )}
                        <ConfirmDelete onConfirm={() => update((c) => { c.categories[ci].items.splice(ii, 1); return c; })} size={13} />
                      </div>
                    ))}
                  </div>
                )}
                {expandedCats[cat.id] && (
                  <div className="px-3 pb-3">
                    <button onClick={() => update((c) => {
                      const newItem = c.categories[ci].mode === "skill" ? { id: uid(), label: "New skill", desc: "" } : { id: uid(), char: "", label: "New item" };
                      c.categories[ci].items.push(newItem); return c;
                    })} className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Plus size={12} /> Add item</button>
                  </div>
                )}
              </div>
            ))}
          </Section>
        </div>
      </div>

      <p className="text-xs text-stone-400 text-center mt-4">Changes save automatically.</p>
    </div>
  );
}

function MicButton({ onResult, className }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(false);
  const recogRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    setError(false);
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";
    recog.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      if (text) onResult(text);
    };
    recog.onend = () => setListening(false);
    recog.onerror = () => { setListening(false); setError(true); setTimeout(() => setError(false), 4000); };
    recogRef.current = recog;
    try { recog.start(); setListening(true); } catch { setListening(false); setError(true); setTimeout(() => setError(false), 4000); }
  };

  if (!supported) return null;
  if (error) {
    return <span className="text-[10px] text-stone-400 italic px-1">voice unavailable here</span>;
  }
  return (
    <button type="button" onClick={toggle} title={listening ? "Listening — tap to stop" : "Tap to dictate"}
      className={className || `flex items-center justify-center rounded-full w-7 h-7 shrink-0 ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
      <Mic size={13} />
    </button>
  );
}

function ConfirmDelete({ onConfirm, size, label, className, confirmText, armedClassName }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  if (label) {
    return armed ? (
      <button onClick={() => { onConfirm(); setArmed(false); }} className={armedClassName || "text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-1 whitespace-nowrap"}>
        {confirmText || "Confirm delete?"}
      </button>
    ) : (
      <button onClick={() => setArmed(true)} className={className || "text-xs text-stone-400 hover:text-red-500"}>
        {label}
      </button>
    );
  }

  return armed ? (
    <button onClick={() => { onConfirm(); setArmed(false); }}
      className="flex items-center gap-1 text-[10px] font-semibold text-white bg-red-500 rounded-full px-1.5 py-0.5 whitespace-nowrap">
      <Trash2 size={size || 13} /> Sure?
    </button>
  ) : (
    <button onClick={() => setArmed(true)} className="text-stone-300 hover:text-red-500 p-1">
      <Trash2 size={size || 13} />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6 min-w-0">
      <h2 className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">{title}</h2>
      <div className="bg-white border border-stone-200 rounded-xl p-3 overflow-hidden">{children}</div>
    </div>
  );
}
