// src/core.jsx
// The app's shared foundation — pulled out of App.jsx as the first, lowest-risk step in breaking
// the whole app up into properly organized pieces. This is everything the rest of the app depends
// on but that doesn't itself depend on anything defined later in the app: default content and
// configuration, date/calendar math, Firestore read/write helpers and the live-subscription hooks
// built on them, push-notification senders, and small shared utility functions. Nothing in this
// file was rewritten — every line is exactly what it was in App.jsx, just relocated together and
// exported so the rest of the app can import what it needs.

import { db, auth, storage, messagingPromise } from "./firebase";
import { getToken } from "firebase/messaging";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, documentId, onSnapshot } from "firebase/firestore";
import { useState, useEffect, useLayoutEffect, useRef, createContext } from "react";
import { HDate, HebrewCalendar } from "@hebcal/core";
import * as XLSX from "xlsx";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// ---------- Default content (all editable later via Settings) ----------

export const DEFAULT_LETTERS = [
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

export const DEFAULT_NEKUDOS = [
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

export const DEFAULT_BLENDING_CONCEPTS = [
  { id: "blend-cv", label: "Letter + Vowel Blend", desc: "Blends a single letter with a vowel smoothly" },
  { id: "blend-transition", label: "Sound Transition", desc: "Moves from one sound to the next without losing the first" },
];

export const DEFAULT_BLENDING_WORDS = [
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

export const DEFAULT_RULES = [
  { id: "shva-na", label: "Shva Na", desc: "Vocal shva — pronounced quickly" },
  { id: "shva-nach", label: "Shva Nach", desc: "Silent shva" },
  { id: "dagesh-chazak", label: "Dagesh Chazak", desc: "Doubling dagesh in a letter" },
];

// Seeded once, the first time schoolTools is ever loaded and nothing has been saved yet. Once an
// admin adds, edits, or removes anything, a real (saved) list exists in Firestore and this default
// no longer applies — it's a starting point, not something re-applied on every load.
export const DEFAULT_SCHOOL_TOOLS = [
  { id: "seed-chumash-quest", category: "tool", label: "Chumash Quest", url: "https://chumash-quest.yoeleidel.chatgpt.site", description: "" },
  { id: "seed-curriculum-generator", category: "tool", label: "Curriculum Generator", url: "https://chinuchapp.com/curriculum-generator", description: "" },
];

export const DEFAULT_CONFIG = {
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
      { id: "health", label: "Health", color: "cyan" },
      { id: "discipline", label: "Discipline", color: "rose" },
      { id: "social", label: "Social / Peer", color: "violet" },
      { id: "lost-item", label: "Lost item or work", color: "amber" },
    ],
    flagRule: { threshold: 3, windowDays: 7 },
    tierMessages: { 1: "Make a note, keep an eye on it", 2: "Send a note home", 3: "Schedule a parent meeting", 4: "Flag for admin" },
  },
  // Deliberately separate from `incidents` above, not a preschool-specific override layered onto
  // it — the elementary behavior/incident system (discipline, social/peer conflicts, lost
  // schoolwork) has nothing to do with what a preschool teacher is actually documenting, and a
  // shared category list meant a "Health Incident" tap in a preschool room to log a fall or a
  // bump landed on a form still offering "Discipline" as an option. These two lists exist so
  // fixing that never risks changing what elementary teachers see, and vice versa. Category sets
  // grounded in what daycare/preschool incident-report guidance actually documents (falls and
  // bumps, cuts and scrapes, bites, fever/illness, allergic reactions — the physical, medical
  // side) versus care/behavioral situations that come up but aren't medical (a care instruction
  // not followed, a difficult separation from a parent, a peer conflict, a lost item) — kept
  // genuinely separate from each other too, matching the two distinct preschool tiles they serve.
  preschoolHealthIncidents: {
    categories: [
      { id: "fall-bump", label: "Fall or bump", color: "sky" },
      { id: "cut-scrape", label: "Cut or scrape", color: "rose" },
      { id: "bite", label: "Bite (from another child)", color: "amber" },
      { id: "nosebleed", label: "Nosebleed", color: "indigo" },
      { id: "allergic-reaction", label: "Allergic reaction", color: "violet" },
      { id: "fever-illness", label: "Fever or illness symptom", color: "teal" },
      { id: "rash", label: "Rash or skin irritation", color: "fuchsia" },
      { id: "other", label: "Other", color: "stone" },
    ],
  },
  preschoolIncidents: {
    categories: [
      { id: "peer-conflict", label: "Peer conflict", color: "violet" },
      { id: "difficult-separation", label: "Difficult drop-off or separation", color: "sky" },
      { id: "care-instruction", label: "Care instruction not followed", color: "amber" },
      { id: "toileting-accident", label: "Toileting accident", color: "teal" },
      { id: "lost-item", label: "Lost or misplaced item", color: "stone" },
      { id: "other", label: "Other", color: "stone" },
    ],
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

export const COLOR_CHOICES = ["emerald", "amber", "rose", "indigo", "sky", "violet", "stone", "teal", "fuchsia"];
// Swipe-between-tabs on the teacher side (ClassApp) — paused for now, per direct request, since it
// was getting in the way there. This is the ONLY place it's controlled from; flip to true to
// restore it, nothing else needs to change. Doesn't touch the parent app's own swipe (a separate,
// unrelated mechanism), and doesn't touch the horizontal scroll on the tab bar row itself, which
// is a completely different thing (its own overflow-x-auto) from this full-page swipe gesture.
export const SWIPE_BETWEEN_TABS_ENABLED = false;
// Quick-add suggestions for a class's Subjects list — tap one to add it instantly, or type
// something else entirely. Not a fixed or required set, just a head start.
export const SUBJECT_LIBRARY = ["Davening", "Kriya", "Chumash", "Hebrew Grammar", "Ksiva", "Tanya Baal Peh", "Gemara", "Mishnayos", "Yiddish", "English", "Math"];
// Common schedule blocks that fill out a day but aren't academic subjects — offered as
// suggestions when building a schedule, but deliberately kept out of the Subjects list itself
// (so they never show up as a row in Benchmarks or the Assessments grid).
export const SCHEDULE_BLOCK_LIBRARY = ["Recess", "Lunch", "Transition", "Assembly", "Free Time", "Prep / Break"];
export const WEEKDAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; // indices match Date.getDay()
export const PAGE = "app-page";

export function skillKey(catId, itemId) { return `${catId}:${itemId}`; }
// A class-assessment result is stored as either a plain string (the grade, and how every
// existing assessment already stores it) or, once a note is added, an object of
// {grade, note} — these two helpers read either shape the same way so nothing needs migrating.
export function getResultGrade(r) { return r == null ? "" : (typeof r === "object" ? (r.grade || "") : String(r)); }
export function getResultNote(r) { return r != null && typeof r === "object" ? (r.note || "") : ""; }

// Builds the shared instruction block injected into every AI message-drafting prompt, so tone,
// school terminology, and opening/closing wording are configurable per class instead of
// hardcoded — this is also where the school reference itself is configurable (previously
// hardcoded as "Hebrew school" regardless of what kind of school it actually was).
export function buildStyleInstructions(config, teacherName) {
  const style = config?.messageStyle || {};
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
// Converts plain a-z/A-Z letters to their Unicode "Mathematical Italic" equivalents — visually
// italic in any plain-text context (Gmail's compose link, in-app messages, anywhere), since these are
// genuinely different characters rather than a formatting instruction that a plain-text channel
// could silently drop. Unicode has one gap in this block (lowercase h uses the pre-existing Planck
// constant character by convention) which is handled as a special case below.
export function toItalicUnicode(str) {
  return (str || "").replace(/[a-zA-Z]/g, (ch) => {
    if (ch === "h") return "\u210E";
    const isUpper = ch >= "A" && ch <= "Z";
    const base = isUpper ? 0x1D434 : 0x1D44E;
    return String.fromCodePoint(base + (ch.toLowerCase().charCodeAt(0) - 97));
  });
}

export const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,}[^\s]*)/gi;

// Finds the first URL in a block of text, with trailing punctuation stripped — used to decide
// whether a message gets a rich preview card underneath it. Uses String.match() rather than
// exec()/test() on this same global-flagged pattern deliberately: those two carry state
// (lastIndex) between calls and give wrong answers on repeated use against a shared regex, the
// same pitfall LinkifiedText below works around a different way.
export function extractFirstUrl(text) {
  const matches = (text || "").match(URL_PATTERN);
  if (!matches || matches.length === 0) return null;
  const first = matches[0].replace(/[.,!?;:)]+$/, "");
  return first.startsWith("http") ? first : `https://${first}`;
}

// Splits plain message text on URLs and renders each one as a real, clickable link — trailing
// punctuation (a period ending the sentence, a comma, etc.) is peeled back off the link itself so
// "check this out: example.com." doesn't swallow that final period into the href. Everything
// that isn't a URL renders as plain text exactly as typed, same as today.
// String.split() on a regex with a capturing group interleaves the matches back into the result
// at every odd index — checking that directly, rather than re-running the (stateful, global-
// flagged) regex against each piece, since re-testing a `g`-flagged regex advances its own
// lastIndex between calls and produces wrong results on exactly this kind of repeated use.
export function LinkifiedText({ text, className, linkClassName }) {
  const parts = (text || "").split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (i % 2 === 0) return <span key={i}>{part}</span>;
        const trailingMatch = part.match(/[.,!?;:)]+$/);
        const trailing = trailingMatch ? trailingMatch[0] : "";
        const urlPart = trailing ? part.slice(0, -trailing.length) : part;
        const href = urlPart.startsWith("http") ? urlPart : `https://${urlPart}`;
        return (
          <span key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName || "underline"} onClick={(e) => e.stopPropagation()}>
              {urlPart}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}

// A rich preview card underneath a message that contains a link — title, description, and image
// pulled from the page's own Open Graph tags via the backend (browsers can't fetch another site's
// raw HTML directly, so this has to be server-side). Fails silently into rendering nothing at all
// if the fetch doesn't work out: the plain, clickable link from LinkifiedText above is already a
// complete, working fallback, so a failed preview should never look like a broken UI element.
export function LinkPreviewCard({ url }) {
  const [preview, setPreview] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setFailed(false);
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { headers });
        if (!res.ok) throw new Error("preview fetch failed");
        const data = await res.json();
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (failed || !preview) return null;
  // A preview that's just the bare URL echoed back, with nothing else, doesn't add anything a
  // person can't already see from the plain link text above it — skip rendering an empty-looking
  // card in that case rather than show a mostly-blank box.
  if (preview.title === url && !preview.description && !preview.image) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      className="block mt-1.5 rounded-lg border border-black/10 overflow-hidden bg-white/95 hover:bg-white max-w-xs">
      {preview.image && <img src={preview.image} alt="" className="w-full h-32 object-cover" />}
      <div className="px-2.5 py-2">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide truncate">{preview.siteName}</p>
        <p className="text-xs font-semibold text-stone-800 line-clamp-2">{preview.title}</p>
        {preview.description && <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{preview.description}</p>}
      </div>
    </a>
  );
}

