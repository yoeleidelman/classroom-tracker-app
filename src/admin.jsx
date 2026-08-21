// src/admin.jsx
// The admin dashboard and every screen specific to it — forms for creating and editing teachers,
// families, classes, events, and school tools; data import/export; duplicate and integrity
// checkers; the admin messages monitor and detail views. Genuinely shared pieces (the raffle and
// points feature, account and contact-info panels, delete confirmations, section headers, mail
// action buttons) were moved to sharedUI.jsx first, specifically so this file could be this
// cleanly self-contained. Nothing here was rewritten — every line is exactly what it already was
// in App.jsx, just relocated and exported.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronLeft, Plus, ArrowRight, Loader2, Settings as SettingsIcon, ChevronDown, ChevronUp,
  Home as HomeIcon, BookOpen, Mail, Copy, Check, ChevronRight, MessageCircle, Flag, Wrench, X,
  Download, Sparkles, Users, FileText, Music, Send,
} from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import {
  DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE, EVENT_CATEGORIES, GlobalAppStyles, IMPORT_FIELD_OPTIONS,
  MAX_FILE_ATTACHMENT_BYTES, MEAL_AMOUNTS, PARENT_SETUP_EMAIL_PLACEHOLDERS, SCHOOLWIDE_CHECKIN_CODE,
  computeSkillStatus, deleteJSON, deleteMessageInThread, describeAttachmentsForNotification,
  describeUploadError, editMessageInThread, formatTime12h, guessImportField, isAccountActive,
  loadAllKeysWithPrefix, loadJSON, parseSpreadsheetFile, renderParentSetupEmail, saveJSON,
  sendPushNotification, skillKey, todayISO, uid, uploadOneFile, uploadOneImage, uploadOneVideo,
  validateVideoDuration,
} from "./core.jsx";
import {
  ArchiveOrDeleteMenu, AttachmentMenuButton, ConfirmDelete, ConversationThreadView,
  MailActionButtons, MyAccountPanel, PointsView, Section, StudentContactFields, buildParentLoginEmail,
  generateClassAnnouncementMessage,
} from "./sharedUI.jsx";

