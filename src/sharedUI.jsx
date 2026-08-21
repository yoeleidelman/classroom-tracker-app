// src/sharedUI.jsx
// Genuinely shared interface pieces — used across the admin, teacher, and parent sides of the
// app all at once, not something that could be cleanly pulled into any single one of those
// domains' own files. Found by actually checking each component's real usage before assuming
// anything, not by where it happened to sit in the original file: the conversation/messaging
// view, the photo viewer, and the file-attachment button are each used from 3 to 7 different
// places spanning every side of the app. generateReplyMessage lives here too since it's used
// only by the conversation view specifically, not broadly enough to belong in core.jsx's own
// foundation.

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Plus, Loader2, ChevronRight, X, Camera, Download, Sparkles, Play, FileText, Paperclip, MoreVertical, Music, Send, Check, Minus, Phone, Trash2, Mail, Copy } from "lucide-react";
import { auth } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  uid, isIOSDevice, isRunningStandalone, isThisDeviceEnabled, enableNotificationsFor, disableNotificationsFor,
  useVisualViewportHeight, useStickToBottom, uploadOneFile, uploadOneImage, uploadOneVideo,
  validateVideoDuration, describeUploadError, MAX_FILE_ATTACHMENT_BYTES, MAX_COMPOSER_HEIGHT,
  buildStyleInstructions, authHeaders, shouldHideGoogleSignIn, COLOR_CHOICES, GlobalAppStyles, PAGE,
  addDaysISO, getScheduleForDate, isoDate, loadJSON, todayISO,
} from "./core.jsx";

export function NotificationToggle({ uid, accentColor = "#0f766e" }) {
  const [status, setStatus] = useState("checking"); // checking | unsupported | needs-install | denied | on | off
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!uid) return;
    // Order matters here: iOS Safari doesn't expose window.Notification at all UNLESS it's
    // already running as an installed, standalone home-screen app — so for anyone on iOS still
    // using it as a normal Safari tab, "Notification" in window is false regardless of whether
    // they'd otherwise be able to use notifications once actually installed. Checking that
    // generic case FIRST meant every iOS Safari tab user hit the vague "not supported" dead end
    // and never saw the specific, actionable install instructions below — checking the iOS case
    // first fixes that, without changing behavior for any other browser at all.
    if (isIOSDevice() && !isRunningStandalone()) { setStatus("needs-install"); return; }
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    if (Notification.permission === "denied") { setStatus("denied"); return; }
    const enabled = await isThisDeviceEnabled(uid);
    setStatus(enabled ? "on" : "off");
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    if (status === "on") {
      await disableNotificationsFor(uid);
      setStatus("off");
    } else {
      const result = await enableNotificationsFor(uid);
      if (result.ok) setStatus("on");
      else if (result.needsInstall) setStatus("needs-install");
      else setError(result.error || "Something went wrong — try again.");
    }
    setBusy(false);
  };

  if (status === "checking") return null;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-stone-800 mb-1">Notifications</p>
      {status === "unsupported" && <p className="text-xs text-stone-400">Not supported in this browser.</p>}
      {status === "needs-install" && (
        <p className="text-xs text-stone-500">Add this app to your home screen first (Share → Add to Home Screen), then open it from that icon — notifications can only be turned on from there.</p>
      )}
      {status === "denied" && (
        <p className="text-xs text-stone-500">Notifications are blocked for this app in your device's own settings — they need to be allowed there before this can turn on.</p>
      )}
      {(status === "on" || status === "off") && (
        <>
          <p className="text-xs text-stone-400 mb-3">Get notified on this device for new messages.</p>
          <button onClick={toggle} disabled={busy}
            className="text-xs font-semibold rounded-lg px-3 py-2 border"
            style={status === "on" ? { color: "#be123c", borderColor: "#fda4af" } : { color: "white", backgroundColor: accentColor, borderColor: accentColor }}>
            {busy ? "…" : status === "on" ? "Turn off for this device" : "Enable for this device"}
          </button>
        </>
      )}
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
    </div>
  );
}