export function applyMessageDisclaimer(draftText, config, schoolLabel, teacherSignOff) {
  const style = config?.messageStyle || {};
  if (style.showDisclaimer === false) return draftText;
  const term = (style.schoolTerm || "school").trim() || "school";
  const label = schoolLabel || `Sent via your child's ${term} classroom system`;
  const noteText = (teacherSignOff || "").trim() || `— ${label}, an automated update. No reply needed unless you have a question. —`;
  const note = toItalicUnicode(noteText);
  return style.disclaimerPosition === "top" ? `${note}\n\n${draftText}` : `${draftText}\n\n${note}`;
}

// The one central copy of this template — every place that sends a parent their account setup
// email reads from here, so editing it in Settings actually changes what goes out, rather than
// one of several hard-coded copies scattered through the code that a wording change would need
// to be repeated in.
export const DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE = `Hi {{parentName}},

Welcome to the {{schoolName}} Parent Portal! You can now see updates, photos, and messages from {{studentName}}'s class right from your phone.

To get started:
1. Go to {{loginLink}}
2. Sign in with:
   Email: {{email}}
   Password: {{tempPassword}}
3. We recommend changing your password once you're in, under Settings.

If you have any trouble getting in, just reach out to the office.

Looking forward to keeping you in the loop!`;

export const PARENT_SETUP_EMAIL_PLACEHOLDERS = [
  { key: "parentName", label: "Parent/guardian's name" },
  { key: "studentName", label: "Student's name" },
  { key: "schoolName", label: "School/app name" },
  { key: "email", label: "Login email" },
  { key: "tempPassword", label: "Temporary password" },
  { key: "loginLink", label: "Sign-in link" },
];

// Straightforward {{placeholder}} substitution — deliberately simple rather than a templating
// library, since this only ever needs flat key/value replacement, never loops or conditionals.
export function renderParentSetupEmail(template, vars) {
  let result = template || "";
  PARENT_SETUP_EMAIL_PLACEHOLDERS.forEach(({ key }) => {
    result = result.replaceAll(`{{${key}}}`, vars?.[key] ?? "");
  });
  return result;
}

