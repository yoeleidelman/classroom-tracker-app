// src/parent.jsx
// The parent portal — every screen and helper specific to the parent-facing side of the app,
// and only the parent-facing side. Genuinely shared pieces (the messaging view, photo viewer,
// attachment button, the two sign-in helpers, the file-upload helpers) were moved to their own
// homes first, specifically so this file could be this cleanly self-contained rather than
// duplicating or reaching back into anything else. Nothing here was rewritten — every line is
// exactly what it already was in App.jsx, just relocated and exported.

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import {
  ChevronLeft, Home as HomeIcon, Check, ChevronRight, MessageCircle, X, Sandwich, Apple, Moon, Baby,
  Droplets, Smile, HeartPulse, Camera, Newspaper, Play, Phone, FileText, Send,
} from "lucide-react";
import jsQR from "jsqr";
import {
  GlobalAppStyles, LinkPreviewCard, LinkifiedText, SCHOOLWIDE_CHECKIN_CODE, authHeaders,
  countUnreadInThread, dedupeDailyLogData, describeAttachmentsForNotification, extractFirstUrl,
  formatTime12h, friendlyDateLabel, getReadState, getUnifiedCheckInStatus, isSchoolDay,
  isThreadUnread, loadJSON, markThreadRead, notifyClassTeachers, notifySpecificTeacher,
  resetBackgroundBadgeCounter, saveJSON, shouldHideGoogleSignIn, todayISO, toggleUnifiedCheckIn,
  uid, useLiveJSON, useLiveJSONLoaded, useRemainingViewportHeight, useStickToBottom,
} from "./core.jsx";
import {
  NotificationToggle, ConversationThreadView, PhotoLightbox, GoogleSignInSection, ForgotPasswordModal,
  TabBadge,
} from "./sharedUI.jsx";

