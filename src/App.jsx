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
// bg-teal-100 bg-teal-200 bg-teal-400 bg-teal-500 bg-teal-600 bg-teal-900 text-teal-700 text-teal-800 text-teal-900 border-teal-500

import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, documentId } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, Component } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { HDate, HebrewCalendar, months } from "@hebcal/core";
import * as XLSX from "xlsx";
import {
  ChevronLeft, Plus, AlertTriangle, Mic, ArrowRight, Loader2,
  Trash2, Settings as SettingsIcon, ChevronDown, ChevronUp,
  Home as HomeIcon, BookOpen, ClipboardList, Mail, RefreshCw, Copy, Check,
  Star, Minus, Calendar, Bell, ChevronRight, MessageCircle, Maximize2, Flag, Wrench, Printer, Clock, X
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

// Seeded once, the first time schoolTools is ever loaded and nothing has been saved yet. Once an
// admin adds, edits, or removes anything, a real (saved) list exists in Firestore and this default
// no longer applies — it's a starting point, not something re-applied on every load.
const DEFAULT_SCHOOL_TOOLS = [
  { id: "seed-chumash-quest", category: "tool", label: "Chumash Quest", url: "https://chumash-quest.yoeleidel.chatgpt.site", description: "" },
  { id: "seed-curriculum-generator", category: "tool", label: "Curriculum Generator", url: "https://chinuchapp.com/curriculum-generator", description: "" },
];

const DEFAULT_CONFIG = {
  subjects: [], // [{id, label}] — the class's own reusable list of subjects they actually teach.
  // Feeds Benchmarks, Assessments, and (where relevant) schedule periods, so a subject is named
  // once and stays consistent everywhere it's used, instead of being retyped fresh each time.
  onboarding: {
    started: false, // has the guided-setup wizard ever been opened — controls the one-time auto-popup on a teacher's first sign-in
    finished: false, // did they reach the end of the wizard (vs. paused partway through)
    completedSteps: [], // step keys already gone through (filled in or explicitly skipped) — drives where "Continue setup" resumes
  },
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
  homework: {
    enabled: false,
    frequency: "daily", // "daily" | "weekly"
    collectionDay: 1, // 0=Sunday..6=Saturday — only used when frequency is "weekly"
    missedThreshold: 3,
    windowDays: 30,
    missedTierMessages: { 1: "Mention it to the student", 2: "Send a note home about homework", 3: "Call the parent", 4: "Flag for admin" },
  },
  messageStyle: {
    schoolTerm: "school", // how the AI refers to the school in generated messages — e.g. "school", "yeshiva", a specific name
    tone: "warm", // "warm" | "formal" | "brief"
    sampleText: "", // optional — a real sample of the teacher's own writing, so the AI can match their actual voice instead of a generic preset
    openingLine: "", // optional exact opening line, e.g. "Dear Parent,"
    closingLine: "", // optional exact closing line before the sign-off, e.g. "Thank you for your partnership,"
    signOffName: true, // whether to sign off with the teacher's name
    showDisclaimer: true, // adds a small system-generated note so parents recognize this as an automated update
    disclaimerPosition: "bottom", // "top" | "bottom"
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
    fullDaySchedule: [], // legacy — kept only as a one-time migration source into `schedules` below
    halfDaySchedule: [],
    schedules: [], // [{id, name, periods: [{id, label, startTime, endTime}]}] — named, reusable weekly schedules
    weekdaySchedule: {}, // {1: scheduleId, 2: scheduleId, ...} — Mon(1)–Fri(5) → which named schedule applies by default
  },
};

const COLOR_CHOICES = ["emerald", "amber", "rose", "indigo", "sky", "violet", "stone", "teal", "fuchsia"];
// Quick-add suggestions for a class's Subjects list — tap one to add it instantly, or type
// something else entirely. Not a fixed or required set, just a head start.
const SUBJECT_LIBRARY = ["Davening", "Kriya", "Chumash", "Hebrew Grammar", "Ksiva", "Tanya Baal Peh", "Gemara", "Mishnayos", "Yiddish", "English", "Math"];
// Common schedule blocks that fill out a day but aren't academic subjects — offered as
// suggestions when building a schedule, but deliberately kept out of the Subjects list itself
// (so they never show up as a row in Benchmarks or the Assessments grid).
const SCHEDULE_BLOCK_LIBRARY = ["Recess", "Lunch", "Transition", "Assembly", "Free Time", "Prep / Break"];
const WEEKDAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; // indices match Date.getDay()
const PAGE = "app-page";

function skillKey(catId, itemId) { return `${catId}:${itemId}`; }

// Avatar circles for the student cards — initials from the name, and a color consistently
// picked per student (by id, not position) so the same student always gets the same color
// even as the roster is sorted, filtered, or added to.
function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const AVATAR_COLORS = ["teal", "amber", "rose", "emerald", "indigo", "fuchsia", "sky", "violet"];
function avatarColorFor(id) {
  let hash = 0;
  for (let i = 0; i < (id || "").length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
// A class-assessment result is stored as either a plain string (the grade, and how every
// existing assessment already stores it) or, once a note is added, an object of
// {grade, note} — these two helpers read either shape the same way so nothing needs migrating.
function getResultGrade(r) { return r == null ? "" : (typeof r === "object" ? (r.grade || "") : String(r)); }
function getResultNote(r) { return r != null && typeof r === "object" ? (r.note || "") : ""; }

// Builds the shared instruction block injected into every AI message-drafting prompt, so tone,
// school terminology, and opening/closing wording are configurable per class instead of
// hardcoded — this is also where the school reference itself is configurable (previously
// hardcoded as "Hebrew school" regardless of what kind of school it actually was).
function buildStyleInstructions(config, teacherName) {
  const style = config.messageStyle || {};
  const term = (style.schoolTerm || "school").trim() || "school";
  const toneText = {
    warm: "Write in a warm, personal tone — friendly but still professional.",
    formal: "Write in a formal, professional tone — clear and businesslike, minimal informality.",
    brief: "Write briefly and directly — short sentences, no filler, straight to the point.",
  }[style.tone] || "Write in a warm, personal tone — friendly but still professional.";

  let instructions = `You are drafting a short note from a ${term} teacher to a parent.\n\n${toneText}`;

  if (style.sampleText && style.sampleText.trim()) {
    instructions += `\n\nHere's a real sample of how this teacher writes. Match this voice, phrasing, and level of formality as closely as you can — treat it as a stronger guide than the tone description above:\n"""\n${style.sampleText.trim()}\n"""`;
  }

  if (style.openingLine && style.openingLine.trim()) {
    instructions += `\nStart the message with exactly this line, then continue naturally: "${style.openingLine.trim()}"`;
  }
  if (style.closingLine && style.closingLine.trim()) {
    instructions += `\nEnd the message with exactly this line, right before the sign-off: "${style.closingLine.trim()}"`;
  }
  if (style.signOffName === false) {
    instructions += "\nDo not sign off with a name — end the message without a signature line.";
  } else if (teacherName) {
    instructions += `\nSign off as "${teacherName}".`;
  } else {
    instructions += "\nSign off as \"[Your name]\".";
  }

  return instructions;
}

// Adds a small system-generated note so parents recognize this as an automated update from the
// classroom system — not a spontaneous personal message — and understand other parents likely
// received something similar. Applied in code after generation, not left to the AI, since it
// needs to be exact and consistent every time.
function applyMessageDisclaimer(draftText, config, schoolLabel) {
  const style = config.messageStyle || {};
  if (style.showDisclaimer === false) return draftText;
  const term = (style.schoolTerm || "school").trim() || "school";
  const label = schoolLabel || `Sent via your child's ${term} classroom system`;
  const note = `— ${label}, an automated update. No reply needed unless you have a question. —`;
  return style.disclaimerPosition === "top" ? `${note}\n\n${draftText}` : `${draftText}\n\n${note}`;
}

// Lets a teacher see exactly what their current style settings actually sound like — using
// clearly-fake sample data — without needing to log a real incident or wait for a real event
// to test it. Purely a preview: nothing here is saved or sent anywhere.
async function generatePreviewMessage(config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This is a PREVIEW using made-up sample data, just to demonstrate the writing style — not a real student or a real situation.

Student: Sample Student
Situation: Was absent one day this week and seemed to have a great day back — participated well in group work.

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function todayISO() { return isoDate(new Date()); }
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
  return dateStr >= isoDate(cutoff);
}
function tierFor(count, threshold) { return Math.max(1, Math.min(4, count - threshold + 1)); }

function monthKey(year, monthIdx) { return `${year}-${String(monthIdx + 1).padStart(2, "0")}`; }

const EVENT_CATEGORIES = [
  { id: "school-event", label: "School Event", icon: "🏫", color: "slate" },
  { id: "classroom-activity", label: "Classroom Activity", icon: "📚", color: "sky" },
  { id: "assessment", label: "Assessment", icon: "📝", color: "indigo" },
  { id: "field-trip", label: "Field Trip", icon: "🚌", color: "amber" },
  { id: "birthday", label: "Birthday", icon: "🎉", color: "fuchsia" },
  { id: "siyum", label: "Siyum", icon: "🎊", color: "violet" },
  { id: "jewish-holiday", label: "Jewish Holiday", icon: "✡️", color: "rose" },
  { id: "parent-event", label: "Parent Event", icon: "👨‍👩‍👧", color: "teal" },
  { id: "meeting", label: "Meeting", icon: "📅", color: "stone" },
  { id: "cleanup", label: "Cleanup", icon: "🧹", color: "emerald" },
  { id: "custom", label: "Custom", icon: "📌", color: "stone" },
];

// Compact Hebrew date for a given Gregorian ISO date string (e.g. "16 Av 5786").
function hebrewDateFor(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new HDate(new Date(y, m - 1, d)).toString();
}

// Automatic Jewish holidays for a Gregorian year, filtered down to exactly the categories
// requested (Rosh Hashana/Yom Kippur/Sukkos/Chanukah/Purim/Pesach/Shavuos/Lag BaOmer/fast
// days/Rosh Chodesh) — verified against real @hebcal/core output, not guessed from docs.
// Deliberately excludes special-Shabbat names and modern Israeli holidays, neither of which
// were requested.
function getAutoHolidaysForYear(year) {
  const events = HebrewCalendar.calendar({ year, isHebrewYear: false });
  const byDate = {};
  for (const ev of events) {
    const categories = ev.getCategories();
    const desc = ev.getDesc();
    let include = false;
    if (categories.includes("roshchodesh")) include = true;
    else if (categories.includes("fast")) include = true;
    else if (categories.includes("major")) include = true;
    else if (categories.includes("minor")) include = desc.includes("Chanukah") || desc.includes("Purim") || desc.includes("Lag BaOmer");
    if (!include) continue;
    const g = ev.getDate().greg();
    const dateStr = `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`;
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push({ title: desc, category: "jewish-holiday" });
  }
  return byDate;
}
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

// Converts a Date to a plain YYYY-MM-DD string using the browser's own local time — not UTC.
// This matters: for anyone west of UTC (all of the US, for example), toISOString() rolls the
// date over to the next day several hours before local midnight actually arrives, which is
// exactly why the app was showing Monday while it was still Sunday morning in California.
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysISO(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
// The one place that decides "what periods happen on this date" — replaces what used to be
// duplicated fixed full/half-day logic in half a dozen places. A one-time override for this
// exact date (set by the teacher, e.g. for an assembly or field trip) always wins, regardless
// of day type. Otherwise, ANY day type with a schedule (School Day, Half Day, or a custom type)
// resolves the same way — by weekday, via config.planner.weekdaySchedule — so "Half Day" is just
// another named schedule a teacher can assign to Friday (or wherever it belongs), not a
// separate fixed mechanism. Only "none" (e.g. No School) has no schedule at all.
function getScheduleForDate(dateStr, dayType, config, plannerDays) {
  const override = plannerDays?.[dateStr]?.scheduleOverride;
  if (override) return override;
  if (!dayType || dayType.scheduleTemplate === "none") return null;
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  const scheduleId = config.planner?.weekdaySchedule?.[weekday];
  const schedules = config.planner?.schedules || [];
  const matched = schedules.find((s) => s.id === scheduleId);
  if (matched) return matched.periods;
  return schedules[0]?.periods || [];
}

// For lookups that need to check every period that could ever exist, regardless of which
// weekday's schedule it lives in (e.g. "what's this period called" for an old log entry, or
// building the period picker for a "specific periods" enrollment).
// Tracks the actual visible viewport height — shrinks when the on-screen keyboard appears.
// iOS Safari in particular doesn't always resize fixed-position elements correctly on its own
// when the keyboard opens, so drawers anchored with height:"100%" can end up partly hidden
// behind the keyboard; using this instead keeps them sized to what's actually visible.
function useVisualViewportHeight() {
  const [height, setHeight] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 0));
  useEffect(() => {
    const update = () => setHeight(window.visualViewport ? window.visualViewport.height : window.innerHeight);
    update();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", update);
      return () => vv.removeEventListener("resize", update);
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

// A program's roster is never stored on its own — it's always the current combined roster
// of whichever classes are members, so adding or removing a student from a member class
// automatically shows up here too, with no separate list to keep in sync.
async function fetchProgramRoster(memberClassIds) {
  const seen = new Set();
  const roster = [];
  const allClasses = await loadJSON("schoolClasses", [], true);
  for (const classId of memberClassIds || []) {
    const cls = allClasses.find((c) => c.id === classId);
    const clsRoster = await loadJSON(`class:${classId}:roster`, [], true);
    clsRoster.forEach((s) => { if (!seen.has(s.id)) { seen.add(s.id); roster.push({ ...s, sourceClassName: cls?.name || "" }); } });
  }
  return roster;
}

function getAllPeriodsEverywhere(config) {
  const fromSchedules = (config.planner?.schedules || []).flatMap((s) => s.periods || []);
  const fromHalfDay = config.planner?.halfDaySchedule || [];
  const seen = new Set();
  return [...fromSchedules, ...fromHalfDay].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

// Bulk student import — maps whatever column headers a real-world spreadsheet happens to use
// onto the app's actual student fields. Keyword lists are deliberately generous (covers common
// phrasings like "Guardian Email" or "Cell Phone") since we can't know in advance how any given
// school's file will be labeled — the admin still reviews and can correct every guess before
// anything is actually imported, so a wrong guess here is never destructive on its own.
const IMPORT_FIELD_OPTIONS = [
  { field: "name", label: "Student name" },
  { field: "parent1Name", label: "Parent 1 name" },
  { field: "parentEmail", label: "Parent 1 email" },
  { field: "parentPhone", label: "Parent 1 phone" },
  { field: "parent2Name", label: "Parent 2 name" },
  { field: "parent2Email", label: "Parent 2 email" },
  { field: "parent2Phone", label: "Parent 2 phone" },
  { field: "homeAddress", label: "Home address" },
  { field: "gregorianBirthday", label: "Birthday" },
  { field: "notes", label: "Notes" },
  { field: "", label: "Don't import this column" },
];

const IMPORT_FIELD_KEYWORDS = {
  name: ["student name", "child name", "full name", "name"],
  parent1Name: ["parent name", "parent 1 name", "parent1 name", "guardian name", "guardian 1 name", "mother", "father", "guardian"],
  parentEmail: ["parent email", "parent 1 email", "parent1 email", "guardian email", "email 1", "contact email", "email"],
  parentPhone: ["parent phone", "parent 1 phone", "parent1 phone", "guardian phone", "phone 1", "contact phone", "cell phone", "cell", "mobile", "phone"],
  parent2Name: ["parent 2 name", "parent2 name", "second parent", "guardian 2 name", "guardian 2"],
  parent2Email: ["parent 2 email", "parent2 email", "second email", "email 2"],
  parent2Phone: ["parent 2 phone", "parent2 phone", "second phone", "phone 2"],
  homeAddress: ["home address", "street address", "mailing address", "address"],
  gregorianBirthday: ["birthday", "birth date", "date of birth", "dob"],
  notes: ["notes", "comments", "remarks"],
};

// Checked in this order — most specific first — so e.g. "Parent 2 Email" matches parent2Email
// before the more generic "email" keyword under parentEmail gets a chance to claim it.
const IMPORT_FIELD_CHECK_ORDER = ["parent2Name", "parent2Email", "parent2Phone", "parent1Name", "parentEmail", "parentPhone", "homeAddress", "gregorianBirthday", "notes", "name"];

function guessImportField(header) {
  const normalized = (header || "").toLowerCase().trim();
  if (!normalized) return "";
  for (const field of IMPORT_FIELD_CHECK_ORDER) {
    if (IMPORT_FIELD_KEYWORDS[field].some((kw) => normalized === kw)) return field;
  }
  for (const field of IMPORT_FIELD_CHECK_ORDER) {
    if (IMPORT_FIELD_KEYWORDS[field].some((kw) => normalized.includes(kw))) return field;
  }
  return "";
}

function parseSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read the file"));
    reader.readAsArrayBuffer(file);
  });
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

// 'full' = normal school day, 'half' = half-day schedule, 'none' = no school (Shabbos, etc.) —
// shared by the benchmark calendar view and the school-aware date-range picker, so both agree
// on what counts as a school day using the exact same logic.
function scheduleKindForDate(dateStr, plannerDays, dayTypes) {
  const dayTypeMap = {};
  (dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const dt = plannerDays?.[dateStr]?.dayType ? dayTypeMap[plannerDays[dateStr].dayType] : null;
  if (dt?.hidesAttendance) return "none";
  if (dt?.scheduleTemplate === "half") return "half";
  return "full";
}

function computeSkillStatus(history, config) {
  if (!history || history.length === 0) return { status: "new", streak: 0 };
  const weightOf = (id) => (config?.gradeOptions || []).find((o) => o.id === id)?.weight || "neutral";
  let i = history.length - 1;
  const lastWeight = weightOf(history[i].result);
  let streak = 0;
  while (i >= 0 && weightOf(history[i].result) === lastWeight) { streak++; i--; }
  if (lastWeight === "negative" && streak >= (config?.flagThreshold ?? Infinity)) return { status: "flagged", streak };
  if (lastWeight === "positive" && streak >= (config?.masteryThreshold ?? Infinity)) return { status: "mastered", streak };
  return { status: "practicing", streak };
}

// Growth over time for ONE category, for ONE student — never mixes subjects together.
// Groups every item-grading in this category by the date it happened, and scores each date
// as a plain percentage (positive=100, neutral=50, negative=0, averaged across whatever was
// graded that day) — so two different administrations become two comparable points on a line.
function computeSessionTimeline(data, category, config) {
  const weightScore = (id) => {
    const w = (config?.gradeOptions || []).find((o) => o.id === id)?.weight;
    return w === "positive" ? 100 : w === "negative" ? 0 : 50;
  };
  const byDate = {};
  category.items.forEach((item) => {
    const key = skillKey(category.id, item.id);
    const history = data.skills?.[key]?.history || [];
    history.forEach((h) => {
      if (!byDate[h.date]) byDate[h.date] = [];
      byDate[h.date].push(weightScore(h.result));
    });
  });
  return Object.keys(byDate).sort().map((date) => {
    const scores = byDate[date];
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { date, score: avg, itemsGraded: scores.length };
  });
}

function emptyStudentData() { return { skills: {}, fluency: [], attendance: [], periodAttendance: [], homework: [], points: {}, communications: [] }; }

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

async function deleteJSON(key) {
  try {
    const ref = doc(db, "data", key);
    await deleteDoc(ref);
  } catch (e) {
    console.error("Delete failed", key, e);
  }
}

// Loads every document whose ID starts with the given prefix (e.g. "teacher:") — used instead
// of one giant array document specifically so Firestore security rules can precisely check
// "does this document belong to me" per-teacher, which isn't reliably expressible against an
// array of objects in a single shared document (Firestore rules can't search inside one).
async function loadAllWithPrefix(prefix) {
  try {
    const col = collection(db, "data");
    const q = query(col, where(documentId(), ">=", prefix), where(documentId(), "<", `${prefix}\uf8ff`));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().value);
  } catch (e) {
    console.error("Prefix load failed", prefix, e);
    return [];
  }
}

const ClassContext = createContext({ className: "", onSwitchClass: () => {} });

// Fonts, button press/hover feedback, and hand-written layout utilities — extracted into its
// own component so every screen can render it, not just the ones inside an open class. It used
// to live only inside ClassApp, which silently left the sign-in screen, class picker, and admin
// dashboard without any of it — same content, rendering it in more places is harmless (CSS
// naturally de-duplicates repeated rules).
function GlobalAppStyles() {
  return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .display-font { font-family: 'Fraunces', serif; }
        .heb-font { font-family: 'Frank Ruhl Libre', serif; }

        /* ===== SJA Classroom Tracker — "Warm Scholarly" design system ===== */
        /* Tailwind v4 exposes every color/radius utility through CSS custom properties
           (e.g. .bg-teal-700 reads var(--color-teal-700)) — redefining those properties
           once here reskins every bg-/text-/border-/ring-/hover: usage across the whole
           app consistently, without touching each of the thousands of individual
           className strings. Body line-height set globally per the spec (~1.6). */
        :root {
          /* Pine-teal — primary actions, active nav, "present" */
          --color-teal-50: #f0f7f5; --color-teal-100: #e1efec; --color-teal-200: #c3dfd9;
          --color-teal-300: #94c3ba; --color-teal-400: #5fa294; --color-teal-500: #34816f;
          --color-teal-600: #1c7867; --color-teal-700: #0e6e62; --color-teal-800: #0b5a50;
          --color-teal-900: #08403a;
          /* SJA red — logo, alerts, destructive */
          --color-rose-50: #fdf2f1; --color-rose-100: #f8e5e2; --color-rose-200: #f0c4bd;
          --color-rose-300: #e3968a; --color-rose-400: #d16e5d; --color-rose-500: #c94a3a;
          --color-rose-600: #c0362c; --color-rose-700: #a02e25; --color-rose-800: #7d251e;
          --color-rose-900: #5f1c17;
          /* Gold — points, rewards, "late" */
          --color-amber-50: #fdf8ef; --color-amber-100: #f6ead0; --color-amber-200: #ecd5a3;
          --color-amber-300: #deb96c; --color-amber-400: #cd9c47; --color-amber-500: #c99530;
          --color-amber-600: #c08526; --color-amber-700: #b7791f; --color-amber-800: #8f5f19;
          --color-amber-900: #6f4a14;
          /* Success green */
          --color-emerald-50: #f0f8f4; --color-emerald-100: #e2f0e8; --color-emerald-200: #bfe0cf;
          --color-emerald-300: #8fc9ab; --color-emerald-400: #5fae86; --color-emerald-500: #3f9268;
          --color-emerald-600: #368269; --color-emerald-700: #2e7d5b; --color-emerald-800: #245f47;
          --color-emerald-900: #1c4a38;
          /* Warm-paper neutrals — background, ink, muted fill, borders */
          --color-stone-50: #f6f2e9; --color-stone-100: #efe9dc; --color-stone-200: #e7dfcf;
          --color-stone-300: #d8cdb6; --color-stone-400: #a89b7f; --color-stone-500: #6f6659;
          --color-stone-600: #5c5347; --color-stone-700: #453f36; --color-stone-800: #332e28;
          --color-stone-900: #2b2723;
          /* Radius scale: 6px inputs/chips · 10px buttons · 14px cards/rows · 20px panels */
          --radius-md: 6px; --radius-lg: 10px; --radius-xl: 14px; --radius-2xl: 20px;
          /* Secondary informational accents (cross-class history, shared-program panels) —
             warmed from Tailwind's cool defaults so they read as part of the same family
             rather than clashing against the warm palette, while staying visually distinct
             from the three core signal hues above. */
          --color-violet-50: #f7f3ec; --color-violet-100: #efe7d8; --color-violet-200: #ddd0b4;
          --color-violet-300: #c4ac82; --color-violet-400: #a68a5f; --color-violet-500: #8a6f4a;
          --color-violet-600: #705a3c; --color-violet-700: #5c4a32; --color-violet-800: #453828;
          --color-violet-900: #332a1e;
          --color-sky-50: #f4f4ee; --color-sky-100: #e9e8dc; --color-sky-200: #d5d2bd;
          --color-sky-300: #b4ae8d; --color-sky-400: #928a68; --color-sky-500: #756d4f;
          --color-sky-600: #5f5840; --color-sky-700: #4d4734; --color-sky-800: #3a3527;
          --color-sky-900: #2c281e;
          /* red is used interchangeably with rose throughout for the same destructive/alert
             meaning — same values, so neither reads as a different, older red. */
          --color-red-50: #fdf2f1; --color-red-100: #f8e5e2; --color-red-200: #f0c4bd;
          --color-red-300: #e3968a; --color-red-400: #d16e5d; --color-red-500: #c94a3a;
          --color-red-600: #c0362c; --color-red-700: #a02e25; --color-red-800: #7d251e;
          --color-red-900: #5f1c17;
          /* indigo/fuchsia round out the 9-color palette teachers pick from to tell subjects,
             segments, and categories apart (benchmarks, points categories, day types) — warmed
             to plum/wine and terracotta so a chosen color never looks like it escaped the theme. */
          --color-indigo-50: #f6eef0; --color-indigo-100: #ecdde1; --color-indigo-200: #d9bcc4;
          --color-indigo-300: #bf94a1; --color-indigo-400: #a06e7c; --color-indigo-500: #8a5763;
          --color-indigo-600: #7c4a52; --color-indigo-700: #663d44; --color-indigo-800: #4d2e33;
          --color-indigo-900: #382226;
          --color-fuchsia-50: #fbf1e9; --color-fuchsia-100: #f6e2d0; --color-fuchsia-200: #eabf98;
          --color-fuchsia-300: #dc9860; --color-fuchsia-400: #c97a3c; --color-fuchsia-500: #b5651d;
          --color-fuchsia-600: #9c5519; --color-fuchsia-700: #7d4514; --color-fuchsia-800: #603510;
          --color-fuchsia-900: #48280c;
        }
        body { line-height: 1.6; }
        /* Shadows (warm-tinted, low, soft) — these set their own local value per-class
           rather than reading a shared variable, so each is overridden directly. */
        .shadow-sm { box-shadow: 0 1px 3px rgba(43,39,35,.07), 0 1px 2px rgba(43,39,35,.04) !important; }
        .shadow { box-shadow: 0 6px 20px -6px rgba(43,39,35,.14) !important; }
        .shadow-lg { box-shadow: 0 18px 40px -12px rgba(43,39,35,.20) !important; }

        /* The "smooth, modern" feel — applied once, globally, so every button and tappable
           card in the app gets the same tactile press feedback and smooth hover/color
           transitions the full-screen timer already had, without editing each one by hand. */
        button, a, [role="button"] {
          transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        button:not(:disabled):active, [role="button"]:not(:disabled):active {
          transform: scale(0.96);
        }
        /* Hover-only lift, gated to devices that genuinely support hover (real mouse/trackpad) —
           this avoids the common mobile bug where a hover effect gets "stuck" after a tap. */
        @media (hover: hover) and (pointer: fine) {
          button:not(:disabled):hover, [role="button"]:not(:disabled):hover {
            filter: brightness(1.03);
          }
          .hover-lift:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
        }
        .hover-lift {
          transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Keeps horizontal scrolling (drag/swipe) fully working, just hides the visible
           scrollbar track for a cleaner look — three rules needed to cover every browser. */
        .no-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* old Edge/IE */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, newer Edge */
        }

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

        /* Printable reports — hidden everywhere except when actually printing (or "Save as PDF"
           via the browser's print dialog, which is the same code path). The report content
           itself lives off-screen normally so it never affects normal layout/scrolling. */
        .print-report { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report {
            display: block;
            position: absolute; left: 0; top: 0; width: 100%;
            font-family: 'Inter', sans-serif; color: #2b2723;
          }
          .print-report h1 { font-family: 'Fraunces', serif; font-size: 22px; margin: 0 0 2px 0; }
          .print-report .print-meta { font-size: 11px; color: #6f6659; margin-bottom: 18px; }
          .print-report h2 {
            font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em; color: #0e6e62;
            border-bottom: 1px solid #d8cdb6; padding-bottom: 4px; margin: 20px 0 8px 0;
            break-after: avoid;
          }
          .print-report table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
          .print-report th { text-align: left; font-weight: 600; color: #5c5347; padding: 4px 8px 4px 0; border-bottom: 1px solid #e7dfcf; }
          .print-report td { padding: 4px 8px 4px 0; border-bottom: 1px solid #efe9dc; vertical-align: top; }
          .print-report .print-empty { font-size: 11px; color: #a89b7f; font-style: italic; margin-bottom: 4px; }
          .print-report .print-section { break-inside: avoid; }
          @page { margin: 0.6in; }
        }
      `}</style>
  );
}

// ---------- Flags ----------

function getFlags(data, studentId, incidents, config) {
  if (!data) return [];
  const flags = [];
  for (const cat of config.categories || []) {
    for (const item of cat.items || []) {
      const key = skillKey(cat.id, item.id);
      const skill = data.skills?.[key];
      if (skill && skill.status === "flagged") {
        const tier = Math.min(4, skill.flagCount);
        flags.push({ key: `skill-${key}`, type: "skill", label: `${item.label} (${cat.title})`, tier, message: config.tierMessages?.[tier] || config.tierMessages?.[4] || "Flagged" });
      }
    }
  }
  const statusMap = {};
  (config.attendance?.statuses || []).forEach((s) => (statusMap[s.id] = s));
  const lateRule = config.attendance?.lateRule;
  if (lateRule) {
    const lateCount = (data.attendance || []).filter((a) => statusMap[a.status]?.flagType === "late" && withinWindow(a.date, lateRule.windowDays)).length;
    if (lateCount >= lateRule.threshold) {
      const tier = tierFor(lateCount, lateRule.threshold);
      flags.push({ key: "attendance-late", type: "late", label: `Lateness — ${lateCount} in last ${lateRule.windowDays} days`, tier, message: config.attendance.lateTierMessages?.[tier] || "Flagged for lateness" });
    }
  }
  const absentRule = config.attendance?.absentRule;
  if (absentRule) {
    const absentCount = (data.attendance || []).filter((a) => statusMap[a.status]?.flagType === "absent" && withinWindow(a.date, absentRule.windowDays)).length;
    if (absentCount >= absentRule.threshold) {
      const tier = tierFor(absentCount, absentRule.threshold);
      flags.push({ key: "attendance-absent", type: "absent", label: `Absences — ${absentCount} in last ${absentRule.windowDays} days`, tier, message: config.attendance.absentTierMessages?.[tier] || "Flagged for absences" });
    }
  }
  if (config.homework?.enabled) {
    const missedCount = (data.homework || []).filter((h) => h.status === "missed" && withinWindow(h.date, config.homework.windowDays)).length;
    if (missedCount >= config.homework.missedThreshold) {
      const tier = tierFor(missedCount, config.homework.missedThreshold);
      flags.push({ key: "homework-missed", type: "homework", label: `Missed homework — ${missedCount} in last ${config.homework.windowDays} days`, tier, message: config.homework.missedTierMessages?.[tier] || "Flagged for missed homework" });
    }
  }
  const flagRule = config.incidents?.flagRule;
  if (flagRule) {
    const myIncidents = (incidents || []).filter((i) => i.studentIds?.includes(studentId));
    const incCount = myIncidents.filter((i) => withinWindow(i.date, flagRule.windowDays)).length;
    if (incCount >= flagRule.threshold) {
      const tier = tierFor(incCount, flagRule.threshold);
      flags.push({ key: "incidents", type: "incident", label: `Incidents — ${incCount} in last ${flagRule.windowDays} days`, tier, message: config.incidents.tierMessages?.[tier] || "Flagged for incidents" });
    }
  }
  for (const cat of config.points?.categories || []) {
    if (cat.scope !== "individual") continue;
    const pts = data.points?.[cat.id] || 0;
    if (cat.threshold > 0 && pts >= cat.threshold) {
      flags.push({ key: `points-${cat.id}`, type: "points", label: `${cat.label} — reward ready (${pts}/${cat.threshold})`, tier: 1, message: cat.rewardMessage || "Reward earned" });
    }
  }
  return flags.sort((a, b) => b.tier - a.tier);
}

// ---------- App ----------

function AppInner() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [useLegacyFlow, setUseLegacyFlow] = useState(false);
  const [registry, setRegistry] = useState([]);
  const [globalStudents, setGlobalStudents] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [schoolTools, setSchoolTools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [currentTeacher, setCurrentTeacher] = useState(null); // the signed-in teacher's own record, once real login exists
  const [authUser, setAuthUser] = useState(null); // the raw Firebase Auth user object
  const [classId, setClassId] = useState(null);
  const [className, setClassName] = useState("");
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isSubstituteSession, setIsSubstituteSession] = useState(false);

  // Real Firebase sign-in state — now drives the app's main screens (see the routing at the
  // bottom of this component). authChecked exists so we don't flash the sign-in screen for a
  // moment before Firebase has had a chance to report whether a session already exists.
  // Persistence is set explicitly (rather than relying on the SDK's default) so a signed-in
  // teacher stays signed in across closing and reopening the app, not just within one tab.
  useEffect(() => {
    let unsubscribe = () => {};
    setPersistence(auth, browserLocalPersistence).finally(() => {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setAuthUser(user);
        if (user) {
          const mine = await loadJSON(`teacher:${user.uid}`, null, true);
          setCurrentTeacher(mine);
        } else {
          setCurrentTeacher(null);
        }
        setAuthChecked(true);
      });
    });
    return () => unsubscribe();
  }, []);

  // Teachers are stored one document per teacher (data/teacher:{uid}), not as a single array
  // covering everyone — this is deliberate: Firestore security rules can't reliably search
  // inside an array of objects to find "the one that's mine," but they CAN check "does this
  // exact document's ID match my own uid" precisely and efficiently.
  const refreshTeachers = async () => {
    const list = await loadAllWithPrefix("teacher:");
    setTeachers(list);
  };

  const updateTeacherRecord = async (uid, fields) => {
    const existing = await loadJSON(`teacher:${uid}`, {}, true);
    const next = { ...existing, ...fields };
    await saveJSON(`teacher:${uid}`, next, true);
    setTeachers((prev) => prev.map((t) => (t.uid === uid ? next : t)));
  };

  const deactivateTeacherRecord = async (uid) => {
    await updateTeacherRecord(uid, { active: false });
  };

  // Removes the teacher's app-access record permanently — this revokes their ability to use
  // the app (they'll hit the "not set up with access" screen if they try to sign in), but
  // doesn't delete the underlying Firebase Auth login itself, since that requires the same
  // kind of server-side admin function used to create accounts in the first place.
  const deleteTeacherPermanently = async (uid) => {
    await deleteJSON(`teacher:${uid}`);
    setTeachers((prev) => prev.filter((t) => t.uid !== uid));
  };

  const signInTeacher = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.code === "auth/invalid-credential" ? "Incorrect email or password." : "Couldn't sign in — try again." };
    }
  };

  const signOutTeacher = () => signOut(auth);

  // Self-service password change — Firebase requires a "recent" sign-in for security-sensitive
  // operations like this, so we re-authenticate with their current password first (proving they
  // really are who they say they are right now) before applying the new one.
  const changeMyPassword = async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) return { ok: false, error: "You're not signed in." };
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { ok: true };
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") return { ok: false, error: "That current password isn't right." };
      if (e.code === "auth/weak-password") return { ok: false, error: "New password needs to be at least 6 characters." };
      return { ok: false, error: "Couldn't change the password — try again." };
    }
  };

  const changeMyName = async (newName) => {
    if (!currentTeacher) return;
    await updateTeacherRecord(currentTeacher.uid, { name: newName });
    setCurrentTeacher((prev) => ({ ...prev, name: newName }));
  };

  const enterAssignedClass = (cls) => { setClassId(cls.id); setClassName(cls.name); };

  const signOutStaff = async () => {
    setClassId(null);
    setClassName("");
    await signOutTeacher();
  };

  const backToTeacherClassPicker = () => { setClassId(null); setClassName(""); };

  // Creating another person's login can't happen from the browser with normal client
  // credentials — it needs elevated, server-side access, so this calls a dedicated backend
  // function (same pattern as the AI report-drafting proxy: privileged credentials live only
  // on the server, never in the browser).
  const createTeacherAccount = async (name, email, tempPassword, role, assignedClassIds, isSubstitute) => {
    try {
      const response = await fetch("/api/create-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: tempPassword, role, assignedClassIds, isSubstitute }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || "Couldn't create the account." };
      await refreshTeachers();
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't reach the server — try again." };
    }
  };

  // The admin "big picture" view: everything logged anywhere, for one date, all in one place —
  // not admin clicking into each class one at a time, but every class's events and incidents
  // for that date pulled together and clearly labeled with which class they came from.
  const fetchDailyOverview = async (dateStr) => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const results = { events: [], incidents: [] };
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsEvents = await loadJSON(`class:${cls.id}:plannerEvents`, [], true);
      // "siyum" events are auto-created when a teacher schedules a benchmark-completion
      // celebration for their own class — a personal planning follow-up, not a genuine
      // school-wide happening, so admin's cross-class overview excludes them.
      clsEvents.filter((e) => e.date === dateStr && e.category !== "siyum").forEach((e) => results.events.push({ ...e, sourceClassName: cls.name }));

      const clsIncidents = await loadJSON(`class:${cls.id}:incidents`, [], true);
      const relevant = clsIncidents.filter((i) => i.date === dateStr);
      if (relevant.length > 0) {
        const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
        const clsConfig = await loadJSON(`class:${cls.id}:config`, DEFAULT_CONFIG, true);
        const catMap = {};
        (clsConfig.incidents?.categories || []).forEach((c) => (catMap[c.id] = c.label));
        relevant.forEach((i) => {
          const studentNames = (i.studentIds || []).map((sid) => clsRoster.find((s) => s.id === sid)?.name).filter(Boolean);
          results.incidents.push({ ...i, sourceClassName: cls.name, categoryLabel: catMap[i.category] || i.category, studentNames });
        });
      }
    }
    const schoolEventsList = await loadJSON("schoolEvents", [], true);
    schoolEventsList.filter((e) => e.date === dateStr).forEach((e) => results.events.push({ ...e, sourceClassName: "School-wide" }));
    results.events.sort((a, b) => (a.sourceClassName < b.sourceClassName ? -1 : 1));
    results.incidents.sort((a, b) => (a.flaggedForAdmin === b.flaggedForAdmin ? 0 : a.flaggedForAdmin ? -1 : 1)); // flagged incidents surface first — that's the whole point
    return results;
  };

  // Same underlying idea as a class's own "history from other classes" for one student, just
  // reachable from the admin side, for any student in the school-wide list.
  const fetchAdminStudentHistory = async (studentId) => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const results = { classes: [], incidents: [] };
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      const enrolled = clsRoster.find((s) => s.id === studentId);
      if (!enrolled) continue;
      results.classes.push({ classId: cls.id, className: cls.name });
      const clsIncidents = await loadJSON(`class:${cls.id}:incidents`, [], true);
      const clsConfig = await loadJSON(`class:${cls.id}:config`, DEFAULT_CONFIG, true);
      const catMap = {};
      (clsConfig.incidents?.categories || []).forEach((c) => (catMap[c.id] = c.label));
      clsIncidents.filter((i) => i.studentIds?.includes(studentId)).forEach((i) => {
        results.incidents.push({ ...i, sourceClassName: cls.name, categoryLabel: catMap[i.category] || i.category || "Uncategorized" });
      });
    }
    results.incidents.sort((a, b) => (a.date < b.date ? 1 : -1));
    return results;
  };

  // Pulls everything a teacher would see about this student inside their own class — incidents,
  // attendance, homework, points, and skill/assessment history — for every class they're
  // enrolled in, plus each class's config so the profile view can resolve category and status
  // labels exactly the way the classroom view itself does.
  const fetchAdminStudentProfile = async (studentId) => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const results = { classes: [], programs: [] };
    const enrolledClassIds = [];
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      const rosterEntry = clsRoster.find((s) => s.id === studentId);
      if (!rosterEntry) continue;
      enrolledClassIds.push(cls.id);
      const clsConfig = await loadJSON(`class:${cls.id}:config`, DEFAULT_CONFIG, true);
      const clsIncidents = await loadJSON(`class:${cls.id}:incidents`, [], true);
      const studentData = await loadJSON(`class:${cls.id}:kriya:${studentId}`, emptyStudentData(), true);
      const incCatMap = {};
      (clsConfig.incidents?.categories || []).forEach((c) => (incCatMap[c.id] = c.label));
      const incidents = clsIncidents.filter((i) => i.studentIds?.includes(studentId))
        .map((i) => ({ ...i, categoryLabel: incCatMap[i.category] || i.category || "Uncategorized" }));
      results.classes.push({
        classId: cls.id, className: cls.name, config: clsConfig, rosterEntry,
        incidents, attendance: studentData.attendance || [], homework: studentData.homework || [],
        points: studentData.points || {}, skills: studentData.skills || {},
      });
    }
    const allPrograms = await loadJSON("programs", [], true);
    for (const prog of allPrograms) {
      if (!(prog.memberClassIds || []).some((cid) => enrolledClassIds.includes(cid))) continue;
      const progConfig = await loadJSON(`program:${prog.id}:config`, { points: { categories: [] } }, true);
      const progPointsData = await loadJSON(`program:${prog.id}:pointsData`, {}, true);
      results.programs.push({ programId: prog.id, programName: prog.name, config: progConfig, points: progPointsData[studentId] || {} });
    }
    return results;
  };

  // Builds the full set of export rows, one array per requested data type, for whatever scope
  // was chosen (whole school, specific classes, or specific students). Two passes: first
  // gathers exactly which students are in scope and which classes each is in, then generates
  // each data type from that set — this is what keeps a student who's in multiple in-scope
  // classes, or a program that spans them, from being double-counted.
  const buildExportData = async ({ scope, classIds, studentIds, dataTypes }) => {
    const allClasses = (await loadJSON("schoolClasses", [], true)).filter((c) => !c.archived);
    const globalStudentsList = await loadJSON("globalStudents", [], true);
    const globalMap = {};
    globalStudentsList.forEach((s) => (globalMap[s.id] = s));

    const relevantClasses = scope === "classes" ? allClasses.filter((c) => classIds.includes(c.id)) : allClasses;

    const sheets = { Incidents: [], Assessments: [], Homework: [], Attendance: [], Points: [], "Shared Programs": [], "Parent & Contact Info": [] };
    const studentNameMap = {};
    const studentClassNames = {};
    const studentIdsEncountered = new Set();
    const contactRowsAdded = new Set();

    for (const cls of relevantClasses) {
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      const clsConfig = await loadJSON(`class:${cls.id}:config`, DEFAULT_CONFIG, true);
      const studentsInScope = scope === "students" ? clsRoster.filter((s) => studentIds.includes(s.id)) : clsRoster;
      if (studentsInScope.length === 0) continue;
      const studentIdsInScope = studentsInScope.map((s) => s.id);
      studentsInScope.forEach((s) => {
        studentIdsEncountered.add(s.id);
        studentNameMap[s.id] = s.name;
        if (!studentClassNames[s.id]) studentClassNames[s.id] = [];
        studentClassNames[s.id].push(cls.name);
      });

      if (dataTypes.includes("incidents")) {
        const clsIncidents = await loadJSON(`class:${cls.id}:incidents`, [], true);
        const catMap = {};
        (clsConfig.incidents?.categories || []).forEach((c) => (catMap[c.id] = c.label));
        clsIncidents.forEach((inc) => {
          (inc.studentIds || []).filter((sid) => studentIdsInScope.includes(sid)).forEach((sid) => {
            sheets.Incidents.push({
              Student: studentNameMap[sid] || "", Class: cls.name, Date: inc.date,
              Category: catMap[inc.category] || inc.category || "Uncategorized", Description: inc.description || "",
            });
          });
        });
      }

      if (dataTypes.includes("attendance") || dataTypes.includes("homework") || dataTypes.includes("points") || dataTypes.includes("assessments") || dataTypes.includes("contact")) {
        for (const student of studentsInScope) {
          const sd = await loadJSON(`class:${cls.id}:kriya:${student.id}`, emptyStudentData(), true);

          if (dataTypes.includes("attendance")) {
            const statusMap = {};
            (clsConfig.attendance?.statuses || []).forEach((st) => (statusMap[st.id] = st.label));
            (sd.attendance || []).forEach((a) => {
              sheets.Attendance.push({ Student: student.name, Class: cls.name, Date: a.date, Status: statusMap[a.status] || a.status, Time: a.time || "" });
            });
          }

          if (dataTypes.includes("homework")) {
            (sd.homework || []).forEach((h) => {
              sheets.Homework.push({ Student: student.name, Class: cls.name, Date: h.date, Status: h.status });
            });
          }

          if (dataTypes.includes("points")) {
            (clsConfig.points?.categories || []).filter((c) => c.scope !== "class").forEach((cat) => {
              if (cat.displayMode === "checkx") {
                sheets.Points.push({ Student: student.name, Class: cls.name, Category: cat.label, Checks: sd.points?.[`${cat.id}:check`] || 0, "X's": sd.points?.[`${cat.id}:x`] || 0 });
              } else {
                sheets.Points.push({ Student: student.name, Class: cls.name, Category: cat.label, Points: sd.points?.[cat.id] || 0, Threshold: cat.threshold || "" });
              }
            });
          }

          if (dataTypes.includes("assessments")) {
            (clsConfig.categories || []).filter((c) => c.active).forEach((cat) => {
              (cat.items || []).forEach((item) => {
                const entry = sd.skills?.[skillKey(cat.id, item.id)];
                if (!entry || !entry.history || entry.history.length === 0) return;
                const { status } = computeSkillStatus(entry.history, { ...cat, gradeOptions: clsConfig.gradeOptions });
                sheets.Assessments.push({ Student: student.name, Class: cls.name, Category: cat.title, Item: item.label, Status: status, "Last graded": entry.history[entry.history.length - 1]?.date || "" });
              });
            });
          }

          if (dataTypes.includes("contact") && !contactRowsAdded.has(student.id)) {
            contactRowsAdded.add(student.id);
            const g = globalMap[student.id] || student;
            sheets["Parent & Contact Info"].push({
              Student: student.name, "Parent 1 Name": g.parent1Name || "", "Parent 1 Phone": g.parentPhone || "", "Parent 1 Email": g.parentEmail || "",
              "Parent 2 Name": g.parent2Name || "", "Parent 2 Phone": g.parent2Phone || "", "Parent 2 Email": g.parent2Email || "", "Home Address": g.homeAddress || "",
            });
          }
        }
      }
    }

    if (dataTypes.includes("programs")) {
      const allProgramsForExport = await loadJSON("programs", [], true);
      for (const prog of allProgramsForExport) {
        const overlapsScope = (prog.memberClassIds || []).some((cid) => relevantClasses.some((c) => c.id === cid));
        if (!overlapsScope) continue;
        const progConfig = await loadJSON(`program:${prog.id}:config`, { points: { categories: [] } }, true);
        const progPointsData = await loadJSON(`program:${prog.id}:pointsData`, {}, true);
        Object.keys(progPointsData).filter((sid) => studentIdsEncountered.has(sid)).forEach((sid) => {
          (progConfig.points?.categories || []).forEach((cat) => {
            sheets["Shared Programs"].push({ Student: studentNameMap[sid] || "", Program: prog.name, Category: cat.label, Points: progPointsData[sid]?.[cat.id] || 0 });
          });
        });
      }
    }

    const result = {};
    Object.entries(sheets).forEach(([name, rows]) => { if (rows.length > 0) result[name] = rows; });
    return result;
  };

  // Scans every active class's roster once and builds { studentId: [className, ...] } — used
  // to group the school-wide student list by class, rather than one call per student.
  const fetchStudentClassMap = async () => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const map = {};
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      clsRoster.forEach((s) => {
        if (!map[s.id]) map[s.id] = [];
        map[s.id].push(cls.name);
      });
    }
    return map;
  };

  const refreshPrograms = async () => {
    const list = await loadJSON("programs", [], true);
    setPrograms(list);
  };

  const addProgram = async (name, memberClassIds) => {
    const list = await loadJSON("programs", [], true);
    const record = { id: uid(), name, memberClassIds: memberClassIds || [], pointsCategories: [] };
    const next = [...list, record];
    setPrograms(next);
    await saveJSON("programs", next, true);
    return record;
  };

  const updateProgram = async (programId, fields) => {
    const list = await loadJSON("programs", [], true);
    const next = list.map((p) => (p.id === programId ? { ...p, ...fields } : p));
    setPrograms(next);
    await saveJSON("programs", next, true);
  };

  const removeProgram = async (programId) => {
    const list = await loadJSON("programs", [], true);
    const next = list.filter((p) => p.id !== programId);
    setPrograms(next);
    await saveJSON("programs", next, true);
  };

  // Lets admin open and actually run a program directly — not just create/rename it — same
  // data shape the teacher-side openProgram() builds, so PointsView (in programMode) can be
  // reused completely unchanged here.
  const fetchProgramDetail = async (programId) => {
    const prog = (await loadJSON("programs", [], true)).find((p) => p.id === programId);
    if (!prog) return null;
    const roster = await fetchProgramRoster(prog.memberClassIds);
    const cfg = await loadJSON(`program:${programId}:config`, { points: { categories: [] } }, true);
    const pointsData = await loadJSON(`program:${programId}:pointsData`, {}, true);
    return { roster, config: cfg, pointsData };
  };

  const addProgramPointsAdmin = async (programId, currentPointsData, studentId, catId, amount) => {
    const current = currentPointsData[studentId]?.[catId] || 0;
    const next = { ...currentPointsData, [studentId]: { ...currentPointsData[studentId], [catId]: Math.max(0, current + amount) } };
    await saveJSON(`program:${programId}:pointsData`, next, true);
    return next;
  };

  const addProgramCategoryAdmin = async (programId, currentConfig, newCat) => {
    const next = { ...currentConfig, points: { ...currentConfig.points, categories: [...(currentConfig.points?.categories || []), newCat] } };
    await saveJSON(`program:${programId}:config`, next, true);
    return next;
  };

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

  // Substitute access — a separate code from the regular class password, generated on demand and
  // regenerated/cleared entirely at the teacher's discretion (no auto-expiry). A class with no
  // subCode set has substitute access turned off.
  const generateSubCode = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const next = reg.map((c) => (c.id === classId ? { ...c, subCode: code } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
    return code;
  };

  const clearSubCode = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === classId ? { ...c, subCode: null } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
  };

  const enterSubstituteSession = async (code) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const match = reg.find((c) => !c.archived && c.subCode && c.subCode.toUpperCase() === code.trim().toUpperCase());
    if (!match) return { ok: false };
    setClassId(match.id);
    setClassName(match.name);
    setIsSubstituteSession(true);
    return { ok: true };
  };

  const exitSubstituteSession = () => {
    setIsSubstituteSession(false);
    setClassId(null);
    setClassName("");
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

  // Removes the class from the list permanently — its underlying records (roster, incidents,
  // points, etc.) aren't individually cleaned up, since there's no cascading-delete mechanism
  // for that, but they become unreachable once the class itself is gone from this list.
  const deleteClassPermanently = async (id) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.filter((c) => c.id !== id);
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
  };

  // Same as deleteClassPermanently, but also navigates away afterward — for when a teacher
  // deletes the class they're currently sitting inside of (mirrors what archiveClass does).
  const deleteOwnClassPermanently = async () => {
    await deleteClassPermanently(classId);
    switchClass();
  };

  const refreshRegistry = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    setRegistry(reg);
  };

  const refreshGlobalStudents = async () => {
    const gs = await loadJSON("globalStudents", [], true);
    setGlobalStudents(gs);
  };

  const addGlobalStudent = async (fields) => {
    const gs = await loadJSON("globalStudents", [], true);
    const student = {
      id: uid(), name: fields.name || "",
      parent1Name: "", parentEmail: "", parentPhone: "",
      parent2Name: "", parent2Email: "", parent2Phone: "",
      homeAddress: "", notes: "",
      ...fields,
    };
    const next = [...gs, student];
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
    return student;
  };

  // One load, one save for the entire batch — used by the bulk file-import feature, so
  // importing dozens of students doesn't mean dozens of separate round-trips.
  const bulkAddGlobalStudents = async (newStudents) => {
    const gs = await loadJSON("globalStudents", [], true);
    const withDefaults = newStudents.map((fields) => ({
      id: uid(), name: "",
      parent1Name: "", parentEmail: "", parentPhone: "",
      parent2Name: "", parent2Email: "", parent2Phone: "",
      homeAddress: "", notes: "",
      ...fields,
    }));
    const next = [...gs, ...withDefaults];
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
    return withDefaults.length;
  };

  const updateGlobalStudent = async (id, field, value) => {
    const gs = await loadJSON("globalStudents", [], true);
    const next = gs.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
  };

  const archiveGlobalStudent = async (id) => {
    const gs = await loadJSON("globalStudents", [], true);
    const next = gs.map((s) => (s.id === id ? { ...s, archived: true } : s));
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
  };

  // Removes the student from the school-wide list permanently — a class roster that already
  // enrolled them keeps its own local record of the enrollment, since roster entries aren't a
  // live reference back to this list, so this doesn't touch any class's existing history.
  const deleteGlobalStudentPermanently = async (id) => {
    const gs = await loadJSON("globalStudents", [], true);
    const next = gs.filter((s) => s.id !== id);
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
  };

  const refreshSchoolEvents = async () => {
    const ev = await loadJSON("schoolEvents", [], true);
    setSchoolEvents(ev);
  };

  const addSchoolEvent = async (fields) => {
    const ev = await loadJSON("schoolEvents", [], true);
    const event = { id: uid(), title: "", date: todayISO(), time: "", notes: "", location: "", reminderLeadDays: 1, appliesTo: "all", category: "school-event", ...fields };
    const next = [...ev, event];
    setSchoolEvents(next);
    await saveJSON("schoolEvents", next, true);
    return event;
  };

  const updateSchoolEvent = async (id, fields) => {
    const ev = await loadJSON("schoolEvents", [], true);
    const next = ev.map((e) => (e.id === id ? { ...e, ...fields } : e));
    setSchoolEvents(next);
    await saveJSON("schoolEvents", next, true);
  };

  const removeSchoolEvent = async (id) => {
    const ev = await loadJSON("schoolEvents", [], true);
    const next = ev.filter((e) => e.id !== id);
    setSchoolEvents(next);
    await saveJSON("schoolEvents", next, true);
  };

  // Teaching Tools — a school-wide, admin-managed list of outside links (tools, generators,
  // shared resource folders/files) every class sees the same copy of. Mirrors the schoolEvents
  // pattern exactly: re-fetch before mutating so this stays correct even if multiple admin tabs
  // are open, or the local state is stale.
  const refreshSchoolTools = async () => {
    const t = await loadJSON("schoolTools", DEFAULT_SCHOOL_TOOLS, true);
    setSchoolTools(t);
  };

  const addSchoolTool = async (fields) => {
    const t = await loadJSON("schoolTools", DEFAULT_SCHOOL_TOOLS, true);
    const tool = { id: uid(), category: "tool", label: "", url: "", description: "", ...fields };
    const next = [...t, tool];
    setSchoolTools(next);
    await saveJSON("schoolTools", next, true);
    return tool;
  };

  const updateSchoolTool = async (id, fields) => {
    const t = await loadJSON("schoolTools", DEFAULT_SCHOOL_TOOLS, true);
    const next = t.map((x) => (x.id === id ? { ...x, ...fields } : x));
    setSchoolTools(next);
    await saveJSON("schoolTools", next, true);
  };

  const removeSchoolTool = async (id) => {
    const t = await loadJSON("schoolTools", DEFAULT_SCHOOL_TOOLS, true);
    const next = t.filter((x) => x.id !== id);
    setSchoolTools(next);
    await saveJSON("schoolTools", next, true);
  };

  const restoreGlobalStudent = async (id) => {
    const gs = await loadJSON("globalStudents", [], true);
    const next = gs.map((s) => (s.id === id ? { ...s, archived: false } : s));
    setGlobalStudents(next);
    await saveJSON("globalStudents", next, true);
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

  const changeAdminPassword = async (newPassword) => {
    await saveJSON("adminSettings", { password: newPassword }, true);
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

  if (checkingSession || !authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-teal-700" size={28} /></div>;
  }

  // Substitute session — a separate, code-based entry point that bypasses every other login
  // path entirely. Checked first since it's a completely independent flow from a real teacher
  // account, admin session, or the legacy class-password flow.
  if (isSubstituteSession && classId) {
    return (
      <ClassApp classId={classId} className={className} isSubstituteSession
        onSwitchClass={exitSubstituteSession} switchLabel="Exit substitute mode" />
    );
  }

  // Signed in with a real account — this is now the primary path.
  if (authUser && !useLegacyFlow) {
    if (!currentTeacher) {
      // A Firebase account exists but has no matching staff record (e.g. deactivated, or
      // something went wrong during creation) — never silently let them further into the app.
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10 text-center">
          <GlobalAppStyles />
          <div className="max-w-sm w-full">
            <p className="text-sm text-stone-600 mb-4">This account isn't set up with access yet. Ask your admin to check your staff account.</p>
            <button onClick={signOutStaff} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Sign out</button>
          </div>
        </div>
      );
    }
    if (currentTeacher.role === "admin") {
      if (!classId) {
        return <AdminDashboard registry={registry} onEnterClass={enterAssignedClass} onCreate={createClass} onRefresh={refreshRegistry} onLogout={signOutStaff} onRestore={restoreClass} onDeleteClass={deleteClassPermanently} onChangePassword={changeAdminPassword}
          currentTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName}
          globalStudents={globalStudents} onRefreshStudents={refreshGlobalStudents} onAddStudent={addGlobalStudent} onUpdateStudent={updateGlobalStudent} onArchiveStudent={archiveGlobalStudent} onRestoreStudent={restoreGlobalStudent} onDeleteStudent={deleteGlobalStudentPermanently} onBulkAddStudents={bulkAddGlobalStudents}
          schoolEvents={schoolEvents} onRefreshEvents={refreshSchoolEvents} onAddEvent={addSchoolEvent} onUpdateEvent={updateSchoolEvent} onRemoveEvent={removeSchoolEvent}
          schoolTools={schoolTools} onRefreshTools={refreshSchoolTools} onAddTool={addSchoolTool} onUpdateTool={updateSchoolTool} onRemoveTool={removeSchoolTool}
          teachers={teachers} onRefreshTeachers={refreshTeachers} onCreateTeacher={createTeacherAccount} onUpdateTeacher={updateTeacherRecord} onDeactivateTeacher={deactivateTeacherRecord} onDeleteTeacher={deleteTeacherPermanently}
          onFetchDailyOverview={fetchDailyOverview} onFetchStudentHistory={fetchAdminStudentHistory} onFetchStudentClassMap={fetchStudentClassMap} onFetchStudentProfile={fetchAdminStudentProfile} onBuildExportData={buildExportData}
          programs={programs} onRefreshPrograms={refreshPrograms} onAddProgram={addProgram} onUpdateProgram={updateProgram} onRemoveProgram={removeProgram} onFetchProgramDetail={fetchProgramDetail} onAddProgramPoints={addProgramPointsAdmin} onAddProgramCategory={addProgramCategoryAdmin} />;
      }
      return (
        <ClassApp classId={classId} className={className}
          onSwitchClass={backToTeacherClassPicker} switchLabel="Admin · Back to dashboard"
          onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently}
          subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
          loggedInTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName} />
      );
    }
    // Real teacher — only ever sees classes they're actually assigned to.
    const myClasses = registry.filter((c) => !c.archived && (currentTeacher.assignedClassIds || []).includes(c.id));
    if (!classId || !myClasses.some((c) => c.id === classId)) {
      return <TeacherClassPicker teacherName={currentTeacher.name} classes={myClasses} onSelect={enterAssignedClass} onSignOut={signOutStaff} />;
    }
    return (
      <ClassApp classId={classId} className={className}
        onSwitchClass={backToTeacherClassPicker} switchLabel="Switch class"
        onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently}
        subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
        loggedInTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName} />
    );
  }

  // Not signed in with a real account — show the new sign-in screen by default, with the
  // original class-password flow available as an explicit fallback (useful until every
  // teacher has a real account set up, so nobody gets locked out mid-transition).
  if (!useLegacyFlow) {
    return <TeacherSignInScreen onSignIn={signInTeacher} onUseLegacyFlow={() => setUseLegacyFlow(true)} onEnterSubstitute={enterSubstituteSession} />;
  }
  if (!classId) {
    if (isAdminSession) {
      return <AdminDashboard registry={registry} onEnterClass={enterClassAsAdmin} onCreate={createClass} onRefresh={refreshRegistry} onLogout={logoutAdmin} onRestore={restoreClass} onDeleteClass={deleteClassPermanently} onChangePassword={changeAdminPassword}
        globalStudents={globalStudents} onRefreshStudents={refreshGlobalStudents} onAddStudent={addGlobalStudent} onUpdateStudent={updateGlobalStudent} onArchiveStudent={archiveGlobalStudent} onRestoreStudent={restoreGlobalStudent} onDeleteStudent={deleteGlobalStudentPermanently} onBulkAddStudents={bulkAddGlobalStudents}
        schoolEvents={schoolEvents} onRefreshEvents={refreshSchoolEvents} onAddEvent={addSchoolEvent} onUpdateEvent={updateSchoolEvent} onRemoveEvent={removeSchoolEvent}
          schoolTools={schoolTools} onRefreshTools={refreshSchoolTools} onAddTool={addSchoolTool} onUpdateTool={updateSchoolTool} onRemoveTool={removeSchoolTool}
        teachers={teachers} onRefreshTeachers={refreshTeachers} onCreateTeacher={createTeacherAccount} onUpdateTeacher={updateTeacherRecord} onDeactivateTeacher={deactivateTeacherRecord} onDeleteTeacher={deleteTeacherPermanently}
        onFetchDailyOverview={fetchDailyOverview} onFetchStudentHistory={fetchAdminStudentHistory} onFetchStudentClassMap={fetchStudentClassMap} onFetchStudentProfile={fetchAdminStudentProfile} onBuildExportData={buildExportData}
        programs={programs} onRefreshPrograms={refreshPrograms} onAddProgram={addProgram} onUpdateProgram={updateProgram} onRemoveProgram={removeProgram} onFetchProgramDetail={fetchProgramDetail} onAddProgramPoints={addProgramPointsAdmin} onAddProgramCategory={addProgramCategoryAdmin} />;
    }
    return <ClassGateScreen registry={registry} onSelect={selectClass} onCreate={createClass} onRefresh={refreshRegistry} onLoginAdmin={loginAdmin} />;
  }
  return (
    <ClassApp classId={classId} className={className}
      onSwitchClass={isAdminSession ? backToAdminDashboard : switchClass}
      switchLabel={isAdminSession ? "Admin \u00b7 Back to dashboard" : "Switch class"}
      subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
      onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently} />
  );
}

function SchoolEventForm({ classes, existing, onSave, onCancel }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [date, setDate] = useState(existing?.date || todayISO());
  const [time, setTime] = useState(existing?.time || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [reminderLeadDays, setReminderLeadDays] = useState(existing?.reminderLeadDays ?? 1);
  const [category, setCategory] = useState(existing?.category || "school-event");
  const [appliesMode, setAppliesMode] = useState(existing?.appliesTo === "all" || !existing ? "all" : "selected");
  const [selectedClassIds, setSelectedClassIds] = useState(Array.isArray(existing?.appliesTo) ? existing.appliesTo : []);

  const toggleClass = (id) => setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    if (!title.trim() || !date) return;
    onSave({
      title: title.trim(), date, time, notes, location, category,
      reminderLeadDays: Number(reminderLeadDays) || 0,
      appliesTo: appliesMode === "all" ? "all" : selectedClassIds,
    });
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Time (optional)</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
      </div>
      <label className="block text-[10px] text-stone-400 mb-0.5">Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-2">
        {EVENT_CATEGORIES.filter((c) => c.id !== "jewish-holiday").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
      </select>
      <label className="block text-[10px] text-stone-400 mb-0.5">Location (optional)</label>
      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <label className="block text-[10px] text-stone-400 mb-0.5">Notes (optional)</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <label className="block text-[10px] text-stone-400 mb-0.5">Remind teachers this many days before</label>
      <input type="number" min={0} value={reminderLeadDays} onChange={(e) => setReminderLeadDays(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

      <label className="block text-xs font-semibold text-stone-700 mb-1">Applies to</label>
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => setAppliesMode("all")} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${appliesMode === "all" ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>All classes</button>
        <button onClick={() => setAppliesMode("selected")} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${appliesMode === "selected" ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>Selected classes</button>
      </div>
      {appliesMode === "selected" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {classes.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
          {classes.map((c) => (
            <button key={c.id} onClick={() => toggleClass(c.id)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedClassIds.includes(c.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={save} disabled={!title.trim() || (appliesMode === "selected" && selectedClassIds.length === 0)}
          className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {existing ? "Save changes" : "Create event"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
      </div>
    </div>
  );
}

function SchoolToolForm({ existing, onSave, onCancel }) {
  const [category, setCategory] = useState(existing?.category || "tool");
  const [label, setLabel] = useState(existing?.label || "");
  const [url, setUrl] = useState(existing?.url || "");
  const [description, setDescription] = useState(existing?.description || "");

  const save = () => {
    if (!label.trim() || !url.trim()) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`; // teachers pasting a bare domain shouldn't end up with a broken link
    onSave({ category, label: label.trim(), url: finalUrl, description: description.trim() });
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <label className="block text-xs font-semibold text-stone-700 mb-1">Type</label>
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => setCategory("tool")} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${category === "tool" ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>Outside tool</button>
        <button onClick={() => setCategory("resource")} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${category === "resource" ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>Shared file / folder</button>
      </div>
      <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={category === "tool" ? "e.g. Chumash Quest" : "e.g. Kriya worksheets folder"} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <label className="block text-[10px] text-stone-400 mb-0.5">Link</label>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <label className="block text-[10px] text-stone-400 mb-0.5">Description (optional)</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short note on what this is" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
      <div className="flex gap-2">
        <button onClick={save} disabled={!label.trim() || !url.trim()}
          className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {existing ? "Save changes" : "Add"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
      </div>
    </div>
  );
}

function TeacherAccountForm({ classes, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleClass = (id) => setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    setError("");
    if (!name.trim() || !email.trim() || tempPassword.length < 6) {
      setError("Name, email, and a temporary password of at least 6 characters are all required.");
      return;
    }
    setSaving(true);
    const result = await onSave(name.trim(), email.trim(), tempPassword, role, selectedClassIds, isSubstitute);
    setSaving(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Teacher's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (this is their username)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <p className="text-[10px] text-stone-400 mb-2">Share this password with them directly — there's no reset-email flow yet, so for now they'll sign in with exactly what you set here.</p>

      <label className="block text-[10px] text-stone-400 mb-0.5">Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-2">
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>

      <label className="flex items-center gap-2 text-xs text-stone-600 mb-2">
        <input type="checkbox" checked={isSubstitute} onChange={(e) => setIsSubstitute(e.target.checked)} />
        Substitute (temporary access)
      </label>

      {role === "teacher" && (
        <>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Assign to classes</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {classes.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
            {classes.map((c) => (
              <button key={c.id} onClick={() => toggleClass(c.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedClassIds.includes(c.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {saving ? "Creating..." : "Create account"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
      </div>
    </div>
  );
}

function ProgramForm({ classes, existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || "");
  const [memberClassIds, setMemberClassIds] = useState(existing?.memberClassIds || []);

  const toggleClass = (id) => setMemberClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    if (!name.trim() || memberClassIds.length === 0) return;
    onSave(name.trim(), memberClassIds);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Program name (e.g. Torah Memorization)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <label className="block text-xs font-semibold text-stone-700 mb-1">Which classes are part of this?</label>
      <p className="text-[10px] text-stone-400 mb-2">Every student currently in these classes is automatically in the program — add or remove a student from the class later and it updates here too.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {classes.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
        {classes.map((c) => (
          <button key={c.id} onClick={() => toggleClass(c.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${memberClassIds.includes(c.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={!name.trim() || memberClassIds.length === 0} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {existing ? "Save changes" : "Create program"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
      </div>
    </div>
  );
}

const EXPORT_DATA_TYPE_OPTIONS = [
  { id: "incidents", label: "Incidents" },
  { id: "assessments", label: "Assessments" },
  { id: "homework", label: "Homework" },
  { id: "attendance", label: "Attendance" },
  { id: "points", label: "Points" },
  { id: "programs", label: "Shared programs" },
  { id: "contact", label: "Parent & contact info" },
];

function ExportPanel({ classes, globalStudents, onExport, onCancel }) {
  const [scope, setScope] = useState("school");
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [dataTypes, setDataTypes] = useState(EXPORT_DATA_TYPE_OPTIONS.map((o) => o.id));
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null); // { sheetCount, rowCount } | { empty: true }

  const toggleDataType = (id) => setDataTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  const toggleClass = (id) => setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleStudent = (id) => setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredStudents = (globalStudents || []).filter((s) => !s.archived && s.name.toLowerCase().includes(studentSearch.toLowerCase()));
  const canExport = dataTypes.length > 0 && (scope === "school" || (scope === "classes" && selectedClassIds.length > 0) || (scope === "students" && selectedStudentIds.length > 0));

  const doExport = async () => {
    setExporting(true);
    setResult(null);
    const summary = await onExport({ scope, classIds: selectedClassIds, studentIds: selectedStudentIds, dataTypes });
    setResult(summary);
    setExporting(false);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <label className="block text-xs font-semibold text-stone-700 mb-1.5">Who to include</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {[{ id: "school", label: "Entire school" }, { id: "classes", label: "Specific classes" }, { id: "students", label: "Specific students" }].map((opt) => (
          <button key={opt.id} onClick={() => setScope(opt.id)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${scope === opt.id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {scope === "classes" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {classes.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
          {classes.map((c) => (
            <button key={c.id} onClick={() => toggleClass(c.id)} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedClassIds.includes(c.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {scope === "students" && (
        <div className="mb-3">
          <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search students..." className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {filteredStudents.length === 0 && <p className="text-xs text-stone-400">No students found.</p>}
            {filteredStudents.map((s) => (
              <button key={s.id} onClick={() => toggleStudent(s.id)} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedStudentIds.includes(s.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-xs font-semibold text-stone-700 mb-1.5">What to include</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {EXPORT_DATA_TYPE_OPTIONS.map((opt) => (
          <label key={opt.id} className="flex items-center gap-1.5 text-xs bg-white border border-stone-300 rounded-full px-2.5 py-1.5">
            <input type="checkbox" checked={dataTypes.includes(opt.id)} onChange={() => toggleDataType(opt.id)} />
            {opt.label}
          </label>
        ))}
      </div>

      {result?.empty && <p className="text-xs text-amber-700 mb-2">No matching data found for that selection — nothing was downloaded.</p>}
      {result && !result.empty && <p className="text-xs text-emerald-700 mb-2">✓ Downloaded — {result.sheetCount} sheet{result.sheetCount === 1 ? "" : "s"}, {result.rowCount} row{result.rowCount === 1 ? "" : "s"} total.</p>}

      <div className="flex gap-2">
        <button onClick={doExport} disabled={!canExport || exporting} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {exporting ? "Building export..." : "Export to Excel"}
        </button>
        <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Close</button>
      </div>
    </div>
  );
}

function BulkImportPanel({ onImport, onCancel }) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({}); // header -> field
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { imported, skipped }

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    setResult(null);
    try {
      const { headers, rows } = await parseSpreadsheetFile(file);
      if (headers.length === 0 || rows.length === 0) {
        setError("Couldn't find any student rows in that file — make sure the first row has column labels and there's at least one student below it.");
        setParsed(null);
        return;
      }
      const initialMapping = {};
      headers.forEach((h) => { initialMapping[h] = guessImportField(h); });
      setMapping(initialMapping);
      setParsed({ headers, rows });
    } catch (err) {
      setError("Couldn't read that file — make sure it's a valid Excel (.xlsx) or CSV file.");
      setParsed(null);
    }
  };

  const nameHeader = parsed?.headers.find((h) => mapping[h] === "name");

  const doImport = async () => {
    if (!parsed || !nameHeader) return;
    setImporting(true);
    const students = [];
    let skipped = 0;
    parsed.rows.forEach((row) => {
      const fields = {};
      Object.entries(mapping).forEach(([header, field]) => {
        if (field) fields[field] = String(row[header] || "").trim();
      });
      if (!fields.name) { skipped++; return; }
      students.push(fields);
    });
    const imported = await onImport(students);
    setImporting(false);
    setResult({ imported, skipped });
    setParsed(null);
    setFileName("");
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      {result && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-emerald-700">✓ Imported {result.imported} student{result.imported === 1 ? "" : "s"}</p>
          {result.skipped > 0 && <p className="text-xs text-stone-400 mt-0.5">{result.skipped} row{result.skipped === 1 ? "" : "s"} skipped — no name found in the mapped name column.</p>}
        </div>
      )}

      {!parsed && (
        <>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Choose an Excel (.xlsx) or CSV file</label>
          <p className="text-[10px] text-stone-400 mb-2">The first row should have column labels like "Student Name," "Parent Email," etc. — you'll get to check and fix how each column gets matched before anything is actually imported.</p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="text-sm mb-2" />
          {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
          <div>
            <button onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-700">Close</button>
          </div>
        </>
      )}

      {parsed && (
        <>
          <p className="text-xs font-semibold text-stone-700 mb-1">{fileName} — {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found</p>
          <p className="text-[10px] text-stone-400 mb-2">Check that each column matched the right field — change any that don't look right.</p>
          <div className="space-y-1.5 mb-3 max-h-64 overflow-y-auto">
            {parsed.headers.map((h) => (
              <div key={h} className="flex items-center gap-2">
                <span className="text-xs text-stone-600 w-28 shrink-0 truncate" title={h}>"{h}"</span>
                <ChevronRight size={12} className="text-stone-300 shrink-0" />
                <select value={mapping[h] || ""} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                  className="flex-1 rounded-lg border border-stone-300 px-2 py-1 text-xs bg-white">
                  {IMPORT_FIELD_OPTIONS.map((opt) => <option key={opt.field || "none"} value={opt.field}>{opt.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {!nameHeader && (
            <p className="text-xs text-amber-700 mb-2">⚠️ No column is mapped to "Student name" yet — pick one above before importing.</p>
          )}

          <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Preview</p>
          <div className="bg-white border border-stone-200 rounded-lg p-2 mb-3 text-xs space-y-1">
            {parsed.rows.slice(0, 3).map((row, i) => (
              <p key={i} className="text-stone-600">{nameHeader ? (row[nameHeader] || "(blank — will be skipped)") : "—"}</p>
            ))}
            {parsed.rows.length > 3 && <p className="text-stone-400">+{parsed.rows.length - 3} more</p>}
          </div>

          <div className="flex gap-2">
            <button onClick={doImport} disabled={importing || !nameHeader}
              className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {importing ? "Importing..." : `Import ${parsed.rows.length} student${parsed.rows.length === 1 ? "" : "s"}`}
            </button>
            <button onClick={() => { setParsed(null); setFileName(""); }} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

function AdminDashboard({ registry, onEnterClass, onCreate, onRefresh, onLogout, onRestore, onDeleteClass, onChangePassword, currentTeacher, onChangeMyPassword, onChangeMyName, globalStudents, onRefreshStudents, onAddStudent, onUpdateStudent, onArchiveStudent, onRestoreStudent, onDeleteStudent, onBulkAddStudents, onBuildExportData, schoolEvents, onRefreshEvents, onAddEvent, onUpdateEvent, onRemoveEvent, schoolTools, onRefreshTools, onAddTool, onUpdateTool, onRemoveTool, teachers, onRefreshTeachers, onCreateTeacher, onUpdateTeacher, onDeactivateTeacher, onDeleteTeacher, onFetchDailyOverview, onFetchStudentHistory, onFetchStudentClassMap, onFetchStudentProfile, programs, onRefreshPrograms, onAddProgram, onUpdateProgram, onRemoveProgram, onFetchProgramDetail, onAddProgramPoints, onAddProgramCategory }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPwChange, setShowPwChange] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [expandedGlobalStudents, setExpandedGlobalStudents] = useState({});
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showToolForm, setShowToolForm] = useState(false);
  const [editingToolId, setEditingToolId] = useState(null);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherUid, setEditingTeacherUid] = useState(null);
  const [overviewDate, setOverviewDate] = useState(todayISO());
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [studentHistoryId, setStudentHistoryId] = useState(null);
  const [studentHistoryData, setStudentHistoryData] = useState(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);
  const [profileStudent, setProfileStudent] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const openStudentProfile = (student) => {
    setProfileStudent(student);
    setProfileData(null);
    onFetchStudentProfile(student.id).then(setProfileData);
  };
  const [openProgramId, setOpenProgramId] = useState(null);
  const [programDetail, setProgramDetail] = useState(null);
  const openProgramAdmin = (programId) => {
    setOpenProgramId(programId);
    setProgramDetail(null);
    onFetchProgramDetail(programId).then(setProgramDetail);
  };
  const closeProgramAdmin = () => { setOpenProgramId(null); setProgramDetail(null); };
  const addPointsInProgram = (studentId, catId, amount) => {
    setProgramDetail((prev) => {
      const current = prev.pointsData[studentId]?.[catId] || 0;
      const nextPointsData = { ...prev.pointsData, [studentId]: { ...prev.pointsData[studentId], [catId]: Math.max(0, current + amount) } };
      saveJSON(`program:${openProgramId}:pointsData`, nextPointsData, true);
      return { ...prev, pointsData: nextPointsData };
    });
  };
  const addCategoryInProgram = (newCat) => {
    setProgramDetail((prev) => {
      const nextConfig = { ...prev.config, points: { ...prev.config.points, categories: [...(prev.config.points?.categories || []), newCat] } };
      saveJSON(`program:${openProgramId}:config`, nextConfig, true);
      return { ...prev, config: nextConfig };
    });
  };
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showArchivedClasses, setShowArchivedClasses] = useState(false);
  const [showArchivedStudents, setShowArchivedStudents] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showMyAccount, setShowMyAccount] = useState(false);
  const handleExport = async (params) => {
    const sheets = await onBuildExportData(params);
    const sheetNames = Object.keys(sheets);
    if (sheetNames.length === 0) return { empty: true };
    const wb = XLSX.utils.book_new();
    let rowCount = 0;
    sheetNames.forEach((name) => {
      const ws = XLSX.utils.json_to_sheet(sheets[name]);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      rowCount += sheets[name].length;
    });
    XLSX.writeFile(wb, `export-${todayISO()}.xlsx`);
    return { sheetCount: sheetNames.length, rowCount };
  };
  const [studentClassMap, setStudentClassMap] = useState({});
  useEffect(() => { onFetchStudentClassMap().then(setStudentClassMap); }, [globalStudents, registry]);
  const [showArchivedTeachers, setShowArchivedTeachers] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const activeClasses = registry.filter((c) => !c.archived);
  const archivedClasses = registry.filter((c) => c.archived);
  const activeStudents = (globalStudents || []).filter((s) => !s.archived && s.name.toLowerCase().includes(studentSearch.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const aClass = (studentClassMap[a.id] || [])[0] || "\uffff"; // unassigned sorts last
      const bClass = (studentClassMap[b.id] || [])[0] || "\uffff";
      if (aClass !== bClass) return aClass < bClass ? -1 : 1;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  const archivedStudents = (globalStudents || []).filter((s) => s.archived);
  const activeTeachers = (teachers || []).filter((t) => t.active);
  const inactiveTeachers = (teachers || []).filter((t) => !t.active);

  const loadOverview = async (dateStr) => {
    setOverviewLoading(true);
    const data = await onFetchDailyOverview(dateStr);
    setOverviewData(data);
    setOverviewLoading(false);
  };

  useEffect(() => { loadOverview(overviewDate); }, []); // eslint-disable-line

  const openStudentHistory = async (studentId) => {
    setStudentHistoryId(studentId);
    setStudentHistoryLoading(true);
    const data = await onFetchStudentHistory(studentId);
    setStudentHistoryData(data);
    setStudentHistoryLoading(false);
  };

  useEffect(() => { onRefresh(); onRefreshStudents(); onRefreshEvents(); onRefreshTools(); onRefreshTeachers(); onRefreshPrograms(); }, []); // eslint-disable-line

  const submitCreate = async () => {
    if (!newName.trim() || !newPw.trim()) return;
    await onCreate(newName.trim(), newPw.trim());
    setNewName(""); setNewPw(""); setShowCreate(false);
    onRefresh();
  };

  const savePassword = async () => {
    if (!pw1.trim() || pw1 !== pw2) return;
    await onChangePassword(pw1.trim());
    setPw1(""); setPw2(""); setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  const submitNewStudent = async () => {
    if (!newStudentName.trim()) return;
    await onAddStudent({ name: newStudentName.trim() });
    setNewStudentName("");
    onRefreshStudents();
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <GlobalAppStyles />
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="display-font text-2xl font-bold text-stone-900">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {currentTeacher && <button onClick={() => setShowMyAccount(true)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">My Account</button>}
            <button onClick={onLogout} className="text-xs font-semibold text-stone-400 hover:text-red-500">Log out</button>
          </div>
        </div>
        <p className="text-stone-500 text-sm mb-6">Every class in the school. Tap one to open it with full access.</p>

        <div className="bg-white border border-teal-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-stone-800 mb-1">Today across every class</p>
          <p className="text-xs text-stone-400 mb-3">Everything logged anywhere, for one date — you don't need to open each class to see it.</p>
          <input type="date" value={overviewDate} onChange={(e) => { setOverviewDate(e.target.value); loadOverview(e.target.value); }}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm mb-3 bg-white" />

          {overviewLoading && <p className="text-xs text-stone-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Checking every class...</p>}

          {overviewData && !overviewLoading && (
            <>
              <p className="text-xs font-semibold text-teal-700 uppercase mt-2 mb-1.5">Events</p>
              {overviewData.events.length === 0 && <p className="text-xs text-stone-400 mb-2">Nothing logged for this date.</p>}
              <ul className="space-y-1.5 mb-3">
                {overviewData.events.map((e) => {
                  const cat = EVENT_CATEGORIES.find((c) => c.id === e.category) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
                  return (
                    <li key={`${e.sourceClassName}-${e.id}`} className="text-xs bg-teal-50 border border-teal-100 rounded-lg px-2 py-1.5">
                      <span className="font-semibold text-teal-800">{e.sourceClassName}</span>
                      <span className="text-stone-500"> · {cat.icon} {e.title}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs font-semibold text-rose-700 uppercase mt-2 mb-1.5">Incidents</p>
              {overviewData.incidents.length === 0 && <p className="text-xs text-stone-400">None logged for this date.</p>}
              <ul className="space-y-1.5">
                {overviewData.incidents.map((i) => (
                  <li key={`${i.sourceClassName}-${i.id}`}
                    className={`text-xs rounded-lg px-2 py-1.5 ${i.flaggedForAdmin ? "bg-rose-100 border-2 border-rose-400" : "bg-rose-50 border border-rose-100"}`}>
                    {i.flaggedForAdmin && <Flag size={12} className="inline text-rose-600 fill-rose-600 mr-1 -mt-0.5" />}
                    <span className="font-semibold text-rose-900">{i.sourceClassName}</span>
                    <span className="text-stone-500"> · {i.categoryLabel}</span>
                    {(i.studentIds || []).length > 0 && (
                      <span> · {i.studentIds.map((sid, idx) => (
                        <button key={sid} onClick={() => openStudentHistory(sid)} className="font-semibold text-rose-700 underline hover:text-rose-900">
                          {i.studentNames[idx] || "Student"}{idx < i.studentIds.length - 1 ? ", " : ""}
                        </button>
                      ))}</span>
                    )}
                    {i.description && <p className="text-stone-600 mt-0.5">{i.description}</p>}
                    {i.loggedBy && <p className="text-stone-400 mt-0.5">Logged by {i.loggedBy}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {studentHistoryId && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setStudentHistoryId(null)}>
            <div className="bg-white rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-stone-800">
                  {(globalStudents || []).find((s) => s.id === studentHistoryId)?.name || "Student"} — across classes
                </p>
                <button onClick={() => setStudentHistoryId(null)} className="text-xs text-stone-400 hover:text-stone-700">Close</button>
              </div>
              {studentHistoryLoading && <p className="text-xs text-stone-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Checking every class...</p>}
              {studentHistoryData && !studentHistoryLoading && (
                <>
                  <p className="text-xs text-stone-500 mb-3">Enrolled in: {studentHistoryData.classes.map((c) => c.className).join(", ") || "no classes found"}</p>
                  <p className="text-xs font-semibold text-stone-500 uppercase mb-1.5">Incidents, all classes</p>
                  {studentHistoryData.incidents.length === 0 && <p className="text-xs text-stone-400">None logged anywhere.</p>}
                  <ul className="space-y-1.5">
                    {studentHistoryData.incidents.map((i) => (
                      <li key={i.id} className="text-xs bg-stone-50 border border-stone-100 rounded-lg px-2 py-1.5">
                        {i.flaggedForAdmin && <Flag size={12} className="inline text-rose-600 fill-rose-600 mr-1 -mt-0.5" />}
                        <span className="font-semibold text-stone-800">{i.sourceClassName}</span>
                        <span className="text-stone-500"> · {i.date} · {i.categoryLabel}</span>
                        {i.description && <p className="text-stone-600 mt-0.5">{i.description}</p>}
                        {i.loggedBy && <p className="text-stone-400 mt-0.5">Logged by {i.loggedBy}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {activeClasses.length === 0 && <p className="text-stone-400 text-sm text-center py-10 bg-white rounded-xl border border-stone-200">No classes yet.</p>}
        <ul className="space-y-2 mb-6">
          {activeClasses.map((cls) => (
            <li key={cls.id}>
              <button onClick={() => onEnterClass(cls)} className="w-full text-left bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-semibold text-stone-800 hover:border-teal-300 flex items-center justify-between">
                {cls.name}
                <ArrowRight size={14} className="text-stone-300" />
              </button>
            </li>
          ))}
        </ul>

        {archivedClasses.length > 0 && (
          <div className="mb-6">
            <button onClick={() => setShowArchivedClasses((v) => !v)} className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1">
              {showArchivedClasses ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showArchivedClasses ? "Hide" : "Show"} archived classes ({archivedClasses.length})
            </button>
            {showArchivedClasses && (
              <ul className="space-y-2 mt-2">
                {archivedClasses.map((cls) => (
                  <li key={cls.id} className="flex items-center justify-between bg-stone-100 rounded-xl px-4 py-3">
                    <span className="text-sm text-stone-500">{cls.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onRestore(cls.id)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Restore</button>
                      <ConfirmDelete onConfirm={() => onDeleteClass(cls.id)} size={13} label="Delete forever" confirmText="Really delete forever?" className="text-xs text-stone-400 hover:text-red-500" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showCreate ? (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-800 mb-3">Create a new class</p>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Class name" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Set a password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={submitCreate} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Create class</button>
              <button onClick={() => setShowCreate(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="w-full text-xs font-semibold text-teal-700 flex items-center justify-center gap-1.5 py-2 border border-dashed border-teal-300 rounded-xl">
            <Plus size={12} /> Create a new class
          </button>
        )}

        <p className="text-[10px] text-stone-400 text-center mt-6 leading-relaxed">
          Entering a class here gives full access to that class's data, same as its teacher sees — this is a soft admin gate, not enforced security.
        </p>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">Export data</p>
          <p className="text-xs text-stone-400 mb-3">Build a custom Excel report — pick who to include and what to include, and it downloads as one file with a sheet per type of data.</p>
          {!showExportPanel ? (
            <button onClick={() => setShowExportPanel(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Build an export
            </button>
          ) : (
            <ExportPanel classes={activeClasses} globalStudents={globalStudents} onExport={handleExport} onCancel={() => setShowExportPanel(false)} />
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">School-wide students</p>
          <p className="text-xs text-stone-400 mb-3">Create students once here — teachers will be able to pull existing students into their own class instead of re-creating them. (Assigning students to classes is coming next; for now, this is where the shared list itself lives.)</p>

          <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search students..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />

          <div className="flex gap-2 mb-3">
            <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewStudent()}
              placeholder="Add a new student's name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            <button onClick={submitNewStudent} className="bg-teal-700 text-white rounded-lg px-3 py-1.5 flex items-center justify-center hover:bg-teal-800"><Plus size={16} /></button>
          </div>

          {!showBulkImport ? (
            <button onClick={() => setShowBulkImport(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Import students from a file
            </button>
          ) : (
            <BulkImportPanel onImport={onBulkAddStudents} onCancel={() => setShowBulkImport(false)} />
          )}

          {activeStudents.length === 0 && <p className="text-xs text-stone-400 mb-2">{studentSearch ? "No students match." : "No students yet — add one above."}</p>}
          <div className="space-y-2 mb-4">
            {activeStudents.map((s) => (
              <button key={s.id} onClick={() => openStudentProfile(s)} className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 flex items-center gap-2 text-left hover:border-teal-300">
                <span className="flex-1 text-sm font-semibold text-stone-800">{s.name}</span>
                {(studentClassMap[s.id] || []).length > 0 ? (
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full whitespace-nowrap">{studentClassMap[s.id].join(", ")}</span>
                ) : (
                  <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full whitespace-nowrap">Not in a class yet</span>
                )}
                <ChevronRight size={16} className="text-stone-300 shrink-0" />
              </button>
            ))}
          </div>

          {archivedStudents.length > 0 && (
            <div className="mb-2">
              <button onClick={() => setShowArchivedStudents((v) => !v)} className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2">
                {showArchivedStudents ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showArchivedStudents ? "Hide" : "Show"} archived students ({archivedStudents.length})
              </button>
              {showArchivedStudents && (
                <ul className="space-y-2">
                  {archivedStudents.map((s) => (
                    <li key={s.id} className="flex items-center justify-between bg-stone-100 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-stone-500">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => onRestoreStudent(s.id)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Restore</button>
                        <ConfirmDelete onConfirm={() => onDeleteStudent(s.id)} size={13} label="Delete forever" confirmText="Really delete forever?" className="text-xs text-stone-400 hover:text-red-500" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">School calendar</p>
          <p className="text-xs text-stone-400 mb-3">Create an event once — it shows up automatically on every calendar you choose, and editing it here updates everywhere at once.</p>

          {!showEventForm && (
            <button onClick={() => { setEditingEventId(null); setShowEventForm(true); }} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Add school event
            </button>
          )}

          {showEventForm && (
            <SchoolEventForm classes={activeClasses} existing={(schoolEvents || []).find((e) => e.id === editingEventId)}
              onSave={async (fields) => {
                if (editingEventId) await onUpdateEvent(editingEventId, fields);
                else await onAddEvent(fields);
                setShowEventForm(false); setEditingEventId(null);
              }}
              onCancel={() => { setShowEventForm(false); setEditingEventId(null); }} />
          )}

          {(schoolEvents || []).length === 0 && !showEventForm && <p className="text-xs text-stone-400">No school-wide events yet.</p>}
          <ul className="space-y-2">
            {(schoolEvents || []).sort((a, b) => (a.date < b.date ? -1 : 1)).map((ev) => {
              const cat = EVENT_CATEGORIES.find((c) => c.id === ev.category) || EVENT_CATEGORIES[0];
              const appliesLabel = ev.appliesTo === "all" ? "All classes" : `${(ev.appliesTo || []).length} class(es)`;
              return (
                <li key={ev.id} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-800">{cat.icon} {ev.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setEditingEventId(ev.id); setShowEventForm(true); }} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Edit</button>
                      <ConfirmDelete onConfirm={() => onRemoveEvent(ev.id)} size={13} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{ev.date}{ev.time ? ` · ${formatTime12h(ev.time)}` : ""} · {appliesLabel}{ev.location ? ` · ${ev.location}` : ""}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">Teaching Tools</p>
          <p className="text-xs text-stone-400 mb-3">Outside tools and shared files every class can reach from their own Tools tab — add one here and it shows up for everyone, the same list for every class.</p>

          {!showToolForm && (
            <button onClick={() => { setEditingToolId(null); setShowToolForm(true); }} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Add tool or resource
            </button>
          )}

          {showToolForm && (
            <SchoolToolForm existing={(schoolTools || []).find((t) => t.id === editingToolId)}
              onSave={async (fields) => {
                if (editingToolId) await onUpdateTool(editingToolId, fields);
                else await onAddTool(fields);
                setShowToolForm(false); setEditingToolId(null);
              }}
              onCancel={() => { setShowToolForm(false); setEditingToolId(null); }} />
          )}

          {(schoolTools || []).length === 0 && !showToolForm && <p className="text-xs text-stone-400">Nothing added yet.</p>}
          <ul className="space-y-2">
            {(schoolTools || []).map((t) => (
              <li key={t.id} className="bg-white border border-stone-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-stone-800">{t.category === "resource" ? "📁" : "🔗"} {t.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setEditingToolId(t.id); setShowToolForm(true); }} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Edit</button>
                    <ConfirmDelete onConfirm={() => onRemoveTool(t.id)} size={13} />
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-0.5 break-all">{t.description ? `${t.description} · ` : ""}{t.url}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">Shared programs</p>
          <p className="text-xs text-stone-400 mb-3">For school-wide things like a memorization program — pick which classes are part of it, and any teacher from those classes can log points and run raffles together in one shared space, separate from their own class's regular points.</p>

          {!showProgramForm && (
            <button onClick={() => setShowProgramForm(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Create program
            </button>
          )}
          {showProgramForm && (
            <ProgramForm classes={activeClasses}
              onSave={async (name, memberClassIds) => { await onAddProgram(name, memberClassIds); setShowProgramForm(false); }}
              onCancel={() => setShowProgramForm(false)} />
          )}

          {(programs || []).length === 0 && !showProgramForm && <p className="text-xs text-stone-400">No shared programs yet.</p>}
          <ul className="space-y-2">
            {(programs || []).map((p) => {
              const memberNames = (p.memberClassIds || []).map((cid) => activeClasses.find((c) => c.id === cid)?.name).filter(Boolean);
              return (
                <li key={p.id} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => openProgramAdmin(p.id)} className="text-sm font-semibold text-stone-800 hover:text-teal-700 text-left flex-1">{p.name}</button>
                    <ConfirmDelete onConfirm={() => onRemoveProgram(p.id)} size={13} />
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{memberNames.join(", ") || "No classes assigned"}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <p className="text-sm font-semibold text-stone-800 mb-1">Teacher accounts</p>
          <p className="text-xs text-stone-400 mb-3">Each teacher signs in with their own email and password, and only sees the classes assigned to them here.</p>

          {!showTeacherForm && (
            <button onClick={() => setShowTeacherForm(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Create teacher account
            </button>
          )}

          {showTeacherForm && (
            <TeacherAccountForm classes={activeClasses}
              onSave={async (name, email, tempPassword, role, classIds, isSubstitute) => {
                const result = await onCreateTeacher(name, email, tempPassword, role, classIds, isSubstitute);
                if (result.ok) setShowTeacherForm(false);
                return result;
              }} onCancel={() => setShowTeacherForm(false)} />
          )}

          {activeTeachers.length === 0 && !showTeacherForm && <p className="text-xs text-stone-400">No teacher accounts yet.</p>}
          <ul className="space-y-2">
            {activeTeachers.map((t) => {
              const classNames = (t.assignedClassIds || []).map((cid) => activeClasses.find((c) => c.id === cid)?.name).filter(Boolean);
              const isEditing = editingTeacherUid === t.uid;
              return (
                <li key={t.uid} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{t.name}</span>
                      <span className="text-xs text-stone-400 ml-2">{t.role === "admin" ? "Admin" : "Teacher"}{t.isSubstitute ? " · Substitute" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {t.role === "teacher" && (
                        <button onClick={() => setEditingTeacherUid(isEditing ? null : t.uid)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                          {isEditing ? "Cancel" : "Edit classes"}
                        </button>
                      )}
                      <ArchiveOrDeleteMenu onArchive={() => onDeactivateTeacher(t.uid)} onDeletePermanently={() => onDeleteTeacher(t.uid)} size={14} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{t.email}{classNames.length > 0 ? ` · ${classNames.join(", ")}` : t.role === "teacher" ? " · No classes assigned yet" : ""}</p>

                  {isEditing && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <p className="text-[10px] text-stone-400 mb-1.5">Tap to assign or unassign — changes save immediately.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeClasses.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
                        {activeClasses.map((c) => {
                          const assigned = (t.assignedClassIds || []).includes(c.id);
                          return (
                            <button key={c.id}
                              onClick={() => {
                                const next = assigned ? (t.assignedClassIds || []).filter((id) => id !== c.id) : [...(t.assignedClassIds || []), c.id];
                                onUpdateTeacher(t.uid, { assignedClassIds: next });
                              }}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${assigned ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {inactiveTeachers.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowArchivedTeachers((v) => !v)} className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2">
                {showArchivedTeachers ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showArchivedTeachers ? "Hide" : "Show"} archived teachers ({inactiveTeachers.length})
              </button>
              {showArchivedTeachers && (
                <ul className="space-y-2">
                  {inactiveTeachers.map((t) => (
                    <li key={t.uid} className="flex items-center justify-between bg-stone-100 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-stone-500">{t.name} — {t.email}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => onUpdateTeacher(t.uid, { active: true })} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Restore</button>
                        <ConfirmDelete onConfirm={() => onDeleteTeacher(t.uid)} size={13} label="Delete forever" confirmText="Really delete forever?" className="text-xs text-stone-400 hover:text-red-500" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-stone-200">
          {!showPwChange ? (
            <button onClick={() => setShowPwChange(true)} className="w-full text-xs font-semibold text-stone-500 hover:text-teal-700 text-center">
              Change admin password
            </button>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-stone-800 mb-3">Change admin password</p>
              <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
              {pw1 && pw2 && pw1 !== pw2 && <p className="text-xs text-red-500 mb-2">Passwords don't match.</p>}
              {pwSaved && <p className="text-xs text-emerald-600 mb-2">Password updated.</p>}
              <div className="flex gap-2">
                <button onClick={savePassword} disabled={!pw1.trim() || pw1 !== pw2} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">Update password</button>
                <button onClick={() => setShowPwChange(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {profileStudent && (
        <AdminStudentProfile student={profileStudent} profileData={profileData}
          onUpdateStudent={onUpdateStudent}
          onArchiveStudent={(id) => { onArchiveStudent(id); setProfileStudent(null); }}
          onDeleteStudent={(id) => { onDeleteStudent(id); setProfileStudent(null); }}
          onClose={() => setProfileStudent(null)} />
      )}

      {openProgramId && (
        <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
          <div className="app-page-wide">
            {!programDetail ? (
              <p className="text-sm text-stone-400 mt-10 text-center">Loading...</p>
            ) : (
              <PointsView
                roster={programDetail.roster}
                studentData={Object.fromEntries(programDetail.roster.map((s) => [s.id, { points: programDetail.pointsData[s.id] || {} }]))}
                classPoints={{}} config={programDetail.config}
                addPoints={addPointsInProgram} addClassPoints={() => {}} resetClassPoints={() => {}}
                onAddCategory={addCategoryInProgram} navigate={() => {}}
                plannerDays={{}} behaviorLogData={{}} adjustBehaviorMark={() => {}}
                programMode programName={(programs || []).find((p) => p.id === openProgramId)?.name || "Program"}
                onBackFromProgram={closeProgramAdmin} backLabel="Back to Admin Dashboard"
                programs={[]} onOpenProgram={() => {}} />
            )}
          </div>
        </div>
      )}

      {showMyAccount && currentTeacher && (
        <MyAccountPanel teacher={currentTeacher} onUpdateName={onChangeMyName} onChangePassword={onChangeMyPassword} onClose={() => setShowMyAccount(false)} />
      )}
    </div>
  );
}

function TeacherSignInScreen({ onSignIn, onUseLegacyFlow, onEnterSubstitute }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [showSubEntry, setShowSubEntry] = useState(false);
  const [subCode, setSubCode] = useState("");
  const [subError, setSubError] = useState("");

  const trySignIn = async () => {
    if (!email.trim() || !password) return;
    setError("");
    setSigningIn(true);
    const result = await onSignIn(email.trim(), password);
    setSigningIn(false);
    if (!result.ok) setError(result.error);
  };

  const trySubEntry = async () => {
    if (!subCode.trim()) return;
    const result = await onEnterSubstitute(subCode);
    if (!result.ok) setSubError("That code doesn't match a class. Double-check with the teacher.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #f6f2e9 0%, #fbf8f1 100%)" }}>
      <GlobalAppStyles />
      <div className="max-w-sm w-full">
        <img src="/logo-transparent.png" alt="Classroom Tracker" className="w-48 mx-auto mb-5" />
        <h1 className="display-font text-2xl font-bold text-stone-900 text-center mb-1">Welcome back</h1>
        <p className="text-stone-500 text-sm text-center mb-7">Sign in with your teacher account</p>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 shadow-sm">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Email" autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2.5 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Password" className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-3 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
          <button onClick={trySignIn} disabled={signingIn} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className="text-[10px] text-stone-400 text-center leading-relaxed">
          Don't have an account yet? Ask your admin to create one for you.
        </p>

        <div className="mt-6 pt-4 border-t border-stone-200">
          <button onClick={onUseLegacyFlow} className="w-full text-xs font-semibold text-stone-400 hover:text-teal-700 text-center">
            Use class password instead
          </button>
          {!showSubEntry ? (
            <button onClick={() => setShowSubEntry(true)} className="w-full text-xs font-semibold text-stone-400 hover:text-teal-700 text-center mt-2">
              Enter as a substitute
            </button>
          ) : (
            <div className="mt-3 bg-white border border-stone-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-700 mb-2">Substitute code</p>
              <input value={subCode} onChange={(e) => setSubCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySubEntry()}
                placeholder="Code from the teacher" autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2 uppercase" />
              {subError && <p className="text-xs text-rose-600 mb-2">{subError}</p>}
              <button onClick={trySubEntry} className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Enter</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherClassPicker({ teacherName, classes, onSelect, onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #f6f2e9 0%, #fbf8f1 100%)" }}>
      <GlobalAppStyles />
      <div className="max-w-sm w-full">
        <img src="/logo-transparent.png" alt="Classroom Tracker" className="w-48 mx-auto mb-5" />
        <h1 className="display-font text-2xl font-bold text-stone-900 text-center mb-1">Welcome, {teacherName}</h1>
        <p className="text-stone-500 text-sm text-center mb-7">Choose a class to continue</p>

        {classes.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-sm text-stone-500">No classes are assigned to you yet — ask your admin to assign you to one.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => onSelect(cls)}
                className="hover-lift w-full text-left bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-stone-800 hover:border-teal-300 shadow-sm">
                {cls.name}
              </button>
            ))}
          </div>
        )}

        <button onClick={onSignOut} className="w-full text-xs font-semibold text-stone-400 hover:text-teal-700 text-center mt-4">
          Sign out
        </button>
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #f6f2e9 0%, #fbf8f1 100%)" }}>
      <GlobalAppStyles />
      <div className="max-w-sm w-full">
        <img src="/logo-transparent.png" alt="Classroom Tracker" className="w-48 mx-auto mb-5" />
        <h1 className="display-font text-2xl font-bold text-stone-900 text-center mb-1">Classroom Tracker</h1>
        <p className="text-stone-500 text-sm text-center mb-7">Select your class to continue</p>

        {!showCreate && registry.filter((c) => !c.archived).length > 0 && (
          <div className="space-y-2 mb-4">
            {registry.filter((c) => !c.archived).map((cls) => (
              <button key={cls.id} onClick={() => { setPendingClass(cls); setError(""); setPwInput(""); }}
                className={`hover-lift w-full text-left bg-white border rounded-2xl px-4 py-3.5 text-sm font-semibold text-stone-800 hover:border-teal-300 shadow-sm ${pendingClass?.id === cls.id ? "border-teal-500" : "border-stone-200"}`}>
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {pendingClass && !showCreate && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-800 mb-2">Password for {pendingClass.name}</p>
            <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Class password" />
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button onClick={tryUnlock} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">Enter</button>
          </div>
        )}

        {showCreate ? (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-stone-800 mb-3">{registry.length === 0 ? "Create the first class" : "Create a new class"}</p>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Class name (e.g. Grade 1)" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Set a password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={submitCreate} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Create class</button>
              {registry.length > 0 && <button onClick={() => setShowCreate(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>}
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowCreate(true); setPendingClass(null); }} className="w-full text-xs font-semibold text-teal-700 flex items-center justify-center gap-1.5 mt-2 py-2">
            <Plus size={12} /> Create a new class
          </button>
        )}

        <p className="text-[10px] text-stone-400 text-center mt-6 leading-relaxed">
          This password is a simple gate to keep classes organized — it isn't real security. Don't rely on it to protect sensitive information from someone determined to bypass it.
        </p>

        <div className="mt-6 pt-4 border-t border-stone-200">
          {!showAdminLogin ? (
            <button onClick={() => setShowAdminLogin(true)} className="w-full text-xs font-semibold text-stone-400 hover:text-teal-700 text-center">
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

function ClassApp({ classId, className, onSwitchClass, switchLabel, onRenameClass, onChangePassword, onArchiveClass, onDeleteClass, loggedInTeacher, onChangeMyPassword, onChangeMyName, isSubstituteSession, subCode, onGenerateSubCode, onClearSubCode }) {
  const loggedByName = loggedInTeacher?.name || null;
  // Only stamps a record when someone is actually signed in with a real account — the legacy
  // class-password flow has no real identity to attribute anything to, so records made that
  // way simply go unstamped rather than being labeled with something misleading.
  const withLogger = (obj) => (loggedByName ? { ...obj, loggedBy: loggedByName } : obj);
  const loadC = useCallback((key, fallback) => loadJSON(`class:${classId}:${key}`, fallback, true), [classId]);
  const saveC = useCallback((key, value) => saveJSON(`class:${classId}:${key}`, value, true), [classId]);

  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [studentData, setStudentData] = useState({});
  const [globalStudents, setGlobalStudentsInClass] = useState([]);
  const [schoolEvents, setSchoolEventsInClass] = useState([]);
  const [schoolTools, setSchoolToolsInClass] = useState([]);
  const [programsInClass, setProgramsInClass] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [classAssessments, setClassAssessments] = useState([]);
  const [classPoints, setClassPoints] = useState({});
  const [monthlyReportState, setMonthlyReportState] = useState({ dismissedMonth: null });
  const [reflections, setReflections] = useState([]);
  const [reflectionState, setReflectionState] = useState({ dismissedMonth: null });
  const [birthdayDismissals, setBirthdayDismissals] = useState({});
  const [plannerDays, setPlannerDays] = useState({});
  const [plannerEvents, setPlannerEvents] = useState([]);
  const [benchmarkSubjects, setBenchmarkSubjects] = useState([]);
  const [segmentCelebrationDismissals, setSegmentCelebrationDismissals] = useState({}); // segmentId -> true, once dismissed
  const [behaviorLogData, setBehaviorLogData] = useState({});
  const [randomPickerData, setRandomPickerData] = useState({ bag: [], lastPickedId: null });
  const [alerts, setAlerts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [view, setView] = useState("home");
  const [showPlan, setShowPlan] = useState(false);
  const [showMyAccount, setShowMyAccount] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const viewportHeight = useVisualViewportHeight();
  const [openProgramId, setOpenProgramId] = useState(null);
  const [programRoster, setProgramRoster] = useState([]);
  const [programConfig, setProgramConfig] = useState({ points: { categories: [] } });
  const [programPointsData, setProgramPointsData] = useState({});
  const [currentId, setCurrentId] = useState(null);
  const [sessionCat, setSessionCat] = useState(null);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [classSessionQueue, setClassSessionQueue] = useState(null); // null = not in a whole-class session
  const [classSessionPos, setClassSessionPos] = useState(0);
  const [classSessionDate, setClassSessionDate] = useState(null);
  const [incidentPreset, setIncidentPreset] = useState(null);
  const [incidentReturn, setIncidentReturn] = useState("home");
  const [periodAttPreset, setPeriodAttPreset] = useState(null);
  const [periodAttReturn, setPeriodAttReturn] = useState("home");
  const [messageFlag, setMessageFlag] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedFluencyEntry, setSelectedFluencyEntry] = useState(null);
  const [initialAssessmentStudentId, setInitialAssessmentStudentId] = useState(null); // auto-opens a student's modal in the Assessments grid when navigating in from elsewhere
  const [detailReturnView, setDetailReturnView] = useState("detail"); // fluency-detail/skill-detail are reachable from both StudentDetailView and the Assessments grid modal — this tracks which one "Back" should return to
  const [reportSections, setReportSections] = useState([]); // which sections were chosen for the current student's print/export report
  const [selectedSkillCat, setSelectedSkillCat] = useState(null);
  const [selectedSkillReportCat, setSelectedSkillReportCat] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedReflectionMonth, setSelectedReflectionMonth] = useState(null);
  const [celebratingSegment, setCelebratingSegment] = useState(null); // { subjectLabel, segment } — which completed benchmark segment is being announced

  useEffect(() => {
    (async () => {
      const r = await loadC("roster", []);
      const c = await loadC("config", DEFAULT_CONFIG);
      const inc = await loadC("incidents", []);
      const ca = await loadC("classAssessments", []);
      const cp = await loadC("classPoints", {});
      const mrs = await loadC("monthlyReportState", { dismissedMonth: null });
      const refl = await loadC("reflections", []);
      const rs = await loadC("reflectionState", { dismissedMonth: null });
      const bd = await loadC("birthdayDismissals", {});
      const pd = await loadC("plannerDays", {});
      const pe = await loadC("plannerEvents", []);
      const bs = await loadC("benchmarkSubjects", []);
      const scd = await loadC("segmentCelebrationDismissals", {});
      const bl = await loadC("behaviorLogData", {});
      const rp = await loadC("randomPickerData", { bag: [], lastPickedId: null });
      const al = await loadC("alerts", []);
      const gs = await loadJSON("globalStudents", [], true);
      setGlobalStudentsInClass(gs);
      const se = await loadJSON("schoolEvents", [], true);
      setSchoolEventsInClass(se);
      const st = await loadJSON("schoolTools", DEFAULT_SCHOOL_TOOLS, true);
      setSchoolToolsInClass(st);
      const progs = await loadJSON("programs", [], true);
      setProgramsInClass(progs.filter((p) => (p.memberClassIds || []).includes(classId)));

      let finalRoster = r, finalConfig = c, finalIncidents = inc, finalCA = ca, finalCP = cp, finalPD = pd, finalPE = pe, finalBS = bs;
      let sampleStudentData = null;
      // New classes now start completely empty by default — no more automatic sample data.
      // Teachers who want a sample roster/config to explore the app can still load one
      // on-demand from Settings ("Load sample data"), which calls the same buildSampleData()
      // function directly rather than this automatic first-load path.

      setRoster(finalRoster);
      const mergedPoints = { ...DEFAULT_CONFIG.points, ...(finalConfig.points || {}), behaviorLog: { ...DEFAULT_CONFIG.points.behaviorLog, ...((finalConfig.points || {}).behaviorLog || {}) } };
      let mergedPlanner = { ...DEFAULT_CONFIG.planner, ...(finalConfig.planner || {}) };
      // One-time migration: classes set up before named weekly schedules existed had one flat
      // fullDaySchedule used every day. Turn that into a named "Regular Schedule" assigned to
      // every weekday, so nothing already-built breaks — teachers can then customize per weekday.
      if ((!mergedPlanner.schedules || mergedPlanner.schedules.length === 0) && mergedPlanner.fullDaySchedule?.length > 0) {
        const migratedScheduleId = uid();
        mergedPlanner = {
          ...mergedPlanner,
          schedules: [{ id: migratedScheduleId, name: "Regular Schedule", periods: mergedPlanner.fullDaySchedule }],
          weekdaySchedule: { 1: migratedScheduleId, 2: migratedScheduleId, 3: migratedScheduleId, 4: migratedScheduleId, 5: migratedScheduleId },
        };
        saveC("config", { ...finalConfig, planner: mergedPlanner });
      }
      // Second, independent migration: fold the old separate fixed half-day schedule into the
      // same named-schedules system too, so "Half Day" becomes just another schedule assignable
      // to any weekday instead of its own mechanism. Not auto-assigned to a weekday, since there's
      // no reliable way to know which day(s) it was actually used for — that's a quick manual
      // step for the teacher (Settings → Weekly schedules → assign it to Friday, or wherever).
      const halfDayAlreadyMigrated = (mergedPlanner.schedules || []).some((s) => s.name === "Half Day Schedule");
      if (!halfDayAlreadyMigrated && mergedPlanner.halfDaySchedule?.length > 0) {
        mergedPlanner = {
          ...mergedPlanner,
          schedules: [...(mergedPlanner.schedules || []), { id: uid(), name: "Half Day Schedule", periods: mergedPlanner.halfDaySchedule }],
        };
        saveC("config", { ...finalConfig, planner: mergedPlanner });
      }
      // Third migration: classes that already had benchmark subjects before the central Subjects
      // list existed get those same subject names folded into it automatically — nothing to
      // re-type, nothing lost. Idempotent (checks for an existing match first), so it's safe to
      // run on every load rather than needing a one-time flag.
      const existingSubjectLabels = new Set((finalConfig.subjects || []).map((s) => s.label.trim().toLowerCase()));
      const subjectsToAdd = (finalBS || [])
        .map((bs) => bs.label)
        .filter((label) => label && !existingSubjectLabels.has(label.trim().toLowerCase()))
        .filter((label, i, arr) => arr.findIndex((l) => l.trim().toLowerCase() === label.trim().toLowerCase()) === i) // de-dupe within benchmarks itself
        .map((label) => ({ id: uid(), label }));
      if (subjectsToAdd.length > 0) {
        finalConfig = { ...finalConfig, subjects: [...(finalConfig.subjects || []), ...subjectsToAdd] };
        saveC("config", finalConfig);
      }
      setConfig({ ...DEFAULT_CONFIG, ...finalConfig, points: mergedPoints, monthlyReports: finalConfig.monthlyReports || DEFAULT_CONFIG.monthlyReports, planner: mergedPlanner });
      setIncidents(finalIncidents);
      setClassAssessments(finalCA);
      setClassPoints(finalCP);
      setMonthlyReportState(mrs);
      setReflections(refl);
      setReflectionState(rs);
      setBirthdayDismissals(bd);
      setPlannerDays(finalPD);
      setPlannerEvents(finalPE);
      setBenchmarkSubjects(finalBS);
      setSegmentCelebrationDismissals(scd);
      setBehaviorLogData(bl);
      setRandomPickerData(rp);
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

  // One-time auto-trigger for the guided setup wizard — fires once real data has loaded (not on
  // the initial default config) and only if this teacher has never opened it before. Never fires
  // for an admin just browsing into the class — this is for the class's own teacher.
  useEffect(() => {
    if (!loading && !config.onboarding?.started && loggedInTeacher?.role !== "admin") {
      setShowOnboarding(true);
    }
  }, [loading]); // eslint-disable-line

  const persistConfig = (next) => { setConfig(next); saveC("config", next); };
  const persistStudent = (id, newData) => { setStudentData((prev) => ({ ...prev, [id]: newData })); saveC(`kriya:${id}`, newData); };
  const persistIncidents = (next) => { setIncidents(next); saveC("incidents", next); };
  const persistClassAssessments = (next) => { setClassAssessments(next); saveC("classAssessments", next); };
  const persistClassPoints = (next) => { setClassPoints(next); saveC("classPoints", next); };
  const persistMonthlyReportState = (next) => { setMonthlyReportState(next); saveC("monthlyReportState", next); };
  const persistReflectionState = (next) => { setReflectionState(next); saveC("reflectionState", next); };

  const dismissBirthday = (studentId, hebYear, action, snoozeUntil) => {
    const key = `${studentId}-${hebYear}`;
    const next = { ...birthdayDismissals, [key]: { action, snoozeUntil: snoozeUntil || null } };
    setBirthdayDismissals(next);
    saveC("birthdayDismissals", next);
  };

  const createBirthdayEvent = (studentId, studentName, date, hebYear) => {
    addPlannerEvent({ date, title: `${studentName}'s Birthday`, category: "birthday", reminderLeadDays: 0 });
    dismissBirthday(studentId, hebYear, "created");
  };
  const saveReflection = (entry) => {
    const monthKey = entry.monthKey;
    const without = reflections.filter((r) => r.monthKey !== monthKey); // one reflection per month — editing replaces, doesn't duplicate
    const next = [...without, withLogger({ id: uid(), ...entry })];
    setReflections(next);
    saveC("reflections", next);
  };
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
  // Every subject from Settings now shows a Planner row automatically — there's no longer a
  // separate "create the benchmark subject" step first. The first time a segment is added for a
  // subject that doesn't have a benchmarkSubjects entry yet, this creates it and adds the segment
  // in the same update, rather than requiring it to already exist.
  const addBenchmarkSegmentBySubjectLabel = (label, segment) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;
    const existing = benchmarkSubjects.find((s) => s.label.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      persistBenchmarkSubjects(benchmarkSubjects.map((s) => s.id === existing.id ? { ...s, segments: [...s.segments, { id: uid(), ...segment }] } : s));
    } else {
      persistBenchmarkSubjects([...benchmarkSubjects, { id: uid(), label: trimmed, segments: [{ id: uid(), ...segment }] }]);
    }
  };
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
  const toggleSubjectHiddenFromPlanner = (subjectId) => {
    persistConfig({ ...config, subjects: config.subjects.map((s) => s.id === subjectId ? { ...s, hiddenFromPlanner: !s.hiddenFromPlanner } : s) });
  };

  const dismissSegmentCelebration = (segmentId) => {
    const next = { ...segmentCelebrationDismissals, [segmentId]: true };
    setSegmentCelebrationDismissals(next);
    saveC("segmentCelebrationDismissals", next);
  };

  const persistBehaviorLogData = (next) => { setBehaviorLogData(next); saveC("behaviorLogData", next); };

  const persistRandomPickerData = (next) => { setRandomPickerData(next); saveC("randomPickerData", next); };
  const recordRandomPick = (studentId, newBag) => {
    persistRandomPickerData({ bag: newBag, lastPickedId: studentId });
  };
  const resetRandomPicker = () => persistRandomPickerData({ bag: [], lastPickedId: null });
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
    const existingSchedules = config.planner?.schedules || [];
    let samplePlanner = { ...config.planner };
    if (existingSchedules.length === 0) {
      const sampleScheduleId = uid();
      samplePlanner = {
        ...samplePlanner,
        schedules: [{ id: sampleScheduleId, name: "Regular Schedule", periods: sample.sampleSchedule }],
        weekdaySchedule: { 1: sampleScheduleId, 2: sampleScheduleId, 3: sampleScheduleId, 4: sampleScheduleId, 5: sampleScheduleId },
      };
    }
    persistConfig({
      ...config,
      categories: config.categories.map((cat) => (cat.id === "lname" ? { ...cat, active: true } : cat)),
      points: { ...config.points, categories: [...(config.points.categories || []), sample.pointsCategory] },
      planner: samplePlanner,
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

  const addStudent = async (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const id = uid();
    persistRoster([...roster, { id, name: trimmed, parentEmail: "", parentPhone: "", notes: "", enrollmentScope: "full-time" }]);
    setStudentData((prev) => ({ ...prev, [id]: emptyStudentData() }));
    // New students are shared school-wide by default from here on, so any teacher can find and add them later.
    const gs = await loadJSON("globalStudents", [], true);
    const globalRecord = { id, name: trimmed, parent1Name: "", parentEmail: "", parentPhone: "", parent2Name: "", parent2Email: "", parent2Phone: "", homeAddress: "", notes: "" };
    const nextGs = [...gs, globalRecord];
    await saveJSON("globalStudents", nextGs, true);
    setGlobalStudentsInClass(nextGs);
  };

  const refreshGlobalStudentsInClass = async () => {
    const gs = await loadJSON("globalStudents", [], true);
    setGlobalStudentsInClass(gs);
  };

  const addExistingStudent = (globalStudent, scope, periodIds) => {
    if (roster.some((s) => s.id === globalStudent.id)) return; // already in this class
    const rosterEntry = {
      id: globalStudent.id, name: globalStudent.name,
      parentEmail: globalStudent.parentEmail || "", parentPhone: globalStudent.parentPhone || "",
      parent1Name: globalStudent.parent1Name || "", parent2Name: globalStudent.parent2Name || "",
      parent2Email: globalStudent.parent2Email || "", parent2Phone: globalStudent.parent2Phone || "",
      homeAddress: globalStudent.homeAddress || "", notes: globalStudent.notes || "",
      linkedGlobalId: globalStudent.id,
      enrollmentScope: scope, // "full-time" | "part-time" | "periods"
      enrollmentPeriodIds: scope === "periods" ? periodIds : [],
    };
    persistRoster([...roster, rosterEntry]);
    setStudentData((prev) => ({ ...prev, [globalStudent.id]: emptyStudentData() }));
  };

  // Reads every class a student belongs to (including this one) and tags each entry with
  // where it came from. Nothing about how classes save their own data changes — this only
  // reads and labels, at view time, from the same shared storage every class already uses.
  const fetchCrossClassHistory = async (studentId) => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const results = { classes: [], incidents: [], periodAttendance: [], points: [], assessments: [] };
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      const enrolled = clsRoster.find((s) => s.id === studentId);
      if (!enrolled) continue;
      results.classes.push({ classId: cls.id, className: cls.name, scope: enrolled.enrollmentScope || "full-time" });

      const clsIncidents = await loadJSON(`class:${cls.id}:incidents`, [], true);
      const clsConfig = await loadJSON(`class:${cls.id}:config`, DEFAULT_CONFIG, true);
      const catMap = {};
      (clsConfig.incidents?.categories || []).forEach((c) => (catMap[c.id] = c.label));
      clsIncidents.filter((i) => i.studentIds?.includes(studentId)).forEach((i) => {
        results.incidents.push({ ...i, sourceClassName: cls.name, categoryLabel: catMap[i.category] || i.category || "Uncategorized" });
      });

      const clsStudentData = await loadJSON(`class:${cls.id}:kriya:${studentId}`, emptyStudentData(), true);
      (clsStudentData.periodAttendance || []).forEach((pa) => {
        const typeLabel = (clsConfig.periodAttendance?.types || []).find((t) => t.id === pa.typeId)?.label || pa.typeId;
        results.periodAttendance.push({ ...pa, sourceClassName: cls.name, typeLabel });
      });

      const individualPointCats = (clsConfig.points?.categories || []).filter((c) => c.scope === "individual");
      individualPointCats.forEach((cat) => {
        const value = clsStudentData.points?.[cat.id] || 0;
        if (value > 0) results.points.push({ sourceClassName: cls.name, categoryLabel: cat.label, value, threshold: cat.threshold || null });
      });

      const clsClassAssessments = await loadJSON(`class:${cls.id}:classAssessments`, [], true);
      const rows = buildUnifiedAssessmentRows({ id: studentId }, clsStudentData, clsClassAssessments, clsConfig);
      rows.forEach((r) => results.assessments.push({ ...r, sourceClassName: cls.name }));
    }
    results.incidents.sort((a, b) => (a.date < b.date ? 1 : -1));
    results.periodAttendance.sort((a, b) => (a.date < b.date ? 1 : -1));
    results.assessments.sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));
    return results;
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

  const gradeItem = useCallback((catId, itemId, result, dateOverride) => {
    const id = currentId;
    const data = studentData[id] || emptyStudentData();
    const key = skillKey(catId, itemId);
    const existing = data.skills[key] || { history: [] };
    const history = [...existing.history, withLogger({ date: dateOverride || todayISO(), result })];
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
  }, [currentId, config, studentData, roster, alerts, loggedByName]);

  const startClassSession = (catId, date) => {
    if (roster.length === 0) return;
    setClassSessionQueue(roster.map((s) => s.id));
    setClassSessionPos(0);
    setClassSessionDate(date || todayISO());
    setCurrentId(roster[0].id);
    setSessionCat(catId);
    setSessionIdx(0);
    setView("session");
  };

  const advanceClassSession = () => {
    const nextPos = classSessionPos + 1;
    if (!classSessionQueue || nextPos >= classSessionQueue.length) {
      // Whole class done — clear the queue and go see the results together.
      setClassSessionQueue(null);
      setClassSessionPos(0);
      setSelectedSkillReportCat(sessionCat);
      setView("skill-category-report");
      return;
    }
    setClassSessionPos(nextPos);
    setCurrentId(classSessionQueue[nextPos]);
    setSessionIdx(0);
    // stays on "session" view — just moves to the next student
  };

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
    const next = [withLogger({ id: uid(), ...entry }), ...incidents];
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
  const removeIncident = (incidentId) => {
    persistIncidents(incidents.filter((i) => i.id !== incidentId));
  };

  const addPeriodAttendance = (studentIds, entry) => {
    studentIds.forEach((sid) => {
      const data = studentData[sid] || emptyStudentData();
      const next = [withLogger({ id: uid(), ...entry }), ...(data.periodAttendance || [])];
      persistStudent(sid, { ...data, periodAttendance: next });
    });
  };
  const addClassAssessment = (entry) => persistClassAssessments([withLogger({ id: uid(), ...entry }), ...classAssessments]);
  const updateClassAssessmentResult = (assessmentId, studentId, value) => {
    persistClassAssessments(classAssessments.map((ca) => {
      if (ca.id !== assessmentId) return ca;
      const nextResults = { ...(ca.results || {}) };
      if (value === null) delete nextResults[studentId];
      else nextResults[studentId] = value;
      return { ...ca, results: nextResults };
    }));
  };

  const setAttendance = (studentId, date, statusId) => {
    const data = studentData[studentId];
    const without = (data.attendance || []).filter((a) => a.date !== date);
    const prevEntry = (data.attendance || []).find((a) => a.date === date);
    const isLate = config.attendance.statuses.find((st) => st.id === statusId)?.flagType === "late";
    const defaultTime = isLate && !prevEntry?.time ? new Date().toTimeString().slice(0, 5) : (prevEntry?.time || "");
    const newData = { ...data, attendance: [...without, withLogger({ date, status: statusId, time: defaultTime })] };
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

  const setHomework = (studentId, date, status) => {
    const data = studentData[studentId];
    const without = (data.homework || []).filter((h) => h.date !== date);
    const newData = { ...data, homework: [...without, withLogger({ date, status })] };
    persistStudent(studentId, newData);
    const flags = getFlags(newData, studentId, incidents, config);
    const hwFlag = flags.find((f) => f.type === "homework");
    if (hwFlag) {
      const studentName = roster.find((s) => s.id === studentId)?.name || "Student";
      upsertAlert(studentId, "homework-missed", `${studentName} — ${hwFlag.label}`);
    }
  };

  const markNoHomeworkToday = (date) => {
    roster.forEach((s) => {
      const data = studentData[s.id] || emptyStudentData();
      const without = (data.homework || []).filter((h) => h.date !== date);
      persistStudent(s.id, { ...data, homework: [...without, { date, status: "n/a" }] });
    });
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

  const [programLoading, setProgramLoading] = useState(false);

  const openProgram = async (programId) => {
    const prog = programsInClass.find((p) => p.id === programId);
    if (!prog) return;
    setProgramLoading(true);
    const roster = await fetchProgramRoster(prog.memberClassIds);
    const cfg = await loadJSON(`program:${programId}:config`, { points: { categories: [] } }, true);
    const pd = await loadJSON(`program:${programId}:pointsData`, {}, true);
    // Everything is fetched before any of it is committed to state, and openProgramId is set
    // last — otherwise PointsView would mount on the very first render with an empty category
    // list, lock in "no categories yet" for its form-visibility state, and never reconsider
    // that once the real (possibly non-empty) data arrives a moment later.
    setProgramRoster(roster);
    setProgramConfig(cfg);
    setProgramPointsData(pd);
    setProgramLoading(false);
    setOpenProgramId(programId);
  };

  const closeProgram = () => setOpenProgramId(null);

  const addProgramPoints = async (studentId, catId, amount) => {
    const current = programPointsData[studentId]?.[catId] || 0;
    const next = { ...programPointsData, [studentId]: { ...programPointsData[studentId], [catId]: Math.max(0, current + amount) } };
    setProgramPointsData(next);
    await saveJSON(`program:${openProgramId}:pointsData`, next, true);
  };

  const addProgramCategory = async (newCat) => {
    const next = { ...programConfig, points: { ...programConfig.points, categories: [...(programConfig.points?.categories || []), newCat] } };
    setProgramConfig(next);
    await saveJSON(`program:${openProgramId}:config`, next, true);
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
    const todayStr = todayISO();
    const entry = plannerDays?.[todayStr];
    const dayType = (config.planner?.dayTypes || []).find((t) => t.id === entry?.dayType);
    return getScheduleForDate(todayStr, dayType, config, plannerDays);
  })();
  const openMessageDraft = (flag) => { setMessageFlag(flag); setView("message-draft"); };

  // Admin-created school events aren't copied into this class's own data — they're merged in
  // at read time, same pattern as the automatic Jewish holidays. That's what makes "edit once,
  // updates everywhere" work: there's nothing per-class to keep in sync.
  const applicableAdminEvents = (schoolEvents || [])
    .filter((e) => e.appliesTo === "all" || (Array.isArray(e.appliesTo) && e.appliesTo.includes(classId)))
    .map((e) => ({ ...e, source: "admin" }));
  const effectivePlannerEvents = [...plannerEvents, ...applicableAdminEvents];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-teal-700" size={28} /></div>;
  }

  if (isSubstituteSession) {
    return (
      <SubstituteModeView className={className} roster={roster} studentData={studentData} config={config}
        plannerDays={plannerDays} plannerEvents={effectivePlannerEvents}
        setAttendance={setAttendance} addIncident={addIncident} onExit={onSwitchClass} />
    );
  }

  return (
    <ClassContext.Provider value={{ className, onSwitchClass, switchLabel }}>
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        height: "48px", width: "100%",
        background: "linear-gradient(90deg, #2b2723 0%, #2b2723 55%, #c0362c 100%)",
        WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
        maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
      }} />
      <GlobalAppStyles />

      {view === "home" && (
        <HomeView roster={roster} studentData={studentData} incidents={incidents} config={config}
          removeStudent={removeStudent}
          setAttendance={setAttendance} setAttendanceTime={setAttendanceTime}
          setHomework={setHomework} markNoHomeworkToday={markNoHomeworkToday}
          openDetail={(id) => { setCurrentId(id); setView("detail"); }}
          openIncidentForm={(id) => openIncidentForm(id, "home")} openPeriodAttendance={(id) => openPeriodAttendanceForm(id, "home")} navigate={setView}
          monthlyReportState={monthlyReportState}
          onDismissMonthlyReminder={(key) => persistMonthlyReportState({ ...monthlyReportState, dismissedMonth: key })}
          reflectionState={reflectionState} reflections={reflections}
          onDismissReflectionReminder={(key) => persistReflectionState({ ...reflectionState, dismissedMonth: key })}
          onOpenReflection={() => { setSelectedReflectionMonth(monthKey(new Date().getFullYear(), new Date().getMonth())); setView("reflection-form"); }}
          plannerDays={plannerDays} plannerEvents={effectivePlannerEvents}
          setPlannerDay={setPlannerDay} addPoints={addPoints} behaviorLogData={behaviorLogData}
          birthdayDismissals={birthdayDismissals} onDismissBirthday={dismissBirthday} onCreateBirthdayEvent={createBirthdayEvent}
          benchmarkSubjects={benchmarkSubjects} segmentCelebrationDismissals={segmentCelebrationDismissals} onDismissSegmentCelebration={dismissSegmentCelebration}
          onCelebrateSegment={(subjectLabel, segment) => { setCelebratingSegment({ subjectLabel, segment }); setView("segment-celebration-message"); }}
          onAddPlannerEvent={addPlannerEvent}
          randomPickerData={randomPickerData} onRandomPick={recordRandomPick} onResetRandomPicker={resetRandomPicker}
          alerts={alerts} dismissAlert={dismissAlert} showPlan={showPlan} setShowPlan={setShowPlan} />
      )}

      {view === "segment-celebration-message" && celebratingSegment && (
        <SegmentCelebrationMessageView subjectLabel={celebratingSegment.subjectLabel} segmentLabel={celebratingSegment.segment.label}
          roster={roster} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("home")}
          onDone={() => { dismissSegmentCelebration(celebratingSegment.segment.id); setView("home"); }} />
      )}

      {view === "class-mode" && (
        <ClassModeView roster={roster} studentData={studentData} config={config} addPoints={addPoints}
          openIncidentForm={(id) => openIncidentForm(id, "class-mode")} onExit={() => setView("home")} onOpenClassTools={() => setShowPlan(true)} />
      )}

      {view === "day-recap" && (
        <DayRecapView roster={roster} studentData={studentData} incidents={incidents} behaviorLogData={behaviorLogData}
          plannerDays={plannerDays} config={config} onBack={() => setView("home")} />
      )}

      {/* Class Tools drawer — slides in from the right and pushes the roster over to share the screen (like a Gmail side panel) — never dims or blocks it, at any width. Lives here (not inside any one view) so both Home and Class Mode can open it. Position/transform/transition are inline styles deliberately, so they never depend on utility-CSS generation timing. */}
      <div className="w-full sm:w-96 lg:w-1/2 bg-stone-50 border-l border-stone-200 shadow-2xl overflow-y-auto"
        style={{ position: "fixed", top: 0, right: 0, height: viewportHeight, zIndex: 40, transform: showPlan ? "translateX(0)" : "translateX(100%)", transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="p-4 space-y-4 lg:max-w-xl">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-stone-800">Class Tools</p>
            <button onClick={() => setShowPlan(false)} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={20} /></button>
          </div>
          <TodaysPlanPanel config={config} plannerDays={plannerDays} setPlannerDay={setPlannerDay} navigate={setView} />
          <TimerWidget />
          <RandomPickerWidget roster={roster} pickerData={randomPickerData} onPick={recordRandomPick} onReset={resetRandomPicker} />
          <ScratchpadWidget plannerDays={plannerDays} setPlannerDay={setPlannerDay} />
          <button onClick={() => setView("day-recap")} className="w-full flex items-center justify-center gap-2 bg-stone-800 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-900">
            End of day recap <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {view === "communication" && (
        <CommunicationListView roster={roster} studentData={studentData} navigate={setView}
          openStudent={(id) => { setCurrentId(id); setView("comm-entry"); }} />
      )}

      {view === "tools" && (
        <ToolsView schoolTools={schoolTools} navigate={setView} />
      )}

      {view === "comm-entry" && currentId && (
        <CommunicationEntryView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          onBack={() => setView("communication")} onAddEntry={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "class-announcement" && (
        <ClassAnnouncementView roster={roster} config={config} loggedInTeacher={loggedInTeacher} onBack={() => setView("communication")} />
      )}

      {view === "monthly-reports" && (
        <MonthlyReportsView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("home")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "range-report" && (
        <CustomRangeReportView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("communication")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "reflection-form" && (
        <MonthlyReflectionForm monthKey={selectedReflectionMonth || monthKey(new Date().getFullYear(), new Date().getMonth())}
          existing={reflections.find((r) => r.monthKey === (selectedReflectionMonth || monthKey(new Date().getFullYear(), new Date().getMonth())))}
          allReflections={reflections} onSave={saveReflection} onBack={() => setView("reflection-history")} />
      )}

      {view === "reflection-history" && (
        <ReflectionHistoryView reflections={reflections} navigate={setView}
          onOpenMonth={(mk) => { setSelectedReflectionMonth(mk); setView("reflection-form"); }}
          onBack={() => setView("home")} />
      )}

      {view === "assessments" && (
        <AssessmentsListView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config}
          openClassAssessment={() => setView("class-assessment-form")}
          openAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          openSkillCategoryReport={(catId) => { setSelectedSkillReportCat(catId); setView("skill-category-report"); }}
          activateAssessment={activateAssessment} hideAssessment={hideAssessment} createCustomAssessment={createCustomAssessment}
          updateClassAssessmentResult={updateClassAssessmentResult}
          onStartSession={(studentId, catId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setSessionCat(catId); setSessionIdx(0); setView("session"); }}
          onLogFluency={(studentId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setView("fluency"); }}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          onOpenFluencyDetail={(studentId, entry) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setDetailReturnView("assessments"); setSelectedFluencyEntry(entry); setView("fluency-detail"); }}
          onOpenSkillDetail={(studentId, catId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setDetailReturnView("assessments"); setSelectedSkillCat(catId); setView("skill-detail"); }}
          initialStudentId={initialAssessmentStudentId}
          navigate={setView} />
      )}

      {view === "assessment-report" && selectedAssessmentId && (
        <AssessmentReportView assessment={classAssessments.find((ca) => ca.id === selectedAssessmentId)} roster={roster} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "skill-category-report" && selectedSkillReportCat && (
        <SkillCategoryReportView category={config.categories.find((c) => c.id === selectedSkillReportCat)} roster={roster} studentData={studentData} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)}
          onStartClassSession={startClassSession} />
      )}

      {view === "points" && !openProgramId && (
        <PointsView roster={roster} studentData={studentData} classPoints={classPoints} config={config}
          addPoints={addPoints} addClassPoints={addClassPointsFn} resetClassPoints={resetClassPointsFn}
          onAddCategory={addPointsCategory} navigate={setView}
          plannerDays={plannerDays} behaviorLogData={behaviorLogData} adjustBehaviorMark={adjustBehaviorMark}
          programs={programsInClass} onOpenProgram={openProgram} />
      )}

      {view === "points" && openProgramId && (
        <PointsView
          roster={programRoster}
          studentData={Object.fromEntries(programRoster.map((s) => [s.id, { points: programPointsData[s.id] || {} }]))}
          classPoints={{}} config={programConfig}
          addPoints={addProgramPoints} addClassPoints={() => {}} resetClassPoints={() => {}}
          onAddCategory={addProgramCategory} navigate={setView}
          programMode programName={programsInClass.find((p) => p.id === openProgramId)?.name || "Program"}
          onBackFromProgram={closeProgram} />
      )}

      {view === "planner" && (
        <PlannerView config={config} plannerDays={plannerDays} plannerEvents={effectivePlannerEvents} navigate={setView}
          setPlannerDay={setPlannerDay} clearPlannerDayType={clearPlannerDayType}
          bulkSetByWeekday={bulkSetByWeekday} bulkSetByRange={bulkSetByRange}
          addPlannerEvent={addPlannerEvent} removePlannerEvent={removePlannerEvent}
          importSchoolCalendar={importSchoolCalendar}
          benchmarkSubjects={benchmarkSubjects} addBenchmarkSubject={addBenchmarkSubject}
          removeBenchmarkSubject={removeBenchmarkSubject} addBenchmarkSegment={addBenchmarkSegment}
          addBenchmarkSegmentBySubjectLabel={addBenchmarkSegmentBySubjectLabel}
          updateBenchmarkSegment={updateBenchmarkSegment} removeBenchmarkSegment={removeBenchmarkSegment}
          toggleSubjectHiddenFromPlanner={toggleSubjectHiddenFromPlanner} />
      )}

      {view === "class-assessment-form" && (
        <ClassAssessmentForm roster={roster} config={config} onCancel={() => setView("assessments")}
          onSave={(entry) => { addClassAssessment(entry); setView("assessments"); }} />
      )}

      {view === "detail" && currentId && (
        <StudentDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          incidents={incidents} classAssessments={classAssessments} config={config}
          onBack={() => setView("home")} onAcknowledge={(key) => acknowledgeFlag(currentId, key)}
          onLogIncident={() => openIncidentForm(currentId, "detail")} onLogPeriodAttendance={() => openPeriodAttendanceForm(currentId, "detail")}
          onGoToAssessments={() => { setInitialAssessmentStudentId(currentId); setView("assessments"); }}
          onExportReport={() => setView("print-report-options")}
          onDraftMessage={openMessageDraft} onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onUpdateField={(field, value) => updateStudentField(currentId, field, value)}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); setView("assessment-report"); }}
          onOpenFluencyDetail={(entry) => { setDetailReturnView("detail"); setSelectedFluencyEntry(entry); setView("fluency-detail"); }}
          onOpenSkillDetail={(catId) => { setDetailReturnView("detail"); setSelectedSkillCat(catId); setView("skill-detail"); }}
          onOpenIncidentDetail={(id) => { setSelectedIncidentId(id); setView("incident-detail"); }}
          onFetchCrossClassHistory={fetchCrossClassHistory} currentClassName={className} />
      )}

      {view === "print-report-options" && currentId && (
        <PrintReportOptionsView student={roster.find((s) => s.id === currentId)}
          onBack={() => setView("detail")}
          onGenerate={(sections) => { setReportSections(sections); setView("print-report"); }} />
      )}

      {view === "print-report" && currentId && (
        <PrintableStudentReport student={roster.find((s) => s.id === currentId)} data={studentData[currentId] || emptyStudentData()}
          incidents={incidents} classAssessments={classAssessments} config={config} sections={reportSections}
          currentClassName={className} onBack={() => setView("print-report-options")} />
      )}

      {view === "incident-detail" && selectedIncidentId && (
        <IncidentDetailView incident={incidents.find((i) => i.id === selectedIncidentId)} roster={roster} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView(currentId ? "detail" : "home")}
          onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(studentId, email) => updateStudentField(studentId, "parentEmail", email)}
          onUpdateIncident={updateIncident}
          onRemoveIncident={(id) => { removeIncident(id); setView(currentId ? "detail" : "home"); }} />
      )}

      {view === "fluency-detail" && currentId && selectedFluencyEntry && (
        <FluencyDetailView student={roster.find((s) => s.id === currentId)} entry={selectedFluencyEntry} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView(detailReturnView)} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "skill-detail" && currentId && selectedSkillCat && (
        <SkillDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          category={config.categories.find((c) => c.id === selectedSkillCat)} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView(detailReturnView)} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "session" && currentId && sessionCat && (
        <SessionView category={config.categories.find((c) => c.id === sessionCat)} config={config}
          idx={sessionIdx} setIdx={setSessionIdx}
          onGrade={(itemId, result) => gradeItem(sessionCat, itemId, result, classSessionDate)}
          onFinish={() => (classSessionQueue ? advanceClassSession() : setView("assessments"))}
          studentName={roster.find((s) => s.id === currentId)?.name}
          classSessionProgress={classSessionQueue ? { pos: classSessionPos, total: classSessionQueue.length } : null} />
      )}

      {view === "fluency" && currentId && (
        <FluencyForm student={roster.find((s) => s.id === currentId)} onCancel={() => setView("assessments")}
          onSave={(entry) => { addFluencyEntry(currentId, entry); setView("assessments"); }} />
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
        <MessageDraftView student={roster.find((s) => s.id === currentId)} flag={messageFlag} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => setView("detail")} onSaveParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onLogSent={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "settings" && (
        <SettingsView config={config} setConfig={persistConfig} onBack={() => setView("home")}
          roster={roster} addStudent={addStudent} removeStudent={removeStudent} updateStudentField={updateStudentField}
          loadSampleData={loadSampleData} clearAllData={clearAllData}
          className={className} onRenameClass={onRenameClass} onChangePassword={onChangePassword} onArchiveClass={onArchiveClass} onDeleteClass={onDeleteClass}
          subCode={subCode} onGenerateSubCode={onGenerateSubCode} onClearSubCode={onClearSubCode}
          globalStudents={globalStudents} onRefreshGlobalStudents={refreshGlobalStudentsInClass} onAddExistingStudent={addExistingStudent}
          loggedInTeacher={loggedInTeacher} onOpenMyAccount={() => setShowMyAccount(true)} onOpenOnboarding={() => setShowOnboarding(true)} />
      )}

      {showMyAccount && loggedInTeacher && (
        <MyAccountPanel teacher={loggedInTeacher} onUpdateName={onChangeMyName} onChangePassword={onChangeMyPassword} onClose={() => setShowMyAccount(false)} />
      )}

      {showOnboarding && (
        <OnboardingWizard config={config} setConfig={persistConfig} onClose={() => setShowOnboarding(false)} />
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
        <img src="/logo-transparent.png" alt="" className="w-16 h-16 object-contain shrink-0 -my-2" />
        <div>
          <h1 className="display-font text-2xl font-bold text-stone-900">Classroom Tracker</h1>
          {className && (
            <button onClick={onSwitchClass} className="text-xs text-stone-400 hover:text-teal-700">{className} · {switchLabel || "Switch class"}</button>
          )}
        </div>
      </div>
      <button onClick={() => navigate("settings")} className="text-stone-400 hover:text-teal-700 p-1.5 rounded-lg hover:bg-stone-100">
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
    { id: "tools", label: "Tools", icon: Wrench },
  ];
  return (
    <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 md:w-[36rem] overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => navigate(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold whitespace-nowrap px-1 ${isActive ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
            <Icon size={14} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Home ----------

function HomeView({ roster, studentData, incidents, config, removeStudent, setAttendance, setAttendanceTime, setHomework, markNoHomeworkToday, openDetail, openIncidentForm, openPeriodAttendance, navigate, monthlyReportState, onDismissMonthlyReminder, reflectionState, onDismissReflectionReminder, onOpenReflection, reflections, plannerDays, plannerEvents, setPlannerDay, addPoints, behaviorLogData, birthdayDismissals, onDismissBirthday, onCreateBirthdayEvent, benchmarkSubjects, segmentCelebrationDismissals, onDismissSegmentCelebration, onCelebrateSegment, onAddPlannerEvent, randomPickerData, onRandomPick, onResetRandomPicker, alerts, dismissAlert, showPlan, setShowPlan }) {
  const [date, setDate] = useState(todayISO());
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedAttendance, setExpandedAttendance] = useState([]);
  const [attendanceManuallyShown, setAttendanceManuallyShown] = useState(false);
  const [homeworkManuallyShown, setHomeworkManuallyShown] = useState(false);
  useEffect(() => { setExpandedAttendance([]); setAttendanceManuallyShown(false); setHomeworkManuallyShown(false); }, [date]);
  const statusMap = {};
  config.attendance.statuses.forEach((s) => (statusMap[s.id] = s));

  const now = new Date();
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth());
  const reminderDate = shabbosAwareReminderDate(now.getFullYear(), now.getMonth(), config.monthlyReports?.dayOfMonth || 25, config.monthlyReports?.avoidFriday);
  const reminderDue = now >= reminderDate && monthlyReportState?.dismissedMonth !== thisMonthKey;
  const reflectionReminderDue = now >= reminderDate && reflectionState?.dismissedMonth !== thisMonthKey && !(reflections || []).some((r) => r.monthKey === thisMonthKey);

  const todayStr = todayISO();

  // Today's at-a-glance counts — attendance is looked up per-student for the currently viewed
  // date, matching the "for" date the rest of this page's attendance section uses. Points has no
  // per-day breakdown in how it's tracked (each category is a running total, not a dated log), so
  // this shows the class's current total instead of "given today" specifically.
  let presentCount = 0, lateCount = 0, absentCount = 0, totalPoints = 0;
  roster.forEach((s) => {
    const sd = studentData[s.id];
    const todaysEntry = (sd?.attendance || []).find((a) => a.date === date);
    if (todaysEntry) {
      const st = statusMap[todaysEntry.status];
      if (todaysEntry.status === "present") presentCount++;
      else if (st?.flagType === "late") lateCount++;
      else if (st?.flagType === "absent") absentCount++;
    }
    Object.entries(sd?.points || {}).forEach(([, v]) => { if (typeof v === "number") totalPoints += v; });
  });

  const BIRTHDAY_REMINDER_DAYS = 7;
  const upcomingBirthdays = roster
    .filter((s) => s.hebrewBirthdayMonth && s.hebrewBirthdayDay)
    .map((s) => {
      const nextDate = nextHebrewOccurrence(s.hebrewBirthdayMonth, s.hebrewBirthdayDay, now);
      if (!nextDate) return null;
      const daysAway = Math.round((nextDate - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      const hebYear = new HDate(nextDate).getFullYear();
      const dismissKey = `${s.id}-${hebYear}`;
      const dismissal = birthdayDismissals?.[dismissKey];
      if (dismissal?.action === "created" || dismissal?.action === "ignored") return null;
      if (dismissal?.action === "snoozed" && dismissal.snoozeUntil && todayStr < dismissal.snoozeUntil) return null;
      return { student: s, date: nextDate, daysAway, hebYear };
    })
    .filter((b) => b && b.daysAway >= 0 && b.daysAway <= BIRTHDAY_REMINDER_DAYS)
    .sort((a, b) => a.daysAway - b.daysAway);

  const SEGMENT_CELEBRATION_WINDOW_DAYS = 5;
  const recentlyCompletedSegments = (benchmarkSubjects || []).flatMap((subj) =>
    (subj.segments || [])
      .filter((seg) => {
        if (segmentCelebrationDismissals?.[seg.id]) return false;
        const daysSince = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(`${seg.endDate}T00:00:00`)) / 86400000);
        return daysSince >= 0 && daysSince <= SEGMENT_CELEBRATION_WINDOW_DAYS;
      })
      .map((seg) => ({ subjectId: subj.id, subjectLabel: subj.label, segment: seg }))
  );

  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const selectedDayType = plannerDays?.[date]?.dayType ? dayTypeMap[plannerDays[date].dayType] : null;
  const attendanceHidden = selectedDayType?.hidesAttendance;
  const attendanceApplicableStudents = roster.filter((s) => morningAttendanceApplies(s, date, selectedDayType, config, plannerDays));
  const allAttendanceLogged = attendanceApplicableStudents.length > 0 && attendanceApplicableStudents.every((s) => (studentData[s.id]?.attendance || []).some((a) => a.date === date));
  const homeworkActiveToday = homeworkAppliesToday(config, date);
  const allHomeworkLogged = homeworkActiveToday && roster.length > 0 && roster.every((s) => (studentData[s.id]?.homework || []).some((h) => h.date === date));
  const attendanceSkipped = !!plannerDays?.[date]?.attendanceSkipped;
  const homeworkSkipped = !!plannerDays?.[date]?.homeworkSkipped;
  const showAttendanceCollapsed = !attendanceHidden && (allAttendanceLogged || attendanceSkipped) && !attendanceManuallyShown;
  const showHomeworkCollapsed = homeworkActiveToday && (allHomeworkLogged || homeworkSkipped) && !homeworkManuallyShown;

  // Bringing a skipped section back into view also clears the skip flag — re-engaging with it
  // means the teacher wants to actually use it now, not have it silently re-collapse once they
  // mark a few students but not everyone.
  const showAttendanceNow = () => { setAttendanceManuallyShown(true); if (attendanceSkipped) setPlannerDay(date, { attendanceSkipped: false }); };
  const showHomeworkNow = () => { setHomeworkManuallyShown(true); if (homeworkSkipped) setPlannerDay(date, { homeworkSkipped: false }); };

  const upcomingEvents = (plannerEvents || []).filter((e) => {
    if (!e.reminderLeadDays && e.reminderLeadDays !== 0) return false;
    const remindFrom = addDaysISO(e.date, -e.reminderLeadDays);
    return todayStr >= remindFrom && todayStr <= e.date;
  }).sort((a, b) => (a.date < b.date ? -1 : 1));

  const individualPointCats = (config.points?.categories || []).filter((c) => c.scope === "individual");

  return (
    <div className="app-page-wide">
      <Header navigate={navigate} />
      <div className="flex items-center justify-between gap-2 md:w-full flex-wrap">
        <MainTabs active="home" navigate={navigate} />
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate("class-mode")} title="Full-screen names and points, nothing else"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800">
            <Maximize2 size={13} /> Class Mode
          </button>
          <button onClick={() => setShowPlan((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50">
            <Calendar size={13} /> Class Tools
          </button>
        </div>
      </div>

      <button onClick={() => openIncidentForm(null)} title="Record an incident"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-1.5 bg-rose-600 text-white rounded-full pl-3 pr-4 py-3 shadow-lg hover:bg-rose-700">
        <ClipboardList size={16} /> <span className="text-xs font-semibold">Record incident</span>
      </button>

      {roster.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check size={16} /></span>
            <div><p className="text-xl font-bold text-stone-900 leading-none">{presentCount}</p><p className="text-xs text-stone-400 mt-0.5">Present today</p></div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Clock size={16} /></span>
            <div><p className="text-xl font-bold text-stone-900 leading-none">{lateCount}</p><p className="text-xs text-stone-400 mt-0.5">Late</p></div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0"><X size={16} /></span>
            <div><p className="text-xl font-bold text-stone-900 leading-none">{absentCount}</p><p className="text-xs text-stone-400 mt-0.5">Absent</p></div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0"><Star size={16} /></span>
            <div><p className="text-xl font-bold text-stone-900 leading-none">{totalPoints}</p><p className="text-xs text-stone-400 mt-0.5">Total points</p></div>
          </div>
        </div>
      )}

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
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-teal-900">Monthly reports are ready to generate</p>
            <p className="text-xs text-teal-700">For {monthLabel(now.getFullYear(), now.getMonth())} — review and send whenever you're ready.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate("monthly-reports")} className="text-xs font-semibold bg-teal-700 text-white rounded-lg px-3 py-1.5 hover:bg-teal-800">Generate now</button>
            <button onClick={() => onDismissMonthlyReminder(thisMonthKey)} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-100">Dismiss</button>
          </div>
        </div>
      )}

      {reflectionReminderDue && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-violet-900">A few minutes for your monthly reflection?</p>
            <p className="text-xs text-violet-700">For {monthLabel(now.getFullYear(), now.getMonth())} — private to you, just a moment to reflect.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onOpenReflection} className="text-xs font-semibold bg-violet-700 text-white rounded-lg px-3 py-1.5 hover:bg-violet-800">Reflect now</button>
            <button onClick={() => onDismissReflectionReminder(thisMonthKey)} className="text-xs font-semibold text-violet-700 border border-violet-300 rounded-lg px-3 py-1.5 hover:bg-violet-100">Dismiss</button>
          </div>
        </div>
      )}

      {upcomingBirthdays.map((b) => (
        <div key={b.student.id} className="bg-fuchsia-50 border border-fuchsia-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-fuchsia-900">
              🎉 {b.student.name}'s Hebrew birthday is {b.daysAway === 0 ? "today" : b.daysAway === 1 ? "tomorrow" : `in ${b.daysAway} days`}
            </p>
            <p className="text-xs text-fuchsia-700">{`${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, "0")}-${String(b.date.getDate()).padStart(2, "0")}`} — {hebrewDateFor(`${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, "0")}-${String(b.date.getDate()).padStart(2, "0")}`)}</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button onClick={() => onCreateBirthdayEvent(b.student.id, b.student.name, `${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, "0")}-${String(b.date.getDate()).padStart(2, "0")}`, b.hebYear)}
              className="text-xs font-semibold bg-fuchsia-700 text-white rounded-lg px-3 py-1.5 hover:bg-fuchsia-800">Create birthday event</button>
            <button onClick={() => onDismissBirthday(b.student.id, b.hebYear, "snoozed", addDaysISO(todayStr, 3))}
              className="text-xs font-semibold text-fuchsia-700 border border-fuchsia-300 rounded-lg px-3 py-1.5 hover:bg-fuchsia-100">Snooze 3 days</button>
            <button onClick={() => onDismissBirthday(b.student.id, b.hebYear, "ignored")}
              className="text-xs font-semibold text-fuchsia-700 border border-fuchsia-300 rounded-lg px-3 py-1.5 hover:bg-fuchsia-100">Ignore</button>
          </div>
        </div>
      ))}

      {recentlyCompletedSegments.map(({ subjectLabel, segment }) => (
        <div key={segment.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm font-semibold text-amber-900">🎉 {subjectLabel} — {segment.label} complete!</p>
          <p className="text-xs text-amber-700 mb-2">Finished {segment.endDate}. Want to mark the occasion?</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("points")} className="text-xs font-semibold bg-amber-700 text-white rounded-lg px-3 py-1.5 hover:bg-amber-800">Celebrate with the class</button>
            <button onClick={() => onCelebrateSegment(subjectLabel, segment)} className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100">Announce to parents</button>
            <button onClick={() => { onAddPlannerEvent({ date: todayStr, title: `Celebration — ${subjectLabel}: ${segment.label}`, category: "siyum", reminderLeadDays: 1 }); onDismissSegmentCelebration(segment.id); }}
              className="text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100">Schedule a celebration</button>
            <button onClick={() => onDismissSegmentCelebration(segment.id)} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-100">Dismiss</button>
          </div>
        </div>
      ))}

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
            {(!attendanceHidden && (showAttendanceCollapsed || showHomeworkCollapsed)) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {showAttendanceCollapsed && (
                  <button onClick={showAttendanceNow} className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 ${attendanceSkipped ? "text-stone-500 bg-stone-100 border border-stone-200 hover:bg-stone-200" : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"}`}>
                    <Check size={12} /> {attendanceSkipped ? "Attendance skipped for today — tap to log" : "Attendance done — tap to review"}
                  </button>
                )}
                {showHomeworkCollapsed && (
                  <button onClick={showHomeworkNow} className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 ${homeworkSkipped ? "text-stone-500 bg-stone-100 border border-stone-200 hover:bg-stone-200" : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"}`}>
                    <Check size={12} /> {homeworkSkipped ? "Homework skipped for today — tap to log" : "Homework done — tap to review"}
                  </button>
                )}
              </div>
            )}
            {roster.length > 0 && (
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {individualPointCats.length > 0 && (
                    <button onClick={() => { setMultiSelect((v) => !v); setSelectedIds([]); }} className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                      {multiSelect ? "Done selecting" : "Select multiple students"}
                    </button>
                  )}
                  <button onClick={() => openPeriodAttendance(null)} className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <Calendar size={12} /> Log period attendance
                  </button>
                  {!attendanceHidden && !showAttendanceCollapsed && attendanceApplicableStudents.length > 0 && (
                    <button onClick={() => setPlannerDay(date, { attendanceSkipped: true })} className="text-xs font-semibold text-stone-500 flex items-center gap-1 hover:text-stone-700">
                      Skip attendance for today
                    </button>
                  )}
                  {homeworkActiveToday && !showHomeworkCollapsed && (
                    <button onClick={() => setPlannerDay(date, { homeworkSkipped: true })} className="text-xs font-semibold text-stone-500 flex items-center gap-1 hover:text-stone-700">
                      Skip homework for today
                    </button>
                  )}
                  {homeworkActiveToday && (
                    <button onClick={() => markNoHomeworkToday(date)} className="text-xs font-semibold text-stone-500 flex items-center gap-1 hover:text-stone-700">
                      No homework today
                    </button>
                  )}
                </div>
                {multiSelect && selectedIds.length > 0 && <span className="text-xs text-stone-400">{selectedIds.length} selected</span>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roster.map((s) => {
                const entry = (studentData[s.id]?.attendance || []).find((a) => a.date === date);
                const isLateType = entry?.status && statusMap[entry.status]?.flagType === "late";
                const flags = getFlags(studentData[s.id], s.id, incidents, config);
                const isSelected = selectedIds.includes(s.id);
                const isExpanded = expandedAttendance.includes(s.id);
                const showFullPicker = !entry || isExpanded;
                const studentAttendanceApplies = morningAttendanceApplies(s, date, selectedDayType, config, plannerDays);
                const homeworkEntry = (studentData[s.id]?.homework || []).find((h) => h.date === date);
                const initials = getInitials(s.name);
                const avatarColor = avatarColorFor(s.id);
                return (
                  <div key={s.id} className={`bg-white rounded-xl border p-3 ${isSelected ? "border-teal-400 ring-1 ring-teal-200" : "border-stone-200"}`}>
                    <div className="flex items-start gap-2 mb-3">
                      {multiSelect && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds((prev) => (isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]))}
                          className="w-4 h-4 mt-2.5 shrink-0" />
                      )}
                      <span className={`w-9 h-9 rounded-full bg-${avatarColor}-100 text-${avatarColor}-700 flex items-center justify-center font-bold text-sm shrink-0`}>{initials}</span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <button onClick={() => openDetail(s.id)} className="font-semibold text-stone-900 text-sm hover:text-teal-700 text-left block truncate w-full">{s.name}</button>
                        {flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5">
                            <AlertTriangle size={9} /> {flags[0].label}{flags.length > 1 ? ` +${flags.length - 1} more` : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 mt-0.5 block">In good standing</span>
                        )}
                      </div>
                    </div>

                    {!showAttendanceCollapsed && (
                      <div className="mb-2">
                        {!attendanceHidden && studentAttendanceApplies && showFullPicker && (
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
                        {!attendanceHidden && studentAttendanceApplies && !showFullPicker && (
                          <button onClick={() => setExpandedAttendance((prev) => [...prev, s.id])} title="Tap to change"
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-${statusMap[entry.status]?.color || "stone"}-500 text-white`}>
                            {statusMap[entry.status]?.label}{isLateType && entry.time ? ` ${formatTime12h(entry.time)}` : ""}
                          </button>
                        )}
                        {attendanceHidden && <span className="text-xs text-stone-400 italic">No school</span>}
                        {!attendanceHidden && !studentAttendanceApplies && (
                          <span className="text-xs text-stone-400 italic">
                            {s.enrollmentScope === "part-time" ? "Part time — no morning attendance" : "Not scheduled first period"}
                          </span>
                        )}
                      </div>
                    )}

                    {homeworkActiveToday && !showHomeworkCollapsed && (
                      <div className="mb-2">
                        {homeworkEntry?.status === "n/a" ? (
                          <span className="text-xs text-stone-400 italic">No homework</span>
                        ) : homeworkEntry?.status ? (
                          <button onClick={() => setHomework(s.id, date, homeworkEntry.status === "completed" ? "missed" : "completed")}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${homeworkEntry.status === "completed" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                            {homeworkEntry.status === "completed" ? "✅ Done" : "❌ Missing"}
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => setHomework(s.id, date, "completed")} className="text-xs font-semibold px-2 py-1 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50">✅ Homework done</button>
                            <button onClick={() => setHomework(s.id, date, "missed")} className="text-xs font-semibold px-2 py-1 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50">❌ Missing</button>
                          </div>
                        )}
                      </div>
                    )}

                    {participatesInPoints(s) && individualPointCats.length > 0 && (
                      <div className="pt-2 border-t border-stone-100 space-y-2">
                        {individualPointCats.map((cat) => {
                          if (cat.displayMode === "checkx") {
                            const checks = studentData[s.id]?.points?.[`${cat.id}:check`] || 0;
                            const xs = studentData[s.id]?.points?.[`${cat.id}:x`] || 0;
                            return (
                              <div key={cat.id} className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-stone-600">{cat.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => addPoints(s.id, `${cat.id}:check`, 1)} className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-full px-2 py-1">{checks} ✓</button>
                                  <button onClick={() => addPoints(s.id, `${cat.id}:x`, 1)} className="flex items-center gap-1 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-full px-2 py-1">{xs} ✗</button>
                                </div>
                              </div>
                            );
                          }
                          const pts = studentData[s.id]?.points?.[cat.id] || 0;
                          return (
                            <div key={cat.id} className="flex items-center justify-between">
                              <span className={`text-xs font-semibold text-${cat.color}-700`}>{cat.label}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => addPoints(s.id, cat.id, -(cat.increment || 1))} className="w-7 h-7 flex items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100"><Minus size={13} /></button>
                                <span className="text-sm font-bold text-stone-800 w-5 text-center">{pts}</span>
                                <button onClick={() => addPoints(s.id, cat.id, cat.increment || 1)} className={`w-7 h-7 flex items-center justify-center rounded-full bg-${cat.color}-500 text-white hover:opacity-90`}><Plus size={13} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {multiSelect && selectedIds.length > 0 && (
              <div className="sticky bottom-3 mt-3 bg-white border border-teal-200 shadow-lg rounded-xl p-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700">Award to {selectedIds.length} selected:</span>
                {individualPointCats.map((cat) => (
                  <button key={cat.id} onClick={() => selectedIds.filter((id) => participatesInPoints(roster.find((s) => s.id === id) || {})).forEach((id) => addPoints(id, cat.id, cat.increment || 1))}
                    className={`flex items-center gap-1 text-xs font-semibold text-white rounded-full px-3 py-1.5 bg-${cat.color}-500 hover:opacity-90`}>
                    <Plus size={11} /> {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
  const template = getScheduleForDate(today, dayType, config, plannerDays);
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
          No day type set for today. <button onClick={() => navigate("planner")} className="text-teal-700 font-semibold underline">Set it in Planner</button>
        </p>
      )}
      {dayType && !template && (
        <p className="text-xs text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center">
          "{dayType.label}" has no schedule template assigned. <button onClick={() => navigate("planner")} className="text-teal-700 font-semibold underline">Set one up</button>
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
      <button onClick={() => navigate("planner")} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-3">
        Open full planner <ArrowRight size={11} />
      </button>
    </div>
  );
}

// Shuffle-bag, not a weighted lottery — every student is guaranteed to be picked exactly once
// before anyone repeats (click it N times with N students, everyone gets called), the order is
// freshly randomized each round, and the round boundary itself is protected too: when the bag
// empties and reshuffles, the new round's first pick is never the same student who ended the
// previous one, so there's never a back-to-back repeat even across a reset.
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function RandomPickerWidget({ roster, pickerData, onPick, onReset }) {
  const [picking, setPicking] = useState(false);
  const [displayName, setDisplayName] = useState(null);
  const [finalPick, setFinalPick] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const drawNext = () => {
    const rosterIds = roster.map((s) => s.id);
    // Drop anyone no longer in the roster (removed since the bag was built) — keeps the bag
    // valid without needing a manual reset every time the class list changes.
    let bag = (pickerData.bag || []).filter((id) => rosterIds.includes(id));
    if (bag.length === 0) {
      bag = shuffleArray(rosterIds);
      if (pickerData.lastPickedId && bag.length > 1 && bag[0] === pickerData.lastPickedId) {
        const swapWith = 1 + Math.floor(Math.random() * (bag.length - 1));
        [bag[0], bag[swapWith]] = [bag[swapWith], bag[0]];
      }
    }
    const nextId = bag[0];
    const remainingBag = bag.slice(1);
    const winner = roster.find((s) => s.id === nextId);
    return { winner, remainingBag };
  };

  const startPick = () => {
    if (roster.length === 0 || picking) return;
    const { winner, remainingBag } = drawNext();
    if (!winner) return;
    setPicking(true);
    setFinalPick(null);
    let ticks = 0;
    const maxTicks = 14; // ~1.4s of rapid cycling before settling — the "fun animation" part
    intervalRef.current = setInterval(() => {
      const flash = roster[Math.floor(Math.random() * roster.length)];
      setDisplayName(flash.name);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current);
        setDisplayName(winner.name);
        setFinalPick(winner);
        setPicking(false);
        onPick(winner.id, remainingBag);
      }
    }, 100);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-stone-800 text-sm">Random Student</p>
        <button onClick={onReset} title="Discard whoever's left in the current round and shuffle a brand new one right now" className="text-xs text-stone-400 hover:text-stone-600">Reset</button>
      </div>

      <div className={`rounded-lg py-6 text-center mb-3 transition-colors ${finalPick ? "bg-emerald-50" : "bg-stone-50"}`}>
        {displayName ? (
          <p className={`font-bold transition-all ${picking ? "text-2xl text-stone-400" : "text-3xl text-emerald-700"}`}>
            {finalPick ? "🎉 " : ""}{displayName}
          </p>
        ) : (
          <p className="text-sm text-stone-400">Tap to pick a student</p>
        )}
      </div>

      <button onClick={startPick} disabled={picking || roster.length === 0} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
        {picking ? "Picking..." : "🎲 Pick a student"}
      </button>
      {roster.length === 0 && <p className="text-xs text-stone-400 text-center mt-2">Add students first.</p>}
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
  const [fullScreen, setFullScreen] = useState(false);
  const audioCtxRef = useRef(null);
  const fsRef = useRef(null);

  useEffect(() => {
    if (fullScreen && fsRef.current && !document.fullscreenElement) {
      fsRef.current.requestFullscreen?.().catch(() => { /* fullscreen unsupported/blocked — the overlay still shows full-viewport via CSS */ });
    }
  }, [fullScreen]);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullScreen(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const exitFullScreenMode = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setFullScreen(false);
  };

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

  const pct = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const barColor = pct > 0.5 ? "emerald" : pct > 0.2 ? "amber" : "rose";
  const finalCountdown = running && remaining <= 10 && remaining > 0;

  return (
    <>
    <div className={`bg-white border rounded-xl p-4 ${done ? "border-amber-400 bg-amber-50" : "border-stone-200"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-stone-800 text-sm">Timer</p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFullScreen(true)} title="Full-screen classroom display" className="text-xs font-semibold px-2 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200">⛶ Full screen</button>
          <button onClick={() => setSoundOn((v) => !v)} title={soundOn ? "Sound on — tap to mute" : "Sound off — tap to unmute"}
            className={`text-xs font-semibold px-2 py-1 rounded-full ${soundOn ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
            {soundOn ? "🔔 On" : "🔕 Off"}
          </button>
        </div>
      </div>
      <p className={`text-4xl font-bold text-center mb-3 ${done ? "text-amber-700" : "text-stone-900"}`}>{mm}:{ss}</p>
      {done && <p className="text-xs text-amber-700 font-semibold text-center mb-3">Time's up!</p>}

      <div className="flex items-center justify-center gap-1.5 mb-3">
        {RINGTONES.map((r) => (
          <button key={r.id} onClick={() => setRingtone(r.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${ringtone === r.id ? "bg-teal-600 text-white border-teal-600" : "text-stone-500 border-stone-300"}`}>
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
        <button onClick={setCustom} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-full px-3 py-1 hover:bg-teal-50">Set</button>
      </div>
      <div className="flex gap-2">
        {!running ? (
          <button onClick={start} disabled={remaining === 0} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">Start</button>
        ) : (
          <button onClick={pause} className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-amber-600">Pause</button>
        )}
        <button onClick={reset} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Reset</button>
      </div>
    </div>

    {fullScreen && (
      <div ref={fsRef} className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-900 ${finalCountdown ? "animate-pulse" : ""}`}>
        <button onClick={exitFullScreenMode} className="absolute top-4 right-4 md:top-8 md:right-8 text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-2.5 text-sm md:text-base font-semibold flex items-center gap-2">
          <ChevronLeft size={18} /> Exit full screen
        </button>

        <p className={`font-bold text-white leading-none mb-8 md:mb-12 ${finalCountdown ? "text-[22vw] md:text-[16vw]" : "text-[28vw] md:text-[20vw]"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
          {mm}:{ss}
        </p>

        <div className="w-[85vw] max-w-4xl h-8 md:h-12 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full bg-${barColor}-500`} style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%`, transition: "width 1s linear, background-color 0.5s" }} />
        </div>

        {done && <p className="text-3xl md:text-5xl font-bold text-amber-400 mt-8 animate-pulse">Time's up!</p>}

        <div className="flex gap-4 mt-10 md:mt-14">
          {!running ? (
            <button onClick={start} disabled={remaining === 0} className="bg-white text-stone-900 rounded-xl px-8 py-3 text-lg font-bold hover:bg-stone-100 disabled:opacity-40">Start</button>
          ) : (
            <button onClick={pause} className="bg-amber-500 text-white rounded-xl px-8 py-3 text-lg font-bold hover:bg-amber-600">Pause</button>
          )}
          <button onClick={reset} className="bg-white/10 text-white rounded-xl px-8 py-3 text-lg font-bold hover:bg-white/20">Reset</button>
        </div>
      </div>
    )}
    </>
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

// Text size chosen by roster size, same auto-fit principle as before, just applied to rows
// instead of grid cells — few students means bigger text, more students means smaller, so
// everyone still fits on one screen with no scrolling, at whatever size that allows.
function classModeNameSize(count) {
  if (count <= 6) return "text-4xl";
  if (count <= 12) return "text-3xl";
  if (count <= 20) return "text-2xl";
  if (count <= 30) return "text-xl";
  return "text-base";
}

function ClassModeView({ roster, studentData, config, addPoints, openIncidentForm, onExit, onOpenClassTools }) {
  const individualPointCats = (config.points?.categories || []).filter((c) => c.scope !== "class");
  const activeRoster = roster.filter(participatesInPoints);
  const nameSize = classModeNameSize(activeRoster.length || 1);

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 shrink-0">
        <button onClick={onExit} className="flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900">
          <ChevronLeft size={18} /> Exit Class Mode
        </button>
        <button onClick={onOpenClassTools} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50">
          <Calendar size={13} /> Class Tools
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 p-2 pb-16 overflow-hidden">
        {activeRoster.map((s) => (
          <div key={s.id} className="flex-1 min-h-0 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 px-4 overflow-hidden">
            <p className={`font-bold text-stone-900 truncate flex-1 min-w-0 ${nameSize}`}>{s.name}</p>
            {individualPointCats.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                {individualPointCats.map((cat) => {
                  if (cat.displayMode === "checkx") {
                    const checks = studentData[s.id]?.points?.[`${cat.id}:check`] || 0;
                    const xs = studentData[s.id]?.points?.[`${cat.id}:x`] || 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-1.5 bg-stone-50 rounded-full pl-3 pr-2 py-1.5">
                        <button onClick={() => addPoints(s.id, `${cat.id}:check`, 1)} className="text-base font-bold text-emerald-700 hover:bg-emerald-100 rounded-full px-2.5 py-1">{checks} ✓</button>
                        <button onClick={() => addPoints(s.id, `${cat.id}:x`, 1)} className="text-base font-bold text-rose-700 hover:bg-rose-100 rounded-full px-2.5 py-1">{xs} ✗</button>
                      </div>
                    );
                  }
                  const pts = studentData[s.id]?.points?.[cat.id] || 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-2 bg-stone-50 rounded-full pl-3 pr-1.5 py-1.5">
                      <span className="text-lg font-bold text-stone-800">{pts}</span>
                      <button onClick={() => addPoints(s.id, cat.id, -(cat.increment || 1))} className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100"><Minus size={16} /></button>
                      <button onClick={() => addPoints(s.id, cat.id, cat.increment || 1)} className={`w-9 h-9 flex items-center justify-center rounded-full bg-${cat.color}-500 text-white hover:opacity-90`}><Plus size={16} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => openIncidentForm(null)} title="Record an incident"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 bg-rose-600 text-white rounded-full pl-3 pr-4 py-3 shadow-lg hover:bg-rose-700">
        <ClipboardList size={16} /> <span className="text-xs font-semibold">Record incident</span>
      </button>
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
                {inc.loggedBy && <p className="text-stone-400 mt-0.5">Logged by {inc.loggedBy}</p>}
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
                <span className="text-stone-400"> · {formatTime12h(pa.time)}{pa.minutesLate ? ` · ${pa.minutesLate} min late` : ""}</span>
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

const WHEEL_COLORS = ["#0e6e62", "#c0362c", "#b7791f", "#2e7d5b", "#b5651d", "#8a5763", "#756d4f", "#8a6f4a"];

// Deliberately a real, stable top-level component (not defined inline inside RaffleView) —
// if it were recreated on every render, React would treat each render's version as a brand
// new component type and remount the div from scratch on every state change, which silently
// destroys the CSS transition the spin animation depends on (there'd be no "previous rotation"
// for the browser to animate from, so it would just snap straight to the final angle).
function RaffleWheel({ size, wheelBackground, rotation, participants }) {
  const sliceDeg = participants.length > 0 ? 360 / participants.length : 360;
  const labelRadius = size * 0.33;
  const fontSize = Math.max(8, Math.min(size * 0.045, size * 0.9 / Math.max(participants.length, 1)));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -size * 0.04 }}>
        <div style={{ width: 0, height: 0, borderLeft: `${size * 0.035}px solid transparent`, borderRight: `${size * 0.035}px solid transparent`, borderTop: `${size * 0.06}px solid #2b2723` }} />
      </div>
      <div className="rounded-full shadow-lg relative" style={{ width: size, height: size, background: wheelBackground, transform: `rotate(${rotation}deg)`, transition: "transform 5s cubic-bezier(0.33, 1, 0.68, 1)" }}>
        {participants.map((p, i) => {
          const centerAngle = i * sliceDeg + sliceDeg / 2;
          // Un-rotated text reads left-to-right, which in this rotation system corresponds to
          // "pointing right" (90°) — so subtracting 90° is what actually aligns the text along
          // the slice's own radial axis (center-to-edge), rather than across it. Flipped 180° on
          // whichever half would otherwise read upside-down, checked against the real final
          // rotation, not the raw slice angle.
          let netRotation = centerAngle - 90;
          const normalized = ((netRotation % 360) + 360) % 360;
          if (normalized > 90 && normalized < 270) netRotation += 180;
          const innerRotation = netRotation - centerAngle;
          return (
            <div key={p.id} className="absolute" style={{ top: "50%", left: "50%", width: 0, height: 0 }}>
              <div style={{ transform: `rotate(${centerAngle}deg) translateY(-${labelRadius}px) rotate(${innerRotation}deg)` }}>
                <span className="text-white font-bold whitespace-nowrap" style={{ fontSize, textShadow: "0 1px 3px rgba(0,0,0,0.5)", display: "inline-block", transform: "translate(-50%, -50%)" }}>
                  {p.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute rounded-full bg-white border-4 border-stone-800 flex items-center justify-center" style={{ width: size * 0.16, height: size * 0.16, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <span style={{ fontSize: size * 0.06 }}>🎉</span>
      </div>
    </div>
  );
}

function RaffleLegend({ participants }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md">
      {participants.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1.5 text-xs font-medium">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function RaffleView({ roster }) {
  const [selectedIds, setSelectedIds] = useState(roster.map((s) => s.id)); // starts with everyone in
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const fsRef = useRef(null);

  useEffect(() => {
    if (fullScreen && fsRef.current && !document.fullscreenElement) {
      fsRef.current.requestFullscreen?.().catch(() => {});
    }
  }, [fullScreen]);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullScreen(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const exitFullScreenMode = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setFullScreen(false);
  };

  const toggle = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const participants = roster.filter((s) => selectedIds.includes(s.id));

  // Only shared programs carry sourceClassName (a regular class's own roster doesn't need
  // grouping, since every student is already in the same one class).
  const groupedByClass = roster.some((s) => s.sourceClassName)
    ? roster.reduce((acc, s) => {
        const key = s.sourceClassName || "Other";
        (acc[key] = acc[key] || []).push(s);
        return acc;
      }, {})
    : null;

  const sliceDeg = participants.length > 0 ? 360 / participants.length : 360;
  const gradientStops = participants.map((_, i) => {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
    return `${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`;
  }).join(", ");
  const wheelBackground = participants.length > 0 ? `conic-gradient(${gradientStops})` : "#e7dfcf";

  const spin = () => {
    if (participants.length === 0 || spinning) return;
    setWinner(null);
    setSpinning(true);
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const sliceCenterAngle = winnerIndex * sliceDeg + sliceDeg / 2;
    const neededFinalMod = (360 - sliceCenterAngle) % 360;
    const extraSpins = 6 + Math.floor(Math.random() * 3);
    setRotation((prev) => {
      const prevMod = ((prev % 360) + 360) % 360;
      let delta = neededFinalMod - prevMod;
      if (delta < 0) delta += 360;
      return prev + delta + extraSpins * 360;
    });
    setTimeout(() => {
      setWinner(participants[winnerIndex]);
      setSpinning(false);
    }, 5000);
  };

  return (
    <div>
      <p className="text-xs text-stone-400 mb-4">Pick who's entered, then spin — no outside websites needed.</p>

      <div className="flex gap-1.5 mb-2">
        <button onClick={() => setSelectedIds(roster.map((s) => s.id))} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-full px-3 py-1 hover:bg-teal-50">Select all</button>
        <button onClick={() => setSelectedIds([])} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-50">Select none</button>
      </div>
      <div className="mb-5 md:w-[32rem]">
        {groupedByClass ? (
          Object.entries(groupedByClass).map(([className, students]) => (
            <div key={className} className="mb-3">
              <p className="text-xs font-semibold text-stone-500 uppercase mb-1.5">{className}</p>
              <div className="flex flex-wrap gap-1.5">
                {students.map((s) => (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedIds.includes(s.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-500 border-stone-300"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {roster.map((s) => (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedIds.includes(s.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-500 border-stone-300"}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        {roster.length === 0 && <p className="text-xs text-stone-400">Add students first.</p>}
      </div>

      <div className="flex flex-col items-center bg-white border border-stone-200 rounded-xl p-6 md:w-[32rem]">
        <RaffleWheel size={240} wheelBackground={wheelBackground} rotation={rotation} participants={participants} />
        <div className="mt-4 mb-4"><RaffleLegend participants={participants} /></div>

        {winner && !spinning && (
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">🎉 {winner.name} 🎉</p>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button onClick={spin} disabled={spinning || participants.length === 0} className="flex-1 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
            {spinning ? "Spinning..." : "🎡 Spin the wheel"}
          </button>
          <button onClick={() => setFullScreen(true)} disabled={participants.length === 0} className="px-4 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 disabled:opacity-40">⛶ Full screen</button>
        </div>
      </div>

      {fullScreen && (
        <div ref={fsRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-900">
          <button onClick={exitFullScreenMode} className="absolute top-4 right-4 md:top-8 md:right-8 text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-2.5 text-sm md:text-base font-semibold flex items-center gap-2">
            <ChevronLeft size={18} /> Exit full screen
          </button>
          <RaffleWheel size={Math.min(500, typeof window !== "undefined" ? window.innerHeight * 0.55 : 400)} wheelBackground={wheelBackground} rotation={rotation} participants={participants} />
          <div className="mt-6 mb-6 text-white"><RaffleLegend participants={participants} /></div>
          {winner && !spinning && <p className="text-4xl md:text-6xl font-bold text-emerald-400 mb-8 animate-pulse">🎉 {winner.name} 🎉</p>}
          <button onClick={spin} disabled={spinning || participants.length === 0} className="bg-white text-stone-900 rounded-xl px-10 py-4 text-xl font-bold hover:bg-stone-100 disabled:opacity-40">
            {spinning ? "Spinning..." : "🎡 Spin the wheel"}
          </button>
        </div>
      )}
    </div>
  );
}

function PointsView({ roster, studentData, classPoints, config, addPoints, addClassPoints, resetClassPoints, onAddCategory, navigate, plannerDays, behaviorLogData, adjustBehaviorMark, programMode, programName, onBackFromProgram, backLabel, programs, onOpenProgram }) {
  const [subTab, setSubTab] = useState("rewards");
  const cats = config.points?.categories || [];
  const [activeId, setActiveId] = useState(cats[0]?.id || null);
  const active = cats.find((c) => c.id === activeId) || cats[0];
  const [showForm, setShowForm] = useState(cats.length === 0);
  const [form, setForm] = useState({ label: "", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "", indefinite: false });

  useEffect(() => { if (!activeId && cats[0]) setActiveId(cats[0].id); }, [cats, activeId]);
  useEffect(() => { if (programMode && subTab === "classlog") setSubTab("rewards"); }, [programMode, subTab]);

  // Only shared programs carry sourceClassName (a regular class's own roster doesn't need
  // grouping, since every student is already in that one class) — grouped list of
  // [className, students[]] pairs when applicable, null otherwise.
  const pointsRosterGrouped = roster.some((s) => s.sourceClassName)
    ? Object.entries(roster.filter(participatesInPoints).reduce((acc, s) => {
        const key = s.sourceClassName || "Other";
        (acc[key] = acc[key] || []).push(s);
        return acc;
      }, {}))
    : null;

  const submitForm = () => {
    const label = form.label.trim();
    if (!label) return;
    const newCat = { id: uid(), ...form, label };
    onAddCategory(newCat);
    setActiveId(newCat.id);
    setShowForm(false);
    setForm({ label: "", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "", indefinite: false });
  };

  return (
    <div className={PAGE}>
      {programMode ? (
        <div className="flex items-center justify-between mb-5">
          <div>
            <button onClick={onBackFromProgram} className="flex items-center text-stone-500 text-sm hover:text-stone-800 mb-1"><ChevronLeft size={16} /> {backLabel || "Back to my class"}</button>
            <h1 className="display-font text-xl font-bold text-stone-900">{programName}</h1>
            <p className="text-xs text-stone-400">Shared program — points and raffles only, combined across every class in it.</p>
          </div>
        </div>
      ) : (
        <>
          <Header navigate={navigate} />
          <MainTabs active="points" navigate={navigate} />
        </>
      )}

      {!programMode && (programs || []).length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-5 md:w-96">
          <p className="text-xs font-semibold text-violet-900 mb-2">Shared programs this class is part of</p>
          <div className="flex flex-wrap gap-1.5">
            {programs.map((p) => (
              <button key={p.id} onClick={() => onOpenProgram(p.id)} className="text-xs font-semibold bg-white border border-violet-300 text-violet-700 rounded-full px-3 py-1.5 hover:bg-violet-100">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 ${programMode ? "md:w-72" : "md:w-96"}`}>
        <button onClick={() => setSubTab("rewards")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "rewards" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Rewards</button>
        {!programMode && (
          <button onClick={() => setSubTab("classlog")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "classlog" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Class Log</button>
        )}
        <button onClick={() => setSubTab("raffle")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "raffle" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Raffle</button>
      </div>

      {subTab === "classlog" && !programMode ? (
        <ClassLogView config={config} plannerDays={plannerDays} behaviorLogData={behaviorLogData} adjustBehaviorMark={adjustBehaviorMark} />
      ) : subTab === "raffle" ? (
        <RaffleView roster={roster} />
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
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showForm ? "bg-teal-700 text-white border-teal-700" : "text-teal-700 border-teal-300"}`}>
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
                <option value="checkx">Check / X tally</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Add amount</label>
              <input type="number" min={1} value={form.increment} onChange={(e) => setForm((f) => ({ ...f, increment: Math.max(1, Number(e.target.value) || 1) }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </div>
            {!form.indefinite && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Reward at</label>
                <input type="number" min={0} value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: Math.max(0, Number(e.target.value) || 0) }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
              <select value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-3 text-xs text-stone-600">
            <input type="checkbox" checked={form.indefinite} onChange={(e) => setForm((f) => ({ ...f, indefinite: e.target.checked, threshold: e.target.checked ? 0 : (f.threshold || 10) }))} />
            No cap — just count up indefinitely (good for lines memorized, books read, and other ongoing totals)
          </label>

          <label className="block text-xs font-medium text-stone-500 mb-1">Reward description</label>
          <input value={form.rewardMessage} onChange={(e) => setForm((f) => ({ ...f, rewardMessage: e.target.value }))}
            placeholder="e.g. Pizza party" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

          <div className="flex gap-2">
            <button onClick={submitForm} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Create category</button>
            {cats.length > 0 && <button onClick={() => setShowForm(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>}
          </div>
        </div>
      )}

      {!showForm && active && (
        active.displayMode === "checkx" ? (
          active.scope === "class" ? (
            <ClassCheckXCard cat={active}
              checkValue={classPoints[`${active.id}:check`] || 0}
              xValue={classPoints[`${active.id}:x`] || 0}
              onCheck={() => addClassPoints(`${active.id}:check`, 1)}
              onX={() => addClassPoints(`${active.id}:x`, 1)}
              onReset={() => { resetClassPoints(`${active.id}:check`); resetClassPoints(`${active.id}:x`); }} />
          ) : (
            <div className="space-y-1.5">
              {pointsRosterGrouped ? (
                pointsRosterGrouped.map(([className, students]) => (
                  <div key={className} className="mb-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase mb-1.5">{className}</p>
                    <div className="space-y-1.5">
                      {students.map((s) => {
                        const checks = studentData[s.id]?.points?.[`${active.id}:check`] || 0;
                        const xs = studentData[s.id]?.points?.[`${active.id}:x`] || 0;
                        return (
                          <div key={s.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2 flex items-center gap-3 flex-wrap">
                            <span className="font-medium text-stone-800 text-sm w-36 truncate shrink-0">{s.name}</span>
                            <span className="text-sm font-bold text-emerald-700 shrink-0">{checks} ✓</span>
                            <span className="text-sm font-bold text-rose-700 shrink-0">{xs} ✗</span>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button onClick={() => addPoints(s.id, `${active.id}:check`, 1)} className="w-8 h-8 flex items-center justify-center text-white bg-emerald-600 rounded-full hover:bg-emerald-700 text-sm font-bold">✓</button>
                              <button onClick={() => addPoints(s.id, `${active.id}:x`, 1)} className="w-8 h-8 flex items-center justify-center text-white bg-rose-600 rounded-full hover:bg-rose-700 text-sm font-bold">✗</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : roster.filter(participatesInPoints).map((s) => {
                const checks = studentData[s.id]?.points?.[`${active.id}:check`] || 0;
                const xs = studentData[s.id]?.points?.[`${active.id}:x`] || 0;
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-stone-200 px-3 py-2 flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-stone-800 text-sm w-36 truncate shrink-0">{s.name}</span>
                    <span className="text-sm font-bold text-emerald-700 shrink-0">{checks} ✓</span>
                    <span className="text-sm font-bold text-rose-700 shrink-0">{xs} ✗</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button onClick={() => addPoints(s.id, `${active.id}:check`, 1)} className="w-8 h-8 flex items-center justify-center text-white bg-emerald-600 rounded-full hover:bg-emerald-700 text-sm font-bold">✓</button>
                      <button onClick={() => addPoints(s.id, `${active.id}:x`, 1)} className="w-8 h-8 flex items-center justify-center text-white bg-rose-600 rounded-full hover:bg-rose-700 text-sm font-bold">✗</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : active.scope === "class" ? (
          <ClassPointsCard cat={active} value={classPoints[active.id] || 0}
            onAdd={() => addClassPoints(active.id, active.increment || 1)}
            onSubtract={() => addClassPoints(active.id, -(active.increment || 1))}
            onReset={() => resetClassPoints(active.id)} />
        ) : (
          <div className="space-y-1.5">
            {pointsRosterGrouped ? (
              pointsRosterGrouped.map(([className, students]) => (
                <div key={className} className="mb-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase mb-1.5">{className}</p>
                  <div className="space-y-1.5">
                    {students.map((s) => {
                      const pts = studentData[s.id]?.points?.[active.id] || 0;
                      const ready = active.threshold > 0 && pts >= active.threshold;
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
                </div>
              ))
            ) : roster.filter(participatesInPoints).map((s) => {
              const pts = studentData[s.id]?.points?.[active.id] || 0;
              const ready = active.threshold > 0 && pts >= active.threshold;
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
  const template = getScheduleForDate(date, dayType, config, plannerDays);
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
            <button onClick={() => setSummaryView("day")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${summaryView === "day" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Today</button>
            <button onClick={() => setSummaryView("week")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${summaryView === "week" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>This Week</button>
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
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-teal-900 mb-1.5">Today's totals</p>
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

function ClassCheckXCard({ cat, checkValue, xValue, onCheck, onX, onReset }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 md:w-96">
      <p className="text-stone-500 text-sm mb-3">{cat.label}</p>
      <div className="flex items-center justify-center gap-8 mb-5">
        <div className="text-center">
          <p className="display-font text-4xl font-bold text-emerald-700">{checkValue}</p>
          <p className="text-xs text-stone-400 mt-0.5">✓ checks</p>
        </div>
        <div className="text-center">
          <p className="display-font text-4xl font-bold text-rose-700">{xValue}</p>
          <p className="text-xs text-stone-400 mt-0.5">✗ x's</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCheck} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg py-2.5 hover:bg-emerald-700">
          ✓ Check
        </button>
        <button onClick={onX} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-rose-600 rounded-lg py-2.5 hover:bg-rose-700">
          ✗ X
        </button>
      </div>
      {(checkValue > 0 || xValue > 0) && (
        <button onClick={onReset} className="w-full mt-2 text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg py-2 hover:bg-stone-50">Reset tally</button>
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

function AssessmentsListView({ roster, studentData, incidents, classAssessments, config, openClassAssessment, openAssessmentReport, openSkillCategoryReport, activateAssessment, hideAssessment, createCustomAssessment, updateClassAssessmentResult, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, initialStudentId, navigate }) {
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
          <button onClick={() => setShowAdd((v) => !v)} className="text-xs font-semibold text-teal-700 flex items-center gap-1">
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
                <button onClick={() => openSkillCategoryReport(cat.id)} title="See the whole class's results" className="text-xs font-semibold text-stone-700 hover:text-teal-700 px-2 py-0.5">
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

      <button onClick={openClassAssessment} className="mb-4 flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 px-4 text-sm font-semibold hover:bg-teal-800">
        <Plus size={16} /> Log an assessment
      </button>
      <AssessmentGridView roster={roster} studentData={studentData} classAssessments={classAssessments} config={config}
        onUpdateResult={updateClassAssessmentResult} onOpenAssessmentReport={openAssessmentReport}
        onStartSession={onStartSession} onLogFluency={onLogFluency}
        onOpenClassAssessmentReport={onOpenClassAssessmentReport} onOpenFluencyDetail={onOpenFluencyDetail} onOpenSkillDetail={onOpenSkillDetail}
        initialStudentId={initialStudentId} />
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
        <button onClick={() => setTab("library")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${tab === "library" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>From library</button>
        <button onClick={() => setTab("create")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${tab === "create" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Create new</button>
      </div>

      {tab === "library" ? (
        <div>
          {libraryCats.length === 0 && <p className="text-xs text-stone-400 mb-2">No hidden or unused assessments right now — everything's already active, or create a new one instead.</p>}
          <ul className="space-y-2">
            {libraryCats.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-stone-700">{cat.title} <span className="text-stone-400 font-normal">· {cat.items.length} items</span></span>
                <button onClick={() => onActivate(cat.id)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">Add to class</button>
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
            <button onClick={() => setShowBulkAdd((v) => !v)} className="text-xs font-semibold text-teal-700">
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
                <label className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-teal-50">
                  Upload a file instead
                  <input type="file" accept=".txt,.csv" className="hidden" onChange={(e) => handleBulkFile(e.target.files[0])} />
                </label>
              </div>
              <button onClick={addBulkItems} disabled={!bulkText.trim()} className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
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
            <button onClick={submitCreate} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Save assessment</button>
            <button onClick={onCancel} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentGridView({ roster, studentData, classAssessments, config, onUpdateResult, onOpenAssessmentReport, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, initialStudentId }) {
  const [activeCell, setActiveCell] = useState(null); // { assessmentId, studentId }
  const [activeStudentId, setActiveStudentId] = useState(initialStudentId || null);
  const subjects = config?.subjects || [];
  const subjectLabel = (id) => subjects.find((s) => s.id === id)?.label || "No subject";

  // Group by subject (in the order subjects were added in Settings), chronological within each
  // group — reads top-to-bottom like a timeline per subject. Assessments logged before this
  // feature existed (no subjectId) fall into their own group at the end.
  const sorted = [...classAssessments].sort((a, b) => {
    const aIdx = subjects.findIndex((s) => s.id === a.subjectId);
    const bIdx = subjects.findIndex((s) => s.id === b.subjectId);
    const aOrder = aIdx === -1 ? 9999 : aIdx;
    const bOrder = bIdx === -1 ? 9999 : bIdx;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const dateCompare = (a.date || "").localeCompare(b.date || "");
    if (dateCompare !== 0) return dateCompare;
    return (a.id || "").localeCompare(b.id || ""); // id starts with a timestamp, so same-date entries still land in creation order
  });

  if (roster.length === 0) {
    return <p className="text-sm text-stone-400 text-center py-10">Add students from the Home tab first.</p>;
  }
  if (classAssessments.length === 0) {
    return <p className="text-sm text-stone-400 text-center py-10">No assessments logged yet — use "Log an assessment" to get started, and every round you log will appear here as its own row.</p>;
  }

  const activeAssessment = activeCell ? classAssessments.find((ca) => ca.id === activeCell.assessmentId) : null;
  const activeCellStudent = activeCell ? roster.find((s) => s.id === activeCell.studentId) : null;
  const activeStudent = activeStudentId ? roster.find((s) => s.id === activeStudentId) : null;

  return (
    <div>
      <div className="overflow-auto border border-stone-200 rounded-xl" style={{ maxHeight: "70vh" }}>
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-stone-50 border-b border-r border-stone-200 px-3 py-2 text-left text-xs font-semibold text-stone-500 min-w-[170px]">
                Assessment
              </th>
              {roster.map((s) => (
                <th key={s.id} className="sticky top-0 z-10 bg-stone-50 border-b border-stone-200 px-3 py-2 text-xs font-semibold whitespace-nowrap text-center">
                  <button onClick={() => setActiveStudentId(s.id)} className="text-stone-600 hover:text-teal-700 underline decoration-dotted underline-offset-2">
                    {s.name}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((ca, i) => {
              const isNewGroup = i === 0 || ca.subjectId !== sorted[i - 1].subjectId;
              return (
                <tr key={ca.id} className={isNewGroup && i > 0 ? "border-t-2 border-t-stone-300" : ""}>
                  <td className="group sticky left-0 z-10 bg-white border-b border-r border-stone-200 px-3 py-2 whitespace-nowrap">
                    <div className="font-semibold text-stone-800 text-xs">{subjectLabel(ca.subjectId)}</div>
                    <div className="text-[11px] text-stone-400">{ca.title ? `${ca.title} · ` : ""}{ca.date}</div>
                    <button onClick={() => onOpenAssessmentReport(ca.id)}
                      className="text-[10px] font-semibold text-teal-700 hover:text-teal-900 opacity-0 group-hover:opacity-100">
                      Generate parent reports
                    </button>
                  </td>
                  {roster.map((s) => {
                    const grade = getResultGrade(ca.results?.[s.id]);
                    const hasNote = !!getResultNote(ca.results?.[s.id]);
                    return (
                      <td key={s.id} onClick={() => setActiveCell({ assessmentId: ca.id, studentId: s.id })}
                        className="border-b border-stone-100 px-3 py-2 text-center cursor-pointer hover:bg-teal-50 text-xs">
                        {grade || <span className="text-stone-300">—</span>}
                        {hasNote && <span className="ml-1 text-amber-500" title="Has a note">●</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeCell && activeAssessment && activeCellStudent && (
        <AssessmentCellDetail
          assessment={activeAssessment} student={activeCellStudent} subjectLabel={subjectLabel(activeAssessment.subjectId)}
          value={activeAssessment.results?.[activeCellStudent.id]}
          onSave={(value) => { onUpdateResult(activeAssessment.id, activeCellStudent.id, value); setActiveCell(null); }}
          onClose={() => setActiveCell(null)}
        />
      )}

      {activeStudent && (
        <AssessmentStudentModal student={activeStudent} data={studentData[activeStudent.id] || emptyStudentData()} config={config} classAssessments={classAssessments}
          onClose={() => setActiveStudentId(null)}
          onStartSession={(catId) => onStartSession(activeStudent.id, catId)}
          onLogFluency={() => onLogFluency(activeStudent.id)}
          onOpenClassAssessmentReport={onOpenClassAssessmentReport}
          onOpenFluencyDetail={(entry) => onOpenFluencyDetail(activeStudent.id, entry)}
          onOpenSkillDetail={(catId) => onOpenSkillDetail(activeStudent.id, catId)}
        />
      )}
    </div>
  );
}

function AssessmentStudentModal({ student, data, config, classAssessments, onClose, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail }) {
  const activeCats = config.categories.filter((c) => c.active !== false);
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-semibold text-stone-800">{student.name}</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xs font-semibold">Close</button>
        </div>

        <button onClick={onLogFluency} className="w-full md:w-72 mb-5 flex items-center justify-center gap-2 bg-teal-50 text-teal-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-100">
          <Mic size={16} /> Log fluency check
        </button>

        {activeCats.length > 0 && (
          <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0 mb-6">
            {activeCats.map((cat) => {
              const total = cat.items.length;
              const mastered = cat.items.filter((it) => data.skills[skillKey(cat.id, it.id)]?.status === "mastered").length;
              return (
                <div key={cat.id} className="bg-stone-50 rounded-xl border border-stone-200 p-3">
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
                        : status === "practicing" ? "bg-teal-300" : "bg-stone-200";
                      return <span key={it.id} title={it.label} className={`w-2.5 h-2.5 rounded-full ${color}`} />;
                    })}
                  </div>
                  <button onClick={() => onStartSession(cat.id)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 hover:text-teal-900">
                    Start session <ArrowRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs font-semibold text-stone-500 uppercase mb-2">All assessments</p>
        <AssessmentRowsList rows={buildUnifiedAssessmentRows(student, data, classAssessments, config)}
          onOpenSkillDetail={onOpenSkillDetail} onOpenClassAssessmentReport={onOpenClassAssessmentReport} onOpenFluencyDetail={onOpenFluencyDetail}
          emptyText="Nothing recorded yet for this student." />
      </div>
    </div>
  );
}

function AssessmentCellDetail({ assessment, student, subjectLabel, value, onSave, onClose }) {
  const [grade, setGrade] = useState(getResultGrade(value));
  const [note, setNote] = useState(getResultNote(value));

  const save = () => {
    if (!grade.trim() && !note.trim()) { onSave(null); return; }
    onSave(note.trim() ? { grade: grade.trim(), note: note.trim() } : grade.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-stone-800">{student.name}</p>
        <p className="text-xs text-stone-400 mb-4">{subjectLabel}{assessment.title ? ` · ${assessment.title}` : ""} · {assessment.date}</p>

        <label className="block text-xs font-medium text-stone-500 mb-1">Grade</label>
        <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 90%, Pass, B+" autoFocus
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

        <label className="block text-xs font-medium text-stone-500 mb-1">Note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Anything worth remembering about this result"
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-4" />

        <div className="flex gap-2">
          <button onClick={save} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Save</button>
          <button onClick={onClose} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Adaptive subject picker — pill buttons when the list is small (≤4), a plain dropdown once
// it grows past that, so the interface stays clean no matter how many subjects a school uses.
// value/onChange work with a subject id, matching how every current caller already tracks selection.
function SubjectPicker({ subjects, value, onChange, placeholder = "Select a subject" }) {
  if (subjects.length === 0) return null;
  if (subjects.length <= 4) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <button key={s.id} onClick={() => onChange(s.id === value ? null : s.id)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${value === s.id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
            {s.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
      <option value="">{placeholder}</option>
      {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

function ClassAssessmentForm({ roster, config, onCancel, onSave }) {
  const [subjectId, setSubjectId] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [results, setResults] = useState({});
  const [notes, setNotes] = useState({});
  const [noteOpenFor, setNoteOpenFor] = useState({});
  const [selectedIds, setSelectedIds] = useState(roster.map((s) => s.id)); // defaults to everyone, adjustable

  const allSelected = selectedIds.length === roster.length;
  const toggleStudent = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allSelected ? [] : roster.map((s) => s.id));
  const subjects = config?.subjects || [];
  const subjectLabel = subjects.find((s) => s.id === subjectId)?.label || null;

  const submit = () => {
    const filteredResults = {};
    selectedIds.forEach((id) => {
      const grade = (results[id] || "").trim();
      const note = (notes[id] || "").trim();
      if (!grade && !note) return; // nothing entered for this student — skip
      filteredResults[id] = note ? { grade, note } : grade;
    });
    onSave({ subjectId, title: title.trim(), date, results: filteredResults });
  };

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-5">Log an assessment</h1>

      <label className="block text-sm font-semibold text-stone-700 mb-1">Subject</label>
      {subjects.length === 0 ? (
        <p className="text-xs text-stone-400 mb-4">No subjects set up yet — add some in Settings first, or this will just be logged without one.</p>
      ) : (
        <div className="mb-4">
          <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} placeholder="Select a subject" />
        </div>
      )}

      <div className="md:flex md:gap-4 mb-4">
        <div className="flex-1 mb-4 md:mb-0">
          <label className="block text-sm font-semibold text-stone-700 mb-1">Occasion name (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={subjectLabel ? `e.g. ${subjectLabel} — mid-year check` : "e.g. Friday Parsha quiz"} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-stone-700">Who took this assessment?</label>
        <button onClick={toggleAll} className="text-xs font-semibold text-teal-700 hover:text-teal-900">{allSelected ? "Deselect all" : "Select all"}</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {roster.map((s) => {
          const sel = selectedIds.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggleStudent(s.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${sel ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
              {s.name}
            </button>
          );
        })}
      </div>

      <label className="block text-sm font-semibold text-stone-700 mb-2">Grades</label>
      {selectedIds.length === 0 && <p className="text-xs text-stone-400 mb-2">Select at least one student above.</p>}
      <div className="md:grid md:grid-cols-2 md:gap-x-4">
        {roster.filter((s) => selectedIds.includes(s.id)).map((s) => {
          const noteShown = !!noteOpenFor[s.id] || !!(notes[s.id] || "").trim();
          return (
            <div key={s.id} className="mb-2">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-stone-700">{s.name}</span>
                {!noteShown && (
                  <button onClick={() => setNoteOpenFor((prev) => ({ ...prev, [s.id]: true }))}
                    className="text-[11px] font-semibold text-stone-400 hover:text-teal-700">+ Note</button>
                )}
                <input value={results[s.id] || ""} onChange={(e) => setResults((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder="e.g. 90%, Pass, B+" className="w-32 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              </div>
              {noteShown && (
                <input value={notes[s.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder="Note — anything worth remembering about this result" autoFocus={!!noteOpenFor[s.id] && !notes[s.id]}
                  className="w-full mt-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs" />
              )}
            </div>
          );
        })}
      </div>
      <button onClick={submit} disabled={selectedIds.length === 0}
        className="w-full mt-4 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
        Save assessment
      </button>
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
  const subjects = config.subjects || [];
  config.categories.filter((c) => c.active !== false).forEach((cat) => {
    const total = cat.items.length;
    const mastered = cat.items.filter((it) => data.skills[skillKey(cat.id, it.id)]?.status === "mastered").length;
    const dates = cat.items.flatMap((it) => (data.skills[skillKey(cat.id, it.id)]?.history || []).map((h) => h.date));
    const lastDate = dates.length ? dates.sort().slice(-1)[0] : null;
    rows.push({
      key: `skill-${cat.id}`, sortDate: lastDate || "0000-00-00", type: "skill", catId: cat.id,
      left: cat.title, right: `${mastered}/${total} mastered`, sub: null, group: "Skill Categories", groupOrder: 9998,
    });
  });
  const myClassAssessments = (classAssessments || []).filter((ca) => ca.results && ca.results[student.id] !== undefined)
    .sort((a, b) => {
      const dateCompare = (b.date || "").localeCompare(a.date || ""); // newest date first
      if (dateCompare !== 0) return dateCompare;
      return (b.id || "").localeCompare(a.id || ""); // id starts with a timestamp — same-date ties still land newest-first
    });
  myClassAssessments.forEach((ca, i) => {
    // Match "prior" by subject when it's set (reliable across rounds even if titles differ or
    // are blank) — falls back to matching by title for assessments logged before subjects existed.
    const prior = ca.subjectId
      ? myClassAssessments.slice(i + 1).find((other) => other.subjectId === ca.subjectId)
      : myClassAssessments.slice(i + 1).find((other) => !other.subjectId && other.title === ca.title);
    const trend = prior ? gradeTrend(getResultGrade(prior.results[student.id]), getResultGrade(ca.results[student.id])) : null;
    const subjLabel = subjects.find((s) => s.id === ca.subjectId)?.label;
    const subjIdx = subjects.findIndex((s) => s.id === ca.subjectId);
    rows.push({
      key: `ca-${ca.id}`, sortDate: ca.date, type: "classAssessment", assessmentId: ca.id,
      left: ca.title ? `${ca.title} · ${ca.date}` : ca.date, right: getResultGrade(ca.results[student.id]),
      sub: trend ? { dir: trend.dir, text: trend.text } : null,
      group: subjLabel || "Other assessments", groupOrder: subjLabel ? subjIdx : 9997,
    });
  });
  (data.fluency || []).forEach((f, i) => {
    rows.push({
      key: `fl-${i}`, sortDate: f.date, type: "fluency", entry: f,
      left: `Fluency check · ${f.date}`, right: `${f.wordsRead} words · ${f.hesitation}`, sub: null, group: "Fluency Checks", groupOrder: 9999,
    });
  });
  rows.sort((a, b) => (a.sortDate < b.sortDate ? 1 : a.sortDate > b.sortDate ? -1 : 0));
  return rows;
}

function AssessmentRowsList({ rows, onOpenSkillDetail, onOpenClassAssessmentReport, onOpenFluencyDetail, emptyText }) {
  if (rows.length === 0) return <p className="text-xs text-stone-400">{emptyText || "No assessments yet."}</p>;
  const handleClick = (r) => {
    if (r.type === "skill") onOpenSkillDetail(r.catId);
    else if (r.type === "classAssessment") onOpenClassAssessmentReport(r.assessmentId);
    else if (r.type === "fluency") onOpenFluencyDetail(r.entry);
  };

  // Grouped by subject (classAssessments), plus Skill Categories and Fluency Checks as their
  // own groups — each group keeps the rows' original order (already most-recent-first).
  const groupMap = new Map();
  rows.forEach((r) => {
    const groupLabel = r.group || "Assessments";
    if (!groupMap.has(groupLabel)) groupMap.set(groupLabel, { label: groupLabel, order: r.groupOrder ?? 0, rows: [] });
    groupMap.get(groupLabel).rows.push(r);
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order);
  const showGroupHeaders = groups.length > 1;

  const renderRow = (r) => (
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
  );

  if (!showGroupHeaders) {
    return <ul className="space-y-1">{rows.map(renderRow)}</ul>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{g.label}</p>
          <ul className="space-y-1">{g.rows.map(renderRow)}</ul>
        </div>
      ))}
    </div>
  );
}

function ContactInfoSection({ student, onUpdateField, onUpdateParentEmail }) {
  return (
    <StudentContactFields student={student}
      onUpdateField={(id, field, value) => (field === "parentEmail" ? onUpdateParentEmail(value) : onUpdateField(field, value))} />
  );
}

function StudentDetailView({ student, data, incidents, classAssessments, config, onBack, onAcknowledge, onLogIncident, onLogPeriodAttendance, onGoToAssessments, onExportReport, onDraftMessage, onUpdateParentEmail, onUpdateField, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, onOpenIncidentDetail, onFetchCrossClassHistory, currentClassName }) {
  const [showContact, setShowContact] = useState(false);
  const viewportHeight = useVisualViewportHeight();
  const [showCrossClass, setShowCrossClass] = useState(false);
  const [crossClassData, setCrossClassData] = useState(null);
  const [crossClassLoading, setCrossClassLoading] = useState(false);
  const flags = getFlags(data, student.id, incidents, config);
  const catMap = {};
  config.incidents.categories.forEach((c) => (catMap[c.id] = c));
  const myIncidents = (incidents || []).filter((i) => i.studentIds?.includes(student.id)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const attendanceHistory = [...(data.attendance || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const individualPointCats = (config.points?.categories || []).filter((c) => c.scope === "individual");

  const openCrossClass = async () => {
    setShowCrossClass(true);
    if (crossClassData) return; // already fetched this visit
    setCrossClassLoading(true);
    const result = await onFetchCrossClassHistory(student.id);
    setCrossClassData(result);
    setCrossClassLoading(false);
  };

  return (
    <div className={PAGE}>
      <div className={`content-shift ${showContact ? "open" : ""}`}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={onBack} className="flex items-center text-stone-500 text-sm hover:text-stone-800"><ChevronLeft size={16} /> Home</button>
          <button onClick={() => setShowContact(true)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">
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
                      <button onClick={() => onDraftMessage(f)} className="flex items-center gap-1 text-xs whitespace-nowrap bg-teal-700 text-white rounded-md px-2 py-1 hover:bg-teal-800">
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
          <button onClick={onGoToAssessments} className="flex-1 flex items-center justify-center gap-2 bg-teal-50 text-teal-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-100">
            <BookOpen size={16} /> Assessments
          </button>
          <button onClick={onLogIncident} className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-rose-100">
            <ClipboardList size={16} /> Log incident
          </button>
          <button onClick={onLogPeriodAttendance} className="flex-1 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-amber-100">
            <Calendar size={16} /> Period attendance
          </button>
          <button onClick={onExportReport} className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-stone-200">
            <Printer size={16} /> Export report
          </button>
        </div>

        <div className="mb-6 md:w-full bg-violet-50 border border-violet-200 rounded-xl p-3">
          {!showCrossClass ? (
            <button onClick={openCrossClass} className="text-sm font-semibold text-violet-800 flex items-center gap-2">
              <BookOpen size={15} /> See this student's history from other classes
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-violet-900">History across classes</p>
                <button onClick={() => setShowCrossClass(false)} className="text-xs text-violet-600 hover:text-violet-800">Hide</button>
              </div>
              {crossClassLoading && <p className="text-xs text-violet-700 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Checking every class...</p>}
              {crossClassData && (
                <>
                  <p className="text-xs text-violet-700 mb-2">
                    Enrolled in: {crossClassData.classes.map((c) => `${c.className}${c.className === currentClassName ? " (this class)" : ""}`).join(", ") || "no classes found"}
                  </p>
                  <p className="text-xs font-semibold text-violet-800 uppercase mt-3 mb-1">Incidents, all classes</p>
                  {crossClassData.incidents.length === 0 && <p className="text-xs text-violet-600">None logged anywhere.</p>}
                  <ul className="space-y-1 mb-2">
                    {crossClassData.incidents.map((inc) => (
                      <li key={inc.id} className="text-xs bg-white border border-violet-100 rounded-lg px-2 py-1.5">
                        {inc.flaggedForAdmin && <Flag size={12} className="inline text-rose-600 fill-rose-600 mr-1 -mt-0.5" />}
                        <span className="font-semibold text-violet-900">{inc.sourceClassName}</span>
                        <span className="text-stone-400"> · {inc.date} · {inc.categoryLabel}</span>
                        {inc.description && <p className="text-stone-600 mt-0.5">{inc.description}</p>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-violet-800 uppercase mt-3 mb-1">Period attendance, all classes</p>
                  {crossClassData.periodAttendance.length === 0 && <p className="text-xs text-violet-600">None logged anywhere.</p>}
                  <ul className="space-y-1 mb-2">
                    {crossClassData.periodAttendance.map((pa) => (
                      <li key={pa.id} className="text-xs bg-white border border-violet-100 rounded-lg px-2 py-1.5">
                        <span className="font-semibold text-violet-900">{pa.sourceClassName}</span>
                        <span className="text-stone-400"> · {pa.date} {formatTime12h(pa.time)} · {pa.typeLabel}{pa.minutesLate ? ` · ${pa.minutesLate} min late` : ""}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs font-semibold text-violet-800 uppercase mt-3 mb-1">Points, all classes</p>
                  {crossClassData.points.length === 0 && <p className="text-xs text-violet-600">None earned anywhere yet.</p>}
                  <ul className="space-y-1 mb-2">
                    {crossClassData.points.map((p, i) => (
                      <li key={i} className="text-xs bg-white border border-violet-100 rounded-lg px-2 py-1.5">
                        <span className="font-semibold text-violet-900">{p.sourceClassName}</span>
                        <span className="text-stone-400"> · {p.categoryLabel}: </span>
                        <span className="font-semibold text-stone-700">{p.value}{p.threshold ? ` / ${p.threshold}` : ""}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs font-semibold text-violet-800 uppercase mt-3 mb-1">Assessment activity, all classes</p>
                  {crossClassData.assessments.length === 0 && <p className="text-xs text-violet-600">None logged anywhere yet.</p>}
                  <ul className="space-y-1">
                    {crossClassData.assessments.map((a) => (
                      <li key={`${a.sourceClassName}-${a.key}`} className="text-xs bg-white border border-violet-100 rounded-lg px-2 py-1.5">
                        <span className="font-semibold text-violet-900">{a.sourceClassName}</span>
                        <span className="text-stone-400"> · {a.left}: </span>
                        <span className="font-semibold text-stone-700">{a.right}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
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
                        {a.time && <span className="text-stone-400">{formatTime12h(a.time)}</span>}
                        <span className={`px-2 py-0.5 rounded-full font-semibold bg-${st?.color || "stone"}-100 text-${st?.color || "stone"}-700`}>{st?.label || a.status}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>

            {config.homework?.enabled && (
              <Section title="Homework history">
                {(data.homework || []).length === 0 && <p className="text-xs text-stone-400">No homework logged yet.</p>}
                <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                  {[...(data.homework || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).map((h) => (
                    <li key={h.date} className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">{h.date}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${h.status === "completed" ? "bg-emerald-100 text-emerald-700" : h.status === "missed" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-500"}`}>
                        {h.status === "completed" ? "✅ Done" : h.status === "missed" ? "❌ Missing" : "No homework"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Period attendance">
              <p className="text-[10px] text-stone-400 mb-2">Separate from morning attendance — mid-day changes only.</p>
              {(data.periodAttendance || []).length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {(data.periodAttendance || []).map((pa) => {
                  const t = config.periodAttendance.types.find((x) => x.id === pa.typeId);
                  const periodLabel = pa.periodId ? getAllPeriodsEverywhere(config).find((p) => p.id === pa.periodId)?.label : null;
                  return (
                    <li key={pa.id} className="text-xs border-l-2 border-stone-200 pl-2 py-0.5">
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${t?.color || "stone"}-100 text-${t?.color || "stone"}-700`}>
                        {t?.label || pa.typeId}
                      </span>
                      <span className="text-stone-400">{pa.date} {formatTime12h(pa.time)}{periodLabel ? ` · ${periodLabel}` : ""}{pa.minutesLate ? ` · ${pa.minutesLate} min late` : ""}</span>
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
                    <button onClick={() => onOpenIncidentDetail(inc.id)}
                      className={`w-full text-left border-l-2 pl-2 py-1 hover:bg-stone-50 rounded-r-lg ${inc.flaggedForAdmin ? "border-rose-400" : "border-stone-200"}`}>
                      <div className="flex items-center justify-between">
                        <span>
                          {inc.flaggedForAdmin && <Flag size={11} className="inline text-rose-600 fill-rose-600 mr-1 -mt-0.5" />}
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
        style={{ position: "fixed", top: 0, right: 0, height: viewportHeight, zIndex: 40, transform: showContact ? "translateX(0)" : "translateX(100%)", transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
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

// Looks at the last 3 reflections (including the one just saved) for any subject marked
// "behind" in all three — a soft, recommendation-only nudge, never an alert or a grade.
function detectReflectionPatterns(allReflections, currentEntry) {
  const suggestions = [];
  const merged = [...allReflections.filter((r) => r.monthKey !== currentEntry.monthKey), currentEntry];
  const sorted = merged.sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));
  const idx = sorted.findIndex((r) => r.monthKey === currentEntry.monthKey);
  if (idx < 2) return suggestions;
  const lastThree = sorted.slice(idx - 2, idx + 1);
  (currentEntry.subjects || []).forEach((subj) => {
    if (subj.pace !== "behind" || !subj.name.trim()) return;
    const name = subj.name.trim().toLowerCase();
    const allBehind = lastThree.every((r) => (r.subjects || []).some((s) => s.name.trim().toLowerCase() === name && s.pace === "behind"));
    if (allBehind) suggestions.push(subj.name);
  });
  return suggestions;
}

const MOOD_OPTIONS = [
  { id: "great", emoji: "😊", label: "Great" },
  { id: "good", emoji: "🙂", label: "Good" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "challenging", emoji: "😕", label: "Challenging" },
  { id: "very-challenging", emoji: "😫", label: "Very challenging" },
];
const BEHIND_REASONS = [
  { id: "not-enough-time", label: "Not enough time" },
  { id: "students-need-review", label: "Students need review" },
  { id: "students-below-level", label: "Students below level" },
  { id: "holidays", label: "Holidays" },
  { id: "materials", label: "Materials" },
  { id: "other", label: "Other" },
];
const BENCHMARK_ACTIONS = [
  { id: "move-benchmark", label: "Move benchmark" },
  { id: "adjust-benchmark", label: "Adjust benchmark" },
  { id: "add-review", label: "Add review" },
  { id: "other", label: "Other" },
];

function MonthlyReflectionForm({ monthKey, existing, allReflections, onSave, onBack }) {
  const [subjects, setSubjects] = useState(existing?.subjects || [{ name: "", pace: "on-pace", behindReason: "" }]);
  const [benchmarksCompleted, setBenchmarksCompleted] = useState(existing?.benchmarksCompleted || "yes");
  const [benchmarksAction, setBenchmarksAction] = useState(existing?.benchmarksAction || "");
  const [wentWell, setWentWell] = useState(existing?.wentWell || "");
  const [shouldImprove, setShouldImprove] = useState(existing?.shouldImprove || "");
  const [greatProgressStudents, setGreatProgressStudents] = useState(existing?.greatProgressStudents || "");
  const [needsSupportStudents, setNeedsSupportStudents] = useState(existing?.needsSupportStudents || "");
  const [mood, setMood] = useState(existing?.mood || "");
  const [saved, setSaved] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const updateSubject = (i, field, value) => setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  const addSubject = () => setSubjects((prev) => [...prev, { name: "", pace: "on-pace", behindReason: "" }]);
  const removeSubject = (i) => setSubjects((prev) => prev.filter((_, idx) => idx !== i));

  const [monthName] = useState(() => new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" }));

  const save = () => {
    const entry = {
      monthKey, date: todayISO(), subjects: subjects.filter((s) => s.name.trim()),
      benchmarksCompleted, benchmarksAction: benchmarksCompleted !== "yes" ? benchmarksAction : "",
      wentWell, shouldImprove, greatProgressStudents, needsSupportStudents, mood,
    };
    onSave(entry);
    setSuggestions(detectReflectionPatterns(allReflections, entry));
    setSaved(true);
  };

  if (saved) {
    return (
      <div className={PAGE}>
        <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
        <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Saved — {monthName}</h1>
        <p className="text-stone-500 text-sm mb-5">This stays private to you, not shared with administration automatically.</p>
        {suggestions && suggestions.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 md:w-[28rem]">
            <p className="text-sm font-semibold text-violet-900 mb-2">A pattern worth noticing</p>
            {suggestions.map((subj) => (
              <p key={subj} className="text-sm text-violet-800 mb-2">
                <strong>{subj}</strong> has been marked behind for 3 reflections in a row. Worth considering: review pacing, review benchmarks, add instructional time, or bring it up at your next coaching meeting. Just a recommendation — you know your class best.
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Monthly reflection — {monthName}</h1>
      <p className="text-stone-500 text-sm mb-5">A few minutes, just for you. This is about reflecting, not evaluating yourself.</p>

      <div className="md:w-[30rem] space-y-5">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">How's pacing, by subject?</label>
          {subjects.map((s, i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-lg p-2.5 mb-2">
              <div className="flex gap-2 mb-2">
                <input value={s.name} onChange={(e) => updateSubject(i, "name", e.target.value)} placeholder="Subject (e.g. Chumash)" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                <ConfirmDelete onConfirm={() => removeSubject(i)} size={13} />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[["on-pace", "On pace"], ["slightly-behind", "Slightly behind"], ["behind", "Behind"]].map(([id, label]) => (
                  <button key={id} onClick={() => updateSubject(i, "pace", id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.pace === id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {s.pace !== "on-pace" && (
                <select value={s.behindReason} onChange={(e) => updateSubject(i, "behindReason", e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs bg-white">
                  <option value="">Why? (optional)</option>
                  {BEHIND_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              )}
            </div>
          ))}
          <button onClick={addSubject} className="text-xs font-semibold text-teal-700 flex items-center gap-1"><Plus size={12} /> Add subject</button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Were benchmarks completed this month?</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[["yes", "Yes"], ["partially", "Partially"], ["no", "No"]].map(([id, label]) => (
              <button key={id} onClick={() => setBenchmarksCompleted(id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${benchmarksCompleted === id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {label}
              </button>
            ))}
          </div>
          {benchmarksCompleted !== "yes" && (
            <select value={benchmarksAction} onChange={(e) => setBenchmarksAction(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
              <option value="">What's the plan? (optional)</option>
              {BENCHMARK_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">What went well?</label>
          <textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">What should improve?</label>
          <textarea value={shouldImprove} onChange={(e) => setShouldImprove(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Who made great progress?</label>
          <textarea value={greatProgressStudents} onChange={(e) => setGreatProgressStudents(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Who needs additional support?</label>
          <textarea value={needsSupportStudents} onChange={(e) => setNeedsSupportStudents(e.target.value)} rows={2} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Overall, how was this month?</label>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button key={m.id} onClick={() => setMood(m.id)} title={m.label}
                className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center border-2 ${mood === m.id ? "border-teal-600 bg-teal-50" : "border-transparent"}`}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">Save reflection</button>
        <p className="text-[10px] text-stone-400 text-center">Private by default — not automatically shared with administration.</p>
      </div>
    </div>
  );
}

function ReflectionHistoryView({ reflections, onOpenMonth, onBack, navigate }) {
  const sorted = [...reflections].sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
  const now = new Date();
  const thisMonthKey = monthKey(now.getFullYear(), now.getMonth());
  const hasThisMonth = reflections.some((r) => r.monthKey === thisMonthKey);
  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Your monthly reflections</h1>
      <p className="text-stone-500 text-sm mb-4">Private to you — a place to look back, not a report card.</p>
      <button onClick={() => onOpenMonth(thisMonthKey)} className="mb-5 flex items-center gap-2 bg-violet-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-violet-800">
        <Plus size={15} /> {hasThisMonth ? "Edit this month's reflection" : "Start this month's reflection"}
      </button>
      {sorted.length === 0 && <p className="text-sm text-stone-400">No reflections saved yet.</p>}
      <div className="space-y-2 md:w-96">
        {sorted.map((r) => {
          const mood = MOOD_OPTIONS.find((m) => m.id === r.mood);
          const monthName = new Date(`${r.monthKey}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
          const behindSubjects = (r.subjects || []).filter((s) => s.pace !== "on-pace").map((s) => s.name);
          return (
            <button key={r.monthKey} onClick={() => onOpenMonth(r.monthKey)} className="w-full text-left bg-white border border-stone-200 rounded-xl p-3 hover:border-teal-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800 text-sm">{monthName}</span>
                {mood && <span className="text-xl">{mood.emoji}</span>}
              </div>
              {behindSubjects.length > 0 && <p className="text-xs text-stone-400 mt-1">Behind pace: {behindSubjects.join(", ")}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CommunicationListView({ roster, studentData, navigate, openStudent }) {
  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="communication" navigate={navigate} />

      <button onClick={() => navigate("class-announcement")} className="w-full mb-3 flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">
        <Mail size={16} /> Message the whole class
      </button>

      <div className="flex flex-col md:flex-row gap-2 mb-5">
        <button onClick={() => navigate("monthly-reports")} className="flex-1 md:w-80 flex items-center justify-center gap-2 bg-white text-teal-700 border border-teal-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-50">
          <Mail size={16} /> Generate monthly reports
        </button>
        <button onClick={() => navigate("range-report")} className="flex-1 md:w-80 flex items-center justify-center gap-2 bg-white text-teal-700 border border-teal-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-50">
          <Calendar size={16} /> Custom date range report
        </button>
      </div>
      <button onClick={() => navigate("reflection-history")} className="mb-5 flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
        <BookOpen size={15} /> Your monthly reflections (private)
      </button>

      {roster.length === 0 && <p className="text-stone-400 text-sm text-center py-10">Add students from Settings first.</p>}
      <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
        {roster.map((s) => {
          const count = (studentData[s.id]?.communications || []).length;
          const lastEntry = (studentData[s.id]?.communications || [])[0];
          return (
            <li key={s.id} onClick={() => openStudent(s.id)} className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between cursor-pointer hover:border-teal-300">
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

function ToolsView({ schoolTools, navigate }) {
  const tools = (schoolTools || []).filter((t) => t.category !== "resource");
  const resources = (schoolTools || []).filter((t) => t.category === "resource");

  const ToolCard = ({ t }) => (
    <a href={t.url} target="_blank" rel="noopener noreferrer"
      className="block bg-white border border-stone-200 rounded-xl p-3 hover:border-teal-300">
      <p className="text-sm font-semibold text-stone-800">{t.label}</p>
      {t.description && <p className="text-xs text-stone-400 mt-0.5">{t.description}</p>}
    </a>
  );

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="tools" navigate={navigate} />

      {tools.length === 0 && resources.length === 0 ? (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-6 text-center">Nothing added yet — your admin can add tools and shared files from the admin dashboard.</p>
      ) : (
        <>
          {tools.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Tools</p>
              <div className="grid gap-2 md:grid-cols-2">
                {tools.map((t) => <ToolCard key={t.id} t={t} />)}
              </div>
            </div>
          )}
          {resources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Shared files &amp; folders</p>
              <div className="grid gap-2 md:grid-cols-2">
                {resources.map((t) => <ToolCard key={t.id} t={t} />)}
              </div>
            </div>
          )}
        </>
      )}
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

      <button onClick={() => setShowForm((v) => !v)} className="w-full md:w-96 mb-4 flex items-center justify-center gap-2 bg-teal-50 text-teal-800 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-100">
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
          <button onClick={submit} className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Save entry</button>
        </div>
      )}

      {entries.length === 0 && <p className="text-stone-400 text-sm">No communication logged yet.</p>}
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="bg-white rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${e.type === "automated" ? "bg-teal-100 text-teal-700" : "bg-stone-100 text-stone-600"}`}>
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
function formatTime12h(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return hhmm || "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// The single earliest-starting period across the class's schedule(s) — used to decide
// whether a "specific periods" student's morning is actually covered by their assignment.
// Full-time (or a locally-created student with no scope set at all) always gets morning
// attendance, matching how the app always worked. Part-time students never do, since there's
// no period data to confirm they're even there first thing. Specific-periods students only
// get it if one of their assigned periods is the actual first period of THIS date's schedule —
// different weekdays can now run different schedules, so "first period" isn't one fixed thing.
// Whether homework tracking is actually active for this specific date — not just whether the
// feature is enabled overall. In weekly mode, it's only active on the one chosen collection
// day; other days shouldn't show the homework UI at all, since nothing is due that day.
function homeworkAppliesToday(config, dateStr) {
  if (!config.homework?.enabled) return false;
  if (config.homework.frequency !== "weekly") return true;
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === (config.homework.collectionDay ?? 1);
}

function morningAttendanceApplies(student, date, dayType, config, plannerDays) {
  const scope = student.enrollmentScope;
  if (!scope || scope === "full-time") return true;
  if (scope === "part-time") return false;
  if (scope === "periods") {
    const periods = getScheduleForDate(date, dayType, config, plannerDays) || [];
    if (periods.length === 0) return false;
    const firstId = periods.reduce((earliest, p) => (!earliest || p.startTime < earliest.startTime ? p : earliest), null)?.id;
    return firstId ? (student.enrollmentPeriodIds || []).includes(firstId) : false;
  }
  return true;
}

// Points/rewards: full-time always participates by default. Non-full-time students default
// to participating too, UNLESS the teacher has explicitly turned it off for that student —
// this is a per-student teacher choice, not an automatic rule.
function participatesInPoints(student) {
  return student.participatesInPoints !== false;
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
        if (times.length) line += ` (arrived at ${times.map(formatTime12h).join(", ")})`;
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

async function generateHybridReport(student, label, facts, config, teacherName) {
  const sections = [];
  if (facts.attendanceLines) sections.push(`ATTENDANCE (${label}):\n${facts.attendanceLines.map((l) => `- ${l}`).join("\n")}`);
  if (facts.incidentLines) sections.push(`INCIDENTS (${label}):\n${facts.incidentLines.map((l) => `- ${l}`).join("\n")}`);
  if (facts.assessmentLines && facts.assessmentLines.length > 0) sections.push(`ASSESSMENT ACTIVITY (${label}):\n${facts.assessmentLines.map((l) => `- ${l}`).join("\n")}`);

  if (sections.length === 0) return "Nothing was logged for this student in the selected sections for this period.";

  const prompt = `${buildStyleInstructions(config, teacherName)}

This one covers ${label}.

STRICT RULES:
- Use ONLY the facts listed below. Do not add, infer, guess, or embellish any detail not explicitly present.
- Do not mention any topic (attendance, incidents, assessments) that has no section below — if a section is missing, that topic did not happen or was not tracked this month, so say nothing about it.
- Keep every number exact as given.
- Do not compare to other students or to class averages.
- Do not invent reasons behind any number (e.g. do not guess why a student was late).

Student: ${student.name}

${sections.join("\n\n")}

Write 2-3 short paragraphs weaving the exact figures above into natural sentences. Output only the message text, nothing else.`;

  console.log(`[generateHybridReport] prompt for ${student.name} (${label}): ${prompt.length} chars, ${sections.length} section(s)`);

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });

  if (!response.ok) {
    let bodyText = "";
    try { bodyText = await response.text(); } catch { /* body already consumed or unreadable */ }
    console.error(`[generateHybridReport] API error for ${student.name}: HTTP ${response.status} ${response.statusText}`, bodyText);
    console.error("[generateHybridReport] full prompt that triggered the error:", prompt);
    throw new Error(`Report generation failed: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  if (!text) {
    console.error(`[generateHybridReport] Empty text in successful response for ${student.name}. Raw response:`, JSON.stringify(data));
    console.error("[generateHybridReport] full prompt that produced an empty response:", prompt);
  }
  return applyMessageDisclaimer(text, config);
}

function MonthlyReportsView({ roster, studentData, incidents, classAssessments, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail }) {
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
      const text = await generateHybridReport(student, label, facts, config, loggedInTeacher?.name);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    } catch (err) {
      console.error("Monthly report generation failed:", err);
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
        <button onClick={generateAll} className="ml-auto text-xs font-semibold bg-teal-700 text-white rounded-lg px-3 py-2 hover:bg-teal-800">Generate all</button>
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
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-teal-700" size={16} />}
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
                    <MailActionButtons email={r.email} subject={`Monthly report — ${label}`} body={r.draft} size="small" />
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

function CustomRangeReportView({ roster, studentData, incidents, classAssessments, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail }) {
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
      const text = await generateHybridReport(student, label, facts, config, loggedInTeacher?.name);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, dataUsed, email: student.parentEmail || "", logged: false, showData: false } }));
    } catch (err) {
      console.error("Custom date range report generation failed:", err);
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
        <button onClick={generateAll} className="ml-auto text-xs font-semibold bg-teal-700 text-white rounded-lg px-3 py-2 hover:bg-teal-800">Generate all</button>
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
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-teal-700" size={16} />}
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
                    <MailActionButtons email={r.email} subject={`Report — ${label}`} body={r.draft} size="small" />
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

async function generateAssessmentReport(student, assessment, grade, config, teacherName) {
  const subjLabel = (config?.subjects || []).find((s) => s.id === assessment.subjectId)?.label;
  const assessmentLabel = subjLabel && assessment.title ? `${subjLabel} — ${assessment.title}` : subjLabel || assessment.title || "Untitled assessment";
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is about one specific assessment.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context, comparisons, or reasons for the result.
- Report the grade exactly as given, do not reinterpret or convert it.

Student: ${student.name}
Assessment: ${assessmentLabel}
Date: ${assessment.date}
Result: ${grade}

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

function AssessmentReportView({ assessment, roster, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail }) {
  const [reports, setReports] = useState({});
  const students = roster.filter((s) => assessment.results && assessment.results[s.id] !== undefined);
  const subjLabel = (config?.subjects || []).find((s) => s.id === assessment.subjectId)?.label;
  const assessmentLabel = subjLabel && assessment.title ? `${subjLabel} — ${assessment.title}` : subjLabel || assessment.title || "Untitled assessment";

  const generateOne = async (student) => {
    const grade = assessment.results[student.id];
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    try {
      const text = await generateAssessmentReport(student, assessment, grade, config, loggedInTeacher?.name);
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: text, email: student.parentEmail || "", logged: false } }));
    } catch {
      setReports((prev) => ({ ...prev, [student.id]: { loading: false, draft: `${assessmentLabel} (${assessment.date}): ${grade}`, email: student.parentEmail || "", logged: false } }));
    }
  };
  const generateAll = async () => { for (const s of students) await generateOne(s); };

  const logSent = (student) => {
    const r = reports[student.id];
    if (!r) return;
    onLogSent(student.id, { date: todayISO(), channel: "email", type: "automated", source: "assessment-report", subject: `${assessmentLabel} — Report`, body: r.draft });
    setReports((prev) => ({ ...prev, [student.id]: { ...prev[student.id], logged: true } }));
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Assessments</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">{assessmentLabel}</h1>
      <p className="text-xs text-stone-400 mb-4">{assessment.date} — reports use only this assessment's result, nothing else.</p>
      <button onClick={generateAll} className="mb-4 text-xs font-semibold bg-teal-700 text-white rounded-lg px-3 py-2 hover:bg-teal-800">Generate all</button>

      <div className="space-y-3">
        {students.map((s) => {
          const r = reports[s.id];
          const grade = assessment.results[s.id];
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-800 text-sm">{s.name} <span className="text-stone-400 font-normal">— {grade}</span></span>
                {!r && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">Generate report</button>}
                {r?.loading && <Loader2 className="animate-spin text-teal-700" size={16} />}
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
                    <MailActionButtons email={r.email} subject={`${assessmentLabel} — Report`} body={r.draft} size="small" />
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

function SkillCategoryReportView({ category, roster, studentData, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail, onStartClassSession }) {
  const [reports, setReports] = useState({});
  const [sessionDate, setSessionDate] = useState(todayISO());
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
      const text = await generateSkillReport(student, category, summaryLines, config, loggedInTeacher?.name);
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

      <div className="flex flex-wrap items-end gap-2 mb-5 bg-teal-50 border border-teal-200 rounded-xl p-3">
        <div>
          <label className="block text-[10px] text-stone-400 mb-0.5">Session date</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white" />
        </div>
        <button onClick={() => onStartClassSession(category.id, sessionDate)} className="flex items-center gap-2 bg-teal-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-teal-800">
          <BookOpen size={15} /> Start class session
        </button>
        <p className="text-[10px] text-stone-400 w-full">Goes through every student one after another for this date — you can still test one student at a time from their own page instead.</p>
      </div>

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
                {!r && hasHistory && <button onClick={() => generateOne(s)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">Generate report</button>}
                {!hasHistory && <span className="text-xs text-stone-400">No results yet</span>}
                {r?.loading && <Loader2 className="animate-spin text-teal-700" size={16} />}
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
                    <MailActionButtons email={r.email} subject={`${category.title} — Progress note`} body={r.draft} size="small" />
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

async function generateFluencyReport(student, entry, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is about one specific reading fluency check.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context, comparisons, or reasons for the result.

Student: ${student.name}
Date: ${entry.date}
Words read: ${entry.wordsRead}
Hesitation level: ${entry.hesitation}
Mode: ${entry.mode === "automatic" ? "reading automatically" : "still decoding letter-by-letter"}
${entry.notes ? `Teacher's note: ${entry.notes}` : ""}

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

function FluencyDetailView({ student, entry, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);

  const generate = async () => {
    setLoading(true);
    try { setDraft(await generateFluencyReport(student, entry, config, loggedInTeacher?.name)); }
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
        <button onClick={generate} disabled={loading} className="flex items-center gap-2 bg-teal-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
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
            <MailActionButtons email={email} subject={`Fluency check — ${entry.date}`} body={draft} />
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

async function generateSkillReport(student, category, summaryLines, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is about a specific skill area.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context or reasons.

Student: ${student.name}
Skill area: ${category.title}
Recent results:
${summaryLines.map((l) => `- ${l}`).join("\n")}

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

function GrowthChart({ timeline, color }) {
  if (timeline.length < 2) {
    return <p className="text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-lg px-3 py-4 text-center mb-5">Needs at least 2 dated sessions to show a growth chart — only {timeline.length} so far.</p>;
  }
  const colorHex = { emerald: "#2e7d5b", amber: "#b7791f", rose: "#c0362c", indigo: "#7c4a52", sky: "#5f5840", stone: "#6f6659", violet: "#705a3c", teal: "#0e6e62", fuchsia: "#9c5519", slate: "#453f36" }[color] || "#453f36";
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3 mb-5 md:w-[28rem]" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7dfcf" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6f6659" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6f6659" }} />
          <Tooltip formatter={(value, name) => [`${value}%`, "Score"]} labelFormatter={(l) => `Session: ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Line type="monotone" dataKey="score" stroke={colorHex} strokeWidth={2.5} dot={{ r: 4, fill: colorHex }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SkillDetailView({ student, data, category, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail }) {
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

  const timeline = computeSessionTimeline(data, category, config);

  const generate = async () => {
    setLoading(true);
    try { setDraft(await generateSkillReport(student, category, summaryLines, config, loggedInTeacher?.name)); }
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

      <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Growth in {category.title} only</p>
      <GrowthChart timeline={timeline} color={category.color || "slate"} />

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96 max-h-64 overflow-y-auto">
        {summaryLines.length === 0 && <p className="text-xs text-stone-400">No results recorded yet.</p>}
        <ul className="space-y-1.5">
          {summaryLines.map((l, i) => <li key={i} className="text-sm text-stone-700">{l}</li>)}
        </ul>
      </div>

      {!draft ? (
        <button onClick={generate} disabled={loading || summaryLines.length === 0} className="flex items-center gap-2 bg-teal-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
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
            <MailActionButtons email={email} subject={`${category.title} — Progress note`} body={draft} />
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

async function generateIncidentMessage(student, incident, categoryLabel, othersInvolved, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is about a specific classroom incident — keep it non-alarming regardless of tone.

STRICT RULES:
- Use ONLY the facts given below. Do not invent context or reasons beyond what's stated.
- If other students were involved, you may mention that others were involved without naming them (never name other students to this parent).

Student: ${student.name}
Date: ${incident.date}
Category: ${categoryLabel}
Description: ${incident.description || "(no additional description given)"}
${othersInvolved > 0 ? `Other students involved: ${othersInvolved}` : "No other students involved."}

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

// A class-wide announcement — not addressed to one student's parent, but to every parent in the
// class at once — for celebrating a benchmark segment the whole class just finished together.
async function generateSegmentCelebrationMessage(subjectLabel, segmentLabel, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is a class-wide announcement to every parent at once, not about one specific student — the whole class just finished something together.

STRICT RULES:
- Use ONLY the facts given below. Do not invent details about how it went or who did well.
- Write it as a general class announcement, not addressed to any one child.

Subject: ${subjectLabel}
What the class just completed: ${segmentLabel}

Write 2-3 sentences announcing this accomplishment to the class's families. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

// A general-purpose class-wide announcement — the teacher gives a rough topic in their own
// words, and this turns it into a polished, formal notice to every parent at once. Deliberately
// pushes toward a more formal register than buildStyleInstructions' usual tone setting, since a
// broadcast announcement to the whole class reads differently than a warm note about one child —
// while still keeping the class's school-term wording and sign-off consistent with everything else.
async function generateClassAnnouncementMessage(topic, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is a class-wide announcement going out to every parent at once — not about any one student. Regardless of the tone described above, write this specific message in a formal, official register appropriate for a broadcast notice — clear, businesslike, no casual phrasing — since this is what parents expect from an official class-wide notice.

STRICT RULES:
- Use ONLY the information given below. Do not invent specifics (times, amounts, locations) that weren't stated.
- If the topic is vague or missing a detail, write around it naturally rather than inventing one.

What this announcement is about, in the teacher's own words: ${topic}

Write a short, clear announcement — 2-4 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

const REPORT_SECTIONS = [
  { id: "attendance", label: "Attendance history" },
  { id: "homework", label: "Homework log" },
  { id: "incidents", label: "Incidents" },
  { id: "skills", label: "Skill assessments" },
  { id: "classAssessments", label: "Class assessments" },
  { id: "fluency", label: "Fluency checks" },
  { id: "contact", label: "Parent & contact info" },
];

function PrintReportOptionsView({ student, onBack, onGenerate }) {
  const [selected, setSelected] = useState(REPORT_SECTIONS.map((s) => s.id)); // everything, by default — "a full student report"
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = selected.length === REPORT_SECTIONS.length;

  if (!student) {
    return (
      <div className={PAGE}>
        <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
        <p className="text-sm text-stone-400">This student could not be found.</p>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Export report</h1>
      <p className="text-stone-500 text-sm mb-5">{student.name} — pick what to include, or leave everything checked for a full report.</p>
      <div className="md:w-96">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-stone-700">Include</label>
          <button onClick={() => setSelected(allSelected ? [] : REPORT_SECTIONS.map((s) => s.id))} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="space-y-1.5 mb-6">
          {REPORT_SECTIONS.map((s) => (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left ${selected.includes(s.id) ? "bg-teal-50 border-teal-300" : "bg-white border-stone-300"}`}>
              <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${selected.includes(s.id) ? "bg-teal-700 border-teal-700" : "border-stone-300"}`}>
                {selected.includes(s.id) && <Check size={11} className="text-white" />}
              </span>
              <span className={`text-sm font-medium ${selected.includes(s.id) ? "text-teal-800" : "text-stone-600"}`}>{s.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => onGenerate(selected)} disabled={selected.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          <Printer size={16} /> Generate report
        </button>
      </div>
    </div>
  );
}

function PrintableStudentReport({ student, data, incidents, classAssessments, config, sections, currentClassName, onBack }) {
  useEffect(() => { if (student) document.title = `${student.name} — Report`; }, [student]); // becomes the suggested filename in most browsers' Save-as-PDF dialog

  if (!student) {
    return (
      <div className={PAGE}>
        <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
        <p className="text-sm text-stone-400">This student could not be found.</p>
      </div>
    );
  }

  const attStatusMap = {}; (config.attendance?.statuses || []).forEach((s) => (attStatusMap[s.id] = s.label));
  const incCatMap = {}; (config.incidents?.categories || []).forEach((c) => (incCatMap[c.id] = c.label));
  const myIncidents = (incidents || []).filter((i) => (i.studentIds || []).includes(student.id)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const activeSkillCats = (config.categories || []).filter((c) => c.active !== false);
  const subjectLabel = (id) => (config.subjects || []).find((s) => s.id === id)?.label || "No subject";
  const myClassAssessments = (classAssessments || []).filter((ca) => ca.results && ca.results[student.id] !== undefined);

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 px-4 text-sm font-semibold hover:bg-teal-800">
          <Printer size={16} /> Print / Save as PDF
        </button>
        <p className="text-xs text-stone-400">Opens your browser's print dialog — choose "Save as PDF" there for a file.</p>
      </div>

      {/* On-screen preview, roughly matching the printed layout */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 md:w-[40rem]">
        <h2 className="display-font text-lg font-bold text-stone-900">{student.name}</h2>
        <p className="text-xs text-stone-400 mb-4">{currentClassName ? `${currentClassName} · ` : ""}Generated {todayISO()}</p>
        {sections.map((id) => <p key={id} className="text-xs text-stone-500 mb-1">✓ {REPORT_SECTIONS.find((s) => s.id === id)?.label}</p>)}
        <p className="text-xs text-stone-400 mt-4">This is a quick preview — click "Print / Save as PDF" above to see the full formatted report.</p>
      </div>

      {/* The actual print output — invisible on screen, only rendered when printing */}
      <div className="print-report">
        <h1>{student.name}</h1>
        <p className="print-meta">{currentClassName ? `${currentClassName} · ` : ""}Report generated {todayISO()}</p>

        {sections.includes("attendance") && (
          <div className="print-section">
            <h2>Attendance history</h2>
            {(data.attendance || []).length === 0 ? <p className="print-empty">Nothing recorded.</p> : (
              <table><thead><tr><th>Date</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>{[...(data.attendance || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).map((a, i) => (
                  <tr key={i}><td>{a.date}</td><td>{attStatusMap[a.status] || a.status}</td><td>{a.time || ""}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {sections.includes("homework") && (
          <div className="print-section">
            <h2>Homework log</h2>
            {(data.homework || []).length === 0 ? <p className="print-empty">Nothing recorded.</p> : (
              <table><thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>{[...(data.homework || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).map((h, i) => (
                  <tr key={i}><td>{h.date}</td><td>{h.status}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {sections.includes("incidents") && (
          <div className="print-section">
            <h2>Incidents</h2>
            {myIncidents.length === 0 ? <p className="print-empty">Nothing recorded.</p> : (
              <table><thead><tr><th>Date</th><th>Category</th><th>Description</th></tr></thead>
                <tbody>{myIncidents.map((i) => (
                  <tr key={i.id}><td>{i.date}</td><td>{incCatMap[i.category] || i.category || "Uncategorized"}{i.flaggedForAdmin ? " 🚩" : ""}</td><td>{i.description || ""}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {sections.includes("skills") && (
          <div className="print-section">
            <h2>Skill assessments</h2>
            {activeSkillCats.length === 0 ? <p className="print-empty">No skill categories set up.</p> : activeSkillCats.map((cat) => {
              const rows = (cat.items || []).map((item) => {
                const entry = data.skills?.[skillKey(cat.id, item.id)];
                if (!entry || !entry.history || entry.history.length === 0) return null;
                const { status } = computeSkillStatus(entry.history, { ...cat, gradeOptions: config.gradeOptions });
                return { label: item.label, status, last: entry.history[entry.history.length - 1]?.date || "" };
              }).filter(Boolean);
              if (rows.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p style={{ fontWeight: 600, fontSize: "12px", margin: "8px 0 2px 0" }}>{cat.title}</p>
                  <table><thead><tr><th>Item</th><th>Status</th><th>Last graded</th></tr></thead>
                    <tbody>{rows.map((r, i) => <tr key={i}><td>{r.label}</td><td>{r.status}</td><td>{r.last}</td></tr>)}</tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {sections.includes("classAssessments") && (
          <div className="print-section">
            <h2>Class assessments</h2>
            {myClassAssessments.length === 0 ? <p className="print-empty">Nothing recorded.</p> : (
              <table><thead><tr><th>Date</th><th>Subject</th><th>Assessment</th><th>Result</th><th>Note</th></tr></thead>
                <tbody>{myClassAssessments.sort((a, b) => (a.date < b.date ? 1 : -1)).map((ca) => (
                  <tr key={ca.id}><td>{ca.date}</td><td>{subjectLabel(ca.subjectId)}</td><td>{ca.title || ""}</td>
                    <td>{getResultGrade(ca.results[student.id])}</td><td>{getResultNote(ca.results[student.id]) || ""}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {sections.includes("fluency") && (
          <div className="print-section">
            <h2>Fluency checks</h2>
            {(data.fluency || []).length === 0 ? <p className="print-empty">Nothing recorded.</p> : (
              <table><thead><tr><th>Date</th><th>Detail</th></tr></thead>
                <tbody>{[...(data.fluency || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).map((f, i) => (
                  <tr key={i}><td>{f.date}</td><td>{f.summary || f.notes || ""}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {sections.includes("contact") && (
          <div className="print-section">
            <h2>Parent &amp; contact info</h2>
            <table><tbody>
              {student.parent1Name && <tr><td>Parent 1</td><td>{student.parent1Name}{student.parentPhone ? ` · ${student.parentPhone}` : ""}{student.parentEmail ? ` · ${student.parentEmail}` : ""}</td></tr>}
              {student.parent2Name && <tr><td>Parent 2</td><td>{student.parent2Name}{student.parent2Phone ? ` · ${student.parent2Phone}` : ""}{student.parent2Email ? ` · ${student.parent2Email}` : ""}</td></tr>}
              {student.homeAddress && <tr><td>Address</td><td>{student.homeAddress}</td></tr>}
              {!student.parent1Name && !student.parent2Name && !student.homeAddress && <tr><td colSpan={2} className="print-empty">Nothing on file.</td></tr>}
            </tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentDetailView({ incident, roster, config, loggedInTeacher, onBack, onLogSent, onUpdateParentEmail, onUpdateIncident, onRemoveIncident }) {
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
      const text = await generateIncidentMessage(student, incident, cat?.label || incident.category || "Uncategorized", involvedStudents.length - 1, config, loggedInTeacher?.name);
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
      <div className="flex items-start justify-between mb-1 md:w-[28rem]">
        <div>
          <h1 className="display-font text-xl font-bold text-stone-900">Incident</h1>
          <p className="text-stone-500 text-sm">{incident.date}</p>
        </div>
        <ConfirmDelete onConfirm={() => onRemoveIncident(incident.id)} label="Delete" size={13}
          className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50"
          confirmText="Delete this incident?" armedClassName="text-xs font-semibold text-white bg-red-600 rounded-lg px-3 py-1.5" />
      </div>
      <p className="text-xs text-stone-400 mb-5">Deleting removes it from the student's record entirely — this can't be undone.</p>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-[28rem]">
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full bg-${cat?.color || "stone"}-100 text-${cat?.color || "stone"}-700`}>
            {cat?.label || incident.category || "Uncategorized"}
          </span>
          {incident.time && <span className="text-xs text-stone-400">Logged at {incident.time}</span>}
        </div>
        <button onClick={() => onUpdateIncident(incident.id, { flaggedForAdmin: !incident.flaggedForAdmin })}
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 mb-3 text-left ${incident.flaggedForAdmin ? "bg-rose-50 border-rose-300" : "bg-white border-stone-300"}`}>
          <Flag size={16} className={incident.flaggedForAdmin ? "text-rose-600 fill-rose-600" : "text-stone-400"} />
          <span className={`text-sm font-semibold ${incident.flaggedForAdmin ? "text-rose-700" : "text-stone-600"}`}>
            {incident.flaggedForAdmin ? "Flagged for admin" : "Flag for admin"}
          </span>
          <span className="text-xs text-stone-400 ml-auto">{incident.flaggedForAdmin ? "Shows on the admin overview" : "Tap to flag"}</span>
        </button>
        {!editing ? (
          <>
            <p className="text-sm text-stone-700 mb-3">{incident.description || "No additional description yet."}</p>
            <button onClick={() => { setEditCategory(incident.category || ""); setEditDescription(incident.description || ""); setEditing(true); }}
              className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-1">
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
                className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Save details</button>
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
                    <button onClick={() => generateFor(s)} className="flex items-center gap-1 text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-2.5 py-1.5 hover:bg-teal-50">
                      <Mail size={12} /> Draft message
                    </button>
                  )}
                  {d?.loading && <Loader2 className="animate-spin text-teal-700" size={16} />}
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
                      <MailActionButtons email={d.email} subject={`About ${s.name} — ${cat?.label || incident.category || "Uncategorized"}`} body={d.draft} size="small" />
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

function PlannerView({ config, plannerDays, plannerEvents, navigate, setPlannerDay, clearPlannerDayType, bulkSetByWeekday, bulkSetByRange, addPlannerEvent, removePlannerEvent, importSchoolCalendar, benchmarkSubjects, addBenchmarkSubject, removeBenchmarkSubject, addBenchmarkSegment, addBenchmarkSegmentBySubjectLabel, updateBenchmarkSegment, removeBenchmarkSegment, toggleSubjectHiddenFromPlanner }) {
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

  // Automatic holidays only need recomputing when the visible year actually changes —
  // spans a Gregorian year plus a bit of the next, since a Hebrew year straddles two.
  const autoHolidays = useMemo(() => {
    const thisYear = getAutoHolidaysForYear(year);
    const nextYear = getAutoHolidaysForYear(year + 1);
    return { ...thisYear, ...nextYear };
  }, [year]);

  const eventsForDate = (d) => {
    const teacherEvents = (plannerEvents || []).filter((e) => e.date === d).map((e) => ({ ...e, source: e.source || "teacher" }));
    const holidayEvents = (autoHolidays[d] || []).map((e, i) => ({ ...e, id: `auto-${d}-${i}`, date: d, source: "auto" }));
    return [...holidayEvents, ...teacherEvents];
  };

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="planner" navigate={navigate} />

      <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 md:w-96">
        <button onClick={() => setSubTab("calendar")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "calendar" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Calendar</button>
        <button onClick={() => setSubTab("benchmarks")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "benchmarks" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Benchmarks</button>
      </div>

      {subTab === "benchmarks" ? (
        <BenchmarksView subjects={benchmarkSubjects} addSubject={addBenchmarkSubject} removeSubject={removeBenchmarkSubject}
          addSegment={addBenchmarkSegment} addSegmentBySubjectLabel={addBenchmarkSegmentBySubjectLabel}
          updateSegment={updateBenchmarkSegment} removeSegment={removeBenchmarkSegment}
          onToggleHidden={toggleSubjectHiddenFromPlanner}
          plannerDays={plannerDays} dayTypes={dayTypes} config={config} />
      ) : (
      <div className="md:flex md:gap-6 md:items-start">
        <div className="flex-1 md:max-w-xl">
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
              const dayEvents = eventsForDate(d);
              const isToday = d === todayISO();
              const dayNum = Number(d.slice(-2));
              const hebDateShort = hebrewDateFor(d).replace(/ \d{4}$/, "");
              return (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`relative rounded-lg text-xs font-semibold flex flex-col items-start justify-start border p-1 min-h-[3.8rem] md:min-h-[4.8rem] overflow-hidden text-left ${
                    selectedDate === d ? "border-teal-600" : "border-transparent"
                  } ${dayType ? `bg-${dayType.color}-100 text-${dayType.color}-800` : "bg-stone-50 text-stone-600 hover:bg-stone-100"} ${isToday ? "ring-2 ring-teal-400" : ""}`}>
                  <div className="flex items-center justify-between w-full">
                    <span>{dayNum}</span>
                    {hasNotes && <span className="w-1 h-1 rounded-full bg-stone-400 shrink-0" />}
                  </div>
                  <span className="block text-[10px] md:text-[11px] font-bold text-teal-600 leading-tight whitespace-nowrap">{hebDateShort}</span>
                  <div className="hidden md:flex flex-col gap-0.5 mt-0.5 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => {
                      const cat = EVENT_CATEGORIES.find((c) => c.id === e.category) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
                      return (
                        <span key={e.id} className={`text-[8px] font-semibold truncate leading-tight bg-${cat.color}-100 text-${cat.color}-700 rounded px-0.5`}>
                          {cat.icon} {e.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 2 && <span className="text-[8px] text-stone-400">+{dayEvents.length - 2} more</span>}
                  </div>
                  <div className="flex md:hidden gap-0.5 mt-auto flex-wrap">
                    {dayEvents.slice(0, 4).map((e) => {
                      const cat = EVENT_CATEGORIES.find((c) => c.id === e.category) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
                      return <span key={e.id} className={`w-1 h-1 rounded-full bg-${cat.color}-500`} />;
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {dayTypes.map((t) => (
              <span key={t.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${t.color}-100 text-${t.color}-700`}>{t.label}</span>
            ))}
          </div>

          <button onClick={() => setShowBulk((v) => !v)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
            {showBulk ? "Hide" : "Bulk-set day types"} <ChevronDown size={12} className={showBulk ? "rotate-180" : ""} />
          </button>
          {showBulk && <BulkDayTypeForm dayTypes={dayTypes} bulkSetByWeekday={bulkSetByWeekday} bulkSetByRange={bulkSetByRange} />}

          {importSchoolCalendar && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs font-semibold text-stone-700 mb-1">School calendar (2026–2027)</p>
              <p className="text-xs text-stone-400 mb-2">Sets every school day, weekend, holiday, and early-dismissal day for the year in one go, based on your school's official calendar. Overwrites any day types you've already set in that range.</p>
              <ConfirmDelete onConfirm={importSchoolCalendar} label="Import 2026–2027 school calendar"
                className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50"
                confirmText="Apply calendar — overwrites existing day types?"
                armedClassName="text-xs font-semibold text-white bg-teal-600 rounded-lg px-3 py-2 whitespace-nowrap" />
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-1">Have your own calendar or document?</p>
            <p className="text-xs text-stone-400 mb-2">Upload or paste any other schedule — a different calendar version, a district document, anything with dates in it — and pull the day types out of it the same way.</p>
            {!showDocImport ? (
              <button onClick={() => setShowDocImport(true)} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">
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
              config={config}
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

// Lets a teacher see which days actually have school while picking a date range — the whole
// point being they can visually spot "oh, there's no school those two days" instead of picking
// blind in a plain native date input. First click sets the start, next click (on a later date)
// sets the end; clicking again after a range is already set starts a fresh selection.
function SchoolCalendarRangePicker({ startValue, endValue, onSelectStart, onSelectEnd, plannerDays, dayTypes }) {
  const initialDate = startValue ? new Date(startValue + "T00:00:00") : new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const baseYear = initialDate.getFullYear();
  const baseMonth = initialDate.getMonth();
  const monthIdx0 = baseMonth + monthOffset;
  const year = baseYear + Math.floor(monthIdx0 / 12);
  const monthIdx = ((monthIdx0 % 12) + 12) % 12;
  const grid = buildMonthGrid(year, monthIdx);

  const handleClick = (d) => {
    if (!startValue || (startValue && endValue)) {
      onSelectStart(d);
      onSelectEnd("");
    } else if (d < startValue) {
      onSelectStart(d);
    } else {
      onSelectEnd(d);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronLeft size={16} /></button>
        <p className="text-sm font-semibold text-stone-800">{monthLabel(year, monthIdx)}</p>
        <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="p-1 text-stone-400 hover:text-stone-700"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => <div key={w} className="text-center text-[9px] font-semibold text-stone-400">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const kind = scheduleKindForDate(d, plannerDays, dayTypes);
          const dayNum = Number(d.slice(-2));
          const isStart = d === startValue;
          const isEnd = d === endValue;
          const inRange = startValue && endValue && d > startValue && d < endValue;
          let colorClass = "text-stone-700 hover:bg-stone-100";
          if (kind === "none") colorClass = "text-stone-300 hover:bg-stone-100";
          else if (kind === "half") colorClass = "text-stone-700 bg-amber-50 hover:bg-amber-100";
          if (isStart || isEnd) {
            colorClass = "bg-teal-700 text-white font-bold";
          } else if (inRange && kind !== "none") {
            // Only real school days get the "selected" highlight — a no-school day that
            // happens to fall inside the picked range stays visually muted, so the teacher
            // can actually see which days in that span have school and which don't.
            colorClass = kind === "half" ? "bg-teal-100 text-teal-800 ring-1 ring-inset ring-amber-300" : "bg-teal-100 text-teal-800";
          }
          return (
            <button key={d} type="button" onClick={() => handleClick(d)}
              title={kind === "none" ? "No school" : kind === "half" ? "Half day" : "School day"}
              className={`relative aspect-square rounded-lg text-xs flex items-center justify-center ${colorClass}`}>
              {dayNum}
              {kind === "none" && !isStart && !isEnd && <span className="absolute bottom-0.5 text-[7px]">•</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-700 inline-block" /> School day</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-200 inline-block" /> Half day</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-200 inline-block" /> No school</span>
      </div>
    </div>
  );
}

function BenchmarksView({ subjects, addSubject, removeSubject, addSegment, addSegmentBySubjectLabel, updateSegment, removeSegment, onToggleHidden, plannerDays, dayTypes, config }) {
  const [activeKey, setActiveKey] = useState(null); // which row's edit modal is open — none, by default
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showDocImport, setShowDocImport] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showSegForm, setShowSegForm] = useState(false);
  const [segLabel, setSegLabel] = useState("");
  const [segStart, setSegStart] = useState(todayISO());
  const [segEnd, setSegEnd] = useState(addDaysISO(todayISO(), 13));
  const [viewMode, setViewMode] = useState("timeline"); // timeline | calendar
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [editingSegId, setEditingSegId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [pendingCascade, setPendingCascade] = useState(null); // { delta, items: [{id,label,newStart,newEnd}] }

  // Every subject from Settings gets a row automatically — no separate "add it to Benchmarks"
  // step. A row is "virtual" (benchmarkSubjectId: null) until its first segment is added, at
  // which point addSegmentBySubjectLabel creates the underlying record transparently. Anything
  // tracked in Benchmarks that isn't a real subject (a routine, a behavior goal) still shows too,
  // appended after the real subjects, matched up by label so existing segment data is never lost.
  const centralSubjects = config?.subjects || [];
  const visibleCentralSubjects = centralSubjects.filter((cs) => !cs.hiddenFromPlanner);
  const hiddenCentralSubjects = centralSubjects.filter((cs) => cs.hiddenFromPlanner);
  const matchedBenchmarkIds = new Set();
  const subjectRows = visibleCentralSubjects.map((cs) => {
    const match = subjects.find((bs) => bs.label.trim().toLowerCase() === cs.label.trim().toLowerCase());
    if (match) matchedBenchmarkIds.add(match.id);
    return { key: `central-${cs.id}`, centralSubjectId: cs.id, benchmarkSubjectId: match?.id || null, label: cs.label, segments: match?.segments || [] };
  });
  const nonSubjectRows = subjects.filter((bs) => !matchedBenchmarkIds.has(bs.id))
    .map((bs) => ({ key: `bm-${bs.id}`, centralSubjectId: null, benchmarkSubjectId: bs.id, label: bs.label, segments: bs.segments }));
  const displayRows = [...subjectRows, ...nonSubjectRows];

  const active = displayRows.find((r) => r.key === activeKey);
  const openSubject = (key) => {
    setActiveKey(key);
    setShowSegForm(false); setEditingSegId(null); setPendingCascade(null); setShowDocImport(false);
  };
  const closeSubject = () => {
    setActiveKey(null);
    setShowSegForm(false); setEditingSegId(null); setPendingCascade(null); setShowDocImport(false);
  };

  const yearStart = schoolYearStart(new Date()); // locked to the current school year — no year navigation exposed here
  const yearEnd = new Date(yearStart.getFullYear() + 1, 6, 31);
  const totalDays = daysBetween(yearStart, yearEnd);
  const months = Array.from({ length: 12 }).map((_, i) => new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1));

  const submitSubject = () => { addSubject(newSubjectName); setNewSubjectName(""); setShowAddSubject(false); };
  const submitSegment = () => {
    if (!segLabel.trim() || !active) return;
    const color = COLOR_CHOICES[(active.segments.length) % COLOR_CHOICES.length];
    const newSeg = { label: segLabel.trim(), startDate: segStart, endDate: segEnd, color };
    if (active.benchmarkSubjectId) addSegment(active.benchmarkSubjectId, newSeg);
    else addSegmentBySubjectLabel(active.label, newSeg);
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
    if (!active || !active.benchmarkSubjectId) return;
    const oldSeg = active.segments.find((s) => s.id === editingSegId);
    if (!oldSeg) return;
    updateSegment(active.benchmarkSubjectId, editingSegId, { label: editLabel.trim() || oldSeg.label, startDate: editStart, endDate: editEnd });

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
    if (pendingCascade && active?.benchmarkSubjectId) {
      for (const item of pendingCascade.items) {
        updateSegment(active.benchmarkSubjectId, item.id, { startDate: item.newStart, endDate: item.newEnd });
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

  const calMonthIdx0 = yearStart.getMonth() + calMonthOffset;
  const calYear = yearStart.getFullYear() + Math.floor(calMonthIdx0 / 12);
  const calMonthIdx = ((calMonthIdx0 % 12) + 12) % 12;
  const calGrid = buildMonthGrid(calYear, calMonthIdx);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold text-stone-800">{yearStart.getFullYear()}–{yearStart.getFullYear() + 1} school year</p>
        <button onClick={() => setShowAddSubject(true)}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showAddSubject ? "bg-teal-700 text-white border-teal-700" : "text-teal-700 border-teal-300"}`}>
          <Plus size={12} /> Track something else
        </button>
      </div>

      {showAddSubject && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5 md:w-96">
          <p className="text-sm font-semibold text-stone-800 mb-3">Track something that isn't a subject</p>
          <p className="text-xs text-stone-400 mb-2">Every subject from Settings already has its own row below automatically — this is for a routine, a behavior goal, anything else you want to pace out over the year.</p>
          <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitSubject()}
            placeholder="e.g. Lining Up, Circle Time Routine" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
          <div className="flex gap-2">
            <button onClick={submitSubject} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Create</button>
            <button onClick={() => setShowAddSubject(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      )}

      {displayRows.length === 0 ? (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-6 text-center">No subjects yet — add some in Settings to see them here.</p>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl p-4 overflow-x-auto no-scrollbar">
          <div style={{ minWidth: 700 }}>
            <div className="relative h-4 mb-2">
              {months.map((m, i) => (
                <span key={i} className="absolute text-[9px] text-stone-400" style={{ left: `${(i / 12) * 100}%` }}>
                  {m.toLocaleDateString("en-US", { month: "short" })}
                </span>
              ))}
            </div>
            {displayRows.map((row) => (
              <div key={row.key} className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => openSubject(row.key)} className="text-xs font-semibold text-stone-700 hover:text-teal-700">
                    {row.label}
                  </button>
                  {row.centralSubjectId && (
                    <button onClick={() => onToggleHidden(row.centralSubjectId)} title="Hide from Planner"
                      className="text-[10px] text-stone-300 hover:text-stone-600">Hide</button>
                  )}
                </div>
                <div className="relative h-6 bg-stone-100 rounded-lg">
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-stone-200" style={{ left: `${(i / 12) * 100}%` }} />
                  ))}
                  {row.segments.length === 0 && (
                    <span className="absolute inset-0 flex items-center pl-2 text-[10px] text-stone-300">No segments yet</span>
                  )}
                  {row.segments.map((seg) => (
                    <div key={seg.id} title={`${seg.label}: ${seg.startDate} – ${seg.endDate} (tap to open ${row.label})`}
                      className="absolute top-0.5 bottom-0.5 cursor-pointer" style={barStyle(seg)}
                      onClick={() => openSubject(row.key)}>
                      <div className={`absolute inset-0 rounded-md bg-${seg.color}-400`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Tap any subject to open and edit its segments — everything else stays right where it is.</p>
          {hiddenCentralSubjects.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <button onClick={() => setShowHidden((v) => !v)} className="text-[10px] font-semibold text-stone-400 hover:text-stone-600">
                {showHidden ? "Hide" : `${hiddenCentralSubjects.length} hidden — show`}
              </button>
              {showHidden && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hiddenCentralSubjects.map((cs) => (
                    <button key={cs.id} onClick={() => onToggleHidden(cs.id)}
                      className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-50">
                      {cs.label} — show
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={closeSubject}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-semibold text-stone-800">{active.label}</p>
              <button onClick={closeSubject} className="text-stone-400 hover:text-stone-700 text-xs font-semibold">Close</button>
            </div>

            <div className="flex items-center justify-end gap-2 mb-2">
              <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
                <button onClick={() => setViewMode("timeline")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${viewMode === "timeline" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Timeline</button>
                <button onClick={() => setViewMode("calendar")} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${viewMode === "calendar" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Calendar</button>
              </div>
              {active.centralSubjectId ? (
                <button onClick={() => { onToggleHidden(active.centralSubjectId); closeSubject(); }}
                  className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50">Hide from Planner</button>
              ) : (
                <ConfirmDelete onConfirm={() => { removeSubject(active.benchmarkSubjectId); closeSubject(); }} label="Delete" />
              )}
            </div>

            {viewMode === "timeline" ? (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 overflow-x-auto no-scrollbar">
                <div className="relative h-12 bg-stone-100 rounded-lg mb-1" style={{ minWidth: 650 }}>
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
                            const kind = scheduleKindForDate(d, plannerDays, dayTypes);
                            if (kind === "none") return <div key={d} className="flex-1 h-full" />;
                            return <div key={d} className={`flex-1 bg-${seg.color}-500 ${kind === "half" ? "h-1/2" : "h-full"}`} />;
                          })}
                        </div>
                        <span className="absolute -top-4 left-0.5 text-[9px] font-semibold text-stone-600 whitespace-nowrap">{seg.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="relative h-4" style={{ minWidth: 650 }}>
                  {months.map((m, i) => (
                    <span key={i} className="absolute text-[9px] text-stone-400" style={{ left: `${(i / 12) * 100}%` }}>
                      {m.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 mt-2">Full-height = school day, half-height = half day, gap = no school. Tap a bar to edit its dates.</p>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 md:w-96">
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
                    const kind = scheduleKindForDate(d, plannerDays, dayTypes);
                    const dayNum = Number(d.slice(-2));
                    const colorClass = !seg || kind === "none"
                      ? "bg-white text-stone-400"
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
                <li key={seg.id} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs">
                  <button onClick={() => openEditSegment(seg)} className="flex items-center gap-2 text-left hover:opacity-70">
                    <span className={`w-2.5 h-2.5 rounded-full bg-${seg.color}-400 shrink-0`} />
                    <span className="font-medium text-stone-700">{seg.label}</span>
                    <span className="text-stone-400">{seg.startDate} → {seg.endDate}</span>
                  </button>
                  <ConfirmDelete onConfirm={() => removeSegment(active.benchmarkSubjectId, seg.id)} size={13} />
                </li>
              ))}
            </ul>

            {editingSegId && !pendingCascade && (
              <div className="bg-white border border-teal-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-stone-800 mb-3">Edit segment</p>
                <label className="block text-xs font-medium text-stone-500 mb-1">Label</label>
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
                <p className="text-xs font-medium text-stone-500 mb-1">
                  {editStart || "Tap a date to set the start"}{editEnd ? ` → ${editEnd}` : editStart ? " → tap another date to set the end" : ""}
                </p>
                <div className="mb-4">
                  <SchoolCalendarRangePicker startValue={editStart} endValue={editEnd} onSelectStart={setEditStart} onSelectEnd={setEditEnd} plannerDays={plannerDays} dayTypes={dayTypes} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSegmentEdit} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Save changes</button>
                  <button onClick={() => setEditingSegId(null)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
                </div>
              </div>
            )}

            {pendingCascade && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
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
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <label className="block text-xs font-medium text-stone-500 mb-1">Label</label>
                <input value={segLabel} onChange={(e) => setSegLabel(e.target.value)} placeholder="e.g. Kamatz/Patach" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />
                <p className="text-xs font-medium text-stone-500 mb-1">
                  {segStart || "Tap a date to set the start"}{segEnd ? ` → ${segEnd}` : segStart ? " → tap another date to set the end" : ""}
                </p>
                <div className="mb-3">
                  <SchoolCalendarRangePicker startValue={segStart} endValue={segEnd} onSelectStart={setSegStart} onSelectEnd={setSegEnd} plannerDays={plannerDays} dayTypes={dayTypes} />
                </div>
                <div className="flex gap-2">
                  <button onClick={submitSegment} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Add segment</button>
                  <button onClick={() => setShowSegForm(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={openSegForm} className="text-xs font-semibold text-teal-700 flex items-center gap-1"><Plus size={12} /> Add segment</button>
                <button onClick={() => setShowDocImport((v) => !v)} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-2.5 py-1 hover:bg-stone-50">
                  Import from a document
                </button>
              </div>
            )}
            {showDocImport && (
              <DocumentImportPanel mode="benchmark"
                onApplyBenchmark={(items) => {
                  items.forEach((it, i) => {
                    const newSeg = { label: it.label, startDate: it.start, endDate: it.end, color: COLOR_CHOICES[(active.segments.length + i) % COLOR_CHOICES.length] };
                    if (active.benchmarkSubjectId) addSegment(active.benchmarkSubjectId, newSeg);
                    else addSegmentBySubjectLabel(active.label, newSeg);
                  });
                }}
                onClose={() => setShowDocImport(false)} />
            )}
          </div>
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
    <div className="bg-white border border-teal-200 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-stone-800 mb-1">Import from a document</p>
      <p className="text-xs text-stone-400 mb-3">Paste the text, or upload a plain text/CSV file or a PDF. Nothing is applied until you review it below.</p>

      {items === null && (
        <>
          <textarea value={rawText} onChange={(e) => { setRawText(e.target.value); setPdfBase64(null); setFileName(""); }} rows={5}
            placeholder="Paste your document text here..." className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-teal-50">
              Upload a file
              <input type="file" accept=".txt,.csv,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </label>
            {fileName && <span className="text-xs text-stone-500">{fileName}</span>}
          </div>
          {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={extract} disabled={extracting || (!rawText.trim() && !pdfBase64)}
              className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40 flex items-center justify-center gap-2">
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
            <button onClick={apply} disabled={items.length === 0} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
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
        <button onClick={() => setMode("weekday")} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border ${mode === "weekday" ? "bg-teal-700 text-white border-teal-700" : "border-stone-300 text-stone-600"}`}>By weekday (e.g. every Friday)</button>
        <button onClick={() => setMode("range")} className={`flex-1 text-xs font-semibold py-1.5 rounded-lg border ${mode === "range" ? "bg-teal-700 text-white border-teal-700" : "border-stone-300 text-stone-600"}`}>By date range (e.g. a whole week off)</button>
      </div>

      {mode === "weekday" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {WEEKDAY_LABELS.map((w, i) => (
            <button key={w} onClick={() => toggleWeekday(i)} className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${weekdays.includes(i) ? "bg-teal-700 text-white border-teal-700" : "border-stone-300 text-stone-600"}`}>{w}</button>
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

      <button onClick={apply} className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Apply</button>
    </div>
  );
}

function PeriodListEditor({ periods, onChange, subjects }) {
  const updatePeriod = (i, field, value) => onChange(periods.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  const movePeriod = (i, dir) => { const next = [...periods]; [next[i], next[i + dir]] = [next[i + dir], next[i]]; onChange(next); };
  const removePeriod = (i) => onChange(periods.filter((_, idx) => idx !== i));
  const addPeriod = () => onChange([...periods, { id: uid(), label: "New period", startTime: "09:00", endTime: "09:45" }]);

  return (
    <div>
      <datalist id="period-label-options">
        {(subjects || []).map((s) => <option key={s.id} value={s.label} />)}
        {SCHEDULE_BLOCK_LIBRARY.map((b) => <option key={b} value={b} />)}
      </datalist>
      {periods.map((slot, i) => (
        <div key={slot.id} className="flex items-center gap-1.5 mb-1.5">
          <input value={slot.label} onChange={(e) => updatePeriod(i, "label", e.target.value)} placeholder="Subject / period" list="period-label-options" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          <input type="time" value={slot.startTime} onChange={(e) => updatePeriod(i, "startTime", e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
          <span className="text-stone-400 text-xs">–</span>
          <input type="time" value={slot.endTime} onChange={(e) => updatePeriod(i, "endTime", e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
          <button disabled={i === 0} onClick={() => movePeriod(i, -1)} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronUp size={13} /></button>
          <button disabled={i === periods.length - 1} onClick={() => movePeriod(i, 1)} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronDown size={13} /></button>
          <ConfirmDelete onConfirm={() => removePeriod(i)} size={13} />
        </div>
      ))}
      <button onClick={addPeriod} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add period</button>
    </div>
  );
}

function DayDetailPanel({ date, dayTypes, plannerDays, plannerEvents, setPlannerDay, clearPlannerDayType, addPlannerEvent, removePlannerEvent, config, onClose }) {
  const entry = plannerDays?.[date] || {};
  const [notes, setNotes] = useState(entry.notes || "");
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evLead, setEvLead] = useState(1);
  const [evCategory, setEvCategory] = useState("school-event");
  const [slotDrafts, setSlotDrafts] = useState(entry.slotContent || {});

  useEffect(() => { setNotes(plannerDays?.[date]?.notes || ""); setSlotDrafts(plannerDays?.[date]?.slotContent || {}); }, [date, plannerDays]);

  const saveNotes = () => setPlannerDay(date, { notes });
  const saveSlot = (slotId, text) => setPlannerDay(date, { slotContent: { ...(plannerDays?.[date]?.slotContent || {}), [slotId]: text } });
  const saveEvent = () => {
    if (!evTitle.trim()) return;
    addPlannerEvent({ date, title: evTitle.trim(), reminderLeadDays: Number(evLead) || 0, category: evCategory });
    setEvTitle(""); setEvLead(1); setEvCategory("school-event"); setShowEventForm(false);
  };

  const dayType = dayTypes.find((t) => t.id === entry.dayType);
  const template = getScheduleForDate(date, dayType, config, plannerDays);
  const hasOverride = !!entry.scheduleOverride;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-stone-800 text-sm">{date}</p>
        <button onClick={onClose} className="text-stone-400 text-xs hover:text-stone-700">Close</button>
      </div>
      <p className="text-xs text-stone-400 mb-3">{hebrewDateFor(date)}</p>

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

      {entry.dayType && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-stone-400 uppercase">{hasOverride ? "Custom schedule — this date only" : "Today's schedule"}</p>
            {hasOverride ? (
              <button onClick={() => setPlannerDay(date, { scheduleOverride: null })} className="text-xs font-semibold text-rose-600 hover:text-rose-800">Reset to regular schedule</button>
            ) : (
              <button onClick={() => setPlannerDay(date, { scheduleOverride: (template || []).length > 0 ? template : [{ id: uid(), label: "New period", startTime: "09:00", endTime: "09:45" }] })}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900">Customize just this day</button>
            )}
          </div>

          {hasOverride ? (
            <PeriodListEditor periods={template || []} onChange={(next) => setPlannerDay(date, { scheduleOverride: next })} subjects={config.subjects} />
          ) : template && template.length > 0 && (
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
          )}
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
        {plannerEvents.map((e) => {
          const cat = EVENT_CATEGORIES.find((c) => c.id === e.category) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
          return (
            <li key={e.id} className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 bg-${cat.color}-100`}>
              <span className="text-stone-700">{cat.icon} {e.title}{e.reminderLeadDays > 0 ? ` (remind ${e.reminderLeadDays}d before)` : ""}</span>
              {e.source === "auto" ? (
                <span className="text-[9px] text-stone-400 italic shrink-0 ml-2">Automatic</span>
              ) : e.source === "admin" ? (
                <span className="text-[9px] text-stone-400 italic shrink-0 ml-2">From admin</span>
              ) : (
                <ConfirmDelete onConfirm={() => removePlannerEvent(e.id)} size={12} />
              )}
            </li>
          );
        })}
        {plannerEvents.length === 0 && <li className="text-xs text-stone-400">None yet.</li>}
      </ul>

      {showEventForm ? (
        <div className="border-t border-stone-100 pt-3">
          <input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <label className="block text-[10px] text-stone-400 mb-0.5">Category</label>
          <select value={evCategory} onChange={(e) => setEvCategory(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-2">
            {EVENT_CATEGORIES.filter((c) => c.id !== "jewish-holiday").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <label className="block text-[10px] text-stone-400 mb-0.5">Remind me this many days before</label>
          <input type="number" min={0} value={evLead} onChange={(e) => setEvLead(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <div className="flex gap-2">
            <button onClick={saveEvent} className="flex-1 bg-teal-700 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-teal-800">Save</button>
            <button onClick={() => setShowEventForm(false)} className="px-3 text-xs text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowEventForm(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1"><Plus size={12} /> Add event</button>
      )}
    </div>
  );
}

// ---------- Session (flashcards) ----------

function SessionView({ category, config, idx, setIdx, onGrade, onFinish, studentName, classSessionProgress }) {
  const item = category.items[idx];
  const isLast = idx >= category.items.length - 1;
  const handleGrade = (resultId) => { onGrade(item.id, resultId); if (isLast) onFinish(); else setIdx(idx + 1); };
  return (
    <div className={`${PAGE} flex flex-col min-h-screen`}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onFinish} className="flex items-center text-stone-500 text-sm hover:text-stone-800"><ChevronLeft size={16} /> End session</button>
        <span className="text-xs text-stone-400 font-medium">{idx + 1} / {category.items.length}</span>
      </div>
      {classSessionProgress && (
        <p className="text-center text-xs font-semibold text-teal-600 mb-1">Student {classSessionProgress.pos + 1} of {classSessionProgress.total}</p>
      )}
      {studentName && <p className="text-center text-stone-800 font-semibold text-sm mb-1">{studentName}</p>}
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
        <button onClick={() => onSave({ wordsRead: Number(words) || 0, hesitation, mode, notes })} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">
          Save fluency check
        </button>
      </div>
    </div>
  );
}

// ---------- Incident form ----------

function SubstituteModeView({ className, roster, studentData, config, plannerDays, plannerEvents, setAttendance, addIncident, onExit }) {
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const today = todayISO();
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const entry = plannerDays?.[today] || {};
  const dayType = entry.dayType ? dayTypeMap[entry.dayType] : null;
  const template = getScheduleForDate(today, dayType, config, plannerDays);
  const todaysEvents = (plannerEvents || []).filter((e) => e.date === today);
  const statuses = config.attendance?.statuses || [];

  const submitIncident = (fields) => { addIncident(fields); setShowIncidentForm(false); };

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <GlobalAppStyles />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="display-font text-xl font-bold text-stone-900">Substitute Mode</h1>
          <button onClick={onExit} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-100">Exit substitute mode</button>
        </div>
        <p className="text-xs font-semibold text-amber-700 mb-1">Limited access</p>
        <p className="text-sm text-stone-500 mb-6">{className}</p>

        {showIncidentForm ? (
          <div className="bg-white border border-stone-200 rounded-xl mb-6">
            <IncidentForm roster={roster} config={config} onCancel={() => setShowIncidentForm(false)} onSave={submitIncident} />
          </div>
        ) : (
          <>
            <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-stone-800 text-sm">Today's plan</p>
                {dayType && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${dayType.color}-100 text-${dayType.color}-700`}>{dayType.label}</span>}
              </div>
              <p className="text-xs text-stone-400 mb-3">{today}</p>

              {todaysEvents.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {todaysEvents.map((e) => (
                    <li key={e.id} className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-amber-800">
                      <span className="font-semibold">{e.title}</span>{e.time ? ` · ${formatTime12h(e.time)}` : ""}{e.location ? ` · ${e.location}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {!dayType && <p className="text-xs text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center">No day type set for today.</p>}
              {dayType && !template && <p className="text-xs text-stone-400 bg-stone-100 rounded-lg px-3 py-4 text-center">No schedule template set for "{dayType.label}".</p>}
              {template && template.length > 0 && (
                <div className="space-y-2">
                  {template.map((slot) => (
                    <div key={slot.id} className="border border-stone-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-stone-700">{slot.label}</span>
                        <span className="text-[10px] text-stone-400">{slot.startTime}–{slot.endTime}</span>
                      </div>
                      <p className="text-xs text-stone-500">{entry.slotContent?.[slot.id] || <span className="text-stone-300">Nothing noted for this period.</span>}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-stone-800 text-sm">Attendance — {today}</p>
              <button onClick={() => setShowIncidentForm(true)} className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                <ClipboardList size={12} /> Log a behavior note
              </button>
            </div>
            {roster.length === 0 && <p className="text-stone-400 text-sm text-center py-8">No students in this class yet.</p>}
            <ul className="space-y-2">
              {roster.map((s) => {
                const todaysAttendance = (studentData[s.id]?.attendance || []).find((a) => a.date === today);
                return (
                  <li key={s.id} className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium text-stone-800">{s.name}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {statuses.map((st) => {
                        const active = todaysAttendance?.status === st.id;
                        return (
                          <button key={st.id} onClick={() => setAttendance(s.id, today, st.id)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${active ? `bg-${st.color}-600 text-white border-${st.color}-600` : "text-stone-600 border-stone-300"}`}>
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function IncidentForm({ roster, config, presetId, onCancel, onSave }) {
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time] = useState(() => new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState("");
  const [studentIds, setStudentIds] = useState(presetId ? [presetId] : []);
  const [showDetails, setShowDetails] = useState(false);
  const [flaggedForAdmin, setFlaggedForAdmin] = useState(false);
  const toggleStudent = (id) => setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => onSave({ category, date, time, description, studentIds, flaggedForAdmin });

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Record incident</h1>
      <p className="text-xs text-stone-400 mb-5">Logged at {formatTime12h(time)} — add details now, or come back and fill them in later.</p>
      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Students involved</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roster.map((s) => {
            const selected = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${selected ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {s.name}
              </button>
            );
          })}
        </div>

        <button onClick={() => setFlaggedForAdmin((v) => !v)}
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-4 text-left ${flaggedForAdmin ? "bg-rose-50 border-rose-300" : "bg-white border-stone-300"}`}>
          <Flag size={18} className={flaggedForAdmin ? "text-rose-600 fill-rose-600" : "text-stone-400"} />
          <span className={`text-sm font-semibold ${flaggedForAdmin ? "text-rose-700" : "text-stone-600"}`}>
            {flaggedForAdmin ? "Flagged for admin" : "Flag for admin"}
          </span>
          <span className="text-xs text-stone-400 ml-auto">{flaggedForAdmin ? "Shows on the admin overview" : "Tap to flag"}</span>
        </button>

        <button disabled={studentIds.length === 0} onClick={save}
          className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40 mb-2">
          Log it — that's enough for now
        </button>
        {studentIds.length === 0 && <p className="text-xs text-stone-400 text-center mb-3">Select at least one student</p>}

        {!showDetails ? (
          <button onClick={() => setShowDetails(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mx-auto mt-1">
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
              className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
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
      <p className="text-xs text-stone-400 mb-5">Logged at {formatTime12h(time)} — separate from morning attendance, for mid-day changes.</p>

      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Students</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roster.map((s) => {
            const selected = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${selected ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
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
          className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          Log it
        </button>
        {studentIds.length === 0 && <p className="text-xs text-stone-400 text-center mt-2">Select at least one student</p>}
      </div>
    </div>
  );
}

// ---------- Message draft (AI-generated, never auto-sent) ----------

async function generateMessage(student, flag, config, teacherName) {
  const prompt = `${buildStyleInstructions(config, teacherName)}

Situation: ${flag.label}
Suggested next step: ${flag.message}
Student's first name: ${student.name}

Keep it under 120 words, friendly but direct, no exaggeration. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return applyMessageDisclaimer(text, config);
}

function MessageDraftView({ student, flag, config, loggedInTeacher, onBack, onSaveParentEmail, onLogSent }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);

  const run = useCallback(async () => {
    setLoading(true); setError(false); setLogged(false);
    try {
      const text = await generateMessage(student, flag, config, loggedInTeacher?.name);
      setDraft(text || "Could not generate a draft — please write one manually.");
    } catch { setError(true); } finally { setLoading(false); }
  }, [student, flag]);

  useEffect(() => { run(); }, [run]);

  const subject = `About ${student.name} — ${flag.label.split(" — ")[0]}`;

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
          <div className="flex items-center justify-center py-16 bg-white border border-stone-200 rounded-lg mb-4"><Loader2 className="animate-spin text-teal-700" size={22} /></div>
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
          <MailActionButtons email={email} subject={subject} body={draft} />
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

function SegmentCelebrationMessageView({ subjectLabel, segmentLabel, roster, config, loggedInTeacher, onBack, onDone }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const run = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const text = await generateSegmentCelebrationMessage(subjectLabel, segmentLabel, config, loggedInTeacher?.name);
      setDraft(text || "Could not generate a draft — please write one manually.");
    } catch { setError(true); } finally { setLoading(false); }
  }, [subjectLabel, segmentLabel]);

  useEffect(() => { run(); }, [run]);

  const parentEmails = roster.map((s) => s.parentEmail).filter(Boolean);
  const missingEmail = roster.filter((s) => !s.parentEmail);
  const subject = `${subjectLabel} — ${segmentLabel} complete!`;

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Announce to the class</h1>
      <p className="text-stone-500 text-sm mb-5">{subjectLabel} — {segmentLabel}</p>
      <div className="md:w-[32rem]">
        <p className="text-xs text-stone-400 mb-1">
          {parentEmails.length > 0
            ? `Goes out to ${parentEmails.length} of ${roster.length} students' parent emails on file, privately bcc'd — no one sees anyone else's address.`
            : "No parent emails are on file for this class yet — you can still copy the message and send it your own way."}
        </p>
        {missingEmail.length > 0 && (
          <p className="text-xs text-amber-700 mb-3">
            No parent email on file for: {missingEmail.map((s) => s.name).join(", ")} — add it in Settings for them to receive this.
          </p>
        )}
        <label className="block text-xs font-medium text-stone-500 mb-1">Message — edit before sending</label>
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-stone-200 rounded-lg mb-4"><Loader2 className="animate-spin text-teal-700" size={22} /></div>
        ) : error ? (
          <p className="text-xs text-rose-600 py-4">Couldn't generate a draft right now. Try again, or write the message yourself below.</p>
        ) : null}
        {!loading && (
          <div className="flex items-start gap-1.5 mb-4">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-2">
          <button onClick={run} className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
          <MailActionButtons bcc={parentEmails} subject={subject} body={draft} />
        </div>
        <p className="text-xs text-stone-400 mb-4">Nothing sends automatically — review the message, then send it yourself.</p>
        <button onClick={onDone} className="text-xs font-semibold bg-teal-700 text-white rounded-lg px-4 py-2 hover:bg-teal-800">Done</button>
      </div>
    </div>
  );
}

function ClassAnnouncementView({ roster, config, loggedInTeacher, onBack }) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(false); setDraft(null);
    try {
      const text = await generateClassAnnouncementMessage(topic.trim(), config, loggedInTeacher?.name);
      setDraft(text || "");
    } catch {
      setError(true);
      setDraft(""); // generation failed, but the teacher can still write and send it manually
    } finally { setLoading(false); }
  };

  const parentEmails = roster.map((s) => s.parentEmail).filter(Boolean);
  const missingEmail = roster.filter((s) => !s.parentEmail);

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Message the whole class</h1>
      <p className="text-stone-500 text-sm mb-5">A quick note in your own words, turned into a formal announcement to every family at once.</p>
      <div className="md:w-[32rem]">
        <label className="block text-xs font-medium text-stone-500 mb-1">What's this about?</label>
        <div className="flex items-start gap-1.5 mb-3">
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3}
            placeholder="e.g. Trip this Thursday — bring $10 and a labeled lunch. No school Friday for a teacher in-service day."
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <MicButton onResult={(spoken) => setTopic((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
        </div>
        <button onClick={run} disabled={!topic.trim() || loading}
          className="mb-5 flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 px-4 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {loading ? <Loader2 className="animate-spin" size={16} /> : null} {draft ? "Regenerate" : "Generate announcement"}
        </button>

        {error && <p className="text-xs text-rose-600 mb-4">Couldn't generate a draft right now. Try again, or write the message yourself below.</p>}

        {draft !== null && !loading && (
          <>
            <p className="text-xs text-stone-400 mb-1">
              {parentEmails.length > 0
                ? `Goes out to ${parentEmails.length} of ${roster.length} students' parent emails on file, privately bcc'd — no one sees anyone else's address.`
                : "No parent emails are on file for this class yet — you can still copy the message and send it your own way."}
            </p>
            {missingEmail.length > 0 && (
              <p className="text-xs text-amber-700 mb-3">
                No parent email on file for: {missingEmail.map((s) => s.name).join(", ")} — add it in Settings for them to receive this.
              </p>
            )}
            <label className="block text-xs font-medium text-stone-500 mb-1">Subject line</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. This Thursday's trip" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
            <label className="block text-xs font-medium text-stone-500 mb-1">Message — edit before sending</label>
            <div className="flex items-start gap-1.5 mb-4">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <MicButton onResult={(spoken) => setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
            </div>
            <MailActionButtons bcc={parentEmails} subject={subject || "A note from your child's teacher"} body={draft} />
            <p className="text-xs text-stone-400 mt-3">Nothing sends automatically — review the message, then send it yourself.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Settings ----------

const HEBREW_MONTHS = [
  { id: "TISHREI", label: "Tishrei" }, { id: "CHESHVAN", label: "Cheshvan" }, { id: "KISLEV", label: "Kislev" },
  { id: "TEVET", label: "Tevet" }, { id: "SHVAT", label: "Shvat" }, { id: "ADAR", label: "Adar" },
  { id: "NISAN", label: "Nisan" }, { id: "IYYAR", label: "Iyyar" }, { id: "SIVAN", label: "Sivan" },
  { id: "TAMUZ", label: "Tamuz" }, { id: "AV", label: "Av" }, { id: "ELUL", label: "Elul" },
];

// Finds the next upcoming Gregorian date for a recurring Hebrew month+day (e.g. a birthday),
// starting from a given date. "Adar" always resolves to Adar II, which works correctly in both
// leap and regular years — hebcal maps both Adar constants to the single Adar in a regular year.
function nextHebrewOccurrence(monthId, day, fromDate) {
  const hebMonthNum = monthId === "ADAR" ? months.ADAR_II : months[monthId];
  if (!hebMonthNum || !day) return null;
  const fromHDate = new HDate(fromDate);
  let hebYear = fromHDate.getFullYear();
  for (let i = 0; i < 3; i++) {
    try {
      const candidate = new HDate(day, hebMonthNum, hebYear);
      const greg = candidate.greg();
      greg.setHours(0, 0, 0, 0);
      const fromMidnight = new Date(fromDate); fromMidnight.setHours(0, 0, 0, 0);
      if (greg >= fromMidnight) return greg;
    } catch { /* invalid day for this month/year combo — try the next year */ }
    hebYear += 1;
  }
  return null;
}

function StudentContactFields({ student, onUpdateField }) {
  return (
    <div className="px-3 pb-3 border-t border-stone-100 pt-2 md:grid md:grid-cols-2 md:gap-2">
      <p className="md:col-span-2 text-[10px] font-semibold text-stone-400 uppercase mt-1 mb-0.5">Parent / Guardian 1</p>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
        <input value={student.parent1Name || ""} onChange={(e) => onUpdateField(student.id, "parent1Name", e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
        <input type="tel" value={student.parentPhone || ""} onChange={(e) => onUpdateField(student.id, "parentPhone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] text-stone-400 mb-0.5">Email (primary contact)</label>
        <input type="email" value={student.parentEmail || ""} onChange={(e) => onUpdateField(student.id, "parentEmail", e.target.value)} placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>

      <p className="md:col-span-2 text-[10px] font-semibold text-stone-400 uppercase mt-1 mb-0.5">Parent / Guardian 2</p>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Name</label>
        <input value={student.parent2Name || ""} onChange={(e) => onUpdateField(student.id, "parent2Name", e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Phone</label>
        <input type="tel" value={student.parent2Phone || ""} onChange={(e) => onUpdateField(student.id, "parent2Phone", e.target.value)} placeholder="(555) 555-5555" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-[10px] text-stone-400 mb-0.5">Email</label>
        <input type="email" value={student.parent2Email || ""} onChange={(e) => onUpdateField(student.id, "parent2Email", e.target.value)} placeholder="parent2@example.com" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>

      <div className="md:col-span-2">
        <label className="block text-[10px] text-stone-400 mb-0.5">Home address</label>
        <input value={student.homeAddress || ""} onChange={(e) => onUpdateField(student.id, "homeAddress", e.target.value)} placeholder="Street, city, zip" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>

      <p className="md:col-span-2 text-[10px] font-semibold text-stone-400 uppercase mt-1 mb-0.5">Birthday</p>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Hebrew birthday — month</label>
        <select value={student.hebrewBirthdayMonth || ""} onChange={(e) => onUpdateField(student.id, "hebrewBirthdayMonth", e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-2">
          <option value="">Not set</option>
          {HEBREW_MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Hebrew birthday — day</label>
        <input type="number" min={1} max={30} value={student.hebrewBirthdayDay || ""} onChange={(e) => onUpdateField(student.id, "hebrewBirthdayDay", e.target.value ? Number(e.target.value) : "")} placeholder="1–30" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Gregorian birthday (optional)</label>
        <input type="date" value={student.gregorianBirthday || ""} onChange={(e) => onUpdateField(student.id, "gregorianBirthday", e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>
      <div>
        <label className="block text-[10px] text-stone-400 mb-0.5">Preferred celebration date (optional)</label>
        <input type="date" value={student.preferredCelebrationDate || ""} onChange={(e) => onUpdateField(student.id, "preferredCelebrationDate", e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      </div>

      <div className="md:col-span-2">
        <label className="block text-[10px] text-stone-400 mb-0.5">Notes</label>
        <textarea value={student.notes || ""} onChange={(e) => onUpdateField(student.id, "notes", e.target.value)} rows={2} placeholder="Anything worth remembering about this student" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
      </div>
    </div>
  );
}

function AddExistingStudentPanel({ globalStudents, roster, config, onAdd, onCancel }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [scope, setScope] = useState("full-time");
  const [periodIds, setPeriodIds] = useState([]);
  const rosterIds = new Set(roster.map((s) => s.id));
  const results = (globalStudents || [])
    .filter((s) => !s.archived && !rosterIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);
  const allPeriods = getAllPeriodsEverywhere(config);
  const togglePeriod = (id) => setPeriodIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      {!selected ? (
        <>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..."
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          {search && results.length === 0 && <p className="text-xs text-stone-400">No matching students found.</p>}
          <ul className="space-y-1">
            {results.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSelected(s)} className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:border-teal-300">
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
          {!search && <p className="text-xs text-stone-400">Start typing a name to search across the whole school.</p>}
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-stone-800 mb-2">Add {selected.name} — how does this student belong to your class?</p>
          <div className="space-y-1.5 mb-3">
            <label className="flex items-center gap-2 text-sm text-stone-700"><input type="radio" checked={scope === "full-time"} onChange={() => setScope("full-time")} /> Full time — regular member of this class</label>
            <label className="flex items-center gap-2 text-sm text-stone-700"><input type="radio" checked={scope === "part-time"} onChange={() => setScope("part-time")} /> Part time — in this class sometimes, no specific periods tracked</label>
            <label className="flex items-center gap-2 text-sm text-stone-700"><input type="radio" checked={scope === "periods"} onChange={() => setScope("periods")} /> Specific periods — only for particular parts of the day</label>
          </div>
          {scope === "periods" && (
            <div className="mb-3">
              {allPeriods.length === 0 && <p className="text-xs text-stone-400 mb-2">No periods set up yet in your Planner schedule — add them there first, or choose Part time instead for now.</p>}
              <div className="flex flex-wrap gap-1.5">
                {allPeriods.map((p) => (
                  <button key={p.id} onClick={() => togglePeriod(p.id)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${periodIds.includes(p.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => onAdd(selected, scope, periodIds)} disabled={scope === "periods" && periodIds.length === 0 && allPeriods.length > 0}
              className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              Add to class
            </button>
            <button onClick={() => setSelected(null)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Back</button>
          </div>
        </>
      )}
      <button onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600 mt-2">Cancel</button>
    </div>
  );
}

const ONBOARDING_STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "subjects", label: "Subjects" },
  { key: "schedule", label: "Schedule" },
  { key: "attendance", label: "Attendance" },
  { key: "homework", label: "Homework" },
  { key: "points", label: "Points" },
  { key: "incidents", label: "Incidents" },
  { key: "messages", label: "Parent Messages" },
  { key: "birthdays", label: "Birthdays" },
  { key: "done", label: "All Set" },
];

// The guided setup wizard — a friendlier front door to settings that already exist elsewhere,
// not a separate system. Every change here writes through the same config object Settings uses,
// via the same update(mutator) pattern, so nothing gets out of sync and nothing is duplicated.
function OnboardingWizard({ config, setConfig, onClose }) {
  const completedSteps = config.onboarding?.completedSteps || [];
  const firstIncomplete = ONBOARDING_STEPS.findIndex((s) => !completedSteps.includes(s.key));
  const [stepIdx, setStepIdx] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);

  const update = (mutator) => setConfig(mutator(structuredClone(config)));
  const step = ONBOARDING_STEPS[stepIdx];

  const markStarted = (c) => {
    c.onboarding = c.onboarding || { started: false, finished: false, completedSteps: [] };
    c.onboarding.started = true;
    return c;
  };
  const markComplete = (key) => {
    update((c) => {
      markStarted(c);
      if (!c.onboarding.completedSteps.includes(key)) c.onboarding.completedSteps.push(key);
      return c;
    });
  };

  const goNext = () => {
    if (stepIdx === ONBOARDING_STEPS.length - 1) {
      update((c) => {
        markStarted(c);
        if (!c.onboarding.completedSteps.includes(step.key)) c.onboarding.completedSteps.push(step.key);
        c.onboarding.finished = true;
        return c;
      });
      onClose();
    } else {
      markComplete(step.key);
      setStepIdx((i) => i + 1);
    }
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));
  const pause = () => {
    update((c) => { markStarted(c); return c; });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={pause} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xs font-semibold">Close</button>

        <div className="flex items-center gap-1 mb-6 pr-12">
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-teal-600" : "bg-stone-200"}`} />
          ))}
        </div>

        {step.key === "welcome" && <OnboardingWelcomeStep />}
        {step.key === "subjects" && <OnboardingSubjectsStep config={config} update={update} />}
        {step.key === "schedule" && <OnboardingScheduleStep config={config} update={update} />}
        {step.key === "attendance" && <OnboardingAttendanceStep config={config} update={update} />}
        {step.key === "homework" && <OnboardingHomeworkStep config={config} update={update} />}
        {step.key === "points" && <OnboardingPointsStep config={config} update={update} />}
        {step.key === "incidents" && <OnboardingIncidentsStep config={config} update={update} />}
        {step.key === "messages" && <OnboardingMessagesStep config={config} update={update} />}
        {step.key === "birthdays" && <OnboardingBirthdaysStep />}
        {step.key === "done" && <OnboardingDoneStep config={config} />}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
          <button onClick={goBack} disabled={stepIdx === 0} className={`text-xs text-stone-400 hover:text-stone-700 ${stepIdx === 0 ? "opacity-0 pointer-events-none" : ""}`}>Back</button>
          <div className="flex items-center gap-3">
            {step.key !== "welcome" && step.key !== "done" && (
              <button onClick={goNext} className="text-xs text-stone-500 hover:text-stone-700">Skip</button>
            )}
            <button onClick={goNext} className="bg-teal-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-teal-800">
              {stepIdx === ONBOARDING_STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingWelcomeStep() {
  return (
    <div>
      <h2 className="display-font text-2xl font-bold text-stone-900 mb-2">Let's set up your class</h2>
      <p className="text-sm text-stone-600 mb-3">A few quick questions to get things set up the way you'd actually use them — skip anything you're not sure about, and change any of it later in Settings.</p>
      <p className="text-xs text-stone-400">This won't take long, and you don't have to finish it in one sitting — closing it anytime saves your place, and you can pick back up from Settings whenever you're ready.</p>
    </div>
  );
}

function OnboardingSubjectsStep({ config, update }) {
  const [newSubjectInput, setNewSubjectInput] = useState("");
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">What do you teach?</h2>
      <p className="text-sm text-stone-600 mb-4">This feeds Benchmarks, Assessments, and your weekly schedule — named once, used everywhere.</p>
      {(config.subjects || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {config.subjects.map((subj) => (
            <span key={subj.id} className="flex items-center gap-1.5 text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 rounded-full pl-3 pr-1.5 py-1">
              {subj.label}
              <button onClick={() => update((c) => { c.subjects = c.subjects.filter((s) => s.id !== subj.id); return c; })} className="text-teal-400 hover:text-teal-700 text-sm leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-medium text-stone-500 mb-1.5">Tap to add</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SUBJECT_LIBRARY.filter((lib) => !(config.subjects || []).some((s) => s.label.toLowerCase() === lib.toLowerCase())).map((lib) => (
          <button key={lib} onClick={() => update((c) => { c.subjects = [...(c.subjects || []), { id: uid(), label: lib }]; return c; })}
            className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-50">
            + {lib}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newSubjectInput} onChange={(e) => setNewSubjectInput(e.target.value)} placeholder="Other — type your own"
          className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        <button onClick={() => {
          const trimmed = newSubjectInput.trim();
          if (!trimmed) return;
          update((c) => { c.subjects = [...(c.subjects || []), { id: uid(), label: trimmed }]; return c; });
          setNewSubjectInput("");
        }} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Add</button>
      </div>
    </div>
  );
}

function OnboardingScheduleStep({ config, update }) {
  const schedules = config.planner?.schedules || [];
  const regular = schedules.find((s) => s.name === "Regular Schedule") || schedules[0];

  const ensureRegularSchedule = () => {
    if (regular) return regular.id;
    const id = uid();
    update((c) => {
      c.planner = c.planner || {};
      c.planner.schedules = [...(c.planner.schedules || []), { id, name: "Regular Schedule", periods: [] }];
      return c;
    });
    return id;
  };

  const applyToWeekdays = () => {
    const id = regular?.id || ensureRegularSchedule();
    update((c) => {
      c.planner = c.planner || {};
      c.planner.weekdaySchedule = { ...(c.planner.weekdaySchedule || {}), 1: id, 2: id, 3: id, 4: id, 5: id };
      return c;
    });
  };

  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Build your daily schedule</h2>
      <p className="text-sm text-stone-600 mb-4">Add your periods — pick from the subjects you just added, or type something else for blocks like recess or lunch. You can build more schedules (a half day, a Friday-only one) later in Settings.</p>
      {!regular ? (
        <button onClick={ensureRegularSchedule} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50 mb-3">
          Start building
        </button>
      ) : (
        <>
          <PeriodListEditor periods={regular.periods || []} subjects={config.subjects}
            onChange={(next) => update((c) => {
              const idx = c.planner.schedules.findIndex((s) => s.id === regular.id);
              if (idx > -1) c.planner.schedules[idx].periods = next;
              return c;
            })} />
          {(regular.periods || []).length > 0 && (
            <button onClick={applyToWeekdays} className="text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2">
              Use this schedule every weekday
            </button>
          )}
        </>
      )}
    </div>
  );
}

function OnboardingAttendanceStep({ config, update }) {
  const statuses = config.attendance?.statuses || [];
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Attendance statuses</h2>
      <p className="text-sm text-stone-600 mb-4">These are the statuses you'll tap on Home each day. The defaults work for most classes — rename or adjust colors if you'd like, or just move on.</p>
      {statuses.map((st, i) => (
        <div key={st.id} className="flex items-center gap-2 mb-2">
          <input value={st.label} onChange={(e) => update((c) => { c.attendance.statuses[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          <select value={st.color} onChange={(e) => update((c) => { c.attendance.statuses[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
            {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ConfirmDelete onConfirm={() => update((c) => { if (c.attendance.statuses.length > 1) c.attendance.statuses.splice(i, 1); return c; })} size={14} />
        </div>
      ))}
      <button onClick={() => update((c) => { c.attendance.statuses.push({ id: uid(), label: "New status", color: "stone", flagType: "none" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add status</button>
      <p className="text-xs text-stone-400 mt-4">Lateness and absence flagging rules are already set to sensible defaults — fine-tune those anytime in Settings.</p>
    </div>
  );
}

function OnboardingHomeworkStep({ config, update }) {
  const hw = config.homework || {};
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Track homework?</h2>
      <p className="text-sm text-stone-600 mb-4">Entirely optional — some classes track it daily, some weekly, some not at all.</p>
      <label className="flex items-center gap-2 text-sm text-stone-700 mb-3">
        <input type="checkbox" checked={hw.enabled || false} onChange={(e) => update((c) => { c.homework.enabled = e.target.checked; return c; })} />
        Track homework for this class
      </label>
      {hw.enabled && (
        <>
          <label className="block text-xs font-medium text-stone-500 mb-1">How often do you collect it?</label>
          <select value={hw.frequency} onChange={(e) => update((c) => { c.homework.frequency = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          {hw.frequency === "weekly" && (
            <>
              <label className="block text-xs font-medium text-stone-500 mb-1">Which day?</label>
              <select value={hw.collectionDay ?? 1} onChange={(e) => update((c) => { c.homework.collectionDay = Number(e.target.value); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
              </select>
            </>
          )}
        </>
      )}
    </div>
  );
}

function OnboardingPointsStep({ config, update }) {
  const categories = config.points?.categories || [];
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [displayMode, setDisplayMode] = useState("bar");

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update((c) => {
      c.points = c.points || { categories: [] };
      c.points.categories = [...(c.points.categories || []), {
        id: uid(), label: trimmed, color: "indigo", scope: "individual", displayMode,
        increment: 1, threshold: displayMode === "checkx" ? 5 : 10, rewardMessage: "",
      }];
      return c;
    });
    setName(""); setShowCreate(false);
  };

  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">A points or rewards system?</h2>
      <p className="text-sm text-stone-600 mb-4">Also entirely optional — a fill-up bar toward a reward, a simple counter, or nothing at all.</p>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {categories.map((cat) => (
            <span key={cat.id} className={`text-xs font-semibold bg-${cat.color}-50 text-${cat.color}-800 border border-${cat.color}-200 rounded-full px-3 py-1`}>{cat.label}</span>
          ))}
        </div>
      )}
      {showCreate ? (
        <div className="bg-stone-50 rounded-lg p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diligence Points" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
            <option value="bar">Fill-up visual toward a reward</option>
            <option value="counter">Simple counter</option>
            <option value="checkx">Check / X tally</option>
          </select>
          <div className="flex gap-2">
            <button onClick={create} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800">Create category</button>
            <button onClick={() => setShowCreate(false)} className="px-4 text-sm text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">
          + Add a points category
        </button>
      )}
      <p className="text-xs text-stone-400 mt-4">You can add more categories, or fine-tune amounts and thresholds, anytime from the Points tab.</p>
    </div>
  );
}

function OnboardingIncidentsStep({ config, update }) {
  const categories = config.incidents?.categories || [];
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Incident categories</h2>
      <p className="text-sm text-stone-600 mb-4">What you'll pick from when logging an incident. These defaults cover most classrooms — adjust if you'd like.</p>
      {categories.map((cat, i) => (
        <div key={cat.id} className="flex items-center gap-2 mb-2">
          <input value={cat.label} onChange={(e) => update((c) => { c.incidents.categories[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          <select value={cat.color} onChange={(e) => update((c) => { c.incidents.categories[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
            {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ConfirmDelete onConfirm={() => update((c) => { if (c.incidents.categories.length > 1) c.incidents.categories.splice(i, 1); return c; })} size={14} />
        </div>
      ))}
      <button onClick={() => update((c) => { c.incidents.categories.push({ id: uid(), label: "New category", color: "stone" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add category</button>
    </div>
  );
}

function OnboardingMessagesStep({ config, update }) {
  const style = config.messageStyle || {};
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Parent messages</h2>
      <p className="text-sm text-stone-600 mb-4">Controls how the AI drafts messages to parents — the tone and how it refers to your school. Sample writing, custom opening/closing lines, and more are available later in Settings.</p>

      <label className="block text-xs font-medium text-stone-500 mb-1">How you refer to the school</label>
      <input value={style.schoolTerm ?? "school"} onChange={(e) => update((c) => { c.messageStyle.schoolTerm = e.target.value; return c; })}
        placeholder="e.g. school, yeshiva, or your school's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

      <label className="block text-xs font-medium text-stone-500 mb-1">Tone</label>
      <select value={style.tone ?? "warm"} onChange={(e) => update((c) => { c.messageStyle.tone = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
        <option value="warm">Warm & personal</option>
        <option value="formal">Formal & professional</option>
        <option value="brief">Brief & direct</option>
      </select>
    </div>
  );
}

function OnboardingBirthdaysStep() {
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">One thing worth knowing</h2>
      <p className="text-sm text-stone-600 mb-3">If you enter a student's Hebrew birthday under their info in Settings, you'll automatically get a reminder right on Home about a week before it — with a one-tap way to add it to your Planner.</p>
      <p className="text-sm text-stone-600">Nothing to set up here — it just works once the birthday is on file.</p>
    </div>
  );
}

function OnboardingDoneStep({ config }) {
  const summary = [
    { done: (config.subjects || []).length > 0, label: `${(config.subjects || []).length} subject${(config.subjects || []).length === 1 ? "" : "s"} added` },
    { done: (config.planner?.schedules || []).some((s) => (s.periods || []).length > 0), label: "Schedule started" },
    { done: config.homework?.enabled, label: "Homework tracking on" },
    { done: (config.points?.categories || []).length > 0, label: "Points category created" },
  ];
  return (
    <div>
      <h2 className="display-font text-2xl font-bold text-stone-900 mb-2">You're all set</h2>
      <p className="text-sm text-stone-600 mb-4">Here's a quick look at what's in place — everything here, and everything you skipped, stays adjustable in Settings whenever you want.</p>
      <ul className="space-y-1.5">
        {summary.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className={s.done ? "text-emerald-600" : "text-stone-300"}>{s.done ? "✓" : "○"}</span>
            <span className={s.done ? "text-stone-700" : "text-stone-400"}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsView({ config, setConfig, onBack, roster, addStudent, removeStudent, updateStudentField, loadSampleData, clearAllData, className, onRenameClass, onChangePassword, onArchiveClass, onDeleteClass, subCode, onGenerateSubCode, onClearSubCode, globalStudents, onRefreshGlobalStudents, onAddExistingStudent, loggedInTeacher, onOpenMyAccount, onOpenOnboarding }) {
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [newName, setNewName] = useState("");
  const [classNameInput, setClassNameInput] = useState(className || "");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [previewText, setPreviewText] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const runStylePreview = async () => {
    setPreviewLoading(true);
    setPreviewText(null);
    try {
      const text = await generatePreviewMessage(config, loggedInTeacher?.name);
      setPreviewText(text);
    } catch {
      setPreviewText("Couldn't generate a preview right now — try again in a moment.");
    }
    setPreviewLoading(false);
  };
  const [showAddExisting, setShowAddExisting] = useState(false);
  const update = (mutator) => setConfig(mutator(structuredClone(config)));
  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));
  const toggleStudent = (id) => setExpandedStudents((p) => ({ ...p, [id]: !p[id] }));
  const submitNewStudent = () => { addStudent(newName); setNewName(""); };

  useEffect(() => { if (onRefreshGlobalStudents) onRefreshGlobalStudents(); }, []); // eslint-disable-line

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
          {loggedInTeacher && (
            <Section title="My account">
              <p className="text-xs text-stone-400 mb-2">This is your own sign-in — separate from this class's password below.</p>
              <button onClick={onOpenMyAccount} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">
                Change my name or password
              </button>
            </Section>
          )}

          <Section title="Guided setup">
            {(() => {
              const ob = config.onboarding || { started: false, finished: false, completedSteps: [] };
              const doneCount = ob.completedSteps.length;
              if (ob.finished) {
                return (
                  <>
                    <p className="text-xs text-stone-400 mb-3">You've been through guided setup — everything it touched is still adjustable below, any time.</p>
                    <button onClick={onOpenOnboarding} className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50">Go through it again</button>
                  </>
                );
              }
              if (ob.started) {
                return (
                  <>
                    <p className="text-xs text-stone-400 mb-3">You're partway through — {doneCount} of {ONBOARDING_STEPS.length} sections done. Pick up right where you left off.</p>
                    <button onClick={onOpenOnboarding} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Continue setup</button>
                  </>
                );
              }
              return (
                <>
                  <p className="text-xs text-stone-400 mb-3">A short, skippable walkthrough to help set up your class — subjects, schedule, points, and more, one question at a time.</p>
                  <button onClick={onOpenOnboarding} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Start guided setup</button>
                </>
              );
            })()}
          </Section>

          <Section title="Subjects">
            <p className="text-xs text-stone-400 mb-3">What you teach this year — feeds Benchmarks, Assessments, and (where it makes sense) your weekly schedule, so a subject is named once and stays consistent everywhere. Things like recess or lunch don't belong here — those stay as plain schedule blocks.</p>
            {(config.subjects || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {config.subjects.map((subj) => (
                  <span key={subj.id} className="flex items-center gap-1.5 text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 rounded-full pl-3 pr-1.5 py-1">
                    {subj.label}
                    <button onClick={() => update((c) => { c.subjects = c.subjects.filter((s) => s.id !== subj.id); return c; })} className="text-teal-400 hover:text-teal-700 text-sm leading-none">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs font-medium text-stone-500 mb-1.5">Tap to add</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUBJECT_LIBRARY.filter((lib) => !(config.subjects || []).some((s) => s.label.toLowerCase() === lib.toLowerCase())).map((lib) => (
                <button key={lib} onClick={() => update((c) => { c.subjects = [...(c.subjects || []), { id: uid(), label: lib }]; return c; })}
                  className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-full px-3 py-1 hover:bg-stone-50">
                  + {lib}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSubjectInput} onChange={(e) => setNewSubjectInput(e.target.value)} placeholder="Other — type your own"
                className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <button onClick={() => {
                const trimmed = newSubjectInput.trim();
                if (!trimmed) return;
                update((c) => { c.subjects = [...(c.subjects || []), { id: uid(), label: trimmed }]; return c; });
                setNewSubjectInput("");
              }} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Add</button>
            </div>
          </Section>

          {onRenameClass && (
            <Section title="Class management">
              <label className="block text-xs font-medium text-stone-500 mb-1">Class name</label>
              <div className="flex gap-2 mb-4">
                <input value={classNameInput} onChange={(e) => setClassNameInput(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <button onClick={saveClassName} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Save</button>
              </div>

              <label className="block text-xs font-medium text-stone-500 mb-1">Change class password</label>
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <input type="password" value={newPw1} onChange={(e) => setNewPw1(e.target.value)} placeholder="New password" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="Confirm new password" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                <button onClick={savePassword} disabled={!newPw1.trim() || newPw1 !== newPw2} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50 disabled:opacity-40">Update password</button>
              </div>
              {newPw1 && newPw2 && newPw1 !== newPw2 && <p className="text-xs text-red-500 mb-2">Passwords don't match.</p>}
              {pwSaved && <p className="text-xs text-emerald-600 mb-2">Password updated.</p>}

              <div className="mt-4 pt-4 border-t border-stone-200">
                <label className="block text-xs font-medium text-stone-500 mb-1">Substitute access</label>
                <p className="text-xs text-stone-400 mb-2">A separate code — not your class password — for a substitute to get in for the day with a stripped-down view (today's schedule, roster, attendance, and logging a behavior note only). Stays active until you change it here.</p>
                {subCode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 tracking-wider">{subCode}</span>
                    <button onClick={onGenerateSubCode} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Generate a new code</button>
                    <ConfirmDelete onConfirm={onClearSubCode} label="Turn off substitute access" className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50" confirmText="Turn it off?" armedClassName="text-xs font-semibold text-white bg-stone-600 rounded-lg px-3 py-2" />
                  </div>
                ) : (
                  <button onClick={onGenerateSubCode} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Generate a substitute code</button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-400 mb-2">Archiving hides this class from the class picker — nothing is deleted, and an admin can restore it anytime from the Admin Dashboard. Deleting removes it for good.</p>
                <div className="flex gap-2">
                  <ConfirmDelete onConfirm={onArchiveClass} label="Archive this class" className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50" confirmText="Archive it?" armedClassName="text-xs font-semibold text-white bg-stone-600 rounded-lg px-3 py-2" />
                  <ConfirmDelete onConfirm={onDeleteClass} label="Delete permanently" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" confirmText="Delete forever?" armedClassName="text-xs font-semibold text-white bg-red-600 rounded-lg px-3 py-2" />
                </div>
              </div>
            </Section>
          )}

          <Section title="Demo & data reset">
            <p className="text-xs text-stone-400 mb-3">Useful when sharing this with another teacher for feedback, or starting fresh. Both replace your current roster, attendance, incidents, points, planner entries, and benchmarks — your Settings customizations (categories, thresholds, schedule templates) are kept either way.</p>
            <div className="flex flex-wrap gap-2">
              <ConfirmDelete onConfirm={loadSampleData} label="Load sample data" className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50" />
              <ConfirmDelete onConfirm={clearAllData} label="Clear all data" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" />
            </div>
          </Section>

          <Section title="Students">
            <div className="flex gap-2 mb-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewStudent()}
                placeholder="Add a student's name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <button onClick={submitNewStudent} className="bg-teal-700 text-white rounded-lg px-3 py-1.5 flex items-center justify-center hover:bg-teal-800"><Plus size={16} /></button>
            </div>
            <button onClick={() => setShowAddExisting((v) => !v)} className="text-xs font-semibold text-teal-700 mb-3">
              {showAddExisting ? "Close" : "Or add an existing student from another class"}
            </button>
            {showAddExisting && (
              <AddExistingStudentPanel globalStudents={globalStudents} roster={roster} config={config}
                onAdd={(student, scope, periodIds) => { onAddExistingStudent(student, scope, periodIds); setShowAddExisting(false); }}
                onCancel={() => setShowAddExisting(false)} />
            )}
            {roster.length === 0 && <p className="text-xs text-stone-400">No students yet — add one above.</p>}
            <div className="space-y-2">
              {roster.map((s) => (
                <div key={s.id} className="border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input value={s.name} onChange={(e) => updateStudentField(s.id, "name", e.target.value)} className="flex-1 text-sm font-semibold text-stone-800 border-none focus:outline-none bg-transparent" />
                    {s.linkedGlobalId && (
                      <span className="text-[9px] font-semibold text-teal-500 bg-teal-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {s.enrollmentScope === "full-time" ? "Full time" : s.enrollmentScope === "part-time" ? "Part time" : "Specific periods"}
                      </span>
                    )}
                    <button onClick={() => toggleStudent(s.id)} className="text-stone-400 p-1">{expandedStudents[s.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                    <ConfirmDelete onConfirm={() => removeStudent(s.id)} size={14} />
                  </div>
                  {expandedStudents[s.id] && (
                    <>
                      {s.enrollmentScope && s.enrollmentScope !== "full-time" && (
                        <div className="px-3 pb-2 pt-2 border-t border-stone-100">
                          <label className="flex items-center gap-2 text-xs text-stone-600">
                            <input type="checkbox" checked={s.participatesInPoints !== false} onChange={(e) => updateStudentField(s.id, "participatesInPoints", e.target.checked)} />
                            Participates in this class's points/rewards
                          </label>
                        </div>
                      )}
                      <StudentContactFields student={s} onUpdateField={(id, field, value) => updateStudentField(id, field, value)} />
                    </>
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
          <button onClick={() => update((c) => { c.planner = c.planner || { dayTypes: [] }; c.planner.dayTypes.push({ id: uid(), label: "New type", color: "sky", hidesAttendance: false, scheduleTemplate: "none" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add day type</button>
        </Section>

        <div className="md:col-span-2">
          <Section title="Weekly schedules">
            <p className="text-xs text-stone-400 mb-3">Create as many named schedules as you need — a regular schedule, a shortened Half Day schedule, a different one for Wednesdays, whatever fits — then assign which one applies to each weekday below. If Friday is always a half day, for example, just create a "Half Day" schedule here and assign it to Friday.</p>
            <datalist id="settings-period-label-options">
              {(config.subjects || []).map((s) => <option key={s.id} value={s.label} />)}
              {SCHEDULE_BLOCK_LIBRARY.map((b) => <option key={b} value={b} />)}
            </datalist>
            {(config.planner?.schedules || []).map((sched, si) => (
              <div key={sched.id} className="border border-stone-200 rounded-lg mb-2">
                <div className="flex items-center gap-2 px-3 py-2">
                  <input value={sched.name} onChange={(e) => update((c) => { c.planner.schedules[si].name = e.target.value; return c; })}
                    className="flex-1 text-sm font-semibold text-stone-800 border-none focus:outline-none bg-transparent" placeholder="Schedule name" />
                  <button onClick={() => setExpandedSchedules((p) => ({ ...p, [sched.id]: !p[sched.id] }))} className="text-stone-400 p-1">
                    {expandedSchedules[sched.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <ConfirmDelete onConfirm={() => update((c) => {
                    c.planner.schedules.splice(si, 1);
                    Object.keys(c.planner.weekdaySchedule || {}).forEach((wd) => { if (c.planner.weekdaySchedule[wd] === sched.id) delete c.planner.weekdaySchedule[wd]; });
                    return c;
                  })} size={14} />
                </div>
                {expandedSchedules[sched.id] && (
                  <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                    {(sched.periods || []).map((slot, i) => (
                      <div key={slot.id} className="flex items-center gap-1.5 mb-1.5">
                        <input value={slot.label} onChange={(e) => update((c) => { c.planner.schedules[si].periods[i].label = e.target.value; return c; })} placeholder="Subject / period" list="settings-period-label-options" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                        <input type="time" value={slot.startTime} onChange={(e) => update((c) => { c.planner.schedules[si].periods[i].startTime = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                        <span className="text-stone-400 text-xs">–</span>
                        <input type="time" value={slot.endTime} onChange={(e) => update((c) => { c.planner.schedules[si].periods[i].endTime = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                        <button disabled={i === 0} onClick={() => update((c) => { const arr = c.planner.schedules[si].periods; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return c; })} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronUp size={13} /></button>
                        <button disabled={i === (sched.periods || []).length - 1} onClick={() => update((c) => { const arr = c.planner.schedules[si].periods; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; return c; })} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronDown size={13} /></button>
                        <ConfirmDelete onConfirm={() => update((c) => { c.planner.schedules[si].periods.splice(i, 1); return c; })} size={13} />
                      </div>
                    ))}
                    <button onClick={() => update((c) => { c.planner.schedules[si].periods = c.planner.schedules[si].periods || []; c.planner.schedules[si].periods.push({ id: uid(), label: "New period", startTime: "09:00", endTime: "09:45" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add period</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => update((c) => {
              c.planner.schedules = c.planner.schedules || [];
              c.planner.schedules.push({ id: uid(), name: `Schedule ${c.planner.schedules.length + 1}`, periods: [] });
              return c;
            })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1 mb-4"><Plus size={12} /> Add schedule</button>

            <p className="text-sm font-semibold text-stone-700 mb-2 pt-2 border-t border-stone-100">Assign to weekdays</p>
            <p className="text-xs text-stone-400 mb-2">Which schedule applies on a "Full day schedule" day, by weekday.</p>
            {WEEKDAY_LABELS_FULL.map((label, wd) => (
              <div key={wd} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-stone-600 w-20 shrink-0">{label}</span>
                <select value={config.planner?.weekdaySchedule?.[wd] || ""} onChange={(e) => update((c) => { c.planner.weekdaySchedule = c.planner.weekdaySchedule || {}; if (e.target.value) c.planner.weekdaySchedule[wd] = e.target.value; else delete c.planner.weekdaySchedule[wd]; return c; })}
                  className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                  <option value="">Not set</option>
                  {(config.planner?.schedules || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
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
          <button onClick={() => update((c) => { c.points.behaviorLog.markTypes.push({ id: uid(), label: "New mark", color: "sky" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1 mb-4"><Plus size={12} /> Add mark type</button>

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
                  <option value="checkx">Check / X tally</option>
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
          <button onClick={() => update((c) => { c.gradeOptions.push({ id: uid(), label: "New option", weight: "neutral", color: "sky" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add grading option</button>
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
          <button onClick={() => update((c) => { c.attendance.statuses.push({ id: uid(), label: "New status", color: "stone", flagType: "none" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add status</button>
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

        <Section title="Homework tracking">
          <label className="flex items-center gap-2 text-sm text-stone-700 mb-3">
            <input type="checkbox" checked={config.homework?.enabled || false} onChange={(e) => update((c) => { c.homework.enabled = e.target.checked; return c; })} />
            Enable homework tracking for this class
          </label>
          {config.homework?.enabled && (
            <>
              <label className="block text-xs font-medium text-stone-500 mb-1">Frequency</label>
              <select value={config.homework.frequency} onChange={(e) => update((c) => { c.homework.frequency = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              {config.homework.frequency === "weekly" && (
                <>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Collection day</label>
                  <select value={config.homework.collectionDay ?? 1} onChange={(e) => update((c) => { c.homework.collectionDay = Number(e.target.value); return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                  </select>
                </>
              )}

              <label className="block text-xs font-medium text-stone-500 mb-1">Missed homeworks within window before flagging</label>
              <div className="flex gap-2 mb-3">
                <input type="number" min={1} value={config.homework.missedThreshold} onChange={(e) => update((c) => { c.homework.missedThreshold = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Count" />
                <input type="number" min={1} value={config.homework.windowDays} onChange={(e) => update((c) => { c.homework.windowDays = Math.max(1, Number(e.target.value) || 1); return c; })} className="w-1/2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Days" />
              </div>
              {[1, 2, 3, 4].map((tier) => (
                <div key={tier} className="mb-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Tier {tier}{tier === 4 ? "+" : ""}</label>
                  <input value={config.homework.missedTierMessages[tier]} onChange={(e) => update((c) => { c.homework.missedTierMessages[tier] = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                </div>
              ))}
            </>
          )}
        </Section>

        <Section title="Message style">
          <p className="text-xs text-stone-400 mb-3">Controls how the AI drafts parent messages for this class — the wording, tone, and how the school is described. Nothing here affects the facts included, only how they're phrased.</p>

          <label className="block text-xs font-medium text-stone-500 mb-1">How you refer to the school</label>
          <input value={config.messageStyle?.schoolTerm ?? "school"} onChange={(e) => update((c) => { c.messageStyle.schoolTerm = e.target.value; return c; })}
            placeholder="e.g. school, yeshiva, or your school's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <label className="block text-xs font-medium text-stone-500 mb-1">Tone</label>
          <select value={config.messageStyle?.tone ?? "warm"} onChange={(e) => update((c) => { c.messageStyle.tone = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
            <option value="warm">Warm & personal</option>
            <option value="formal">Formal & professional</option>
            <option value="brief">Brief & direct</option>
          </select>

          <label className="block text-xs font-medium text-stone-500 mb-1">A sample of how you actually write (optional)</label>
          <p className="text-xs text-stone-400 mb-1">Paste in a real message you've written before — even a couple of sentences. This matters more than the tone picker above: it's the closest way to make generated messages actually sound like you instead of a generic style.</p>
          <textarea value={config.messageStyle?.sampleText ?? ""} onChange={(e) => update((c) => { c.messageStyle.sampleText = e.target.value; return c; })}
            placeholder="e.g. Hi! Just a quick note — Sarah had a really great day today..." rows={3}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <label className="block text-xs font-medium text-stone-500 mb-1">Opening line (optional)</label>
          <input value={config.messageStyle?.openingLine ?? ""} onChange={(e) => update((c) => { c.messageStyle.openingLine = e.target.value; return c; })}
            placeholder="e.g. Dear Parent," className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <label className="block text-xs font-medium text-stone-500 mb-1">Closing line (optional)</label>
          <input value={config.messageStyle?.closingLine ?? ""} onChange={(e) => update((c) => { c.messageStyle.closingLine = e.target.value; return c; })}
            placeholder="e.g. Thank you for your partnership," className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-3" />

          <label className="flex items-center gap-2 text-sm text-stone-700 mb-3">
            <input type="checkbox" checked={config.messageStyle?.signOffName !== false} onChange={(e) => update((c) => { c.messageStyle.signOffName = e.target.checked; return c; })} />
            Sign off with your name
          </label>

          <label className="flex items-center gap-2 text-sm text-stone-700 mb-2">
            <input type="checkbox" checked={config.messageStyle?.showDisclaimer !== false} onChange={(e) => update((c) => { c.messageStyle.showDisclaimer = e.target.checked; return c; })} />
            Add a small note marking this as an automated update
          </label>
          {config.messageStyle?.showDisclaimer !== false && (
            <>
              <p className="text-xs text-stone-400 mb-2 pl-6">Helps parents recognize this came from the classroom system, not a spontaneous note — so they know a reply isn't expected.</p>
              <select value={config.messageStyle?.disclaimerPosition ?? "bottom"} onChange={(e) => update((c) => { c.messageStyle.disclaimerPosition = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white">
                <option value="bottom">Show it at the end of the message</option>
                <option value="top">Show it at the start of the message</option>
              </select>
            </>
          )}

          <div className="mt-4 pt-3 border-t border-stone-200">
            <button onClick={runStylePreview} disabled={previewLoading} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50 disabled:opacity-50">
              {previewLoading ? "Generating preview..." : "Preview a sample message"}
            </button>
            <p className="text-xs text-stone-400 mt-1.5">Uses made-up sample data, just to show how your current settings actually sound — nothing here is saved or sent.</p>
            {previewText && (
              <div className="mt-2 bg-stone-50 rounded-lg p-3 text-sm text-stone-700 whitespace-pre-wrap">{previewText}</div>
            )}
          </div>
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
          <button onClick={() => update((c) => { c.incidents.categories.push({ id: uid(), label: "New category", color: "stone" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add category</button>
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
                    })} className="text-xs font-semibold text-teal-700 flex items-center gap-1"><Plus size={12} /> Add item</button>
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
  const finalTextRef = useRef("");
  const silenceTimerRef = useRef(null);
  const SILENCE_MS = 4000; // stop after ~4s of no new speech, within the requested 3-5s range

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const clearSilenceTimer = () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => { recogRef.current?.stop(); }, SILENCE_MS);
  };

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    if (listening) {
      clearSilenceTimer();
      recogRef.current?.stop(); // user-initiated stop; onend still fires and delivers whatever was captured
      return;
    }
    setError(false);
    finalTextRef.current = "";
    const recog = new SR();
    recog.continuous = true; // keep listening across natural pauses, not just one short utterance
    recog.interimResults = true; // needed so we get frequent events to reset the silence timer against
    recog.lang = "en-US";
    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTextRef.current += (finalTextRef.current ? " " : "") + e.results[i][0].transcript.trim();
      }
      armSilenceTimer(); // any new speech (even interim) resets the "how long have they been quiet" clock
    };
    recog.onend = () => {
      clearSilenceTimer();
      setListening(false);
      const text = finalTextRef.current.trim();
      if (text) onResult(text);
    };
    recog.onerror = (e) => {
      clearSilenceTimer();
      setListening(false);
      if (e.error === "no-speech") return; // not a real error, just nothing said yet — no need to alarm the user
      setError(true);
      setTimeout(() => setError(false), 4000);
    };
    recogRef.current = recog;
    try { recog.start(); setListening(true); armSilenceTimer(); } catch { setListening(false); setError(true); setTimeout(() => setError(false), 4000); }
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

function AdminStudentProfile({ student, profileData, onUpdateStudent, onArchiveStudent, onDeleteStudent, onClose }) {
  const [expandedClasses, setExpandedClasses] = useState({});
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-6 md:my-10">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <input value={student.name} onChange={(e) => onUpdateStudent(student.id, "name", e.target.value)}
            className="display-font text-xl font-bold text-stone-900 border-none focus:outline-none bg-transparent flex-1" />
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={22} /></button>
        </div>

        <div className="p-4 space-y-4">
          <Section title="Parent & contact info">
            <StudentContactFields student={student} onUpdateField={(id, field, value) => onUpdateStudent(id, field, value)} />
          </Section>

          {profileData === null && <p className="text-sm text-stone-400">Loading...</p>}

          {profileData?.classes.length === 0 && (
            <p className="text-sm text-stone-400">Not currently enrolled in any class.</p>
          )}

          {profileData?.classes.map((cls) => {
            const expanded = expandedClasses[cls.classId];
            const attCounts = {};
            cls.attendance.forEach((a) => { attCounts[a.status] = (attCounts[a.status] || 0) + 1; });
            const attSummary = (cls.config.attendance?.statuses || []).map((st) => `${attCounts[st.id] || 0} ${st.label}`).join(" · ");
            const hwCounts = { completed: 0, missed: 0, "n/a": 0 };
            cls.homework.forEach((h) => { hwCounts[h.status] = (hwCounts[h.status] || 0) + 1; });
            const pointCats = (cls.config.points?.categories || []).filter((c) => c.scope !== "class");

            return (
              <Section key={cls.classId} title={cls.className}>
                <button onClick={() => setExpandedClasses((p) => ({ ...p, [cls.classId]: !p[cls.classId] }))}
                  className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-2">
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? "Hide details" : "Show details"}
                </button>

                {expanded && (
                  <div className="space-y-3 text-sm">
                    {cls.config.attendance && (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Attendance</p>
                        <p className="text-stone-700">{attSummary || "No attendance logged yet."}</p>
                      </div>
                    )}

                    {cls.config.homework?.enabled && (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Homework</p>
                        <p className="text-stone-700">{hwCounts.completed} completed · {hwCounts.missed} missed · {hwCounts["n/a"]} not assigned</p>
                      </div>
                    )}

                    {pointCats.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Points</p>
                        <div className="flex flex-wrap gap-2">
                          {pointCats.map((cat) => {
                            if (cat.displayMode === "checkx") {
                              return <span key={cat.id} className="text-xs bg-stone-50 rounded-full px-2 py-1">{cat.label}: {cls.points[`${cat.id}:check`] || 0} ✓ / {cls.points[`${cat.id}:x`] || 0} ✗</span>;
                            }
                            return <span key={cat.id} className="text-xs bg-stone-50 rounded-full px-2 py-1">{cat.label}: {cls.points[cat.id] || 0}{cat.threshold ? ` / ${cat.threshold}` : ""}</span>;
                          })}
                        </div>
                      </div>
                    )}

                    {(cls.config.categories || []).some((c) => c.active) && (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Assessments</p>
                        <div className="space-y-1">
                          {(cls.config.categories || []).filter((c) => c.active).map((cat) => (
                            <div key={cat.id}>
                              {(cat.items || []).map((item) => {
                                const entry = cls.skills[skillKey(cat.id, item.id)];
                                if (!entry || !entry.history || entry.history.length === 0) return null;
                                const { status } = computeSkillStatus(entry.history, { ...cat, gradeOptions: cls.config.gradeOptions });
                                const statusColor = status === "flagged" ? "text-rose-600" : status === "mastered" ? "text-emerald-600" : "text-stone-500";
                                return <p key={item.id} className="text-xs text-stone-600">{cat.title} — {item.label}: <span className={`font-semibold ${statusColor}`}>{status}</span></p>;
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Incidents ({cls.incidents.length})</p>
                      {cls.incidents.length === 0 && <p className="text-xs text-stone-400">None logged.</p>}
                      <ul className="space-y-1">
                        {cls.incidents.slice(0, 10).map((i) => (
                          <li key={i.id} className="text-xs text-stone-600">
                            {i.flaggedForAdmin && <Flag size={11} className="inline text-rose-600 fill-rose-600 mr-1 -mt-0.5" />}
                            <span className="font-semibold">{i.date}</span> · {i.categoryLabel}{i.description ? ` — ${i.description}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </Section>
            );
          })}

          {profileData?.programs.length > 0 && (
            <Section title="Shared programs">
              <div className="space-y-2">
                {profileData.programs.map((prog) => {
                  const cats = prog.config.points?.categories || [];
                  return (
                    <div key={prog.programId} className="text-sm">
                      <p className="font-semibold text-stone-800">{prog.programName}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {cats.length === 0 && <span className="text-xs text-stone-400">No point categories set up yet.</span>}
                        {cats.map((cat) => (
                          <span key={cat.id} className="text-xs bg-violet-50 text-violet-700 rounded-full px-2 py-1">{cat.label}: {prog.points[cat.id] || 0}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Manage this student">
            <div className="flex gap-2">
              <ConfirmDelete onConfirm={() => onArchiveStudent(student.id)} label="Archive student" className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50" confirmText="Archive it?" armedClassName="text-xs font-semibold text-white bg-stone-600 rounded-lg px-3 py-2" />
              <ConfirmDelete onConfirm={() => onDeleteStudent(student.id)} label="Delete permanently" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" confirmText="Delete forever?" armedClassName="text-xs font-semibold text-white bg-red-600 rounded-lg px-3 py-2" />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function MyAccountPanel({ teacher, onUpdateName, onChangePassword, onClose }) {
  const [name, setName] = useState(teacher?.name || "");
  const [nameSaved, setNameSaved] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const saveName = async () => {
    if (!name.trim()) return;
    await onUpdateName(name.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const submitPasswordChange = async () => {
    setPwError("");
    if (newPw.length < 6) { setPwError("New password needs to be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }
    setPwSaving(true);
    const result = await onChangePassword(currentPw, newPw);
    setPwSaving(false);
    if (!result.ok) { setPwError(result.error); return; }
    setPwSuccess(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <GlobalAppStyles />
      <div className="bg-white rounded-2xl max-w-md w-full my-8">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <p className="display-font text-xl font-bold text-stone-900">My Account</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={22} /></button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Your name</label>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <button onClick={saveName} className="bg-teal-700 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-teal-800">Save</button>
            </div>
            {nameSaved && <p className="text-xs text-emerald-600 mt-1">Saved.</p>}
          </div>

          <div className="pt-4 border-t border-stone-200">
            <p className="text-sm font-semibold text-stone-800 mb-2">Change password</p>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            {pwError && <p className="text-xs text-rose-600 mb-2">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-600 mb-2">✓ Password changed.</p>}
            <button onClick={submitPasswordChange} disabled={pwSaving || !currentPw || !newPw || !confirmPw} className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {pwSaving ? "Changing..." : "Change password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mailto links only work if the browser has a registered default mail handler — this varies a
// lot machine to machine (a phone's own Mail app almost always has one; a laptop's browser
// often doesn't unless one's been explicitly set, which is exactly why the same click can open
// a real draft on one device and just a blank browser tab on another). "Copy message" is the
// fallback that works everywhere regardless of that setup — paste into whatever's actually open.
function MailActionButtons({ email, bcc, subject, body, size = "normal" }) {
  const [copied, setCopied] = useState(false);
  const bccParam = bcc && bcc.length > 0 ? `&bcc=${encodeURIComponent(bcc.join(","))}` : "";
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email || "")}${bccParam}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // Gmail's compose-link BCC field is a real, documented risk once a link gets long — recipients
  // can silently go missing partway through the list, with no error shown anywhere. That's not
  // something a URL can be made reliably safe against past a certain size, so past a conservative
  // length, "Open in Gmail" is hidden entirely rather than risk it quietly dropping names — "Copy
  // message" has no such limit at all, since it's just plain text pasted into a compose window
  // the teacher opens themselves.
  const riskyLength = gmailHref.length > 1800;

  const copyToClipboard = async () => {
    try {
      const toLine = email ? `To: ${email}\n` : "";
      const bccLine = bcc && bcc.length > 0 ? `Bcc: ${bcc.join(", ")}\n` : "";
      await navigator.clipboard.writeText(`${toLine}${bccLine}Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard permission denied — button just won't show feedback */ }
  };

  const btnClass = size === "small"
    ? "flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1.5"
    : "flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-2";

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {!riskyLength && (
          <a href={gmailHref} target="_blank" rel="noopener noreferrer" className={`${btnClass} text-white bg-teal-700 hover:bg-teal-800`}>
            <Mail size={13} /> Open in Gmail
          </a>
        )}
        <button onClick={copyToClipboard} className={`${btnClass} text-stone-600 border border-stone-300 hover:bg-stone-50`}>
          <Copy size={13} /> {copied ? "Copied!" : "Copy message"}
        </button>
      </div>
      {riskyLength && (
        <p className="text-xs text-amber-700 mt-1.5">
          This list is long enough that Gmail's own link can silently drop names partway through — that's a real limitation on Gmail's end, not something a link can fully guard against. Use "Copy message" and paste it into Gmail yourself instead; every name will be there.
        </p>
      )}
    </div>
  );
}

function ArchiveOrDeleteMenu({ onArchive, onDeletePermanently, size }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { setOpen(false); setConfirmingDelete(false); }, 5000);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-stone-400 hover:text-red-500 p-1"><Trash2 size={size || 14} /></button>;
  }

  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => { onDeletePermanently(); setOpen(false); }} className="text-[10px] font-semibold text-white bg-red-600 rounded-full px-2 py-1 whitespace-nowrap">Delete forever?</button>
        <button onClick={() => { setOpen(false); setConfirmingDelete(false); }} className="text-[10px] text-stone-400 px-1">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => { onArchive(); setOpen(false); }} title="Keep the data, just hide it — you can bring it back later" className="text-[10px] font-semibold text-stone-600 border border-stone-300 rounded-full px-2 py-1 whitespace-nowrap hover:bg-stone-50">Archive</button>
      <button onClick={() => setConfirmingDelete(true)} title="Permanently remove — cannot be undone" className="text-[10px] font-semibold text-red-600 border border-red-200 rounded-full px-2 py-1 whitespace-nowrap hover:bg-red-50">Delete</button>
      <button onClick={() => setOpen(false)} className="text-[10px] text-stone-400 px-1">Cancel</button>
    </div>
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

// Catches any render-time error anywhere in the app and shows a recoverable message instead of a
// blank white screen with no way back. A single bug in one screen (like a report crashing on
// unexpected data) should never be able to strand someone with no path forward — reloading always
// gets them back to a working app, even if the specific screen that crashed still has a bug in it.
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("Caught by ErrorBoundary:", error); }
  handleReload = () => {
    // Belt and suspenders — several different ways of forcing a fresh load, tried together.
    // This matters more than it might seem: someone using this as an installed app (added to
    // their home screen) has no browser bar, no visible refresh icon, nothing outside this
    // button at all — so this has to be the one thing that reliably works, not just one option
    // among several.
    try { window.location.reload(); } catch (e) { /* fall through to the other attempts below */ }
    try { window.location.href = window.location.origin + window.location.pathname; } catch (e) { /* href on this element is a last-resort fallback */ }
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10 text-center">
          <div className="max-w-sm w-full">
            <p className="text-sm font-semibold text-stone-800 mb-2">Something went wrong on this screen.</p>
            <p className="text-xs text-stone-500 mb-4">Nothing was lost. Tap the button below to get back to a working screen.</p>
            <a href="/" onClick={this.handleReload} className="inline-block text-sm font-semibold bg-teal-700 text-white rounded-lg px-4 py-2 hover:bg-teal-800">
              Reload
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