// Lets a teacher see exactly what their current style settings actually sound like — using
// clearly-fake sample data — without needing to log a real incident or wait for a real event
// to test it. Purely a preview: nothing here is saved or sent anywhere.
export async function generatePreviewMessage(config, teacher) {
  const teacherName = teacher?.name;
  const prompt = `${buildStyleInstructions(config, teacherName)}

This is a PREVIEW using made-up sample data, just to demonstrate the writing style — not a real student or a real situation.

Student: Sample Student
Situation: Was absent one day this week and seemed to have a great day back — participated well in group work.

Write 2-3 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

// A reaction entry is either a bare reactor id (older posts, saved before names were stored
// alongside them) or { id, name } (current shape) — this reads either correctly so nothing
// already published needs migrating.
export function reactorIdOf(entry) { return typeof entry === "string" ? entry : entry?.id; }
export function reactorNameOf(entry) { return typeof entry === "string" ? null : entry?.name; }

// The push-notification body text for a message that has one or more attachments and possibly no
// typed text at all — used by every send function below instead of repeating this logic five
// times. Counts by type rather than just saying "Sent an attachment," since "Sent 3 photos" is
// more useful on a lock screen than a generic label, but falls back to a plain count for a mixed
// batch rather than trying to enumerate every type combination.
export function describeAttachmentsForNotification(attachments) {
  if (!attachments || attachments.length === 0) return "";
  if (attachments.length === 1) {
    const type = attachments[0].type;
    return type === "video" ? "Sent a video" : type === "file" ? "Sent a file" : type === "audio" ? "Sent an audio file" : "Sent a photo";
  }
  const types = new Set(attachments.map((a) => a.type));
  if (types.size === 1) {
    const type = attachments[0].type;
    const label = type === "video" ? "videos" : type === "file" ? "files" : type === "audio" ? "audio files" : "photos";
    return `Sent ${attachments.length} ${label}`;
  }
  return `Sent ${attachments.length} attachments`;
}

// Single-reaction-per-person logic, shared by every place a post or a specific block within one
// can be reacted to — picking a new reaction replaces whichever one that person already had
// there rather than adding alongside it; picking the same one again removes it (toggle-off).
// Works on whatever reactions map it's handed, so the same function serves both a whole post's
// reactions and one specific block's, without duplicating this logic in either place. Stores the
// reactor's name alongside their id (not just the id alone, as before) — that's what makes it
// possible to show who reacted, not only how many did.
export function computeSingleChoiceReactions(existingReactions, emoji, reactorId, reactorName) {
  const reactions = {};
  Object.entries(existingReactions || {}).forEach(([key, entries]) => {
    reactions[key] = (entries || []).filter((entry) => reactorIdOf(entry) !== reactorId);
  });
  const alreadyHadThisOne = (existingReactions?.[emoji] || []).some((entry) => reactorIdOf(entry) === reactorId);
  if (!alreadyHadThisOne) reactions[emoji] = [...(reactions[emoji] || []), { id: reactorId, name: reactorName }];
  return reactions;
}

export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// Route-aware notification suppression — the app being open at all is never, by itself, a reason
// to suppress a notification (that's the whole point of this: WhatsApp-style behavior, not
// "foregrounded = quiet"). The only thing that matters is whether the person is looking at the
// EXACT content a given notification is about, checked against the simple global flag the
// relevant screens themselves declare (see ConversationThreadView and ParentPortalApp).
export function isViewingNotificationTarget(url) {
  if (!url) return false;
  try {
    const params = new URL(url, window.location.origin).searchParams;
    const active = window.__activeContent || {};
    const openType = params.get("open");
    const classId = params.get("classId");
    const groupId = params.get("groupId");

    if (openType === "messages" && groupId) {
      // A teacher's own view of one specific family's classroom thread. Deliberately not also
      // checked against classId — the underlying threadKey format (classroom-{groupId}) never
      // carried a classId to begin with, a pre-existing characteristic of how read-state and
      // Storage attachment paths for this thread type already work elsewhere in the app, not
      // something introduced here. The rare edge case this leaves open: a teacher assigned to two
      // different classes that both happen to include the exact same family could see a
      // notification for one suppressed while looking at the other. Narrowing that further would
      // mean changing that shared key format itself, which is a larger, riskier change than this
      // specific gap justifies.
      return active.threadKey === `classroom-${groupId}`;
    }
    if (openType === "messages" && classId) {
      // A family's own view of their class thread — this thread type only ever carries a
      // classId, not a per-family id, which is a known, pre-existing limitation of that key's
      // format elsewhere in the app (see the Storage rules), not something new here.
      return active.threadKey === `class-${classId}`;
    }
    if (openType === "admin") {
      // A family only ever has one admin thread — their own — so being on any admin-* thread at
      // all is unambiguous.
      return typeof active.threadKey === "string" && active.threadKey.startsWith("admin-");
    }
    if (openType === "blog") return active.tab === "blog";
    if (openType === "homework") return active.tab === "homework";
    return false;
  } catch {
    return false;
  }
}

export function todayISO() { return isoDate(new Date()); }

// "Today," "Yesterday," or a short "Aug 14" style label — used wherever a date needs to read at a
// glance rather than as a full MM/DD/YYYY value, like the compact date-nav control.
export function friendlyDateLabel(iso) {
  if (iso === todayISO()) return "Today";
  const d = new Date(iso + "T00:00:00");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === isoDate(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Replaces WhatsAppButton across every "generate a message about a student, then send" flow —
// looks up that student's linked family account and sends straight into their classroom thread,
// the same reliable, already-tested path used everywhere else in-app messaging happens, rather
// than handing off to an outside app.
export function SendInAppButton({ studentId, classId, message, sendMessage, className }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | no-family
  const send = async () => {
    if (!message?.trim()) return;
    setState("sending");
    const relevant = await fetchClassFamilies(classId);
    const match = relevant.find((f) => (f.studentLinks || []).some((l) => l.studentId === studentId && l.classId === classId));
    if (!match) { setState("no-family"); return; }
    // This specific guardian's own uid — same reasoning as the two sibling fixes on the photo
    // quick-share and broadcast tools: familyGroupId would silently misroute to whichever
    // guardian happens to be that shared group's "primary" instead of the one actually matched.
    await sendMessage(match.uid, message.trim());
    setState("sent");
  };
  if (state === "sent") return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} /> Sent in-app</span>;
  if (state === "no-family") return <span className="text-xs text-amber-700">No parent account linked for this student yet.</span>;
  return (
    <button onClick={send} disabled={state === "sending"}
      className={className || "flex items-center gap-1 text-xs font-semibold text-white bg-teal-700 rounded-lg px-2.5 py-1.5 hover:bg-teal-800 disabled:opacity-50"}>
      {state === "sending" ? <Loader2 className="animate-spin" size={12} /> : <MessageCircle size={12} />} Send in-app
    </button>
  );
}
export function withinWindow(dateStr, windowDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  return dateStr >= isoDate(cutoff);
}
export function tierFor(count, threshold) { return Math.max(1, Math.min(4, count - threshold + 1)); }

export function monthKey(year, monthIdx) { return `${year}-${String(monthIdx + 1).padStart(2, "0")}`; }

export const EVENT_CATEGORIES = [
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
export function hebrewDateFor(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new HDate(new Date(y, m - 1, d)).toString();
}

// Automatic Jewish holidays for a Gregorian year, filtered down to exactly the categories
// requested (Rosh Hashana/Yom Kippur/Sukkos/Chanukah/Purim/Pesach/Shavuos/Lag BaOmer/fast
// days/Rosh Chodesh) — verified against real @hebcal/core output, not guessed from docs.
// Deliberately excludes special-Shabbat names and modern Israeli holidays, neither of which
// were requested.
export function getAutoHolidaysForYear(year) {
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
export function monthLabel(year, monthIdx) {
  return new Date(year, monthIdx, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
export function shabbosAwareReminderDate(year, monthIdx, dayOfMonth, avoidFriday) {
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
export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDaysISO(dateStr, n) {
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
export function getScheduleForDate(dateStr, dayType, config, plannerDays) {
  const override = plannerDays?.[dateStr]?.scheduleOverride;
  if (override) return override;
  if (!dayType || dayType.scheduleTemplate === "none") return null;
  const weekday = new Date(`${dateStr}T00:00:00`).getDay();
  // New model: every existing consumer of this function keeps working unchanged, since blocks
  // are mapped back into the same {id, label, startTime, endTime} shape schedules always returned
  // — only the underlying source of truth changes, once a class has been migrated to it.
  if (config.planner?.scheduleBlocks) {
    const dayIdx = weekday - 1; // getDay(): 0=Sun..6=Sat -> blocks use 0=Mon..4=Fri
    return config.planner.scheduleBlocks
      .filter((b) => b.day === dayIdx)
      .sort((a, b) => a.start - b.start)
      .map((b) => ({ id: b.id, label: b.label, startTime: minutesToTime(b.start), endTime: minutesToTime(b.end), subjectId: b.subjectId || null, color: b.color }));
  }
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
export function useVisualViewportHeight() {
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

// The FULL viewport height is the wrong number for a bounded-height view that renders below the
// app's own sticky header (logo, tab bar, child-switcher) — using it anyway claims more vertical
// space than actually exists below where this view starts, pushing its true bottom past the
// visible screen edge. That's what read as "goes to the bottom, but not all the way — there's
// still one more message I have to scroll to reach." This measures the element's own actual
// starting position (via getBoundingClientRect, which already accounts for everything above it,
// whatever that header's real height happens to be — notch, safe-area insets, switcher shown or
// not — without needing to know or predict any of that directly) and returns only the space that
// genuinely remains below it. Re-measures on mount and whenever the viewport itself changes
// (keyboard open/close, orientation), which covers the case that actually matters here: this is
// measured once when the view first mounts, and mount is exactly when the header above it has
// already settled into its real height.
export function useRemainingViewportHeight(ref) {
  const viewportHeight = useVisualViewportHeight();
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) setTop(ref.current.getBoundingClientRect().top);
  }, [viewportHeight]); // eslint-disable-line react-hooks/exhaustive-deps
  return viewportHeight - top;
}

// "Sticks" to the bottom of a scrollable feed the way a real chat app does — not a one-time jump
// on arrival, but staying pinned there through anything that changes the content's height
// afterward (a web font finishing its swap-in, a reaction count settling in, an image's real
// dimensions replacing its reserved aspect-ratio box by a pixel or two), for as long as the
// person hasn't taken control by scrolling themselves. This is what a single scrollIntoView call
// on mount can't cover: it lands correctly for the content that exists at that exact instant, but
// anything that grows the content afterward silently leaves that old position short of the real
// bottom — which is exactly what reads as "close, but a small jump happens when you touch it."
// containerRef is the scrollable element itself (whose scrollTop this sets); contentRef is
// whatever's actually growing inside it — needed separately because the scrollable element's OWN
// box stays a fixed height (that's what makes it scrollable at all), so watching it directly would
// never see the resize that watching its content does. resetKey re-arms "stuck" mode fresh
// whenever it changes (switching to a different conversation or class, say), so a person who
// scrolled up while reading an old thread doesn't stay "unstuck" once they've moved to a new one
// that deserves to open at its own bottom again.
export function useStickToBottom(containerRef, contentRef, resetKey) {
  const stuckRef = useRef(true);
  useLayoutEffect(() => {
    stuckRef.current = true;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const jump = () => { if (stuckRef.current) container.scrollTop = container.scrollHeight; };
    jump();
    const observer = new ResizeObserver(jump);
    observer.observe(content);
    const onScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      stuckRef.current = distanceFromBottom < 40; // small tolerance for sub-pixel rounding
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", onScroll);
    };
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

// A program's roster is never stored on its own — it's always the current combined roster
// of whichever classes are members, so adding or removing a student from a member class
// automatically shows up here too, with no separate list to keep in sync.
export async function fetchProgramRoster(memberClassIds) {
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

export function getAllPeriodsEverywhere(config) {
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
export const IMPORT_FIELD_OPTIONS = [
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

export const IMPORT_FIELD_KEYWORDS = {
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
export const IMPORT_FIELD_CHECK_ORDER = ["parent2Name", "parent2Email", "parent2Phone", "parent1Name", "parentEmail", "parentPhone", "homeAddress", "gregorianBirthday", "notes", "name"];

export function guessImportField(header) {
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

export function parseSpreadsheetFile(file) {
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

export function buildMonthGrid(year, monthIdx) {
  const first = new Date(year, monthIdx, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(new Date(year, monthIdx, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
export function eachDateInRange(startStr, endStr) {
  const out = [];
  let cur = startStr;
  let guard = 0;
  while (cur <= endStr && guard < 3660) { out.push(cur); cur = addDaysISO(cur, 1); guard++; }
  return out;
}

// 'full' = normal school day, 'half' = half-day schedule, 'none' = no school (Shabbos, etc.) —
// shared by the benchmark calendar view and the school-aware date-range picker, so both agree
// on what counts as a school day using the exact same logic.
export function scheduleKindForDate(dateStr, plannerDays, dayTypes) {
  const dayTypeMap = {};
  (dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const dt = plannerDays?.[dateStr]?.dayType ? dayTypeMap[plannerDays[dateStr].dayType] : null;
  if (dt?.hidesAttendance) return "none";
  if (dt?.scheduleTemplate === "half") return "half";
  return "full";
}

export function computeSkillStatus(history, config) {
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
export function computeSessionTimeline(data, category, config) {
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

// A temporary, visible diagnostic trail — not a permanent feature — built specifically to
// actually see what's happening on a device where sign-in visibly succeeds for a fraction of a
// second and then silently reverts, since two different fixes aimed at two different guesses
// (a rate-limit lockout, then a storage/persistence failure) were each tried and neither one
// actually changed what that specific device does, meaning both guesses were wrong or
// incomplete. On window rather than component state specifically so it survives exactly the
// sequence being diagnosed — this screen unmounting when sign-in succeeds, then remounting when
// it bounces back — instead of resetting itself in the middle of the very thing being watched.
window.__authDebugLog = window.__authDebugLog || [];
export function logAuthDebug(message) {
  window.__authDebugLog.push(`${new Date().toLocaleTimeString()} — ${message}`);
  if (window.__authDebugLog.length > 25) window.__authDebugLog.shift();
}

// One shared, single answer for "is this teacher or family account actually still turned on" —
// previously answered independently, four separate times, in different parts of the app, each
// its own small chance to get slightly out of sync with the others. A record with no active field
// at all counts as active, matching every one of those four original checks exactly — an account
// only ever counts as turned off once something has explicitly set active to false.
export function isAccountActive(record) { return record?.active !== false; }

// Same idea as isAccountActive just above, for a separate, genuinely different question: is this
// specific person an admin. Consolidates the two places that gate behavior for the CURRENTLY
// signed-in person based on their own role (deciding what screen to route into, deciding whether
// to auto-start onboarding) — deliberately not the places elsewhere that filter OTHER people out
// of a list, since that's a different job asking a related but distinct question, not this one.
export function isAdminRole(record) { return record?.role === "admin"; }

// A third, related question — not "is this the signed-in person's own role" (isAdminRole above),
// but "should this OTHER teacher be offered as an option" — for the two places that build a
// pick-a-teacher list (a default selection, and the full dropdown itself) where an admin
// shouldn't be offered as a regular teacher to message, and neither should anyone whose account
// has been turned off. These two used to check this slightly differently from each other — one
// checked only the role, the other checked role and active status together — a real, pre-existing
// inconsistency that could have left the default selection pointing at someone not actually
// offered as an option in the dropdown itself. Both now agree.
export function isRegularActiveTeacher(record) { return !isAdminRole(record) && isAccountActive(record); }

export function emptyStudentData() { return { skills: {}, fluency: [], attendance: [], periodAttendance: [], homework: [], points: {}, communications: [], mood: [], meals: [], naps: [], diapers: [], bathroom: [], checkIns: [] }; }

// Silently collapses any duplicate meal (same date + mealType) or nap (same date) entries down to
// just one — keeping whichever has the later loggedAt, since that's the one an actual correction
// would produce. This exists because a manual, admin-triggered check-and-fix tool isn't a real
// answer to a duplicate that can happen on its own: nobody is going to remember to regularly go
// look for these, so healing has to happen automatically, on its own, the moment the data is
// touched by anyone — not wait on a person to go find it. Called from every place this app loads
// a student's daily-log data for display (both the teacher's own class view and the parent's own
// view), so whichever one happens to load the data first silently repairs it for everyone,
// immediately, with no admin action involved at all. An entry with no loggedAt at all (only
// possible from before this field existed) is treated as older than any timestamped one, since a
// real timestamp is strictly better information than none.
export function dedupeDailyLogData(data) {
  const dedupeByKey = (list, keyFn) => {
    const seen = {};
    (list || []).forEach((entry) => {
      const key = keyFn(entry);
      const existing = seen[key];
      if (!existing || (entry.loggedAt || "") > (existing.loggedAt || "")) seen[key] = entry;
    });
    return Object.values(seen);
  };
  const meals = dedupeByKey(data.meals, (m) => `${m.date}:${m.mealType}`);
  const naps = dedupeByKey(data.naps, (n) => n.date);
  const changed = meals.length !== (data.meals || []).length || naps.length !== (data.naps || []).length;
  if (!changed) return { data, changed: false };
  return { data: { ...data, meals, naps }, changed: true };
}

// QR check-in — one shared, pure function so the teacher-side toggle and the parent-side scan
// (which reads and writes Firestore directly, with no React state involved) both produce exactly
// the same result. Supports more than one in/out cycle per day on purpose — a child picked up
// early for an appointment and brought back later is a real, normal case, not an edge case to
// prevent. Looks at the most recent entry for today: if it's still "open" (checked in, not yet
// checked out), this scan closes it out; otherwise this scan opens a new one.
// One fixed code for the whole school — posted once, physically, wherever families actually pass
// through. Deliberately not tied to any class or student, since who it checks in is determined by
// which family is signed in when they scan it, not by anything encoded in the code itself.
export const SCHOOLWIDE_CHECKIN_CODE = "checkin:schoolwide";

export function computeToggledCheckIn(existingCheckIns, date, byLabel) {
  const list = existingCheckIns || [];
  const todaysEntries = list.filter((c) => c.date === date);
  const openEntry = todaysEntries.find((c) => c.checkInTime && !c.checkOutTime);
  const nowTime = new Date().toTimeString().slice(0, 5);
  if (openEntry) {
    const updated = list.map((c) => (c.id === openEntry.id ? { ...c, checkOutTime: nowTime, checkOutBy: byLabel } : c));
    return { checkIns: updated, action: "checked-out", entry: { ...openEntry, checkOutTime: nowTime, checkOutBy: byLabel } };
  }
  const entry = { id: uid(), date, checkInTime: nowTime, checkInBy: byLabel, checkOutTime: null, checkOutBy: null };
  return { checkIns: [...list, entry], action: "checked-in", entry };
}
export function isCheckedInNow(checkIns, date) {
  return (checkIns || []).some((c) => c.date === date && c.checkInTime && !c.checkOutTime);
}
// Same check-in/out logic as the per-class teacher toggle, but standalone and parameterized by
// classId — used by the school-wide preschool attendance view, which acts across every preschool
// class at once rather than the one class a teacher happens to be logged into.
export async function toggleCheckInForStudent(classId, studentId, byLabel) {
  const data = (await loadJSON(`class:${classId}:kriya:${studentId}`, null, true)) || emptyStudentData();
  const result = computeToggledCheckIn(data.checkIns, todayISO(), byLabel);
  await saveJSON(`class:${classId}:kriya:${studentId}`, { ...data, checkIns: result.checkIns }, true);
  return result;
}
// A student legitimately enrolled in more than one class (part-time, or specific periods only —
// both real, supported enrollment types) can still only actually be in one physical place at a
// time. But check-in data is stored separately per class, and every check-in screen used to look
// at only ONE of those classes' own records to decide whether a student was "in" — completely
// blind to a second, independent open check-in sitting in a different class's own document. A
// real, reported incident showed exactly what that allows: a child got checked in a second time,
// under a class they didn't actually belong in that day, without any warning that they were
// already checked in elsewhere — and when a parent later checked them out, it only closed the one
// record they happened to interact with, leaving the other genuinely open with no way to notice.
// This is what closes that gap: given every class a student could possibly be checked into, it
// looks at ALL of their check-in records together and returns the one true, unified answer —
// which class (if any) is actually open right now — so a check-out, wherever it's triggered from,
// always finds and closes the right one.
export async function getUnifiedCheckInStatus(studentId, classLinks) {
  const date = todayISO();
  const perClass = await Promise.all((classLinks || []).map(async (link) => {
    const data = await loadJSON(`class:${link.classId}:kriya:${studentId}`, null, true);
    const todaysEntries = (data?.checkIns || []).filter((c) => c.date === date);
    return { classId: link.classId, className: link.className, checkIns: data?.checkIns || [], todaysEntries };
  }));
  const allTodaysEntries = perClass
    .flatMap((c) => c.todaysEntries.map((e) => ({ ...e, classId: c.classId, className: c.className })))
    .sort((a, b) => (a.checkInTime < b.checkInTime ? -1 : 1));
  const openEntry = allTodaysEntries.find((e) => e.checkInTime && !e.checkOutTime);
  return { isIn: Boolean(openEntry), openEntry, allTodaysEntries, perClass };
}
// Toggles a student's TRUE, unified check-in status. Checking out always closes whichever class's
// record is actually open, regardless of which class or screen the action came from — a parent or
// teacher tapping "check out" means "this child is leaving," not "close this specific class's own
// entry." Checking in (when nothing is open anywhere) writes the new entry to defaultClassId, the
// class this particular action is being taken for.
export async function toggleUnifiedCheckIn(studentId, classLinks, defaultClassId, byLabel) {
  const status = await getUnifiedCheckInStatus(studentId, classLinks);
  const targetClassId = status.openEntry ? status.openEntry.classId : defaultClassId;
  const existing = status.perClass.find((c) => c.classId === targetClassId);
  const currentCheckIns = existing ? existing.checkIns : [];
  const result = computeToggledCheckIn(currentCheckIns, todayISO(), byLabel);
  await saveJSON(`class:${targetClassId}:kriya:${studentId}`, { ...(existing ? { checkIns: currentCheckIns } : emptyStudentData()), checkIns: result.checkIns }, true);
  return { ...result, classId: targetClassId };
}
// Reuses the exact same day-type resolution Planner already uses to decide whether to hide
// attendance on a given date — rather than a separate "school days" calendar, a day is a school
// day unless it's explicitly marked as a type that hides attendance (e.g. "No School"). This
// means marking Saturdays or a holiday closed, once, via Planner's existing bulk-by-weekday tool
// or by editing that one date, is the same action that also gates check-in — nothing new to
// maintain in two places.
export function isSchoolDay(date, config, plannerDays) {
  const dayTypeMap = {};
  (config?.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const selectedDayType = plannerDays?.[date]?.dayType ? dayTypeMap[plannerDays[date].dayType] : null;
  return !selectedDayType?.hidesAttendance;
}
// Whether the NEXT check-in (not check-out — that only ever closes an already-open cycle, never
// starts a new one) would be a second or later cycle for today. A genuine early-pickup-and-return
// is real and shouldn't be blocked outright, but it's rare enough that it's worth a deliberate
// "are you sure" rather than letting a slipped double-tap silently log a fake extra visit.
export function wouldBeRepeatCheckIn(checkIns, date) {
  const todaysCompleted = (checkIns || []).filter((c) => c.date === date && c.checkInTime && c.checkOutTime);
  const openNow = (checkIns || []).some((c) => c.date === date && c.checkInTime && !c.checkOutTime);
  return !openNow && todaysCompleted.length > 0;
}

// Rich enough to actually exercise the parent-facing daily log end to end — every category that
// shows up as its own card there (mood, meals, nap, diapers, bathroom, attendance, a health note,
// a photo), spread across today and a couple of past days so the date picker has somewhere to go.
// Parent emails are obviously-fake test addresses, never real ones, since this data (and the
// parent accounts it can seed) is for internal preview only.
// Same reasoning as buildSampleData below for the elementary side — generous, realistic, varied
// data across every feature, not a bare minimum. Ten children, a full week of varied attendance
// and daily-log entries, and incidents drawn from the actual preschool-specific categories (not
// elementary's), so this also doubles as a working demonstration of that fix.
export function buildPreschoolSampleData() {
  const students = [
    { name: "Chana G." }, { name: "Mendel S." }, { name: "Yossi B." }, { name: "Rivka L." },
    { name: "Levi K." }, { name: "Sarah T." }, { name: "Dovid P." }, { name: "Chaya M." },
    { name: "Shneur F." }, { name: "Miriam R." },
  ].map((s, i) => ({
    ...s, id: uid(), studentType: "preschool", parent1Name: `Test Parent ${i + 1}`, parentEmail: `testparent${i + 1}@example.com`, parentPhone: "", notes: "", enrollmentScope: "full-time",
  }));
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = students.map((s) => s.id);
  const roster = students;
  const today = todayISO();
  const d = (n) => addDaysISO(today, -n);
  // A small, self-contained placeholder image — stands in for a real Storage upload so the parent
  // Photos card and blog have something real to render without needing an actual file.
  const placeholderPhoto = (label, color) => "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="${color}"/><text x="150" y="155" font-size="18" fill="white" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`);

  const mkDay = (checkedIn, mood, lunchAmt, napTimes, diaper) => ({
    checkIns: checkedIn ? [{ id: uid(), date: checkedIn, checkInTime: "08:00", checkInBy: "Teacher", checkOutTime: checkedIn === today ? null : "15:30", checkOutBy: checkedIn === today ? null : "Teacher" }] : [],
    mood: mood ? [{ date: checkedIn, mood }] : [],
    meals: checkedIn ? [{ date: checkedIn, mealType: "lunch", amount: lunchAmt }, { date: checkedIn, mealType: "snack-am", amount: "all" }] : [],
    naps: napTimes ? [{ date: checkedIn, start: napTimes[0], end: napTimes[1] }] : [],
    diapers: diaper ? [{ id: uid(), date: checkedIn, time: "10:15", type: diaper }] : [],
    bathroom: [],
  });

  const studentData = {
    [s1]: { ...mkDay(today, "happy", "most", ["13:00", "14:15"], "wet"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s2]: { ...mkDay(today, "tired", "some", ["13:15", "14:00"], null), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s3]: { checkIns: [], mood: [], meals: [], naps: [], diapers: [], bathroom: [], skills: {}, fluency: [], attendance: [], points: {}, communications: [] }, // absent today, on purpose
    [s4]: { ...mkDay(today, "happy", "all", ["13:00", "14:30"], "dry"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s5]: { ...mkDay(today, "fussy", "some", ["12:45", "13:45"], "wet"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s6]: { ...mkDay(today, "happy", "all", ["13:00", "14:00"], "dry"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s7]: { ...mkDay(today, "happy", "most", ["13:15", "14:15"], "wet"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s8]: { ...mkDay(today, "tired", "none", ["12:30", "14:00"], "bm"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
    [s9]: { checkIns: [], mood: [], meals: [], naps: [], diapers: [], bathroom: [], skills: {}, fluency: [], attendance: [], points: {}, communications: [] }, // absent today
    [s10]: { ...mkDay(today, "happy", "all", ["13:00", "14:20"], "dry"), skills: {}, fluency: [], attendance: [], points: {}, communications: [] },
  };
  // Several past days so the date picker has somewhere real to go, not just today.
  const pastDayFor = (sid, dayOffset, mood = "happy", lunch = "most") => {
    const date = d(dayOffset);
    const entry = mkDay(date, mood, lunch, ["13:00", "14:15"], "wet");
    studentData[sid].checkIns.push(...entry.checkIns);
    studentData[sid].mood.push(...entry.mood);
    studentData[sid].meals.push(...entry.meals);
    studentData[sid].naps.push(...entry.naps);
    if (entry.diapers.length) studentData[sid].diapers.push(...entry.diapers);
  };
  [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10].forEach((sid) => { pastDayFor(sid, 1); pastDayFor(sid, 2, "tired", "some"); pastDayFor(sid, 3); });

  // Drawn from the actual preschool-specific category lists (see DEFAULT_CONFIG), not elementary's
  // — categoryLabel/categoryColor stored directly, matching what PreschoolIncidentForm itself saves.
  const incidents = [
    { id: uid(), kind: "health", category: "fall-bump", categoryLabel: "Fall or bump", categoryColor: "sky", date: today, time: "10:15", description: "Small bump on the knee during outdoor play, ice applied, resumed playing within minutes.", studentIds: [s1], media: [], notifyFamily: true },
    { id: uid(), kind: "health", category: "bite", categoryLabel: "Bite (from another child)", categoryColor: "amber", date: d(2), time: "11:30", description: "Brief bite mark on forearm during a toy dispute, no skin broken, comforted and separated.", studentIds: [s5], media: [], notifyFamily: true, flaggedForAdmin: true },
    { id: uid(), kind: "incident", category: "peer-conflict", categoryLabel: "Peer conflict", categoryColor: "violet", date: d(1), time: "09:45", description: "Brief disagreement over a shared toy, resolved with redirection.", studentIds: [s3, s7], media: [], notifyFamily: false },
    { id: uid(), kind: "incident", category: "difficult-separation", categoryLabel: "Difficult drop-off or separation", categoryColor: "sky", date: today, time: "08:05", description: "Some tears at drop-off this morning, settled in within about ten minutes.", studentIds: [s9], media: [], notifyFamily: true },
  ];
  const photos = [
    { id: uid(), date: today, url: placeholderPhoto("Sample Photo", "#d4a843"), storagePath: "", studentIds: [s1, s2, s4, s6], caption: "Morning circle time" },
    { id: uid(), date: d(2), url: placeholderPhoto("Sample Photo", "#0f766e"), storagePath: "", studentIds: [s5, s7, s10], caption: "Art project — handprint turkeys" },
  ];
  const plannerDays = {};
  const plannerEvents = [];

  const blogPosts = [
    {
      id: uid(), timestamp: new Date(new Date(d(2)).setHours(13, 0)).toISOString(), authorType: "teacher", title: null, reactions: {}, comments: [],
      blocks: [{ id: uid(), text: "A busy, happy morning in the Ducklings Room! Everyone enjoyed circle time and a fun art project today.", media: [{ url: placeholderPhoto("Sample Photo", "#0f766e"), type: "photo" }], reactions: {} }],
    },
    {
      id: uid(), timestamp: new Date(new Date(d(1)).setHours(15, 30)).toISOString(), authorType: "teacher", title: "Reminder", reactions: {}, comments: [],
      blocks: [{ id: uid(), text: "Just a reminder that we'll be outside for extra playtime tomorrow if the weather holds — please send a jacket!", media: [], reactions: {} }],
    },
  ];

  return { roster, studentData, incidents, photos, plannerDays, plannerEvents, blogPosts };
}

// Deliberately generous, not just "enough to prove the feature exists" — this data doesn't just
// verify the app works, it's what a teacher sees the very first time they're handed this app to
// try, and what gets shown when presenting it to staff for training. A sparse 4-student sample
// with one data point each doesn't give either audience anything real to click through; ten
// students with real spread — some thriving, some flagged, some absent a lot, real variation
// across every feature the app has — is what actually lets someone explore it the way they would
// their own real classroom, not just confirm a button doesn't crash.
export function buildSampleData() {
  const students = [
    { name: "Chana G." }, { name: "Mendel S." }, { name: "Yossi B." }, { name: "Rivka L." },
    { name: "Levi K." }, { name: "Sarah T." }, { name: "Dovid P." }, { name: "Chaya M." },
    { name: "Shneur F." }, { name: "Miriam R." },
  ].map((s) => ({ ...s, id: uid(), parentEmail: "", parentPhone: "", notes: "" }));
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = students.map((s) => s.id);
  const roster = students;
  const today = todayISO();
  const d = (n) => addDaysISO(today, -n);

  // A realistic spread of attendance across a couple of weeks — not every student present every
  // day, since a roster of all-green attendance doesn't show what the late/absent views actually
  // look like in practice.
  const attendanceDays = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const attendanceFor = (pattern) => attendanceDays.map((n, i) => ({ date: d(n), status: pattern[i] || "present", time: pattern[i] === "late" ? `9:${10 + i}` : "" }));

  const studentData = {
    [s1]: {
      skills: {
        [skillKey("lname", "alef")]: { history: [{ date: d(10), result: "got-it" }, { date: d(5), result: "got-it" }], status: "mastered", flagCount: 0 },
        [skillKey("lname", "beis")]: { history: [{ date: d(6), result: "struggled" }, { date: d(2), result: "struggled" }], status: "flagged", flagCount: 1 },
        [skillKey("lname", "gimmel")]: { history: [{ date: d(1), result: "got-it" }], status: "mastered", flagCount: 0 },
      },
      fluency: [{ date: d(3), wordsRead: 14, hesitation: "some", mode: "decoding", notes: "Improving steadily" }],
      attendance: attendanceFor(["present", "present", "late", "present", "present", "present", "present", "present", "present"]),
      points: {}, communications: [],
    },
    [s2]: {
      skills: { [skillKey("lname", "alef")]: { history: [{ date: d(6), result: "got-it" }], status: "practicing", flagCount: 0 } },
      fluency: [],
      attendance: attendanceFor(["present", "absent", "present", "present", "present", "present", "absent", "present", "present"]),
      points: {}, communications: [],
    },
    [s3]: {
      skills: {},
      fluency: [],
      attendance: attendanceFor(["present", "late", "present", "late", "present", "late", "present", "late", "present"]),
      points: {}, communications: [],
    },
    [s4]: {
      skills: { [skillKey("lname", "beis")]: { history: [{ date: d(4), result: "got-it" }], status: "practicing", flagCount: 0 } },
      fluency: [{ date: d(1), wordsRead: 22, hesitation: "none", mode: "fluent", notes: "Reading well above grade level" }],
      attendance: attendanceFor(["present", "present", "present", "present", "present", "present", "present", "present", "present"]),
      points: {}, communications: [],
    },
    [s5]: {
      skills: { [skillKey("lname", "alef")]: { history: [{ date: d(8), result: "struggled" }, { date: d(4), result: "struggled" }, { date: d(1), result: "struggled" }], status: "flagged", flagCount: 3 } },
      fluency: [{ date: d(5), wordsRead: 6, hesitation: "a lot", mode: "decoding", notes: "Needs extra support with letter recognition" }],
      attendance: attendanceFor(["present", "present", "present", "absent", "absent", "present", "present", "present", "late"]),
      points: {}, communications: [],
    },
    [s6]: {
      skills: {
        [skillKey("lname", "alef")]: { history: [{ date: d(9), result: "got-it" }], status: "mastered", flagCount: 0 },
        [skillKey("lname", "beis")]: { history: [{ date: d(5), result: "got-it" }], status: "mastered", flagCount: 0 },
      },
      fluency: [{ date: d(2), wordsRead: 18, hesitation: "some", mode: "decoding", notes: "" }],
      attendance: attendanceFor(["present", "present", "present", "present", "present", "late", "present", "present", "present"]),
      points: {}, communications: [],
    },
    [s7]: {
      skills: {}, fluency: [],
      attendance: attendanceFor(["present", "present", "absent", "present", "present", "present", "present", "absent", "present"]),
      points: {}, communications: [],
    },
    [s8]: {
      skills: { [skillKey("lname", "gimmel")]: { history: [{ date: d(3), result: "got-it" }], status: "practicing", flagCount: 0 } },
      fluency: [],
      attendance: attendanceFor(["present", "present", "present", "present", "late", "present", "present", "present", "present"]),
      points: {}, communications: [],
    },
    [s9]: {
      skills: {}, fluency: [],
      attendance: attendanceFor(["present", "present", "present", "present", "present", "present", "present", "present", "present"]),
      points: {}, communications: [],
    },
    [s10]: {
      skills: { [skillKey("lname", "beis")]: { history: [{ date: d(6), result: "struggled" }], status: "flagged", flagCount: 1 } },
      fluency: [{ date: d(4), wordsRead: 10, hesitation: "some", mode: "decoding", notes: "" }],
      attendance: attendanceFor(["present", "present", "present", "late", "present", "present", "present", "present", "absent"]),
      points: {}, communications: [],
    },
  };

  // A spread across every category the elementary incident system has, not just one — this is
  // what actually shows a teacher what each category looks like once logged, not just that the
  // feature exists at all.
  const incidents = [
    { id: uid(), date: d(5), category: "social", description: "Disagreement over supplies during table work", studentIds: [s2, s3] },
    { id: uid(), date: d(3), category: "health", description: "Scraped knee at recess, cleaned and bandaged, resumed play.", studentIds: [s5] },
    { id: uid(), date: d(2), category: "discipline", description: "Talking during Kriya after two reminders — quiet word, resolved.", studentIds: [s7] },
    { id: uid(), date: d(1), category: "lost-item", description: "Left jacket on the bus, driver notified.", studentIds: [s9] },
  ];
  const classAssessments = [
    { id: uid(), title: "Friday Parsha Quiz (sample)", date: d(9), results: { [s1]: "95%", [s2]: "88%", [s3]: "82%", [s4]: "98%", [s5]: "65%", [s6]: "91%", [s7]: "79%", [s8]: "85%", [s9]: "93%", [s10]: "74%" } },
    { id: uid(), title: "Kriya Spot-Check (sample)", date: d(4), results: { [s1]: "Pass", [s2]: "Pass", [s3]: "Retry", [s4]: "Pass", [s5]: "Retry", [s6]: "Pass", [s7]: "Pass", [s8]: "Pass", [s9]: "Pass", [s10]: "Retry" } },
    { id: uid(), title: "Chumash Review (sample)", date: d(1), results: { [s1]: "90%", [s4]: "100%", [s6]: "87%", [s9]: "94%" } },
  ];

  const ptsCatId = uid();
  const points = [7, 3, 8, 9, 2, 6, 4, 5, 8, 3];
  students.forEach((s, i) => { studentData[s.id].points = { [ptsCatId]: points[i] }; });

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
    { id: uid(), date: addDaysISO(today, 12), title: "Sample: Rosh Chodesh assembly", reminderLeadDays: 2 },
  ];
  const benchmarkSubjects = [
    {
      id: uid(), label: "Kriya (sample)",
      segments: [
        { id: uid(), label: "Letters A–M", startDate: d(20), endDate: d(6), color: "sky" },
        { id: uid(), label: "Letters N–Z", startDate: d(5), endDate: addDaysISO(today, 15), color: "violet" },
      ],
    },
    {
      id: uid(), label: "Chumash (sample)",
      segments: [
        { id: uid(), label: "Bereishis", startDate: d(30), endDate: d(10), color: "amber" },
        { id: uid(), label: "Noach", startDate: d(9), endDate: addDaysISO(today, 10), color: "emerald" },
      ],
    },
  ];

  // A small, self-contained placeholder image — stands in for a real Storage upload so blog
  // posts have something real to render without needing an actual uploaded file.
  const placeholderPhoto = (label, color) => "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${color}"/><text x="200" y="155" font-size="20" fill="white" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`);

  const blogPosts = [
    {
      id: uid(), timestamp: new Date(new Date(d(6)).setHours(14, 30)).toISOString(), authorType: "teacher", title: null, reactions: {}, comments: [],
      blocks: [{ id: uid(), text: "What a wonderful morning of tefillah! The class really came together for our davening this week.", media: [{ url: placeholderPhoto("Sample Photo", "#0f766e"), type: "photo" }], reactions: {} }],
    },
    {
      id: uid(), timestamp: new Date(new Date(d(3)).setHours(11, 0)).toISOString(), authorType: "teacher", title: "Chumash Siyum!", reactions: {}, comments: [],
      blocks: [{ id: uid(), text: "So proud of the class for completing Parshas Bereishis together — celebrated with a small siyum party!", media: [{ url: placeholderPhoto("Sample Photo", "#b45309"), type: "photo" }], reactions: {} }],
    },
    {
      id: uid(), timestamp: new Date(new Date(d(1)).setHours(15, 45)).toISOString(), authorType: "teacher", title: null, reactions: {}, comments: [],
      blocks: [{ id: uid(), text: "A quick note: we'll be reviewing this week's Kriya letters again tomorrow before Thursday's quiz. Extra practice at home always helps!", media: [], reactions: {} }],
    },
  ];

  const homeworkPosts = [
    { id: uid(), timestamp: new Date(new Date(d(1)).setHours(15, 0)).toISOString(), cadence: "daily", text: "Review Kriya cards for tomorrow's quiz — focus on Beis and Gimmel." },
    { id: uid(), timestamp: new Date(new Date(d(4)).setHours(15, 0)).toISOString(), cadence: "weekly", text: "This week: read through Parshas Noach at home once with a parent, and practice writing the aleph-beis letters from this week's packet." },
  ];

  return {
    roster, studentData, incidents, classAssessments, classPoints: {}, plannerDays, plannerEvents, benchmarkSubjects, sampleSchedule, blogPosts, homeworkPosts,
    pointsCategory: { id: ptsCatId, label: "Diligence Points (sample)", color: "indigo", scope: "individual", displayMode: "bar", increment: 1, threshold: 10, rewardMessage: "Sample reward: extra recess" },
  };
}

// ---------- Storage helpers ----------

// No retry logic here used to mean a single transient network blip — extremely plausible on
// shared, busy WiFi, like a school at drop-off with many devices connecting at once — permanently
// masqueraded as "this document doesn't exist" for that one read, with nothing to distinguish a
// genuine absence from a failed attempt to check. For most data that's a bearable, temporary
// glitch. For the teacher-record lookup that runs immediately after every sign-in specifically,
// it's much worse: Firebase Auth itself had already succeeded — the account is completely valid —
// but this one read failing silently made the app treat a real teacher as if they had no account
// at all, with no way to tell the difference from actually not having one. That matches, exactly,
// a real, reported pattern that no fix aimed at the account itself could ever have explained: the
// same valid account working on one attempt and not the next, on one device and not another,
// signing out and immediately being unable to sign back in — none of that is about whether the
// account is good, since it demonstrably is; it's about whether this one read happened to land
// during a bad moment on the network. Retries a couple of times with a short, increasing delay
// before actually giving up, so a load only returns the fallback once a failure has genuinely
// persisted rather than on the very first transient hiccup.
export async function loadJSON(key, fallback, shared = false, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ref = doc(db, "data", key);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data().value : fallback;
    } catch (e) {
      if (attempt === retries) {
        console.error("Load failed after retries", key, e);
        return fallback;
      }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return fallback;
}

// Same reasoning as loadJSON's own retry logic just above — a save that silently fails on a
// transient network blip loses real data with nothing to show for it, not just a display glitch.
export async function saveJSON(key, value, shared = false, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ref = doc(db, "data", key);
      await setDoc(ref, { value });
      return;
    } catch (e) {
      if (attempt === retries) {
        console.error("Save failed after retries", key, e);
        return;
      }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
}

// The live counterpart to loadJSON above — instead of a one-time read, this keeps a standing
// subscription open on the document and updates automatically the moment ANYONE writes to it
// (this tab's own send, another device the same person is signed into, or the other side of a
// conversation), the same way a real chat app updates without the person ever refreshing. Built
// specifically for the highest-value case first: an open conversation thread, where a message
// arriving with no visible sign of it is what actually breaks the back-and-forth flow of talking.
// Deliberately NOT a wholesale replacement for loadJSON everywhere — most of the app's data
// (points, assessments, planner) isn't being watched by someone in real time the way an open
// conversation is, so a live listener there would just be paying an ongoing cost for no benefit
// anyone would notice.
// key === null/undefined is a valid, common case (no thread open yet) — returns fallback and
// holds off subscribing to anything until a real key is passed in.
// Re-establishes itself on error rather than just logging or leaving the caller permanently
// frozen — a Firestore onSnapshot listener's error callback is terminal, not transient: the
// instant it fires, even from a single momentary network blip, that specific listener stops
// receiving any further updates for the rest of the session, with nothing auto-reconnecting it on
// its own. Every caller of this shared hook was silently exposed to that same gap. A short delay
// before reconnecting avoids hammering a genuinely, persistently denied subscription in a loop.
export function useLiveJSON(key, fallback) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    if (!key) { setValue(fallback); return; }
    let unsubscribe = () => {};
    let reconnectTimer = null;
    let cancelled = false;

    const subscribe = () => {
      const ref = doc(db, "data", key);
      unsubscribe = onSnapshot(ref,
        (snap) => setValue(snap.exists() ? snap.data().value : fallback),
        (err) => {
          console.error("Live subscription failed, reconnecting", key, err);
          if (cancelled) return;
          reconnectTimer = setTimeout(subscribe, 1500);
        });
    };
    subscribe();

    return () => { cancelled = true; clearTimeout(reconnectTimer); unsubscribe(); };
    // fallback deliberately excluded — callers often pass a fresh object/array literal
    // (e.g. { messages: [] }) on every render, and re-subscribing every time that happens would
    // defeat the point of a standing subscription without ever actually changing what it does.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}

// Same live subscription as useLiveJSON just above, but also exposing whether the first real
// snapshot has actually arrived yet — useLiveJSON alone can't distinguish "still loading" from
// "loaded, and genuinely the fallback value" (e.g. a class with no homework ever posted would sit
// at its empty-array fallback either way), which matters for any caller that needs to show a
// real, bounded loading state rather than either flashing "nothing yet" before real data arrives,
// or showing a loading spinner forever for a genuinely empty result.
export function useLiveJSONLoaded(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!key) { setValue(fallback); setLoaded(true); return; }
    let unsubscribe = () => {};
    let reconnectTimer = null;
    let cancelled = false;
    setLoaded(false);

    const subscribe = () => {
      const ref = doc(db, "data", key);
      unsubscribe = onSnapshot(ref,
        (snap) => { setValue(snap.exists() ? snap.data().value : fallback); setLoaded(true); },
        (err) => {
          console.error("Live subscription failed, reconnecting", key, err);
          if (cancelled) return;
          reconnectTimer = setTimeout(subscribe, 1500);
        });
    };
    subscribe();

    return () => { cancelled = true; clearTimeout(reconnectTimer); unsubscribe(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { value, loaded };
}

// The multi-document counterpart to useLiveJSON above — for a teacher's own inbox list, where
// every family's thread preview needs to stay current at once, not just whichever single thread
// happens to be open right now. One onSnapshot subscription per key rather than a single query,
// since these keys are scattered across the "data" collection by unrelated string prefixes
// (class:X:messages:Y, teacher-messages:X:Y) rather than sharing anything a Firestore query could
// filter on — a genuine collection of individually-addressed documents, watched individually.
// Returns { [key]: value }; a key with nothing written yet is simply absent from the result
// rather than present with some placeholder, so a caller can tell "hasn't loaded/sent anything"
// apart from "loaded and is empty" if that distinction ever matters.
// Re-establishes itself on error, same reasoning as useLiveJSON's own fix just above — a
// Firestore onSnapshot listener's error callback is terminal, not transient, and this multi-key
// variant had the exact same silent gap on every one of its individual per-key subscriptions.
export function useLiveJSONMap(keys) {
  const [values, setValues] = useState({});
  const keysSignature = (keys || []).join("|");
  useEffect(() => {
    const activeKeys = keys || [];
    if (activeKeys.length === 0) { setValues({}); return; }
    let cancelled = false;
    const reconnectTimers = [];
    const unsubscribes = activeKeys.map((key) => {
      let unsubscribe = () => {};
      const subscribe = () => {
        unsubscribe = onSnapshot(doc(db, "data", key),
          (snap) => setValues((prev) => ({ ...prev, [key]: snap.exists() ? snap.data().value : undefined })),
          (err) => {
            console.error("Live subscription failed, reconnecting", key, err);
            if (cancelled) return;
            reconnectTimers.push(setTimeout(subscribe, 1500));
          });
      };
      subscribe();
      return () => unsubscribe();
    });
    return () => { cancelled = true; reconnectTimers.forEach(clearTimeout); unsubscribes.forEach((unsub) => unsub()); };
    // keys itself deliberately excluded in favor of keysSignature — an array literal is a new
    // reference every render even when its contents haven't actually changed, and re-subscribing
    // every render would mean never keeping a subscription open long enough to be live at all.
  }, [keysSignature]); // eslint-disable-line react-hooks/exhaustive-deps
  return values;
}

// The live-query counterpart to loadAllWithPrefix — for a list like "every teacher" that an admin
// screen needs to reflect real, current server state continuously, not a one-time snapshot taken
// whenever that screen happened to first load. This is what a real, first-day-of-school
// reliability incident traced back to: the admin's own teacher list only ever loaded once, so it
// could silently drift out of sync with reality the longer the screen stayed open — and every
// class-assignment change made during that time was then computed from that same increasingly
// stale list, with no visible sign anything was wrong. A live query removes the staleness at its
// source instead of requiring every write path that touches this data to individually defend
// against it.
// Re-establishes itself on error, same reasoning as the other two live-subscription hooks above —
// a Firestore onSnapshot listener's error callback is terminal, not transient. Without this, the
// exact class of gap this hook was built to close (an admin's teacher list quietly going stale)
// could still happen — just from a dropped listener instead of a one-time-only load.
export function useLiveJSONPrefix(prefix) {
  const [values, setValues] = useState([]);
  useEffect(() => {
    if (!prefix) { setValues([]); return; }
    let unsubscribe = () => {};
    let reconnectTimer = null;
    let cancelled = false;

    const subscribe = () => {
      const col = collection(db, "data");
      const q = query(col, where(documentId(), ">=", prefix), where(documentId(), "<", `${prefix}\uf8ff`));
      unsubscribe = onSnapshot(q,
        (snap) => setValues(snap.docs.map((d) => d.data().value)),
        (err) => {
          console.error("Live prefix subscription failed, reconnecting", prefix, err);
          if (cancelled) return;
          reconnectTimer = setTimeout(subscribe, 1500);
        });
    };
    subscribe();

    return () => { cancelled = true; clearTimeout(reconnectTimer); unsubscribe(); };
  }, [prefix]);
  return values;
}

// Every backend API route this calls (generate, send-push, create-teacher, create-family) now
// requires a valid Firebase ID token in the Authorization header — a route handler running on
// the server has no other way to tell a real signed-in user apart from anyone on the internet
// who found the URL. Centralized here so every one of the 16 call sites across the app gets this
// automatically, rather than depending on remembering to add it in each place individually.
export async function authHeaders() {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function deleteJSON(key) {
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
export async function loadAllWithPrefix(prefix) {
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

// A companion to loadAllWithPrefix above, for the rarer case something actually needs the
// document IDs themselves rather than just their contents — deleting every matching document
// being the obvious example, since deleteJSON needs a key to delete, not a value. Kept separate
// rather than changing what loadAllWithPrefix itself returns, since that function is used
// throughout the app by code that only ever wanted the values.
export async function loadAllKeysWithPrefix(prefix) {
  try {
    const col = collection(db, "data");
    const q = query(col, where(documentId(), ">=", prefix), where(documentId(), "<", `${prefix}\uf8ff`));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.id);
  } catch (e) {
    console.error("Prefix key load failed", prefix, e);
    return [];
  }
}

// The companion fix for a specific case loadAllWithPrefix("family:") can never reliably serve: a
// signed-in TEACHER (not admin) needing every family linked to one of their own classes. Firestore
// can't validate that as a client-side query at all — the rule that grants a teacher access to a
// family depends on that family's own linkedClassIds field, and a security rule can only be
// proven safe for an entire query's worth of results when it doesn't depend on each individual
// document's own content. Reading one family at a time works fine under that same rule; querying
// every family at once and filtering client-side does not, no matter how the rule is phrased. This
// calls a small server-side endpoint instead, which does the same filtering with full privileges
// and hands back only the relevant records.
export async function fetchClassFamilies(classId) {
  try {
    const headers = await authHeaders();
    const res = await fetch(`/api/class-families?classId=${encodeURIComponent(classId)}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.families || [];
  } catch (e) {
    console.error("Class families fetch failed", classId, e);
    return [];
  }
}

// The counterpart to fetchClassFamilies above, for a staff member reachable only through
// messagingClassTypes (grade-level reach) rather than any assignedClassIds of their own — used by
// StaffMessagesHome, which has no class to ask about in the first place.
export async function fetchStaffReachableFamilies() {
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/staff-reachable-families", { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.families || [];
  } catch (e) {
    console.error("Staff reachable-families fetch failed", e);
    return [];
  }
}

// ============================================================================================
// PUSH NOTIFICATIONS — everything below sends a real device notification. Three small, separate
// pieces, kept deliberately apart so adding a new kind of notification later is a matter of
// composing them, not writing new plumbing:
//
//   1. sendPushNotification(uids, title, body, url) — the one function that actually calls the
//      backend and sends. Never call this directly from a screen; always go through a "who"
//      helper below (or add a new one), so the actual sending logic stays in exactly one place.
//
//   2. The "who" helpers (notifyFamilyGroup, notifyClassTeachers, notifyClassFamilies) — each
//      answers one specific "who should hear about this" question and hands the uid list to
//      sendPushNotification. If a new trigger needs a audience these don't already cover (e.g.
//      "every admin," "one specific teacher by uid"), add a new notifyX function following the
//      same shape — look up the right accounts, collect their uids, call sendPushNotification.
//
//   3. The call sites themselves — one line, added right after the action it's about already
//      succeeded (never before, never in place of it), never awaited by the caller. Example, the
//      exact shape every trigger below follows:
//
//        await saveJSON(key, next, true);                              // the real action
//        notifyFamilyGroup(familyUid, "Title here", text, "/some/url"); // not awaited — fire and forget
//        return next;
//
//      To add a brand new trigger (say, "notify admin when an incident gets flagged"): find where
//      that flagging actually happens, add one line in that same shape right after it succeeds,
//      reusing an existing notifyX helper or adding a new one if the audience is genuinely new.
//      That's the whole change — nothing else in this file needs to know a new trigger exists.
// ============================================================================================

// Fire-and-forget by design — a failed push send should never block the actual message or post,
// which has already succeeded by the time this runs, and never surface an error over something
// the person sending didn't ask about.
export async function sendPushNotification(uids, title, body, url) {
  if (!uids || uids.length === 0) return;
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ uids, title, body, url }),
    });
  } catch {
    // best-effort only — nothing to recover here
  }
}