export function ParentSignInScreen({ onSignIn, isSignedInAsSomethingElse, onSignInWithGoogle, pendingGoogleLink, onCompleteGoogleLink, googleSignInError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const trySignIn = async () => {
    if (!email.trim() || !password) return;
    setError("");
    setSigningIn(true);
    // Same reasoning as the teacher sign-in screen — trimmed to catch accidental leading or
    // trailing whitespace from either end of the comparison.
    const result = await onSignIn(email.trim(), password.trim());
    setSigningIn(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #f6f2e9 0%, #fbf8f1 100%)" }}>
      <GlobalAppStyles />
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      <div className="max-w-sm w-full">
        <img src="/parent-logo-transparent.png" alt="Family Portal" className="w-48 mx-auto mb-5" />
        <h1 className="display-font text-2xl font-bold text-stone-900 text-center mb-1">Family sign in</h1>
        <p className="text-stone-500 text-sm text-center mb-7">See updates for your child, right here.</p>

        {isSignedInAsSomethingElse && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-800">This device is currently signed in with a staff account. Signing in below with a family account will switch to that instead.</p>
          </div>
        )}

        <GoogleSignInSection onSignInWithGoogle={onSignInWithGoogle} pendingGoogleLink={pendingGoogleLink} onCompleteGoogleLink={onCompleteGoogleLink} googleSignInError={googleSignInError} />
        {!pendingGoogleLink && !shouldHideGoogleSignIn() && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-stone-200" /><span className="text-[10px] text-stone-400">OR</span><div className="flex-1 h-px bg-stone-200" />
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 shadow-sm">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2.5 focus:border-teal-500 focus:outline-none" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2 focus:border-teal-500 focus:outline-none" />
          <button onClick={() => setShowForgotPassword(true)} className="text-xs font-semibold text-stone-400 hover:text-teal-700 mb-3">Forgot password?</button>
          {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
          <button onClick={trySignIn} disabled={signingIn} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-50">
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
        </div>
        <p className="text-[10px] text-stone-400 text-center leading-relaxed">
          Don't have an account yet? Ask your child's school to set one up for you.
        </p>
      </div>
    </div>
  );
}

// The camera piece — genuinely the part of this feature most dependent on the specific phone and
// browser it's running on, which is exactly why the manual "Check in"/"Check out" buttons on each
// child's own card exist as a real, equally-valid way to do this, not just a backup. Scans a video
// frame roughly ten times a second, looking for a QR code; stops and reports back the moment one
// decodes successfully.
export function ParentQRScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let rafId;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (e) {
        setError(e.name === "NotAllowedError" ? "Camera access was denied. You can still use the Check in / Check out buttons below instead." : "Couldn't reach the camera. You can still use the Check in / Check out buttons below instead.");
      }
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current, canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          setScanning(false);
          onResult(code.data);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    start();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10"><X size={22} /></button>
      {error ? (
        <div className="max-w-xs text-center px-4">
          <p className="text-white text-sm mb-4">{error}</p>
          <button onClick={onClose} className="bg-white text-stone-900 rounded-lg px-4 py-2 text-sm font-semibold">Close</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="w-full max-w-md" playsInline muted />
          <p className="text-white text-sm mt-4">{scanning ? "Point the camera at the code" : "Got it…"}</p>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// What a parent actually wants to see: not raw records, but "here's what happened today" — one
// color-coded card per thing that was actually logged, in the same visual language as the
// teacher's own dashboard, so a parent who's seen the school's tablet recognizes it immediately.
// Categories with nothing logged for the day just don't get a card, rather than showing an empty
// one — a quiet day shouldn't look like a wall of "nothing here."
// The actual thread UI — same component either side uses, since a back-and-forth message list
// and a compose box don't need to look different depending on who's viewing them. What differs is
// which side a bubble is aligned to (myRole), which is the only thing that actually depends on who's
// looking at it.
// A small, dismissible callout anchored directly to the real feature it's explaining — not a
// separate wizard screen, so a parent sees it while actually looking at the thing it describes.
// Positioned relative to its own wrapper (not the viewport), so no scroll- or resize-tracking is
// needed — it just sits below whatever it wraps, the same way on every screen size.
export function TourHint({ active, step, total, text, align = "left", onNext, onSkip, children }) {
  return (
    <div className="relative">
      {children}
      {active && (
        <div className={`anim-expand-down absolute z-40 top-full mt-2 w-64 ${align === "right" ? "right-0" : "left-0"}`}>
          <div className={`absolute -top-1.5 w-3 h-3 bg-teal-800 rotate-45 ${align === "right" ? "right-6" : "left-6"}`} />
          <div className="bg-teal-800 text-white rounded-xl p-3 shadow-lg">
            <p className="text-sm mb-2.5 leading-snug">{text}</p>
            <div className="flex items-center justify-between">
              <button onClick={onSkip} className="text-[11px] text-teal-300 hover:text-white">Skip tour</button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-teal-300">{step} of {total}</span>
                <button onClick={onNext} className="text-xs font-bold bg-white text-teal-800 rounded-lg px-2.5 py-1 hover:bg-teal-50">{step === total ? "Got it" : "Next"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Not a compose box — a launcher. Reaching the office happens through the phone, text, or
// WhatsApp app already installed on the parent's device, addressed to the same number the office
// already watches, so nothing new gets added to what she has to monitor. Anything the office has
// broadcast is still visible here, read-only, since that's a one-way push she chose to send, not
// something requiring her to watch for replies.
// Sits directly on the parent's home screen — reaching the office shouldn't require digging into
// a "Messages" section at all, since it isn't a conversation, it's a launcher. "Updates" still
// leads to anything the office has broadcast, for the (less common) case someone wants that history.
// Deliberately unobtrusive — reaching the office isn't why a parent opens this app most days, so
// it's a small, collapsed row rather than a card competing with the actual daily content for the
// top of the screen. Expands in place when tapped, rather than opening a whole new page.
// lucide-react is a generic icon set with no brand marks — this is the actual recognizable
// WhatsApp glyph (speech bubble + handset), drawn inline in WhatsApp's own brand green
// specifically so "this opens WhatsApp" reads at a glance, the same way the phone icon already
// reads as "call" — a generic message-bubble icon tinted green doesn't carry that recognition.
export function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.03.24-3.42-.72-2.9-1.16-4.72-4.15-4.87-4.34-.14-.19-1.17-1.56-1.17-2.98s.73-2.12 1-2.4c.24-.27.53-.34.71-.34.18 0 .35 0 .5.01.16.01.38-.06.6.46.24.56.8 1.95.87 2.09.07.14.12.31.02.5-.1.19-.15.31-.29.48-.15.17-.3.37-.44.5-.14.14-.3.29-.13.58.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.29 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.63-.14.26.1 1.64.77 1.92.92.29.14.48.21.55.33.07.12.07.71-.16 1.4z"/>
    </svg>
  );
}

// Controlled from the header's own Contact Office icon now, not a self-managed inline toggle —
// renders as a full-width panel spanning the same width as the rest of the page content, not a
// small anchored popover, since a 3-icon grid needs real room to be comfortably tappable.
export function ContactOfficePanel({ onViewUpdates }) {
  const [officePhone, setOfficePhone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJSON("schoolSettings", {}, true).then((s) => { setOfficePhone(s?.officePhone || null); setLoading(false); });
  }, []);

  const digits = (officePhone || "").replace(/[^\d]/g, "");
  if (loading || !digits) return null;

  return (
    <div className="anim-expand-down bg-white border-b border-stone-200 max-w-lg mx-auto px-4 py-3">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <a href={`tel:${digits}`} className="flex flex-col items-center gap-1 bg-stone-50 rounded-lg py-2.5 hover:bg-stone-100">
          <Phone size={18} className="text-[#5F9F9E]" />
          <span className="text-[11px] font-semibold text-stone-700">Call</span>
        </a>
        <a href={`sms:${digits}`} className="flex flex-col items-center gap-1 bg-stone-50 rounded-lg py-2.5 hover:bg-stone-100">
          <MessageCircle size={18} className="text-[#5F9F9E]" />
          <span className="text-[11px] font-semibold text-stone-700">Text</span>
        </a>
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-stone-50 rounded-lg py-2.5 hover:bg-stone-100">
          <WhatsAppIcon size={19} />
          <span className="text-[11px] font-semibold text-stone-700">WhatsApp</span>
        </a>
      </div>
      <button onClick={onViewUpdates} className="text-xs font-semibold text-[#5F9F9E] hover:text-[#447271]">See updates from the office →</button>
    </div>
  );
}

export function ContactOfficeView({ adminThread, onBack }) {
  const [officePhone, setOfficePhone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJSON("schoolSettings", {}, true).then((s) => { setOfficePhone(s?.officePhone || null); setLoading(false); });
  }, []);

  const digits = (officePhone || "").replace(/[^\d]/g, "");
  const messages = [...(adminThread?.messages || [])].reverse();

  return (
    <div className="app-page">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-lg font-bold text-stone-900 mb-1">School Office</h1>
      <p className="text-xs text-stone-400 mb-4">Reach the office directly — the same number you'd already call or text.</p>

      {loading && <p className="text-sm text-stone-400">Loading…</p>}
      {!loading && !digits && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">The school hasn't added a phone number yet — check with them directly for now.</p>
      )}
      {!loading && digits && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <a href={`tel:${digits}`} className="flex flex-col items-center gap-1.5 bg-white border border-stone-200 rounded-xl py-4 hover:border-[#5F9F9E]">
            <Phone size={22} className="text-[#5F9F9E]" />
            <span className="text-xs font-semibold text-stone-700">Call</span>
          </a>
          <a href={`sms:${digits}`} className="flex flex-col items-center gap-1.5 bg-white border border-stone-200 rounded-xl py-4 hover:border-[#5F9F9E]">
            <MessageCircle size={22} className="text-[#5F9F9E]" />
            <span className="text-xs font-semibold text-stone-700">Text</span>
          </a>
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 bg-white border border-stone-200 rounded-xl py-4 hover:border-[#5F9F9E]">
            <MessageCircle size={22} className="text-emerald-600" />
            <span className="text-xs font-semibold text-stone-700">WhatsApp</span>
          </a>
        </div>
      )}

      {messages.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">From the office</p>
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-3.5">
                <p className="text-sm text-stone-700 whitespace-pre-wrap"><LinkifiedText text={m.text} linkClassName="underline text-teal-700 hover:text-teal-900" /></p>
                <p className="text-[10px] text-stone-400 mt-1">{new Date(m.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// A single "+" entry point for attaching anything — consolidates what used to be two or three
// separate icon buttons (photo/video, file, audio) into one menu, the same pattern most modern
// chat composers use (including this very interface). Opens upward since composers live at the
// bottom of the screen. Each option triggers its own native file picker with the right accept
// filter via a picker built on demand — still the browser's own file-selection UI underneath,
// just reached through one consolidated button instead of several competing icons.
export function ChildDailyLogView({ link, onBack }) {
  const [date, setDate] = useState(todayISO());
  const [viewingPhoto, setViewingPhoto] = useState(null);

  const { value: rawData, loaded: hasLoadedOnce } = useLiveJSONLoaded(`class:${link.classId}:kriya:${link.studentId}`, {});
  const classIncidents = useLiveJSON(`class:${link.classId}:incidents`, []);
  const classPhotos = useLiveJSON(`class:${link.classId}:photos`, []);
  const loading = !hasLoadedOnce;

  // display-only now — no write-back. A live onSnapshot subscription can, by Firestore's own
  // documented behavior, deliver a stale, locally-cached version of this document BEFORE the true
  // current server state arrives — and if that stale snapshot happened to look like it contained a
  // duplicate, writing the "cleaned" result back would silently overwrite the real, current,
  // complete document with a stale, incomplete one — a real, reported case of exactly this:
  // data that was genuinely there and visible one day, gone (even looking back at that same past
  // date) the next. This still shows a clean, deduplicated view either way, since that part never
  // touches the actual stored data — it only stops being destructive.
  const { data } = useMemo(() => dedupeDailyLogData(rawData || {}), [rawData]);

  const incidents = (classIncidents || []).filter((i) => i.date === date && (i.studentIds || []).includes(link.studentId));
  const photos = (classPhotos || []).filter((p) => p.date === date && (p.studentIds || []).includes(link.studentId));

  const shiftDate = (deltaDays) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const mood = (data?.mood || []).find((m) => m.date === date);
  const meals = (data?.meals || []).filter((m) => m.date === date);
  const naps = (data?.naps || []).filter((n) => n.date === date);
  const diapers = (data?.diapers || []).filter((d) => d.date === date).sort((a, b) => (a.time < b.time ? -1 : 1));
  const bathroomTrips = (data?.bathroom || []).filter((b) => b.date === date).sort((a, b) => (a.time < b.time ? -1 : 1));
  const checkIns = (data?.checkIns || []).filter((c) => c.date === date).sort((a, b) => (a.checkInTime < b.checkInTime ? -1 : 1));

  const hasAnything = Boolean(mood) || meals.length > 0 || naps.length > 0 || diapers.length > 0 || bathroomTrips.length > 0 || checkIns.length > 0 || incidents.length > 0 || photos.length > 0;

  const Card = ({ color, title, icon: Icon, children }) => {
    const st = TILE_STYLES[color];
    return (
      <div className={`rounded-xl border-2 p-4 flex gap-3 ${st.tileBg} ${st.tileBorder}`}>
        {Icon && (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${st.iconBg}`}>
            <Icon size={18} className={st.iconText} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${st.labelText}`}>{title}</p>
          <div className="text-sm text-stone-700">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-page">
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>}

      <div className="inline-flex items-center gap-0.5 mb-5">
        <button onClick={() => shiftDate(-1)} className="text-stone-400 hover:text-[#5F9F9E] p-3 -m-1 rounded-full hover:bg-stone-100" aria-label="Previous day"><ChevronLeft size={16} /></button>
        <div className="relative py-3">
          <span className="text-sm font-semibold text-stone-800 px-1.5 select-none whitespace-nowrap">{friendlyDateLabel(date)}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()}
            aria-label="Choose a date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <button onClick={() => shiftDate(1)} disabled={date >= todayISO()} className="text-stone-400 hover:text-[#5F9F9E] p-3 -m-1 rounded-full hover:bg-stone-100 disabled:opacity-30" aria-label="Next day"><ChevronRight size={16} /></button>
      </div>

      {loading && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}

      {!loading && !hasAnything && (
        <p className="text-sm text-stone-400 text-center py-8">Nothing logged for this day yet.</p>
      )}

      {!loading && hasAnything && (
        <div className="space-y-3">
          {checkIns.map((c) => (
            <Card key={c.id} color="teal" title="Attendance" icon={Check}>
              In {formatTime12h(c.checkInTime)}{c.checkOutTime ? ` — Out ${formatTime12h(c.checkOutTime)}` : " — still here"}
            </Card>
          ))}
          {mood && (
            <Card color="orange" title="Mood" icon={Smile}>
              {PRESCHOOL_MOOD_OPTIONS.find((m) => m.id === mood.mood)?.emoji} {PRESCHOOL_MOOD_OPTIONS.find((m) => m.id === mood.mood)?.label || mood.mood}
              {mood.note && <span className="block text-stone-500 mt-0.5">{mood.note}</span>}
            </Card>
          )}
          {meals.map((m, i) => {
            const isSnack = m.mealType === "snack-am" || m.mealType === "snack-pm";
            const label = m.mealType === "snack-am" ? "Morning Snack" : m.mealType === "snack-pm" ? "Afternoon Snack" : "Lunch";
            const perItem = m.items && typeof m.items === "object" ? Object.entries(m.items) : null;
            return (
              <Card key={i} color={isSnack ? "fuchsia" : "emerald"} title={label} icon={isSnack ? Apple : Sandwich}>
                {perItem ? (
                  <div className="space-y-0.5">
                    {perItem.map(([item, amountId]) => (
                      <p key={item}>{item}: {MEAL_AMOUNTS.find((a) => a.id === amountId)?.label || amountId}</p>
                    ))}
                  </div>
                ) : (
                  <>Ate: {MEAL_AMOUNTS.find((a) => a.id === m.amount)?.label || m.amount}</>
                )}
                {m.note && <span className="block text-stone-500 mt-0.5">{m.note}</span>}
              </Card>
            );
          })}
          {naps.map((n, i) => (
            <Card key={i} color="indigo" title="Nap" icon={Moon}>
              {n.skipped ? "Didn't nap today" : n.start && !n.end ? `Started ${formatTime12h(n.start)} — still sleeping` : `${formatTime12h(n.start)} – ${formatTime12h(n.end)}`}
              {n.note && <span className="block text-stone-500 mt-0.5">{n.note}</span>}
            </Card>
          ))}
          {diapers.length > 0 && (
            <Card color="rose" title="Diapers" icon={Baby}>
              {diapers.map((d, i) => (
                <p key={i}>{formatTime12h(d.time)} — {DIAPER_TYPES.find((t) => t.id === d.type)?.label || d.type}{d.note && <span className="block text-stone-500">{d.note}</span>}</p>
              ))}
            </Card>
          )}
          {bathroomTrips.length > 0 && (
            <Card color="teal" title="Bathroom" icon={Droplets}>
              {bathroomTrips.map((b, i) => (
                <p key={i}>{formatTime12h(b.time)} — {BATHROOM_TRIP_TYPES.find((t) => t.id === b.type)?.label || b.type}{b.note && <span className="block text-stone-500">{b.note}</span>}</p>
              ))}
            </Card>
          )}
          {incidents.map((inc) => (
            <Card key={inc.id} color="cyan" title="Health / incident note" icon={HeartPulse}>
              {inc.description}
              {(inc.media || []).length > 0 && (
                <div className={`grid gap-1.5 mt-2 ${inc.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {inc.media.map((m, i) => (
                    <button key={i} onClick={() => setViewingPhoto({ url: m.url, caption: inc.description, type: m.type })}
                      className="relative aspect-square rounded-lg overflow-hidden bg-white">
                      {m.type === "video" ? (
                        <>
                          <video src={m.url} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="bg-white/90 rounded-full p-2"><Play size={14} fill="currentColor" className="text-stone-800 ml-0.5" /></div>
                          </div>
                        </>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {photos.length > 0 && (
            <Card color="amber" title="Photos" icon={Camera}>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {photos.map((p) => (
                  <button key={p.id} onClick={() => setViewingPhoto(p)} className="aspect-square rounded-lg overflow-hidden bg-white">
                    <img src={p.url} alt={p.caption || "Class photo"} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      {viewingPhoto && (
        <PhotoLightbox url={viewingPhoto.url} type={viewingPhoto.type || "photo"} caption={viewingPhoto.caption} onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  );
}

// Self-contained, like ChildDailyLogView — fetches directly by classId rather than depending on
// ClassApp's own closures, since a parent isn't inside any one class's context and may have
// children in several different classes at once.
export function ParentBlogView({ link, family, onBack }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // scrollContainerRef is the scrollable region itself; contentRef is what's actually growing
  // inside it (images settling into their final size, fonts swapping in) — see useStickToBottom
  // for why both are needed to genuinely land at, and stay at, the true bottom rather than
  // wherever it happened to be at the exact instant of the first scroll.
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);
  // The outer wrapper itself — needed so useRemainingViewportHeight can measure exactly how much
  // space genuinely remains below it (accounting for the app's own sticky header above this view),
  // rather than assuming the full screen height is available, which isn't true here.
  const outerRef = useRef(null);
  // Bounds this view to exactly the visible height and makes its own post list independently
  // scrollable within that — see the matching reasoning just below, on why that's what actually
  // lets this land at the bottom with zero visible adjustment, during a swipe included, not just
  // on a direct tap.
  const viewportHeight = useRemainingViewportHeight(outerRef);
  const reactorId = family.familyGroupId || family.uid; // shared per family, same identity messages already use
  const authorName = family.name || "A family";

  // Same fix, same reasoning as ChildDailyLogView's own — a teacher posting a blog update should
  // reach a parent automatically, not only the next time this screen happens to remount.
  // Live-subscribed rather than one-time loaded.
  const { value: posts, loaded: postsLoaded } = useLiveJSONLoaded(`class:${link.classId}:blogPosts`, []);
  const config = useLiveJSON(`class:${link.classId}:config`, {});
  const commentsEnabled = config?.blogCommentsEnabled !== false;
  const loading = !postsLoaded;

  // Lands on the newest post the instant this screen is actually visible, and — unlike a single
  // scrollIntoView on mount — stays there through anything that grows the feed afterward (an
  // image's real size replacing its reserved box, a font swapping in), during an in-progress swipe
  // included, not just on a direct tap. Safe to run immediately even as a live swipe-preview pane,
  // since this view's own post list is its own independently-scrollable region, not something that
  // moves the page itself.
  useStickToBottom(scrollContainerRef, contentRef, link.classId);

  // The live subscription above picks up this write automatically — no local state to update by
  // hand, and no risk of it drifting from what's actually saved.
  const persist = (next) => { saveJSON(`class:${link.classId}:blogPosts`, next, true); };

  // One reaction per person per post OR per block (blockId optional — omitted means "the whole
  // post," matching the original behavior for any post that's just one simple block anyway).
  // Reacting to a specific block is what actually lets someone react to just their own child's
  // photo in a longer post with several parts, instead of only ever reacting to the post overall.
  // Goes through a backend endpoint rather than writing the reaction directly — a client-side
  // write can't be trusted to honestly report who's reacting (the id and name are just fields in
  // a request body, and Firestore's own rule for this document can only validate that the array's
  // overall length doesn't change, not which specific entry changed or who's allowed to touch
  // it), so this hands off to a server that determines identity itself, from the caller's own
  // verified, signed-in account — never from anything the client sends.
  const onReact = async (postId, emoji, blockId) => {
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/blog-react", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ classId: link.classId, postId, blockId, emoji }),
      });
      const data = await res.json();
      // The live subscription above picks up the server's own write automatically — nothing to
      // apply locally here.
      if (!res.ok) throw new Error(data.error || "Reaction failed");
    } catch {
      // best-effort — if this fails, the post simply doesn't show the reaction; nothing to roll back
    }
  };

  const onComment = (postId, text) => {
    if (!text.trim()) return;
    const comment = { id: uid(), text: text.trim(), authorName, authorType: "family", timestamp: new Date().toISOString() };
    persist(posts.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p)));
  };

  const sorted = [...posts].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  // Flattened in the same chronological order the feed renders in, so swiping through the
  // lightbox moves through every photo and video in the whole blog, not just the batch in
  // whichever post you happened to tap into — the same feel as opening a photo in a chat and
  // swiping through everything shared, not just one message's attachments.
  const allMedia = sorted.flatMap((post) =>
    post.blocks.flatMap((block) => {
      const media = block.media || [
        ...(block.photoUrls || []).map((url) => ({ url, type: "photo" })),
        ...(block.videoUrl ? [{ url: block.videoUrl, type: "video" }] : []),
      ];
      return media.map((m) => ({ ...m, caption: block.text }));
    })
  );
  const openMedia = (url) => {
    const idx = allMedia.findIndex((m) => m.url === url);
    if (idx !== -1) setLightboxIndex(idx);
  };

  return (
    <div ref={outerRef} className="app-page flex flex-col" style={{ height: viewportHeight ? `${viewportHeight}px` : "100vh" }}>
      {onBack && <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3 shrink-0"><ChevronLeft size={16} /> Back</button>}

      {/* This is the piece that actually makes "already at the bottom, no visible adjustment"
          possible during a live swipe preview, not just a direct tap — its own bounded,
          independently-scrollable region, separate from the page itself. Scrolling THIS div to
          its own bottom never touches window scroll, so it's safe to do immediately, even while
          this is only rendering as a preview of wherever an in-progress swipe is headed and some
          other tab is still the one actually on screen. */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div ref={contentRef}>
          {/* Scrolls away with the rest of the feed, same as it always did — this only needed to
              move inside the scrollable region, not become fixed above it. */}
          <div className="flex items-center gap-2.5 mb-5 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
            <img src="/parent-logo-transparent.png" alt="" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <h1 className="display-font text-base font-bold text-stone-900 truncate">{link.className}</h1>
              <p className="text-[11px] text-stone-400">Class Blog</p>
            </div>
          </div>
          {loading && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
          {!loading && sorted.length === 0 && (
            <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-8 text-center">Nothing posted here yet.</p>
          )}
          {!loading && sorted.length > 0 && (
            <>
              <p className="text-center text-[11px] text-stone-400 mb-4">Beginning of the class blog</p>
              <div className="space-y-4">
                {sorted.map((post) => (
                  <BlogPostCard key={post.id} post={post} currentUserId={reactorId} onReact={onReact}
                    commentsEnabled={commentsEnabled} onComment={onComment} onOpenMedia={openMedia} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {lightboxIndex !== null && allMedia[lightboxIndex] && (
        <PhotoLightbox url={allMedia[lightboxIndex].url} type={allMedia[lightboxIndex].type} caption={allMedia[lightboxIndex].caption}
          mediaList={allMedia} currentIndex={lightboxIndex} onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}

// Persistent top bar for the parent side, matching the same pattern the teacher side already
// uses — Home, Messages, Blog, and Settings always one tap away, instead of icons buried in the
// header or a full-screen overlay you have to back out of to reach anything else.
// A grounded, connected row rather than separate floating pills — same underline-tab feel as the
// main navigation bar above it, so switching between children (or between classes) reads as part
// of the app's structure rather than loose buttons sitting on the page.
// The last word in a name is treated as the last name, whatever it is — a student's own record
// never actually separates first and last name as distinct fields, so this is the one rule that
// holds up across every name shape that shows up in practice: "Ezra" (one word, kept as-is, since
// dropping it would leave nothing), "Ezra Cohen" (drop "Cohen"), "Miriam Rivka Goldstein" (drop
// only "Goldstein", keeping the middle name intact).
export function firstNameOnly(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] || "");
}

// Turns the one shared selectedStudentId back into "which index is that, in THIS tab's own
// list" — a small, repeatable lookup rather than one big derived value computed once, since nothing
// guarantees every place that needs it runs after a single shared computation would have been
// defined, and each tab's own list (links, by studentId) is shaped differently enough (Home and
// Homework keyed by studentId directly, Messages the same, Blog by classId instead) that a single
// shared formula couldn't cover all of them anyway. Falls back to 0 — the first entry — whenever
// selectedStudentId is still unset (nothing tapped yet) or doesn't appear in this particular list
// at all (a child who isn't in this tab's own filtered set, like a part-time child on the
// full-time-only Home tab).
export function findChildIndex(links, studentId) {
  if (!studentId) return 0;
  const idx = (links || []).findIndex((l) => l.studentId === studentId);
  return idx >= 0 ? idx : 0;
}

// A family's own name is whatever was typed when the account was created — sometimes an actual
// person's name ("Sarah Cohen"), sometimes a household-style name ("The Cohen Family"). "The" and
// "Family" are filtered out either way, since neither is ever the part someone would actually
// recognize as their own initials — from whatever's left, first-letter-of-first-word plus
// first-letter-of-last-word (or just the one letter, for a single remaining word).
export function getInitials(fullName) {
  const stopWords = new Set(["the", "family", "and"]);
  const words = (fullName || "").trim().split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function ChildSwitcher({ labels, selectedIndex, onSelect }) {
  const containerRef = useRef(null);
  const BASE_PX = 14; // text-sm, the largest size a name is ever shown at
  const MIN_PX = 10; // never shrinks past this, however many children or however long a name
  const MIN_MARGIN_PX = 12; // guaranteed clear space on either side of every name's own text — enforced twice, once as real CSS padding (so it's a hard floor no measurement error can violate) and once in the measurement below (so a name is never allowed to merely reach that padding's edge)
  const displayLabels = labels.map(firstNameOnly);
  const [fontPx, setFontPx] = useState(BASE_PX);

  // Canvas text measurement instead of a render-measure-adjust-rerender loop — one pass, no
  // flicker, and (this is the part a loop can't do) it finds the single scale factor every name
  // shares. Shrinking is deliberately uniform: if only the longest name shrank to fit its own
  // space, the row would look inconsistent and arbitrary — every button's text is the exact same
  // size as every other's, always, so what makes one narrower is only ever the name itself being
  // shorter, never a different font size doing the work.
  const measureAndFit = useCallback(() => {
    const container = containerRef.current;
    if (!container || displayLabels.length === 0) return;
    const containerWidth = container.getBoundingClientRect().width;
    if (containerWidth === 0) return;
    const dividerWidth = (displayLabels.length - 1) * 1; // one 1px border between each pair of adjacent buttons
    const perButtonWidth = (containerWidth - dividerWidth) / displayLabels.length;
    const availableTextWidth = perButtonWidth - MIN_MARGIN_PX * 2;

    if (!measureAndFit.canvas) measureAndFit.canvas = document.createElement("canvas");
    const ctx = measureAndFit.canvas.getContext("2d");
    ctx.font = `600 ${BASE_PX}px Inter, sans-serif`;

    let minScale = 1;
    for (const label of displayLabels) {
      // A small safety margin on top of the raw measurement — canvas font metrics can come out
      // very slightly different from the browser's own text layout (most often because the real
      // font hadn't finished loading yet the instant this ran), and this is what keeps that gap
      // from ever actually costing a name its promised margin.
      const textWidth = ctx.measureText(label).width * 1.06;
      if (textWidth > availableTextWidth) {
        const scale = availableTextWidth / textWidth;
        if (scale < minScale) minScale = scale;
      }
    }
    setFontPx(Math.max(MIN_PX, BASE_PX * minScale));
  }, [displayLabels]);

  useLayoutEffect(() => { measureAndFit(); }, [measureAndFit]);
  useEffect(() => {
    // This first pass can run before the real 'Inter' web font has actually finished loading —
    // web fonts load asynchronously, and useLayoutEffect fires synchronously before paint, so
    // there's a real window where the canvas measures against whatever fallback system font the
    // browser has on hand instead. If that fallback happens to be narrower than the real Inter,
    // the size this settles on reads as safe at that moment but is actually too large for the
    // real font that then renders — exactly the "touching the edge" gap a fixed safety-margin
    // number alone can't close, since the problem isn't the margin being too thin, it's the
    // measurement itself being taken against the wrong font. document.fonts.ready is the browser's
    // own signal for "every font actually being used on this page has now loaded" — re-measuring
    // once it resolves catches and corrects for this even on the rare load where it happens.
    document.fonts?.ready?.then(() => measureAndFit());
    const onResize = () => measureAndFit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureAndFit]);

  return (
    // No longer sticky itself — this now lives inside the main header, which is already sticky at
    // the page level, so a second, independent sticky position here would just be redundant. This
    // is also exactly what fixes a real bug the old placement had: during an active swipe,
    // renderTabContent runs twice at once (the real tab, and a live preview of wherever the drag
    // is headed), and each one was rendering its OWN sticky copy of this bar independently — which
    // is what produced two overlapping bars mid-drag instead of one settled one. A single instance
    // living in the header can't be duplicated that way, and never moves during a swipe at all,
    // since it was never part of the swiped content to begin with.
    <div ref={containerRef} className="flex bg-white border-t border-stone-200 overflow-hidden">
      {displayLabels.map((label, i) => (
        <button key={i} onClick={() => onSelect(i)} style={{ fontSize: `${fontPx}px` }}
          className={`flex-1 py-2.5 px-3 font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-center ${i > 0 ? "border-l border-l-stone-200" : ""} ${selectedIndex === i ? "text-white bg-[#5F9F9E]" : "text-stone-500 hover:bg-stone-50"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Split out from an inline expression specifically so it can use its own effect — marking a
// class's blog as read has to happen when THAT class is actually the one being looked at, and
// needs to re-fire every time the switcher changes which one that is.
export function ParentBlogTabContent({ uniqueClasses, selectedIndex, family, onMarkRead }) {
  const selectedLink = uniqueClasses[selectedIndex] || uniqueClasses[0];
  useEffect(() => {
    if (selectedLink) onMarkRead(selectedLink.classId);
  }, [selectedLink?.classId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <ParentBlogView link={selectedLink} family={family} />;
}

// Per-child, not per-class like the blog switcher above — a parent thinks "my daughter's
// homework," not "this class's homework," even on the rare case where two siblings share a
// class and would see identical content either way.
// Same fix, same reasoning as ChildDailyLogView's own — a teacher posting homework should reach
// a parent automatically, not only the next time this screen happens to remount. Live-subscribed
// rather than one-time loaded.
export function ParentHomeworkView({ link }) {
  const { value: posts, loaded } = useLiveJSONLoaded(`class:${link.classId}:homework`, []);

  if (!loaded) return <p className="text-sm text-stone-400 text-center py-8">Loading…</p>;
  const sorted = [...posts].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)); // newest first — homework is "what's due," not a scrollable history

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-8 text-center">No homework posted yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((post) => (
            <div key={post.id} className="bg-white border border-stone-200 border-l-4 border-l-[#5F9F9E] rounded-xl p-4">
              <p className="text-sm font-bold text-[#4a8483] mb-1.5">
                {post.cadence === "weekly" ? "This week's homework" : "Today's homework"}
                <span className="ml-2 text-[10px] font-semibold text-stone-400">{new Date(post.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
              </p>
              {post.text && <p className="text-sm text-stone-700 whitespace-pre-wrap mb-2"><LinkifiedText text={post.text} linkClassName="underline text-teal-700 hover:text-teal-900" /></p>}
              {post.text && extractFirstUrl(post.text) && <LinkPreviewCard url={extractFirstUrl(post.text)} />}
              {post.attachmentType === "photo" && post.attachmentUrl && (
                <img src={post.attachmentUrl} alt="" className="w-full max-h-56 object-cover rounded-lg" />
              )}
              {post.attachmentType === "video" && post.attachmentUrl && (
                <video src={post.attachmentUrl} controls playsInline className="w-full max-h-56 bg-black rounded-lg" />
              )}
              {post.attachmentType === "audio" && post.attachmentUrl && (
                <div className="mb-1">
                  {post.attachmentName && (
                    <p className="text-[11px] font-semibold text-stone-500 truncate mb-1">{post.attachmentName}</p>
                  )}
                  <audio src={post.attachmentUrl} controls className="w-full" style={{ height: "36px" }} />
                </div>
              )}
              {post.attachmentType === "file" && post.attachmentUrl && (
                <a href={post.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 bg-stone-50">
                  <FileText size={16} className="text-stone-500" />
                  <span className="text-xs font-semibold text-stone-700 truncate">{post.attachmentName || "Attached file"}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The elementary counterpart to the preschool side's daily-log card on Home — shown instead of it
// for a child whose class isn't preschool, since the QR check-in system and mood/meals/naps
// logging are both preschool-specific and were previously shown (misleadingly) for every child
// regardless of type. A compact preview of the most recent homework, not the full history — this
// is meant to give an elementary-linked family something genuinely useful to land on rather than
// an empty "nothing logged" card that never applied to their child in the first place, while the
// full Homework tab (linked at the bottom) stays the place for anything beyond the latest post.
// Same fix, same reasoning as ParentHomeworkView's own — this preview card lives on the parent's
// Home screen, the very first thing they see, and had the exact same one-time-load bug
// independently of the full Homework tab. A card shown first, checked most often, is exactly
// where a gap like this would be noticed fastest — and exactly where it was still there.
export function HomeworkPreviewCard({ link, onSeeAll }) {
  const { value: posts, loaded } = useLiveJSONLoaded(`class:${link.classId}:homework`, []);

  if (!loaded) return <p className="text-sm text-stone-400 text-center py-8">Loading…</p>;
  const sorted = [...posts].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const latest = sorted[0];

  return (
    <div className="bg-white border-2 border-stone-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Homework</p>
        {sorted.length > 0 && (
          <button onClick={onSeeAll} className="text-xs font-semibold text-teal-700 hover:text-teal-900">See all</button>
        )}
      </div>
      {!latest ? (
        <p className="text-sm text-stone-400">No homework posted yet.</p>
      ) : (
        <div>
          <p className="text-sm font-bold text-stone-900 mb-1">
            {latest.cadence === "weekly" ? "This week's homework" : "Today's homework"}
            <span className="ml-2 text-[10px] font-semibold text-stone-400">{new Date(latest.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
          </p>
          {latest.text && <p className="text-sm text-stone-700 whitespace-pre-wrap line-clamp-3"><LinkifiedText text={latest.text} linkClassName="underline text-teal-700 hover:text-teal-900" /></p>}
          {latest.attachmentType === "photo" && latest.attachmentUrl && (
            <img src={latest.attachmentUrl} alt="" className="w-full max-h-40 object-cover rounded-lg mt-2" />
          )}
        </div>
      )}
    </div>
  );
}


export function ParentHomeworkTabContent({ links, selectedIndex, onMarkRead }) {
  const selectedLink = links[selectedIndex] || links[0];
  useEffect(() => {
    if (selectedLink) onMarkRead(selectedLink.classId);
  }, [selectedLink?.classId, selectedLink?.studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <ParentHomeworkView link={selectedLink} />;
}

export function ParentMainTabs({ active, navigate, unreadMessagesCount = 0, unreadBlogCount = 0, unreadHomeworkCount = 0, showHomework = true }) {
  const tabs = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "messages", label: "Messages", icon: MessageCircle, count: unreadMessagesCount },
    { id: "blog", label: "Blog", icon: Newspaper, count: unreadBlogCount },
    ...(showHomework ? [{ id: "homework", label: "Homework", icon: FileText, count: unreadHomeworkCount }] : []),
  ];
  return (
    <div className="flex overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => navigate(t.id)}
            className={`flex-1 shrink-0 flex items-center justify-center py-3 text-xs sm:text-sm font-semibold whitespace-nowrap px-1 ${isActive ? "text-[#F15A61]" : "text-stone-400"}`}>
            <span className="relative inline-flex items-center gap-1 sm:gap-1.5">
              <Icon size={14} /> {t.label}
              <TabBadge count={t.count} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ParentPortalApp({ family, onSignOut, onUpdateName, onChangeMyPassword, canSwitchToTeacher, onSwitchToTeacher }) {
  const [parentTab, setParentTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "home"); // "home" | "messages" | "blog" | "homework" | "settings" — persistent top bar, not a toggled overlay

  // Every tab switch gets its own real, individually-poppable history entry now — a parent
  // stepping back should always land exactly one step behind wherever they actually were, never
  // skip past several taps at once or land outside the app entirely. An earlier version of this
  // used replaceState instead, on the theory that a long session of tab-hopping would otherwise
  // make the back button feel like it's replaying every tap one at a time — but the real-world
  // cost of that turned out to be worse: with nothing but a single, constantly-overwritten history
  // entry for the whole parent portal, pressing back from ANY tab could skip straight past the
  // entire portal to whatever came before it, which is exactly the "sometimes it closes the app"
  // behavior this exists to fix. Precise, one-step-at-a-time back navigation is worth the tradeoff.
  const navigateParentTab = (newTab) => {
    setParentTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState({ parentTab: newTab }, "", url);
  };
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setParentTab(params.get("tab") || "home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Horizontal swipe between tabs, the same way WhatsApp's own Chats/Updates/Communities tabs
  // work — same tab order as the bar itself, so swiping and tapping always agree about what
  // "next" means. Deliberately requires the gesture to be clearly MORE horizontal than vertical
  // (not just "moved sideways at all") before treating it as a tab swipe rather than a scroll —
  // most of what a finger does on a content-heavy page is scroll straight down, and a swipe
  // detector that fires on any diagonal wobble would fight that constantly instead of staying out
  // of its way.
  //
  // Tracks live position during the drag, not just the gesture's final result — this is what
  // actually makes it slide with the finger instead of the old behavior, where nothing visible
  // happened until the finger lifted and the next tab just appeared. dragOffsetPx follows the
  // finger 1:1 while a drag is active (no CSS transition applied during that phase, so there's no
  // lag behind the finger); on release, a short transition either finishes the slide the rest of
  // the way (committing the tab change) or springs back to 0 (rejecting a swipe that didn't go far
  // enough), and only THEN does dragTargetTab clear, so the incoming tab's placeholder stays
  // visible through the whole animation instead of popping away mid-transition.
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [dragTargetTab, setDragTargetTab] = useState(null);
  const [dragAnimating, setDragAnimating] = useState(false);
  const swipeStart = useRef(null);
  const swipeTrackWidth = useRef(390);

  const onTabAreaTouchStart = (e) => {
    if (parentTab === "settings" || dragAnimating) return; // My Account isn't part of the swipeable sequence
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, decided: false, horizontal: false };
    swipeTrackWidth.current = e.currentTarget.getBoundingClientRect().width || window.innerWidth;
  };

  const onTabAreaTouchMove = (e) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    if (!swipeStart.current.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // too small yet to tell scroll from swipe apart
      swipeStart.current.decided = true;
      swipeStart.current.horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
      if (swipeStart.current.horizontal) {
        const currentIdx = swipeOrder.indexOf(parentTab);
        const targetIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
        setDragTargetTab(targetIdx >= 0 && targetIdx < swipeOrder.length ? swipeOrder[targetIdx] : null);
      }
    }
    if (!swipeStart.current.horizontal) return;
    // Claims the gesture once it's decided to be horizontal — see the useEffect below that
    // attaches this as a real, non-passive native listener for why a plain JSX onTouchMove prop
    // can't actually make preventDefault() stick (confirmed directly: React marks touchmove as
    // passive by default since React 17, so the synthetic event reports defaultPrevented=true
    // while the real underlying browser event does not, and the browser's own console says so).
    // Without it actually taking effect, the native scroll/bounce keeps running alongside this
    // JS-driven transform, the two fighting over the same finger movement.
    e.preventDefault();
    // Clamped so dragging past either end of the sequence (no adjacent tab to reveal) shows a
    // little resistance instead of an empty gap sliding into view.
    const clamped = dragTargetTab ? dx : dx * 0.25;
    setDragOffsetPx(clamped);
  };
  // A callback ref, not a useRef+useEffect pair — see the matching, fuller comment on the teacher
  // side's own version of this for why: React guarantees to call this exactly when the DOM node
  // itself mounts or unmounts, which a useEffect tied to a dependency array isn't reliably able to
  // promise.
  const attachedSwipeNode = useRef(null);
  const latestTouchMove = useRef(onTabAreaTouchMove);
  latestTouchMove.current = onTabAreaTouchMove;
  const swipeContainerRef = useCallback((node) => {
    if (attachedSwipeNode.current) {
      attachedSwipeNode.current.removeEventListener("touchmove", attachedSwipeNode.current._swipeListener);
      attachedSwipeNode.current = null;
    }
    if (node) {
      const listener = (e) => latestTouchMove.current(e);
      node.addEventListener("touchmove", listener, { passive: false });
      node._swipeListener = listener;
      attachedSwipeNode.current = node;
    }
  }, []);

  const onTabAreaTouchEnd = () => {
    if (!swipeStart.current?.horizontal) { swipeStart.current = null; return; }
    swipeStart.current = null;
    const committed = dragTargetTab && Math.abs(dragOffsetPx) > swipeTrackWidth.current * 0.3;
    setDragAnimating(true);
    if (committed) {
      const finalOffset = dragOffsetPx < 0 ? -swipeTrackWidth.current : swipeTrackWidth.current;
      setDragOffsetPx(finalOffset);
      setTimeout(() => {
        navigateParentTab(dragTargetTab);
        setDragOffsetPx(0);
        setDragTargetTab(null);
        setDragAnimating(false);
      }, 220);
    } else {
      setDragOffsetPx(0);
      setTimeout(() => { setDragTargetTab(null); setDragAnimating(false); }, 220);
    }
  };

  // Same global "what's actually on screen right now" flag used by ConversationThreadView — kept
  // in sync with parentTab directly here since Blog and Homework are simple tab switches within
  // this same component, not separately-mounted screens with their own lifecycle to hook into.
  useEffect(() => {
    window.__activeContent = { ...(window.__activeContent || {}), tab: parentTab };
  }, [parentTab]);

  const [showScanner, setShowScanner] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  // Starts active on this account's first-ever login (no separate wizard, no explicit "start
  // tour" step) and never again once dismissed — tracked per individual guardian login, not
  // shared across a family group, since a newly-added second guardian should still get their own
  // first-time walkthrough even if the first guardian already saw and dismissed theirs.
  const [tourStep, setTourStep] = useState(() => (family?.onboardingSeen ? null : 0));
  const TOUR_TOTAL_STEPS = 3;
  const dismissTour = () => {
    setTourStep(null);
    saveJSON(`family:${family.uid}`, { ...family, onboardingSeen: true }, true);
  };
  const advanceTour = () => {
    // Steps 2 and 3 (QR check-in, daily log) are both preschool-specific now — neither one has
    // anything to attach to if the currently selected child isn't preschool, so this jumps
    // straight to done from step 1 in that case, the same way it already did when there were no
    // linked children at all to point at.
    const selectedLink = (fullTimeStudentLinks || [])[findChildIndex(fullTimeStudentLinks, selectedStudentId)] || (fullTimeStudentLinks || [])[0];
    const noPreschoolChild = !selectedLink || selectedLink.classType !== "preschool";
    if (tourStep === 0 && noPreschoolChild) { dismissTour(); return; }
    if (tourStep >= TOUR_TOTAL_STEPS - 1) dismissTour();
    else setTourStep((s) => s + 1);
  };
  // One shared "which child am I looking at" instead of four separate, unrelated indexes — a
  // parent who taps their third child on Home and then swipes to Messages, Homework, or Blog
  // should land on that same child there too, not bounce back to whichever child happens to sit
  // first in that tab's own list. Tracked by the child's own studentId, not a raw index, since
  // each tab's own array can be ordered or filtered differently (Blog in particular switches by
  // CLASS, not by child, so two siblings sharing a class collapse into a single entry there) — an
  // index that meant "third child" on Home would point at a completely different child, or
  // nothing at all, once carried over to a tab whose list doesn't line up the same way.
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Blog and homework both only ever come from a student's full-time class — a part-time or
  // specific-periods enrollment (combined with another room for a subject or two) doesn't carry
  // homework or blog posts from that room, since that teacher isn't the one actually assigning
  // it there. Scope lives on the live class roster, not on the family's own link, so this checks
  // the current source of truth rather than a copy that could drift out of date. classType is
  // fetched alongside it — homework specifically only ever applies to elementary classes, so this
  // is what lets the tab tell an elementary link apart from a preschool one.
  const [fullTimeStudentLinks, setFullTimeStudentLinks] = useState(null); // null = still loading
  // Declared here, after fullTimeStudentLinks rather than up with the rest of the swipe state —
  // that earlier position caused a genuine crash: this line reads fullTimeStudentLinks, which
  // hadn't been declared yet at that point in the component body. JavaScript's const/let bindings
  // aren't hoisted the way var or function declarations are, so reading one before its own
  // declaration line has executed throws, rather than just seeing undefined. Safe to reference
  // from onTabAreaTouchMove above despite appearing after it in the file, since that function
  // only actually runs on a real touch event — long after this whole render pass, this line
  // included, has already completed.
  const swipeOrder = ["home", "messages", "blog", ...((fullTimeStudentLinks || []).some((l) => l.classType !== "preschool") ? ["homework"] : [])];
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const links = family?.studentLinks || [];
      const results = [];
      for (const link of links) {
        const roster = await loadJSON(`class:${link.classId}:roster`, [], true); // eslint-disable-line no-await-in-loop
        const scope = roster.find((s) => s.id === link.studentId)?.enrollmentScope;
        if (!scope || scope === "full-time") {
          const linkConfig = await loadJSON(`class:${link.classId}:config`, null, true); // eslint-disable-line no-await-in-loop
          results.push({ ...link, classType: linkConfig?.classType || "elementary" });
        }
      }
      if (!cancelled) setFullTimeStudentLinks(results);
    })();
    return () => { cancelled = true; };
  }, [family]);

  const [checkInStatus, setCheckInStatus] = useState({}); // studentId -> { isIn, sinceTime }
  // A scan doesn't perform anything by itself — it only unlocks the ability to act, which then
  // has to be used deliberately per child. Locks again the moment they leave this screen, so
  // getting back to it always means scanning again, not something that stays open in the
  // background after they've actually left the school.
  const [actionUnlocked, setActionUnlocked] = useState(false);
  const [confirmingRepeatChild, setConfirmingRepeatChild] = useState(null);
  const [messagingClassId, setMessagingClassId] = useState(null); // classId of the conversation currently open, or null
  const [messagingAdmin, setMessagingAdmin] = useState(false);
  const [messagingTeacherUid, setMessagingTeacherUid] = useState(null); // uid of the individual teacher thread currently open, or null
  // Captured right before markThreadRead overwrites it — opening a thread marks it read
  // immediately, so by the time ConversationThreadView actually renders, the stored read-state
  // already says "now." Without holding onto this earlier value separately, there'd be no way to
  // tell which messages were genuinely still unread at the moment the thread was opened, which is
  // exactly what the "new messages start here" divider inside the conversation needs to know.
  const [lastReadBeforeOpen, setLastReadBeforeOpen] = useState(null);
  const [eligibleTeachers, setEligibleTeachers] = useState(null); // null while loading; [] once loaded with none
  const [unreadThreads, setUnreadThreads] = useState([]); // [{ threadKey, kind, classId, title, preview, timestamp }]
  const [unreadBlogCount, setUnreadBlogCount] = useState(0); // total new posts across every linked class

  // Every conversation key below uses the family GROUP id, not this specific login's own uid —
  // so a second guardian, signed in under their own separate account, lands on the exact same
  // threads as the first guardian, rather than starting empty ones nobody else can see. Falls
  // back to this account's own uid for the (very common) case of a family that's never added a
  // second guardian, where the group id and the individual uid are the same thing anyway.
  const myGroupId = family.familyGroupId || family.uid;

  // Live-subscribed, not loaded once — whichever of these three is actually open updates the
  // instant a new message lands, on either side of the conversation, with nobody needing to back
  // out and reopen the thread (or reload the whole app) to see it arrive. Only ever one of the
  // three is actually open at a time, so the other two's key is null and they simply hold their
  // fallback rather than run an idle subscription for a screen nobody's looking at.
  // Keyed by family.uid — this login's own uid — not myGroupId. Classroom messages are now a
  // private line between this specific guardian and the classroom's teachers, the same way an
  // individual teacher thread already was: two guardians of the same family get two separate
  // conversations, neither seeing what the other sent or received, even though both still see the
  // same classroom, the same roster, and the same children.
  const messagingThread = useLiveJSON(messagingClassId ? `class:${messagingClassId}:messages:${family.uid}` : null, { messages: [] });
  // Keyed by family.uid, not myGroupId — the office thread is now private per guardian too, the
  // same reasoning as messagingThread above.
  const adminThread = useLiveJSON(messagingAdmin ? `admin-messages:${family.uid}` : null, { messages: [] });
  // Keyed by family.uid — this specific login's own uid. Every conversation thread (classroom,
  // office, individual teacher) is now a private line for this one guardian — myGroupId is used
  // only for things genuinely still shared across the whole family, like linking students.
  const teacherMessagingThread = useLiveJSON(messagingTeacherUid ? `teacher-messages:${messagingTeacherUid}:${family.uid}` : null, { messages: [] });

  // Checked fresh each time the home screen loads — there's no live push here, so "new message"
  // means "new since I last opened this app," not an instant alert the moment it's sent.
  const refreshUnreadThreads = useCallback(async () => {
    const classLinks = [...new Map((family?.studentLinks || []).map((l) => [l.classId, l])).values()];
    const readState = await getReadState(family.uid);
    const results = [];
    for (const l of classLinks) {
      const thread = await loadJSON(`class:${l.classId}:messages:${family.uid}`, { messages: [] }, true); // eslint-disable-line no-await-in-loop
      const last = thread?.messages?.[thread.messages.length - 1];
      if (isThreadUnread(readState, `class-${l.classId}`, last, "family")) {
        const unreadCount = countUnreadInThread(readState, `class-${l.classId}`, thread.messages, "family");
        results.push({ threadKey: `class-${l.classId}`, kind: "class", classId: l.classId, title: l.className, preview: last.text, senderName: last.senderName, timestamp: last.timestamp, unreadCount });
      }
    }
    const adminThreadData = await loadJSON(`admin-messages:${family.uid}`, { messages: [] }, true);
    const lastAdmin = adminThreadData?.messages?.[adminThreadData.messages.length - 1];
    if (isThreadUnread(readState, `admin-${family.uid}`, lastAdmin, "family")) {
      const unreadCount = countUnreadInThread(readState, `admin-${family.uid}`, adminThreadData.messages, "family");
      results.push({ threadKey: `admin-${family.uid}`, kind: "admin", title: "School Office", preview: lastAdmin.text, senderName: lastAdmin.senderName, timestamp: lastAdmin.timestamp, unreadCount });
    }
    // Individual teacher threads were never actually included here at all before, despite the
    // Messages list checking unreadThreads for a matching teacher-{uid} entry to decide whether to
    // show a dot next to each one — that dot could never have lit up, since nothing ever populated
    // the data it was looking for.
    for (const t of eligibleTeachers || []) {
      const thread = await loadJSON(`teacher-messages:${t.uid}:${family.uid}`, { messages: [] }, true); // eslint-disable-line no-await-in-loop
      const last = thread?.messages?.[thread.messages.length - 1];
      if (isThreadUnread(readState, `teacher-${t.uid}`, last, "family")) {
        const unreadCount = countUnreadInThread(readState, `teacher-${t.uid}`, thread.messages, "family");
        results.push({ threadKey: `teacher-${t.uid}`, kind: "teacher", title: t.name, preview: last.text, senderName: last.senderName, timestamp: last.timestamp, unreadCount });
      }
    }
    setUnreadThreads(results);
  }, [family, eligibleTeachers]);

  useEffect(() => { refreshUnreadThreads(); }, [refreshUnreadThreads]);
  useEffect(() => {
    const interval = setInterval(refreshUnreadThreads, 45000);
    return () => clearInterval(interval);
  }, [refreshUnreadThreads]);

  // Same read-state document as messages, just a different key shape per class
  // ("blog-{classId}" instead of "class-{classId}") — a post counts as new if it's newer than
  // the last time this class's blog was actually opened, not just newer than account creation.
  const refreshUnreadBlogCount = useCallback(async () => {
    if (!fullTimeStudentLinks) return;
    const uniqueClasses = [...new Map(fullTimeStudentLinks.map((l) => [l.classId, l])).values()];
    const readState = await getReadState(family.uid);
    let total = 0;
    for (const l of uniqueClasses) {
      const posts = await loadJSON(`class:${l.classId}:blogPosts`, [], true); // eslint-disable-line no-await-in-loop
      const lastRead = readState[`blog-${l.classId}`];
      total += posts.filter((p) => !lastRead || new Date(p.timestamp) > new Date(lastRead)).length;
    }
    setUnreadBlogCount(total);
  }, [family, fullTimeStudentLinks]);

  useEffect(() => { refreshUnreadBlogCount(); }, [refreshUnreadBlogCount]);
  useEffect(() => {
    const interval = setInterval(refreshUnreadBlogCount, 45000);
    return () => clearInterval(interval);
  }, [refreshUnreadBlogCount]);

  const markBlogRead = async (classId) => {
    const posts = await loadJSON(`class:${classId}:blogPosts`, [], true);
    const latest = posts[posts.length - 1];
    if (latest) await markThreadRead(family.uid, `blog-${classId}`);
    refreshUnreadBlogCount();
  };

  const [unreadHomeworkCount, setUnreadHomeworkCount] = useState(0);
  const refreshUnreadHomeworkCount = useCallback(async () => {
    if (!fullTimeStudentLinks) return;
    const uniqueClasses = [...new Map(fullTimeStudentLinks.filter((l) => l.classType !== "preschool").map((l) => [l.classId, l])).values()];
    const readState = await getReadState(family.uid);
    let total = 0;
    for (const l of uniqueClasses) {
      const posts = await loadJSON(`class:${l.classId}:homework`, [], true); // eslint-disable-line no-await-in-loop
      const lastRead = readState[`homework-${l.classId}`];
      total += posts.filter((p) => !lastRead || new Date(p.timestamp) > new Date(lastRead)).length;
    }
    setUnreadHomeworkCount(total);
  }, [family, fullTimeStudentLinks]);

  useEffect(() => { refreshUnreadHomeworkCount(); }, [refreshUnreadHomeworkCount]);
  useEffect(() => {
    const interval = setInterval(refreshUnreadHomeworkCount, 45000);
    return () => clearInterval(interval);
  }, [refreshUnreadHomeworkCount]);

  const markHomeworkRead = async (classId) => {
    const posts = await loadJSON(`class:${classId}:homework`, [], true);
    const latest = posts[posts.length - 1];
    if (latest) await markThreadRead(family.uid, `homework-${classId}`);
    refreshUnreadHomeworkCount();
  };

  // The app icon's own badge count — separate from an actual popup notification, and previously
  // never set at all (neither here nor in the service worker), so the icon itself never reflected
  // whether there was anything unread. This is what makes it self-correcting rather than just an
  // increment-on-arrival counter that could drift out of sync with reality: every time any of the
  // three unread counts actually changes, for any reason (a new message arrives, something gets
  // marked read, a whole thread gets dismissed), the badge is recomputed from scratch against
  // this account's own genuinely current unread state and set to match exactly — cleared
  // entirely, via clearAppBadge, only when the true total is zero.
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const total = unreadThreads.length + unreadBlogCount + unreadHomeworkCount;
    try {
      if (total > 0) navigator.setAppBadge(total);
      else navigator.clearAppBadge();
    } catch { /* Badging API not available on this platform — nothing to fall back to */ }
    resetBackgroundBadgeCounter();
  }, [unreadThreads.length, unreadBlogCount, unreadHomeworkCount]);

  const dismissUnread = async (item) => {
    await markThreadRead(family.uid, item.threadKey);
    setUnreadThreads((prev) => prev.filter((t) => t.threadKey !== item.threadKey));
  };
  const openUnread = async (item) => {
    if (item.kind === "admin") await openAdminMessages();
    else await openMessagesFor(item.classId);
    setUnreadThreads((prev) => prev.filter((t) => t.threadKey !== item.threadKey));
  };

  const openMessagesFor = async (classId) => {
    setMessagingClassId(classId);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", `class:${classId}`);
    window.history.pushState({ thread: `class:${classId}` }, "", url);
    const readState = await getReadState(family.uid);
    setLastReadBeforeOpen(readState[`class-${classId}`] || null);
    await markThreadRead(family.uid, `class-${classId}`);
  };

  // Not scoped to any class — this is a shared line to the office, not a specific classroom, so
  // one conversation covers a family regardless of how many classes their children are spread
  // across. Key deliberately has no "class:" prefix, since it isn't one.
  const openAdminMessages = async () => {
    setMessagingAdmin(true);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", "admin");
    window.history.pushState({ thread: "admin" }, "", url);
    const readState = await getReadState(family.uid);
    setLastReadBeforeOpen(readState[`admin-${family.uid}`] || null);
    await markThreadRead(family.uid, `admin-${family.uid}`);
  };

  // Who this family is actually allowed to message one-on-one — computed server-side (families
  // have no direct read access to teacher records) and deliberately deduplicated by teacher there,
  // so a teacher covering two of this family's classes, or General Studies for a grade they don't
  // otherwise teach, still shows up exactly once, not once per class they share.
  const [linkedClassTypeById, setLinkedClassTypeById] = useState({}); // this family's own classId -> classType, for matching a grade-level-reachable teacher against a specific child
  useEffect(() => {
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/eligible-teachers", { headers });
        const data = await res.json();
        setEligibleTeachers(res.ok ? (data.teachers || []) : []);
        setLinkedClassTypeById(res.ok ? (data.linkedClassTypeById || {}) : {});
      } catch {
        setEligibleTeachers([]);
      }
    })();
  }, [myGroupId]);

  // An individual teacher's own thread with this family — separate from any classroom thread, and
  // never shared with any other teacher who happens to cover the same class.
  const openTeacherMessages = async (teacherUid) => {
    setMessagingTeacherUid(teacherUid);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", `teacher:${teacherUid}`);
    window.history.pushState({ thread: `teacher:${teacherUid}` }, "", url);
    const readState = await getReadState(family.uid);
    setLastReadBeforeOpen(readState[`teacher-${teacherUid}`] || null);
    await markThreadRead(family.uid, `teacher-${teacherUid}`);
  };

  // Restores whichever thread (or none) the URL says is open — fires on the hardware/gesture back
  // press, same as every other history-aware navigation in the app. Previously, opening any one of
  // these three thread types set state directly with no history entry at all, which is exactly the
  // bug behind "back sometimes skips several steps or closes the app": a step the browser's own
  // history never recorded can't be stepped back through one at a time.
  useEffect(() => {
    const onPopStateThread = () => {
      const params = new URLSearchParams(window.location.search);
      const thread = params.get("thread");
      if (thread === "admin") {
        setMessagingClassId(null);
        setMessagingTeacherUid(null);
        setMessagingAdmin(true);
      } else if (thread?.startsWith("class:")) {
        setMessagingAdmin(false);
        setMessagingTeacherUid(null);
        setMessagingClassId(thread.slice(6));
      } else if (thread?.startsWith("teacher:")) {
        setMessagingAdmin(false);
        setMessagingClassId(null);
        setMessagingTeacherUid(thread.slice(8));
      } else {
        setMessagingClassId(null);
        setMessagingAdmin(false);
        setMessagingTeacherUid(null);
      }
    };
    window.addEventListener("popstate", onPopStateThread);
    return () => window.removeEventListener("popstate", onPopStateThread);
  }, []);

  const [scanError, setScanError] = useState(null);
  const [pendingDeepLinkClassId, setPendingDeepLinkClassId] = useState(null); // for "open=blog" links specifically — resolved once fullTimeStudentLinks finishes loading, see effect below
  const [pendingHomeworkDeepLinkClassId, setPendingHomeworkDeepLinkClassId] = useState(null);

  // Deep-linking from a tapped push notification — reads the URL once on mount and jumps
  // straight to whatever the notification was actually about, instead of landing on Home and
  // making someone hunt for what's new. The URL gets cleaned up right after acting on it, so
  // refreshing this same tab later doesn't keep re-triggering the same jump.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    if (!open) return;
    const classId = params.get("classId");
    if (open === "messages") {
      setParentTab("messages");
      if (classId) openMessagesFor(classId).then(refreshUnreadThreads);
    } else if (open === "admin") {
      setParentTab("messages");
      openAdminMessages().then(refreshUnreadThreads);
    } else if (open === "teacher-messages") {
      setParentTab("messages");
      const teacherUid = params.get("teacherUid");
      if (teacherUid) openTeacherMessages(teacherUid).then(refreshUnreadThreads);
    } else if (open === "blog" && classId) {
      setParentTab("blog");
      setPendingDeepLinkClassId(classId); // resolved below, once fullTimeStudentLinks is actually ready
    } else if (open === "homework" && classId) {
      setParentTab("homework");
      setPendingHomeworkDeepLinkClassId(classId);
    }
    const cleanUrl = window.location.pathname + (params.get("portal") ? "?portal=parent" : "");
    window.history.replaceState({}, "", cleanUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A blog deep link can arrive before the full-time-only class list has finished loading (that
  // fetch is async and starts as null) — this resolves the actual tab index the moment that list
  // is genuinely ready, rather than looking it up too early against an empty array.
  useEffect(() => {
    if (!pendingDeepLinkClassId || !fullTimeStudentLinks) return;
    const uniqueClasses = [...new Map(fullTimeStudentLinks.map((l) => [l.classId, l])).values()];
    const idx = uniqueClasses.findIndex((l) => l.classId === pendingDeepLinkClassId);
    if (idx !== -1) setSelectedBlogClassIndex(idx);
    setPendingDeepLinkClassId(null);
  }, [pendingDeepLinkClassId, fullTimeStudentLinks]);

  // Same reasoning as the blog resolver above, but against the un-deduped (per-child) list, since
  // the homework switcher is per-child rather than per-class.
  useEffect(() => {
    if (!pendingHomeworkDeepLinkClassId || !fullTimeStudentLinks) return;
    const idx = fullTimeStudentLinks.findIndex((l) => l.classId === pendingHomeworkDeepLinkClassId);
    if (idx !== -1) setSelectedHomeworkChildIndex(idx);
    setPendingHomeworkDeepLinkClassId(null);
  }, [pendingHomeworkDeepLinkClassId, fullTimeStudentLinks]);

  // Was previously overwriting next[studentId] once per class link — for a student genuinely
  // enrolled in more than one class, whichever link happened to be processed last silently
  // discarded the other class's real status. A real, reported incident showed exactly what that
  // allows: a child truly checked in under one class displayed as "not checked in" here, because
  // the other (empty) class's link overwrote it — leading a parent to tap "Check in" on a child
  // who was already in, creating a second, independent open check-in with no warning at all. Now
  // groups every link by student FIRST, then asks getUnifiedCheckInStatus for the one true answer
  // across all of that student's classes together, so nothing gets silently dropped.
  const refreshCheckInStatus = useCallback(async () => {
    const today = todayISO();
    const next = {};
    const classSchoolDayCache = {}; // classId -> boolean, deduped so shared classes aren't fetched twice
    const linksByStudent = {};
    (family?.studentLinks || []).forEach((link) => {
      if (!linksByStudent[link.studentId]) linksByStudent[link.studentId] = [];
      linksByStudent[link.studentId].push(link);
    });
    for (const [studentId, links] of Object.entries(linksByStudent)) {
      const status = await getUnifiedCheckInStatus(studentId, links);
      for (const link of links) {
        if (!(link.classId in classSchoolDayCache)) {
          const [classConfig, classPlannerDays] = await Promise.all([
            loadJSON(`class:${link.classId}:config`, null, true),
            loadJSON(`class:${link.classId}:plannerDays`, {}, true),
          ]);
          classSchoolDayCache[link.classId] = isSchoolDay(today, classConfig, classPlannerDays);
        }
      }
      // "Today's a school day" only matters for the class the check-in would actually land on —
      // the open one if there is one, otherwise the first linked class — not every linked class.
      const relevantClassId = status.openEntry ? status.openEntry.classId : links[0]?.classId;
      next[studentId] = { isIn: status.isIn, entries: status.allTodaysEntries, schoolDayToday: classSchoolDayCache[relevantClassId], links };
    }
    setCheckInStatus(next);
  }, [family]);

  useEffect(() => { refreshCheckInStatus(); }, [refreshCheckInStatus]);

  // Toggles this child's ONE true check-in status — closing whichever class's record is actually
  // open (which might not even be the class this specific link belongs to), or opening a new one
  // under this link's class if nothing is open anywhere yet. See getUnifiedCheckInStatus/
  // toggleUnifiedCheckIn for the full reasoning on why this can't just look at one class alone.
  const toggleCheckInByFamily = async (link) => {
    const allLinksForChild = (family?.studentLinks || []).filter((l) => l.studentId === link.studentId);
    const byLabel = `Parent: ${family?.name || "Family"}`;
    const result = await toggleUnifiedCheckIn(link.studentId, allLinksForChild, link.classId, byLabel);
    await refreshCheckInStatus();
    return result;
  };

  // Keyed by family.uid, not myGroupId — this guardian's own private line with the classroom's
  // teachers now, the same way an individual teacher thread already was. See the matching comment
  // on messagingThread above for the full reasoning.
  const sendMessageToTeacher = async (classId, text, attachments) => {
    const key = `class:${classId}:messages:${family.uid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "family", senderName: family?.name || "Family", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    notifyClassTeachers(classId, `Message from ${family?.name || "a family"}`, text?.trim() || describeAttachmentsForNotification(attachments), `/?open=messages&classId=${classId}&groupId=${family.uid}`);
    return next;
  };

  // The individual-teacher counterpart to sendMessageToTeacher above — same shape, but written to
  // that one teacher's own thread with THIS SPECIFIC GUARDIAN (family.uid, not myGroupId — see the
  // comment on teacherMessagingThread above for why), and notifying only them, never every teacher
  // sharing the classroom.
  const sendMessageToIndividualTeacher = async (teacherUid, text, attachments) => {
    const key = `teacher-messages:${teacherUid}:${family.uid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "family", senderName: family?.name || "Family", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    // deepLinkClassId lets the notification jump straight into this teacher's own app and open
    // this exact thread — omitted when the teacher has no assignedClassIds of their own (reachable
    // only via messagingClassTypes), since their app then has no class to deep-link into at all;
    // the notification still arrives, it just opens the app normally instead of jumping straight in.
    const deepLinkClassId = (eligibleTeachers || []).find((t) => t.uid === teacherUid)?.deepLinkClassId;
    const deepLinkSuffix = deepLinkClassId ? `&classId=${deepLinkClassId}` : "";
    notifySpecificTeacher(teacherUid, `Message from ${family?.name || "a family"}`, text?.trim() || describeAttachmentsForNotification(attachments), `/?open=teacher-messages&teacherUid=${teacherUid}&groupId=${family.uid}${deepLinkSuffix}`);
    return next;
  };

  // One shared code, posted at the school — not tied to any child or class. A correct scan proves
  // this parent is physically here right now and unlocks the action screen; it does not itself
  // check anyone in or out. What happens next is a deliberate tap per child, not automatic.
  const handleScanResult = (decoded) => {
    if (decoded !== SCHOOLWIDE_CHECKIN_CODE) {
      setScanError("That doesn't look like this school's check-in code.");
      return;
    }
    setActionUnlocked(true);
    setShowScanner(false);
  };

  const [name, setName] = useState(family?.name || "");
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
    const result = await onChangeMyPassword(currentPw, newPw);
    setPwSaving(false);
    if (!result.ok) { setPwError(result.error); return; }
    setPwSuccess(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSuccess(false), 3000);
  };

  if (messagingClassId) {
    const className = (family.studentLinks.find((l) => l.classId === messagingClassId) || {}).className || "the class";
    return (
      <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
        <GlobalAppStyles />
        <ConversationThreadView title={className} messages={messagingThread.messages} myRole="family" threadKey={`class-${messagingClassId}`}
          lastReadBeforeOpen={lastReadBeforeOpen}
          onBack={() => window.history.back()}
          onSend={async (text, attachments) => { await sendMessageToTeacher(messagingClassId, text, attachments); }} />
      </div>
    );
  }

  if (messagingTeacherUid) {
    const activeTeacher = (eligibleTeachers || []).find((t) => t.uid === messagingTeacherUid);
    const teacherName = activeTeacher?.name || "the teacher";
    return (
      <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
        <GlobalAppStyles />
        {/* No label here, deliberately — the same teacher can show a different label per child
            (their role genuinely differs by classroom), but this is the one single conversation
            with them regardless of which child's context led here, so showing whichever label
            happened to be picked would read as contradicting whichever one the person actually
            tapped through from. */}
        <ConversationThreadView title={teacherName} subtitle="Direct message" messages={teacherMessagingThread.messages} myRole="family" threadKey={`teacher-${messagingTeacherUid}`}
          lastReadBeforeOpen={lastReadBeforeOpen}
          onBack={() => window.history.back()}
          onSend={async (text, attachments) => { await sendMessageToIndividualTeacher(messagingTeacherUid, text, attachments); }} />
      </div>
    );
  }

  if (messagingAdmin) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
        <GlobalAppStyles />
        <ContactOfficeView adminThread={adminThread} onBack={() => window.history.back()} />
      </div>
    );
  }

      // Renders a tab's actual content, parameterized rather than reading the outer parentTab
      // state directly — this is what lets the exact same rendering logic serve two purposes: the
      // real, current tab below, and (during an active swipe) a second, live copy of whichever
      // adjacent tab is being dragged toward, so that pane shows the genuine destination screen
      // sliding into view instead of a placeholder icon standing in for it. `const parentTab =
      // tabToRender` shadows the outer parentTab for everything inside this function only — every
      // existing `parentTab === "..."` check below this point keeps working unchanged, now reading
      // whichever tab was actually passed in rather than always the live one.
      const renderTabContent = (tabToRender) => {
        const parentTab = tabToRender;
        return (
        parentTab === "settings" ? (
          <>
            <button onClick={() => navigateParentTab("home")} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
            {canSwitchToTeacher && (
              <button onClick={onSwitchToTeacher} className="w-full bg-[#5F9F9E] text-white rounded-xl py-3 text-sm font-bold hover:bg-[#508786] mb-5">Switch to Teacher view</button>
            )}
            <div className="bg-white border border-stone-200 rounded-xl p-4 mb-5">
            <p className="font-semibold text-stone-800 text-sm mb-3">My account</p>
            <label className="block text-xs font-medium text-stone-500 mb-1">Your name</label>
            <div className="flex gap-2 mb-4">
              <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <button onClick={saveName} className="bg-[#5F9F9E] text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#508786]">Save</button>
            </div>
            {nameSaved && <p className="text-xs text-emerald-600 -mt-3 mb-4">Saved.</p>}

            <p className="text-sm font-semibold text-stone-800 mb-2 pt-3 border-t border-stone-200">Change password</p>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (6+ characters)"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-2" />
            {pwError && <p className="text-xs text-rose-600 mb-2">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-600 mb-2">Password updated.</p>}
            <button onClick={submitPasswordChange} disabled={pwSaving} className="w-full bg-[#5F9F9E] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#508786] disabled:opacity-50 mb-3">
              {pwSaving ? "Updating..." : "Change password"}
            </button>
            <button onClick={onSignOut} className="w-full text-xs font-semibold text-stone-500 hover:text-rose-600 pt-2 border-t border-stone-200">Sign out</button>
          </div>
          <NotificationToggle uid={family.uid} accentColor="#5F9F9E" />
          </>
        ) : actionUnlocked ? (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-emerald-800">Code scanned ✓</p>
              <p className="text-xs text-emerald-700 mt-0.5">Tap each child you're checking in or out right now.</p>
            </div>
            <div className="space-y-2 mb-4">
              {/* One card per unique CHILD, not per class link — a student in two classes used to
                  render two separate, identical-looking cards here, each capable of independently
                  checking them in under a different class with no idea the other existed. Now
                  shows every linked class together on one card, and passes ALL of a child's links
                  through so toggleCheckInByFamily can always find and close whichever one is
                  actually open. */}
              {[...new Map(family.studentLinks.map((l) => [l.studentId, l])).values()].map((link) => {
                const status = checkInStatus[link.studentId];
                const isIn = status?.isIn;
                const entries = status?.entries || [];
                const schoolDayToday = status?.schoolDayToday !== false; // default to allowed until status has loaded
                const confirming = confirmingRepeatChild === link.studentId;
                const allClassNames = (status?.links || [link]).map((l) => l.className).join(", ");
                return (
                  <div key={link.studentId} className={`rounded-xl p-4 border-2 ${isIn ? "bg-emerald-50 border-emerald-300" : "bg-white border-stone-200"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900">{link.studentName}</p>
                        <p className="text-xs text-stone-400">{allClassNames}</p>
                        {!schoolDayToday ? (
                          <p className="text-xs font-semibold text-amber-700 mt-0.5">Not marked as a school day today</p>
                        ) : entries.length === 0 ? (
                          <p className="text-xs font-semibold text-stone-400 mt-0.5">Not checked in yet today</p>
                        ) : (
                          <div className="mt-0.5 space-y-0.5">
                            {entries.map((e) => (
                              <p key={e.id} className={`text-xs font-semibold ${!e.checkOutTime ? "text-emerald-700" : "text-stone-500"}`}>
                                In {formatTime12h(e.checkInTime)}{e.checkOutTime ? ` — Out ${formatTime12h(e.checkOutTime)}` : " — still here"}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      {!schoolDayToday ? null : confirming ? (
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] text-stone-500">Log another visit today?</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => { toggleCheckInByFamily(link); setConfirmingRepeatChild(null); }}
                              className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Yes</button>
                            <button onClick={() => setConfirmingRepeatChild(null)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-stone-300 text-stone-500">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => {
                          const hasCompletedToday = entries.filter((e) => e.checkInTime && e.checkOutTime).length > 0;
                          if (!isIn && hasCompletedToday) { setConfirmingRepeatChild(link.studentId); return; }
                          toggleCheckInByFamily(link);
                        }}
                          className={`text-xs font-bold px-4 py-2.5 rounded-lg shrink-0 ${isIn ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                          {isIn ? "Check out" : "Check in"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setActionUnlocked(false)} className="w-full bg-stone-200 text-stone-700 rounded-xl py-3 text-sm font-bold hover:bg-stone-300">Done</button>
          </>
        ) : parentTab === "messages" ? (() => {
          // One row per unique CHILD (a child with links to two classes — General + Judaic
          // Studies, say — only gets one tab, not two), each with the full set of classIds that
          // are actually theirs, since that's what a teacher or classroom card below gets checked
          // against once a specific child is selected.
          const uniqueChildren = [...new Map((family?.studentLinks || []).map((l) => [l.studentId, l])).values()];
          const selectedMessagesChildIndex = findChildIndex(uniqueChildren, selectedStudentId);
          const selectedChild = uniqueChildren[selectedMessagesChildIndex] || uniqueChildren[0];
          const selectedChildClassIds = (family?.studentLinks || []).filter((l) => l.studentId === selectedChild?.studentId).map((l) => l.classId);
          const selectedChildClassTypes = [...new Set(selectedChildClassIds.map((id) => linkedClassTypeById[id]).filter(Boolean))];
          const filteredClasses = [...new Map((family?.studentLinks || []).map((l) => [l.classId, l])).values()].filter((l) => selectedChildClassIds.includes(l.classId));
          // A teacher belongs to the selected child either because they're directly assigned to
          // one of that child's own classes, or because they're reachable by grade level (a
          // coordinator, say) and that child has a class in the grade level they cover — checked
          // against classType specifically for that second case, since a grade-level match was
          // never tied to one particular classId to begin with.
          const filteredTeachers = (eligibleTeachers || []).filter((t) =>
            (t.classIds || []).some((id) => selectedChildClassIds.includes(id)) ||
            (t.reachableClassTypes || []).some((type) => selectedChildClassTypes.includes(type))
          );
          return (
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#5F9F9E]/80 mb-2 px-1">Classes</p>
              <div className="space-y-3">
                {filteredClasses.map((l) => (
                  <button key={l.classId} onClick={() => openMessagesFor(l.classId).then(refreshUnreadThreads)}
                    className="w-full text-left bg-white border-2 border-[#5F9F9E]/20 rounded-xl p-4 flex items-center justify-between hover:border-[#5F9F9E]">
                    <div>
                      <p className="font-semibold text-stone-900">{l.className}</p>
                      <p className="text-xs text-stone-400">Message goes to every teacher in this class</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {(() => {
                        const count = unreadThreads.find((t) => t.threadKey === `class-${l.classId}`)?.unreadCount;
                        return count > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#5F9F9E] text-white text-[11px] font-bold leading-none">
                            {count > 9 ? "9+" : count}
                          </span>
                        );
                      })()}
                      <ChevronRight size={16} className="text-stone-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {eligibleTeachers === null ? (
              // A real, honest loading state — not hidden behind a timer, and not simply absent
              // while the request is in flight. This is what actually addresses the "classes
              // appear, then teachers pop in a second later" feeling: the section's presence is
              // visible immediately, so what's happening reads as "still loading" rather than
              // "missing," even though the fetch itself still takes the time it genuinely takes.
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700/70 mb-2 px-1">Teachers</p>
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="bg-white border-2 border-teal-700/10 rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-stone-200 rounded w-2/5 mb-2" />
                      <div className="h-3 bg-stone-100 rounded w-3/5" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredTeachers.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700/70 mb-2 px-1">Teachers</p>
                <div className="space-y-3">
                  {filteredTeachers.map((t) => {
                    // Whichever of THIS teacher's labels matches one of the selected child's own
                    // classes — a teacher whose admin-assigned role genuinely differs by classroom
                    // (Judaic Studies for one of a family's kids, General Studies for another)
                    // shows each child their own correct title here, on the outside, while still
                    // opening the exact same single conversation either way once tapped: the label
                    // is never part of the thread itself, only of how this list describes it.
                    const contextualLabel = selectedChildClassIds.map((id) => t.labelsByClassId?.[id]).find((l) => l) || t.label;
                    return (
                    <button key={t.uid} onClick={() => openTeacherMessages(t.uid).then(refreshUnreadThreads)}
                      className="w-full text-left bg-white border-2 border-teal-700/15 rounded-xl p-4 flex items-center justify-between hover:border-teal-700">
                      <div>
                        <p className="font-semibold text-stone-900">{t.name}</p>
                        {contextualLabel && <p className="text-xs font-semibold text-[#5F9F9E]">{contextualLabel}</p>}
                        <p className="text-xs text-stone-400">Message goes only to {t.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {(() => {
                          const count = unreadThreads.find((th) => th.threadKey === `teacher-${t.uid}`)?.unreadCount;
                          return count > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-teal-700 text-white text-[11px] font-bold leading-none">
                              {count > 9 ? "9+" : count}
                            </span>
                          );
                        })()}
                        <ChevronRight size={16} className="text-stone-300" />
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          );
        })()
        : parentTab === "blog" ? (
          fullTimeStudentLinks === null ? (
            <p className="text-sm text-stone-400 text-center py-8">Loading…</p>
          ) : fullTimeStudentLinks.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No classes linked yet.</p>
          ) : (() => {
            const uniqueClasses = [...new Map(fullTimeStudentLinks.map((l) => [l.classId, l])).values()];
            // Blog switches by CLASS, not directly by child — so getting from "the shared
            // selectedStudentId" to "which of these class tabs is that" has to go through that
            // child's own classId first (two siblings sharing a class collapse into the same
            // single tab here either way). Picking a different class tab, in the other direction,
            // sets selectedStudentId back to whichever child that class's own link entry belongs
            // to — a reasonable stand-in for "this class" everywhere else selectedStudentId gets
            // used, even on a shared class, since anyone in it is in the class that was just
            // chosen.
            const selectedChildLink = fullTimeStudentLinks.find((l) => l.studentId === selectedStudentId);
            const blogIndex = selectedChildLink ? uniqueClasses.findIndex((c) => c.classId === selectedChildLink.classId) : -1;
            return (
              <ParentBlogTabContent uniqueClasses={uniqueClasses} selectedIndex={blogIndex >= 0 ? blogIndex : 0}
                family={family} onMarkRead={markBlogRead} />
            );
          })()
        ) : parentTab === "homework" ? (
          fullTimeStudentLinks === null ? (
            <p className="text-sm text-stone-400 text-center py-8">Loading…</p>
          ) : (() => {
            const elementaryLinks = fullTimeStudentLinks.filter((l) => l.classType !== "preschool");
            return elementaryLinks.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">No classes linked yet.</p>
            ) : (
              <ParentHomeworkTabContent links={elementaryLinks} selectedIndex={findChildIndex(elementaryLinks, selectedStudentId)}
                onMarkRead={markHomeworkRead} />
            );
          })()
        ) : (
          <>
            {unreadThreads.length > 0 && (
              <div className="space-y-2 mb-4">
                {unreadThreads.map((item) => (
                  <div key={item.threadKey} className="bg-[#5F9F9E0d] border border-[#5F9F9E66] rounded-xl p-3.5 flex items-start gap-2.5">
                    <div className="bg-[#5F9F9E] text-white rounded-full p-1.5 shrink-0 mt-0.5"><MessageCircle size={14} /></div>
                    <button onClick={() => openUnread(item)} className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-stone-900">New message — {item.title}</p>
                      <p className="text-xs text-stone-600 truncate">{item.senderName}: {item.preview}</p>
                    </button>
                    <button onClick={() => dismissUnread(item)} className="text-stone-400 hover:text-stone-600 p-1 shrink-0"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {scanError && (
              <div className="rounded-xl p-3 mb-3 text-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                {scanError}
                <button onClick={() => setScanError(null)} className="block text-xs font-normal underline mt-1">Dismiss</button>
              </div>
            )}
            {fullTimeStudentLinks === null ? (
              <p className="text-sm text-stone-400 text-center py-8">Loading…</p>
            ) : fullTimeStudentLinks.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-5 text-center mb-4">
                <p className="text-sm text-stone-400">No children linked to this account yet — check with the school if this doesn't look right.</p>
              </div>
            ) : (
              <>
                {(() => {
                  const link = fullTimeStudentLinks[findChildIndex(fullTimeStudentLinks, selectedStudentId)] || fullTimeStudentLinks[0];
                  const isPreschoolChild = link.classType === "preschool";
                  // The QR check-in system, and the mood/meals/naps/diapers daily log below it,
                  // are both specific to how preschool rooms actually run — there's no equivalent
                  // check-in system for an elementary class, so showing this bar (and the "not
                  // checked in yet" line under it) for an elementary-linked child was actively
                  // misleading, not just irrelevant. Which one renders now depends on the
                  // CURRENTLY SELECTED child specifically, not a single fixed choice for the whole
                  // account — a family with one child in preschool and one in elementary sees this
                  // section change to match whichever of their kids is selected above.
                  if (!isPreschoolChild) {
                    return <HomeworkPreviewCard link={link} onSeeAll={() => navigateParentTab("homework")} />;
                  }
                  const status = checkInStatus[link.studentId];
                  const isIn = status?.isIn;
                  const entries = status?.entries || [];
                  return (
                    <div>
                      <TourHint active={tourStep === 1} step={2} total={TOUR_TOTAL_STEPS} align="left"
                        text="Scan the QR code posted at school to check your child in and out yourself."
                        onNext={advanceTour} onSkip={dismissTour}>
                        <button onClick={() => setShowScanner(true)} className="w-full flex items-center justify-center gap-2 text-white rounded-xl py-3 text-sm font-bold mb-4 shadow-sm hover:opacity-90" style={{ background: "linear-gradient(120deg, #5F9F9E 0%, #7bb0af 100%)" }}>
                          Scan QR code to check in or out
                        </button>
                      </TourHint>
                      {/* Wraps only the short check-in box, not the full (potentially long)
                          daily-log content below it — the tour bubble positions itself right after
                          whatever it wraps, so wrapping the whole block (including
                          ChildDailyLogView, which can run long with mood/meals/naps/incidents/etc.)
                          pushed the bubble itself far down the page, past the end of the visible
                          content, where it had nothing left to actually be inside and rendered
                          cut off. This keeps the pointer anchored to the specific thing the text
                          is about — "your child's day shows right here" — right at the top of that
                          section, regardless of how much the section itself contains. */}
                      <TourHint active={tourStep === 2} step={3} total={TOUR_TOTAL_STEPS} align="left"
                        text={`Your child's day shows right here — mood, meals, naps, and more, as their teacher logs it.`}
                        onNext={advanceTour} onSkip={dismissTour}>
                        <div className={`rounded-xl p-4 border-2 mb-4 ${isIn ? "bg-emerald-50 border-emerald-300" : "bg-white border-stone-200"}`}>
                          {entries.length === 0 ? (
                            <p className="text-xs font-semibold text-stone-400">Not checked in yet today — scan the QR code above to check in.</p>
                          ) : (
                            <div className="space-y-0.5">
                              {entries.map((e) => (
                                <p key={e.id} className={`text-xs font-semibold ${!e.checkOutTime ? "text-emerald-700" : "text-stone-500"}`}>
                                  In {formatTime12h(e.checkInTime)}{e.checkOutTime ? ` — Out ${formatTime12h(e.checkOutTime)}` : " — still here"}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </TourHint>
                      <ChildDailyLogView link={link} />
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )
        );
      };
  // The one child-switcher bar, computed here (against the real, committed parentTab — never
  // tabToRender) so a single instance can live in the fixed header instead of inside each tab's
  // own swipeable content, where it used to get rendered twice at once during an active swipe
  // (once for the real tab, once for the live preview of wherever the drag was headed) and
  // produce two overlapping bars instead of one settled one. Living here means it can't be
  // duplicated that way, and it never moves during a swipe at all — it was never part of the
  // swiped content to begin with. null whenever the current tab has nothing to switch between
  // (only one child, data still loading, or a tab with no such concept at all, like Settings).
  const activeSwitcherConfig = (() => {
    if (parentTab === "home" || parentTab === "homework") {
      if (!fullTimeStudentLinks) return null;
      const links = parentTab === "homework" ? fullTimeStudentLinks.filter((l) => l.classType !== "preschool") : fullTimeStudentLinks;
      if (links.length <= 1) return null;
      return {
        labels: links.map((l) => l.studentName),
        selectedIndex: findChildIndex(links, selectedStudentId),
        onSelect: (i) => setSelectedStudentId(links[i]?.studentId),
      };
    }
    if (parentTab === "blog") {
      if (!fullTimeStudentLinks) return null;
      const uniqueClasses = [...new Map(fullTimeStudentLinks.map((l) => [l.classId, l])).values()];
      if (uniqueClasses.length <= 1) return null;
      const selectedChildLink = fullTimeStudentLinks.find((l) => l.studentId === selectedStudentId);
      const blogIndex = selectedChildLink ? uniqueClasses.findIndex((c) => c.classId === selectedChildLink.classId) : -1;
      return {
        labels: uniqueClasses.map((l) => l.studentName),
        selectedIndex: blogIndex >= 0 ? blogIndex : 0,
        onSelect: (i) => setSelectedStudentId(uniqueClasses[i]?.studentId),
      };
    }
    if (parentTab === "messages") {
      const uniqueChildren = [...new Map((family?.studentLinks || []).map((l) => [l.studentId, l])).values()];
      if (uniqueChildren.length <= 1) return null;
      return {
        labels: uniqueChildren.map((l) => l.studentName),
        selectedIndex: findChildIndex(uniqueChildren, selectedStudentId),
        onSelect: (i) => setSelectedStudentId(uniqueChildren[i]?.studentId),
      };
    }
    return null;
  })();
  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <GlobalAppStyles />
      <div className="sticky top-0 z-20 shadow-md" style={{ paddingTop: "env(safe-area-inset-top)", background: "linear-gradient(120deg, #ffffff 0%, #f1f1ee 100%)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="max-w-lg mx-auto px-3 py-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 shrink-0">
            <img src="/sja-icon-mark.png" alt="SJA" className="h-14 w-auto object-contain shrink-0" />
            {/* Deliberately not vertically centered against the icon's full height — the icon's
                own flame sits above its letters, so centering this against the whole icon would
                visually align "Parent Portal" with the flame instead of the letters it's actually
                meant to sit alongside. This offset (measured directly against the icon file: the
                letters themselves start right around 35% of the way down) pushes the text down to
                start where the letters do. */}
            <div className="leading-none" style={{ marginTop: "20px" }}>
              <p className="text-[13px] font-semibold text-[#5F9F9E] leading-tight">Parent</p>
              <p className="text-[13px] font-semibold text-[#5F9F9E] leading-tight">Portal</p>
            </div>
          </div>
          {/* The whole outer row switched from items-center to items-start so every group's own
              vertical position could be set independently instead of centered against whichever
              group happens to be tallest (the icon, at 56px) — that centering was exactly what
              made this side float noticeably higher than "Parent Portal" once that text was
              deliberately pushed down to align with the icon's letters rather than its flame. This
              marginTop brings it back down to that same line. */}
          <div className="flex items-center gap-4 shrink-0" style={{ marginTop: "12px" }}>
            <button onClick={() => setContactPanelOpen((v) => !v)} className="flex flex-col items-center gap-0.5 text-[#5F9F9E] hover:text-[#447271]">
              <Phone size={20} strokeWidth={1.5} />
              <span className="text-[9px] font-bold leading-none whitespace-nowrap">Contact office</span>
            </button>
            {/* Replaces the old separate "family name + settings gear" pairing — this one circle
                does both jobs the header used to split across two things: it identifies whose
                account this is (their own initials, always visible) and is the way into account
                settings (same destination the gear used to open), freeing the whole center of the
                header instead of needing its own dedicated space for a name that could run long. */}
            <button onClick={() => navigateParentTab(parentTab === "settings" ? "home" : "settings")} aria-label="Account settings"
              className="w-9 h-9 rounded-full bg-[#5F9F9E] text-white text-xs font-bold flex items-center justify-center hover:bg-[#508786] shrink-0">
              {getInitials(family?.name)}
            </button>
          </div>
        </div>
        {contactPanelOpen && (
          <ContactOfficePanel onViewUpdates={() => { setContactPanelOpen(false); openAdminMessages().then(refreshUnreadThreads); }} />
        )}
        {parentTab !== "settings" && (
          <TourHint active={tourStep === 0} step={1} total={TOUR_TOTAL_STEPS} align="left"
            text="These tabs are how you get around — Messages, Blog, Homework, and more."
            onNext={advanceTour} onSkip={dismissTour}>
            <div className="bg-white border-t border-stone-200 max-w-lg mx-auto">
              <ParentMainTabs active={parentTab} navigate={navigateParentTab} unreadMessagesCount={unreadThreads.length} unreadBlogCount={unreadBlogCount}
                unreadHomeworkCount={unreadHomeworkCount} showHomework={(fullTimeStudentLinks || []).some((l) => l.classType !== "preschool")} />
            </div>
          </TourHint>
        )}
        {activeSwitcherConfig && (
          <div className="max-w-lg mx-auto">
            <ChildSwitcher labels={activeSwitcherConfig.labels} selectedIndex={activeSwitcherConfig.selectedIndex} onSelect={activeSwitcherConfig.onSelect} />
          </div>
        )}
      </div>

      {/* overflow only actually needs to clip anything while a swipe gesture is genuinely in
          progress (dragging, or still animating into place) — the rest of the time, this is just
          a normal, sitting-still page, and overflow-hidden here would do nothing useful except
          break position: sticky for anything inside it (a CSS quirk that isn't optional: setting
          overflow-x to anything other than visible forces the browser to compute overflow-y as
          auto too, even when overflow-y is explicitly set to visible right alongside it — and
          auto is enough on its own to make this the "nearest scrolling ancestor" a sticky
          descendant sticks relative to, instead of the actual page, even though this element
          itself never actually scrolls internally). Swapping it in only for the moment it's
          needed keeps the swipe animation exactly as clipped as before, without permanently
          costing every sticky element inside a tab its own ability to stick during ordinary
          scrolling. */}
      <div ref={swipeContainerRef} className={`max-w-lg mx-auto relative ${(dragOffsetPx !== 0 || dragAnimating || dragTargetTab) ? "overflow-hidden" : ""}`} style={{ minHeight: "70vh" }} onTouchStart={onTabAreaTouchStart} onTouchEnd={onTabAreaTouchEnd}>
      <div className="px-4 py-5" style={{ transform: `translateX(${dragOffsetPx}px)`, transition: dragAnimating ? "transform 0.22s ease-out" : "none" }}>

      {renderTabContent(parentTab)}
      </div>
      {dragTargetTab && (
        // The genuine destination screen now, not a placeholder — sharing renderTabContent above
        // with the real, current tab is what makes this an actual second live copy of that tab's
        // content rather than a stand-in icon. pointer-events-none is deliberate: this pane is
        // purely a visual preview mid-drag, and should never be tappable — any interaction should
        // go to the real tab underneath (or, once the drag commits, to this same content after it
        // becomes the genuine current tab and pointer events resume normally).
        <div className="absolute top-0 left-0 right-0 px-4 py-5" style={{ pointerEvents: "none" }}>
          <div
            style={{
              transform: `translateX(${dragOffsetPx + (dragOffsetPx < 0 ? swipeTrackWidth.current : -swipeTrackWidth.current)}px)`,
              transition: dragAnimating ? "transform 0.22s ease-out" : "none",
            }}>
            {renderTabContent(dragTargetTab)}
          </div>
        </div>
      )}
      </div>
      {showScanner && (
        <ParentQRScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}


