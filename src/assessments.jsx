// src/assessments.jsx
// The assessments and student-detail domain — the assessments list, grid, and forms; a single
// student's own detail view with their contact info and full assessment history. These two
// sections were found to be genuinely coupled with each other (buildUnifiedAssessmentRows and
// AssessmentRowsList are shared between them) but not with anything else, so they move together
// as one cohesive file. Rendered directly from ClassApp, the same pattern App.jsx already uses
// for AdminDashboard and ParentPortalApp. Nothing here was rewritten — every line is exactly what
// it already was in App.jsx, just relocated and exported.

import { useState } from "react";
import {
  ChevronLeft, Plus, Mic, ArrowRight, Loader2, Trash2, BookOpen, ClipboardList, Mail, Calendar,
  ChevronRight, Flag, Printer, Upload,
} from "lucide-react";
import {
  PAGE, emptyStudentData, formatTime12h, getAllPeriodsEverywhere, getFlags, getResultGrade,
  getResultNote, skillKey, todayISO, uid, useVisualViewportHeight,
} from "./core.jsx";
import { Header, MainTabs, Section, StudentContactFields } from "./sharedUI.jsx";

// ---------- Assessments ----------

export function AssessmentsListView({ roster, studentData, incidents, classAssessments, config, openClassAssessment, openAssessmentReport, openSkillCategoryReport, activateAssessment, hideAssessment, createCustomAssessment, updateClassAssessmentResult, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, initialStudentId, navigate }) {
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

export function AddAssessmentPanel({ libraryCats, onActivate, onCreate, onCancel }) {
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

export function AssessmentGridView({ roster, studentData, classAssessments, config, onUpdateResult, onOpenAssessmentReport, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, initialStudentId }) {
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

export function AssessmentStudentModal({ student, data, config, classAssessments, onClose, onStartSession, onLogFluency, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail }) {
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

export function AssessmentCellDetail({ assessment, student, subjectLabel, value, onSave, onClose }) {
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
export function SubjectPicker({ subjects, value, onChange, placeholder = "Select a subject" }) {
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

export function ClassAssessmentForm({ roster, config, onCancel, onSave }) {
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

export function parseGradeNumber(val) {
  if (val == null) return null;
  const m = String(val).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
export function gradeTrend(prevVal, currVal) {
  const p = parseGradeNumber(prevVal), c = parseGradeNumber(currVal);
  if (p != null && c != null) {
    if (c > p) return { dir: "up", text: `+${(c - p).toFixed(c % 1 || p % 1 ? 1 : 0)} from last time (${prevVal})` };
    if (c < p) return { dir: "down", text: `-${(p - c).toFixed(c % 1 || p % 1 ? 1 : 0)} from last time (${prevVal})` };
    return { dir: "same", text: `Same as last time (${prevVal})` };
  }
  if (String(prevVal).trim().toLowerCase() === String(currVal).trim().toLowerCase()) return { dir: "same", text: `Same as last time (${prevVal})` };
  return { dir: "flat", text: `Previously: ${prevVal}` };
}

export function buildUnifiedAssessmentRows(student, data, classAssessments, config) {
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

export function AssessmentRowsList({ rows, onOpenSkillDetail, onOpenClassAssessmentReport, onOpenFluencyDetail, emptyText }) {
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

export function ContactInfoSection({ student, onUpdateField, onUpdateParentEmail }) {
  return (
    <StudentContactFields student={student}
      onUpdateField={(id, field, value) => (field === "parentEmail" ? onUpdateParentEmail(value) : onUpdateField(field, value))} />
  );
}

export function StudentDetailView({ student, data, incidents, classAssessments, config, onBack, onAcknowledge, onLogIncident, onLogPeriodAttendance, onGoToAssessments, onExportReport, onDraftMessage, onUpdateParentEmail, onUpdateField, onOpenClassAssessmentReport, onOpenFluencyDetail, onOpenSkillDetail, onOpenIncidentDetail, onFetchCrossClassHistory, currentClassName }) {
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
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${inc.categoryColor || catMap[inc.category]?.color || "stone"}-100 text-${inc.categoryColor || catMap[inc.category]?.color || "stone"}-700`}>
                            {inc.categoryLabel || catMap[inc.category]?.label || inc.category || "Uncategorized"}
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