export function SchoolEventForm({ classes, existing, onSave, onCancel }) {
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

export function SchoolToolForm({ existing, onSave, onCancel }) {
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

export function TeacherAccountForm({ classes, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [messagingClassTypes, setMessagingClassTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleClass = (id) => setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleMessagingClassType = (t) => setMessagingClassTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  // classType defaults to "elementary" at class-creation time (see createClass), but that default
  // only ever applied going forward — any class created before this field existed at all has no
  // classType key in its stored record, not even an empty one, so a bare .filter(Boolean) here
  // silently drops every one of those older classes rather than treating them as elementary. That
  // was invisible until a school actually had a mix of both an old-style class missing the field
  // and a newer preschool class that does have it set — at that point this list only ever showed
  // "preschool," since every elementary entry had already been filtered out as falsy. Normalizing
  // the missing case to "elementary" here, on read, is what actually fixes it — a one-time
  // migration would only fix classes existing today, not explain why this could recur.
  const availableClassTypes = [...new Set(classes.map((c) => c.classType || "elementary"))];

  const save = async () => {
    setError("");
    // Trimmed here, not just at the point of use below — length is checked against the value
    // that will actually be sent, so a password that's only "6 characters" because of a stray
    // leading or trailing space (easy to pick up from a copy-paste) doesn't pass this check only
    // to end up shorter, and different, than what the admin thinks they set.
    const cleanPassword = tempPassword.trim();
    if (!name.trim() || !email.trim() || cleanPassword.length < 6) {
      setError("Name, email, and a temporary password of at least 6 characters are all required.");
      return;
    }
    setSaving(true);
    const result = await onSave(name.trim(), email.trim(), cleanPassword, role, selectedClassIds, isSubstitute, messagingClassTypes);
    setSaving(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Teacher's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (this is their username)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <p className="text-[10px] text-stone-400 mb-2">Share this password with them directly, or they can tap "Forgot password?" on the sign-in screen at any time to set their own instead.</p>

      <label className="block text-[10px] text-stone-400 mb-0.5">Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-2">
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>

      <label className="flex items-center gap-2 text-xs text-stone-600 mb-2">
        <input type="checkbox" checked={isSubstitute} onChange={(e) => setIsSubstitute(e.target.checked)} />
        Substitute (temporary access)
      </label>

      <label className="block text-xs font-semibold text-stone-700 mb-1">
        Assign to classes {role === "admin" && <span className="font-normal text-stone-400">— optional for admins, but needed if they should get that class's own notifications and messages, not just school-wide access</span>}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {classes.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
        {classes.map((c) => (
          <button key={c.id} onClick={() => toggleClass(c.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${selectedClassIds.includes(c.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {availableClassTypes.length > 0 && (
        <>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Reachable by every parent in these grade levels
            <span className="font-normal text-stone-400"> — for someone parents should be able to message even though they're not tied to specific classes (a curriculum coordinator, for example), without assigning them to every class one at a time. Separate from the class list above — this doesn't require picking any specific class.</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {availableClassTypes.map((t) => (
              <button key={t} onClick={() => toggleMessagingClassType(t)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${messagingClassTypes.includes(t) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {t}
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

// Much simpler than the first guardian's form — no student picker needed, since a second guardian
// automatically inherits exactly the same children the first guardian already has linked.
export function AddGuardianForm({ existingFamily, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    // Trimmed before the length check, same reasoning as the teacher form — a stray leading or
    // trailing space from a copy-paste shouldn't be able to sneak into a saved password unnoticed.
    const cleanPassword = tempPassword.trim();
    if (!name.trim() || !email.trim() || cleanPassword.length < 6) {
      setError("Name, email, and a temporary password of at least 6 characters are all required.");
      return;
    }
    setSaving(true);
    const result = await onSave(name.trim(), email.trim(), cleanPassword);
    setSaving(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mt-2">
      <p className="text-xs text-stone-500 mb-2">Will automatically see the same children as {existingFamily.name}: {(existingFamily.studentLinks || []).map((l) => l.studentName).join(", ") || "none yet"}.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="This guardian's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their own email (their username)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800 disabled:opacity-50">
          {saving ? "Adding…" : "Add guardian"}
        </button>
        <button onClick={onCancel} className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-3 py-1.5">Cancel</button>
      </div>
    </div>
  );
}

export function FamilyAccountForm({ allStudents, activeClasses, onSave, onCreateStudentInClass, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [addSecondParent, setAddSecondParent] = useState(false);
  const [name2, setName2] = useState("");
  const [email2, setEmail2] = useState("");
  const [tempPassword2, setTempPassword2] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // [{classId, studentId, studentName, className}]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [newStudentClassId, setNewStudentClassId] = useState(activeClasses?.[0]?.id || "");
  const [newStudentName, setNewStudentName] = useState("");
  const [studentCreating, setStudentCreating] = useState(false);

  const toggleStudent = (s) => setSelected((prev) =>
    prev.some((x) => x.classId === s.classId && x.studentId === s.studentId)
      ? prev.filter((x) => !(x.classId === s.classId && x.studentId === s.studentId))
      : [...prev, s]
  );
  const isSelected = (s) => selected.some((x) => x.classId === s.classId && x.studentId === s.studentId);

  // Creates the student directly in the chosen class's roster, then immediately links them to
  // this family being set up — the whole point being one continuous flow instead of a separate
  // trip into that class first, then back here to search for a student who now happens to exist.
  const createAndLinkStudent = async () => {
    setError("");
    if (!newStudentClassId || !newStudentName.trim()) {
      setError("Pick a class and enter the new student's name.");
      return;
    }
    setStudentCreating(true);
    const result = await onCreateStudentInClass(newStudentClassId, newStudentName.trim());
    setStudentCreating(false);
    if (!result.ok) { setError(result.error); return; }
    const cls = activeClasses.find((c) => c.id === newStudentClassId);
    setSelected((prev) => [...prev, { classId: newStudentClassId, studentId: result.student.id, studentName: result.student.name, className: cls?.name || "" }]);
    setNewStudentName("");
  };

  const filtered = search.trim()
    ? allStudents.filter((s) => s.studentName.toLowerCase().includes(search.toLowerCase()))
    : allStudents;

  const save = async () => {
    setError("");
    // Trimmed before the length checks and before being sent — same reasoning as the teacher
    // form, applied to both parents here since either one's password field could pick up a stray
    // leading or trailing space the same way.
    const cleanPassword = tempPassword.trim();
    const cleanPassword2 = tempPassword2.trim();
    if (!name.trim() || !email.trim() || cleanPassword.length < 6) {
      setError("A name, email, and a temporary password of at least 6 characters are all required.");
      return;
    }
    if (addSecondParent && (!name2.trim() || !email2.trim() || cleanPassword2.length < 6)) {
      setError("The second parent needs a name, email, and a temporary password of at least 6 characters too — or uncheck adding one.");
      return;
    }
    if (selected.length === 0) {
      setError("Link at least one child — a family account with no children linked has nothing to show.");
      return;
    }
    setSaving(true);
    const result = await onSave(name.trim(), email.trim(), cleanPassword, selected,
      addSecondParent ? { name: name2.trim(), email: email2.trim(), tempPassword: cleanPassword2 } : null);
    setSaving(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3">
      <p className="text-xs font-semibold text-stone-700 mb-1">Parent 1</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Parent 1's name (e.g. David Cohen)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (this is their username)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <p className="text-[10px] text-stone-400 mb-3">Share this password with them directly, or they can tap "Forgot password?" on the sign-in screen at any time to set their own instead.</p>

      {!addSecondParent ? (
        <button onClick={() => setAddSecondParent(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
          <Plus size={12} /> Add a second parent
        </button>
      ) : (
        <div className="border-t border-stone-200 pt-2.5 mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-stone-700">Parent 2</p>
            <button onClick={() => { setAddSecondParent(false); setName2(""); setEmail2(""); setTempPassword2(""); }} className="text-stone-400 hover:text-stone-600"><X size={13} /></button>
          </div>
          <p className="text-[10px] text-stone-400 mb-1.5">A genuinely separate login — their own email and password, on their own device — linked to the same kids and the same conversations as Parent 1.</p>
          <input value={name2} onChange={(e) => setName2(e.target.value)} placeholder="Parent 2's name" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} placeholder="Parent 2's email" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          <input type="text" value={tempPassword2} onChange={(e) => setTempPassword2(e.target.value)} placeholder="Parent 2's temporary password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
        </div>
      )}

      <label className="block text-xs font-semibold text-stone-700 mb-1">Link their child(ren)</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((s) => (
            <span key={`${s.classId}-${s.studentId}`} className="flex items-center gap-1 text-xs font-semibold bg-teal-700 text-white px-2.5 py-1 rounded-full">
              {s.studentName} <span className="opacity-75 font-normal">({s.className})</span>
              <button onClick={() => toggleStudent(s)} className="ml-0.5 hover:opacity-70"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students by name..."
        className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
      <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-lg bg-white mb-3">
        {filtered.length === 0 && <p className="text-xs text-stone-400 p-2">No students found.</p>}
        {filtered.map((s) => (
          <button key={`${s.classId}-${s.studentId}`} onClick={() => toggleStudent(s)}
            className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 text-sm border-b border-stone-100 last:border-b-0 ${isSelected(s) ? "bg-teal-50" : "hover:bg-stone-50"}`}>
            <span className="text-stone-800">{s.studentName}</span>
            <span className="text-xs text-stone-400">{s.className}</span>
          </button>
        ))}
      </div>

      {!creatingStudent ? (
        <button onClick={() => setCreatingStudent(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
          <Plus size={12} /> Create a new student
        </button>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg p-2.5 mb-3">
          <p className="text-xs font-semibold text-stone-700 mb-1.5">New student</p>
          <div className="flex gap-2 mb-2">
            <select value={newStudentClassId} onChange={(e) => setNewStudentClassId(e.target.value)}
              className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
              {(activeClasses || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student's name"
              onKeyDown={(e) => e.key === "Enter" && createAndLinkStudent()}
              className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={createAndLinkStudent} disabled={studentCreating} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800 disabled:opacity-40">
              {studentCreating ? "Creating..." : "Create & link"}
            </button>
            <button onClick={() => { setCreatingStudent(false); setNewStudentName(""); }} className="text-xs font-semibold text-stone-500 hover:text-stone-700">Cancel</button>
          </div>
        </div>
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

export function ProgramForm({ classes, existing, onSave, onCancel }) {
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

export const EXPORT_DATA_TYPE_OPTIONS = [
  { id: "incidents", label: "Incidents" },
  { id: "assessments", label: "Assessments" },
  { id: "homework", label: "Homework" },
  { id: "attendance", label: "Attendance" },
  { id: "points", label: "Points" },
  { id: "programs", label: "Shared programs" },
  { id: "contact", label: "Parent & contact info" },
];

export function ExportPanel({ classes, globalStudents, onExport, onCancel }) {
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

export function BulkImportPanel({ onImport, onCancel }) {
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

// Self-contained rather than threaded through AdminDashboard's already enormous prop list — reads
// and writes one small, school-wide document directly. This is the one number every "contact the
// office" deep link on the parent side points at, so getting it right here is what makes those
// links actually work.
// Reusable across both the teacher and parent settings screens — accentColor lets each side
// style it to match (teal for teacher, the terracotta parent color for family), same component
// either way. Never auto-prompts; permission is only ever requested from a direct tap on the
// button below, matching what both iOS and Android expect from a well-behaved site.
export function OfficeContactSettings() {
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadJSON("schoolSettings", {}, true).then((s) => { setPhone(s?.officePhone || ""); setLoaded(true); });
  }, []);

  const startEditing = () => { setDraft(phone); setEditing(true); };

  const save = async () => {
    const existing = (await loadJSON("schoolSettings", {}, true)) || {};
    await saveJSON("schoolSettings", { ...existing, officePhone: draft.trim() }, true);
    setPhone(draft.trim());
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!loaded) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
      <p className="text-sm font-semibold text-stone-800 mb-1">Office phone number</p>
      <p className="text-xs text-stone-400 mb-3">Parents reach the office through this number — call, text, or WhatsApp — right from a button in their app, not a separate in-app inbox for you to check.</p>
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. (555) 123-4567" autoFocus
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button onClick={save} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-2 hover:bg-teal-800">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50">Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-stone-800">{phone || "Not set yet"}</span>
          <button onClick={startEditing} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-50">
            {phone ? "Edit" : "Set number"}
          </button>
          {saved && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
        </div>
      )}
    </div>
  );
}

// Lets admin edit the one central parent-setup-email template, with a live preview using sample
// data so they can see exactly what a real parent would receive without needing to actually
// create a test account to check it.
export function ParentSetupEmailSettings() {
  const [template, setTemplate] = useState(DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadJSON("schoolSettings", {}, true).then((s) => {
      setTemplate(s?.parentSetupEmailTemplate || DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE);
      setLoaded(true);
    });
  }, []);

  const startEditing = () => { setDraft(template); setEditing(true); setShowPreview(false); };

  const save = async () => {
    const existing = (await loadJSON("schoolSettings", {}, true)) || {};
    await saveJSON("schoolSettings", { ...existing, parentSetupEmailTemplate: draft }, true);
    setTemplate(draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const resetToDefault = () => setDraft(DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE);

  const previewText = renderParentSetupEmail(editing ? draft : template, {
    parentName: "Sarah Cohen", studentName: "Ezra", schoolName: "SJA", email: "sarah.cohen@example.com",
    tempPassword: "Welcome123", loginLink: `${typeof window !== "undefined" ? window.location.origin : ""}/?portal=parent`,
  });

  if (!loaded) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
      <p className="text-sm font-semibold text-stone-800 mb-1">Parent account setup email</p>
      <p className="text-xs text-stone-400 mb-3">The email a new family gets with their login info. Edit the wording below — the bracketed placeholders get swapped for each family's real information when it's actually sent.</p>

      {editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-mono mb-2 resize-none" />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PARENT_SETUP_EMAIL_PLACEHOLDERS.map((p) => (
              <button key={p.key} onClick={() => setDraft((d) => d + `{{${p.key}}}`)} title={p.label}
                className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-1 hover:bg-teal-100">
                {`{{${p.key}}}`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={save} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-2 hover:bg-teal-800">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50">Cancel</button>
            <button onClick={resetToDefault} className="text-xs font-semibold text-stone-400 hover:text-stone-700">Reset to default wording</button>
            <button onClick={() => setShowPreview((v) => !v)} className="text-xs font-semibold text-teal-700 hover:text-teal-900 ml-auto">
              {showPreview ? "Hide preview" : "Preview with sample data"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button onClick={startEditing} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-50">Edit wording</button>
          <button onClick={() => setShowPreview((v) => !v)} className="text-xs font-semibold text-stone-500 hover:text-stone-800">
            {showPreview ? "Hide preview" : "Preview with sample data"}
          </button>
          {saved && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
        </div>
      )}

      {showPreview && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 whitespace-pre-wrap text-xs text-stone-700 leading-relaxed">
          {previewText}
        </div>
      )}
    </div>
  );
}


// A central place for admin to see across the whole school in one spot, rather than needing to
// enter every class one at a time. Classroom threads: admin can open and post to any of them,
// same access they'd already have by entering that class directly — this is just a faster way in.
// Individual teacher threads: deliberately read-only here, matching the same restriction
// everywhere else in the app — only the one specific teacher named in a thread can ever post to
// it, so a parent's direct line to a teacher stays genuinely private even from admin's own view.
// Lets admin describe, per class, what each individually-messageable person's actual role is
// there — deliberately keyed by (class, person) rather than stored once on the account, since the
// same person's role can genuinely differ by classroom (a Judaic Studies teacher in one room, a
// General Studies teacher in another). A parent picking who to message sees this instead of
// having to guess from a bare name; the account itself never carries a single fixed title.
// A narrow, specific cleanup tool — not a general "wipe messages" feature. Only ever touches
// admin-messages:* documents (the School Office thread), never a classroom thread or an
// individual teacher thread, since those aren't what test broadcasts get sent through and there's
// no reason for this tool to be able to reach them at all. Requires an explicit two-step
// confirmation (see the count first, then a second tap to actually delete) precisely because this
// is irreversible — there's no undo for a deleted message thread.
export function ClearAdminMessagesTool() {
  const [status, setStatus] = useState("idle"); // "idle" | "checking" | "confirming" | "deleting" | "done" | "empty"
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const keysRef = useRef([]);

  const checkCount = async () => {
    setStatus("checking");
    setError(null);
    const keys = await loadAllKeysWithPrefix("admin-messages:");
    keysRef.current = keys;
    setCount(keys.length);
    setStatus(keys.length > 0 ? "confirming" : "empty");
  };

  const deleteAll = async () => {
    setStatus("deleting");
    try {
      await Promise.all(keysRef.current.map((key) => deleteJSON(key)));
      setStatus("done");
    } catch {
      setError("Something went wrong deleting one or more threads — check the count again to see what's left.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return <p className="text-xs font-semibold text-emerald-700">Cleared {count} thread{count === 1 ? "" : "s"} with the School Office.</p>;
  }
  if (status === "empty") {
    return <p className="text-xs text-stone-400">No School Office threads found — nothing to clear.</p>;
  }
  if (status === "confirming") {
    return (
      <div>
        <p className="text-xs text-rose-600 font-semibold mb-2">
          Found {count} existing thread{count === 1 ? "" : "s"} with the School Office. This permanently deletes all of them — there's no undo.
        </p>
        <div className="flex gap-2">
          <button onClick={deleteAll} className="text-xs font-semibold text-white bg-red-600 rounded-lg px-3 py-2 hover:bg-red-700">
            Yes, permanently delete {count} thread{count === 1 ? "" : "s"}
          </button>
          <button onClick={() => setStatus("idle")} className="text-xs font-semibold text-stone-500 border border-stone-300 rounded-lg px-3 py-2">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <button onClick={checkCount} disabled={status === "checking" || status === "deleting"}
        className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50 disabled:opacity-50">
        {status === "checking" ? "Checking…" : status === "deleting" ? "Deleting…" : "Check for messages to clear"}
      </button>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
    </div>
  );
}


// Individual teacher threads: deliberately read-only here, matching the same restriction
// everywhere else in the app — only the one specific teacher named in a thread can ever post to
// it, so a parent's direct line to a teacher stays genuinely private even from admin's own view.
// Lets admin describe, per class, what each individually-messageable person's actual role is
// there — deliberately keyed by (class, person) rather than stored once on the account, since the
// same person's role can genuinely differ by classroom (a Judaic Studies teacher in one room, a
// General Studies teacher in another). A parent picking who to message sees this instead of
// having to guess from a bare name; the account itself never carries a single fixed title.
export function ClassMessagingLabelsEditor({ activeClasses, teachers }) {
  const [selectedClassId, setSelectedClassId] = useState(activeClasses[0]?.id || "");
  const [labels, setLabels] = useState(null); // { [uid]: "label text" }
  const [drafts, setDrafts] = useState({});
  const [savedFor, setSavedFor] = useState(null);

  const selectedClass = activeClasses.find((c) => c.id === selectedClassId);

  // Everyone parents of THIS class can currently message individually — same eligibility rule
  // the family-facing endpoint uses, just computed here directly since admin already has full
  // read access to every teacher record. Falls back to "elementary" for a class missing its own
  // classType field (any class created before that field existed at all) — the exact same default
  // eligible-teachers.js already applies for the real, parent-facing version of this same check.
  // Without it, a class that predates classType would never match anyone's messagingClassTypes at
  // all (undefined never equals a real type like "elementary"), silently hiding every
  // grade-level-only person from this editor for that class — not because they're actually
  // unreachable, just because this one screen couldn't see them.
  const eligiblePeople = (teachers || []).filter((t) => {
    if (t.active === false) return false;
    const viaClass = (t.assignedClassIds || []).includes(selectedClassId);
    const viaGradeLevel = selectedClass && (t.messagingClassTypes || []).includes(selectedClass.classType || "elementary");
    return viaClass || viaGradeLevel;
  });

  useEffect(() => {
    (async () => {
      setLabels(null);
      if (!selectedClassId) { setLabels({}); return; }
      const data = (await loadJSON(`class:${selectedClassId}:messagingLabels`, {}, true)) || {};
      setLabels(data);
      setDrafts(data);
    })();
  }, [selectedClassId]);

  const saveLabel = async (uid) => {
    const value = (drafts[uid] || "").trim();
    const next = { ...labels, [uid]: value };
    await saveJSON(`class:${selectedClassId}:messagingLabels`, next, true);
    setLabels(next);
    setSavedFor(uid);
    setTimeout(() => setSavedFor(null), 2000);
  };

  return (
    <div>
      <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full md:w-96 rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3">
        {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <p className="text-xs text-stone-400 mb-3">This is what parents of {selectedClass?.name || "this class"} see under each person's name when choosing who to message — not the same thing as changing their account. Edit anytime; changes apply right away.</p>

      {labels === null && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
      {labels !== null && eligiblePeople.length === 0 && <p className="text-sm text-stone-400 text-center py-8">Nobody is individually messageable for this class yet.</p>}
      {labels !== null && (
        <div className="space-y-2">
          {eligiblePeople.map((t) => (
            <div key={t.uid} className="bg-white border border-stone-200 rounded-xl p-3.5">
              <p className="text-sm font-semibold text-stone-900 mb-1.5">{t.name}</p>
              <div className="flex gap-2">
                <input value={drafts[t.uid] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [t.uid]: e.target.value }))}
                  placeholder="e.g. Judaic Studies Teacher" className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm" />
                <button onClick={() => saveLabel(t.uid)} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800 shrink-0">Save</button>
              </div>
              {savedFor === t.uid && <p className="text-xs text-emerald-700 mt-1">Saved</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminMessagesMonitor({ activeClasses, teachers, currentTeacher, families }) {
  const [section, setSection] = useState("classroom"); // "classroom" | "direct"
  const [selectedClassId, setSelectedClassId] = useState(activeClasses[0]?.id || "");
  const [selectedTeacherUid, setSelectedTeacherUid] = useState((teachers || []).find(isRegularActiveTeacher)?.uid || "");
  const [groups, setGroups] = useState(null);
  const [threads, setThreads] = useState({});
  const [openGroup, setOpenGroup] = useState(null);

  const nonAdminTeachers = (teachers || []).filter(isRegularActiveTeacher);

  const refresh = useCallback(async () => {
    setOpenGroup(null);
    if (section === "classroom") {
      if (!selectedClassId) { setGroups([]); return; }
      const relevant = (families || []).filter((f) => (f.studentLinks || []).some((l) => l.classId === selectedClassId));
      // One row per GUARDIAN, not per family group — classroom threads are now a private,
      // per-guardian conversation too (see the matching comment in TeacherMessagesView's own
      // refresh for the full reasoning), so admin's oversight view needs to show each one
      // distinctly, the same way it already does for the direct-messages section below.
      const byGuardian = {};
      relevant.forEach((f) => {
        if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f], studentLinks: f.studentLinks };
      });
      const groupList = Object.values(byGuardian);
      setGroups(groupList);
      const entries = await Promise.all(groupList.map(async (g) => [g.groupId, await loadJSON(`class:${selectedClassId}:messages:${g.groupId}`, { messages: [] }, true)]));
      setThreads(Object.fromEntries(entries));
    } else {
      if (!selectedTeacherUid) { setGroups([]); return; }
      const teacherClassIds = (teachers.find((t) => t.uid === selectedTeacherUid)?.assignedClassIds) || [];
      const relevant = (families || []).filter((f) => (f.studentLinks || []).some((l) => teacherClassIds.includes(l.classId)));
      // One row per GUARDIAN here, not per family group — an individual teacher thread is a
      // separate, private conversation per guardian (see sendDirectMessageToFamily's own comment
      // for the full reasoning), so admin's oversight view needs to show each one distinctly too,
      // rather than implying one merged thread that doesn't actually exist.
      const byGuardian = {};
      relevant.forEach((f) => {
        if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f], studentLinks: f.studentLinks };
      });
      const groupList = Object.values(byGuardian);
      setGroups(groupList);
      const entries = await Promise.all(groupList.map(async (g) => [g.groupId, await loadJSON(`teacher-messages:${selectedTeacherUid}:${g.groupId}`, { messages: [] }, true)]));
      setThreads(Object.fromEntries(entries));
    }
  }, [section, selectedClassId, selectedTeacherUid, families, teachers]);

  useEffect(() => { refresh(); }, [refresh]);

  const sendAsAdminToClass = async (guardianUid, text) => {
    const key = `class:${selectedClassId}:messages:${guardianUid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const className = activeClasses.find((c) => c.id === selectedClassId)?.name || "the class";
    const entry = { id: uid(), senderType: "teacher", senderName: currentTeacher?.name || "School Office", text, timestamp: new Date().toISOString() };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    sendPushNotification([guardianUid], `Message from ${className}`, text?.trim() || "New message", `/?portal=parent&open=messages&classId=${selectedClassId}`);
    return next;
  };

  if (openGroup) {
    const thread = threads[openGroup.groupId] || { messages: [] };
    const guardianNames = openGroup.guardians.map((g) => g.name).join(" & ");
    const childNames = (openGroup.studentLinks || []).map((l) => l.studentName).join(", ");
    return (
      <ConversationThreadView title={guardianNames} subtitle={childNames} messages={thread.messages}
        myRole={section === "classroom" ? "teacher" : "admin"} readOnly={section !== "classroom"}
        threadKey={section === "classroom" ? `classroom-${openGroup.groupId}` : `teacher-direct-${openGroup.groupId}`}
        onBack={() => { setOpenGroup(null); refresh(); }}
        onSend={section === "classroom" ? async (text) => { await sendAsAdminToClass(openGroup.groupId, text); await refresh(); } : undefined} />
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 md:w-96">
        <button onClick={() => setSection("classroom")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${section === "classroom" ? "bg-white text-[#1c3453] shadow-sm" : "text-stone-500"}`}>Classroom threads</button>
        <button onClick={() => setSection("direct")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${section === "direct" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Direct threads</button>
      </div>

      {section === "classroom" ? (
        <>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full md:w-96 rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3">
            {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p className="text-xs text-stone-400 mb-3">You can view and post here — same access you'd have by entering this class directly.</p>
        </>
      ) : (
        <>
          <select value={selectedTeacherUid} onChange={(e) => setSelectedTeacherUid(e.target.value)} className="w-full md:w-96 rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3">
            {nonAdminTeachers.map((t) => <option key={t.uid} value={t.uid}>{t.name}</option>)}
          </select>
          <p className="text-xs text-stone-400 mb-3">View-only — only {nonAdminTeachers.find((t) => t.uid === selectedTeacherUid)?.name || "this teacher"} can post in their own direct threads.</p>
        </>
      )}

      {groups === null && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
      {groups?.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No threads here yet.</p>}
      <div className="space-y-2">
        {(groups || []).map((g) => {
          const thread = threads[g.groupId];
          const last = thread?.messages?.[thread.messages.length - 1];
          const guardianNames = g.guardians.map((gu) => gu.name).join(" & ");
          const childNames = (g.studentLinks || []).map((l) => l.studentName).join(", ");
          return (
            <button key={g.groupId} onClick={() => setOpenGroup(g)} className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:border-teal-300">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">{guardianNames}</p>
                {last && <p className="text-[10px] text-stone-400 shrink-0">{new Date(last.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>}
              </div>
              <p className="text-xs text-stone-400 mb-1">{childNames}</p>
              <p className="text-xs text-stone-500 truncate">{last ? last.text : "No messages yet"}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Same top-bar pattern as the classroom and parent sides — the admin page had grown into one
// long scroll of every section stacked on top of each other; splitting it into destinations
// makes each one reachable directly instead of scrolling past everything else to find it.
export function AdminMainTabs({ active, navigate }) {
  const tabs = [
    { id: "overview", label: "Overview", icon: HomeIcon },
    { id: "classes", label: "Classes", icon: Wrench },
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: BookOpen },
    { id: "families", label: "Families", icon: MessageCircle },
    { id: "more", label: "More", icon: SettingsIcon },
  ];
  return (
    <div className="flex bg-white border border-stone-200 rounded-xl overflow-x-auto no-scrollbar mb-6">
      {tabs.map((t, i) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => navigate(t.id)}
            className={`flex-1 shrink-0 flex items-center justify-center gap-1 px-1.5 py-2.5 text-xs font-semibold border-b-2 ${i > 0 ? "border-l border-l-stone-200" : ""} ${isActive ? "text-teal-800 border-b-teal-700 bg-teal-50/50" : "text-stone-500 border-b-transparent hover:bg-stone-50"}`}>
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Directly sets a new password for one teacher, admin-side — no email round-trip at all, so it
// works even for someone who has no practical way to go check their inbox right this moment. Kept
// collapsed to a single small link by default (mirroring InlineNoteField's own reasoning
// elsewhere) so it doesn't clutter this row for the far more common case of a teacher whose
// account is working fine.
export function TeacherPasswordResetForm({ uid, onReset }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok: true } | { ok: false, error }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs font-semibold text-stone-500 hover:text-teal-700">Reset this teacher's password</button>;
  }

  const submit = async () => {
    const clean = password.trim();
    if (clean.length < 6) { setResult({ ok: false, error: "Needs to be at least 6 characters." }); return; }
    setSaving(true);
    const r = await onReset(uid, clean);
    setSaving(false);
    setResult(r);
    if (r.ok) setPassword("");
  };

  return (
    <div>
      <p className="text-xs font-semibold text-stone-700 mb-1">Set a new password directly</p>
      <div className="flex items-center gap-1.5">
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="New password (6+ characters)" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
        <button onClick={submit} disabled={saving} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-40 shrink-0">
          {saving ? "Saving..." : "Set"}
        </button>
        <button onClick={() => { setOpen(false); setResult(null); setPassword(""); }} className="text-xs text-stone-400 shrink-0">Cancel</button>
      </div>
      {result && (
        result.ok
          ? <p className="text-xs text-teal-700 mt-1">Password set — share it with them directly, or they can still use "Forgot password?" any time to change it themselves.</p>
          : <p className="text-xs text-rose-600 mt-1">{result.error}</p>
      )}
    </div>
  );
}

export function DuplicateEnrollmentChecker({ onCheck }) {
  const [status, setStatus] = useState("idle"); // idle | checking | done
  const [results, setResults] = useState([]);

  const runCheck = async () => {
    setStatus("checking");
    const found = await onCheck();
    setResults(found);
    setStatus("done");
  };

  return (
    <div className="mb-3">
      {status !== "done" && (
        <button onClick={runCheck} disabled={status === "checking"}
          className="text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 rounded-lg px-3 py-2 disabled:opacity-50">
          {status === "checking" ? "Checking every class…" : "Check for students enrolled in more than one class"}
        </button>
      )}
      {status === "done" && results.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-emerald-800">No duplicate enrollments found — every student is in exactly one class.</p>
          <button onClick={runCheck} className="text-xs font-semibold text-emerald-700 shrink-0 ml-2">Recheck</button>
        </div>
      )}
      {status === "done" && results.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-rose-800">{results.length} student{results.length === 1 ? "" : "s"} enrolled in more than one class</p>
            <button onClick={runCheck} className="text-xs font-semibold text-rose-700 shrink-0 ml-2">Recheck</button>
          </div>
          <p className="text-xs text-rose-700 mb-2">Each one needs to be removed from every class except their real one — from that class's own Settings → Students.</p>
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.studentId} className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5">
                <p className="text-sm font-semibold text-stone-800">{r.name}</p>
                <p className="text-xs text-rose-600">{r.classes.map((c) => c.className).join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Same purpose as DuplicateEnrollmentChecker just above, for a different real, reported gap: a
// child with two meal entries for the same day (or two nap entries), left over from before the
// underlying race condition was fixed — that fix stops new ones from being created, but can't
// reach back and repair what's already there. Unlike the enrollment case, there's no reliable way
// to tell which of two entries is the "right" one automatically (no timestamp is stored on these,
// only who logged them) — so this surfaces every duplicate found and lets an admin remove
// whichever one is wrong by hand, rather than guessing on their behalf.
// Same purpose as the checkers above, for a different real, reported gap neither of them can see:
// a teacher logging real data for a specific child, where neither the parent NOR the teacher's
// own detail view for that exact child shows it. That combination rules out a live-mirror problem
// (real data reaching a screen late is still real data once it arrives) and points at something
// deeper — most plausibly two different roster entries that happen to share a name, so whatever's
// being logged and whatever's being viewed are actually two separate, disconnected records. Search
// is by name specifically, not by picking a single roster entry, since the entire point is to find
// EVERY entry sharing that name, including ones that wouldn't otherwise be reachable from any one
// class's own roster screen.
export function StudentDataIntegrityChecker({ onCheck }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | done
  const [result, setResult] = useState(null);

  const runCheck = async () => {
    if (!name.trim()) return;
    setStatus("checking");
    const res = await onCheck(name.trim());
    setResult(res);
    setStatus("done");
  };

  return (
    <div className="mb-3 bg-stone-50 border border-stone-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-stone-700 mb-2">Check a student's real data — every roster entry and family link sharing this name</p>
      <div className="flex gap-2 mb-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runCheck()}
          placeholder="Student's name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        <button onClick={runCheck} disabled={status === "checking" || !name.trim()}
          className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-40 shrink-0">
          {status === "checking" ? "Checking…" : "Check"}
        </button>
      </div>

      {status === "done" && result && (
        <div className="space-y-2">
          {result.rosterEntries.length === 0 ? (
            <p className="text-xs text-rose-600">No roster entry found with this exact name in any active class.</p>
          ) : (
            <>
              {result.rosterEntries.length > 1 && (
                <p className="text-xs font-bold text-rose-800 bg-rose-50 border-2 border-rose-300 rounded-lg p-2">
                  ⚠ Found {result.rosterEntries.length} separate roster entries with this exact name — these are different student records, even though they share a name. Data logged against one will never show up under another.
                </p>
              )}
              {result.rosterEntries.map((r, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-stone-800">{r.className}</p>
                  <p className="text-[11px] text-stone-400 font-mono">{r.studentId}</p>
                  <p className="text-xs text-stone-600 mt-1">
                    {r.hasAnyData
                      ? `Has data: ${Object.entries(r.counts).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(", ")}`
                      : "No data logged under this entry at all."}
                  </p>
                </div>
              ))}
            </>
          )}

          {result.familyLinks.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-stone-700 mb-1">Family links to this name:</p>
              {result.familyLinks.map((l, i) => (
                <div key={i} className={`text-xs rounded-lg p-2 mb-1 ${l.matchesCurrentRoster ? "bg-white border border-stone-200 text-stone-600" : "bg-amber-50 border-2 border-amber-300 text-amber-800 font-semibold"}`}>
                  {l.guardianName} ({l.guardianEmail}) → {l.className}
                  {!l.matchesCurrentRoster && " — ⚠ this link's own student id doesn't match any current roster entry above at all"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DuplicateDailyLogChecker({ onCheck, onRemove }) {
  const [status, setStatus] = useState("idle"); // idle | checking | done
  const [results, setResults] = useState([]);
  const [removing, setRemoving] = useState(null); // a stable key for whichever entry (or "group:<key>" for a bulk action) is mid-removal

  const runCheck = async () => {
    setStatus("checking");
    const found = await onCheck();
    // Newest first within each group — now that every entry carries a real loggedAt, the one most
    // likely to be the actual correction is easy to put first rather than left in whatever order
    // the underlying array happened to be in.
    const sorted = found.map((g) => ({ ...g, entries: [...g.entries].sort((a, b) => (b.loggedAt || "").localeCompare(a.loggedAt || "")) }));
    setResults(sorted);
    setStatus("done");
  };

  const handleRemove = async (group, entry, entryKey) => {
    setRemoving(entryKey);
    await onRemove(group.classId, group.studentId, group.category, entry);
    // Re-checks from scratch rather than just splicing the removed entry out of local state —
    // simpler, and correctly reflects reality if the underlying data changed in any other way
    // between when this list was shown and now.
    await runCheck();
    setRemoving(null);
  };

  // Keeps only the newest entry in a group, removing every older one — a real shortcut now that
  // there's a genuine timestamp to act on, not a guess. Still one tap per group, not automatic or
  // silent: the group stays visible with each entry's own time shown until this is actually
  // pressed, so it's always a deliberate choice, never something that happens on the admin's
  // behalf just because they opened this screen.
  const handleKeepNewest = async (group, groupKey) => {
    setRemoving(`group:${groupKey}`);
    for (const entry of group.entries.slice(1)) {
      await onRemove(group.classId, group.studentId, group.category, entry);
    }
    await runCheck();
    setRemoving(null);
  };

  const formatLoggedAt = (iso) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return null; }
  };

  return (
    <div className="mb-3">
      {status !== "done" && (
        <button onClick={runCheck} disabled={status === "checking"}
          className="text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 rounded-lg px-3 py-2 disabled:opacity-50">
          {status === "checking" ? "Checking every preschool class…" : "Check for duplicate meal/nap entries"}
        </button>
      )}
      {status === "done" && results.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-emerald-800">No duplicate meal or nap entries found.</p>
          <button onClick={runCheck} className="text-xs font-semibold text-emerald-700 shrink-0 ml-2">Recheck</button>
        </div>
      )}
      {status === "done" && results.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-rose-800">{results.length} duplicate log{results.length === 1 ? "" : "s"} found</p>
            <button onClick={runCheck} className="text-xs font-semibold text-rose-700 shrink-0 ml-2">Recheck</button>
          </div>
          <p className="text-xs text-rose-700 mb-2">Newest is listed first and marked — usually the actual correction, but check before trusting it.</p>
          <div className="space-y-2">
            {results.map((group) => {
              const groupKey = `${group.studentId}-${group.category}-${group.date}-${group.label}`;
              const hasTimestamps = group.entries.every((e) => e.loggedAt);
              return (
                <div key={groupKey} className="bg-white border border-rose-200 rounded-lg px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-800">{group.studentName} <span className="text-stone-400 font-normal">· {group.className} · {group.label} · {group.date}</span></p>
                    {hasTimestamps && (
                      <button onClick={() => handleKeepNewest(group, groupKey)} disabled={removing === `group:${groupKey}`}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 shrink-0 disabled:opacity-40">
                        {removing === `group:${groupKey}` ? "Working…" : "Keep newest, remove rest"}
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {group.entries.map((entry, i) => {
                      const entryKey = `${group.studentId}-${group.category}-${group.date}-${i}`;
                      const summary = group.category === "meals"
                        ? `Ate: ${MEAL_AMOUNTS.find((a) => a.id === entry.amount)?.label || entry.amount}${entry.note ? ` — "${entry.note}"` : ""}`
                        : entry.skipped ? "Didn't nap" : `${formatTime12h(entry.start)}${entry.end ? ` – ${formatTime12h(entry.end)}` : " (still sleeping)"}`;
                      const when = formatLoggedAt(entry.loggedAt);
                      return (
                        <div key={i} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${i === 0 && hasTimestamps ? "bg-teal-50 border border-teal-200" : "bg-stone-50"}`}>
                          <p className="text-xs text-stone-600">
                            {i === 0 && hasTimestamps && <span className="text-teal-700 font-bold mr-1">Newest —</span>}
                            {summary}{entry.loggedBy ? ` — logged by ${entry.loggedBy}` : ""}{when ? ` at ${when}` : ""}
                          </p>
                          <button onClick={() => handleRemove(group, entry, entryKey)} disabled={removing === entryKey}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 shrink-0 disabled:opacity-40">
                            {removing === entryKey ? "Removing…" : "Remove this one"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Looks up a teacher's REAL account state directly rather than guessing — see
// check-teacher-account.js for the full reasoning behind why this exists. Deliberately shows the
// raw facts (disabled? when created? when did it last actually sign in? does the Firestore copy
// of the email match Auth's own copy exactly?) rather than a single "healthy/broken" verdict,
// since the actual value here is letting a real pattern across several checked accounts become
// visible — a shared cause is often plainer once several individually-fine-looking accounts sit
// next to each other than it is from any one account in isolation.
export function TeacherAccountChecker({ onCheck }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | done
  const [result, setResult] = useState(null);

  const runCheck = async () => {
    if (!email.trim()) return;
    setStatus("checking");
    const res = await onCheck(email.trim());
    setResult(res);
    setStatus("done");
  };

  const formatTime = (iso) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <div className="mb-3 bg-stone-50 border border-stone-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-stone-700 mb-2">Check a teacher's real account state</p>
      <div className="flex gap-2 mb-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runCheck()}
          placeholder="Their exact sign-in email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        <button onClick={runCheck} disabled={status === "checking" || !email.trim()}
          className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 disabled:opacity-40 shrink-0">
          {status === "checking" ? "Checking…" : "Check"}
        </button>
      </div>

      {status === "done" && result && !result.ok && (
        <p className="text-xs text-rose-600">{result.error}</p>
      )}

      {status === "done" && result?.ok && result.authError && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-2.5">
          <p className="text-xs font-bold text-rose-800">No account found</p>
          <p className="text-xs text-rose-700 mt-0.5">{result.authError}</p>
        </div>
      )}

      {status === "done" && result?.ok && result.authAccount && (
        <div className={`border-2 rounded-lg p-2.5 space-y-1.5 ${result.authAccount.disabled ? "bg-rose-50 border-rose-300" : "bg-white border-stone-200"}`}>
          {result.authAccount.disabled && (
            <p className="text-xs font-bold text-rose-800">⚠ This account is DISABLED — that alone blocks every sign-in attempt, with no other explanation needed.</p>
          )}
          <p className="text-xs text-stone-700"><span className="font-semibold">Sign-in email on file:</span> {result.authAccount.email}</p>
          <p className="text-xs text-stone-700"><span className="font-semibold">Account created:</span> {formatTime(result.authAccount.creationTime)}</p>
          <p className="text-xs text-stone-700"><span className="font-semibold">Last actually signed in:</span> {result.authAccount.lastSignInTime ? formatTime(result.authAccount.lastSignInTime) : "Never"}</p>
          <p className="text-xs text-stone-700"><span className="font-semibold">Sign-in method(s):</span> {result.authAccount.providerIds.join(", ") || "none on file"}</p>
          {result.firestoreRecord ? (
            <>
              <p className="text-xs text-stone-700"><span className="font-semibold">Teacher profile:</span> {result.firestoreRecord.name} · {isAccountActive(result.firestoreRecord) ? "active" : "⚠ marked inactive"} · {result.firestoreRecord.assignedClassIds.length} class(es) assigned</p>
              {!result.firestoreRecord.emailMatchesAuth && (
                <p className="text-xs font-bold text-amber-700">⚠ The email on this teacher's profile doesn't exactly match their real sign-in email ({result.firestoreRecord.email}) — worth fixing directly, since admin screens show the profile copy, not the real one.</p>
              )}
            </>
          ) : (
            <p className="text-xs font-bold text-amber-700">⚠ This is a real, valid sign-in account — but no teacher profile exists for it at all. They could sign in but would see nothing.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ registry, onEnterClass, onCreate, onRefresh, onLogout, onRestore, onDeleteClass, onArchiveClassById, onChangePassword, currentTeacher, onChangeMyPassword, onChangeMyName, onChangeMySignOff, globalStudents, onRefreshStudents, onAddStudent, onUpdateStudent, onArchiveStudent, onRestoreStudent, onDeleteStudent, onBulkAddStudents, onFindDuplicateEnrollments, onFindDuplicateDailyLogs, onRemoveDailyLogDuplicate, onCheckStudentDataIntegrity, onBuildExportData, schoolEvents, onRefreshEvents, onAddEvent, onUpdateEvent, onRemoveEvent, schoolTools, onRefreshTools, onAddTool, onUpdateTool, onRemoveTool, teachers, onRefreshTeachers, onCreateTeacher, onUpdateTeacher, onToggleTeacherClass, onResetTeacherPassword, onCheckTeacherAccount, onDeactivateTeacher, onDeleteTeacher, families, onRefreshFamilies, onCreateFamily, onAddGuardianToFamily, onCreateStudentInClass, onUpdateFamily, onDeactivateFamily, onDeleteFamily, onFetchAllStudentsForLinking, onFetchDailyOverview, onFetchStudentHistory, onFetchStudentClassMap, onFetchStudentProfile, programs, onRefreshPrograms, onAddProgram, onUpdateProgram, onRemoveProgram, onFetchProgramDetail, onAddProgramPoints, onAddProgramCategory, canSwitchToParent, onSwitchToParent }) {
  const [adminTab, setAdminTab] = useState("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newClassType, setNewClassType] = useState("elementary");
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
  const [teacherCreatedNote, setTeacherCreatedNote] = useState(null);
  const [editingTeacherUid, setEditingTeacherUid] = useState(null);
  const [overviewDate, setOverviewDate] = useState(todayISO());
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [studentHistoryId, setStudentHistoryId] = useState(null);
  const [studentHistoryData, setStudentHistoryData] = useState(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);
  const [profileStudentId, setProfileStudentId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  // Looked up fresh from globalStudents on every render (by id) rather than storing a separate
  // copy of the student object — a stored copy would freeze at whatever the student looked like
  // the moment the profile was opened and never reflect an edit made afterward, even a
  // successfully saved one, since nothing would ever tell that frozen copy to update.
  const profileStudent = (globalStudents || []).find((s) => s.id === profileStudentId) || null;
  const openStudentProfile = (student) => {
    setProfileStudentId(student.id);
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
  const [showMessagesLookup, setShowMessagesLookup] = useState(false);
  const [showLabelsEditor, setShowLabelsEditor] = useState(false);
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
  const activeTeachers = (teachers || []).filter(isAccountActive);
  const inactiveTeachers = (teachers || []).filter((t) => !isAccountActive(t));
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [defaultParentPassword, setDefaultParentPassword] = useState("Welcome123");
  const [defaultPwSaved, setDefaultPwSaved] = useState(false);
  useEffect(() => { loadJSON("defaultParentPassword", "Welcome123", true).then(setDefaultParentPassword); }, []);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [familyCreatedNote, setFamilyCreatedNote] = useState(null);
  const [showArchivedFamilies, setShowArchivedFamilies] = useState(false);
  const [addingGuardianTo, setAddingGuardianTo] = useState(null); // the family group currently getting a second guardian, or null
  const [viewingFamilyGroupId, setViewingFamilyGroupId] = useState(null);
  const activeFamilies = (families || []).filter(isAccountActive);
  const inactiveFamilies = (families || []).filter((f) => !isAccountActive(f));
  // Grouped for display so two logins for the same household read as one family with two
  // guardians, not two unrelated entries that happen to share children — falls back to each
  // family's own uid for any record that predates familyGroupId existing.
  const activeFamilyGroups = Object.values(
    activeFamilies.reduce((groups, f) => {
      const groupId = f.familyGroupId || f.uid;
      (groups[groupId] = groups[groupId] || []).push(f);
      return groups;
    }, {})
  );
  // Catches the specific data-integrity gap a prior bug could leave behind: two guardians who are
  // genuinely the same household (linked to the exact same child) but ended up with two different
  // familyGroupIds — most commonly from adding a new student with both parents' emails filled in
  // at once, where each parent's account was created independently with no shared group at all.
  // The practical effect was severe: the classroom messaging list groups strictly by
  // familyGroupId, so a split pair like this wouldn't show as one family with two guardians —
  // it'd show as two entirely separate, single-guardian entries, or (worse) one guardian's
  // messages would go to a thread the other guardian's own account could never read. Detected via
  // union-find over shared student links (two groupIds ever linked to the exact same
  // classId+studentId almost certainly belong together, even if the overlap chains through a
  // third record), not just simple pairwise matching, so this still catches it in more tangled
  // cases.
  const possibleFamilyMerges = useMemo(() => {
    const parent = {};
    const find = (x) => { let root = x; while (parent[root] && parent[root] !== root) root = parent[root]; return root; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
    const guardiansByGroupId = {};
    activeFamilies.forEach((f) => {
      const gid = f.familyGroupId || f.uid;
      if (!parent[gid]) parent[gid] = gid;
      (guardiansByGroupId[gid] = guardiansByGroupId[gid] || []).push(f);
    });
    const groupIdsByStudentKey = {};
    activeFamilies.forEach((f) => {
      const gid = f.familyGroupId || f.uid;
      (f.studentLinks || []).forEach((l) => {
        const key = `${l.classId}:${l.studentId}`;
        (groupIdsByStudentKey[key] = groupIdsByStudentKey[key] || []).push(gid);
      });
    });
    Object.values(groupIdsByStudentKey).forEach((gids) => {
      for (let i = 1; i < gids.length; i++) union(gids[0], gids[i]);
    });
    const clusters = {};
    Object.keys(guardiansByGroupId).forEach((gid) => {
      const root = find(gid);
      (clusters[root] = clusters[root] || new Set()).add(gid);
    });
    return Object.values(clusters)
      .filter((gidSet) => gidSet.size > 1)
      .map((gidSet) => ({ groupIds: [...gidSet], guardians: [...gidSet].flatMap((gid) => guardiansByGroupId[gid]) }));
  }, [activeFamilies]);
  const [mergingCluster, setMergingCluster] = useState(null); // index of a merge currently in flight, for a per-row spinner/disabled state
  const mergeFamilyGroups = async (cluster, index) => {
    setMergingCluster(index);
    const canonicalGroupId = cluster.groupIds[0];
    await Promise.all(cluster.guardians.map((g) => onUpdateFamily(g.uid, { familyGroupId: canonicalGroupId })));
    setMergingCluster(null);
  };
  const [allStudentsForLinking, setAllStudentsForLinking] = useState([]);
  useEffect(() => { onFetchAllStudentsForLinking().then(setAllStudentsForLinking); }, [registry]); // eslint-disable-line

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

  useEffect(() => { onRefresh(); onRefreshStudents(); onRefreshEvents(); onRefreshTools(); onRefreshTeachers(); onRefreshFamilies(); onRefreshPrograms(); }, []); // eslint-disable-line

  const submitCreate = async () => {
    if (!newName.trim() || !newPw.trim()) return;
    await onCreate(newName.trim(), newPw.trim(), newClassType);
    setNewName(""); setNewPw(""); setNewClassType("elementary"); setShowCreate(false);
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

  if (showAdminMessages) {
    return <AdminMessagesView families={families} loggedInTeacher={currentTeacher} navigate={() => setShowAdminMessages(false)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <GlobalAppStyles />
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="display-font text-2xl font-bold text-stone-900">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {canSwitchToParent && <button onClick={onSwitchToParent} className="text-xs font-semibold text-stone-400 hover:text-teal-700">Switch to Parent view</button>}
            {currentTeacher && <button onClick={() => setShowMyAccount(true)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">My Account</button>}
            <button onClick={onLogout} className="text-xs font-semibold text-stone-400 hover:text-red-500">Log out</button>
          </div>
        </div>
        <p className="text-stone-500 text-sm mb-5">Every class in the school. Tap one to open it with full access.</p>

        <AdminMainTabs active={adminTab} navigate={setAdminTab} />

        {adminTab === "overview" && (
        <>
        <OfficeContactSettings />

        <button onClick={() => setShowAdminMessages(true)} className="w-full mb-6 flex items-center justify-center gap-2 bg-teal-700 text-white rounded-xl py-3 text-sm font-bold hover:bg-teal-800">
          <MessageCircle size={16} /> School Office Messages
        </button>

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
        </>
        )}

        {adminTab === "classes" && (
        <>
        {activeClasses.length === 0 && <p className="text-stone-400 text-sm text-center py-10 bg-white rounded-xl border border-stone-200">No classes yet.</p>}
        <ul className="space-y-2 mb-6">
          {activeClasses.map((cls) => (
            <li key={cls.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <button onClick={() => onEnterClass(cls)} className="flex-1 text-left text-sm font-semibold text-stone-800 hover:text-teal-700 flex items-center justify-between gap-2 min-w-0">
                <span className="truncate">{cls.name}</span>
                <ArrowRight size={14} className="text-stone-300 shrink-0" />
              </button>
              <ArchiveOrDeleteMenu onArchive={() => onArchiveClassById(cls.id)} onDeletePermanently={() => onDeleteClass(cls.id)} size={14} />
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
            <label className="block text-xs font-medium text-stone-500 mb-1">Class type</label>
            <div className="flex gap-1.5 mb-3">
              {[["elementary", "Elementary"], ["preschool", "Preschool"]].map(([val, label]) => (
                <button key={val} onClick={() => setNewClassType(val)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${newClassType === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
                  {label}
                </button>
              ))}
            </div>
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
          <p className="text-sm font-semibold text-stone-800 mb-1">QR check-in code</p>
          <p className="text-xs text-stone-400 mb-3">One shared code for the whole school — the same code works for every family, every day. Print it and post it wherever families actually walk in.</p>
          <SchoolwideQRCode />
        </div>
        </>
        )}

        {adminTab === "more" && (
        <>
        <ParentSetupEmailSettings />
        <div className="pt-1 mb-6">
          <p className="text-sm font-semibold text-stone-800 mb-1">Look up a conversation</p>
          <p className="text-xs text-stone-400 mb-3">Not a feed to watch — this is here for when you need to check something specific: browse any class's messages, or view (read-only) a teacher's direct messages with a family.</p>
          {!showMessagesLookup ? (
            <button onClick={() => setShowMessagesLookup(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Look up messages
            </button>
          ) : (
            <AdminMessagesMonitor activeClasses={activeClasses} teachers={teachers} currentTeacher={currentTeacher} families={families} />
          )}
        </div>
        <div className="pt-1 mb-6">
          <p className="text-sm font-semibold text-stone-800 mb-1">Label who parents see, per class</p>
          <p className="text-xs text-stone-400 mb-3">Pick a class, see everyone its parents can currently message individually, and give each of them a role label — "Judaic Studies Teacher," "General Studies Teacher," whatever fits. The same person can have a different label in a different class, since edited here per class, not attached to their account.</p>
          {!showLabelsEditor ? (
            <button onClick={() => setShowLabelsEditor(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Edit labels
            </button>
          ) : (
            <ClassMessagingLabelsEditor activeClasses={activeClasses} teachers={teachers} />
          )}
        </div>
        <div className="pt-1 mb-6">
          <p className="text-sm font-semibold text-stone-800 mb-1">Clear test broadcast messages</p>
          <p className="text-xs text-stone-400 mb-3">Deletes every guardian's thread with the School Office — meant for clearing out messages sent while testing, before real families start using this. This does not touch classroom threads or individual teacher threads, and it's permanent: cleared threads can't be recovered. Every guardian's thread with the office is already completely private and separate — from every other family's, and from any other guardian in their own household — so this is only about removing test content specifically, not something needed for privacy.</p>
          <ClearAdminMessagesTool />
        </div>
        <div className="pt-1">
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
        </>
        )}

        {adminTab === "students" && (
        <>
        <div className="pt-1">
          <p className="text-sm font-semibold text-stone-800 mb-1">School-wide students</p>
          <p className="text-xs text-stone-400 mb-3">Create students once here — teachers will be able to pull existing students into their own class instead of re-creating them. (Assigning students to classes is coming next; for now, this is where the shared list itself lives.)</p>

          <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search students..."
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />

          <DuplicateEnrollmentChecker onCheck={onFindDuplicateEnrollments} />
          <DuplicateDailyLogChecker onCheck={onFindDuplicateDailyLogs} onRemove={onRemoveDailyLogDuplicate} />
          <StudentDataIntegrityChecker onCheck={onCheckStudentDataIntegrity} />

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
        </>
        )}

        {adminTab === "more" && (
        <>
        <div className="pt-1">
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
        </>
        )}

        {adminTab === "teachers" && (
        <>
        <div className="pt-1">
          <p className="text-sm font-semibold text-stone-800 mb-1">Teacher accounts</p>
          <p className="text-xs text-stone-400 mb-3">Each teacher signs in with their own email and password, and only sees the classes assigned to them here.</p>

          <TeacherAccountChecker onCheck={onCheckTeacherAccount} />

          {!showTeacherForm && (
            <button onClick={() => setShowTeacherForm(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Create teacher account
            </button>
          )}

          {teacherCreatedNote && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">{teacherCreatedNote}</p>
          )}
          {showTeacherForm && (
            <TeacherAccountForm classes={activeClasses}
              onSave={async (name, email, tempPassword, role, classIds, isSubstitute, messagingClassTypes) => {
                const result = await onCreateTeacher(name, email, tempPassword, role, classIds, isSubstitute, messagingClassTypes);
                if (result.ok) {
                  setShowTeacherForm(false);
                  setTeacherCreatedNote(result.linkedExisting
                    ? `${name} was linked to ${email}'s existing parent login — they'll sign in the same way as always, and can now switch between Teacher and Parent views.`
                    : `${name}'s teacher account was created.`);
                  setTimeout(() => setTeacherCreatedNote(null), 20000);
                }
                return result;
              }} onCancel={() => setShowTeacherForm(false)} />
          )}

          {activeTeachers.length === 0 && !showTeacherForm && <p className="text-xs text-stone-400">No teacher accounts yet.</p>}
          <ul className="space-y-2">
            {activeTeachers.map((t) => {
              const classNames = (t.assignedClassIds || []).map((cid) => activeClasses.find((c) => c.id === cid)?.name).filter(Boolean);
              const isEditing = editingTeacherUid === t.uid;
              // Same uid on both a teacher and a family record IS what "linked" means here — one
              // Firebase Auth login, two roles. Looked up directly against the two lists admin
              // already has in memory rather than trusting any one-time "was this linked at
              // creation" message, since that message is long gone on every visit after the one
              // where the account was actually created.
              const linkedFamily = (families || []).find((f) => f.uid === t.uid && isAccountActive(f));
              return (
                <li key={t.uid} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{t.name}</span>
                      <span className="text-xs text-stone-400 ml-2">{t.role === "admin" ? "Admin" : "Teacher"}{t.isSubstitute ? " · Substitute" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => setEditingTeacherUid(isEditing ? null : t.uid)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                        {isEditing ? "Cancel" : "Edit classes"}
                      </button>
                      <ArchiveOrDeleteMenu onArchive={() => onDeactivateTeacher(t.uid)} onDeletePermanently={() => onDeleteTeacher(t.uid)} size={14} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{t.email}{classNames.length > 0 ? ` · ${classNames.join(", ")}` : " · No classes assigned yet"}</p>
                  {linkedFamily && (
                    <p className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-1 mt-1.5 inline-block">
                      ↔ Same login also signs in as a parent — {linkedFamily.name}
                    </p>
                  )}

                  {isEditing && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <p className="text-[10px] text-stone-400 mb-1.5">Tap to assign or unassign — changes save immediately.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeClasses.length === 0 && <p className="text-xs text-stone-400">No classes yet.</p>}
                        {activeClasses.map((c) => {
                          const assigned = (t.assignedClassIds || []).includes(c.id);
                          return (
                            <button key={c.id} onClick={() => onToggleTeacherClass(t.uid, c.id)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${assigned ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                      {[...new Set(activeClasses.map((c) => c.classType || "elementary"))].length > 0 && (
                        <>
                          <p className="text-[10px] text-stone-400 mb-1.5 mt-2.5">Reachable by every parent in these grade levels, regardless of specific class:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...new Set(activeClasses.map((c) => c.classType || "elementary"))].map((ct) => {
                              const enabled = (t.messagingClassTypes || []).includes(ct);
                              return (
                                <button key={ct}
                                  onClick={() => {
                                    const next = enabled ? (t.messagingClassTypes || []).filter((x) => x !== ct) : [...(t.messagingClassTypes || []), ct];
                                    onUpdateTeacher(t.uid, { messagingClassTypes: next });
                                  }}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${enabled ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                                  {ct}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      <div className="mt-2.5 pt-2.5 border-t border-stone-100">
                        <TeacherPasswordResetForm uid={t.uid} onReset={onResetTeacherPassword} />
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
        </>
        )}

        {adminTab === "families" && (
        <>
        <div className="pt-1">
          <p className="text-sm font-semibold text-stone-800 mb-1">Family accounts</p>
          <p className="text-xs text-stone-400 mb-3">A separate portal, not the class app — a family signs in on their own link and only ever sees their own linked child(ren).</p>

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 mb-3">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Default password for auto-created parent accounts</label>
            <div className="flex gap-2 items-center">
              <input value={defaultParentPassword} onChange={(e) => setDefaultParentPassword(e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <button onClick={async () => {
                await saveJSON("defaultParentPassword", defaultParentPassword || "Welcome123", true);
                setDefaultPwSaved(true);
                setTimeout(() => setDefaultPwSaved(false), 2000);
              }} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800">Save</button>
              {defaultPwSaved && <span className="text-xs text-emerald-700">Saved</span>}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Used whenever a parent account is created automatically from a student's parent email — parents can change it once they sign in.</p>
          </div>

          {!showFamilyForm && (
            <button onClick={() => setShowFamilyForm(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3">
              <Plus size={12} /> Create family account
            </button>
          )}
          {familyCreatedNote && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-2">{familyCreatedNote.message}</p>
              {!familyCreatedNote.linkedExisting && (
                <div className="space-y-2">
                  {familyCreatedNote.guardians.map((g, i) => (
                    <div key={i}>
                      {familyCreatedNote.guardians.length > 1 && <p className="text-[10px] font-semibold text-stone-400 mb-1">{g.name}'s setup email:</p>}
                      <SendParentSetupEmailButton parentName={g.name} studentName={familyCreatedNote.studentName}
                        email={g.email} tempPassword={g.tempPassword} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showFamilyForm && (
            <FamilyAccountForm allStudents={allStudentsForLinking} activeClasses={activeClasses} onCreateStudentInClass={onCreateStudentInClass}
              onSave={async (name, email, tempPassword, studentLinks, secondGuardian) => {
                const result = await onCreateFamily(name, email, tempPassword, studentLinks);
                if (!result.ok) return result;
                const guardians = [{ name, email, tempPassword }];
                let secondGuardianError = null;
                // The second guardian is a genuinely separate account, chained to the first via
                // the uid createFamilyAccount just returned — same kids, same conversations,
                // without asking the admin to pick the students a second time.
                if (secondGuardian) {
                  const secondResult = await onCreateFamily(secondGuardian.name, secondGuardian.email, secondGuardian.tempPassword, studentLinks, result.uid);
                  if (secondResult.ok) guardians.push(secondGuardian);
                  else secondGuardianError = secondResult.error;
                }
                setShowFamilyForm(false);
                setFamilyCreatedNote({
                  message: result.linkedExisting
                    ? `${name} was linked to ${email}'s existing teacher login — they'll sign in the same way as always, and can now switch between Teacher and Parent views.`
                    : secondGuardianError
                    ? `${name}'s family account was created, but the second parent couldn't be added: ${secondGuardianError}`
                    : `${name}'s family account was created${guardians.length > 1 ? ", with both parents linked" : ""}.`,
                  guardians, linkedExisting: result.linkedExisting,
                  studentName: (studentLinks || []).map((l) => l.studentName).join(" & "),
                });
                setTimeout(() => setFamilyCreatedNote(null), 20000);
                return result;
              }} onCancel={() => setShowFamilyForm(false)} />
          )}

          {possibleFamilyMerges.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                {possibleFamilyMerges.length === 1 ? "Found a family that may be split into two accounts" : `Found ${possibleFamilyMerges.length} families that may be split into separate accounts`}
              </p>
              <p className="text-[11px] text-amber-700 mb-2">These guardians are linked to the exact same child but ended up as separate, unconnected accounts — most likely from adding a student with both parents' emails at once. Merging makes them one joint family: both guardians see the classroom thread together, and each still keeps their own separate login and their own private messages with any teacher.</p>
              <div className="space-y-2">
                {possibleFamilyMerges.map((cluster, i) => (
                  <div key={i} className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-stone-700">{cluster.guardians.map((g) => g.name).join(" & ")}</p>
                    <button onClick={() => mergeFamilyGroups(cluster, i)} disabled={mergingCluster === i}
                      className="text-xs font-semibold text-white bg-amber-700 rounded-lg px-3 py-1.5 hover:bg-amber-800 disabled:opacity-50 shrink-0">
                      {mergingCluster === i ? "Merging…" : "Merge into one family"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeFamilies.length === 0 && !showFamilyForm && <p className="text-xs text-stone-400">No family accounts yet.</p>}
          <ul className="space-y-2">
            {activeFamilyGroups.map((group) => {
              const [primary, ...others] = group;
              return (
                <li key={primary.uid} className="bg-white border border-stone-200 rounded-lg p-2.5">
                  {group.map((f) => {
                    // Mirrors the same check on the Teachers list, in the opposite direction —
                    // this guardian's own uid matching a teacher record's uid IS the link, looked
                    // up fresh each time rather than relying on a one-time creation message.
                    const linkedTeacher = (teachers || []).find((t) => t.uid === f.uid && isAccountActive(t));
                    return (
                    <div key={f.uid} className={f !== primary ? "mt-2 pt-2 border-t border-stone-100" : ""}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-stone-800">{f.name}</span>
                        <ArchiveOrDeleteMenu onArchive={() => onDeactivateFamily(f.uid)} onDeletePermanently={() => onDeleteFamily(f.uid)} size={14} />
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{f.email}</p>
                      {linkedTeacher && (
                        <p className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-1 mt-1 inline-block">
                          ↔ Same login also signs in as {linkedTeacher.role === "admin" ? "an admin" : "a teacher"} — {linkedTeacher.name}
                        </p>
                      )}
                    </div>
                    );
                  })}
                  <p className="text-xs text-stone-400 mt-1.5">
                    {(primary.studentLinks || []).length === 0 ? "No children linked" : (primary.studentLinks || []).map((l) => l.studentName).join(", ")}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button onClick={() => setViewingFamilyGroupId(primary.familyGroupId || primary.uid)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                      Manage family
                    </button>
                    <button onClick={() => setAddingGuardianTo(primary)} className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                      + Add another guardian
                    </button>
                  </div>
                  {addingGuardianTo?.uid === primary.uid && (
                    <AddGuardianForm existingFamily={primary}
                      onSave={async (name, email, tempPassword) => {
                        const result = await onAddGuardianToFamily(primary, name, email, tempPassword);
                        if (result.ok) {
                          setAddingGuardianTo(null);
                          setFamilyCreatedNote(result.linkedExisting
                            ? `${name} was linked to ${email}'s existing teacher login, and can now also see ${primary.name}'s children.`
                            : `${name} added as a second guardian for ${primary.name}'s family.`);
                          setTimeout(() => setFamilyCreatedNote(""), 8000);
                        }
                        return result;
                      }} onCancel={() => setAddingGuardianTo(null)} />
                  )}
                </li>
              );
            })}
          </ul>

          {inactiveFamilies.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowArchivedFamilies((v) => !v)} className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2">
                {showArchivedFamilies ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showArchivedFamilies ? "Hide" : "Show"} archived families ({inactiveFamilies.length})
              </button>
              {showArchivedFamilies && (
                <ul className="space-y-2">
                  {inactiveFamilies.map((f) => (
                    <li key={f.uid} className="flex items-center justify-between bg-stone-100 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-stone-500">{f.name} — {f.email}</span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => onUpdateFamily(f.uid, { active: true })} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Restore</button>
                        <ConfirmDelete onConfirm={() => onDeleteFamily(f.uid)} size={13} label="Delete forever" confirmText="Really delete forever?" className="text-xs text-stone-400 hover:text-red-500" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {adminTab === "more" && (
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
        )}
      </div>

      {profileStudent && (
        <AdminStudentProfile student={profileStudent} profileData={profileData}
          onUpdateStudent={onUpdateStudent}
          onArchiveStudent={(id) => { onArchiveStudent(id); setProfileStudentId(null); }}
          onDeleteStudent={(id) => { onDeleteStudent(id); setProfileStudentId(null); }}
          onClose={() => setProfileStudentId(null)} />
      )}

      {viewingFamilyGroupId && (() => {
        const group = activeFamilyGroups.find((g) => (g[0].familyGroupId || g[0].uid) === viewingFamilyGroupId);
        if (!group) return null; // the family was just deleted/archived out from under this view — nothing left to show
        return (
          <AdminFamilyDetailView group={group} allStudentsForLinking={allStudentsForLinking} globalStudents={globalStudents}
            onUpdateFamily={onUpdateFamily} onBack={() => setViewingFamilyGroupId(null)} />
        );
      })()}

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

export function AdminMessagesView({ families, loggedInTeacher, navigate }) {
  const [threads, setThreads] = useState({});
  const [openGroup, setOpenGroup] = useState(null);
  const [mode, setMode] = useState("inbox"); // "inbox" | "broadcast"
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSentTo, setBroadcastSentTo] = useState(null);

  // Same optional-assist pattern as the classroom broadcast tool — the message box above is
  // always directly typable, AI is a shortcut for turning a rough note into fuller wording, never
  // a gate in front of sending.
  const [showGenerate, setShowGenerate] = useState(false);
  const [roughNote, setRoughNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);

  const generate = async () => {
    if (!roughNote.trim() || generating) return;
    setGenerating(true);
    setGenError(false);
    try {
      // No single class's config applies to a school-wide broadcast, so this runs with an empty
      // one — every place that reads config is already null-safe for exactly this reason.
      const text = await generateClassAnnouncementMessage(roughNote.trim(), {}, loggedInTeacher);
      setBroadcastText(text || "");
      setShowGenerate(false);
      setRoughNote("");
    } catch {
      setGenError(true);
    }
    setGenerating(false);
  };

  const [attachFile, setAttachFile] = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [attachType, setAttachType] = useState(null); // "photo" | "video" | "file"
  const [attachError, setAttachError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const pickAttachment = async (file) => {
    if (!file) return;
    setAttachError(null);
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (isVideo) {
      try { await validateVideoDuration(file); }
      catch (err) { setAttachError(err.message); return; }
    }
    if (!isImage && file.size > MAX_FILE_ATTACHMENT_BYTES) {
      setAttachError("File is too large — the limit is 20MB.");
      return;
    }
    setAttachFile(file);
    setAttachType(isVideo ? "video" : isImage ? "photo" : isAudio ? "audio" : "file");
    setAttachPreview(isImage || isVideo ? URL.createObjectURL(file) : null);
  };
  const clearAttachment = () => { setAttachFile(null); setAttachPreview(null); setAttachType(null); setAttachError(null); };

  // One row per GUARDIAN, not per family — the office thread is now a private line per guardian
  // too, the same reasoning as classroom and individual-teacher messages: two guardians of the
  // same household get two separate conversations with the office, neither seeing what the other
  // sent or received.
  const groups = useMemo(() => {
    const byGuardian = {};
    (families || []).forEach((f) => {
      if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f] };
    });
    return Object.values(byGuardian);
  }, [families]);

  // Same reasoning and pattern as the teacher-side classroom messages history work — pushes a
  // real entry so both the hardware back button and the in-app Back button (which now goes
  // through history.back() rather than clearing state directly) step back to the conversation
  // list instead of skipping past it.
  const navigateToGroup = (group) => {
    setOpenGroup(group);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", group.groupId);
    window.history.pushState({ thread: group.groupId }, "", url);
  };
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const threadId = params.get("thread");
      if (!threadId) { setOpenGroup(null); return; }
      const match = groups.find((g) => g.groupId === threadId);
      if (match) setOpenGroup(match);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [groups]);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(groups.map(async (g) => [g.groupId, await loadJSON(`admin-messages:${g.groupId}`, { messages: [] }, true)]));
    setThreads(Object.fromEntries(entries));
  }, [groups]);

  useEffect(() => { refresh(); }, [refresh]);

  const sendToFamily = async (groupId, text, attachments) => {
    const key = `admin-messages:${groupId}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "admin", senderName: "School Office", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    sendPushNotification([groupId], "Message from the School Office", text?.trim() || describeAttachmentsForNotification(attachments), "/?portal=parent&open=admin");
    return next;
  };

  // One message, pushed into every GUARDIAN's own thread with the office at once — per guardian
  // now, not per family, so two guardians of the same household each get their own private copy
  // and can't see whether the other one read or replied to it.
  const sendBroadcast = async () => {
    if (!broadcastText.trim() && !attachFile) return;
    setBroadcasting(true);
    setAttachError(null);
    try {
      let attachmentUrl = null;
      if (attachFile) {
        setUploadProgress(0);
        if (attachType === "video") {
          attachmentUrl = await uploadOneVideo(attachFile, `message-attachments/broadcast-admin/${uid()}.${(attachFile.name || "").split(".").pop() || "mp4"}`, setUploadProgress);
        } else if (attachType === "photo") {
          attachmentUrl = await uploadOneImage(attachFile, `message-attachments/broadcast-admin/${uid()}.jpg`, setUploadProgress);
        } else {
          attachmentUrl = await uploadOneFile(attachFile, `message-attachments/broadcast-admin/${uid()}.${(attachFile.name || "").split(".").pop() || "bin"}`, setUploadProgress);
        }
      }
      for (const g of groups) {
        await sendToFamily(g.groupId, broadcastText.trim(), attachmentUrl ? [{ url: attachmentUrl, type: attachType, name: attachType === "file" || attachType === "audio" ? attachFile.name : null }] : []); // eslint-disable-line no-await-in-loop
      }
      await refresh();
      setBroadcastSentTo(groups.length);
    } catch (err) {
      setAttachError(describeUploadError(err));
    }
    setUploadProgress(null);
    setBroadcasting(false);
  };

  const withThreads = groups.filter((g) => (threads[g.groupId]?.messages || []).length > 0);
  const withoutThreads = groups.filter((g) => !(threads[g.groupId]?.messages || []).length);

  if (openGroup) {
    const thread = threads[openGroup.groupId] || { messages: [] };
    const guardianNames = openGroup.guardians.map((g) => g.name).join(" & ");
    const storageKey = `admin-messages:${openGroup.groupId}`;
    return (
      <>
        <GlobalAppStyles />
        <ConversationThreadView title={guardianNames} myRole="admin" messages={thread.messages} threadKey={`admin-${openGroup.groupId}`}
          onBack={() => { window.history.back(); refresh(); }}
          onSend={async (text, attachments) => { await sendToFamily(openGroup.groupId, text, attachments); await refresh(); }}
          onEdit={async (messageId, newText) => { await editMessageInThread(storageKey, messageId, newText); await refresh(); }}
          onDelete={async (messageId) => { await deleteMessageInThread(storageKey, messageId); await refresh(); }} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <GlobalAppStyles />
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(null)} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
        <h1 className="display-font text-xl font-bold text-stone-900 mb-4">School Office Messages</h1>

        <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 md:w-96">
          <button onClick={() => setMode("inbox")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${mode === "inbox" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
            <Mail size={14} /> Messages
          </button>
          <button onClick={() => setMode("broadcast")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${mode === "broadcast" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
            <Plus size={14} /> Broadcast to all families
          </button>
        </div>

        {mode === "broadcast" ? (
          <div>
            <p className="text-xs text-stone-400 mb-3">Sent to every guardian in the school as their own message in their own School Office thread — once per guardian, not once per family or per student, so two parents in the same household each get their own private copy.</p>

            <div className="flex items-start gap-1.5 mb-1.5">
              <textarea value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} rows={5} placeholder="Type your message, or use the sparkle button to draft one from a quick note"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <button onClick={() => setShowGenerate((v) => !v)} title="Draft with AI"
                className={`shrink-0 rounded-lg p-2 border ${showGenerate ? "bg-teal-50 border-teal-300 text-teal-700" : "border-stone-300 text-stone-400 hover:text-teal-700 hover:border-teal-300"}`}>
                <Sparkles size={16} />
              </button>
            </div>

            {showGenerate && (
              <div className="border border-teal-200 bg-teal-50/50 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <input value={roughNote} onChange={(e) => setRoughNote(e.target.value)} placeholder="What's this about? I'll turn it into a full message."
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); generate(); } }}
                    className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" autoFocus />
                  <button onClick={generate} disabled={!roughNote.trim() || generating}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white bg-teal-700 rounded-lg px-2.5 py-1.5 hover:bg-teal-800 disabled:opacity-40 shrink-0">
                    {generating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} {generating ? "…" : "Generate"}
                  </button>
                </div>
                {genError && <p className="text-[11px] text-rose-600 mt-1">Couldn't generate right now — try again, or just type the message yourself.</p>}
              </div>
            )}

            {attachPreview && (
              <div className="relative inline-block mb-3">
                {attachType === "video" ? (
                  <video src={attachPreview} className="h-24 rounded-lg" />
                ) : (
                  <img src={attachPreview} alt="" className="h-24 rounded-lg" />
                )}
                <button onClick={clearAttachment} className="absolute -top-1.5 -right-1.5 bg-black/60 text-white rounded-full p-1"><X size={12} /></button>
              </div>
            )}
            {attachType === "file" && attachFile && (
              <div className="relative inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white">
                <FileText size={15} className="text-stone-500" />
                <span className="text-xs font-semibold text-stone-700 max-w-[12rem] truncate">{attachFile.name}</span>
                <button onClick={clearAttachment} className="text-stone-400 hover:text-stone-600 shrink-0"><X size={13} /></button>
              </div>
            )}
            {attachType === "audio" && attachFile && (
              <div className="relative inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white">
                <Music size={15} className="text-stone-500" />
                <span className="text-xs font-semibold text-stone-700 max-w-[12rem] truncate">{attachFile.name}</span>
                <button onClick={clearAttachment} className="text-stone-400 hover:text-stone-600 shrink-0"><X size={13} /></button>
              </div>
            )}
            <div className="mb-4">
              <AttachmentMenuButton onPickFile={pickAttachment} />
            </div>
            {attachError && <p className="text-xs text-rose-600 mb-3">{attachError}</p>}

            <div>
              <button onClick={sendBroadcast} disabled={(!broadcastText.trim() && !attachFile) || broadcasting || broadcastSentTo !== null}
                className={`flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2.5 ${broadcastSentTo !== null ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40"}`}>
                {broadcasting ? <Loader2 className="animate-spin" size={15} /> : broadcastSentTo !== null ? <Check size={15} /> : <MessageCircle size={15} />}
                {broadcasting ? (uploadProgress !== null ? `Uploading… ${uploadProgress}%` : "Sending…") : broadcastSentTo !== null ? `Sent to ${broadcastSentTo} guardian${broadcastSentTo === 1 ? "" : "s"}` : "Send to every family"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {withThreads.length > 0 && (
              <div className="space-y-2 mb-5">
                {withThreads.map((g) => {
                  const thread = threads[g.groupId];
                  const last = thread.messages[thread.messages.length - 1];
                  const guardianNames = g.guardians.map((gu) => gu.name).join(" & ");
                  return (
                    <button key={g.groupId} onClick={() => navigateToGroup(g)} className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:border-teal-300">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-stone-900">{guardianNames}</p>
                        <p className="text-[10px] text-stone-400 shrink-0">{new Date(last.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                      </div>
                      <p className="text-xs text-stone-500 truncate">{last.senderType === "admin" ? "You: " : ""}{last.text}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {withoutThreads.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Start a conversation</p>
                <div className="space-y-2">
                  {withoutThreads.map((g) => (
                    <button key={g.groupId} onClick={() => navigateToGroup(g)} className="w-full text-left bg-white border border-stone-200 rounded-xl p-3 text-sm font-semibold text-stone-700 hover:border-teal-300">
                      {g.guardians.map((gu) => gu.name).join(" & ")}
                    </button>
                  ))}
                </div>
              </>
            )}

            {groups.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No family accounts yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}

export function AdminFamilyDetailView({ group, allStudentsForLinking, globalStudents, onUpdateFamily, onBack }) {
  const [primary] = group;
  const [nameInput, setNameInput] = useState(primary.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [search, setSearch] = useState("");
  const [emailSentFor, setEmailSentFor] = useState(null);

  const saveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === primary.name) return;
    await Promise.all(group.map((f) => onUpdateFamily(f.uid, { name: nameInput.trim() })));
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const removeStudent = async (link) => {
    const nextLinks = (primary.studentLinks || []).filter((l) => !(l.classId === link.classId && l.studentId === link.studentId));
    // Every guardian in this family has their own, completely separate family:{uid} record (a
    // real second login, not a shared account) — updating only primary's here is exactly the bug
    // that left a second guardian's own app showing none of a child just added (or still showing
    // one just removed): admin's own view reads primary's record, which WAS correct, while the
    // actual parent signed in as the other guardian never got the update at all.
    await Promise.all(group.map((f) => onUpdateFamily(f.uid, { studentLinks: nextLinks })));
  };

  const addStudent = async (student) => {
    const already = (primary.studentLinks || []).some((l) => l.classId === student.classId && l.studentId === student.studentId);
    if (already) return;
    const nextLinks = [...(primary.studentLinks || []), student];
    await Promise.all(group.map((f) => onUpdateFamily(f.uid, { studentLinks: nextLinks })));
    setShowAddStudent(false);
    setSearch("");
  };

  // Same content every family gets when first created, reachable here too — a family added a
  // student to later, or one that never got the original email, shouldn't need a workaround to
  // get the exact same login info any other family already received.
  const sendWelcomeEmail = async (guardian) => {
    const links = primary.studentLinks || [];
    const uniqueChildren = [...new Map(links.map((l) => [l.studentId, l])).values()];
    if (uniqueChildren.length === 0) return;
    const childNames = uniqueChildren.map((l) => l.studentName);
    const studentTypes = uniqueChildren.map((l) => globalStudents.find((gs) => gs.id === l.studentId)?.studentType || "elementary");
    const defaultPassword = await loadJSON("defaultParentPassword", "Welcome123", true);
    const { subject, body } = buildParentLoginEmail(guardian.name, childNames, studentTypes, guardian.email, defaultPassword);
    // Same fix as StudentContactFields' own emailParent — window.location.href, not a synthetic
    // click on a detached <a>, which is measurably less reliable for handing a mailto: link off
    // to the OS's registered mail app.
    window.location.href = `mailto:${encodeURIComponent(guardian.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailSentFor(guardian.uid);
    setTimeout(() => setEmailSentFor(null), 3000);
  };

  const alreadyLinkedKeys = new Set((primary.studentLinks || []).map((l) => `${l.classId}:${l.studentId}`));
  const filtered = (search.trim() ? allStudentsForLinking.filter((s) => s.studentName.toLowerCase().includes(search.toLowerCase())) : allStudentsForLinking)
    .filter((s) => !alreadyLinkedKeys.has(`${s.classId}:${s.studentId}`));

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-4"><ChevronLeft size={16} /> Back to families</button>

        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
          <label className="block text-xs font-semibold text-stone-700 mb-1">Name on this account (this parent's own name — shown when they message a teacher)</label>
          <div className="flex gap-2">
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <button onClick={saveName} className="text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-2 hover:bg-teal-800 shrink-0">Save</button>
          </div>
          {nameSaved && <p className="text-xs text-emerald-700 mt-1">Saved</p>}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-stone-700 mb-2">Guardians</p>
          <div className="space-y-3">
            {group.map((g) => (
              <div key={g.uid} className="flex items-center justify-between gap-2 border-b border-stone-100 last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{g.name}</p>
                  <p className="text-xs text-stone-400 truncate">{g.email}</p>
                </div>
                <button onClick={() => sendWelcomeEmail(g)} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 hover:bg-teal-50 shrink-0">
                  {emailSentFor === g.uid ? "Opened ✓" : "Send login info"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-stone-700 mb-2">Children linked to this family</p>
          {(primary.studentLinks || []).length === 0 && <p className="text-xs text-stone-400 mb-3">No children linked yet.</p>}
          <div className="space-y-1.5 mb-3">
            {(primary.studentLinks || []).map((l) => (
              <div key={`${l.classId}-${l.studentId}`} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{l.studentName}</p>
                  <p className="text-[11px] text-stone-400 truncate">{l.className}</p>
                </div>
                <ConfirmDelete onConfirm={() => removeStudent(l)} size={13} label="Remove" />
              </div>
            ))}
          </div>
          {!showAddStudent ? (
            <button onClick={() => setShowAddStudent(true)} className="text-xs font-semibold text-teal-700 flex items-center gap-1">
              <Plus size={12} /> Add a student to this family
            </button>
          ) : (
            <div className="border border-stone-200 rounded-lg p-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" autoFocus
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 && <p className="text-xs text-stone-400 px-1">No matching students.</p>}
                {filtered.map((s) => (
                  <button key={`${s.classId}-${s.studentId}`} onClick={() => addStudent(s)} className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-stone-100">
                    <span className="font-semibold text-stone-800">{s.studentName}</span> <span className="text-stone-400">— {s.className}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowAddStudent(false); setSearch(""); }} className="text-xs text-stone-500 mt-2">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminStudentProfile({ student, profileData, onUpdateStudent, onArchiveStudent, onDeleteStudent, onClose }) {
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


// Mailto links only work if the browser has a registered default mail handler — this varies a
// lot machine to machine (a phone's own Mail app almost always has one; a laptop's browser
// often doesn't unless one's been explicitly set, which is exactly why the same click can open
// a real draft on one device and just a blank browser tab on another). "Copy message" is the
// fallback that works everywhere regardless of that setup — paste into whatever's actually open.
// Loads the admin's saved template, fills in this specific family's real information, and hands
// it to the same Gmail-link-plus-copy-fallback component every other email action in the app
// already uses — rather than a separate, one-off "send an email" mechanism just for this.
export function SendParentSetupEmailButton({ parentName, studentName, email, tempPassword }) {
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    loadJSON("schoolSettings", {}, true).then((s) => setTemplate(s?.parentSetupEmailTemplate || DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE));
  }, []);

  if (!template) return null;

  const body = renderParentSetupEmail(template, {
    parentName, studentName, email, tempPassword,
    schoolName: "SJA", loginLink: `${window.location.origin}/?portal=parent`,
  });

  return <MailActionButtons email={email} subject="Setting up your Parent Portal account" body={body} size="small" />;
}

// The one shared code for the whole school — bigger than a per-student code would need to be,
// since this is meant to be printed and posted somewhere families walk past, not viewed on a
// phone screen up close.
export function SchoolwideQRCode() {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(SCHOOLWIDE_CHECKIN_CODE, { width: 320, margin: 2 })
      .then((url) => { if (!cancelled) setDataUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "school-checkin-code.png";
    a.click();
  };

  // Opens a separate, minimal window with just the code blown up large, then prints only that —
  // printing the admin page directly would print the whole dashboard around it, not a clean sign.
  const print = () => {
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(`
      <html><head><title>Check-in code</title></head>
      <body style="margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
        <img src="${dataUrl}" style="width:70vw; max-width:500px;" />
        <p style="font-size:24px; font-weight:bold; margin-top:24px;">Scan to check in or out</p>
      </body></html>
    `);
    win.document.close();
    win.onload = () => win.print();
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col items-center text-center max-w-xs">
      {dataUrl ? (
        <img src={dataUrl} alt="School-wide QR check-in code" className="w-56 h-56" />
      ) : (
        <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-400">Generating…</div>
      )}
      <p className="text-sm font-semibold text-stone-800 mt-3">Check-in code</p>
      <p className="text-xs text-stone-400 mt-1">Print this and post it wherever families come in — the same code works for every family, every day.</p>
      <div className="flex gap-2 mt-3">
        <button onClick={print} disabled={!dataUrl} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-50 disabled:opacity-40">Print large</button>
        <button onClick={download} disabled={!dataUrl} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-1.5 hover:bg-teal-50 disabled:opacity-40">Download image</button>
      </div>
    </div>
  );
}