// Same idea as sendPushNotification above, but for the two cases that can never safely resolve
// their own uids client-side (see the long comment on this same resolve mechanism in
// api/send-push.js) — passes a description of who to notify instead of a pre-computed list, and
// lets the backend, running with full privileges, work out who that actually is.
export async function sendPushNotificationResolved(resolve, title, body, url) {
  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ resolve, title, body, url }),
    });
  } catch {
    // best-effort only — nothing to recover here
  }
}

// A message addressed to "the family" may cover more than one actual guardian login sharing the
// same group — either one may have their own device notifications turned on, so both get a
// chance at it, not just whichever uid happens to be the group's own id. Resolved server-side:
// a regular (non-admin) teacher has no rules-based way to list every family record client-side to
// find the other guardian in this same group, even though reading any ONE of them individually is
// fine — see the resolve mechanism in api/send-push.js for why that's a real Firestore limitation,
// not a gap in how the rule was written.
export async function notifyFamilyGroup(groupId, title, body, url) {
  await sendPushNotificationResolved({ type: "familyGroup", groupId }, title, body, url);
}

// A classroom thread is shared among everyone teaching that room, not one specific teacher — a
// message from a family should be able to reach any of them, not just whoever happens to be
// signed in when it arrives. Resolved server-side: a family account has no rules-based read
// access to teacher:* records at all, so this could never have worked as a client-side lookup.
export async function notifyClassTeachers(classId, title, body, url) {
  await sendPushNotificationResolved({ type: "classTeachers", classId }, title, body, url);
}