export function AttachmentMenuButton({ onPickFile, onPickFiles }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // onPickFiles (plural) is the newer, multi-select-capable path — used where a composer can
  // actually accept several photos in one message. onPickFile (singular) stays supported for the
  // composers that haven't been converted to multi-attachment yet, so this one shared button
  // keeps working correctly in both.
  const pick = (accept, allowMultiple) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (allowMultiple && onPickFiles) input.multiple = true;
    input.onchange = (e) => { if (onPickFiles) onPickFiles(e.target.files); else onPickFile(e.target.files?.[0]); };
    input.click();
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} title="Attach"
        className={`shrink-0 rounded-full p-2 mb-0.5 ${open ? "bg-teal-50 text-teal-700" : "text-stone-400 hover:text-teal-700"}`}>
        <Plus size={17} />
      </button>
      {open && (
        <div className="anim-expand-up absolute bottom-full left-0 mb-2 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 w-48 z-20">
          <button type="button" onClick={() => pick("image/*,video/*", true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left">
            <Camera size={16} className="text-stone-500 shrink-0" /> Photo or video
          </button>
          <button type="button" onClick={() => pick("audio/*", false)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left">
            <Music size={16} className="text-stone-500 shrink-0" /> Audio
          </button>
          <button type="button" onClick={() => pick(".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv", false)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 text-left">
            <Paperclip size={16} className="text-stone-500 shrink-0" /> File
          </button>
        </div>
      )}
    </div>
  );
}

export function ConversationThreadView({ title, subtitle, messages, onSend, onEdit, onDelete, myRole, config, teacher, threadKey, onBack, readOnly = false, lastReadBeforeOpen }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [roughNote, setRoughNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const [attachItems, setAttachItems] = useState([]); // { id, file, preview, type, name }
  const [attachError, setAttachError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [openActionsFor, setOpenActionsFor] = useState(null); // message id whose Edit/Delete menu is open
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  // scrollContainerRef is the scrollable message list itself; contentRef is what's actually
  // growing inside it (an image settling into its final size, a font swapping in) — see
  // useStickToBottom for why both are needed to genuinely land at, and stay at, the true bottom
  // rather than wherever it happened to be at the exact instant of the first message rendering.
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);
  const composerRef = useRef(null);
  // iOS Safari in particular doesn't shrink the layout viewport when the keyboard opens — it
  // keeps the page the same overall size and just overlays the keyboard on top. A static 100vh
  // container in that situation ends up taller than what's actually visible, which is what lets
  // the whole page become slightly scrollable the moment the input is focused, even before
  // anything's been typed. Tracking the real, visible height and sizing to that instead is what
  // keeps this screen exactly as tall as the space actually available, keyboard included.
  const viewportHeight = useVisualViewportHeight();

  // A simple, explicit global flag — not something inferred by parsing the URL — declaring
  // "this exact conversation is on screen right now." The foreground notification handler checks
  // this before deciding whether to show a notification, matching the WhatsApp-style behavior of
  // suppressing only for the exact content already being viewed, never just because the app
  // happens to be open. Cleared on unmount so leaving the thread (even via the back button)
  // immediately makes new messages here notify normally again.
  useEffect(() => {
    window.__activeContent = { ...(window.__activeContent || {}), threadKey };
    return () => { window.__activeContent = { ...(window.__activeContent || {}), threadKey: null }; };
  }, [threadKey]);

  // Lands already at the newest message the instant this screen is visible, and — unlike a single
  // scrollIntoView on mount — stays there through anything that grows the list afterward (an
  // image's real size replacing its reserved box, a font swapping in), not just a one-time jump
  // that can drift stale the moment anything after it changes height.
  useStickToBottom(scrollContainerRef, contentRef, threadKey);

  // Grows with what's actually being typed, the way most messaging apps handle this, instead of
  // staying pinned to one line and forcing a scroll inside a tiny box to see what you've written.
  // Resetting height to "auto" first is what lets scrollHeight shrink back down too, not just
  // grow — without it the box would only ever get taller, never return to one line after a send
  // or a delete. Capped at MAX_COMPOSER_HEIGHT so a very long message scrolls within the box
  // itself rather than pushing the send button and the rest of the page around indefinitely.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [text]);

  // Multiple photos (or a mix of photos and other files) picked at once now go into one message,
  // the same way the blog already lets several images live in one post — this is what actually
  // fixes the old "one message per photo" pattern the camera's send-to-students flow used to fall
  // back to, since there was previously no way to attach more than one thing to a single message
  // at all. Photos and videos allow multiple selections at once; a document or audio attachment
  // stays a single pick, since stacking several unrelated files onto one message note isn't the
  // same use case multiple photos of the same moment is.
  const pickAttachments = async (fileList) => {
    const files = Array.from(fileList || []);
    setAttachError(null);
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      if (isVideo) {
        try { await validateVideoDuration(file); } // eslint-disable-line no-await-in-loop
        catch (err) { setAttachError(err.message); continue; } // eslint-disable-line no-continue
      }
      if (!isImage && file.size > MAX_FILE_ATTACHMENT_BYTES) {
        setAttachError("File is too large — the limit is 20MB.");
        continue; // eslint-disable-line no-continue
      }
      const type = isVideo ? "video" : isImage ? "photo" : isAudio ? "audio" : "file";
      setAttachItems((prev) => [...prev, {
        id: uid(), file, type, name: file.name,
        preview: isImage || isVideo ? URL.createObjectURL(file) : null,
      }]);
    }
  };
  const removeAttachment = (id) => setAttachItems((prev) => prev.filter((a) => a.id !== id));
  const clearAttachments = () => { setAttachItems([]); setAttachError(null); };

  const send = async () => {
    if ((!text.trim() && attachItems.length === 0) || sending) return;
    setSending(true);
    try {
      const attachments = [];
      if (attachItems.length > 0) setUploadProgress(0);
      for (let i = 0; i < attachItems.length; i++) {
        const item = attachItems[i];
        let url;
        if (item.type === "video") {
          const ext = (item.file.name || "").split(".").pop() || "mp4";
          url = await uploadOneVideo(item.file, `message-attachments/${threadKey}/${uid()}.${ext}`, (p) => setUploadProgress(Math.round((i + p / 100) / attachItems.length * 100))); // eslint-disable-line no-await-in-loop
        } else if (item.type === "photo") {
          url = await uploadOneImage(item.file, `message-attachments/${threadKey}/${uid()}.jpg`, (p) => setUploadProgress(Math.round((i + p / 100) / attachItems.length * 100))); // eslint-disable-line no-await-in-loop
        } else {
          const ext = (item.file.name || "").split(".").pop() || (item.type === "audio" ? "webm" : "bin");
          url = await uploadOneFile(item.file, `message-attachments/${threadKey}/${uid()}.${ext}`, (p) => setUploadProgress(Math.round((i + p / 100) / attachItems.length * 100))); // eslint-disable-line no-await-in-loop
        }
        attachments.push({ url, type: item.type, name: (item.type === "file" || item.type === "audio") ? item.name : null });
      }
      await onSend(text.trim(), attachments);
      setText("");
      clearAttachments();
    } catch (err) {
      setAttachError(describeUploadError(err));
    }
    setUploadProgress(null);
    setSending(false);
  };

  const startEdit = (m) => { setEditingId(m.id); setEditDraft(m.text || ""); setOpenActionsFor(null); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(""); };
  const saveEdit = async (id) => {
    if (!editDraft.trim()) return;
    await onEdit(id, editDraft.trim());
    setEditingId(null);
    setEditDraft("");
  };
  const confirmDelete = async (id) => {
    await onDelete(id);
    setOpenActionsFor(null);
  };

  const generate = async () => {
    if (!roughNote.trim() || generating) return;
    setGenerating(true);
    setGenError(false);
    try {
      const draft = await generateReplyMessage(roughNote.trim(), messages, config, myRole, teacher);
      setText(draft || "");
      setShowGenerate(false);
      setRoughNote("");
    } catch {
      setGenError(true);
    }
    setGenerating(false);
  };

  // The teacher/admin side's page background is the app's own themed stone-50 (a warm parchment
  // tone) throughout, and this screen already matches it correctly. The parent portal was later
  // redesigned to a lighter, slightly different tone (#f6f5f1) as part of its own visual pass —
  // this screen is shared between both sides, so it needs to pick up on which one it's actually
  // in rather than always using the teacher-side tone, which is exactly what produced a visible,
  // flat-beige mismatch against the parent portal's white-card, lighter-background look elsewhere.
  const threadBg = myRole === "family" ? "#f6f5f1" : undefined;
  // Which message (if any) is the first one to draw the "new messages" divider above — only
  // meaningful against a genuine previous read point, since a thread being opened for the very
  // first time ever has nothing to contrast "new" against (everything in it already is), the same
  // reasoning WhatsApp itself follows for a brand new chat.
  const firstUnreadId = lastReadBeforeOpen
    ? messages.find((m) => m.senderType !== myRole && !m.deleted && new Date(m.timestamp) > new Date(lastReadBeforeOpen))?.id || null
    : null;
  // A parent's own sent-message bubble picks up the school's turquoise instead of the app's
  // default teal-700 — matching the highlight already used for the active tab. Scoped tightly to
  // myRole === "family" specifically (not just "mine"), since this same component and this same
  // "mine" bubble also renders a TEACHER's own sent messages when they're the one viewing the
  // thread — the school-brand color is only meant for the parent side, not something a teacher
  // opening their own inbox should suddenly see their own messages recolored with.
  const mineBubble = myRole === "family"
    ? { base: "bg-[#5F9F9E]", dark: "bg-[#508786]", darkHover: "hover:bg-[#447271]", lightText: "text-[#dbe9e9]", lighterText: "text-[#b7d3d3]", brandText: "text-[#5F9F9E]" }
    : { base: "bg-teal-700", dark: "bg-teal-800", darkHover: "hover:bg-teal-900", lightText: "text-teal-100", lighterText: "text-teal-200", brandText: "text-teal-700" };

  return (
    <div className="app-page flex flex-col" style={{ height: viewportHeight ? `${viewportHeight}px` : "100vh", ...(threadBg ? { background: threadBg } : {}) }}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-2 shrink-0"><ChevronLeft size={16} /> Back</button>
      <div className="mb-3 shrink-0">
        <h1 className="display-font text-lg font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        {myRole === "admin" && !readOnly && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5 inline-block">
            One-way — this family sees your messages but can't reply here. They'll call, text, or WhatsApp the office instead.
          </p>
        )}
        {readOnly && (
          <p className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-lg px-2.5 py-1.5 mt-1.5 inline-block">
            Viewing only — only the specific teacher this thread belongs to can post here.
          </p>
        )}
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar mb-3">
        <div ref={contentRef} className="space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-8">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.senderType === myRole;
          // Edit/delete only ever apply to staff's own sent messages, never a family's — matches
          // the accountability reasoning behind soft delete itself: the point is a school having
          // a stable, trustworthy record of what it told a family, not the reverse.
          const canModify = mine && myRole !== "family" && onEdit && onDelete && !m.deleted;
          const divider = m.id === firstUnreadId && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-rose-200" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">New</span>
              <div className="flex-1 h-px bg-rose-200" />
            </div>
          );

          if (m.deleted) {
            return (
              <Fragment key={m.id}>
                {divider}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${mine ? "bg-stone-200" : "bg-stone-100 border border-stone-200"}`}>
                    <p className="text-xs italic text-stone-400">This message was deleted</p>
                  </div>
                </div>
              </Fragment>
            );
          }

          return (
            <Fragment key={m.id}>
              {divider}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl overflow-hidden relative ${mine ? `${mineBubble.base} text-white` : "bg-white border border-stone-200 text-stone-800"}`}>
                <div className="px-3.5 pt-2.5 flex items-start justify-between gap-2">
                  <p className={`text-[10px] font-semibold mb-0.5 ${mine ? mineBubble.lightText : "text-stone-400"}`}>{m.senderName}</p>
                  {canModify && (
                    <button onClick={() => setOpenActionsFor(openActionsFor === m.id ? null : m.id)}
                      className={`shrink-0 -mt-1 -mr-1 p-1 rounded ${mine ? `${mineBubble.lighterText} hover:text-white` : "text-stone-300 hover:text-stone-600"}`}>
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>

                {openActionsFor === m.id && (
                  <div className="anim-expand-down mx-3.5 mb-1.5 flex gap-1.5">
                    <button onClick={() => startEdit(m)} className={`text-[11px] font-semibold px-2 py-1 rounded-md ${mine ? `${mineBubble.dark} text-white ${mineBubble.darkHover}` : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>Edit</button>
                    <ConfirmDelete onConfirm={() => confirmDelete(m.id)} size={12} label="Delete" />
                  </div>
                )}

                {editingId === m.id ? (
                  <div className="px-3.5 pb-2.5">
                    <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={2} autoFocus
                      className={`w-full rounded-lg px-2 py-1.5 text-sm mb-1.5 ${mine ? "text-stone-900" : "border border-stone-300"}`} />
                    <div className="flex gap-1.5">
                      <button onClick={() => saveEdit(m.id)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${mine ? `bg-white ${mineBubble.brandText}` : `${mineBubble.base} text-white`}`}>Save</button>
                      <button onClick={cancelEdit} className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${mine ? `${mineBubble.dark} ${mineBubble.lightText}` : "bg-stone-100 text-stone-500"}`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Normalizes old and new message shapes into one list to render — an older
                        message saved before this rewrite still has attachmentUrl/attachmentType
                        directly on it rather than an attachments array, and needs to keep
                        rendering exactly as it always has. */}
                    {(() => {
                      const atts = m.attachments || (m.attachmentUrl ? [{ url: m.attachmentUrl, type: m.attachmentType, name: m.attachmentName }] : []);
                      const mediaAtts = atts.filter((a) => a.type === "photo" || a.type === "video");
                      const otherAtts = atts.filter((a) => a.type === "audio" || a.type === "file");
                      return (
                        <>
                          {mediaAtts.length === 1 && (
                            mediaAtts[0].type === "photo" ? (
                              <img src={mediaAtts[0].url} alt="" onClick={() => setLightboxPhoto({ url: mediaAtts[0].url })}
                                className="w-full max-h-64 object-cover cursor-pointer mt-1" />
                            ) : (
                              <video src={mediaAtts[0].url} controls playsInline className="w-full max-h-64 bg-black mt-1" />
                            )
                          )}
                          {mediaAtts.length > 1 && (
                            <div className="grid grid-cols-2 gap-0.5 mt-1">
                              {mediaAtts.map((a, i) => (
                                <div key={i} className="relative aspect-square cursor-pointer" onClick={() => a.type === "photo" && setLightboxPhoto({ url: a.url })}>
                                  {a.type === "video" ? (
                                    <>
                                      <video src={a.url} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="bg-white/90 rounded-full p-1.5"><Play size={12} fill="currentColor" className="text-stone-800 ml-0.5" /></div>
                                      </div>
                                    </>
                                  ) : (
                                    <img src={a.url} alt="" className="w-full h-full object-cover" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {otherAtts.map((a, i) => (
                            a.type === "audio" ? (
                              <div key={i} className="mt-1.5 mb-1 mx-3.5">
                                {a.name && <p className={`text-[11px] font-semibold truncate mb-1 ${mine ? "text-teal-100" : "text-stone-500"}`}>{a.name}</p>}
                                <audio src={a.url} controls className="w-full" style={{ height: "36px" }} />
                              </div>
                            ) : (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 mx-3.5 mt-1 mb-1 px-3 py-2 rounded-lg border ${mine ? "border-teal-500 bg-teal-800/40" : "border-stone-200 bg-stone-50"}`}>
                                <FileText size={18} className={mine ? "text-teal-100" : "text-stone-500"} />
                                <span className={`text-xs font-semibold truncate ${mine ? "text-white" : "text-stone-700"}`}>{a.name || "Attached file"}</span>
                              </a>
                            )
                          ))}
                        </>
                      );
                    })()}
                    <div className="px-3.5 pb-2.5 pt-1">
                      {m.text && <p className="text-sm whitespace-pre-wrap"><LinkifiedText text={m.text} linkClassName={mine ? "underline text-teal-100 hover:text-white" : "underline text-teal-700 hover:text-teal-900"} /></p>}
                      {m.text && extractFirstUrl(m.text) && <LinkPreviewCard url={extractFirstUrl(m.text)} />}
                      <p className={`text-[10px] mt-1 ${mine ? "text-teal-100" : "text-stone-400"}`}>
                        {new Date(m.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {m.edited && <span className="italic"> · edited</span>}
                      </p>
                    </div>
                  </>
                )}
              </div>
              </div>
            </Fragment>
          );
        })}
        </div>
      </div>

      {lightboxPhoto && <PhotoLightbox url={lightboxPhoto.url} onClose={() => setLightboxPhoto(null)} />}

      {!readOnly && (
      <div className={`shrink-0 sticky bottom-0 pt-2 ${threadBg ? "" : "bg-stone-50"}`} style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))", ...(threadBg ? { background: threadBg } : {}) }}>
        {showGenerate && (
          <div className="border border-teal-200 bg-teal-50/50 rounded-xl p-2.5 mb-2">
            <div className="flex items-center gap-1.5">
              <input value={roughNote} onChange={(e) => setRoughNote(e.target.value)} placeholder="What do you want to say? I'll polish it."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); generate(); } }}
                className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm" autoFocus />
              <button onClick={generate} disabled={!roughNote.trim() || generating}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800 disabled:opacity-40 shrink-0">
                {generating ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />} {generating ? "…" : "Generate"}
              </button>
              <button onClick={() => { setShowGenerate(false); setRoughNote(""); }} className="text-stone-400 hover:text-stone-600 p-1 shrink-0"><X size={16} /></button>
            </div>
            {genError && <p className="text-xs text-rose-600 mt-1.5">Couldn't generate a draft right now — try again, or just type your message.</p>}
          </div>
        )}
        {attachItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 ml-11">
            {attachItems.map((a) => (
              <div key={a.id} className="relative">
                {a.type === "video" ? (
                  <video src={a.preview} className="h-20 w-20 object-cover rounded-lg" />
                ) : a.type === "photo" ? (
                  <img src={a.preview} alt="" className="h-20 w-20 object-cover rounded-lg" />
                ) : (
                  <div className="h-20 flex items-center gap-1.5 px-2.5 rounded-lg border border-stone-300 bg-white">
                    {a.type === "audio" ? <Music size={15} className="text-stone-500" /> : <FileText size={15} className="text-stone-500" />}
                    <span className="text-xs font-semibold text-stone-700 max-w-[8rem] truncate">{a.name}</span>
                  </div>
                )}
                <button onClick={() => removeAttachment(a.id)} className="absolute -top-1.5 -right-1.5 bg-stone-700 text-white rounded-full p-0.5"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {attachError && <p className="text-xs text-rose-600 mb-1.5 ml-11">{attachError}</p>}
        <div className="flex items-end gap-2">
          <button onClick={() => setShowGenerate((v) => !v)} title="Generate with AI"
            className={`shrink-0 rounded-full p-2.5 mb-0.5 border ${showGenerate ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-stone-50 border-stone-200 text-stone-400 hover:text-teal-700 hover:border-teal-300"}`}>
            <Sparkles size={17} />
          </button>
          <div className="flex-1 flex items-end gap-1 bg-white border border-stone-300 rounded-3xl pl-1 py-1 pr-2">
            <AttachmentMenuButton onPickFiles={pickAttachments} />
            <textarea ref={composerRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="flex-1 bg-transparent border-none px-1.5 py-2 text-sm resize-none overflow-y-auto outline-none" style={{ maxHeight: MAX_COMPOSER_HEIGHT }} />
            <button onClick={send} disabled={(!text.trim() && attachItems.length === 0) || sending} title="Send"
              className="text-teal-700 hover:text-teal-800 disabled:opacity-30 shrink-0 flex items-center justify-center mb-1.5 p-1">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={19} />}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Shared full-size media viewer — a photo or video embedded in a card is always cropped or
// constrained to fit that card's shape, so this is the one place someone actually sees the whole
// thing, with a real download to their device rather than just a bigger version still trapped in
// the app. Handles both photos and videos through the same component, since a mixed batch in a
// blog post shouldn't need two different lightbox experiences depending on what was tapped.
// Carousel navigation (arrows + swipe) is optional — only active when a caller passes a mediaList,
// so every other usage of this component keeps behaving exactly as it did before.
export function PhotoLightbox({ url, type = "photo", caption, onClose, mediaList, currentIndex, onNavigate }) {
  const [downloading, setDownloading] = useState(false);
  const touchStartX = useRef(null);
  const hasCarousel = Array.isArray(mediaList) && mediaList.length > 1 && typeof currentIndex === "number";
  const download = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = type === "video" ? "video.mp4" : "photo.jpg";
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank"); // fallback if the fetch-and-save approach is blocked for any reason
    }
    setDownloading(false);
  };
  const goPrev = (e) => { e?.stopPropagation(); if (hasCarousel && currentIndex > 0) onNavigate(currentIndex - 1); };
  const goNext = (e) => { e?.stopPropagation(); if (hasCarousel && currentIndex < mediaList.length - 1) onNavigate(currentIndex + 1); };
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) { if (delta > 0) goPrev(); else goNext(); }
    touchStartX.current = null;
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose}
      onTouchStart={hasCarousel ? onTouchStart : undefined} onTouchEnd={hasCarousel ? onTouchEnd : undefined}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><X size={22} /></button>
      {hasCarousel && currentIndex > 0 && (
        <button onClick={goPrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><ChevronLeft size={24} /></button>
      )}
      {hasCarousel && currentIndex < mediaList.length - 1 && (
        <button onClick={goNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"><ChevronRight size={24} /></button>
      )}
      {type === "video" ? (
        <video src={url} controls autoPlay playsInline className="max-w-full max-h-[75vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={url} alt={caption || "Photo"} className="max-w-full max-h-[75vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      )}
      {hasCarousel && <p className="text-white/60 text-xs mt-2">{currentIndex + 1} of {mediaList.length}</p>}
      {caption && <p className="text-white text-sm mt-3 text-center max-w-md">{caption}</p>}
      <button onClick={download} disabled={downloading}
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg px-4 py-2 disabled:opacity-60">
        {downloading ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />} {downloading ? "Downloading…" : "Download"}
      </button>
    </div>
  );
}
// A real, direct requirement — a teacher's update should reach a parent automatically, the
// moment it happens, with no refresh or re-navigation needed — that this screen was NOT actually
// meeting: its data used to load once, with a plain one-time read, when this screen first opened.
// A teacher logging something afterward, while a parent already had this exact screen open,
// produced no visible change at all until the parent happened to leave and come back. Fixed by
// making every source here (the child's own daily log, the class's incidents, the class's photos)
// a genuine live subscription instead — the child's own log specifically via useLiveJSONLoaded
// below, the same shared hook used everywhere else in the app for this, rather than a separate,
// custom one — so a change on the teacher's side is reflected here within moments, automatically,
// exactly matching what "mirror image" was always supposed to mean.


export async function generateReplyMessage(roughNote, recentMessages, config, senderRole, teacher) {
  const isSchoolSide = senderRole === "teacher" || senderRole === "admin";
  const context = recentMessages.slice(-4).map((m) => `${m.senderName}: ${m.text}`).join("\n");
  const styleBlock = isSchoolSide
    ? buildStyleInstructions(config, teacher?.name)
    : "Write in a warm, clear, everyday tone — a genuine message from a parent to their child's school.";
  const prompt = `${styleBlock}

This is a reply within an ongoing message conversation between a ${isSchoolSide ? "school and a parent" : "parent and their child's school"}. Recent conversation for context:
${context || "(no earlier messages yet — this is the first message in the thread)"}

STRICT RULES:
- Use ONLY the information given below. Do not invent specifics that weren't stated.
- If the note is vague or missing a detail, write around it naturally rather than inventing one.

What they want to say, in their own rough words: ${roughNote}

Write a short, warm, clear reply — 1-3 sentences, matching the tone of a real back-and-forth conversation, not a formal announcement. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // pure in-app AI-assist for the message composer — never has an email path, so never gets the disclaimer
}
export function GoogleSignInSection({ onSignInWithGoogle, pendingGoogleLink, onCompleteGoogleLink, googleSignInError }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);

  if (pendingGoogleLink) {
    const submit = async () => {
      if (!password) return;
      setError("");
      setLinking(true);
      const result = await onCompleteGoogleLink(password);
      setLinking(false);
      if (!result.ok) setError(result.error);
    };
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4 shadow-sm">
        <p className="text-sm font-semibold text-stone-800 mb-1">Connect your Google account</p>
        <p className="text-xs text-stone-500 mb-3">You already have an account for {pendingGoogleLink.email} — enter its password once to connect Google. After that, either one signs you in.</p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password" autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2 focus:border-teal-500 focus:outline-none" />
        {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
        <button onClick={submit} disabled={linking || !password} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {linking ? "Connecting..." : "Connect account"}
        </button>
      </div>
    );
  }

  // Hidden entirely on an installed, standalone iOS PWA — see shouldHideGoogleSignIn for why
  // showing it and explaining the failure after a tap isn't the right call here. The caller
  // (TeacherSignInScreen / ParentSignInScreen) checks this same function to also skip the "OR"
  // divider that would otherwise sit above nothing.
  if (shouldHideGoogleSignIn()) return null;

  return (
    <div className="mb-4">
      <button onClick={onSignInWithGoogle} className="w-full flex items-center justify-center gap-2 bg-white border border-stone-300 rounded-lg py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3c-7.7 0-14.4 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 35.9 26.8 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 40.5 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.5 37 44 31 44 24c0-1.4-.1-2.7-.4-3.5z"/></svg>
        Continue with Google
      </button>
      {googleSignInError && (
        <p className="text-xs text-rose-600 mt-2">
          Couldn't open Google sign-in. <span className="text-stone-400">({googleSignInError})</span>
        </p>
      )}
    </div>
  );
}

export function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim(), { url: window.location.origin + window.location.pathname });
      setSent(true);
    } catch (err) {
      // auth/user-not-found is deliberately treated as success from here on out — see comment
      // above the component.
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") setSent(true);
      else setError("Something went wrong sending that email. Try again in a moment.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-bold text-stone-900" style={{ fontFamily: "Georgia, serif" }}>Reset your password</p>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        {sent ? (
          <>
            <p className="text-sm text-stone-600 mb-4">If an account exists for that email, a reset link is on its way — check your inbox (and spam folder) in the next few minutes.</p>
            <button onClick={onClose} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">Done</button>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-600 mb-3">Enter the email on your account and we'll send you a link to set a new password.</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Email" autoFocus className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-3 focus:border-teal-500 focus:outline-none" />
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <button onClick={send} disabled={sending || !email.trim()} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {sending ? "Sending..." : "Send reset link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Points ----------

export const WHEEL_COLORS = ["#0e6e62", "#c0362c", "#b7791f", "#2e7d5b", "#b5651d", "#8a5763", "#756d4f", "#8a6f4a"];

// Deliberately a real, stable top-level component (not defined inline inside RaffleView) —
// if it were recreated on every render, React would treat each render's version as a brand
// new component type and remount the div from scratch on every state change, which silently
// destroys the CSS transition the spin animation depends on (there'd be no "previous rotation"
// for the browser to animate from, so it would just snap straight to the final angle).
export function RaffleWheel({ size, wheelBackground, rotation, participants }) {
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

export function RaffleLegend({ participants }) {
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

export function RaffleView({ roster }) {
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

      {/* Same portal fix as TimerWidget's own fullscreen overlay, and for the same reason — see
          that comment for the full explanation. Renders straight onto document.body so this
          overlay's own position: fixed is never affected by whatever CSS any ancestor container
          happens to be doing, independent of whether the real Fullscreen API works on a given
          device. */}
      {fullScreen && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}

export function PointsView({ roster, studentData, classPoints, config, addPoints, addClassPoints, resetClassPoints, onAddCategory, navigate, plannerDays, behaviorLogData, adjustBehaviorMark, programMode, programName, onBackFromProgram, backLabel, programs, onOpenProgram }) {
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

export function FillMeter({ value, max, color, size = "lg" }) {
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

export function weekRange(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDaysISO(isoDate(sunday), i));
  return days;
}

export function ClassLogView({ config, plannerDays, behaviorLogData, adjustBehaviorMark }) {
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

export function ClassCheckXCard({ cat, checkValue, xValue, onCheck, onX, onReset }) {
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

export function ClassPointsCard({ cat, value, onAdd, onSubtract, onReset }) {
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

export async function generateClassAnnouncementMessage(topic, config, teacher) {
  const teacherName = teacher?.name;
  const prompt = `${buildStyleInstructions(config, teacherName)}

This one is a class-wide announcement going out to every parent at once — not about any one student. Regardless of the tone described above, write this specific message in a formal, official register appropriate for a broadcast notice — clear, businesslike, no casual phrasing — since this is what parents expect from an official class-wide notice.

STRICT RULES:
- Use ONLY the information given below. Do not invent specifics (times, amounts, locations) that weren't stated.
- If the topic is vague or missing a detail, write around it naturally rather than inventing one.

What this announcement is about, in the teacher's own words: ${topic}

Write a short, clear announcement — 2-4 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}
// Fixed content, not AI-generated — login credentials need to be exact, not paraphrased.
export function buildParentLoginEmail(parentName, childNames, studentTypes, parentEmail, defaultPassword) {
  const portalUrl = `${window.location.origin}${window.location.pathname}?portal=parent`;

  const subject = `Your SJA School App Login Information`;
  const body = `Hi ${parentName || "there"},

I'm reaching out regarding the new SJA School App that we will be using for communication between parents, teachers, and the school. The app will keep you connected with messages, school and classroom updates, pictures, and other important information.

Your login information is:
Login: ${parentEmail}
Temporary password: ${defaultPassword}

Access the SJA School App here:
${portalUrl}

Once you have logged in, you can change the temporary password by opening the app's Settings and selecting the option to change your password.

INSTALLING THE APP

ANDROID
1. Open the link above using Google Chrome.
2. Tap the three-dot menu beside the address bar.
3. Select "Install app" or "Add to Home screen," depending on the option shown on your device.
4. Follow the prompts to complete the installation.
5. Open the SJA app from the icon on your Home screen.
6. Open Settings within the app and turn on notifications. When your device asks for permission, tap "Allow."

iPHONE OR iPAD
1. Open the link above using Safari.
2. Tap the Share button.
3. Scroll down and select "Add to Home Screen."
4. Make sure "Open as Web App" is enabled if that option appears, and then tap "Add."
5. Open the SJA app using the new icon on your Home Screen.
6. Open Settings within the app and enable notifications. When your device asks for permission, tap "Allow."

Enabling notifications is important so that you receive messages, announcements, and classroom updates promptly.

If you have any questions or experience difficulty with any part of the setup process, please reply to this email. I will be happy to guide you and make sure that you are fully set up with the app.

Warmly,
Rabbi Eidelman
SJA`;

  return { subject, body };
}

export function StudentContactFields({ student, onUpdateField }) {
  const [defaultPassword, setDefaultPassword] = useState("Welcome123");
  useEffect(() => { loadJSON("defaultParentPassword", "Welcome123", true).then(setDefaultPassword); }, []);

  const emailParent = (parentName, parentEmail) => {
    const { subject, body } = buildParentLoginEmail(parentName, [student.name], [student.studentType], parentEmail, defaultPassword);
    // window.location.href, not a synthetic click on a detached <a> — Chrome's handoff of a
    // mailto: link to the OS's registered mail app is measurably less reliable for a
    // programmatic click on an element that was never actually attached to the page than for a
    // real navigation, and this became visible specifically once the email body grew past what
    // it used to be (the longer install instructions push the encoded URL close to a length
    // that's historically been fragile for that OS-level handoff). This is the standard, more
    // dependable way to trigger a mailto: link from JS.
    window.location.href = `mailto:${encodeURIComponent(parentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
        <div className="flex gap-1.5">
          <input type="email" value={student.parentEmail || ""} onChange={(e) => onUpdateField(student.id, "parentEmail", e.target.value)} placeholder="parent@example.com" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          {student.parentEmail && (
            <button onClick={() => emailParent(student.parent1Name, student.parentEmail)} className="shrink-0 h-fit text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 hover:bg-teal-50 whitespace-nowrap">
              Email login info
            </button>
          )}
        </div>
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
        <div className="flex gap-1.5">
          <input type="email" value={student.parent2Email || ""} onChange={(e) => onUpdateField(student.id, "parent2Email", e.target.value)} placeholder="parent2@example.com" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
          {student.parent2Email && (
            <button onClick={() => emailParent(student.parent2Name, student.parent2Email)} className="shrink-0 h-fit text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 hover:bg-teal-50 whitespace-nowrap">
              Email login info
            </button>
          )}
        </div>
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
export function MyAccountPanel({ teacher, onUpdateName, onChangePassword, onClose }) {
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
export function MailActionButtons({ email, bcc, subject, body, size = "normal" }) {
  const [copied, setCopied] = useState(false);
  const bccParam = bcc && bcc.length > 0 ? `&bcc=${encodeURIComponent(bcc.join(","))}` : "";
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email || "")}${bccParam}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // Gmail's compose-link BCC field can occasionally drop a name partway through once a link gets
  // very long — a real limitation on Gmail's end. That's worth flagging, but the choice of how to
  // handle it belongs to the teacher, not this component — "Open in Gmail" always stays available,
  // and anything missing can be fixed by hand right there in the compose window it opens.
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
        <a href={gmailHref} target="_blank" rel="noopener noreferrer" className={`${btnClass} text-white bg-teal-700 hover:bg-teal-800`}>
          <Mail size={13} /> Open in Gmail
        </a>
        <button onClick={copyToClipboard} className={`${btnClass} text-stone-600 border border-stone-300 hover:bg-stone-50`}>
          <Copy size={13} /> {copied ? "Copied!" : "Copy message"}
        </button>
      </div>
      {riskyLength && (
        <p className="text-xs text-amber-700 mt-1.5">
          This list is long enough that Gmail can occasionally drop a name partway through — worth a quick check in the compose window before sending. Add anyone missing right there, or use "Copy message" if you'd rather be certain.
        </p>
      )}
    </div>
  );
}
export function ArchiveOrDeleteMenu({ onArchive, onDeletePermanently, size }) {
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

export function ConfirmDelete({ onConfirm, size, label, className, confirmText, armedClassName }) {
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

export function Section({ title, children }) {
  return (
    <div className="mb-6 min-w-0">
      <h2 className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">{title}</h2>
      <div className="bg-white border border-stone-200 rounded-xl p-3 overflow-hidden">{children}</div>
    </div>
  );
}