// The individual-teacher counterpart to notifyClassTeachers above — reaches exactly the one
// teacher a family messaged directly, never every teacher covering the shared classroom thread.
export async function notifySpecificTeacher(teacherUid, title, body, url) {
  await sendPushNotification([teacherUid], title, body, url);
}

// Every family with a child actually linked to this class, on a full-time basis — used for blog
// posts, which only apply to a student's main class, not a part-time or specific-periods
// enrollment where a different teacher is the one actually posting for them.
export async function notifyClassFamilies(classId, title, body, url) {
  const roster = await loadJSON(`class:${classId}:roster`, [], true);
  const fullTimeStudentIds = new Set(roster.filter((s) => !s.enrollmentScope || s.enrollmentScope === "full-time").map((s) => s.id));
  const allFamilies = await fetchClassFamilies(classId);
  const uids = allFamilies
    .filter((f) => (f.studentLinks || []).some((l) => l.classId === classId && fullTimeStudentIds.has(l.studentId)))
    .map((f) => f.uid);
  await sendPushNotification(uids, title, body, url);
}

// Tracks what each PERSON has actually seen, separate from the messages themselves — "have I seen
// this" belongs to the individual, not the conversation. Two guardians on one family, or two
// co-teachers on one class, can each be at a different point in the exact same shared thread.
// Keyed by the viewer's own login uid, never the shared family/class identity.
export async function getReadState(viewerId) {
  return (await loadJSON(`read-state:${viewerId}`, {}, true)) || {};
}
export async function markThreadRead(viewerId, threadKey) {
  const state = await getReadState(viewerId);
  state[threadKey] = new Date().toISOString();
  await saveJSON(`read-state:${viewerId}`, state, true);
}

// Generic across every thread shape in the app (class messages, admin messages) — all of them
// store the same { messages: [...] } document, keyed differently, so these take the actual
// storage key directly rather than trying to derive it from a thread's shorter display key.
// Editing keeps the original text the first time only, so a second or third edit doesn't
// overwrite what was genuinely first said — that's the actual accountability record, even though
// the UI only ever surfaces "(edited)" rather than a full history by default.
export async function editMessageInThread(storageKey, messageId, newText) {
  const thread = (await loadJSON(storageKey, null, true)) || { messages: [] };
  const next = {
    messages: thread.messages.map((m) => (m.id === messageId
      ? { ...m, text: newText, edited: true, originalText: m.originalText ?? m.text }
      : m)),
  };
  await saveJSON(storageKey, next, true);
  return next;
}

// A soft delete, not a real erase — the placeholder a deleted message leaves behind ("This
// message was deleted") is what lets a family, and the school itself if a concern is ever
// raised, know something was said and removed, rather than a silent gap with no trace at all.
// Attachments and text are actually cleared from storage, not just hidden by the UI.
export async function deleteMessageInThread(storageKey, messageId) {
  const thread = (await loadJSON(storageKey, null, true)) || { messages: [] };
  const next = {
    messages: thread.messages.map((m) => (m.id === messageId
      ? { id: m.id, senderType: m.senderType, senderName: m.senderName, timestamp: m.timestamp, deleted: true }
      : m)),
  };
  await saveJSON(storageKey, next, true);
  return next;
}
// Snoozing doesn't mark a thread read — it just quiets the indicator for a while, so an unread
// reply still shows as unread once the snooze period passes, rather than being silently dismissed.
export async function snoozeThread(viewerId, threadKey, minutes) {
  const state = await getReadState(viewerId);
  state.snoozed = state.snoozed || {};
  state.snoozed[threadKey] = new Date(Date.now() + minutes * 60000).toISOString();
  await saveJSON(`read-state:${viewerId}`, state, true);
}
// A thread counts as unread if its last message came from the other side and is newer than the
// last time this viewer marked it read (or was never marked read at all) — and isn't currently
// snoozed.
export function isThreadUnread(readState, threadKey, lastMessage, myRole) {
  if (!lastMessage || lastMessage.senderType === myRole) return false;
  const snoozedUntil = readState.snoozed?.[threadKey];
  if (snoozedUntil && new Date(snoozedUntil) > new Date()) return false;
  const lastRead = readState[threadKey];
  return !lastRead || new Date(lastMessage.timestamp) > new Date(lastRead);
}

// The actual number behind isThreadUnread's yes/no above — same three rules (from the other side,
// newer than this viewer's own last-read mark, not currently snoozed), just counting every
// message that matches instead of only checking the last one. Used both for a real unread count
// next to each conversation in the list (instead of a bare presence dot) and, inside an open
// conversation, for finding exactly where to draw the "unread starts here" divider — the same
// question either way, just asked against a different scope of messages.
export function countUnreadInThread(readState, threadKey, messages, myRole) {
  const snoozedUntil = readState.snoozed?.[threadKey];
  if (snoozedUntil && new Date(snoozedUntil) > new Date()) return 0;
  const lastRead = readState[threadKey];
  return (messages || []).filter((m) =>
    m.senderType !== myRole && (!lastRead || new Date(m.timestamp) > new Date(lastRead))
  ).length;
}

export const VAPID_KEY = "BEqoLhS_bXi-hjn4U3NcgCGIpFZZ-Dct-KPFj4D0MOOVyzS0Mvj7-6JTD3s2GUxNqqciXMVI6jBsWcUcptLPFgQ";

// iOS Safari won't even offer the notification permission prompt outside of standalone
// (installed, opened from the home screen icon) mode — no code can work around this, it's a
// platform rule. Checking it up front means the UI can say "install first" instead of a
// permission request that would otherwise just silently do nothing on iOS.
export function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
// Google's own sign-in system deliberately refuses to work inside a WebView, which is exactly
// what an installed, standalone iOS PWA runs as — not a bug in this app, and not something either
// a popup or a redirect can work around (confirmed independently across Firebase's own issue
// tracker, Google's own engineers, and Apple's developer forums). The failure mode if attempted
// anyway is worse than a normal error: the sign-in call simply never resolves, an indefinite
// silent hang with no way out. Rather than showing the option and then explaining why it failed
// after someone taps it, this hides it entirely in that specific environment — regular Safari on
// iOS (not installed) is unaffected and still shows it normally.
export function shouldHideGoogleSignIn() {
  return isIOSDevice() && isRunningStandalone();
}

// Requests permission, registers this specific device/browser for push, and remembers its token
// against the signed-in account — one account can have several devices enabled at once (a
// teacher's phone AND tablet, say), so this adds to a list rather than replacing a single value.
export async function enableNotificationsFor(uid) {
  // Same ordering fix as NotificationToggle's own refresh() above, and for the identical reason —
  // iOS Safari in tab mode never exposes window.Notification at all, so checking that generic case
  // first meant tapping the toggle on an iOS tab always produced "this browser doesn't support
  // notifications" instead of the specific, actionable install instructions this function is
  // actually able to signal for via needsInstall.
  if (isIOSDevice() && !isRunningStandalone()) return { ok: false, needsInstall: true };
  if (!("Notification" in window)) return { ok: false, error: "This browser doesn't support notifications." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notifications weren't allowed — you can turn this on again later from your device's notification settings." };

  const messaging = await messagingPromise;
  if (!messaging) return { ok: false, error: "Notifications aren't supported in this browser." };

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return { ok: false, error: "Couldn't register this device — try again." };
    const existing = (await loadJSON(`push-tokens:${uid}`, null, true)) || { tokens: [] };
    if (!existing.tokens.some((t) => t.token === token)) {
      existing.tokens.push({ token, addedAt: new Date().toISOString(), userAgent: navigator.userAgent });
      await saveJSON(`push-tokens:${uid}`, existing, true);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't register this device — try again." };
  }
}

// Un-registers only THIS device, not every device the account has enabled — someone turning off
// notifications on their phone shouldn't silently also turn them off on their tablet.
export async function disableNotificationsFor(uid) {
  const messaging = await messagingPromise;
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    const existing = (await loadJSON(`push-tokens:${uid}`, null, true)) || { tokens: [] };
    await saveJSON(`push-tokens:${uid}`, { tokens: existing.tokens.filter((t) => t.token !== token) }, true);
  } catch {
    // Nothing meaningful to recover here — if the token can't be retrieved, there's nothing to remove
  }
}
// Whether the CURRENT device already has a registered token — used to show "Enabled" vs "Enable"
// without needing to re-request anything just to check.
//
// This is also where a real, reported bug lived: FCM tokens aren't permanent — Firebase can and
// does rotate a device's token on its own (a storage/cache clear, a service worker update, and
// several other ordinary circumstances can all trigger it), and this app had no mechanism
// anywhere to notice that and re-save the new one. The saved push-tokens list would silently go
// stale, this function would correctly find no match for the new token, and the toggle would show
// "off" — which looks exactly like notifications quietly turned themselves off, even though
// nothing was ever actually disabled. If the browser's own permission is still genuinely granted
// (meaning the person never revoked anything at the OS/browser level — that's the real signal of
// their actual intent, not what happens to be sitting in a token list), a mismatch here means the
// token rotated, not that they opted out — so this now re-saves the current token automatically
// and reports "on," instead of silently reporting "off" and leaving them to notice and re-enable
// it themselves.
export async function isThisDeviceEnabled(uid) {
  const messaging = await messagingPromise;
  if (!messaging) return false;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return false;
    const existing = (await loadJSON(`push-tokens:${uid}`, null, true)) || { tokens: [] };
    if (existing.tokens.some((t) => t.token === token)) return true;
    if (Notification.permission === "granted") {
      existing.tokens.push({ token, addedAt: new Date().toISOString(), userAgent: navigator.userAgent });
      await saveJSON(`push-tokens:${uid}`, existing, true);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// The service worker keeps its own simple counter for the app icon badge, since it has no access
// to this app's own React state when a push arrives while the app is fully closed — it can only
// increment, not compute an accurate total. Whenever the app itself is open and sets the REAL
// badge count from its own genuinely current unread state, that counter needs resetting to match
// (to 0, since being open and setting a fresh, correct value is itself what "caught up" means) —
// otherwise a later background push would increment from a stale, too-high base the next time the
// app is closed again. Same store, same key, as the one the service worker writes to.
export async function resetBackgroundBadgeCounter() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("badge-store", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.transaction("kv", "readwrite").objectStore("kv").put(0, "count");
  } catch {
    // Best-effort — worst case, a future background push increments from a stale base until the
    // app is next opened, which corrects the actually-displayed badge regardless.
  }
}

export const ClassContext = createContext({ className: "", onSwitchClass: () => {}, classType: "elementary", commUnreadCount: 0 });
// For an account that holds both a teacher and a family record — lets Header (rendered
// independently by many different screens, not passed props from one shared parent) offer a
// "switch to parent view" link without threading it through every one of those screens.
export const AppModeContext = createContext({ canSwitchToParent: false, switchToParent: () => {} });

// Fonts, button press/hover feedback, and hand-written layout utilities — extracted into its
// own component so every screen can render it, not just the ones inside an open class. It used
// to live only inside ClassApp, which silently left the sign-in screen, class picker, and admin
// dashboard without any of it — same content, rendering it in more places is harmless (CSS
// naturally de-duplicates repeated rules).
export function GlobalAppStyles() {
  return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .display-font { font-family: 'Fraunces', serif; }
        .heb-font { font-family: 'Frank Ruhl Libre', serif; }

        /* Reusable entrance for anything that expands/reveals in place — panels, menus,
           collapsible sections. Plays automatically on mount (a CSS animation, not a
           transition, so it needs no "before" state to trigger from) — quick and subtle by
           design, not decorative. Respects reduced-motion: the animation is skipped entirely
           rather than just shortened, so someone who's asked for less motion gets none here. */
        @keyframes expandDown { from { opacity: 0; transform: translateY(-6px) scaleY(0.98); transform-origin: top; } to { opacity: 1; transform: translateY(0) scaleY(1); transform-origin: top; } }
        .anim-expand-down { animation: expandDown 180ms ease-out; }
        @keyframes expandUp { from { opacity: 0; transform: translateY(6px) scaleY(0.98); transform-origin: bottom; } to { opacity: 1; transform: translateY(0) scaleY(1); transform-origin: bottom; } }
        .anim-expand-up { animation: expandUp 180ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .anim-expand-down, .anim-expand-up { animation: none; }
        }

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

export function getFlags(data, studentId, incidents, config) {
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
// Generic documents (PDF, Word, Excel, etc.) — no compression or format-specific validation the
// way photos and videos get, just a straight upload with a size cap so one huge file can't stall
// things indefinitely. The original filename is kept alongside the URL (Storage's own path is a
// generated id, not something a person would recognize), so whoever receives it sees a real name
// to download, not a meaningless string.
export const MAX_FILE_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB
// Roughly 5-6 lines at the composer's own text size — long enough that a real message never
// feels cramped, capped so one very long paste doesn't push the send button off-screen.
export const MAX_COMPOSER_HEIGHT = 130;
export async function uploadOneFile(file, path, onProgress) {
  if (file.size > MAX_FILE_ATTACHMENT_BYTES) throw new Error("File is too large — the limit is 20MB.");
  const fileRef = storageRef(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type || "application/octet-stream" });
    const timeoutId = setTimeout(() => { task.cancel(); reject(new Error("timeout")); }, 120000);
    task.on("state_changed",
      (snapshot) => { if (onProgress) onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)); },
      (err) => { clearTimeout(timeoutId); reject(err); },
      async () => {
        clearTimeout(timeoutId);
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (err) { reject(err); }
      }
    );
  });
}
// Surfaces the real Firebase error code/message rather than a generic "something went wrong" —
// storage/unauthorized specifically means Storage Rules are rejecting the request (missing,
// unpublished, or evaluating false against this account's real data), which is a completely
// different, much more specific problem than a slow or dropped connection, and worth being able
// to tell apart at a glance rather than guessing blind.
export function describeUploadError(err) {
  if (err?.message === "timeout") return "That's taking too long — check your connection and try again.";
  const code = err?.code ? ` (${err.code})` : "";
  return `Couldn't upload${code} — ${err?.message || "unknown error"}.`;
}
// Reads a video file's actual duration client-side, entirely locally — no upload needed just to
// check length. Rejects clips over the limit before any bytes ever go to Storage, since there's no
// value in letting someone wait through an upload only to find out afterward it was too long.
export const MAX_VIDEO_SECONDS = 30;
export function validateVideoDuration(file, maxSeconds = MAX_VIDEO_SECONDS) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > maxSeconds) {
        reject(new Error(`Videos must be ${maxSeconds} seconds or shorter — this one is about ${Math.round(video.duration)}s. Trim it and try again.`));
      } else {
        resolve(video.duration);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error("Couldn't read that video file — try a different one.")); };
    video.src = URL.createObjectURL(file);
  });
}
// Shared by the Photos tile, the class blog, and message attachments — same compress-then-upload-
// with-timeout pipeline everywhere, so a fix or improvement made in one place benefits all of them.
// Module-level rather than tucked inside one component, since both the teacher side and the parent
// side need to upload images.
export async function uploadOneImage(file, path, onProgress) {
  const fileRef = storageRef(storage, path);
  const compressed = await compressImageFile(file);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, compressed, { contentType: "image/jpeg" });
    const timeoutId = setTimeout(() => { task.cancel(); reject(new Error("timeout")); }, 45000);
    task.on("state_changed",
      (snapshot) => { if (onProgress) onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)); },
      (err) => { clearTimeout(timeoutId); reject(err); },
      async () => {
        clearTimeout(timeoutId);
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (err) { reject(err); }
      }
    );
  });
}
// Videos aren't compressed client-side the way photos are — real video transcoding in the browser
// is heavy, complex infrastructure genuinely out of scope here. Instead, length is kept in check by
// rejecting anything over the duration limit before upload even starts, and the upload itself gets
// a longer timeout than a photo would, since even a short raw clip is a much bigger file than a
// compressed image.
export async function uploadOneVideo(file, path, onProgress) {
  await validateVideoDuration(file);
  const fileRef = storageRef(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type || "video/mp4" });
    const timeoutId = setTimeout(() => { task.cancel(); reject(new Error("timeout")); }, 120000);
    task.on("state_changed",
      (snapshot) => { if (onProgress) onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)); },
      (err) => { clearTimeout(timeoutId); reject(err); },
      async () => {
        clearTimeout(timeoutId);
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (err) { reject(err); }
      }
    );
  });
}

export function compressImageFile(file, maxDimension = 2048, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) { height = Math.round(height * (maxDimension / width)); width = maxDimension; }
        else { width = Math.round(width * (maxDimension / height)); height = maxDimension; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Couldn't process that image.")); return; }
        resolve(blob);
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image file.")); };
    img.src = url;
  });
}
export function formatTime12h(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return hhmm || "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
