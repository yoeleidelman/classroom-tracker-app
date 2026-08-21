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

import { db, auth, storage, messagingPromise } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, documentId, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithCustomToken, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, GoogleAuthProvider, signInWithPopup, linkWithCredential } from "firebase/auth";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, createContext, useContext, Component, Fragment } from "react";
import { createPortal } from "react-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { HDate, HebrewCalendar, months } from "@hebcal/core";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  ChevronLeft, Plus, AlertTriangle, Mic, ArrowRight, Loader2,
  Trash2, Settings as SettingsIcon, ChevronDown, ChevronUp,
  Home as HomeIcon, BookOpen, ClipboardList, Mail, RefreshCw, Copy, Check,
  Star, Minus, Calendar, Bell, ChevronRight, MessageCircle, Maximize2, Flag, Wrench, Printer, X,
  Coffee, Sandwich, Apple, Moon, Baby, Droplets, Smile, HeartPulse, Camera, Newspaper, Heart, ThumbsUp, PartyPopper, Download, Sparkles, Play, Users, Phone, FileText, Paperclip, MoreVertical, Music, Send, Upload
} from "lucide-react";


import {
  DEFAULT_LETTERS, DEFAULT_NEKUDOS, DEFAULT_BLENDING_CONCEPTS, DEFAULT_BLENDING_WORDS,
  DEFAULT_RULES, DEFAULT_SCHOOL_TOOLS, DEFAULT_CONFIG, COLOR_CHOICES, SWIPE_BETWEEN_TABS_ENABLED,
  SUBJECT_LIBRARY, SCHEDULE_BLOCK_LIBRARY, WEEKDAY_LABELS_FULL, PAGE, skillKey, getResultGrade,
  getResultNote, buildStyleInstructions, toItalicUnicode, URL_PATTERN, extractFirstUrl,
  LinkifiedText, LinkPreviewCard, applyMessageDisclaimer, DEFAULT_PARENT_SETUP_EMAIL_TEMPLATE,
  PARENT_SETUP_EMAIL_PLACEHOLDERS, renderParentSetupEmail, generatePreviewMessage, reactorIdOf,
  reactorNameOf, describeAttachmentsForNotification, computeSingleChoiceReactions, uid,
  isViewingNotificationTarget, todayISO, friendlyDateLabel, SendInAppButton, withinWindow, tierFor,
  monthKey, EVENT_CATEGORIES, hebrewDateFor, getAutoHolidaysForYear, monthLabel,
  shabbosAwareReminderDate, isoDate, addDaysISO, getScheduleForDate, useVisualViewportHeight,
  useRemainingViewportHeight, useStickToBottom, fetchProgramRoster, getAllPeriodsEverywhere,
  IMPORT_FIELD_OPTIONS, IMPORT_FIELD_KEYWORDS, IMPORT_FIELD_CHECK_ORDER, guessImportField,
  parseSpreadsheetFile, buildMonthGrid, eachDateInRange, scheduleKindForDate, computeSkillStatus,
  computeSessionTimeline, logAuthDebug, isAccountActive, isAdminRole, isRegularActiveTeacher,
  emptyStudentData, dedupeDailyLogData, SCHOOLWIDE_CHECKIN_CODE, computeToggledCheckIn,
  isCheckedInNow, toggleCheckInForStudent, getUnifiedCheckInStatus, toggleUnifiedCheckIn,
  isSchoolDay, wouldBeRepeatCheckIn, buildPreschoolSampleData, buildSampleData, loadJSON, saveJSON,
  useLiveJSON, useLiveJSONLoaded, useLiveJSONMap, useLiveJSONPrefix, authHeaders, deleteJSON,
  loadAllWithPrefix, loadAllKeysWithPrefix, fetchClassFamilies, fetchStaffReachableFamilies,
  sendPushNotification, sendPushNotificationResolved, notifyFamilyGroup, notifyClassTeachers,
  notifySpecificTeacher, notifyClassFamilies, getReadState, markThreadRead, editMessageInThread,
  deleteMessageInThread, snoozeThread, isThreadUnread, countUnreadInThread, VAPID_KEY,
  isRunningStandalone, isIOSDevice, shouldHideGoogleSignIn, enableNotificationsFor,
  disableNotificationsFor, isThisDeviceEnabled, resetBackgroundBadgeCounter, ClassContext,
  AppModeContext, GlobalAppStyles, getFlags, formatTime12h, MEAL_AMOUNTS
} from "./core.jsx";

import {
  NotificationToggle, AttachmentMenuButton, ConversationThreadView, PhotoLightbox, generateReplyMessage,
  GoogleSignInSection, ForgotPasswordModal, PointsView, MyAccountPanel, StudentContactFields,
  generateClassAnnouncementMessage, buildParentLoginEmail, MailActionButtons, ConfirmDelete, Section,
  Header, MainTabs
} from "./sharedUI.jsx";

import { AdminDashboard } from "./admin.jsx";

import { AssessmentsListView, StudentDetailView, ClassAssessmentForm } from "./assessments.jsx";

import {
  ParentSignInScreen, ParentQRScanner, TourHint, WhatsAppIcon, ContactOfficePanel, ContactOfficeView,
  ChildDailyLogView, ParentBlogView, firstNameOnly, findChildIndex, getInitials, ChildSwitcher,
  ParentBlogTabContent, ParentHomeworkView, HomeworkPreviewCard, ParentHomeworkTabContent,
  ParentMainTabs, ParentPortalApp
} from "./parent.jsx";


// ---------- App ----------

function AppInner() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [useLegacyFlow, setUseLegacyFlow] = useState(false);
  const [registry, setRegistry] = useState([]);
  const [globalStudents, setGlobalStudents] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [schoolTools, setSchoolTools] = useState([]);
  // Live-subscribed, not a one-time load — see useLiveJSONPrefix for why this specific list needed
  // to stop being a one-time snapshot. Always reflects the real, current server state, for as long
  // as this screen stays open, with no manual refresh call needed anywhere.
  const teachers = useLiveJSONPrefix("teacher:");
  const [programs, setPrograms] = useState([]);
  const [currentTeacher, setCurrentTeacher] = useState(null); // the signed-in teacher's own record, once real login exists
  const [authResolvedFamily, setAuthResolvedFamily] = useState(null); // set once, at sign-in (including the one-time backfill below) — currentFamily itself is derived further down, live, once authUser is known
  // Re-checks whether the signed-in uid now has a family record, without needing a full sign-out
  // and back in. currentFamily is otherwise only ever set once, at the original auth listener —
  // which is exactly what made the sample-data parent preview link feel broken the first time
  // someone used it: linkSampleParentPreview can create that family record mid-session, but
  // nothing was re-reading it afterward, so "Switch to Parent view" wouldn't appear until the
  // next full reload even though the link genuinely existed already.
  const refreshCurrentFamily = async () => {
    if (!auth.currentUser) return;
    const fam = await loadJSON(`family:${auth.currentUser.uid}`, null, true);
    setAuthResolvedFamily(fam);
  };
  const [families, setFamilies] = useState([]); // every family account, for admin's management screen
  // The parent portal used to be a strictly separate entry point with zero path from the teacher
  // app — that stays true for accounts that are ONLY a family or ONLY a teacher, since each side
  // only ever loads if that record actually exists for the signed-in uid. The one thing this adds:
  // an account that legitimately holds both records (a teacher who's also a parent here) can move
  // between them after signing in once, rather than needing two separate logins. activeMode is the
  // single source of truth for which side is currently showing; ?portal=parent still works as a
  // direct link and just seeds the initial mode, it no longer hard-locks it.
  const [isParentPortal] = useState(() => new URLSearchParams(window.location.search).get("portal") === "parent");
  const [activeMode, setActiveMode] = useState(() => (isParentPortal ? "parent" : null)); // "teacher" | "parent" | null (null = not yet resolved, or a dual-role account still choosing)
  const [authUser, setAuthUser] = useState(null); // the raw Firebase Auth user object
  // The signed-in family's own record, for the parent portal — live-subscribed rather than the
  // one-time fetch authResolvedFamily itself is, so a change made from the admin side (a newly
  // added child, a corrected name) reaches an already-open parent session the moment it's saved,
  // the same way a message now does, instead of needing a manual reload or a full sign-out and
  // back in to notice anything changed at all. Falls back to authResolvedFamily (which still
  // carries the one-time backfill logic above) until the live subscription's own first snapshot
  // has actually landed, so there's no flash of "no family" while that's still in flight.
  const currentFamily = useLiveJSON(authUser?.uid ? `family:${authUser.uid}` : null, authResolvedFamily);
  const [classId, setClassId] = useState(null);
  const [className, setClassName] = useState("");
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isSubstituteSession, setIsSubstituteSession] = useState(false);

  // Real Firebase password-reset links always carry these two params — captured once at mount so
  // a later click elsewhere in the app (which could change the URL) doesn't lose track of it.
  const [resetPasswordCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "resetPassword" ? params.get("oobCode") : null;
  });

  // Same one-time-read pattern as isParentPortal above — captured once at mount, before anything
  // strips these params off the URL. A plain ?classId= (no "open=") means "restore whatever class
  // was active before" — either a fresh reload of the same tab, or the OS having fully killed and
  // restarted the page in the background, which happens on some phones. "open=messages&classId="
  // specifically means a notification tap, which additionally opens one exact conversation via
  // groupId once ClassApp itself has mounted.
  const [pendingDeepLink] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    // Same reasoning as pendingStaffDeepLink's own portal=parent check just above — this is the
    // teacher-side interpretation of the URL, and needs to stay out of the way entirely when the
    // link is actually a parent-side one instead. Matters most for exactly the kind of account
    // most likely to hit it: someone who holds both a teacher and a family record, where
    // currentTeacher being truthy doesn't mean they're the one this particular notification, or
    // this particular moment, is actually for.
    if (params.get("portal") === "parent") return null;
    const urlClassId = params.get("classId");
    if (!urlClassId) return null;
    const open = params.get("open");
    return {
      classId: urlClassId,
      groupId: open === "messages" || open === "teacher-messages" ? params.get("groupId") || null : null,
      // isDirect distinguishes "a family messaged the classroom" from "a family messaged ME
      // individually" — same groupId shape either way, but they open a different tab and read
      // from a different thread once inside TeacherMessagesView.
      isDirect: open === "teacher-messages",
    };
  });
  const [deepLinkClassEntered, setDeepLinkClassEntered] = useState(false); // guards against re-entering the class on every re-render

  // The counterpart to pendingDeepLink above, specifically for a staff member with NO assigned
  // classes at all (StaffMessagesHome) — their notification URL never has a classId in the first
  // place (there's no class to enter), so pendingDeepLink itself would ignore it entirely. This
  // needs no class-entry step at all: StaffMessagesHome is already reached automatically the
  // moment such an account signs in, so all this has to carry is which specific thread to jump to
  // once that page's own family list has loaded.
  const [pendingStaffDeepLink] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    // portal=parent is the one unambiguous signal this is actually a PARENT-side link, not a
    // staff one — both shapes use the identical open=teacher-messages value (a parent messaging
    // one specific teacher directly, and a staff member with no assigned classes receiving a
    // direct message, are genuinely different notifications that happen to share this same open
    // type), and this component mounts unconditionally regardless of which side is about to load.
    // Without this check, a PARENT's own deep link — portal=parent, open=teacher-messages,
    // teacherUid=X — was being misread as a staff one, and the effect below was wiping the entire
    // URL (including portal=parent and teacherUid) before the parent-side handler downstream ever
    // got a chance to read any of it, silently destroying a real notification tap and leaving it
    // to land on the plain home screen instead of the specific conversation.
    if (params.get("open") !== "teacher-messages" || params.get("classId") || params.get("portal") === "parent") return null;
    return { groupId: params.get("groupId") || null };
  });
  useEffect(() => {
    if (!pendingStaffDeepLink) return;
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enters the right class the moment it's available, skipping the manual picker entirely —
  // has to be an effect, not inline render logic, since entering a class means calling state
  // setters. Only fires once per pending link; deepLinkClassEntered stops it from re-triggering
  // on every subsequent re-render once the class is already entered.
  useEffect(() => {
    if (!pendingDeepLink || deepLinkClassEntered || !currentTeacher || classId) return;
    const target = registry.find((c) => !c.archived && c.id === pendingDeepLink.classId && (currentTeacher.assignedClassIds || []).includes(c.id));
    if (target) {
      enterAssignedClass(target); // already leaves a clean ?classId= on the URL — nothing further needed here
      setDeepLinkClassEntered(true);
    }
  }, [pendingDeepLink, deepLinkClassEntered, currentTeacher, classId, registry]); // eslint-disable-line react-hooks/exhaustive-deps

  // A push that arrives while this tab is the active, focused one doesn't go through the service
  // worker's OWN onBackgroundMessage listener at all (that only fires for background/closed-tab
  // delivery) — this is the separate path Firebase provides for "the app was already open when it
  // happened." Still routed through registration.showNotification() rather than the simpler
  // `new Notification()` constructor, though — that constructor is well known to be unreliable
  // specifically on Android/Chrome, where a page calling it directly can silently produce nothing
  // visible at all rather than a real system banner; going through the service worker instead is
  // the same, already-proven-reliable mechanism the background path already uses, so a foreground
  // notification is now exactly as dependable as a background one, not a separate, weaker copy of
  // it. This also means a tap is handled by the exact same notificationclick listener in the
  // service worker either way — no separate onclick logic needed here anymore. Reads from
  // payload.data, not payload.notification, matching the backend's deliberately data-only payload
  // — see the service worker for why.
  useEffect(() => {
    let unsubscribe = () => {};
    messagingPromise.then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, async (payload) => {
        if (Notification.permission !== "granted") return;
        // The one and only suppression rule — never "the app is open," always and only "this
        // exact content is already on screen."
        if (isViewingNotificationTarget(payload.data?.url)) return;
        const title = payload.data?.title || "New notification";
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body: payload.data?.body || "",
            // A real bug lived in this path: "/icons/icon-192.png" points at a folder that was
            // never actually there — the app's own icons are at the root ("/icon-192.png"), not
            // under an "/icons/" prefix (a mistake this session already found and fixed once, in
            // manifest.json specifically — this was the same wrong path recurring in a second,
            // separate place). A missing icon file doesn't stop a notification from showing, so
            // this was invisible as a failure — it just quietly fell back to a generic default
            // icon on every single foreground notification instead of the app's own.
            icon: "/icon-192.png",
            badge: "/icons-badge/badge-96.png",
            data: { url: payload.data?.url || "/" },
          });
        } catch {
          // No service worker available in this browser (or it isn't ready yet) — falling back to
          // the direct constructor is still strictly better than showing nothing at all, even on
          // the platforms where it's the less reliable of the two options.
          const n = new Notification(title, { body: payload.data?.body || "", icon: "/icon-192.png", badge: "/icons-badge/badge-96.png" });
          n.onclick = () => { window.focus(); if (payload.data?.url) window.location.href = payload.data.url; };
        }
      });
    });
    return () => unsubscribe();
  }, []);

  // Real Firebase sign-in state — now drives the app's main screens (see the routing at the
  // bottom of this component). authChecked exists so we don't flash the sign-in screen for a
  // moment before Firebase has had a chance to report whether a session already exists.
  // Persistence is set explicitly (rather than relying on the SDK's default) so a signed-in
  // teacher stays signed in across closing and reopening the app, not just within one tab.
  useEffect(() => {
    let unsubscribe = () => {};
    // A real, reported symptom traced back to exactly this: a sign-in that visibly succeeds —
    // the class-selection screen shows — for a fraction of a second, then reverts straight back
    // to signed-out. That matches a session that existed briefly in memory but couldn't actually
    // be written to durable storage. browserLocalPersistence depends on IndexedDB, which some
    // devices/browser configurations block or restrict — a managed or storage-constrained iPad
    // being a real, plausible case — and the .finally() this used to end on meant that failure
    // was silently swallowed: if setPersistence itself rejected, the code proceeded to attach the
    // auth listener anyway, on whatever broken persistence state that left behind, with nothing
    // to explain why a session that seemed to work for a moment then didn't. Now falls back
    // explicitly to session-only persistence (sessionStorage-backed, not IndexedDB) if the
    // durable option genuinely can't be established — not as good as surviving a full app
    // restart, but real enough to keep someone signed in for as long as the tab/app itself stays
    // open, rather than losing the session again within the same few seconds.
    setPersistence(auth, browserLocalPersistence)
      .catch((err) => {
        console.error("browserLocalPersistence failed, falling back to session-only persistence", err);
        logAuthDebug(`local persistence failed: ${err?.code || err?.message || err}`);
        return setPersistence(auth, browserSessionPersistence).catch((err2) => {
          console.error("browserSessionPersistence also failed — signing in may not stay signed in at all on this device", err2);
          logAuthDebug(`session persistence ALSO failed: ${err2?.code || err2?.message || err2}`);
        });
      })
      .finally(() => {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        logAuthDebug(user ? `onAuthStateChanged: signed IN as ${user.email || user.uid}` : "onAuthStateChanged: signed OUT (user is null)");
        setAuthUser(user);
        if (user) {
          const [mine, myFamily] = await Promise.all([
            loadJSON(`teacher:${user.uid}`, null, true),
            loadJSON(`family:${user.uid}`, null, true),
          ]);
          logAuthDebug(`teacher record: ${mine ? `found, ${(mine.assignedClassIds || []).length} class(es) assigned, active=${mine.active !== false}` : "NOT found"} · family record: ${myFamily ? "found" : "not found"}`);
          // Backfill for any family account created before linkedClassIds/familyGroupId/
          // linkedClassTypes existed — happens once, right when they actually sign in, rather
          // than needing an admin to manually re-save every existing family. A family with no
          // familyGroupId is, by definition, its own group of one — its own uid IS the correct
          // group id for it. Fetches the class registry directly here rather than trusting the
          // registry state variable, since that may not have finished loading yet this early in
          // the app's own startup sequence.
          let effectiveFamily = myFamily;
          if (myFamily && (!myFamily.linkedClassIds || !myFamily.familyGroupId || !myFamily.linkedClassTypes)) {
            const linkedClassIds = myFamily.linkedClassIds || [...new Set((myFamily.studentLinks || []).map((l) => l.classId))];
            const familyGroupId = myFamily.familyGroupId || user.uid;
            let linkedClassTypes = myFamily.linkedClassTypes;
            if (!linkedClassTypes) {
              const freshRegistry = (await loadJSON("schoolClasses", [], true)) || [];
              // Same fix as availableClassTypes above (see that comment) — a class missing its
              // classType field entirely defaults to elementary, rather than being silently
              // dropped by a bare .filter(Boolean). A family linked only to an older-style
              // elementary class would otherwise end up with an empty linkedClassTypes, unable to
              // reach any grade-level-reachable staff at all — a real, not just cosmetic, gap.
              linkedClassTypes = [...new Set(
                linkedClassIds
                  .map((id) => freshRegistry.find((c) => c.id === id))
                  .filter(Boolean)
                  .map((cls) => cls.classType || "elementary")
              )];
            }
            effectiveFamily = { ...myFamily, linkedClassIds, familyGroupId, linkedClassTypes };
            saveJSON(`family:${user.uid}`, effectiveFamily, true);
          }
          setCurrentTeacher(mine);
          setAuthResolvedFamily(effectiveFamily);
          // Auto-resolve when there's only one possible side; a genuinely dual-role account keeps
          // whatever mode it's already in (its ?portal=parent seed, or a choice already made this
          // session) — it only falls through to "unresolved" the very first time both exist and
          // neither has been picked yet, which is exactly when the chooser screen should show.
          if (mine && !myFamily) setActiveMode("teacher");
          else if (myFamily && !mine) setActiveMode("parent");
        } else {
          setCurrentTeacher(null);
          setAuthResolvedFamily(null);
          setActiveMode(isParentPortal ? "parent" : null);
        }
        setAuthChecked(true);
      });
    });
    return () => unsubscribe();
  }, [isParentPortal]);

  // Live-subscribes to the signed-in teacher's own record, on top of the one-time load above —
  // this is the other half of the same first-day-of-school reliability incident. The one-time
  // load is still what's used for the initial "which mode does this account open into" decision
  // at the moment of sign-in, which only needs to happen once — but currentTeacher itself used to
  // stay frozen at whatever it was at that moment for the rest of the session. If an admin fixed a
  // class assignment while the affected teacher was already signed in — the exact situation right
  // after repairing corrupted data — that teacher had no way to see the fix except manually
  // signing all the way out and back in, which is precisely the "why do I have to keep redoing
  // sign-in" complaint this exists to eliminate. Scoped to authUser.uid specifically, not
  // currentTeacher — subscribing based on a value this same effect also sets would immediately
  // re-trigger itself in a loop.
  //
  // Re-establishes itself on error rather than just logging — this is what actually closes a real,
  // reported gap: a Firestore onSnapshot listener's error callback is terminal, not transient. The
  // instant it fires — even from a single momentary network blip, or an auth token that hasn't
  // fully finished propagating in the few hundred milliseconds right after a fresh sign-in — that
  // specific listener stops receiving any further updates for the rest of the session, silently,
  // with nothing auto-reconnecting it the way loadJSON's own retry logic now protects a one-time
  // read. Without this, a teacher could genuinely be signed in with no live updates flowing at all,
  // looking no different from one correctly showing their real, current assignment, and any admin
  // fix made afterward would go unseen until they fully signed out and back in — the exact
  // "sometimes works, sometimes doesn't, same account" pattern this whole investigation has been
  // chasing. A short delay before reconnecting avoids hammering a genuinely, persistently denied
  // subscription in a tight loop.
  useEffect(() => {
    if (!authUser?.uid) return;
    let unsubscribe = () => {};
    let reconnectTimer = null;
    let cancelled = false;

    const subscribe = () => {
      const ref = doc(db, "data", `teacher:${authUser.uid}`);
      unsubscribe = onSnapshot(ref,
        (snap) => setCurrentTeacher(snap.exists() ? snap.data().value : null),
        (err) => {
          console.error("Live teacher subscription failed, reconnecting", err);
          if (cancelled) return;
          reconnectTimer = setTimeout(subscribe, 1500);
        });
    };
    subscribe();

    return () => { cancelled = true; clearTimeout(reconnectTimer); unsubscribe(); };
  }, [authUser?.uid]);

  // Google Sign-In uses a popup, not a redirect. Redirect was the original choice, reasoned as
  // "safer inside an installed PWA's own standalone window" — but that turned out to be weighing
  // the wrong risk. signInWithRedirect depends on a cross-origin iframe reaching back to
  // Firebase's own authDomain to carry its result across the round trip, and that mechanism is
  // now broken by default on Safari, Firefox, and Chrome (since mid-2024) unless the app's auth
  // domain is specially reconfigured — which this app, hosted on Vercel rather than Firebase
  // Hosting, isn't. The real, reported symptom this caused: the whole Google flow completing
  // successfully, then landing back with nothing — no result, no error, just silence, because
  // getRedirectResult simply resolves to null in that situation rather than failing loudly.
  // signInWithPopup carries its result back directly, in the same call, with no cross-origin
  // storage dependency, and is Firebase's own documented fix for exactly this case.
  const [pendingGoogleLink, setPendingGoogleLink] = useState(null); // { credential, email } | null
  const [googleSignInError, setGoogleSignInError] = useState("");

  const signInWithGoogle = async () => {
    setGoogleSignInError("");
    // Defense in depth alongside shouldHideGoogleSignIn hiding the button entirely in this same
    // environment — kept here too in case some device/browser combination the hiding check
    // doesn't catch still reaches this call; see shouldHideGoogleSignIn's own comment for why
    // this specific environment can't work at all, not just unreliably.
    if (isIOSDevice() && isRunningStandalone()) {
      setGoogleSignInError("unavailable-in-installed-ios-app");
      return;
    }
    try {
      // Without this, Google can silently reuse whatever session already exists in this browser
      // (or auto-pick the only account signed into the device) and skip the account chooser
      // entirely — exactly what made a shared classroom tablet unable to switch away from
      // whichever teacher happened to sign in with Google first: every later "Continue with
      // Google" tap just silently re-authenticated as that same account again, with no picker
      // ever shown, no obvious way to sign in as anyone else, and no error to explain why.
      // prompt: "select_account" is Google's own documented way to force that chooser to appear
      // every time, regardless of any existing session.
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      // Success updates auth state directly (the same onAuthStateChanged listener above picks
      // it up), so there's nothing further to do here on the happy path.
    } catch (err) {
      // Firebase's real, documented default behavior: signing in with Google does NOT silently
      // take over an existing email/password account that shares the same address — it throws
      // this specific error instead, with the Google credential attached to it so it isn't lost.
      // The right response isn't to treat this as a failure, but to ask the person to confirm
      // their existing password once, then link the two together — see completeGoogleLink below,
      // which is what the sign-in screens call once someone does that.
      if (err.code === "auth/account-exists-with-different-credential") {
        const credential = GoogleAuthProvider.credentialFromError(err);
        setPendingGoogleLink({ credential, email: err.customData?.email || "" });
        return;
      }
      // Every other failure is surfaced directly rather than guessed at and silently swallowed —
      // that exact kind of guess (assuming some error codes are "probably harmless") is what hid
      // two real bugs in a row here before this was rewritten to use a popup at all.
      setGoogleSignInError(err.code || "unknown-error");
    }
  };

  // Completes a pending Google link (see pendingGoogleLink above) — signs in with the password
  // for the EXISTING account first (proving it's genuinely them, not just someone who knows the
  // email), then attaches the Google credential from the earlier attempt to that same account.
  // From this point on, either method signs into the same account going forward.
  const completeGoogleLink = async (password) => {
    if (!pendingGoogleLink) return { ok: false, error: "Nothing to link — try Google sign-in again." };
    try {
      const result = await signInWithEmailAndPassword(auth, pendingGoogleLink.email, password.trim());
      await linkWithCredential(result.user, pendingGoogleLink.credential);
      setPendingGoogleLink(null);
      return { ok: true };
    } catch (err) {
      // Same reasoning as signInTeacher's own too-many-requests handling — a genuine, temporary,
      // server-side lockout looks identical to a wrong password without this, inviting exactly
      // the repeated-retry response that keeps it open longer.
      if (err.code === "auth/too-many-requests") {
        return { ok: false, error: "Too many attempts too quickly — this is temporary. Wait a few minutes before trying again." };
      }
      return { ok: false, error: err.code === "auth/invalid-credential" ? "Incorrect password." : "Couldn't link the accounts — try again." };
    }
  };

  // Teachers are stored one document per teacher (data/teacher:{uid}), not as a single array
  // covering everyone — this is deliberate: Firestore security rules can't reliably search
  // inside an array of objects to find "the one that's mine," but they CAN check "does this
  // exact document's ID match my own uid" precisely and efficiently.
  //
  // teachers itself is now a live subscription (see useLiveJSONPrefix above), not a one-time
  // load — this function is kept only because onRefreshTeachers is still wired up as a prop in a
  // couple of places; the list is already always current, so there's nothing left for it to do.
  const refreshTeachers = async () => {};

  const updateTeacherRecord = async (uid, fields) => {
    const existing = await loadJSON(`teacher:${uid}`, {}, true);
    const next = { ...existing, ...fields };
    await saveJSON(`teacher:${uid}`, next, true);
    // No local setTeachers call needed — the live subscription picks this up the moment the
    // write lands, the same way it would for a change made from any other admin session too.
  };

  // Specifically for toggling ONE class on or off a teacher's own assignedClassIds — this is what
  // was actually behind a real, reported bug: the admin screen's own `teachers` list used to be
  // refreshed only once, when that screen first mounted, and every toggle after that was computing
  // the ENTIRE new array from that same possibly-stale local copy before calling
  // updateTeacherRecord above — which does read the teacher's current record fresh, but that
  // safety only protects fields it's not itself overwriting; assignedClassIds passed in as a full
  // replacement array replaces whatever was actually there regardless. If the admin's local list
  // had drifted out of sync with the real server state for any reason (this screen open a while, a
  // change made from elsewhere), every subsequent toggle kept computing from that same stale base
  // — including two toggles in a row, which is exactly what "unclick and click again, still
  // doesn't work" looks like. This still fetches the teacher's own true, current assignedClassIds
  // fresh right before toggling, on top of teachers now being a live subscription rather than a
  // one-time load — belt and suspenders against the same class of staleness at two different
  // layers, since a first-day-of-school incident traced directly back to it.
  const toggleTeacherClassAssignment = async (uid, classId) => {
    const existing = await loadJSON(`teacher:${uid}`, {}, true);
    const current = existing.assignedClassIds || [];
    const next = current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId];
    const updated = { ...existing, assignedClassIds: next };
    await saveJSON(`teacher:${uid}`, updated, true);
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
    // No local setTeachers call needed — the live query drops the deleted document from its
    // results automatically.
  };

  // Families mirror the teacher-account pattern exactly — one document per family (family:{uid}),
  // not a single array, for the same Firestore-security-rule reason: a rule can check "is this
  // document's ID my own uid" precisely, but can't safely search inside an array for "the one
  // that's mine." studentLinks points directly at {classId, studentId} pairs rather than requiring
  // every child to have a global cross-class ID first, since today many students only ever exist
  // as a single class's own roster entry.
  const refreshFamilies = async () => {
    const list = await loadAllWithPrefix("family:");
    setFamilies(list);
  };

  // linkedClassIds is a flat array of just the class ids (not the richer {classId, studentId, ...}
  // shape studentLinks uses) — kept in sync automatically whenever studentLinks changes, since a
  // security rule can check "is this value in this array" reliably, but can't safely search inside
  // an array of objects for one whose classId field matches. Recomputed here rather than trusted to
  // whatever caller passes in, so it can never quietly drift out of sync with the real links.
  // linkedClassTypes is the same idea for a different lookup: a security rule can't loop over each
  // linked class to ask the class registry "what type are you" (rules don't support that kind of
  // per-element lookup), so the actual class types this family is connected to — elementary,
  // preschool, whichever — are denormalized right onto the family record itself, recomputed here
  // too. This is what lets someone like a curriculum coordinator be reachable by every elementary
  // parent without being individually assigned to every elementary class one at a time.
  const updateFamilyRecord = async (uid, fields) => {
    const existing = await loadJSON(`family:${uid}`, {}, true);
    const next = { ...existing, ...fields };
    if (fields.studentLinks) {
      next.linkedClassIds = [...new Set(fields.studentLinks.map((l) => l.classId))];
      // Same fix as the two spots above computing this same denormalized field — a class missing
      // classType entirely defaults to elementary rather than being silently dropped.
      next.linkedClassTypes = [...new Set(
        next.linkedClassIds
          .map((id) => registry.find((c) => c.id === id))
          .filter(Boolean)
          .map((cls) => cls.classType || "elementary")
      )];
    }
    await saveJSON(`family:${uid}`, next, true);
    setFamilies((prev) => prev.map((f) => (f.uid === uid ? next : f)));
  };

  const deactivateFamilyRecord = async (uid) => {
    await updateFamilyRecord(uid, { active: false });
  };

  const deleteFamilyPermanently = async (uid) => {
    await deleteJSON(`family:${uid}`);
    setFamilies((prev) => prev.filter((f) => f.uid !== uid));
  };

  // Actually creating the login itself — a brand-new Firebase Auth user with a real password —
  // needs the same kind of privileged, server-side call used for teacher accounts (a plain client
  // can sign itself in, but can't create arbitrary new accounts for other people). This calls a
  // matching endpoint, /api/create-family, mirroring /api/create-teacher's exact shape — that
  // endpoint needs to exist on the server for this to actually work end to end.
  const createFamilyAccount = async (name, email, tempPassword, studentLinks, familyGroupId) => {
    try {
      const response = await fetch("/api/create-family", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ name, email, password: tempPassword, studentLinks, familyGroupId }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || "Couldn't create the account." };
      await refreshFamilies();
      return { ok: true, linkedExisting: data.linkedExisting, uid: data.uid };
    } catch {
      return { ok: false, error: "Couldn't reach the server — try again." };
    }
  };
  // A second (or third) guardian on an existing family — same real, separate login as the first
  // guardian got, just pre-filled with that family's own children and tagged with the same
  // familyGroupId, so both accounts end up sharing the same kids and the same conversations
  // without re-picking students for every additional parent.
  const addGuardianToFamily = async (existingFamily, name, email, tempPassword) => {
    return createFamilyAccount(name, email, tempPassword, existingFamily.studentLinks, existingFamily.familyGroupId || existingFamily.uid);
  };

  // Lets admin add a brand-new student directly into a specific class's roster while setting up a
  // family account — same record shape a teacher's own "add student" creates, so nothing about
  // this student looks different once it's sitting in that class's roster. Returns the created
  // student (with its real id) so the caller can immediately link it to the family being created,
  // in the same flow, without a separate trip to the class itself first.
  const createStudentInClass = async (classId, studentName) => {
    const trimmed = (studentName || "").trim();
    if (!trimmed || !classId) return { ok: false, error: "A class and a student name are both required." };
    const roster = await loadJSON(`class:${classId}:roster`, [], true);
    const newStudent = { id: uid(), name: trimmed, studentType: "full-time", parentEmail: "", parentPhone: "", notes: "", enrollmentScope: "full-time" };
    await saveJSON(`class:${classId}:roster`, [...roster, newStudent], true);
    return { ok: true, student: newStudent };
  };
  const signInTeacher = async (email, password) => {
    try {
      logAuthDebug(`signInWithEmailAndPassword: attempting for ${email}`);
      await signInWithEmailAndPassword(auth, email, password);
      logAuthDebug("signInWithEmailAndPassword: succeeded");
      return { ok: true };
    } catch (e) {
      logAuthDebug(`signInWithEmailAndPassword: FAILED — ${e.code || e.message}`);
      // A real, reported case traced back to exactly this: an account that had a genuine string
      // of failed attempts (a mistyped password, autocapitalize altering what got submitted
      // before that was fixed, anything) can trip Firebase's own server-side rate limit — tracked
      // against the account/device on Firebase's end, not anything stored locally, so it persists
      // through a fresh reload, a fully closed and reopened app, even a full uninstall and
      // reinstall. Collapsing this into the same generic "couldn't sign in, try again" message as
      // every other failure actively made it worse: it looks identical to a wrong password, so
      // the natural response is to keep retrying immediately, which only holds the lockout open
      // longer rather than letting it clear.
      if (e.code === "auth/too-many-requests") {
        return { ok: false, error: "Too many attempts too quickly — this is temporary. Wait a few minutes before trying again, rather than retrying right away." };
      }
      // Distinct from a wrong password — this account genuinely exists but has been disabled, so
      // no password will ever work for it until an admin re-enables it. Collapsing this into the
      // generic message would look exactly like a typo and send someone retrying indefinitely at
      // something no amount of correct typing could ever fix.
      if (e.code === "auth/user-disabled") {
        return { ok: false, error: "This account has been disabled. Contact your admin — this isn't something retrying will fix." };
      }
      return { ok: false, error: e.code === "auth/invalid-credential" ? "Incorrect email or password." : "Couldn't sign in — try again." };
    }
  };

  // De-registers this device's push token before actually signing out — without this, the token
  // stays registered under the account that's leaving, so if a different person signs in on this
  // same device afterward and turns notifications on, both accounts end up sharing the same
  // device token: whichever one is currently signed in would receive push notifications meant for
  // BOTH of them, since FCM has no way to know only one person is actually using the device right
  // now. Best-effort — if this fails for any reason, sign-out still proceeds; a stray token is a
  // far smaller problem than someone being unable to sign out at all.
  const signOutTeacher = async () => {
    if (authUser) { try { await disableNotificationsFor(authUser.uid); } catch { /* best-effort */ } }
    return signOut(auth);
  };

  // Self-service password change — Firebase requires a "recent" sign-in for security-sensitive
  // operations like this, so we re-authenticate with their current password first (proving they
  // really are who they say they are right now) before applying the new one.
  const changeMyPassword = async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      if (!user) return { ok: false, error: "You're not signed in." };
      const trimmedNew = newPassword.trim();
      const credential = EmailAuthProvider.credential(user.email, currentPassword.trim());
      await reauthenticateWithCredential(user, credential);
      // Trimmed here too — the same missing-trim bug already found and fixed in account creation,
      // admin password reset, and the email-link reset flow. A stray space typed into the new
      // password here would get permanently stored exactly as typed, unrecoverable by careful
      // typing at sign-in afterward.
      await updatePassword(user, trimmedNew);
      return { ok: true };
    } catch (e) {
      if (e.code === "auth/too-many-requests") {
        return { ok: false, error: "Too many attempts too quickly — this is temporary. Wait a few minutes before trying again." };
      }
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") return { ok: false, error: "That current password isn't right." };
      if (e.code === "auth/weak-password") return { ok: false, error: "New password needs to be at least 6 characters." };
      return { ok: false, error: "Couldn't change the password — try again." };
    }
  };

  // The live subscription that keeps currentTeacher current for the rest of the session already
  // watches this exact same document — a save immediately followed by that document changing is
  // precisely what it's built to catch, on its own, a moment later. No separate local update
  // needed here to reflect it.
  const changeMyName = async (newName) => {
    if (!currentTeacher) return;
    await updateTeacherRecord(currentTeacher.uid, { name: newName });
  };

  const changeMyFamilyName = async (newName) => {
    if (!currentFamily) return;
    await updateFamilyRecord(currentFamily.uid, { name: newName });
    setAuthResolvedFamily((prev) => ({ ...prev, name: newName }));
  };

  // Same reasoning as changeMyName just above.
  const changeMySignOff = async (newSignOff) => {
    if (!currentTeacher) return;
    await updateTeacherRecord(currentTeacher.uid, { messageSignOff: newSignOff });
  };

  // Pushing a real history entry here (not just changing React state) is what makes the Android
  // hardware back button actually step back to the class picker instead of closing the app
  // outright — without this, the browser has no history of its own to go back through, so it
  // falls straight through to exiting. Reflecting classId in the URL also means a reload (or the
  // OS fully killing and restarting the page in the background, which happens on some phones)
  // can restore the same class instead of always resetting to the picker.
  const enterAssignedClass = (cls) => {
    setClassId(cls.id);
    setClassName(cls.name);
    const url = new URL(window.location.href);
    url.searchParams.set("classId", cls.id);
    // Explicitly dropped, not just left alone — a notification's one-time "open=messages&groupId="
    // params could still be sitting on the current URL when this runs from the deep-link resolver,
    // and they'd be wrong to carry forward into ongoing navigation/restore state.
    url.searchParams.delete("open");
    url.searchParams.delete("groupId");
    // Also dropped — this is the actual root cause behind "a preschool class briefly (or
    // persistently) looks like an elementary one right after switching into it." ClassApp reads a
    // ?view= URL param first, before falling back to a classType-based default (preschool →
    // "daily-log", elementary → "home") — so if the class just switched away from had set, say,
    // ?view=home in the URL, entering a DIFFERENT class here without dropping that param first
    // meant the new class inherited the previous one's screen regardless of its own type, showing
    // exactly the wrong default until manually navigated away from.
    url.searchParams.delete("view");
    window.history.pushState({ classId: cls.id }, "", url);
  };

  const signOutStaff = async () => {
    setClassId(null);
    setClassName("");
    await signOutTeacher();
  };

  // Genuinely goes BACK through history now, rather than pushing a fresh new entry that happens
  // to look the same — this is exactly the class of bug behind "back sometimes skips two steps":
  // every tap of this in-app button used to silently pad the history stack with one more entry
  // than the visible navigation actually had, so the real depth of the stack quietly drifted out
  // of sync with what the person on screen could see. Popping the entry enterAssignedClass already
  // pushed, instead of layering a new one on top of it, is what keeps those back in sync.
  const backToTeacherClassPicker = () => {
    if (window.history.state?.classId) {
      window.history.back();
    } else {
      // No class-entry to pop back through (e.g. this class was reached by a fresh page load
      // rather than a tap from the picker) — fall back to clearing state directly rather than
      // risk history.back() leaving the app entirely.
      setClassId(null);
      setClassName("");
      const url = new URL(window.location.href);
      url.searchParams.delete("classId");
      window.history.replaceState({ classId: null }, "", url);
    }
  };

  // The actual back-button handler — fires on the hardware/gesture back press, and on the
  // browser's own back/forward buttons if this were ever opened in a regular tab. Reads whatever
  // the URL now says (that's already been updated by the browser itself by the time this fires)
  // and syncs React state to match, rather than re-deriving a "previous" value — the URL is
  // already the source of truth at this point.
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlClassId = params.get("classId");
      if (urlClassId && currentTeacher) {
        const target = registry.find((c) => !c.archived && c.id === urlClassId && (currentTeacher.assignedClassIds || []).includes(c.id));
        if (target) {
          setClassId(target.id);
          setClassName(target.name);
          return;
        }
      }
      setClassId(null);
      setClassName("");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [registry, currentTeacher]);

  // Creating another person's login can't happen from the browser with normal client
  // credentials — it needs elevated, server-side access, so this calls a dedicated backend
  // function (same pattern as the AI report-drafting proxy: privileged credentials live only
  // on the server, never in the browser).
  const createTeacherAccount = async (name, email, tempPassword, role, assignedClassIds, isSubstitute, messagingClassTypes) => {
    try {
      const response = await fetch("/api/create-teacher", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ name, email, password: tempPassword, role, assignedClassIds, isSubstitute, messagingClassTypes }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || "Couldn't create the account." };
      await refreshTeachers();
      return { ok: true, linkedExisting: data.linkedExisting, uid: data.uid };
    } catch {
      return { ok: false, error: "Couldn't reach the server — try again." };
    }
  };

  // Directly sets a NEW password for an existing teacher, admin-side, with no email round-trip at
  // all — the fastest possible way to unblock someone. "Forgot password" is normally the right
  // tool (it doesn't require the admin to know or relay a password at all), but it depends on the
  // affected person actually being free to go check an inbox right now, which — on a chaotic first
  // day, mid-classroom — often just isn't true. Requires its own server endpoint for the same
  // reason account creation does: setting somebody else's password needs elevated admin
  // credentials the browser can never hold.
  const resetTeacherPassword = async (uid, newPassword) => {
    try {
      const response = await fetch("/api/reset-teacher-password", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ uid, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || "Couldn't reset the password." };
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't reach the server — try again." };
    }
  };

  // Looks up a teacher's REAL account state directly, rather than guessing — built in direct
  // response to a real, reported pattern that earlier, individually-targeted fixes this session
  // (a rate-limit guess, a storage-persistence guess) did not actually explain: accounts that
  // worked, then stopped, across multiple different teachers, not just new accounts with a bad
  // password. See check-teacher-account.js for the full reasoning.
  const checkTeacherAccount = async (email) => {
    try {
      const response = await fetch("/api/check-teacher-account", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) return { ok: false, error: data.error || "Couldn't check this account." };
      return { ok: true, ...data };
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

  // A flat, school-wide list of every student across every active class, each tagged with which
  // class they're in — exactly what admin needs to search/browse when linking a family account to
  // their child(ren), since a family's studentLinks point directly at {classId, studentId} pairs.
  const fetchAllStudentsForLinking = async () => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const flat = [];
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      clsRoster.forEach((s) => flat.push({ classId: cls.id, className: cls.name, studentId: s.id, studentName: s.name }));
    }
    return flat;
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

  const createClass = async (name, password, classType) => {
    const id = uid();
    const cls = { id, name, password, classType: classType || "elementary" };
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

  // The code itself is now verified server-side (verify-substitute-code.js), not against
  // schoolClasses read directly in the browser — that only ever worked because schoolClasses
  // used to be readable before signing in, which was itself a real exposure (every class's
  // plaintext password, visible to anyone) fixed as part of the security pass. A correct code
  // now returns a real but narrowly-scoped sign-in: a custom token carrying a substituteClassId
  // claim for exactly this one class, which the Firestore rules check directly.
  const enterSubstituteSession = async (code) => {
    try {
      const response = await fetch("/api/verify-substitute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) return { ok: false };
      await signInWithCustomToken(auth, data.token);
      setClassId(data.classId);
      setClassName(data.className);
      setIsSubstituteSession(true);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  const exitSubstituteSession = () => {
    setIsSubstituteSession(false);
    setClassId(null);
    setClassName("");
    signOut(auth);
  };

  const archiveClass = async () => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === classId ? { ...c, archived: true } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
    switchClass();
  };

  // Same as archiveClass, but for admin managing any class by id, not necessarily the one
  // currently entered — archiving a class from outside it doesn't need to navigate anywhere after.
  const archiveClassById = async (id) => {
    const reg = await loadJSON("schoolClasses", [], true);
    const next = reg.map((c) => (c.id === id ? { ...c, archived: true } : c));
    setRegistry(next);
    await saveJSON("schoolClasses", next, true);
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

  const findDuplicateEnrollments = async () => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const activeClasses = (allClasses || []).filter((c) => !c.archived);
    const rosters = await Promise.all(activeClasses.map(async (c) => ({
      classId: c.id, className: c.name, roster: await loadJSON(`class:${c.id}:roster`, [], true),
    })));
    const byStudentId = {};
    rosters.forEach(({ classId, className, roster }) => {
      roster.forEach((s) => {
        if (!byStudentId[s.id]) byStudentId[s.id] = { name: s.name, classes: [] };
        byStudentId[s.id].classes.push({ classId, className });
      });
    });
    return Object.entries(byStudentId)
      .filter(([, v]) => v.classes.length > 1)
      .map(([studentId, v]) => ({ studentId, name: v.name, classes: v.classes }));
  };

  // A real, reported case — a parent couldn't see what a teacher logged for their own child, and
  // crucially, neither could the teacher, looking at that exact same child's own detail view. That
  // rules out anything about how the data gets displayed (a live-mirror problem would still show
  // real data once actually reached) and points somewhere the earlier duplicate-enrollment check
  // above can't see at all: that one groups by studentId, so it only ever catches the SAME id
  // showing up in more than one class. It has no way to notice two DIFFERENT ids that happen to
  // share a name — which is exactly what would make logging look like it's silently vanishing:
  // a teacher logging against roster entry A, while whatever's actually being viewed (a parent's
  // own studentLink, or even a stale reference on the teacher's own side) points at a completely
  // separate, empty roster entry B that just happens to have the identical name. Searches every
  // roster and every family's studentLinks directly by name, case-insensitively, and surfaces
  // every distinct id found under that name along with what data — if any — actually exists under
  // each one, so a mismatch like this becomes directly visible instead of inferred.
  const checkStudentDataIntegrity = async (name) => {
    const trimmedName = (name || "").trim().toLowerCase();
    if (!trimmedName) return { rosterEntries: [], familyLinks: [] };

    const allClasses = await loadJSON("schoolClasses", [], true);
    const activeClasses = (allClasses || []).filter((c) => !c.archived);
    const rosterEntries = [];
    for (const cls of activeClasses) {
      const roster = await loadJSON(`class:${cls.id}:roster`, [], true);
      for (const s of roster) {
        if ((s.name || "").trim().toLowerCase() !== trimmedName) continue;
        const kriya = await loadJSON(`class:${cls.id}:kriya:${s.id}`, null, true);
        const counts = kriya ? {
          meals: (kriya.meals || []).length, naps: (kriya.naps || []).length,
          checkIns: (kriya.checkIns || []).length, diapers: (kriya.diapers || []).length,
          bathroom: (kriya.bathroom || []).length, mood: (kriya.mood || []).length,
        } : null;
        rosterEntries.push({ classId: cls.id, className: cls.name, studentId: s.id, hasAnyData: kriya ? Object.values(counts).some((n) => n > 0) : false, counts });
      }
    }

    const allFamilies = await loadAllWithPrefix("family:");
    const familyLinks = [];
    (allFamilies || []).forEach((f) => {
      (f.studentLinks || []).forEach((l) => {
        if ((l.studentName || "").trim().toLowerCase() !== trimmedName) return;
        const matchesCurrentRoster = rosterEntries.some((r) => r.classId === l.classId && r.studentId === l.studentId);
        familyLinks.push({ guardianName: f.name, guardianEmail: f.email, classId: l.classId, className: l.className, studentId: l.studentId, matchesCurrentRoster });
      });
    });

    return { rosterEntries, familyLinks };
  };

  // Finds any preschool student with more than one meal entry for the same day and meal type, or
  // more than one nap entry for the same day — exactly the duplicate a real, reported bug allowed
  // to happen before the underlying race condition was fixed (see freshStudentData). That fix
  // stops it from happening again going forward, but can't reach back and clean up whatever
  // duplicates already exist from before it went live — this is what actually finds those, across
  // every preschool class at once, so they can be reviewed and cleaned up by hand rather than
  // waiting for a parent to notice each one individually.
  const findDuplicateDailyLogs = async () => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const preschoolClasses = (allClasses || []).filter((c) => c.classType === "preschool" && !c.archived);
    const results = [];
    for (const cls of preschoolClasses) {
      const roster = await loadJSON(`class:${cls.id}:roster`, [], true);
      for (const student of roster) {
        const data = await loadJSON(`class:${cls.id}:kriya:${student.id}`, null, true);
        if (!data) continue;
        const mealGroups = {};
        (data.meals || []).forEach((m) => {
          const key = `${m.date}:${m.mealType}`;
          (mealGroups[key] = mealGroups[key] || []).push(m);
        });
        Object.entries(mealGroups).forEach(([key, entries]) => {
          if (entries.length <= 1) return;
          const [date, mealType] = key.split(":");
          const label = mealType === "snack-am" ? "Morning Snack" : mealType === "snack-pm" ? "Afternoon Snack" : "Lunch";
          results.push({ classId: cls.id, className: cls.name, studentId: student.id, studentName: student.name, category: "meals", label, date, entries });
        });
        const napGroups = {};
        (data.naps || []).forEach((n) => { (napGroups[n.date] = napGroups[n.date] || []).push(n); });
        Object.entries(napGroups).forEach(([date, entries]) => {
          if (entries.length <= 1) return;
          results.push({ classId: cls.id, className: cls.name, studentId: student.id, studentName: student.name, category: "naps", label: "Nap", date, entries });
        });
      }
    }
    return results;
  };

  // Removes exactly one duplicate entry by matching its full content against a freshly re-fetched
  // copy of the record, rather than trusting a remembered array index that could have drifted if
  // anything else touched this student's data in the meantime — meals/naps entries have no stable
  // id of their own the way diapers/bathroom entries do, so content match is what's actually safe.
  const removeDailyLogDuplicate = async (classId, studentId, category, entryToRemove) => {
    const data = await loadJSON(`class:${classId}:kriya:${studentId}`, null, true);
    if (!data) return;
    const list = data[category] || [];
    const idx = list.findIndex((e) => JSON.stringify(e) === JSON.stringify(entryToRemove));
    if (idx === -1) return; // already gone — someone else removed it, or it changed since this was shown
    const updated = { ...data, [category]: list.filter((_, i) => i !== idx) };
    await saveJSON(`class:${classId}:kriya:${studentId}`, updated, true);
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

  // The set of fields addExistingStudent (below) copies as a one-time snapshot when a student is
  // first pulled into a class roster — every one of these needs to stay in sync afterward, or an
  // edit here (a name's correct spelling, a fixed phone number) keeps showing the old value
  // anywhere that already has its own copy: a class roster, a family search, anywhere a
  // student's name gets displayed from roster data rather than from globalStudents itself.
  const GLOBAL_STUDENT_SYNCED_FIELDS = ["name", "parentEmail", "parentPhone", "parent1Name", "parent2Name", "parent2Email", "parent2Phone", "homeAddress", "notes"];
  // Reads and writes the in-memory globalStudents state directly, rather than re-fetching it from
  // the backend first — that re-fetch is what actually broke editing: every keystroke in a text
  // field fired its own independent read-modify-write cycle, and typing faster than one full
  // round trip meant a later keystroke's read could return a snapshot from BEFORE an earlier
  // keystroke's write had landed, silently discarding it when that earlier write then finished
  // second. The functional form of setGlobalStudents is what keeps this safe even when several
  // calls do land close together — React applies each one against the true latest state in order,
  // never against a state a call happened to close over when it was first invoked.
  const updateGlobalStudent = async (id, field, value) => {
    let next;
    setGlobalStudents((prev) => {
      next = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      return next;
    });
    await saveJSON("globalStudents", next, true);
    // Propagates into every class roster that already has its own copy of this same student —
    // otherwise this edit only ever reaches globalStudents itself, and every place that reads a
    // roster's own copy (a class's own roster view, the "search students" list used to link a
    // family, cross-class history) keeps showing whatever was true at the moment that class first
    // pulled this student in, no matter how many times it's corrected here afterward.
    if (GLOBAL_STUDENT_SYNCED_FIELDS.includes(field)) {
      const allClasses = await loadJSON("schoolClasses", [], true);
      await Promise.all(allClasses.map(async (cls) => {
        const rosterKey = `class:${cls.id}:roster`;
        const clsRoster = await loadJSON(rosterKey, [], true);
        if (!clsRoster.some((s) => s.linkedGlobalId === id || s.id === id)) return; // this class never had this student — nothing to update
        const nextRoster = clsRoster.map((s) => ((s.linkedGlobalId === id || s.id === id) ? { ...s, [field]: value } : s));
        await saveJSON(rosterKey, nextRoster, true);
      }));
    }
    // A family's own studentLinks carries its own separate snapshot of just the child's name
    // (studentLinks[].studentName) — the actual field the parent app reads to show a child's name
    // at all, so a name correction needs to reach this too, not just the class roster copy above.
    if (field === "name") {
      const allFamilies = await loadAllWithPrefix("family:");
      const affected = allFamilies.filter((f) => (f.studentLinks || []).some((l) => l.studentId === id));
      await Promise.all(affected.map((f) => {
        const nextLinks = f.studentLinks.map((l) => (l.studentId === id ? { ...l, studentName: value } : l));
        return saveJSON(`family:${f.uid}`, { ...f, studentLinks: nextLinks }, true);
      }));
      if (affected.length > 0) {
        const affectedUids = new Set(affected.map((f) => f.uid));
        setFamilies((prev) => prev.map((f) => (affectedUids.has(f.uid)
          ? { ...f, studentLinks: f.studentLinks.map((l) => (l.studentId === id ? { ...l, studentName: value } : l)) }
          : f)));
      }
    }
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
    // Same fix as enterAssignedClass above, for the same reason — a ?view= param left over from a
    // previously-viewed class (of a possibly different type) would otherwise carry straight into
    // this one too.
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState(window.history.state, "", url);
  };

  const backToAdminDashboard = () => {
    setClassId(null);
    setClassName("");
  };

  if (checkingSession || !authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-teal-700" size={28} /></div>;
  }

  // A password-reset link takes priority over everything else — whoever clicked it may not be
  // signed in at all, or may be signed in as someone else entirely on a shared device, and either
  // way this needs to run before any of that gets decided.
  if (resetPasswordCode) {
    return <ResetPasswordScreen oobCode={resetPasswordCode} onDone={() => { window.history.replaceState({}, "", window.location.pathname); window.location.reload(); }} />;
  }

  const hasTeacherRole = Boolean(currentTeacher);
  const hasFamilyRole = Boolean(currentFamily);
  const canSwitchRoles = hasTeacherRole && hasFamilyRole;

  // Parent mode — reached via the direct link, chosen from the role chooser below, switched into
  // from the teacher side, or simply the only role this account has. A teacher-only account never
  // lands here at all (hasFamilyRole is false, so activeMode can never become "parent" for them),
  // and a family-only account still can't reach the teacher app (the reverse holds symmetrically
  // in the teacher branch below) — the only account type this actually opens up is one that
  // genuinely holds both records.
  if (activeMode === "parent") {
    if (!authUser || !currentFamily) {
      return <ParentSignInScreen onSignIn={signInTeacher} isSignedInAsSomethingElse={Boolean(authUser && !currentFamily)}
        onSignInWithGoogle={signInWithGoogle} pendingGoogleLink={pendingGoogleLink} onCompleteGoogleLink={completeGoogleLink} googleSignInError={googleSignInError} />;
    }
    return <ParentPortalApp family={currentFamily} onSignOut={async () => { if (authUser) { try { await disableNotificationsFor(authUser.uid); } catch { /* best-effort */ } } return signOut(auth); }} onUpdateName={changeMyFamilyName} onChangeMyPassword={changeMyPassword}
      canSwitchToTeacher={hasTeacherRole} onSwitchToTeacher={() => setActiveMode("teacher")} />;
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
    // A dual-role account that hasn't picked a side yet this session — every other case (single
    // role, or a role already chosen) skips straight past this.
    if (canSwitchRoles && activeMode === null) {
      return <RoleChooserScreen teacherName={currentTeacher.name} familyName={currentFamily.name} onChoose={setActiveMode} onSignOut={signOutStaff} />;
    }
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
    if (isAdminRole(currentTeacher)) {
      if (!classId) {
        return <AdminDashboard registry={registry} onEnterClass={enterAssignedClass} onCreate={createClass} onRefresh={refreshRegistry} onLogout={signOutStaff} onRestore={restoreClass} onDeleteClass={deleteClassPermanently} onArchiveClassById={archiveClassById} onChangePassword={changeAdminPassword}
          currentTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName} onChangeMySignOff={changeMySignOff}
          globalStudents={globalStudents} onRefreshStudents={refreshGlobalStudents} onAddStudent={addGlobalStudent} onUpdateStudent={updateGlobalStudent} onArchiveStudent={archiveGlobalStudent} onRestoreStudent={restoreGlobalStudent} onDeleteStudent={deleteGlobalStudentPermanently} onBulkAddStudents={bulkAddGlobalStudents} onFindDuplicateEnrollments={findDuplicateEnrollments} onFindDuplicateDailyLogs={findDuplicateDailyLogs} onRemoveDailyLogDuplicate={removeDailyLogDuplicate} onCheckStudentDataIntegrity={checkStudentDataIntegrity}
          schoolEvents={schoolEvents} onRefreshEvents={refreshSchoolEvents} onAddEvent={addSchoolEvent} onUpdateEvent={updateSchoolEvent} onRemoveEvent={removeSchoolEvent}
          schoolTools={schoolTools} onRefreshTools={refreshSchoolTools} onAddTool={addSchoolTool} onUpdateTool={updateSchoolTool} onRemoveTool={removeSchoolTool}
          teachers={teachers} onRefreshTeachers={refreshTeachers} onCreateTeacher={createTeacherAccount} onUpdateTeacher={updateTeacherRecord} onToggleTeacherClass={toggleTeacherClassAssignment} onResetTeacherPassword={resetTeacherPassword} onCheckTeacherAccount={checkTeacherAccount} onDeactivateTeacher={deactivateTeacherRecord} onDeleteTeacher={deleteTeacherPermanently}
          families={families} onRefreshFamilies={refreshFamilies} onCreateFamily={createFamilyAccount} onAddGuardianToFamily={addGuardianToFamily} onCreateStudentInClass={createStudentInClass} onUpdateFamily={updateFamilyRecord} onDeactivateFamily={deactivateFamilyRecord} onDeleteFamily={deleteFamilyPermanently} onFetchAllStudentsForLinking={fetchAllStudentsForLinking}
          onFetchDailyOverview={fetchDailyOverview} onFetchStudentHistory={fetchAdminStudentHistory} onFetchStudentClassMap={fetchStudentClassMap} onFetchStudentProfile={fetchAdminStudentProfile} onBuildExportData={buildExportData}
          programs={programs} onRefreshPrograms={refreshPrograms} onAddProgram={addProgram} onUpdateProgram={updateProgram} onRemoveProgram={removeProgram} onFetchProgramDetail={fetchProgramDetail} onAddProgramPoints={addProgramPointsAdmin} onAddProgramCategory={addProgramCategoryAdmin}
          canSwitchToParent={hasFamilyRole} onSwitchToParent={() => setActiveMode("parent")} />;
      }
      return (
        <ClassApp classId={classId} className={className} classType={registry.find((c) => c.id === classId)?.classType}
          onSwitchClass={backToTeacherClassPicker} switchLabel="Admin · Back to dashboard"
          onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently}
          subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
          loggedInTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName} onChangeMySignOff={changeMySignOff}
          canSwitchToParent={hasFamilyRole} onSwitchToParent={() => setActiveMode("parent")}
          createFamilyAccount={createFamilyAccount} updateFamilyRecord={updateFamilyRecord} onFamilyLinked={refreshCurrentFamily} />
      );
    }
    // Real teacher — only ever sees classes they're actually assigned to.
    const myClasses = registry.filter((c) => !c.archived && (currentTeacher.assignedClassIds || []).includes(c.id));
    if (!classId || !myClasses.some((c) => c.id === classId)) {
      // Zero assigned classes, but reachable by grade level (messagingClassTypes) — this is
      // someone like a curriculum coordinator, not a classroom teacher. They get their own
      // standalone messages page instead of an empty class picker with nowhere to go; there is
      // deliberately no class list here at all, not even a placeholder one.
      if (myClasses.length === 0 && (currentTeacher.messagingClassTypes || []).length > 0) {
        return <StaffMessagesHome loggedInTeacher={currentTeacher} canSwitchToParent={hasFamilyRole} onSwitchToParent={() => setActiveMode("parent")} onSignOut={signOutStaff} deepLinkGroupId={pendingStaffDeepLink?.groupId} />;
      }
      return <TeacherClassPicker teacherName={currentTeacher.name} classes={myClasses} onSelect={enterAssignedClass} onSignOut={signOutStaff} />;
    }
    return (
      <ClassApp classId={classId} className={className} classType={registry.find((c) => c.id === classId)?.classType}
        onSwitchClass={backToTeacherClassPicker} switchLabel="Switch class"
        onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently}
        subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
        loggedInTeacher={currentTeacher} onChangeMyPassword={changeMyPassword} onChangeMyName={changeMyName} onChangeMySignOff={changeMySignOff}
        canSwitchToParent={hasFamilyRole} onSwitchToParent={() => setActiveMode("parent")}
        createFamilyAccount={createFamilyAccount} updateFamilyRecord={updateFamilyRecord} onFamilyLinked={refreshCurrentFamily}
        deepLinkGroupId={pendingDeepLink?.classId === classId ? pendingDeepLink.groupId : null}
        deepLinkIsDirect={pendingDeepLink?.classId === classId ? pendingDeepLink.isDirect : false} />
    );
  }

  // Not signed in with a real account — show the new sign-in screen by default, with the
  // original class-password flow available as an explicit fallback (useful until every
  // teacher has a real account set up, so nobody gets locked out mid-transition).
  if (!useLegacyFlow) {
    return <TeacherSignInScreen onSignIn={signInTeacher} onUseLegacyFlow={() => setUseLegacyFlow(true)} onEnterSubstitute={enterSubstituteSession}
      onSignInWithGoogle={signInWithGoogle} pendingGoogleLink={pendingGoogleLink} onCompleteGoogleLink={completeGoogleLink} googleSignInError={googleSignInError} />;
  }
  if (!classId) {
    if (isAdminSession) {
      return <AdminDashboard registry={registry} onEnterClass={enterClassAsAdmin} onCreate={createClass} onRefresh={refreshRegistry} onLogout={logoutAdmin} onRestore={restoreClass} onDeleteClass={deleteClassPermanently} onArchiveClassById={archiveClassById} onChangePassword={changeAdminPassword}
        globalStudents={globalStudents} onRefreshStudents={refreshGlobalStudents} onAddStudent={addGlobalStudent} onUpdateStudent={updateGlobalStudent} onArchiveStudent={archiveGlobalStudent} onRestoreStudent={restoreGlobalStudent} onDeleteStudent={deleteGlobalStudentPermanently} onBulkAddStudents={bulkAddGlobalStudents} onFindDuplicateEnrollments={findDuplicateEnrollments} onFindDuplicateDailyLogs={findDuplicateDailyLogs} onRemoveDailyLogDuplicate={removeDailyLogDuplicate} onCheckStudentDataIntegrity={checkStudentDataIntegrity}
        schoolEvents={schoolEvents} onRefreshEvents={refreshSchoolEvents} onAddEvent={addSchoolEvent} onUpdateEvent={updateSchoolEvent} onRemoveEvent={removeSchoolEvent}
          schoolTools={schoolTools} onRefreshTools={refreshSchoolTools} onAddTool={addSchoolTool} onUpdateTool={updateSchoolTool} onRemoveTool={removeSchoolTool}
        teachers={teachers} onRefreshTeachers={refreshTeachers} onCreateTeacher={createTeacherAccount} onUpdateTeacher={updateTeacherRecord} onToggleTeacherClass={toggleTeacherClassAssignment} onResetTeacherPassword={resetTeacherPassword} onCheckTeacherAccount={checkTeacherAccount} onDeactivateTeacher={deactivateTeacherRecord} onDeleteTeacher={deleteTeacherPermanently}
        families={families} onRefreshFamilies={refreshFamilies} onCreateFamily={createFamilyAccount} onAddGuardianToFamily={addGuardianToFamily} onCreateStudentInClass={createStudentInClass} onUpdateFamily={updateFamilyRecord} onDeactivateFamily={deactivateFamilyRecord} onDeleteFamily={deleteFamilyPermanently} onFetchAllStudentsForLinking={fetchAllStudentsForLinking}
        onFetchDailyOverview={fetchDailyOverview} onFetchStudentHistory={fetchAdminStudentHistory} onFetchStudentClassMap={fetchStudentClassMap} onFetchStudentProfile={fetchAdminStudentProfile} onBuildExportData={buildExportData}
        programs={programs} onRefreshPrograms={refreshPrograms} onAddProgram={addProgram} onUpdateProgram={updateProgram} onRemoveProgram={removeProgram} onFetchProgramDetail={fetchProgramDetail} onAddProgramPoints={addProgramPointsAdmin} onAddProgramCategory={addProgramCategoryAdmin} />;
    }
    return <ClassGateScreen registry={registry} onSelect={selectClass} onCreate={createClass} onRefresh={refreshRegistry} onLoginAdmin={loginAdmin} />;
  }
  return (
    <ClassApp classId={classId} className={className} classType={registry.find((c) => c.id === classId)?.classType}
      onSwitchClass={isAdminSession ? backToAdminDashboard : switchClass}
      switchLabel={isAdminSession ? "Admin \u00b7 Back to dashboard" : "Switch class"}
      subCode={registry.find((c) => c.id === classId)?.subCode} onGenerateSubCode={generateSubCode} onClearSubCode={clearSubCode}
      onRenameClass={renameClass} onChangePassword={changeClassPassword} onArchiveClass={archiveClass} onDeleteClass={deleteOwnClassPermanently} />
  );
}


// Triggered from either sign-in screen — one shared flow since a reset email works identically
// regardless of whether the account is a teacher or a family. Deliberately shows the same
// confirmation message whether or not the email actually has an account: revealing that
// difference would let someone probe, one email at a time, for which addresses are registered —
// a real privacy leak the standard "if an account exists, we've sent a link" phrasing avoids.
// Shown on both sign-in screens (teacher and parent) — either a plain "Continue with Google"
// button, or, once pendingGoogleLink is set, a small form asking for the existing account's
// password instead. That second state is Firebase's real, documented default behavior: signing
// in with Google does NOT silently take over an existing email/password account sharing the same
// address, it requires proving it's genuinely the same person first. Confirming the password here
// links the two together — from that point on, either one signs into the same account.
// Shown when the app itself detects a real Firebase reset link (?mode=resetPassword&oobCode=...
// in the URL) — this is what keeps the whole flow inside the app's own look, rather than
// bouncing someone out to a generic, unbranded Firebase page mid-flow. All the actual security —
// the code's validity, expiration, and single-use enforcement — is handled by Firebase itself;
// this only ever displays what Firebase already told it.
function ResetPasswordScreen({ oobCode, onDone }) {
  const [status, setStatus] = useState("checking"); // "checking" | "ready" | "invalid" | "done"
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => { setEmail(verifiedEmail); setStatus("ready"); })
      .catch(() => setStatus("invalid"));
  }, [oobCode]);

  const save = async () => {
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (trimmedPassword !== confirm.trim()) { setError("Passwords don't match."); return; }
    setError("");
    setSaving(true);
    try {
      // Trimmed here, not just at sign-in — a stray leading or trailing space typed into a NEW
      // password (autocorrect, an accidental space, a copy-paste from elsewhere) would otherwise
      // get permanently stored exactly as typed, unrecoverable by careful typing at sign-in
      // afterward since the mismatch already exists in what Firebase itself has on file. This is
      // the exact self-service tool someone locked out would use to recover — the same missing-
      // trim bug already found and fixed in account creation and admin password reset, here too.
      await confirmPasswordReset(auth, oobCode, trimmedPassword);
      setStatus("done");
    } catch {
      setError("That link has expired or was already used — request a new one from the sign-in screen.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "linear-gradient(180deg, #f6f2e9 0%, #fbf8f1 100%)" }}>
      <GlobalAppStyles />
      <div className="max-w-sm w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        {status === "checking" && <p className="text-sm text-stone-500 text-center py-6">Checking your link...</p>}

        {status === "invalid" && (
          <>
            <p className="text-lg font-bold text-stone-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>Link expired</p>
            <p className="text-sm text-stone-600 mb-4">This reset link has expired or was already used. Head back to the sign-in screen and request a new one.</p>
            <button onClick={onDone} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">Back to sign in</button>
          </>
        )}

        {status === "ready" && (
          <>
            <p className="text-lg font-bold text-stone-900 mb-1" style={{ fontFamily: "Georgia, serif" }}>Set a new password</p>
            <p className="text-xs text-stone-400 mb-4">for {email}</p>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (6+ characters)" className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2.5 focus:border-teal-500 focus:outline-none" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Confirm new password" className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-3 focus:border-teal-500 focus:outline-none" />
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <button onClick={save} disabled={saving} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {saving ? "Saving..." : "Set new password"}
            </button>
          </>
        )}

        {status === "done" && (
          <>
            <p className="text-lg font-bold text-stone-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>Password updated</p>
            <p className="text-sm text-stone-600 mb-4">You can now sign in with your new password.</p>
            <button onClick={onDone} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">Continue to sign in</button>
          </>
        )}
      </div>
    </div>
  );
}

function TeacherSignInScreen({ onSignIn, onUseLegacyFlow, onEnterSubstitute, onSignInWithGoogle, pendingGoogleLink, onCompleteGoogleLink, googleSignInError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [showSubEntry, setShowSubEntry] = useState(false);
  const [subCode, setSubCode] = useState("");
  const [subError, setSubError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Temporary diagnostic display — see logAuthDebug's own comment for why this exists at all.
  // Re-reads window.__authDebugLog on an interval rather than once, since new entries keep
  // getting pushed after this screen has already rendered (that's the entire point — this
  // screen is exactly where someone lands after the bounce-back being diagnosed, and the log
  // needs to show what happened right up to that moment, not just what had happened by the
  // time this component's very first render occurred).
  const [debugLog, setDebugLog] = useState(() => [...(window.__authDebugLog || [])]);
  const [showDebugLog, setShowDebugLog] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setDebugLog([...(window.__authDebugLog || [])]), 500);
    return () => clearInterval(interval);
  }, []);

  const trySignIn = async () => {
    if (!email.trim() || !password) return;
    setError("");
    setSigningIn(true);
    // Trimmed to match the same cleanup now applied when an admin sets a temporary password —
    // catches accidental whitespace from either end (an autofill, a copy-paste with a stray
    // space) landing only on one side of the comparison and turning into a mismatch that looks
    // exactly like "the password is wrong" even though the visible characters match.
    const result = await onSignIn(email.trim(), password.trim());
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
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      <div className="max-w-sm w-full">
        <img src="/logo-transparent.png" alt="Classroom Tracker" className="w-48 mx-auto mb-5" />
        <h1 className="display-font text-2xl font-bold text-stone-900 text-center mb-1">Welcome back</h1>
        <p className="text-stone-500 text-sm text-center mb-7">Sign in with your teacher account</p>

        <GoogleSignInSection onSignInWithGoogle={onSignInWithGoogle} pendingGoogleLink={pendingGoogleLink} onCompleteGoogleLink={onCompleteGoogleLink} googleSignInError={googleSignInError} />
        {!pendingGoogleLink && !shouldHideGoogleSignIn() && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-stone-200" /><span className="text-[10px] text-stone-400">OR</span><div className="flex-1 h-px bg-stone-200" />
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 shadow-sm">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Email" autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2.5 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && trySignIn()}
            placeholder="Password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm mb-2 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          <button onClick={() => setShowForgotPassword(true)} className="text-xs font-semibold text-stone-400 hover:text-teal-700 mb-3">Forgot password?</button>
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

        {debugLog.length > 0 && (
          <div className="mt-4 bg-stone-900 rounded-xl overflow-hidden">
            <button onClick={() => setShowDebugLog((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-300">
              <span>Diagnostic info (temporary) — screenshot this if sign-in isn't working</span>
              <span>{showDebugLog ? "▾" : "▸"}</span>
            </button>
            {showDebugLog && (
              <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                {debugLog.map((line, i) => (
                  <p key={i} className="text-[10px] font-mono text-emerald-300 leading-relaxed">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Shown once, only for an account that genuinely holds both a teacher record and a family
// record, the first time it signs in without an already-established mode. After this, switching
// is a small link inside either app — this screen doesn't come back on every login.
function RoleChooserScreen({ teacherName, familyName, onChoose, onSignOut }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <GlobalAppStyles />
      <div className="max-w-sm w-full text-center">
        <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Welcome back</h1>
        <p className="text-sm text-stone-500 mb-6">This account is set up as both a teacher and a family here — which would you like to open?</p>
        <div className="space-y-3">
          <button onClick={() => onChoose("teacher")} className="w-full bg-teal-700 text-white rounded-xl py-4 text-sm font-bold hover:bg-teal-800">
            Continue as Teacher{teacherName ? ` — ${teacherName}` : ""}
          </button>
          <button onClick={() => onChoose("parent")} className="w-full bg-white border-2 border-teal-700 text-teal-700 rounded-xl py-4 text-sm font-bold hover:bg-teal-50">
            Continue as Parent{familyName ? ` — ${familyName}` : ""}
          </button>
        </div>
        <button onClick={onSignOut} className="text-xs font-semibold text-stone-400 hover:text-rose-600 mt-6">Sign out</button>
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

// The landing page (and entire app, for now) for a staff member with no assigned classroom of
// their own — reachable only through messagingClassTypes (grade-level reach), like a curriculum
// coordinator who oversees a subject across several grades without running any one classroom.
// Deliberately NOT a class, and shows no class list or class-shaped UI at all — just their own
// messages. More (subject-specific assessments and marks across the grades they oversee) is meant
// to land here later; this is the foundation that gets built on, not the finished picture.
function StaffMessagesHome({ loggedInTeacher, canSwitchToParent, onSwitchToParent, onSignOut, deepLinkGroupId }) {
  const [families, setFamilies] = useState(null); // null = loading
  const [threads, setThreads] = useState({});
  const [openGroup, setOpenGroup] = useState(null);
  // Same reasoning as the equivalent state in TeacherMessagesView — captured right before
  // markThreadRead overwrites it, since opening a thread marks it read immediately.
  const [lastReadBeforeOpen, setLastReadBeforeOpen] = useState(null);
  const [listReadState, setListReadState] = useState({});

  const refresh = useCallback(async () => {
    const relevant = await fetchStaffReachableFamilies();
    // One row per GUARDIAN, not per family — two guardians of the same family are two separate,
    // private threads with this person (same reasoning as the equivalent fix in TeacherMessagesView),
    // so each needs its own entry to actually choose between them.
    const byGuardian = {};
    relevant.forEach((f) => {
      if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f], studentLinks: f.studentLinks };
    });
    const groupList = Object.values(byGuardian);
    setFamilies(groupList);
    const entries = await Promise.all(groupList.map(async (g) => [g.groupId, await loadJSON(`teacher-messages:${loggedInTeacher.uid}:${g.groupId}`, { messages: [] }, true)]));
    setThreads(Object.fromEntries(entries));
    setListReadState(await getReadState(loggedInTeacher.uid));
  }, [loggedInTeacher.uid]);

  useEffect(() => { refresh(); }, [refresh]);

  const openThread = async (g) => {
    const readState = await getReadState(loggedInTeacher.uid);
    setLastReadBeforeOpen(readState[`teacher-direct-${g.groupId}`] || null);
    setOpenGroup(g);
    await markThreadRead(loggedInTeacher.uid, `teacher-direct-${g.groupId}`);
  };

  // Opens straight into the right family's thread the moment the family list has actually
  // loaded — this page has no class-entry step to wait on first (unlike a classroom teacher's
  // deep link), so the family list finishing is the only thing this needs to wait for.
  useEffect(() => {
    if (!deepLinkGroupId || !families) return;
    const match = families.find((g) => g.groupId === deepLinkGroupId);
    if (match) openThread(match);
  }, [deepLinkGroupId, families]); // eslint-disable-line react-hooks/exhaustive-deps

  // Same shape as ClassApp's own sendDirectMessageToFamily — this person has no classroom thread
  // at all, only ever this one kind of message. guardianUid is deliberately the specific
  // guardian's own uid (see sendDirectMessageToFamily's own comment for the full reasoning) —
  // sendPushNotification with an explicit single-uid list, not notifyFamilyGroup, is what keeps
  // this notification as private as the thread itself.
  const sendMessage = async (guardianUid, text, attachments) => {
    const key = `teacher-messages:${loggedInTeacher.uid}:${guardianUid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "teacher", senderName: loggedInTeacher?.name || "Teacher", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    sendPushNotification([guardianUid], `Direct message from ${loggedInTeacher?.name || "your teacher"}`, text?.trim() || describeAttachmentsForNotification(attachments), `/?portal=parent&open=teacher-messages&teacherUid=${loggedInTeacher.uid}`);
    return next;
  };

  if (openGroup) {
    const thread = threads[openGroup.groupId] || { messages: [] };
    const childNames = (openGroup.studentLinks || []).map((l) => l.studentName).join(", ");
    const guardianNames = openGroup.guardians.map((g) => g.name).join(" & ");
    const storageKey = `teacher-messages:${loggedInTeacher.uid}:${openGroup.groupId}`;
    return (
      <>
        <GlobalAppStyles />
        <ConversationThreadView title={guardianNames} subtitle={childNames} messages={thread.messages} myRole="teacher" teacher={loggedInTeacher} threadKey={`teacher-direct-${openGroup.groupId}`}
          lastReadBeforeOpen={lastReadBeforeOpen}
          onBack={() => { setOpenGroup(null); refresh(); }}
          onSend={async (text, attachments) => { await sendMessage(openGroup.groupId, text, attachments); await refresh(); }}
          onEdit={async (messageId, newText) => { await editMessageInThread(storageKey, messageId, newText); await refresh(); }}
          onDelete={async (messageId) => { await deleteMessageInThread(storageKey, messageId); await refresh(); }} />
      </>
    );
  }

  return (
    <div className={PAGE}>
      <GlobalAppStyles />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="display-font text-xl font-bold text-stone-900">Welcome, {loggedInTeacher?.name}</h1>
          <p className="text-xs text-stone-400">Your messages</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canSwitchToParent && (
            <button onClick={onSwitchToParent} className="text-xs font-semibold text-teal-700 hover:text-teal-900">Switch to parent</button>
          )}
          <button onClick={onSignOut} className="text-xs font-semibold text-stone-400 hover:text-teal-700">Sign out</button>
        </div>
      </div>

      {families === null && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
      {families?.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No families are reachable yet.</p>}
      <div className="space-y-2">
        {(families || []).map((g) => {
          const thread = threads[g.groupId];
          const last = thread?.messages?.[thread.messages.length - 1];
          const childNames = (g.studentLinks || []).map((l) => l.studentName).join(", ");
          const guardianNames = g.guardians.map((gu) => gu.name).join(" & ");
          const unreadCount = countUnreadInThread(listReadState, `teacher-direct-${g.groupId}`, thread?.messages, "teacher");
          return (
            <button key={g.groupId} onClick={() => openThread(g)}
              className="w-full text-left bg-white border-2 border-teal-700/15 rounded-xl p-4 hover:border-teal-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">{guardianNames}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-teal-700 text-white text-[11px] font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {last && <p className="text-[10px] text-stone-400">{new Date(last.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>}
                </div>
              </div>
              <p className="text-xs text-stone-400 mb-1">{childNames}</p>
              <p className="text-xs text-stone-500 truncate">{last ? `${last.senderType === "teacher" ? "You: " : ""}${last.text}` : "No messages yet"}</p>
            </button>
          );
        })}
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

function ClassApp({ classId, className, classType, onSwitchClass, switchLabel, onRenameClass, onChangePassword, onArchiveClass, onDeleteClass, loggedInTeacher, onChangeMyPassword, onChangeMyName, onChangeMySignOff, isSubstituteSession, subCode, onGenerateSubCode, onClearSubCode, canSwitchToParent, onSwitchToParent, createFamilyAccount, updateFamilyRecord, onFamilyLinked, deepLinkGroupId, deepLinkIsDirect }) {
  const loggedByName = loggedInTeacher?.name || null;
  // Stamps every logged record with when it happened, unconditionally — unlike loggedBy just
  // below, this doesn't depend on a real signed-in identity, since knowing WHEN something was
  // logged is useful even under the legacy class-password flow. This is what actually lets a
  // duplicate be resolved with confidence instead of a guess: two entries for the same meal used
  // to be indistinguishable except by their content, so telling them apart meant reading the
  // values and reasoning about which one was probably right. Now the admin duplicate-checker can
  // show exactly when each one was logged and default to suggesting the later one — the one an
  // actual correction would produce — while still leaving the final call to a person, since a
  // later timestamp is a strong signal, not a guarantee (a teacher can just as easily re-log the
  // wrong number by mistake).
  const withLogger = (obj) => ({ ...obj, loggedAt: new Date().toISOString(), ...(loggedByName ? { loggedBy: loggedByName } : {}) });
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
  const [photos, setPhotos] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [homeworkPosts, setHomeworkPosts] = useState([]);
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
  const [view, setViewRaw] = useState(() => {
    if (deepLinkGroupId) return "messages";
    // Restores whichever screen was open if the class itself was just restored from the URL too
    // (a reload, or the OS having killed and restarted the page) — without this, that restore
    // would always land back on Home even if the teacher was deep in Comm or Assessments.
    const urlView = new URLSearchParams(window.location.search).get("view");
    if (urlView) return urlView;
    return classType === "preschool" ? "daily-log" : "home";
  });
  // Pushing a real history entry here is what lets the Android back button step back through a
  // teacher's actual screens (Comm → Home, not straight to the class picker) instead of treating
  // this level of navigation as invisible to the browser — the same reasoning and pattern as the
  // class-selection and parent-tab history work already in place. Every setView(...) call inside
  // this component's own JSX goes through this now (not the raw state setter directly, which is
  // renamed setViewRaw below and used only by this function and the popstate handler that restores
  // from it) — previously only the top-level tab switches did, while the many sub-screens beneath
  // them (a student's detail view, a comm entry form, and so on) set state directly and were
  // completely invisible to the browser's own back button. That's what let a single back press
  // skip straight past several visible steps at once: the browser's history stack and what was
  // actually on screen could drift arbitrarily far out of sync from one another.
  const navigateView = (newView) => {
    setViewRaw(newView);
    const url = new URL(window.location.href);
    if (newView == null) url.searchParams.delete("view");
    else url.searchParams.set("view", newView);
    window.history.pushState({ view: newView }, "", url);
  };
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setViewRaw(params.get("view") || (classType === "preschool" ? "daily-log" : "home"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [classType]);
  // Every main-tab view, addressable by its tab id — extracted from what used to be a flat
  // sequence of inline {view === "X" && (...)} blocks so a given tab's content can be rendered
  // twice at once (the real, current tab below, and — during an active swipe — a second live copy
  // of whichever tab a finger is dragging toward), the same technique the parent portal's own
  // swipe already uses. Deliberately covers ONLY the tabs MainTabs itself offers; every other
  // view in this app (messages, settings, a student's detail page, blog/homework composers, and
  // so on) replaces the whole screen when opened and was never part of a swipeable sequence to
  // begin with, so those are untouched, still rendered exactly where they always were, outside
  // this function entirely.
  const renderMainTabContent = (tabId) => {
    switch (tabId) {
      case "home":
        return (
        <HomeView roster={roster} studentData={studentData} incidents={incidents} config={config}
          removeStudent={removeStudent}
          setAttendance={setAttendance} setAttendanceTime={setAttendanceTime}
          setHomework={setHomework} markNoHomeworkToday={markNoHomeworkToday}
          openDetail={(id) => { setCurrentId(id); navigateView("detail"); }}
          openIncidentForm={(id) => openIncidentForm(id, "home")} openPeriodAttendance={(id) => openPeriodAttendanceForm(id, "home")} navigate={navigateView}
          monthlyReportState={monthlyReportState}
          onDismissMonthlyReminder={(key) => persistMonthlyReportState({ ...monthlyReportState, dismissedMonth: key })}
          reflectionState={reflectionState} reflections={reflections}
          onDismissReflectionReminder={(key) => persistReflectionState({ ...reflectionState, dismissedMonth: key })}
          onOpenReflection={() => { setSelectedReflectionMonth(monthKey(new Date().getFullYear(), new Date().getMonth())); navigateView("reflection-form"); }}
          plannerDays={plannerDays} plannerEvents={effectivePlannerEvents}
          setPlannerDay={setPlannerDay} addPoints={addPoints} behaviorLogData={behaviorLogData}
          birthdayDismissals={birthdayDismissals} onDismissBirthday={dismissBirthday} onCreateBirthdayEvent={createBirthdayEvent}
          benchmarkSubjects={benchmarkSubjects} segmentCelebrationDismissals={segmentCelebrationDismissals} onDismissSegmentCelebration={dismissSegmentCelebration}
          onCelebrateSegment={(subjectLabel, segment) => { setCelebratingSegment({ subjectLabel, segment }); navigateView("segment-celebration-message"); }}
          onAddPlannerEvent={addPlannerEvent}
          randomPickerData={randomPickerData} onRandomPick={recordRandomPick} onResetRandomPicker={resetRandomPicker}
          alerts={alerts} dismissAlert={dismissAlert} showPlan={showPlan} setShowPlan={setShowPlan}
          openCameraCapture={() => openCameraCapture("home")} />
        );
      case "attendance":
        return (
        <PreschoolAttendanceView roster={roster} studentData={studentData}
          toggleCheckInByTeacher={toggleCheckInByTeacher} config={config} plannerDays={plannerDays} navigate={navigateView} />
        );
      case "daily-log":
        return (
        <PreschoolDashboardView roster={roster} studentData={studentData} incidents={incidents} photos={photos} config={config} persistConfig={persistConfig}
          plannerDays={plannerDays} plannerEvents={effectivePlannerEvents}
          setMood={setMood} setMealBulk={setMealBulk} setNapBulk={setNapBulk} startNapBulk={startNapBulk} endNapBulk={endNapBulk}
          logDiaperBulk={logDiaperBulk} logDiaperBulkWithDefaults={logDiaperBulkWithDefaults} removeDiaperLog={removeDiaperLog}
          logBathroomBulk={logBathroomBulk} removeBathroomLog={removeBathroomLog}
          openDetail={(id) => { setCurrentId(id); navigateView("detail"); }}
          openIncidentForm={(studentId, returnTo, categoryId) => openIncidentForm(studentId, returnTo || "daily-log", categoryId)}
          onLogPreschoolIncident={async (entry) => {
            addIncident(entry);
            if (entry.notifyFamily) {
              const families = await fetchClassFamilies(classId);
              // Notifies every matching guardian's own account directly, rather than mapping to
              // familyGroupId first and resolving that server-side — a real, reported case (one
              // guardian got a health notification, the other didn't) traced back to exactly that
              // indirection: two guardians of the same family can end up with a mismatched or
              // stale familyGroupId (that field is only backfilled when each individual account
              // signs in, so one guardian's copy can genuinely drift from the other's), and
              // deduplicating by that field before sending is what let one of them silently drop
              // out, even though both were already correctly found here as directly-linked
              // guardians a line earlier. Every guardian actually linked to the affected student
              // gets notified now, using each one's own real account — nothing left that depends
              // on the two guardians' familyGroupId values agreeing with each other.
              const uids = [...new Set(
                families
                  .filter((f) => (f.studentLinks || []).some((l) => l.classId === classId && entry.studentIds.includes(l.studentId)))
                  .map((f) => f.uid)
              )];
              const names = entry.studentIds.map((sid) => roster.find((s) => s.id === sid)?.name).filter(Boolean).join(", ");
              const title = entry.kind === "health" ? `Health note — ${names || "your child"}` : `New note — ${names || "your child"}`;
              const body = entry.categoryLabel || "Check the app for details.";
              sendPushNotification(uids, title, body, `/?portal=parent`);
            }
          }}
          classId={classId} submitBlogPost={submitBlogPost} sendMessageToFamily={sendMessageToFamily} navigate={navigateView} />
        );
      case "communication":
        return (
        <CommunicationListView roster={roster} studentData={studentData} classId={classId} loggedInTeacher={loggedInTeacher} navigate={navigateView}
          unreadFamilies={commUnreadFamilies} onRefreshUnread={refreshCommUnread}
          openStudent={(id) => { setCurrentId(id); navigateView("comm-entry"); }} />
        );
      case "blog":
        return (
        <BlogFeedView posts={blogPosts} currentUserId={loggedInTeacher?.uid} currentUserName={loggedByName} currentUserType="teacher"
          commentsEnabled={config.blogCommentsEnabled !== false}
          onReact={toggleBlogReaction}
          onComment={(postId, text) => addBlogComment(postId, text, loggedByName, "teacher")}
          navigate={navigateView} />
        );
      case "homework":
        return (
        <TeacherHomeworkView posts={homeworkPosts} navigate={navigateView} />
        );
      case "tools":
        return (
        <ToolsView schoolTools={schoolTools} navigate={navigateView} />
        );
      case "assessments":
        return (
        <AssessmentsListView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config}
          openClassAssessment={() => navigateView("class-assessment-form")}
          openAssessmentReport={(id) => { setSelectedAssessmentId(id); navigateView("assessment-report"); }}
          openSkillCategoryReport={(catId) => { setSelectedSkillReportCat(catId); navigateView("skill-category-report"); }}
          activateAssessment={activateAssessment} hideAssessment={hideAssessment} createCustomAssessment={createCustomAssessment}
          updateClassAssessmentResult={updateClassAssessmentResult}
          onStartSession={(studentId, catId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setSessionCat(catId); setSessionIdx(0); navigateView("session"); }}
          onLogFluency={(studentId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); navigateView("fluency"); }}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); navigateView("assessment-report"); }}
          onOpenFluencyDetail={(studentId, entry) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setDetailReturnView("assessments"); setSelectedFluencyEntry(entry); navigateView("fluency-detail"); }}
          onOpenSkillDetail={(studentId, catId) => { setCurrentId(studentId); setInitialAssessmentStudentId(studentId); setDetailReturnView("assessments"); setSelectedSkillCat(catId); navigateView("skill-detail"); }}
          initialStudentId={initialAssessmentStudentId}
          navigate={navigateView} />
        );
      case "points":
        return openProgramId ? (
        <PointsView
          roster={programRoster}
          studentData={Object.fromEntries(programRoster.map((s) => [s.id, { points: programPointsData[s.id] || {} }]))}
          classPoints={{}} config={programConfig}
          addPoints={addProgramPoints} addClassPoints={() => {}} resetClassPoints={() => {}}
          onAddCategory={addProgramCategory} navigate={navigateView}
          programMode programName={programsInClass.find((p) => p.id === openProgramId)?.name || "Program"}
          onBackFromProgram={closeProgram} />
        ) : (
        <PointsView roster={roster} studentData={studentData} classPoints={classPoints} config={config}
          addPoints={addPoints} addClassPoints={addClassPointsFn} resetClassPoints={resetClassPointsFn}
          onAddCategory={addPointsCategory} navigate={navigateView}
          plannerDays={plannerDays} behaviorLogData={behaviorLogData} adjustBehaviorMark={adjustBehaviorMark}
          programs={programsInClass} onOpenProgram={openProgram} />
        );
      case "planner":
        return (
        <PlannerView config={config} plannerDays={plannerDays} plannerEvents={effectivePlannerEvents} navigate={navigateView}
          setPlannerDay={setPlannerDay} clearPlannerDayType={clearPlannerDayType}
          bulkSetByWeekday={bulkSetByWeekday} bulkSetByRange={bulkSetByRange}
          addPlannerEvent={addPlannerEvent} removePlannerEvent={removePlannerEvent}
          importSchoolCalendar={importSchoolCalendar}
          benchmarkSubjects={benchmarkSubjects} addBenchmarkSubject={addBenchmarkSubject}
          removeBenchmarkSubject={removeBenchmarkSubject} addBenchmarkSegment={addBenchmarkSegment}
          addBenchmarkSegmentBySubjectLabel={addBenchmarkSegmentBySubjectLabel}
          updateBenchmarkSegment={updateBenchmarkSegment} removeBenchmarkSegment={removeBenchmarkSegment}
          toggleSubjectHiddenFromPlanner={toggleSubjectHiddenFromPlanner} />
        );
      default:
        return null;
    }
  };

  // Horizontal swipe between main tabs, the same way the parent portal's own Home/Messages/Blog
  // tabs already work — see that implementation's own comments for the full reasoning (scroll vs.
  // swipe disambiguation, live drag tracking, spring-back on a swipe that didn't go far enough).
  // swipeOrder mirrors MainTabs' own tab list exactly, split the same way by classType, so
  // swiping and tapping the bar always agree about what "next" means.
  const swipeOrder = classType === "preschool"
    ? ["attendance", "daily-log", "communication", "blog", "planner"]
    : ["home", "assessments", "points", "communication", "blog", "homework", "planner", "tools"];
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [dragTargetTab, setDragTargetTab] = useState(null);
  const [dragAnimating, setDragAnimating] = useState(false);
  const swipeStart = useRef(null);
  const swipeTrackWidth = useRef(390);

  const onTabAreaTouchStart = (e) => {
    // Paused for now, per direct request — swiping between tabs was getting in the way on the
    // teacher side specifically. Flip this one constant back to true to restore it; nothing else
    // needs to change. The horizontal scroll on the tab bar ROW itself is a completely separate
    // mechanism (its own overflow-x-auto) and is untouched by this — only the swipe-between-full-
    // tabs gesture is disabled. Returning here before swipeStart.current is ever set means
    // onTabAreaTouchMove's own `if (!swipeStart.current) return` never has anything to act on
    // either, and the render below (which only transforms/shows a preview pane when
    // dragOffsetPx/dragTargetTab actually change) naturally falls back to just the current tab
    // with no other edits needed anywhere else.
    if (!SWIPE_BETWEEN_TABS_ENABLED) return;
    if (!swipeOrder.includes(view) || dragAnimating) return; // not currently on a swipeable tab at all
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, decided: false, horizontal: false };
    swipeTrackWidth.current = e.currentTarget.getBoundingClientRect().width || window.innerWidth;
  };
  const onTabAreaTouchMove = (e) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    if (!swipeStart.current.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipeStart.current.decided = true;
      swipeStart.current.horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
      if (swipeStart.current.horizontal) {
        const currentIdx = swipeOrder.indexOf(view);
        const targetIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
        setDragTargetTab(targetIdx >= 0 && targetIdx < swipeOrder.length ? swipeOrder[targetIdx] : null);
      }
    }
    if (!swipeStart.current.horizontal) return;
    // Claims the gesture once it's decided to be horizontal (never during the ambiguous phase
    // above, so an ordinary vertical scroll is never touched) — see the useEffect below that
    // attaches this as a real, non-passive native listener for why a plain JSX onTouchMove prop
    // can't actually do this on its own.
    e.preventDefault();
    const clamped = dragTargetTab ? dx : dx * 0.25;
    setDragOffsetPx(clamped);
  };
  // React attaches touchmove listeners as passive by default (since React 17), which silently
  // makes e.preventDefault() inside a plain JSX onTouchMove prop a no-op on the actual browser
  // behavior — confirmed directly: the synthetic event reports defaultPrevented=true, but the
  // real native event underneath does not, and the browser's own console says so
  // ("Unable to preventDefault inside passive event listener invocation"). Without it actually
  // taking effect, the browser's native scroll/bounce keeps running alongside this JS-driven
  // transform, the two fighting over the same finger movement — invisible when testing with a
  // mouse (which never fires touch events at all) but exactly the janky, half-scrolling feel this
  // was built to prevent on a real phone. A real, manually-attached listener with
  // { passive: false } is the only way to make preventDefault() actually stick.
  // A callback ref, not a useRef+useEffect pair — React guarantees to call this exactly when the
  // DOM node itself actually mounts or unmounts, regardless of render timing or what else this
  // component's dependency arrays happen to look like at that moment. A useEffect keyed on `view`
  // looked reasonable but wasn't reliable in practice: on the render where this container first
  // becomes eligible to exist, the effect can still run before the ref has actually been attached
  // to it, and since `view` doesn't necessarily change value again after that, the effect never
  // gets a second chance to notice the node showing up later — silently leaving the swipeable area
  // with no real listener attached at all, and preventDefault() with nothing to call.
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
        navigateView(dragTargetTab);
        setDragOffsetPx(0);
        setDragTargetTab(null);
        setDragAnimating(false);
      }, 220);
    } else {
      setDragOffsetPx(0);
      setTimeout(() => { setDragTargetTab(null); setDragAnimating(false); }, 220);
    }
  };

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
  const [incidentCategoryPreset, setIncidentCategoryPreset] = useState(null);
  const [incidentReturn, setIncidentReturn] = useState("home");
  const [cameraReturn, setCameraReturn] = useState("home");
  const openCameraCapture = (returnTo) => { setCameraReturn(returnTo || "home"); navigateView("camera-capture"); };
  const [periodAttPreset, setPeriodAttPreset] = useState(null);
  const [periodAttReturn, setPeriodAttReturn] = useState("home");

  // Lifted up from the Comm page itself specifically so the count is visible on the tab bar
  // everywhere in the app, not just after actually navigating into Comm — matches the same
  // reasoning as the parent side's Messages/Blog badges.
  const [commUnreadFamilies, setCommUnreadFamilies] = useState([]);
  const refreshCommUnread = useCallback(async () => {
    // Substitute sessions have no teacher record at all (by design — they're not a real staff
    // account) and no messaging UI to show a badge on in the first place, so this entire
    // computation is simply irrelevant for them, not just something to guard defensively.
    if (!loggedInTeacher) return;
    const relevant = await fetchClassFamilies(classId);
    // One row per guardian, matching the classroom thread itself now being per-guardian rather
    // than per-family — otherwise this would ask about class:*:messages:{familyGroupId}, a key
    // nothing writes to anymore now that each guardian has their own.
    const byGuardian = {};
    relevant.forEach((f) => { if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f] }; });
    const readState = await getReadState(loggedInTeacher.uid);
    const results = [];
    for (const g of Object.values(byGuardian)) {
      const thread = await loadJSON(`class:${classId}:messages:${g.groupId}`, { messages: [] }, true); // eslint-disable-line no-await-in-loop
      const last = thread?.messages?.[thread.messages.length - 1];
      const threadKey = `classroom-${g.groupId}`;
      if (isThreadUnread(readState, threadKey, last, "teacher")) {
        const unreadCount = countUnreadInThread(readState, threadKey, thread.messages, "teacher");
        results.push({ groupId: g.groupId, threadKey, guardianNames: g.guardians.map((gu) => gu.name).join(" & "), preview: last.text, senderName: last.senderName, timestamp: last.timestamp, unreadCount });
      }
    }
    setCommUnreadFamilies(results);
  }, [classId, loggedInTeacher]);
  useEffect(() => { refreshCommUnread(); }, [refreshCommUnread]);
  // A tab that's already open has no way to know a new message arrived elsewhere — there's no
  // live sync in this app, only fetch-on-load. A light poll while the tab stays open closes that
  // gap without needing a full real-time rebuild; 45s is often enough to feel current without
  // adding meaningful read cost.
  useEffect(() => {
    const interval = setInterval(refreshCommUnread, 45000);
    return () => clearInterval(interval);
  }, [refreshCommUnread]);
  const [messageFlag, setMessageFlag] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [selectedFluencyEntry, setSelectedFluencyEntry] = useState(null);
  const [initialAssessmentStudentId, setInitialAssessmentStudentId] = useState(null); // auto-opens a student's modal in the Assessments grid when navigating in from elsewhere
  const [detailReturnView, setDetailReturnView] = useState("detail"); // fluency-detail/skill-detail are reachable from both StudentDetailView and the Assessments grid modal — this tracks which one "Back" should return to
  const [reportSections, setReportSections] = useState([]); // which sections were chosen for the current student's print/export report
  const [selectedSkillCat, setSelectedSkillCat] = useState(null);
  const [selectedSkillReportCat, setSelectedSkillReportCat] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentDetailReturn, setIncidentDetailReturn] = useState("detail"); // where "back" from incident detail goes — varies by entry point
  const [selectedReflectionMonth, setSelectedReflectionMonth] = useState(null);
  const [celebratingSegment, setCelebratingSegment] = useState(null); // { subjectLabel, segment } — which completed benchmark segment is being announced

  useEffect(() => {
    (async () => {
      const r = await loadC("roster", []);
      const c = await loadC("config", DEFAULT_CONFIG);
      const inc = await loadC("incidents", []);
      const ph = await loadC("photos", []);
      const bp = await loadC("blogPosts", []);
      const hw = await loadC("homework", []);
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
      // Fourth migration: keeps classType mirrored into this class's own config document, since a
      // family account can read its linked classes' config but has no access at all to the
      // school-wide class registry classType actually lives on — this is what lets the parent
      // side tell an elementary class apart from a preschool one (homework only applies to the
      // former) without needing any new permission grant.
      if (finalConfig.classType !== classType) {
        finalConfig = { ...finalConfig, classType };
        saveC("config", finalConfig);
      }
      // Fifth migration: a one-time auto-fill for the exact lunch schedule given directly in
      // conversation rather than typed into the app — asked for explicitly, more than once,
      // rather than being walked through entering it by hand. Only fires if lunch is completely
      // empty (no days set at all yet), so it can never overwrite anything already there, whether
      // from this same seed having already run or from someone editing it afterward — the normal
      // Weekly Meal Menu Editor in Settings still works exactly as before for that, since this is
      // only ever a one-time starting point, not a standing override.
      if (classType === "preschool" && Object.keys(finalConfig.preschool?.mealMenus?.lunch || {}).length === 0) {
        finalConfig = {
          ...finalConfig,
          preschool: {
            ...finalConfig.preschool,
            mealMenus: {
              ...finalConfig.preschool?.mealMenus,
              lunch: {
                monday: ["Meatballs", "Rice", "Broccoli"],
                tuesday: ["Fish sticks", "Couscous", "Veggies"],
                wednesday: ["Schnitzel", "Pasta", "Veggies"],
                thursday: ["Pizza", "Olives"],
              },
            },
          },
        };
        saveC("config", finalConfig);
      }
      setConfig({ ...DEFAULT_CONFIG, ...finalConfig, points: mergedPoints, monthlyReports: finalConfig.monthlyReports || DEFAULT_CONFIG.monthlyReports, planner: mergedPlanner });
      setIncidents(finalIncidents);
      setPhotos(ph);
      setBlogPosts(bp);
      setHomeworkPosts(hw);
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
        const raw = await loadC(`kriya:${s.id}`, emptyStudentData());
        // display-only now — no write-back. See ChildDailyLogView's own matching comment for the
        // full reasoning: even a one-time read can fall back to a stale local cache on a spotty
        // connection, and writing a "cleaned" result back from a stale read risks permanently
        // overwriting real, current data with an incomplete snapshot — a real, reported case of
        // exactly that. This still shows a clean, deduplicated view either way.
        const { data: d } = dedupeDailyLogData(raw);
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
    if (!loading && !config.onboarding?.started && !isAdminRole(loggedInTeacher)) {
      setShowOnboarding(true);
    }
  }, [loading]); // eslint-disable-line

  const persistConfig = (next) => { setConfig(next); saveC("config", next); };
  const persistStudent = (id, newData) => { setStudentData((prev) => ({ ...prev, [id]: newData })); saveC(`kriya:${id}`, newData); };
  const persistIncidents = (next) => { setIncidents(next); saveC("incidents", next); };
  const persistPhotos = (next) => { setPhotos(next); saveC("photos", next); };
  const persistBlogPosts = (next) => { setBlogPosts(next); saveC("blogPosts", next); };
  // Bundles several photo/video+caption "parts" into one shareable post — a teacher building a
  // weekly recap sends it all at once, one notification, not one per item. Every file across every
  // part goes through the same reliable pipeline as the Photos tile (or its video counterpart).
  // Each part holds one freely mixed batch — any combination of photos and videos together, not
  // artificially split by type, since there's no real reason a recap of ten photos and one video
  // needs to be broken into separate parts just because of what kind of file each one is.
  const submitBlogPost = async (title, blocksInput, onProgress) => {
    const postId = uid();
    const totalItems = blocksInput.reduce((sum, b) => sum + (b.mediaItems?.length || 0), 0);
    let uploadedCount = 0;
    const uploadedBlocks = [];
    for (const block of blocksInput) {
      const media = [];
      for (const item of block.mediaItems || []) {
        const reportProgress = () => { if (onProgress) onProgress(Math.round(((uploadedCount + 0.5) / Math.max(totalItems, 1)) * 100)); };
        let url;
        if (item.type === "video") {
          const ext = (item.file.name || "").split(".").pop() || "mp4";
          url = await uploadOneVideo(item.file, `blog/${classId}/${postId}/${uid()}.${ext}`, reportProgress);
        } else if (item.type === "audio") {
          const ext = (item.file.name || "").split(".").pop() || "mp3";
          url = await uploadOneFile(item.file, `blog/${classId}/${postId}/${uid()}.${ext}`, reportProgress);
        } else {
          url = await uploadOneImage(item.file, `blog/${classId}/${postId}/${uid()}.jpg`, reportProgress);
        }
        media.push({ url, type: item.type, name: item.type === "audio" ? item.file.name : null });
        uploadedCount++;
        if (onProgress) onProgress(Math.round((uploadedCount / Math.max(totalItems, 1)) * 100));
      }
      uploadedBlocks.push({ id: uid(), media, text: (block.text || "").trim() });
    }
    const entry = withLogger({
      id: postId, timestamp: new Date().toISOString(), authorType: "teacher",
      title: (title || "").trim() || null, blocks: uploadedBlocks, reactions: {}, comments: [],
    });
    persistBlogPosts([...blogPosts, entry]);
    const firstCaption = uploadedBlocks.find((b) => b.text)?.text;
    notifyClassFamilies(classId, `New post in ${className}`, (title || "").trim() || firstCaption || "Check out the new post", `/?portal=parent&open=blog&classId=${classId}`);
    return entry;
  };
  const persistHomeworkPosts = (next) => { setHomeworkPosts(next); saveC("homework", next); };
  // Cadence isn't just a label — it's what lets the parent side show a genuinely useful heading
  // ("This week's homework" vs "Today's homework") without the teacher needing to type a title
  // every single time. The attachment reuses the exact same upload pipeline as messages, since a
  // homework post is really just a specialized, class-wide post with a cadence attached.
  const submitHomework = async (cadence, text, attachFile, attachType) => {
    const postId = uid();
    let attachmentUrl = null;
    let attachmentName = null;
    if (attachFile) {
      if (attachType === "video") {
        attachmentUrl = await uploadOneVideo(attachFile, `homework/${classId}/${postId}.${(attachFile.name || "").split(".").pop() || "mp4"}`);
      } else if (attachType === "photo") {
        attachmentUrl = await uploadOneImage(attachFile, `homework/${classId}/${postId}.jpg`);
      } else {
        attachmentUrl = await uploadOneFile(attachFile, `homework/${classId}/${postId}.${(attachFile.name || "").split(".").pop() || "bin"}`);
        attachmentName = attachFile.name;
      }
    }
    const entry = withLogger({
      id: postId, timestamp: new Date().toISOString(), cadence, text: (text || "").trim(),
      ...(attachmentUrl ? { attachmentUrl, attachmentType: attachType, attachmentName } : {}),
    });
    persistHomeworkPosts([...homeworkPosts, entry]);
    const heading = cadence === "weekly" ? "This week's homework" : "Today's homework";
    notifyClassFamilies(classId, `${heading} — ${className}`, text?.trim() || "Check the homework section", `/?portal=parent&open=homework&classId=${classId}`);
    return entry;
  };
  // Same single-reaction-per-person-or-per-block logic as the parent-side version — see that one
  // for the reasoning on why this goes through a backend endpoint instead of writing directly:
  // Firestore's own rule for this document can only validate the array's overall length, not
  // which specific entry changed, so identity has to be determined server-side, from the
  // caller's own verified account, never trusted from anything the client sends.
  const toggleBlogReaction = async (postId, emoji, blockId) => {
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/blog-react", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ classId, postId, blockId, emoji }),
      });
      const data = await res.json();
      if (res.ok) persistBlogPosts(data.posts);
    } catch {
      // best-effort — if this fails, the post simply doesn't show the reaction; nothing to roll back
    }
  };
  const addBlogComment = (postId, text, authorName, authorType) => {
    if (!text.trim()) return;
    const comment = { id: uid(), text: text.trim(), authorName, authorType, timestamp: new Date().toISOString() };
    persistBlogPosts(blogPosts.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p)));
  };
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
  // Uses the functional form of setBenchmarkSubjects, not the closure-captured benchmarkSubjects
  // variable directly — this specifically has to survive being called several times in a tight,
  // synchronous loop (the multi-subject document import calls this once per benchmark, often for
  // several different subjects back to back). Reading the closure variable directly would have
  // every one of those calls compute its "next" array from the exact same stale starting point,
  // so only the last call's result would actually stick — silently losing every subject added by
  // an earlier call in the same batch. The functional form guarantees each call sees the true
  // latest state, including whatever the previous call in the same batch just added.
  const addBenchmarkSegmentBySubjectLabel = (label, segment) => {
    const trimmed = (label || "").trim();
    if (!trimmed) return;
    setBenchmarkSubjects((prev) => {
      const existing = prev.find((s) => s.label.trim().toLowerCase() === trimmed.toLowerCase());
      const next = existing
        ? prev.map((s) => (s.id === existing.id ? { ...s, segments: [...s.segments, { id: uid(), ...segment }] } : s))
        : [...prev, { id: uid(), label: trimmed, segments: [{ id: uid(), ...segment }] }];
      saveC("benchmarkSubjects", next);
      return next;
    });
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

  // Links the teacher's OWN existing login to one sample student as a family account too —
  // reusing the exact same "already has a login, attach to it" path create-family.js already has
  // for a teacher who's also a parent. Once that exists, the already-built "Switch to Parent
  // view" link shows the real, live parent portal running against real (sample) data — not a
  // separate mock rendering that could quietly drift from what parents actually see.
  //
  // Runs as part of loadSampleData itself now, every single time, rather than as a separate,
  // one-time manual button — that was the actual bug behind "it's still showing the same four
  // students from before, not linked to what's actually in the class now": sample student ids are
  // freshly regenerated every time sample data loads, but the old, manual version only ever ran
  // once and never re-synced, so the linked family record just kept pointing at whichever ids
  // existed the first time someone clicked it, silently going stale the moment sample data was
  // ever reloaded. Since create-family.js's own "reuse the existing login" behavior fully
  // overwrites studentLinks on every call (not merges), simply calling this every time sample
  // data loads is what keeps it permanently correct with zero separate step to remember.
  //
  // Linked to exactly ONE student, not the whole roster — a demo parent seeing all ten sample
  // children as their own isn't what an actual parent's view looks like; one child (occasionally
  // two, across the two different demo classes) is.
  // Linked per class, not per account — loading sample data for "Sample" and, separately, for
  // "Sample Preschool" is meant to build up ONE demo family that has a child in each, the same
  // way a real family with kids in two different rooms would. That only actually works if this
  // merges with whatever's already linked from a DIFFERENT class rather than replacing it
  // outright — createFamilyAccount's backend does a full overwrite of studentLinks on every call,
  // by design (a real "add a second guardian" flow needs that), so the merging has to happen here,
  // on the client, before calling it: read whatever's already linked, drop only this SAME class's
  // own prior entry (so reloading sample data for the same class twice doesn't duplicate it), and
  // add the fresh one back in alongside every other class's link untouched.
  const linkSampleParentPreview = async (sampleRoster) => {
    if (!loggedInTeacher?.email || sampleRoster.length === 0) return;
    const demoStudent = sampleRoster[0];
    const firstName = demoStudent.name.split(" ")[0];
    const newLink = { classId, studentId: demoStudent.id, studentName: demoStudent.name, className };
    const existing = await loadJSON(`family:${loggedInTeacher.uid}`, null, true);
    const otherClassLinks = (existing?.studentLinks || []).filter((l) => l.classId !== classId);
    const links = [...otherClassLinks, newLink];
    // Keeps whatever name this preview family already had once it exists, rather than renaming it
    // to just this one class's student every time sample data happens to be reloaded — a distinct,
    // realistic-sounding name only gets picked fresh the very first time this account is created.
    const parentDisplayName = existing?.name || `${firstName}'s Family`;
    const result = await createFamilyAccount(parentDisplayName, loggedInTeacher.email, "preview-not-used", links, existing?.familyGroupId);
    if (!result?.ok || !result.uid) return;
    // A short, realistic exchange — not just an empty thread — so "Switch to Parent view" has
    // something real to show in Messages too, not just Blog and Homework.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await saveJSON(`class:${classId}:messages:${result.uid}`, {
      messages: [
        { id: uid(), senderType: "family", senderName: parentDisplayName, text: `Hi! Just wanted to check in — how is ${firstName} settling in this week?`, timestamp: twoDaysAgo.toISOString() },
        { id: uid(), senderType: "teacher", senderName: loggedByName || "Teacher", text: `So great to hear from you! ${firstName} is doing wonderfully — settling in nicely and participating well.`, timestamp: new Date(twoDaysAgo.getTime() + 60 * 60 * 1000).toISOString() },
      ],
    }, true);
    // Without this, "Switch to Parent view" wouldn't show up until a full sign-out and back in —
    // the family record now genuinely exists, but the running session's own picture of "does this
    // account have a family role" was fixed at sign-in time and had no reason to check again.
    if (onFamilyLinked) onFamilyLinked();
  };

  const loadSampleData = () => {
    if (classType === "preschool") {
      const sample = buildPreschoolSampleData();
      persistRoster(sample.roster);
      setStudentData(sample.studentData);
      for (const [sid, sd] of Object.entries(sample.studentData)) saveC(`kriya:${sid}`, sd);
      persistIncidents(sample.incidents);
      persistPhotos(sample.photos);
      persistPlannerDays(sample.plannerDays);
      persistPlannerEvents(sample.plannerEvents);
      persistBlogPosts(sample.blogPosts.map((p) => withLogger(p)));
      linkSampleParentPreview(sample.roster);
      // Sample students need a matching entry in the school-wide registry too, same as any
      // student added normally, or "add existing student from another class" wouldn't find them.
      loadJSON("globalStudents", [], true).then((gs) => {
        const withoutOldSamples = gs.filter((g) => !sample.roster.some((r) => r.id === g.id));
        const nextGs = [...withoutOldSamples, ...sample.roster.map((r) => ({ ...r, parent2Name: "", parent2Email: "", parent2Phone: "", homeAddress: "" }))];
        saveJSON("globalStudents", nextGs, true);
        setGlobalStudentsInClass(nextGs);
      });
      return;
    }
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
    persistBlogPosts(sample.blogPosts.map((p) => withLogger(p)));
    persistHomeworkPosts(sample.homeworkPosts.map((h) => withLogger(h)));
    linkSampleParentPreview(sample.roster);
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

  // Creates a real family login for a parent the moment a student is added, if their email was
  // given — the whole point being an admin never has to separately go create the account
  // afterward. The one thing this has to get right: a parent might already have an account from
  // an older sibling, and calling the create-account endpoint again would silently overwrite
  // their existing studentLinks with just this one new child, losing the sibling. So this checks
  // for an existing account by email first, and if one exists, appends to it instead of
  // recreating it.
  // Returns the resolved familyGroupId — whatever group this parent ended up in, whether that's
  // an existing account's group or a brand-new one — so a second parent added right alongside the
  // first (see addStudent below) can be told to join that same group explicitly, rather than each
  // one silently ending up in its own separate group of one.
  const autoCreateOrLinkParentAccount = async (parentName, parentEmail, newLink, joinGroupId) => {
    const email = (parentEmail || "").trim().toLowerCase();
    if (!email) return null;
    const allFamilies = await loadAllWithPrefix("family:");
    const existing = allFamilies.find((f) => (f.email || "").toLowerCase() === email);
    if (existing) {
      const already = (existing.studentLinks || []).some((l) => l.classId === newLink.classId && l.studentId === newLink.studentId);
      if (!already) {
        const nextLinks = [...(existing.studentLinks || []), newLink];
        await updateFamilyRecord(existing.uid, { studentLinks: nextLinks });
      }
      return existing.familyGroupId || existing.uid;
    }
    const defaultPassword = await loadJSON("defaultParentPassword", "Welcome123", true);
    const result = await createFamilyAccount(parentName || newLink.studentName, parentEmail.trim(), defaultPassword, [newLink], joinGroupId);
    return joinGroupId || result?.uid || null;
  };

  const addStudent = async (name, studentType, parent1Name, parentEmail, parent2Name, parent2Email) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const id = uid();
    const resolvedType = studentType || classType;
    const freshRoster = (await loadC("roster", null)) || roster;
    persistRoster([...freshRoster, { id, name: trimmed, studentType: resolvedType, parentEmail: parentEmail || "", parentPhone: "", notes: "", enrollmentScope: "full-time" }]);
    setStudentData((prev) => ({ ...prev, [id]: emptyStudentData() }));
    // New students are shared school-wide by default from here on, so any teacher can find and add them later.
    const gs = await loadJSON("globalStudents", [], true);
    const globalRecord = {
      id, name: trimmed, studentType: resolvedType,
      parent1Name: parent1Name || "", parentEmail: parentEmail || "", parentPhone: "",
      parent2Name: parent2Name || "", parent2Email: parent2Email || "", parent2Phone: "",
      homeAddress: "", notes: "",
    };
    const nextGs = [...gs, globalRecord];
    await saveJSON("globalStudents", nextGs, true);
    setGlobalStudentsInClass(nextGs);

    const link = { classId, studentId: id, studentName: trimmed, className };
    // The second parent joins whatever group the first parent resolved to — same family, same
    // group — rather than each independently defaulting to their own group of one. Previously
    // neither call knew about the other at all, so a student added with both parents' emails
    // filled in from the start silently created two entirely separate single-guardian families
    // instead of one joint one: broke the classroom messaging list (each guardian showed up as
    // their own unrelated "family" rather than grouped together) and any future guardian-linking
    // logic that assumes a shared familyGroupId means what it says.
    let resolvedGroupId = null;
    if (parentEmail) resolvedGroupId = await autoCreateOrLinkParentAccount(parent1Name, parentEmail, link);
    if (parent2Email) await autoCreateOrLinkParentAccount(parent2Name, parent2Email, link, resolvedGroupId);
  };

  const refreshGlobalStudentsInClass = async () => {
    const gs = await loadJSON("globalStudents", [], true);
    setGlobalStudentsInClass(gs);
  };

  // Checks whether a student is already enrolled in any OTHER active class before adding them
  // here — a real, reported incident showed exactly what happens without this check: a teacher
  // couldn't locate a student who actually belonged to a different class, used this search-and-add
  // feature reasonably (it's built for pulling in an existing student, and invites exactly this),
  // and ended up with that child double-enrolled with zero warning at all — invisible until the
  // child's actual teacher couldn't find them on their own roster anymore. This only reads roster
  // membership, not full history, since that's all a same-turn safety check needs before someone
  // taps "Add to class" — the fuller fetchCrossClassHistory below is for browsing a student's
  // record after the fact, not for blocking a mistake before it happens.
  const checkStudentEnrollments = async (studentId) => {
    const allClasses = await loadJSON("schoolClasses", [], true);
    const found = [];
    for (const cls of allClasses) {
      if (cls.archived) continue;
      const clsRoster = await loadJSON(`class:${cls.id}:roster`, [], true);
      if (clsRoster.some((s) => s.id === studentId)) found.push({ classId: cls.id, className: cls.name });
    }
    return found;
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

  // Reads the roster fresh right before computing a removal/edit, rather than trusting the local
  // `roster` state variable that might have drifted stale — the exact same class of race condition
  // already found and fixed in the class-assignment, attendance, and daily-log logging paths this
  // session: two people (or the same teacher on two devices/tabs) each acting from their own
  // independently-stale snapshot around the same time can otherwise have the second write silently
  // undo the first — a just-removed student reappearing, or a just-edited field reverting, with
  // nothing to explain why.
  const removeStudent = async (id) => {
    const freshRoster = (await loadC("roster", null)) || roster;
    persistRoster(freshRoster.filter((s) => s.id !== id));
    if (currentId === id) { navigateView(classType === "preschool" ? "daily-log" : "home"); setCurrentId(null); }
  };

  const updateStudentField = async (id, field, value) => {
    const freshRoster = (await loadC("roster", null)) || roster;
    persistRoster(freshRoster.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
    navigateView("session");
  };

  const advanceClassSession = () => {
    const nextPos = classSessionPos + 1;
    if (!classSessionQueue || nextPos >= classSessionQueue.length) {
      // Whole class done — clear the queue and go see the results together.
      setClassSessionQueue(null);
      setClassSessionPos(0);
      setSelectedSkillReportCat(sessionCat);
      navigateView("skill-category-report");
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

  // Preschool daily log — built for speed, not detail. Meals and nap assume the whole class did
  // the same thing (food is served to the room at once; most rooms share one nap block), so those
  // take a bulk update and the teacher only touches the exceptions. Diapers and bathroom trips are
  // NOT defaulted to "everyone" — that's not something that happens to the whole room at once, and
  // assuming it would be actively wrong, not just unnecessary — so those stay tap-the-specific-kid,
  // append-only logs, same as mood and health notes.
  // Every one of these bulk-logging functions used to read `studentData[studentId]` — already-
  // loaded local React state — as the base to compute its "remove the old entry for this date,
  // add the new one" filter from. A real, reported incident showed exactly what that allows: two
  // separate lunch entries for the same day and the same child, both visible on the parent's own
  // screen at once — which happens when two sessions (a co-teacher, or the same teacher on two
  // devices) each hold their own independently-stale snapshot and both write around the same
  // time, so neither one's "remove the old entry" filter ever sees the other's. Every one of these
  // now reads that student's true, current record fresh, right before deciding what to change —
  // the same fix already applied to the class-assignment and attendance-check-in toggles this
  // session, for the exact same underlying reason.
  const freshStudentData = async (studentId) => (await loadC(`kriya:${studentId}`, null)) || studentData[studentId] || emptyStudentData();

  const setMood = async (studentId, date, mood, note) => {
    const data = await freshStudentData(studentId);
    const without = (data.mood || []).filter((m) => m.date !== date);
    persistStudent(studentId, { ...data, mood: [...without, withLogger({ date, mood, ...(note ? { note } : {}) })] });
  };

  // studentAmounts: { studentId: amount } — applied to every included student in one action.
  // studentNotes: { studentId: note } — optional, sparse (only students who actually got one).
  // studentItems: { studentId: [itemNames eaten] } — optional, only present when today's meal
  // has a specific configured menu (see mealMenuItemsFor); amount is still always derived and
  // saved alongside it (all items selected → "all", none → "none", some → "some") so anything
  // already reading the plain amount field — the parent-facing daily log, for one — keeps working
  // exactly as before without needing to know about specific items at all.
  const setMealBulk = async (date, mealType, studentAmounts, studentNotes = {}, studentItems = {}) => {
    for (const [studentId, amount] of Object.entries(studentAmounts)) {
      const data = await freshStudentData(studentId);
      const without = (data.meals || []).filter((m) => !(m.date === date && m.mealType === mealType));
      const note = studentNotes[studentId];
      const items = studentItems[studentId];
      persistStudent(studentId, { ...data, meals: [...without, withLogger({ date, mealType, amount, ...(note ? { note } : {}), ...(items ? { items } : {}) })] });
    }
  };

  // studentTimes: { studentId: {start, end} | null } — null means that student is excluded (didn't nap).
  // Still used directly for a one-step "log a completed nap" entry when that's genuinely what's
  // wanted; the normal in-room workflow now goes through startNapBulk/endNapBulk below instead.
  const setNapBulk = async (date, studentTimes) => {
    for (const [studentId, times] of Object.entries(studentTimes)) {
      const data = await freshStudentData(studentId);
      const without = (data.naps || []).filter((n) => n.date !== date);
      const entry = times ? withLogger({ date, start: times.start, end: times.end }) : withLogger({ date, skipped: true });
      persistStudent(studentId, { ...data, naps: [...without, entry] });
    }
  };

  // Begins a nap for each included student — records just the start time, leaving `end` unset
  // until a separate End Nap action completes it, so different children can be started and later
  // woken at their own actual times rather than everyone sharing one forced start-to-finish window.
  // studentTimes: { studentId: startTime | null } — null marks that student as "didn't nap today"
  // (skipped) rather than starting one. studentNotes: { studentId: note } — optional, sparse.
  const startNapBulk = async (date, studentTimes, studentNotes = {}) => {
    for (const [studentId, startTime] of Object.entries(studentTimes)) {
      const data = await freshStudentData(studentId);
      const without = (data.naps || []).filter((n) => n.date !== date);
      const note = studentNotes[studentId];
      const entry = startTime
        ? withLogger({ date, start: startTime, ...(note ? { note } : {}) })
        : withLogger({ date, skipped: true, ...(note ? { note } : {}) });
      persistStudent(studentId, { ...data, naps: [...without, entry] });
    }
  };

  // Completes an already-started nap by filling in its end time — finds each student's own
  // in-progress entry for the date (one with a start but no end yet) and adds the end time to
  // THAT SAME entry, rather than creating a new one, so the original start time — and any note
  // added while starting it — are preserved rather than overwritten. A student with nothing
  // in progress is silently skipped rather than creating a stray end-only entry for them.
  const endNapBulk = async (date, studentTimes, studentNotes = {}) => {
    for (const [studentId, endTime] of Object.entries(studentTimes)) {
      const data = await freshStudentData(studentId);
      const naps = data.naps || [];
      const idx = naps.findIndex((n) => n.date === date && n.start && !n.end);
      if (idx === -1) continue;
      const newNote = studentNotes[studentId];
      const combinedNote = newNote ? (naps[idx].note ? `${naps[idx].note} ${newNote}` : newNote) : naps[idx].note;
      const updated = { ...naps[idx], end: endTime, ...(combinedNote ? { note: combinedNote } : {}) };
      persistStudent(studentId, { ...data, naps: naps.map((n, i) => (i === idx ? updated : n)) });
    }
  };

  // studentIds: array — the same type applied to every selected student in one action.
  const logDiaperBulk = async (date, time, type, studentIds) => {
    for (const studentId of studentIds) {
      const data = await freshStudentData(studentId);
      const entry = withLogger({ id: uid(), date, time, type });
      persistStudent(studentId, { ...data, diapers: [...(data.diapers || []), entry] });
    }
  };
  // studentTypes: { studentId: type } — same shape as setMealBulk, since diaper time now works the
  // same way meals do: one shared time, everyone defaults to the same type, exceptions get their
  // own value, one action logs everyone at once.
  // studentNotes: { studentId: note } — optional, sparse (only students who actually got one).
  const logDiaperBulkWithDefaults = async (date, time, studentTypes, studentNotes = {}) => {
    for (const [studentId, type] of Object.entries(studentTypes)) {
      const data = await freshStudentData(studentId);
      const note = studentNotes[studentId];
      const entry = withLogger({ id: uid(), date, time, type, ...(note ? { note } : {}) });
      persistStudent(studentId, { ...data, diapers: [...(data.diapers || []), entry] });
    }
  };
  const removeDiaperLog = async (studentId, entryId) => {
    const data = await freshStudentData(studentId);
    persistStudent(studentId, { ...data, diapers: (data.diapers || []).filter((d) => d.id !== entryId) });
  };

  // studentNotes: { studentId: note } — optional, sparse. type itself is still one shared value
  // applied to every selected student, same as before; only the note is ever per-student.
  const logBathroomBulk = async (date, time, type, studentIds, studentNotes = {}) => {
    for (const studentId of studentIds) {
      const data = await freshStudentData(studentId);
      const note = studentNotes[studentId];
      const entry = withLogger({ id: uid(), date, time, type, ...(note ? { note } : {}) });
      persistStudent(studentId, { ...data, bathroom: [...(data.bathroom || []), entry] });
    }
  };
  const removeBathroomLog = async (studentId, entryId) => {
    const data = await freshStudentData(studentId);
    persistStudent(studentId, { ...data, bathroom: (data.bathroom || []).filter((b) => b.id !== entryId) });
  };

  // Teacher-side toggle for QR check-in — was previously working against already-loaded React
  // state instead of a fresh Firestore read, unlike the parent-side scan's own version of this
  // same logic (toggleCheckInForStudent below, which always reads fresh). That's a real, live risk
  // here specifically: this screen commonly stays open for the whole day, and two devices open to
  // it at once — two co-teachers, or the same teacher on a phone and a tablet — is an entirely
  // normal way a preschool room actually runs. If one device checks a student in, the other's
  // local copy has no way to know, and the next tap on that same student computes the toggle from
  // its own stale view — creating a duplicate entry, or reading a genuine check-in as a check-out
  // because that device never saw it happen. That's exactly what a toggle "flipping itself" would
  // look like to the person tapping it, even though nothing was actually random. Now reads the
  // student's own true, current check-in record fresh, right before deciding what the tap should
  // do — the same fix already applied to the class-assignment toggle for the same underlying
  // reason.
  const toggleCheckInByTeacher = async (studentId) => {
    const data = (await loadC(`kriya:${studentId}`, null)) || studentData[studentId] || emptyStudentData();
    const byLabel = loggedByName ? `Teacher: ${loggedByName}` : "Teacher";
    const result = computeToggledCheckIn(data.checkIns, todayISO(), byLabel);
    persistStudent(studentId, { ...data, checkIns: result.checkIns });
    return result;
  };

  // One conversation per guardian per class now, not per family — each guardian's message with
  // the classroom is private to them, so this notifies only the specific guardian who's actually
  // part of this thread (a direct, single-uid notification) rather than notifyFamilyGroup, which
  // would fan out to every guardian sharing this family's group regardless of which one the
  // message was actually for.
  const sendMessageToFamily = async (familyUid, text, attachments) => {
    const key = `class:${classId}:messages:${familyUid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "teacher", senderName: loggedByName || "Teacher", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    sendPushNotification([familyUid], `Message from ${className}`, text?.trim() || describeAttachmentsForNotification(attachments), `/?portal=parent&open=messages&classId=${classId}`);
    return next;
  };

  // This teacher's own individual thread with a family — deliberately separate storage from the
  // classroom thread above, so only this specific teacher (never any colleague sharing the same
  // class, never admin) can ever post here. That's what lets a parent trust a direct message is
  // genuinely private between them and this one teacher.
  //
  // guardianUid — deliberately the specific guardian's own uid, not a family group id. Two
  // guardians of the same family are two separate, private threads (see the matching comment on
  // teacherMessagingThread on the parent side for why); notifying via notifyFamilyGroup here would
  // reach BOTH guardians about a message meant for only one of them, since that helper exists
  // specifically to fan a notification out to every login sharing a group. sendPushNotification
  // with an explicit single-element list is what actually keeps this notification as private as
  // the thread itself.
  const sendDirectMessageToFamily = async (guardianUid, text, attachments) => {
    const key = `teacher-messages:${loggedInTeacher.uid}:${guardianUid}`;
    const existing = (await loadJSON(key, null, true)) || { messages: [] };
    const entry = { id: uid(), senderType: "teacher", senderName: loggedByName || "Teacher", text, timestamp: new Date().toISOString(), ...(attachments?.length ? { attachments } : {}) };
    const next = { messages: [...existing.messages, entry] };
    await saveJSON(key, next, true);
    sendPushNotification([guardianUid], `Direct message from ${loggedByName || "your teacher"}`, text?.trim() || describeAttachmentsForNotification(attachments), `/?portal=parent&open=teacher-messages&teacherUid=${loggedInTeacher.uid}`);
    return next;
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

  const openIncidentForm = (studentId, returnTo, categoryId) => { setIncidentPreset(studentId); setIncidentCategoryPreset(categoryId || null); setIncidentReturn(returnTo); navigateView("incident"); };
  const openPeriodAttendanceForm = (studentId, returnTo) => { setPeriodAttPreset(studentId); setPeriodAttReturn(returnTo); navigateView("period-attendance"); };
  const todaysScheduleForForm = (() => {
    const todayStr = todayISO();
    const entry = plannerDays?.[todayStr];
    const dayType = (config.planner?.dayTypes || []).find((t) => t.id === entry?.dayType);
    return getScheduleForDate(todayStr, dayType, config, plannerDays);
  })();
  const openMessageDraft = (flag) => { setMessageFlag(flag); navigateView("message-draft"); };

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
    <ClassContext.Provider value={{ className, onSwitchClass, switchLabel, classType, commUnreadCount: commUnreadFamilies.length }}>
    <AppModeContext.Provider value={{ canSwitchToParent: Boolean(canSwitchToParent), switchToParent: onSwitchToParent || (() => {}) }}>
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{
        height: "48px", width: "100%",
        background: "linear-gradient(90deg, #2b2723 0%, #2b2723 55%, #c0362c 100%)",
        WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
        maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
      }} />
      <GlobalAppStyles />

      {swipeOrder.includes(view) && (
        // min-height fills out the rest of the screen even when a tab's own content is short —
        // without it, this div's height just wraps to its content, and touching the empty space
        // below that (which then belongs to something else entirely, with no touch handlers of
        // its own) does nothing at all. Since most of a phone screen can easily be empty
        // depending on what's posted that day, that made a swipe feel like it only worked from
        // certain, hard-to-predict spots on the page.
        <div ref={swipeContainerRef} className="relative overflow-hidden" style={{ minHeight: "70vh" }} onTouchStart={onTabAreaTouchStart} onTouchEnd={onTabAreaTouchEnd}>
          <div style={{ transform: `translateX(${dragOffsetPx}px)`, transition: dragAnimating ? "transform 0.22s ease-out" : "none" }}>
            {renderMainTabContent(view)}
          </div>
          {dragTargetTab && (
            <div className="absolute top-0 left-0 right-0" style={{ pointerEvents: "none" }}>
              <div
                style={{
                  transform: `translateX(${dragOffsetPx + (dragOffsetPx < 0 ? swipeTrackWidth.current : -swipeTrackWidth.current)}px)`,
                  transition: dragAnimating ? "transform 0.22s ease-out" : "none",
                }}>
                {renderMainTabContent(dragTargetTab)}
              </div>
            </div>
          )}
        </div>
      )}



      {view === "all-preschool-attendance" && (
        <AllPreschoolAttendanceView loggedByName={loggedByName} navigate={navigateView} />
      )}


      {view === "segment-celebration-message" && celebratingSegment && (
        <SegmentCelebrationMessageView subjectLabel={celebratingSegment.subjectLabel} segmentLabel={celebratingSegment.segment.label}
          roster={roster} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")}
          onDone={() => { dismissSegmentCelebration(celebratingSegment.segment.id); navigateView(classType === "preschool" ? "daily-log" : "home"); }} />
      )}

      {view === "class-mode" && (
        <ClassModeView roster={roster} studentData={studentData} config={config} addPoints={addPoints}
          openIncidentForm={(id) => openIncidentForm(id, "class-mode")} onExit={() => navigateView(classType === "preschool" ? "daily-log" : "home")} onOpenClassTools={() => setShowPlan(true)} />
      )}

      {view === "day-recap" && (
        <DayRecapView roster={roster} studentData={studentData} incidents={incidents} behaviorLogData={behaviorLogData}
          plannerDays={plannerDays} config={config} onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")} />
      )}

      {/* Class Tools drawer — slides in from the right and pushes the roster over to share the screen (like a Gmail side panel) — never dims or blocks it, at any width. Lives here (not inside any one view) so both Home and Class Mode can open it. Position/transform/transition are inline styles deliberately, so they never depend on utility-CSS generation timing. */}
      <div className="w-full sm:w-96 lg:w-1/2 bg-stone-50 border-l border-stone-200 shadow-2xl overflow-y-auto"
        style={{ position: "fixed", top: 0, right: 0, height: viewportHeight, zIndex: 40, transform: showPlan ? "translateX(0)" : "translateX(100%)", transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="p-4 space-y-4 lg:max-w-xl">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-stone-800">Class Tools</p>
            <button onClick={() => setShowPlan(false)} className="text-stone-400 hover:text-stone-700 p-1"><ChevronRight size={20} /></button>
          </div>
          <TodaysPlanPanel config={config} plannerDays={plannerDays} setPlannerDay={setPlannerDay} navigate={navigateView} benchmarkSubjects={benchmarkSubjects} />
          <TimerWidget />
          <RandomPickerWidget roster={roster} pickerData={randomPickerData} onPick={recordRandomPick} onReset={resetRandomPicker} />
          <ScratchpadWidget plannerDays={plannerDays} setPlannerDay={setPlannerDay} />
          <button onClick={() => navigateView("day-recap")} className="w-full flex items-center justify-center gap-2 bg-stone-800 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-stone-900">
            End of day recap <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {view === "messages" && (
        <TeacherMessagesView classId={classId} roster={roster} config={config} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily} sendDirectMessageToFamily={sendDirectMessageToFamily} loggedByName={loggedByName} navigate={navigateView} deepLinkGroupId={deepLinkGroupId} deepLinkIsDirect={deepLinkIsDirect} onCommRead={refreshCommUnread} />
      )}



      {view === "blog-compose" && (
        <BlogComposeScreen config={config} loggedInTeacher={loggedInTeacher} onSubmit={submitBlogPost} onBack={() => navigateView("blog")} />
      )}


      {view === "homework-compose" && (
        <HomeworkComposeScreen classId={classId} onSubmit={submitHomework} onBack={() => navigateView("homework")} />
      )}


      {view === "comm-entry" && currentId && (
        <CommunicationEntryView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          onBack={() => navigateView("communication")} onAddEntry={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "monthly-reports" && (
        <MonthlyReportsView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config} loggedInTeacher={loggedInTeacher} classType={classType}
          onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "range-report" && (
        <CustomRangeReportView roster={roster} studentData={studentData} incidents={incidents} classAssessments={classAssessments} config={config} loggedInTeacher={loggedInTeacher} classType={classType}
          onBack={() => navigateView("communication")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "reflection-form" && (
        <MonthlyReflectionForm monthKey={selectedReflectionMonth || monthKey(new Date().getFullYear(), new Date().getMonth())}
          existing={reflections.find((r) => r.monthKey === (selectedReflectionMonth || monthKey(new Date().getFullYear(), new Date().getMonth())))}
          allReflections={reflections} onSave={saveReflection} onBack={() => navigateView("reflection-history")} />
      )}

      {view === "reflection-history" && (
        <ReflectionHistoryView reflections={reflections} navigate={navigateView}
          onOpenMonth={(mk) => { setSelectedReflectionMonth(mk); navigateView("reflection-form"); }}
          onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")} />
      )}


      {view === "assessment-report" && selectedAssessmentId && (
        <AssessmentReportView assessment={classAssessments.find((ca) => ca.id === selectedAssessmentId)} roster={roster} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => navigateView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)} />
      )}

      {view === "skill-category-report" && selectedSkillReportCat && (
        <SkillCategoryReportView category={config.categories.find((c) => c.id === selectedSkillReportCat)} roster={roster} studentData={studentData} config={config} loggedInTeacher={loggedInTeacher}
          onBack={() => navigateView("assessments")} onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(id, email) => updateStudentField(id, "parentEmail", email)}
          onStartClassSession={startClassSession} />
      )}




      {view === "class-assessment-form" && (
        <ClassAssessmentForm roster={roster} config={config} onCancel={() => navigateView("assessments")}
          onSave={(entry) => { addClassAssessment(entry); navigateView("assessments"); }} />
      )}

      {view === "detail" && currentId && (
        <StudentDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          incidents={incidents} classAssessments={classAssessments} config={config}
          onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")} onAcknowledge={(key) => acknowledgeFlag(currentId, key)}
          onLogIncident={() => openIncidentForm(currentId, "detail")} onLogPeriodAttendance={() => openPeriodAttendanceForm(currentId, "detail")}
          onGoToAssessments={() => { setInitialAssessmentStudentId(currentId); navigateView("assessments"); }}
          onExportReport={() => navigateView("print-report-options")}
          onDraftMessage={openMessageDraft} onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onUpdateField={(field, value) => updateStudentField(currentId, field, value)}
          onOpenClassAssessmentReport={(id) => { setSelectedAssessmentId(id); navigateView("assessment-report"); }}
          onOpenFluencyDetail={(entry) => { setDetailReturnView("detail"); setSelectedFluencyEntry(entry); navigateView("fluency-detail"); }}
          onOpenSkillDetail={(catId) => { setDetailReturnView("detail"); setSelectedSkillCat(catId); navigateView("skill-detail"); }}
          onOpenIncidentDetail={(id) => { setSelectedIncidentId(id); setIncidentDetailReturn("detail"); navigateView("incident-detail"); }}
          onFetchCrossClassHistory={fetchCrossClassHistory} currentClassName={className} />
      )}

      {view === "print-report-options" && currentId && (
        <PrintReportOptionsView student={roster.find((s) => s.id === currentId)}
          onBack={() => navigateView("detail")}
          onGenerate={(sections) => { setReportSections(sections); navigateView("print-report"); }} />
      )}

      {view === "print-report" && currentId && (
        <PrintableStudentReport student={roster.find((s) => s.id === currentId)} data={studentData[currentId] || emptyStudentData()}
          incidents={incidents} classAssessments={classAssessments} config={config} sections={reportSections}
          currentClassName={className} onBack={() => navigateView("print-report-options")} />
      )}

      {view === "incident-detail" && selectedIncidentId && (
        <IncidentDetailView incident={incidents.find((i) => i.id === selectedIncidentId)} roster={roster} classId={classId} config={config} plannerDays={plannerDays} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily}
          onBack={() => navigateView(incidentDetailReturn)}
          onLogSent={(studentId, entry) => addCommunication(studentId, entry)}
          onUpdateParentEmail={(studentId, email) => updateStudentField(studentId, "parentEmail", email)}
          onUpdateIncident={updateIncident}
          onRemoveIncident={(id) => { removeIncident(id); navigateView(incidentDetailReturn); }} />
      )}

      {view === "fluency-detail" && currentId && selectedFluencyEntry && (
        <FluencyDetailView student={roster.find((s) => s.id === currentId)} entry={selectedFluencyEntry} classId={classId} config={config} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily}
          onBack={() => navigateView(detailReturnView)} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "skill-detail" && currentId && selectedSkillCat && (
        <SkillDetailView student={roster.find((s) => s.id === currentId)} data={studentData[currentId]}
          category={config.categories.find((c) => c.id === selectedSkillCat)} classId={classId} config={config} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily}
          onBack={() => navigateView(detailReturnView)} onLogSent={(msgEntry) => addCommunication(currentId, msgEntry)}
          onUpdateParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)} />
      )}

      {view === "session" && currentId && sessionCat && (
        <SessionView category={config.categories.find((c) => c.id === sessionCat)} config={config}
          idx={sessionIdx} setIdx={setSessionIdx}
          onGrade={(itemId, result) => gradeItem(sessionCat, itemId, result, classSessionDate)}
          onFinish={() => (classSessionQueue ? advanceClassSession() : navigateView("assessments"))}
          studentName={roster.find((s) => s.id === currentId)?.name}
          classSessionProgress={classSessionQueue ? { pos: classSessionPos, total: classSessionQueue.length } : null} />
      )}

      {view === "fluency" && currentId && (
        <FluencyForm student={roster.find((s) => s.id === currentId)} onCancel={() => navigateView("assessments")}
          onSave={(entry) => { addFluencyEntry(currentId, entry); navigateView("assessments"); }} />
      )}

      {view === "incident" && (
        <IncidentForm roster={roster} config={config} presetId={incidentPreset} categoryPreset={incidentCategoryPreset}
          onCancel={() => navigateView(incidentReturn)}
          onSave={(entry) => { addIncident(entry); navigateView(incidentReturn); }} />
      )}

      {view === "camera-capture" && (
        <CameraCaptureView roster={roster} classId={classId} submitBlogPost={submitBlogPost} sendMessageToFamily={sendMessageToFamily}
          onDone={() => navigateView(cameraReturn)} />
      )}

      {view === "period-attendance" && (
        <PeriodAttendanceForm roster={roster} config={config} presetId={periodAttPreset} todaysPeriods={todaysScheduleForForm}
          onCancel={() => navigateView(periodAttReturn)}
          onSave={(studentIds, entry) => { addPeriodAttendance(studentIds, entry); navigateView(periodAttReturn); }} />
      )}

      {view === "message-draft" && currentId && messageFlag && (
        <MessageDraftView student={roster.find((s) => s.id === currentId)} flag={messageFlag} classId={classId} config={config} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily}
          onBack={() => navigateView("detail")} onSaveParentEmail={(email) => updateStudentField(currentId, "parentEmail", email)}
          onLogSent={(entry) => addCommunication(currentId, entry)} />
      )}

      {view === "settings" && (
        <SettingsView config={config} setConfig={persistConfig} onBack={() => navigateView(classType === "preschool" ? "daily-log" : "home")}
          roster={roster} addStudent={addStudent} removeStudent={removeStudent} updateStudentField={updateStudentField}
          loadSampleData={loadSampleData} clearAllData={clearAllData}
          className={className} classId={classId} onRenameClass={onRenameClass} onChangePassword={onChangePassword} onArchiveClass={onArchiveClass} onDeleteClass={onDeleteClass}
          subCode={subCode} onGenerateSubCode={onGenerateSubCode} onClearSubCode={onClearSubCode}
          globalStudents={globalStudents} onRefreshGlobalStudents={refreshGlobalStudentsInClass} onAddExistingStudent={addExistingStudent} onCheckStudentEnrollments={checkStudentEnrollments}
          loggedInTeacher={loggedInTeacher} onChangeMySignOff={onChangeMySignOff} onOpenMyAccount={() => setShowMyAccount(true)} onOpenOnboarding={() => setShowOnboarding(true)}
          createFamilyAccount={createFamilyAccount} />
      )}

      {showMyAccount && loggedInTeacher && (
        <MyAccountPanel teacher={loggedInTeacher} onUpdateName={onChangeMyName} onChangePassword={onChangeMyPassword} onClose={() => setShowMyAccount(false)} />
      )}

      {showOnboarding && (
        <OnboardingWizard config={config} setConfig={persistConfig} onClose={() => setShowOnboarding(false)} classType={classType} />
      )}
    </div>
    </AppModeContext.Provider>
    </ClassContext.Provider>
  );
}

// ---------- Shared header / nav ----------

// ---------- Home ----------

function HomeView({ roster, studentData, incidents, config, removeStudent, setAttendance, setAttendanceTime, setHomework, markNoHomeworkToday, openDetail, openIncidentForm, openPeriodAttendance, navigate, monthlyReportState, onDismissMonthlyReminder, reflectionState, onDismissReflectionReminder, onOpenReflection, reflections, plannerDays, plannerEvents, setPlannerDay, addPoints, behaviorLogData, birthdayDismissals, onDismissBirthday, onCreateBirthdayEvent, benchmarkSubjects, segmentCelebrationDismissals, onDismissSegmentCelebration, onCelebrateSegment, onAddPlannerEvent, randomPickerData, onRandomPick, onResetRandomPicker, alerts, dismissAlert, showPlan, setShowPlan, openCameraCapture }) {
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
      <button onClick={openCameraCapture} title="Take a photo"
        className="fixed bottom-20 right-5 z-30 flex items-center justify-center bg-white border-2 border-stone-200 text-stone-700 rounded-full p-3 shadow-lg hover:border-teal-300">
        <Camera size={18} />
      </button>

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
            <ul className="space-y-2">
              {roster.map((s) => {
                const entry = (studentData[s.id]?.attendance || []).find((a) => a.date === date);
                const isLateType = entry?.status && statusMap[entry.status]?.flagType === "late";
                const flags = getFlags(studentData[s.id], s.id, incidents, config);
                const isSelected = selectedIds.includes(s.id);
                const isExpanded = expandedAttendance.includes(s.id);
                const showFullPicker = !entry || isExpanded;
                const studentAttendanceApplies = morningAttendanceApplies(s, date, selectedDayType, config, plannerDays);
                const homeworkEntry = (studentData[s.id]?.homework || []).find((h) => h.date === date);
                return (
                  <li key={s.id} className={`bg-white rounded-xl border px-3 py-2 overflow-x-auto no-scrollbar ${isSelected ? "border-teal-400 ring-1 ring-teal-200" : "border-stone-200"}`}>
                    <div className="flex flex-nowrap items-center gap-x-2 w-max min-w-full">
                      {multiSelect && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds((prev) => (isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]))}
                          className="w-4 h-4 shrink-0" />
                      )}
                      <button onClick={() => openDetail(s.id)} className="font-medium text-stone-800 text-sm hover:text-teal-700 flex items-center gap-1.5 shrink-0 text-left whitespace-nowrap w-36">
                        <span className="truncate">{s.name}</span>
                        {flags.length > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-700 bg-amber-50 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                            <AlertTriangle size={10} /> {flags.length}
                          </span>
                        )}
                      </button>

                      {!showAttendanceCollapsed && (
                        <div className="shrink-0 w-72">
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
                        <div className="shrink-0">
                          {homeworkEntry?.status === "n/a" ? (
                            <span className="text-xs text-stone-400 italic whitespace-nowrap">No homework</span>
                          ) : homeworkEntry?.status ? (
                            <button onClick={() => setHomework(s.id, date, homeworkEntry.status === "completed" ? "missed" : "completed")}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${homeworkEntry.status === "completed" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                              {homeworkEntry.status === "completed" ? "✅ Done" : "❌ Missing"}
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => setHomework(s.id, date, "completed")} className="text-xs font-semibold px-2 py-1 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap">✅</button>
                              <button onClick={() => setHomework(s.id, date, "missed")} className="text-xs font-semibold px-2 py-1 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 whitespace-nowrap">❌</button>
                            </div>
                          )}
                        </div>
                      )}

                      {participatesInPoints(s) && individualPointCats.map((cat) => {
                        if (cat.displayMode === "checkx") {
                          const checks = studentData[s.id]?.points?.[`${cat.id}:check`] || 0;
                          const xs = studentData[s.id]?.points?.[`${cat.id}:x`] || 0;
                          return (
                            <div key={cat.id} className="flex items-center gap-1 bg-stone-50 rounded-full pl-2 pr-1 py-0.5 shrink-0">
                              <span className="text-[10px] font-semibold text-stone-500 whitespace-nowrap">{cat.label}</span>
                              <button onClick={() => addPoints(s.id, `${cat.id}:check`, 1)} className="flex items-center gap-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 rounded-full px-1.5">{checks} ✓</button>
                              <button onClick={() => addPoints(s.id, `${cat.id}:x`, 1)} className="flex items-center gap-0.5 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded-full px-1.5">{xs} ✗</button>
                            </div>
                          );
                        }
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
                    </div>
                  </li>
                );
              })}
            </ul>
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

function TodaysPlanPanel({ config, plannerDays, setPlannerDay, navigate, benchmarkSubjects }) {
  const today = todayISO();
  const entry = plannerDays?.[today] || {};
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const dayType = entry.dayType ? dayTypeMap[entry.dayType] : null;
  const template = getScheduleForDate(today, dayType, config, plannerDays);
  const [slotDrafts, setSlotDrafts] = useState(entry.slotContent || {});

  useEffect(() => { setSlotDrafts(plannerDays?.[today]?.slotContent || {}); }, [today, plannerDays]);

  const saveSlot = (slotId, text) => setPlannerDay(today, { slotContent: { ...(plannerDays?.[today]?.slotContent || {}), [slotId]: text } });

  // Whatever a benchmark says is happening in a given subject today, brought straight into that
  // subject's own note — matched by name (a schedule slot labeled "Math" against a benchmark
  // subject also labeled "Math") since that's the only thing tying the two features together at
  // all. Only ever fills a slot that's still genuinely empty — never overwrites a note the teacher
  // already wrote themselves, since their own words about their own day always win.
  const lessonTitleForSlot = (slotLabel) => {
    const subject = (benchmarkSubjects || []).find((s) => s.label.trim().toLowerCase() === (slotLabel || "").trim().toLowerCase());
    if (!subject) return null;
    const seg = subject.segments.find((sg) => today >= sg.startDate && today <= sg.endDate);
    return seg?.lessons?.find((l) => l.date === today)?.title || null;
  };

  // Runs once whenever there's actually something new to offer — a fresh day, or benchmark data
  // that's only just loaded in. Writes straight to the saved plan, not just a visual placeholder,
  // so it's genuinely there the moment Class Tools opens rather than only appearing once a slot
  // happens to be clicked into. Computes every slot's fill in one pass and writes them together in
  // a single call — calling saveSlot separately per slot would have each one spread from the same
  // not-yet-updated plannerDays snapshot, silently losing all but the last write whenever more than
  // one slot needs filling on the same day.
  useEffect(() => {
    if (!template || template.length === 0 || !benchmarkSubjects || benchmarkSubjects.length === 0) return;
    const existing = plannerDays?.[today]?.slotContent || {};
    const fills = {};
    template.forEach((slot) => {
      if (existing[slot.id]) return; // never override a note that's already there, teacher-written or otherwise
      const lessonTitle = lessonTitleForSlot(slot.label);
      if (lessonTitle) fills[slot.id] = lessonTitle;
    });
    if (Object.keys(fills).length > 0) setPlannerDay(today, { slotContent: { ...existing, ...fills } });
  }, [today, template, benchmarkSubjects]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-stone-800 text-sm">Today's Plan</p>
        <div className="flex items-center gap-2">
          {dayType && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${dayType.color}-100 text-${dayType.color}-700`}>{dayType.label}</span>}
          {template && template.length > 0 && <button onClick={() => navigate("settings")} className="text-[10px] font-semibold text-teal-700">Adjust</button>}
        </div>
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
          {template.map((slot) => {
            const st = TILE_STYLES[slot.color] || null;
            return (
            <div key={slot.id} className={`rounded-lg p-2 border ${st ? `${st.tileBorder} ${st.tileBg}` : "border-stone-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${st ? st.labelText : "text-stone-700"}`}>{slot.label}</span>
                <span className={`text-[10px] ${st ? `${st.labelText} opacity-70` : "text-stone-400"}`}>{formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)}</span>
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
            );
          })}
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

    {/* Rendered via a portal straight onto document.body, not in the normal component tree —
        this is what actually fixes full screen only filling the Class Tools drawer's own width
        rather than the real screen on some devices. This overlay is already position: fixed,
        which should mean "relative to the real viewport" — but CSS creates a new containing
        block for position: fixed descendants under any transformed ancestor, and the Class
        Tools drawer this widget normally lives inside is exactly that: transform-animated for
        its own slide-in/out. That's invisible whenever the browser's native Fullscreen API
        actually succeeds, since real fullscreen moves this element into its own separate
        rendering context untouched by ordinary page CSS — which is what a laptop, where that
        API is broadly supported, does. It's a real, reported problem specifically where that API
        is unavailable or restricted for an arbitrary element like this — a real, plausible
        limitation on tablet Safari — since the CSS-only fallback that takes over instead was
        still trapped inside that transformed drawer, filling only its width rather than the
        actual screen. A portal renders this overlay as a genuine sibling of the drawer in the
        real DOM, not a descendant of it, so its own fixed positioning is never affected by
        anything the drawer's own CSS does, independent of whether the Fullscreen API itself
        works on any given device. */}
    {fullScreen && createPortal(
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
      </div>,
      document.body
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

const PRESCHOOL_MOOD_OPTIONS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "fussy", label: "Fussy", emoji: "😣" },
  { id: "sleepy", label: "Sleepy", emoji: "😴" },
  { id: "sad", label: "Sad", emoji: "😢" },
];
const DIAPER_TYPES = [
  { id: "wet", label: "Wet" },
  { id: "bm", label: "BM" },
  { id: "both", label: "Both" },
  { id: "dry", label: "Dry check" },
];
const BATHROOM_TRIP_TYPES = [
  { id: "wet", label: "Wet" },
  { id: "bm", label: "BM" },
  { id: "both", label: "Both" },
  { id: "no-result", label: "No result" },
  { id: "accident", label: "Accident" },
];

// Tailwind's compiler needs every class name to appear as a literal string somewhere in the
// source — a template literal like `bg-${tile.color}-50` only works "by accident" for colors that
// happen to already be spelled out elsewhere in the file, which is exactly the kind of silent,
// fragile bug that's easy to ship without noticing (it did happen once while building this very
// screen). Spelling every class out literally here means every one of them is guaranteed to exist.
const TILE_STYLES = {
  violet: {
    tileBg: "bg-violet-50", tileBorder: "border-violet-200", tileBorderHover: "hover:border-violet-400",
    iconText: "text-violet-700", labelText: "text-violet-900", countText: "text-violet-600",
    solid: "bg-violet-600", solidHover: "hover:bg-violet-700", solidBorder: "border-violet-600",
    rowActive: "border-violet-300 bg-violet-50", iconBg: "bg-violet-100",
  },
  amber: {
    tileBg: "bg-amber-50", tileBorder: "border-amber-200", tileBorderHover: "hover:border-amber-400",
    iconText: "text-amber-700", labelText: "text-amber-900", countText: "text-amber-600",
    solid: "bg-amber-600", solidHover: "hover:bg-amber-700", solidBorder: "border-amber-600",
    rowActive: "border-amber-300 bg-amber-50", iconBg: "bg-amber-100",
  },
  emerald: {
    tileBg: "bg-emerald-50", tileBorder: "border-emerald-200", tileBorderHover: "hover:border-emerald-400",
    iconText: "text-emerald-700", labelText: "text-emerald-900", countText: "text-emerald-600",
    solid: "bg-emerald-600", solidHover: "hover:bg-emerald-700", solidBorder: "border-emerald-600",
    rowActive: "border-emerald-300 bg-emerald-50", iconBg: "bg-emerald-100",
  },
  fuchsia: {
    tileBg: "bg-fuchsia-50", tileBorder: "border-fuchsia-200", tileBorderHover: "hover:border-fuchsia-400",
    iconText: "text-fuchsia-700", labelText: "text-fuchsia-900", countText: "text-fuchsia-600",
    solid: "bg-fuchsia-600", solidHover: "hover:bg-fuchsia-700", solidBorder: "border-fuchsia-600",
    rowActive: "border-fuchsia-300 bg-fuchsia-50", iconBg: "bg-fuchsia-100",
  },
  indigo: {
    tileBg: "bg-indigo-50", tileBorder: "border-indigo-200", tileBorderHover: "hover:border-indigo-400",
    iconText: "text-indigo-700", labelText: "text-indigo-900", countText: "text-indigo-600",
    solid: "bg-indigo-600", solidHover: "hover:bg-indigo-700", solidBorder: "border-indigo-600",
    rowActive: "border-indigo-300 bg-indigo-50", iconBg: "bg-indigo-100",
  },
  rose: {
    tileBg: "bg-rose-50", tileBorder: "border-rose-200", tileBorderHover: "hover:border-rose-400",
    iconText: "text-rose-700", labelText: "text-rose-900", countText: "text-rose-600",
    solid: "bg-rose-600", solidHover: "hover:bg-rose-700", solidBorder: "border-rose-600",
    rowActive: "border-rose-300 bg-rose-50", iconBg: "bg-rose-100",
  },
  teal: {
    tileBg: "bg-teal-50", tileBorder: "border-teal-200", tileBorderHover: "hover:border-teal-400",
    iconText: "text-teal-700", labelText: "text-teal-900", countText: "text-teal-600",
    solid: "bg-teal-600", solidHover: "hover:bg-teal-700", solidBorder: "border-teal-600",
    rowActive: "border-teal-300 bg-teal-50", iconBg: "bg-teal-100",
  },
  sky: {
    tileBg: "bg-sky-50", tileBorder: "border-sky-200", tileBorderHover: "hover:border-sky-400",
    iconText: "text-sky-700", labelText: "text-sky-900", countText: "text-sky-600",
    solid: "bg-sky-600", solidHover: "hover:bg-sky-700", solidBorder: "border-sky-600",
    rowActive: "border-sky-300 bg-sky-50", iconBg: "bg-sky-100",
  },
  // orange and cyan specifically (not any of the families above) — those were remapped to muted,
  // low-contrast taupe/olive tones during an earlier design pass for use as subtle secondary UI,
  // which is exactly wrong for a dashboard tile that needs to read as vividly distinct at a
  // glance. orange/cyan were never touched by that remapping, so they render as genuine color.
  orange: {
    tileBg: "bg-orange-50", tileBorder: "border-orange-200", tileBorderHover: "hover:border-orange-400",
    iconText: "text-orange-700", labelText: "text-orange-900", countText: "text-orange-600",
    solid: "bg-orange-600", solidHover: "hover:bg-orange-700", solidBorder: "border-orange-600",
    rowActive: "border-orange-300 bg-orange-50", iconBg: "bg-orange-100",
  },
  cyan: {
    tileBg: "bg-cyan-50", tileBorder: "border-cyan-200", tileBorderHover: "hover:border-cyan-400",
    iconText: "text-cyan-700", labelText: "text-cyan-900", countText: "text-cyan-600",
    solid: "bg-cyan-600", solidHover: "hover:bg-cyan-700", solidBorder: "border-cyan-600",
    rowActive: "border-cyan-300 bg-cyan-50", iconBg: "bg-cyan-100",
  },
};

// A small, collapsed-by-default note affordance for one student's row within an already-expanded
// customization panel — deliberately not part of the main tap-to-set-a-value flow, so a teacher
// who never needs it never even sees an empty text box. The "+ Note" link is this field's entire
// footprint until someone actually taps it; from then on (or whenever a value already exists,
// e.g. reopening a row that already has one) it shows the real input instead. Shared by every
// preschool bulk-logging screen — meals, diapers, bathroom, nap, mood — so notes work the same
// single, consistent way everywhere rather than each screen inventing its own version.
// onChange updates local draft state on every keystroke (cheap, no network call) — the shape every
// bulk screen wants, since they only ever persist once, in a batch, on their own final "Log"
// button. onBlur is optional and only for a screen with no such batch step of its own (Mood, which
// saves the moment a mood is tapped, with nothing else to wait for) — fires once when the field
// loses focus, so a real save happens once per edit instead of once per keystroke.
function InlineNoteField({ value, onChange, onBlur }) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-[11px] font-semibold text-stone-400 hover:text-stone-600">+ Note</button>;
  }
  return (
    <input value={value || ""} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder="Optional note for this student…" autoFocus
      className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs" />
  );
}

// "HH:MM" strings in, minutes between them out — naps never cross midnight, so simple subtraction
// (with the usual few-lines-of-day-math) is all this needs, no date object required.
function napDurationMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
function formatDurationMinutes(mins) {
  if (mins == null || mins < 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Weekday-keyed meal menus — one recurring weekly list of items per meal type (lunch, morning
// snack, afternoon snack), configured once in Settings and then reused every week, rather than
// re-entering the same menu every single day. Keyed by weekday name, not a specific date, since
// the actual menu repeats week to week; a weekday with no items configured yet (Friday, until
// it's set up) just means that meal falls back to the older, generic amount scale instead.
const MEAL_MENU_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const MEAL_MENU_WEEKDAY_LABELS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday" };
function weekdayKeyForDate(dateStr) {
  // dateStr is "YYYY-MM-DD"; JS Date's getDay() is 0=Sunday..6=Saturday, so this only ever
  // returns one of the five keys above for an actual school day — Saturday/Sunday simply won't
  // match any configured menu, which is the correct behavior (no school, no menu to show).
  const idx = new Date(dateStr + "T00:00:00").getDay();
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][idx];
}
// Reads today's configured menu items for a given meal type — [] if that weekday has nothing
// configured yet for this meal type, which the logging screen treats as "fall back to the
// generic amount scale" rather than showing an empty, useless item list.
function mealMenuItemsFor(config, mealType, dateStr) {
  const weekday = weekdayKeyForDate(dateStr);
  return config.preschool?.mealMenus?.[mealType]?.[weekday] || [];
}

// Every tile on the preschool dashboard — one shared config drives both the dashboard grid and
// which sub-screen a tap opens, so adding a category later means adding one entry here, not
// touching the dashboard layout itself. bulkDefault: "all" means every student starts selected
// with the everyday value (used for meals, where that's a safe assumption); "none" means nothing
// is pre-selected (used everywhere a whole-room default would be guessing, not saving time).
const PRESCHOOL_TILES = [
  { id: "mood", label: "Mood", icon: Smile, color: "orange", bulkDefault: "none" },
  { id: "lunch", label: "Lunch", icon: Sandwich, color: "emerald", bulkDefault: "all", mealType: "lunch" },
  { id: "snack-am", label: "Morning Snack", icon: Apple, color: "fuchsia", bulkDefault: "all", mealType: "snack-am" },
  { id: "snack-pm", label: "Afternoon Snack", icon: Apple, color: "violet", bulkDefault: "all", mealType: "snack-pm" },
  { id: "nap", label: "Nap", icon: Moon, color: "indigo", bulkDefault: "all" },
  { id: "diapers", label: "Diapers", icon: Baby, color: "rose", bulkDefault: "all" },
  { id: "bathroom", label: "Bathroom", icon: Droplets, color: "teal", bulkDefault: "none" },
  // These two open PreschoolIncidentForm directly (via screen === tile.id below), each with its
  // own separate category list — never the shared elementary IncidentForm/config.incidents, and
  // never each other's category list either.
  { id: "health-incident", label: "Health incident", icon: HeartPulse, color: "cyan", bulkDefault: "none" },
  { id: "incident", label: "Incident", icon: AlertTriangle, color: "amber", bulkDefault: "none" },
  { id: "photos", label: "Photos", icon: Camera, color: "amber", bulkDefault: "none", special: "camera" },
  // Opens PreschoolStudentListView → PreschoolStudentDetailView (via screen === "students" below),
  // not a bulk-logging screen at all — no bulkDefault, no mealType, none of the shared "select
  // everyone, log together" machinery the rest of these tiles use applies here.
  { id: "students", label: "Students", icon: Users, color: "indigo", bulkDefault: "none" },
];

// Preschool attendance — same underlying data (setAttendance, config.attendance.statuses) as the
// elementary Home screen, but presented on its own, without the homework/points/flags clutter
// that doesn't apply to a preschool room, and with bigger, simpler touch targets to match the
// same fast-glance philosophy as the rest of the preschool screens.
function PreschoolAttendanceView({ roster, studentData, toggleCheckInByTeacher, config, plannerDays, navigate }) {
  const date = todayISO();
  const schoolDay = isSchoolDay(date, config, plannerDays);
  const [confirmingRepeatFor, setConfirmingRepeatFor] = useState(null);

  const handleTap = (studentId, isIn, checkIns) => {
    if (!isIn && wouldBeRepeatCheckIn(checkIns, date)) {
      setConfirmingRepeatFor(studentId);
      return;
    }
    toggleCheckInByTeacher(studentId);
  };

  return (
    <div className="app-page-wide">
      <Header navigate={navigate} />
      <MainTabs active="attendance" navigate={navigate} />
      <button onClick={() => navigate("all-preschool-attendance")} className="w-full mb-3 flex items-center justify-center gap-2 bg-white text-teal-700 border border-teal-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-50">
        <Users size={16} /> All preschool students — dismissal view
      </button>
      <p className="text-xs text-stone-400 mb-3">Who's actually here right now — not a daily record of late or excused, just in or not. Families can also check their own child in or out from their end.</p>
      {!schoolDay && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-xs font-semibold text-amber-800">Today isn't marked as a school day in Planner. You can still check students in below if this is a genuine exception.</p>
        </div>
      )}

      {roster.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No students in this class yet.</p>}

      <div className="space-y-2">
        {roster.map((s) => {
          const checkIns = studentData[s.id]?.checkIns || [];
          const todaysEntries = checkIns.filter((c) => c.date === date).sort((a, b) => (a.checkInTime < b.checkInTime ? -1 : 1));
          const openEntry = todaysEntries.find((c) => c.checkInTime && !c.checkOutTime);
          const isIn = Boolean(openEntry);
          const confirming = confirmingRepeatFor === s.id;
          return (
            <div key={s.id} className={`rounded-xl border-2 p-4 flex flex-wrap items-center justify-between gap-3 ${isIn ? "bg-emerald-50 border-emerald-300" : "bg-white border-stone-200"}`}>
              <div>
                <span className="font-semibold text-stone-900 text-lg block">{s.name}</span>
                {todaysEntries.length === 0 ? (
                  <span className="text-xs font-semibold text-stone-400">Not checked in yet today</span>
                ) : (
                  <div className="mt-0.5 space-y-0.5">
                    {todaysEntries.map((e) => (
                      <p key={e.id} className={`text-xs font-semibold ${!e.checkOutTime ? "text-emerald-700" : "text-stone-500"}`}>
                        In {formatTime12h(e.checkInTime)}{e.checkInBy ? ` (${e.checkInBy})` : ""}
                        {e.checkOutTime ? ` — Out ${formatTime12h(e.checkOutTime)}${e.checkOutBy ? ` (${e.checkOutBy})` : ""}` : " — still here"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Log another visit today?</span>
                  <button onClick={() => { toggleCheckInByTeacher(s.id); setConfirmingRepeatFor(null); }}
                    className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Yes, check in</button>
                  <button onClick={() => setConfirmingRepeatFor(null)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-stone-300 text-stone-500">Cancel</button>
                </div>
              ) : (
                <button onClick={() => handleTap(s.id, isIn, checkIns)}
                  className={`text-sm font-bold px-5 py-3 rounded-xl ${isIn ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                  {isIn ? "Check out" : "Check in"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Every preschool student in the school, on one page, grouped by family so siblings sit together
// and dismiss together — built specifically for the "one teacher clearing out the whole building
// at pickup" situation, where waiting for each room's own attendance screen doesn't work.
// Reachable from any preschool class, not just the admin dashboard, since it's usually a teacher
// doing this, not the office. Family grouping is a best-effort match on parent email or phone —
// there's no hard family ID on a student record, so this is a heuristic, not a guarantee.
function AllPreschoolAttendanceView({ loggedByName, navigate }) {
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState([]); // [{ key, students: [{ id, name, classId, className, links, checkIns }] }]
  const [confirmingRepeatFor, setConfirmingRepeatFor] = useState(null);
  const date = todayISO();

  // Was previously one entry PER CLASS a student was enrolled in — a student genuinely enrolled
  // in two classes (part-time, or specific periods only) showed up here as two separate,
  // independent rows, each with its own check-in button unaware the other existed. A real,
  // reported incident showed exactly what that allows: a child checked in under one class while
  // already checked in under another, with no warning either time — and no way for whichever
  // class's teacher couldn't find them on their own roster to know where they actually were. Now
  // groups by unique student FIRST, gathering every class link a student has, then asks
  // getUnifiedCheckInStatus for the one true status across all of them together.
  const refresh = useCallback(async () => {
    setLoading(true);
    const allClasses = await loadJSON("schoolClasses", [], true);
    const preschoolClasses = (allClasses || []).filter((c) => c.classType === "preschool" && !c.archived);
    const perClassRosters = await Promise.all(preschoolClasses.map(async (c) => ({
      classId: c.id, className: c.name, roster: await loadJSON(`class:${c.id}:roster`, [], true),
    })));

    const byStudentId = {};
    perClassRosters.forEach(({ classId, className, roster }) => {
      roster.forEach((s) => {
        if (!byStudentId[s.id]) byStudentId[s.id] = { id: s.id, name: s.name, parentEmail: s.parentEmail, parentPhone: s.parentPhone, links: [] };
        byStudentId[s.id].links.push({ classId, className });
      });
    });

    const uniqueStudents = await Promise.all(Object.values(byStudentId).map(async (s) => {
      const status = await getUnifiedCheckInStatus(s.id, s.links);
      return { ...s, classId: status.openEntry ? status.openEntry.classId : s.links[0].classId, className: s.links.map((l) => l.className).join(", "), checkIns: status.perClass.flatMap((c) => c.checkIns) };
    }));

    // Groups by shared parent email first, then phone, for students without an email on file —
    // anyone matching neither becomes their own single-student group.
    const groups = {};
    uniqueStudents.forEach((s) => {
      const key = s.parentEmail ? `e:${s.parentEmail.toLowerCase()}` : s.parentPhone ? `p:${s.parentPhone}` : `solo:${s.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    const grouped = Object.entries(groups).map(([key, students]) => ({ key, students: students.sort((a, b) => a.name.localeCompare(b.name)) }));
    grouped.sort((a, b) => a.students[0].name.localeCompare(b.students[0].name));
    setFamilies(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleTap = async (student, isIn) => {
    if (!isIn && wouldBeRepeatCheckIn(student.checkIns, date)) {
      setConfirmingRepeatFor(student.id);
      return;
    }
    const byLabel = loggedByName ? `Teacher: ${loggedByName}` : "Teacher";
    // student.classId here is already "whichever class is actually open, or the first one if
    // none is" — toggleUnifiedCheckIn re-derives the true open class itself regardless, this
    // is just the fallback for a brand new check-in.
    await toggleUnifiedCheckIn(student.id, student.links, student.classId, byLabel);
    await refresh();
    setConfirmingRepeatFor(null);
  };

  return (
    <div className="app-page-wide">
      <button onClick={() => navigate("attendance")} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">All Preschool Students</h1>
      <p className="text-xs text-stone-400 mb-4">Every preschool room on one page, grouped by family — built for dismissal, when one teacher is checking everyone out at once.</p>

      {loading && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
      {!loading && families.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No preschool students found.</p>}

      <div className="space-y-3">
        {families.map((fam) => (
          <div key={fam.key} className={`rounded-xl border-2 p-3 ${fam.students.length > 1 ? "bg-amber-50/40 border-amber-200" : "border-stone-200 bg-white"}`}>
            {fam.students.map((s) => {
              const todaysEntries = s.checkIns.filter((c) => c.date === date).sort((a, b) => (a.checkInTime < b.checkInTime ? -1 : 1));
              const openEntry = todaysEntries.find((c) => c.checkInTime && !c.checkOutTime);
              const isIn = Boolean(openEntry);
              const confirming = confirmingRepeatFor === s.id;
              return (
                <div key={s.id} className={`flex flex-wrap items-center justify-between gap-3 py-1.5 ${isIn ? "text-emerald-800" : ""}`}>
                  <div>
                    <span className="font-semibold text-stone-900 text-base block">{s.name}</span>
                    <span className="text-[11px] text-stone-400">{s.className}</span>
                    {todaysEntries.length === 0 ? (
                      <span className="block text-xs font-semibold text-stone-400">Not checked in yet today</span>
                    ) : (
                      <div className="mt-0.5">
                        {todaysEntries.map((e) => (
                          <p key={e.id} className={`text-xs font-semibold ${!e.checkOutTime ? "text-emerald-700" : "text-stone-500"}`}>
                            In {formatTime12h(e.checkInTime)}{e.checkOutTime ? ` — Out ${formatTime12h(e.checkOutTime)}` : " — still here"}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">Log another visit today?</span>
                      <button onClick={() => handleTap(s, false)} className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Yes, check in</button>
                      <button onClick={() => setConfirmingRepeatFor(null)} className="text-xs font-semibold px-3 py-2 rounded-lg border border-stone-300 text-stone-500">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => handleTap(s, isIn)}
                      className={`text-sm font-bold px-4 py-2.5 rounded-xl ${isIn ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                      {isIn ? "Check out" : "Check in"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// A narrow, read-only strip next to the dashboard tiles — just enough to see at a glance whether
// anything's planned for today, not a place to edit it. Editing the actual schedule still happens
// in Planner; tapping "Edit" here just jumps there.
function PreschoolScheduleSidebar({ periods, events, navigate }) {
  const hasAnything = periods.length > 0 || events.length > 0;
  return (
    <div className="w-24 md:w-36 shrink-0 bg-white border border-stone-200 rounded-2xl p-2 md:p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-2 text-center md:text-left">Today</p>
      {!hasAnything && (
        <p className="text-[10px] text-stone-400 text-center md:text-left leading-snug">Nothing planned</p>
      )}
      <div className="space-y-1.5">
        {periods.map((p) => {
          const st = TILE_STYLES[p.color] || TILE_STYLES.indigo;
          return (
            <div key={p.id} className={`border-l-2 ${st.tileBorder} pl-1.5`}>
              <p className="text-[9px] text-stone-400 leading-none mb-0.5">{formatTime12h(p.startTime)}</p>
              <p className={`text-[10px] font-semibold leading-snug ${st.labelText}`}>{p.label}</p>
            </div>
          );
        })}
        {events.map((e) => (
          <div key={e.id} className="border-l-2 border-amber-400 pl-1.5">
            <p className="text-[10px] font-semibold text-amber-800 leading-snug">{e.title}</p>
          </div>
        ))}
      </div>
      <button onClick={() => navigate("planner")} className="text-[10px] font-semibold text-teal-700 mt-3 block w-full text-center md:text-left">Edit</button>
    </div>
  );
}

// A custom, in-app camera — not a handoff to the device's own camera app via <input capture>,
// which is the app's OLD approach and has a hard, confirmed browser limitation: it only ever
// returns one photo per invocation, closing itself after each shot, with no way to take a second
// one without leaving the app and reopening it. That's fundamentally incompatible with "take
// several photos in one continuous session," which is the whole point of this redesign. Built on
// getUserMedia() + MediaRecorder instead — supported on every major browser including iOS Safari
// (since Safari 14.5) — the same underlying API this app's own voice-note recording already uses
// successfully, which is real evidence it holds up for this app's actual devices, not just in
// theory. Recording is capped at the same 30 seconds already used for video attachments elsewhere
// in the app — deliberately conservative, since long MediaRecorder sessions have documented crash
// risk on iOS Safari specifically, and 30s is comfortably inside the safe range.
//
// One honest, unavoidable limitation: a web app cannot silently write files into the device's own
// photo gallery — no browser exposes that capability to a website, for real security reasons (a
// site silently populating your camera roll would itself be a serious privacy problem). What's
// achievable, and what this offers, is a clearly-labeled, one-tap "Save to device" action per item
// or for the whole batch at once — a side option a teacher can take whenever suits them, not a
// gate that has to be resolved before anything else can happen.
function CameraCaptureView({ roster, classId, submitBlogPost, sendMessageToFamily, onDone }) {
  const [phase, setPhase] = useState("camera"); // "camera" | "gallery"
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [sessionItems, setSessionItems] = useState([]); // { id, blob, url, type: "photo"|"video" }
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set()); // populated once items exist; defaults to "all"
  const [savedIds, setSavedIds] = useState(new Set());
  const [caption, setCaption] = useState("");
  const [recipientMode, setRecipientMode] = useState("blog");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sent, setSent] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Requesting an explicit resolution here is what actually fixes photo/video quality — without
  // it, a bare { video: true } request lets the browser default to whatever it considers
  // reasonable for its most common use case, which is video calling, not photography. That
  // default is often far below what the camera hardware can actually do. "ideal" (not "exact") is
  // what makes this safe to request everywhere: it asks for the target and lets the browser
  // negotiate down to the closest resolution the actual camera and browser support, rather than
  // failing outright on a device that can't hit it exactly.
  // 1080p, not 4K: a real, reported pattern — the live preview struggling, this same recording
  // timer stuttering/falling behind, and general sluggishness elsewhere in the app — traced back
  // to exactly this. Decoding and rendering a continuous 4K stream in real time, then separately
  // re-encoding it during recording, is a genuinely heavy, sustained load that a classroom iPad
  // (older or mid-range hardware, not a flagship phone) can struggle to sustain, and a busy main
  // thread is exactly what makes a setInterval-driven timer like this one drift and stutter. 1080p
  // is still excellent quality for a classroom photo or video and asks a small fraction of the
  // decoding/encoding work of 4K.
  const startStream = async () => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera access was denied — check this site's camera permission in your browser settings and try again."
          : "Couldn't open the camera on this device."
      );
    }
  };

  useEffect(() => {
    if (phase === "camera") startStream();
    return () => { if (phase === "camera") stopStream(); };
  }, [phase, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopStream(); clearInterval(recordTimerRef.current); }, []); // full cleanup on unmount

  const addItem = (blob, type) => {
    const id = uid();
    const url = URL.createObjectURL(blob);
    setSessionItems((prev) => [...prev, { id, blob, url, type }]);
    setSelectedIds((prev) => new Set(prev).add(id)); // newly captured items start selected
  };

  // ImageCapture.takePhoto() is tried first — where it's available, it can pull a still at the
  // camera's own full photo resolution, which is often meaningfully higher than whatever
  // resolution the live video preview is actually streaming at (a camera sensor's still-photo
  // capability and its video-streaming capability are genuinely different numbers). It's
  // Chromium-only, though, with no Safari or Firefox support at all — grabbing a frame from the
  // video stream via canvas is what every browser can do, so that's the fallback, not a lesser
  // option reached only on error. Either path benefits from the higher-resolution stream now
  // being requested above, since the canvas fallback's quality ceiling is exactly whatever
  // resolution the video element itself is receiving.
  const takePhoto = async () => {
    if (navigator.vibrate) navigator.vibrate(15); // a light shutter-tap feel, matching a real camera
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (track && window.ImageCapture) {
      try {
        const imageCapture = new window.ImageCapture(track);
        const blob = await imageCapture.takePhoto();
        addItem(blob, "photo");
        return;
      } catch {
        // Falls through to the canvas path below — some devices/browsers advertise ImageCapture
        // but still fail on takePhoto() for a specific camera or track state.
      }
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (blob) addItem(blob, "photo"); }, "image/jpeg", 0.95);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    // Picks whatever this specific browser actually supports rather than assuming one mime type —
    // Safari and Chromium-based browsers don't agree on this, and asking for an unsupported type
    // throws immediately instead of falling back gracefully on its own.
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
    // videoBitsPerSecond explicitly set rather than left to the browser's own default — the
    // default a browser picks for MediaRecorder tends to be tuned for video calling (small,
    // fast-changing frames, tolerant of heavy compression) rather than the sharper, more detailed
    // footage an actual recorded clip benefits from. 8 Mbps is comfortably enough for a genuinely
    // sharp 1080p-to-4K clip at the 30-second cap already in place, without producing an
    // unreasonably large file for that short a recording.
    const recorder = new MediaRecorder(streamRef.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 5_000_000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      addItem(blob, "video");
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => {
        if (s + 1 >= MAX_VIDEO_SECONDS) { stopRecording(); return MAX_VIDEO_SECONDS; } // eslint-disable-line no-use-before-define
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const removeItem = (id) => {
    setSessionItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };
  const toggleSelected = (id) => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const finishSession = () => {
    stopStream();
    setPhase("gallery");
  };

  const saveOneToDevice = (item) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `${item.type === "video" ? "video" : "photo"}-${item.id}.${item.type === "video" ? (item.blob.type.includes("mp4") ? "mp4" : "webm") : "jpg"}`;
    a.click();
    setSavedIds((prev) => new Set(prev).add(item.id));
  };
  const saveAllSelectedToDevice = () => { sessionItems.filter((it) => selectedIds.has(it.id)).forEach(saveOneToDevice); };

  const toggleStudent = (id) => setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const send = async () => {
    const selected = sessionItems.filter((it) => selectedIds.has(it.id));
    if (selected.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      if (recipientMode === "blog") {
        const mediaItems = selected.map((it) => ({ id: it.id, file: it.blob, type: it.type }));
        await submitBlogPost(null, [{ id: uid(), text: caption, mediaItems }]);
      } else {
        const allFamilies = await fetchClassFamilies(classId);
        // Uploads every selected item once, then reuses those same URLs for every recipient — not
        // once per student — before this fix, sending 3 photos to 2 students meant 6 separate
        // messages arriving one after another; now it's exactly 2 messages, each carrying all 3
        // photos together, matching how the blog has always let one post hold several images.
        const attachments = [];
        for (const item of selected) {
          const url = item.type === "video"
            ? await uploadOneVideo(item.blob, `message-attachments/photo-quick-${classId}/${uid()}.webm`) // eslint-disable-line no-await-in-loop
            : await uploadOneImage(item.blob, `message-attachments/photo-quick-${classId}/${uid()}.jpg`); // eslint-disable-line no-await-in-loop
          attachments.push({ url, type: item.type });
        }
        for (const sid of selectedStudentIds) {
          const match = allFamilies.find((f) => (f.studentLinks || []).some((l) => l.studentId === sid && l.classId === classId));
          if (!match) continue; // eslint-disable-line no-continue
          // This specific guardian's own uid — not familyGroupId, which would silently misroute
          // to whichever guardian happens to be that shared group's "primary" instead of the one
          // actually matched here, the same class of bug the broadcast tool below this one had.
          await sendMessageToFamily(match.uid, caption, attachments); // eslint-disable-line no-await-in-loop
        }
      }
      setSent(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setSendError(describeUploadError(err));
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="app-page text-center py-16">
        <Check className="mx-auto text-emerald-600 mb-2" size={32} />
        <p className="text-sm font-semibold text-emerald-700">Sent!</p>
      </div>
    );
  }

  if (phase === "camera") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex-1 relative overflow-hidden">
          {cameraError ? (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <button onClick={startStream} className="text-sm font-semibold text-white bg-teal-700 rounded-lg px-4 py-2.5">Try again</button>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <button onClick={onDone} className="absolute top-4 left-4 text-white bg-black/50 rounded-full p-2"><X size={20} /></button>
          <button onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"><RefreshCw size={18} /></button>
          {recording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {recordSeconds}s / {MAX_VIDEO_SECONDS}s
            </div>
          )}
          {sessionItems.length > 0 && (
            <div className="absolute bottom-24 left-0 right-0 flex gap-1.5 px-4 overflow-x-auto no-scrollbar">
              {sessionItems.map((it) => (
                <div key={it.id} className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-white/70">
                  {it.type === "video" ? (
                    <video src={it.url} muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={it.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-black py-5 px-6 flex items-center justify-between">
          <p className="text-white/70 text-xs font-semibold w-14">{sessionItems.length > 0 ? `${sessionItems.length} taken` : ""}</p>
          <div className="flex items-center gap-5">
            <button onClick={takePhoto} disabled={!!cameraError || recording}
              className="w-16 h-16 rounded-full bg-white disabled:opacity-30 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-stone-800" />
            </button>
            <button onClick={recording ? stopRecording : startRecording} disabled={!!cameraError}
              className={`w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-30 ${recording ? "bg-red-600" : "bg-white/20 border-2 border-white"}`}>
              {recording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <div className="w-5 h-5 bg-red-500 rounded-full" />}
            </button>
          </div>
          <button onClick={finishSession} disabled={sessionItems.length === 0}
            className="w-14 text-right text-teal-400 text-sm font-bold disabled:opacity-30">Done</button>
        </div>
      </div>
    );
  }

  // Gallery / share phase — the camera has already been released at this point.
  const selectedCount = sessionItems.filter((it) => selectedIds.has(it.id)).length;
  return (
    <div className="app-page">
      <button onClick={() => setPhase("camera")} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back to camera</button>
      <p className="text-xs text-stone-400 mb-2">Tap to select or deselect — {selectedCount} of {sessionItems.length} selected.</p>
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {sessionItems.map((it) => {
          const selected = selectedIds.has(it.id);
          return (
            <div key={it.id} className="relative aspect-square rounded-lg overflow-hidden">
              <button onClick={() => toggleSelected(it.id)} className="w-full h-full block">
                {it.type === "video" ? (
                  <video src={it.url} muted className="w-full h-full object-cover" />
                ) : (
                  <img src={it.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className={`absolute inset-0 ${selected ? "ring-4 ring-inset ring-teal-500" : "bg-black/40"}`} />
                <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${selected ? "bg-teal-600" : "bg-black/30"}`}>
                  {selected && <Check size={12} className="text-white" />}
                </div>
              </button>
              <button onClick={() => removeItem(it.id)} className="absolute bottom-1.5 left-1.5 bg-black/60 text-white rounded-full p-1"><X size={11} /></button>
            </div>
          );
        })}
      </div>

      <button onClick={saveAllSelectedToDevice} disabled={selectedCount === 0}
        className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-teal-700 border border-teal-300 rounded-xl py-2 mb-3 hover:bg-teal-50 disabled:opacity-40">
        <Download size={15} /> Save {selectedCount > 1 ? "selected to device" : "to device"} — optional, doesn't affect sending
      </button>

      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a few words (optional)" rows={2}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />
      <div className="flex gap-1 mb-3 bg-stone-100 rounded-lg p-1">
        <button onClick={() => setRecipientMode("blog")} className={`flex-1 rounded-md py-2 text-xs font-semibold ${recipientMode === "blog" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Post to Blog</button>
        <button onClick={() => setRecipientMode("students")} className={`flex-1 rounded-md py-2 text-xs font-semibold ${recipientMode === "students" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Send to specific students</button>
      </div>
      {recipientMode === "students" && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {roster.map((s) => (
            <button key={s.id} onClick={() => toggleStudent(s.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${selectedStudentIds.includes(s.id) ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      {sendError && <p className="text-xs text-rose-600 mb-3">{sendError}</p>}
      <button onClick={send} disabled={sending || selectedCount === 0 || (recipientMode === "students" && selectedStudentIds.length === 0)}
        className="w-full bg-teal-700 text-white rounded-xl py-3 text-sm font-bold hover:bg-teal-800 disabled:opacity-40 mb-2">
        {sending ? "Sending…" : `Send ${selectedCount > 1 ? `(${selectedCount})` : ""}`}
      </button>
      <button onClick={onDone} className="block mx-auto text-xs font-semibold text-stone-500">
        Done without sending{savedIds.size > 0 ? ` — ${savedIds.size} saved to device` : ""}
      </button>
    </div>
  );
}

// Teacher-facing equivalent of ChildDailyLogView, for exactly the gap that view exists to close
// on the parent side — but this one reuses data the teacher's own class already has loaded
// (studentData, incidents, photos) rather than fetching separately, since a teacher browsing
// their own class's history doesn't need a standalone fetch the way a parent (outside any class's
// own context) does. Same card layout and date navigation, so what a teacher sees here and what a
// parent sees on their own end are genuinely the same view of the same data, not two separately
// built, potentially inconsistent ones.
function PreschoolStudentDetailView({ student, studentData, incidents, photos, onBack, onLogIncident }) {
  const [date, setDate] = useState(todayISO());
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const data = studentData[student.id] || emptyStudentData();

  const shiftDate = (deltaDays) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    setDate(d.toISOString().slice(0, 10));
  };

  const mood = (data.mood || []).find((m) => m.date === date);
  const meals = (data.meals || []).filter((m) => m.date === date);
  const naps = (data.naps || []).filter((n) => n.date === date);
  const diapers = (data.diapers || []).filter((d) => d.date === date).sort((a, b) => (a.time < b.time ? -1 : 1));
  const bathroomTrips = (data.bathroom || []).filter((b) => b.date === date).sort((a, b) => (a.time < b.time ? -1 : 1));
  const checkIns = (data.checkIns || []).filter((c) => c.date === date).sort((a, b) => (a.checkInTime < b.checkInTime ? -1 : 1));
  const dayIncidents = (incidents || []).filter((i) => i.date === date && (i.studentIds || []).includes(student.id));
  const dayPhotos = (photos || []).filter((p) => p.date === date && (p.studentIds || []).includes(student.id));

  const hasAnything = Boolean(mood) || meals.length > 0 || naps.length > 0 || diapers.length > 0 || bathroomTrips.length > 0 || checkIns.length > 0 || dayIncidents.length > 0 || dayPhotos.length > 0;

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
      <div className="flex items-center justify-between mb-1">
        <button onClick={onBack} className="flex items-center text-stone-500 text-sm hover:text-stone-800"><ChevronLeft size={16} /> Students</button>
        {onLogIncident && (
          <button onClick={() => onLogIncident(student.id)} className="text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">
            Log incident
          </button>
        )}
      </div>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-4">{student.name}</h1>

      <div className="inline-flex items-center gap-0.5 mb-5">
        <button onClick={() => shiftDate(-1)} className="text-stone-400 hover:text-teal-700 p-3 -m-1 rounded-full hover:bg-stone-100" aria-label="Previous day"><ChevronLeft size={16} /></button>
        <div className="relative py-3">
          <span className="text-sm font-semibold text-stone-800 px-1.5 select-none whitespace-nowrap">{friendlyDateLabel(date)}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()}
            aria-label="Choose a date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <button onClick={() => shiftDate(1)} disabled={date >= todayISO()} className="text-stone-400 hover:text-teal-700 p-3 -m-1 rounded-full hover:bg-stone-100 disabled:opacity-30" aria-label="Next day"><ChevronRight size={16} /></button>
      </div>

      {!hasAnything && (
        <p className="text-sm text-stone-400 text-center py-8">Nothing logged for this day.</p>
      )}

      {hasAnything && (
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
          {dayIncidents.map((inc) => (
            <Card key={inc.id} color="cyan" title="Health / incident note" icon={HeartPulse}>
              {inc.description}
              {(inc.media || []).length > 0 && (
                <div className={`grid gap-1.5 mt-2 ${inc.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {inc.media.map((m, i) => (
                    <button key={i} onClick={() => setViewingPhoto({ url: m.url, caption: inc.description, type: m.type })}
                      className="relative aspect-square rounded-lg overflow-hidden bg-white">
                      {m.type === "video" ? (
                        <video src={m.url} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {dayPhotos.length > 0 && (
            <Card color="amber" title="Photos" icon={Camera}>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {dayPhotos.map((p) => (
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

// Simple, tappable roster — the entry point into PreschoolStudentDetailView. Deliberately its own
// small screen rather than folding "tap a name for history" into an existing tile (attendance,
// daily log, etc.) — those already have their own primary tap action, and overloading a second
// meaning onto the same tap is exactly the kind of ambiguity worth avoiding after everything else
// found this session.
function PreschoolStudentListView({ roster, onSelectStudent, onBack }) {
  return (
    <div className="app-page">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-2xl font-bold text-stone-900 mb-1">Students</h1>
      <p className="text-xs text-stone-400 mb-4">Tap a student to see their history — any day, any category.</p>
      <div className="space-y-2">
        {[...roster].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
          <button key={s.id} onClick={() => onSelectStudent(s.id)}
            className="w-full flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3 text-left hover:border-teal-300">
            <span className="font-semibold text-stone-800">{s.name}</span>
            <ChevronRight size={16} className="text-stone-300" />
          </button>
        ))}
        {roster.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No students in this class yet.</p>}
      </div>
    </div>
  );
}

function PreschoolDashboardView({ roster, studentData, incidents, photos, config, persistConfig, plannerDays, plannerEvents, setMood, setMealBulk, setNapBulk, startNapBulk, endNapBulk, logDiaperBulk, logDiaperBulkWithDefaults, removeDiaperLog, logBathroomBulk, removeBathroomLog, uploadClassPhoto, openDetail, openIncidentForm, onLogPreschoolIncident, classId, submitBlogPost, sendMessageToFamily, navigate }) {
  const [screen, setScreenRaw] = useState(null); // null = dashboard grid
  const [selectedStudentId, setSelectedStudentId] = useState(null); // for screen === "students" only
  // Pushes a real history entry for every preschool sub-screen — Diapers, Snack, a health
  // incident form, and so on. This was the actual gap behind "Back sometimes leaves the class
  // entirely": ClassApp's own top-level view already goes through navigateView and correctly
  // tracks history, but this screen state is local to the preschool dashboard specifically, and
  // was never wired into browser history at all — every one of the calls below used to just be a
  // plain setScreen(...), invisible to the browser's own back button exactly the same way the
  // elementary side's sub-screens were before that same fix was applied there.
  const navigateScreen = (newScreen) => {
    setScreenRaw(newScreen);
    const url = new URL(window.location.href);
    if (newScreen == null) url.searchParams.delete("screen");
    else url.searchParams.set("screen", newScreen);
    window.history.pushState({ screen: newScreen }, "", url);
  };
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setScreenRaw(params.get("screen") || null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const openCameraCapture = () => navigateScreen("camera");
  const [date] = useState(todayISO());
  // Students not checked in today shouldn't be swept into a bulk "everyone ate lunch" action, or
  // logged for at all — a student who never came in shouldn't end up with a meal or nap record.
  const checkedInIds = new Set(roster.filter((s) => isCheckedInNow(studentData[s.id]?.checkIns, date)).map((s) => s.id));

  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const selectedDayType = plannerDays?.[date]?.dayType ? dayTypeMap[plannerDays[date].dayType] : null;
  const todaysPeriods = (getScheduleForDate(date, selectedDayType, config, plannerDays) || []).slice().sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const todaysEvents = (plannerEvents || []).filter((e) => e.date === date);

  const loggedCountFor = (tileId) => {
    if (tileId === "mood") return roster.filter((s) => (studentData[s.id]?.mood || []).some((m) => m.date === date)).length;
    if (tileId === "nap") return roster.filter((s) => (studentData[s.id]?.naps || []).some((n) => n.date === date)).length;
    const tile = PRESCHOOL_TILES.find((t) => t.id === tileId);
    if (tile?.mealType) return roster.filter((s) => (studentData[s.id]?.meals || []).some((m) => m.date === date && m.mealType === tile.mealType)).length;
    if (tileId === "diapers") return roster.filter((s) => (studentData[s.id]?.diapers || []).some((d) => d.date === date)).length;
    if (tileId === "bathroom") return roster.filter((s) => (studentData[s.id]?.bathroom || []).some((b) => b.date === date)).length;
    return 0;
  };

  if (screen === null) {
    return (
      <div className="app-page-wide">
        <Header navigate={navigate} />
        <MainTabs active="daily-log" navigate={navigate} />
        <div className="flex gap-3 items-start">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 min-w-0">
            {PRESCHOOL_TILES.filter((tile) => config.preschool?.tilesEnabled?.[tile.id] !== false).map((tile) => {
              const Icon = tile.icon;
              const st = TILE_STYLES[tile.color];
              const logged = tile.special ? null : loggedCountFor(tile.id);
              const handleTap = () => {
                if (tile.special === "camera") {
                  openCameraCapture();
                } else {
                  navigateScreen(tile.id);
                }
              };
              return (
                <button key={tile.id} onClick={handleTap}
                  className={`hover-lift flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-6 px-2 ${st.tileBg} ${st.tileBorder} ${st.tileBorderHover}`}>
                  <Icon size={32} className={st.iconText} />
                  <span className={`text-sm font-bold text-center ${st.labelText}`}>{tile.label}</span>
                  {logged !== null && checkedInIds.size > 0 && (
                    <span className={`text-[10px] font-semibold ${st.countText}`}>{logged} of {checkedInIds.size}</span>
                  )}
                </button>
              );
            })}
          </div>
          <PreschoolScheduleSidebar periods={todaysPeriods} events={todaysEvents} navigate={navigate} />
        </div>
      </div>
    );
  }

  const tile = PRESCHOOL_TILES.find((t) => t.id === screen);

  if (tile?.mealType) {
    return <MealBulkScreen tile={tile} date={date} roster={roster} studentData={studentData} checkedInIds={checkedInIds} setMealBulk={setMealBulk} config={config} persistConfig={persistConfig} onBack={() => navigateScreen(null)} />;
  }
  if (screen === "nap") {
    return <NapBulkScreen date={date} roster={roster} studentData={studentData} checkedInIds={checkedInIds} startNapBulk={startNapBulk} endNapBulk={endNapBulk} onBack={() => navigateScreen(null)} />;
  }
  if (screen === "mood") {
    return <MoodScreen date={date} roster={roster} studentData={studentData} checkedInIds={checkedInIds} setMood={setMood} onBack={() => navigateScreen(null)} />;
  }
  if (screen === "diapers") {
    return <DiaperBulkScreen tile={tile} date={date} roster={roster} studentData={studentData} checkedInIds={checkedInIds} logDiaperBulkWithDefaults={logDiaperBulkWithDefaults} onBack={() => navigateScreen(null)} />;
  }
  if (screen === "bathroom") {
    return <TapLogScreen tile={tile} date={date} roster={roster} studentData={studentData} checkedInIds={checkedInIds} dataKey="bathroom" typeOptions={BATHROOM_TRIP_TYPES}
      logBulk={logBathroomBulk} removeLog={removeBathroomLog} onBack={() => navigateScreen(null)} />;
  }
  if (screen === "camera") {
    return <CameraCaptureView roster={roster} classId={classId} submitBlogPost={submitBlogPost} sendMessageToFamily={sendMessageToFamily} onDone={() => navigateScreen(null)} />;
  }
  if (screen === "health-incident" || screen === "incident") {
    return (
      <PreschoolIncidentForm variant={screen === "health-incident" ? "health" : "incident"} roster={roster} config={config}
        onCancel={() => navigateScreen(null)}
        onSave={async (entry) => {
          await onLogPreschoolIncident(entry);
          navigateScreen(null);
        }} />
    );
  }
  if (screen === "students") {
    if (selectedStudentId) {
      const student = roster.find((s) => s.id === selectedStudentId);
      if (!student) { setSelectedStudentId(null); return null; }
      return (
        <PreschoolStudentDetailView student={student} studentData={studentData} incidents={incidents} photos={photos}
          onBack={() => setSelectedStudentId(null)}
          onLogIncident={(studentId) => openIncidentForm(studentId, "daily-log")} />
      );
    }
    return <PreschoolStudentListView roster={roster} onSelectStudent={setSelectedStudentId} onBack={() => navigateScreen(null)} />;
  }
  return null;
}

function PreschoolScreenHeader({ tile, title, onBack }) {
  const Icon = tile?.icon;
  const st = tile ? TILE_STYLES[tile.color] : null;
  return (
    <div className="flex items-center gap-2 mb-5">
      <button onClick={onBack} className="text-stone-500 hover:text-stone-800 p-1"><ChevronLeft size={22} /></button>
      {Icon && <span className={`w-9 h-9 rounded-full flex items-center justify-center ${st.iconBg}`}><Icon size={18} className={st.iconText} /></span>}
      <h1 className="display-font text-xl font-bold text-stone-900">{title}</h1>
    </div>
  );
}

// Meals — the one category where "everyone did the same thing" is a safe default. Every student
// starts on "All"; tapping a row reveals the other options right there so an exception takes one
// tap, not a trip to a separate screen.
function MealBulkScreen({ tile, date, roster, studentData, checkedInIds, setMealBulk, config, persistConfig, onBack }) {
  const st = TILE_STYLES[tile.color];
  const checkedInRoster = roster.filter((s) => checkedInIds.has(s.id));
  const notInRoster = roster.filter((s) => !checkedInIds.has(s.id));

  const weekday = weekdayKeyForDate(date);
  const weekdayLabel = MEAL_MENU_WEEKDAY_LABELS[weekday] || "today";
  const menuItems = mealMenuItemsFor(config, tile.mealType, date);
  const hasMenu = menuItems.length > 0;

  // studentId -> { itemName: amountId }. Each item gets its own full amount scale (some
  // schnitzel, all the rice, none of the broccoli) rather than a plain yes/no per item — every
  // item defaults to "all", matching the same "everyone starts having eaten everything" default
  // used everywhere else. Re-initializes whenever the configured item list itself changes — most
  // simply, right after an on-the-spot menu edit — so a newly added item defaults correctly
  // rather than silently missing from students already expanded before the edit.
  const [itemSelections, setItemSelections] = useState(() =>
    Object.fromEntries(checkedInRoster.map((s) => [s.id, Object.fromEntries(menuItems.map((item) => [item, "all"]))]))
  );
  useEffect(() => {
    setItemSelections(Object.fromEntries(checkedInRoster.map((s) => [s.id, Object.fromEntries(menuItems.map((item) => [item, "all"]))])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(menuItems)]);

  // Fallback amount-scale state, used only when hasMenu is false.
  const [amounts, setAmounts] = useState(() => Object.fromEntries(checkedInRoster.map((s) => [s.id, "all"])));
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [saved, setSaved] = useState(false);

  const [editingMenu, setEditingMenu] = useState(false);
  const [menuDraft, setMenuDraft] = useState([]);
  const openMenuEditor = () => { setMenuDraft(menuItems.length ? [...menuItems] : [""]); setEditingMenu(true); };
  const saveMenu = () => {
    const cleaned = menuDraft.map((i) => i.trim()).filter(Boolean);
    const nextMealMenus = {
      ...(config.preschool?.mealMenus || {}),
      [tile.mealType]: { ...(config.preschool?.mealMenus?.[tile.mealType] || {}), [weekday]: cleaned },
    };
    persistConfig({ ...config, preschool: { ...config.preschool, mealMenus: nextMealMenus } });
    setEditingMenu(false);
  };

  const setItemAmount = (studentId, item, amountId) => {
    setItemSelections((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [item]: amountId } }));
  };

  // A simple overall summary derived from the per-item amounts, saved alongside the specific
  // items so anything already reading the plain amount field — the parent-facing daily log, for
  // one — keeps working exactly as before without needing to know about specific items at all.
  // All items matching → that shared amount; anything mixed → "some", as a reasonable middle
  // ground between "ate everything" and "ate nothing."
  const deriveAmount = (perItem) => {
    const values = Object.values(perItem);
    if (values.length === 0) return "all";
    const allSame = values.every((v) => v === values[0]);
    return allSame ? values[0] : "some";
  };

  const submit = () => {
    if (hasMenu) {
      const submittedAmounts = {};
      const submittedItems = {};
      checkedInRoster.forEach((s) => {
        const perItem = itemSelections[s.id] || {};
        submittedAmounts[s.id] = deriveAmount(perItem);
        submittedItems[s.id] = perItem;
      });
      setMealBulk(date, tile.mealType, submittedAmounts, notes, submittedItems);
    } else {
      setMealBulk(date, tile.mealType, amounts, notes);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-page">
      <PreschoolScreenHeader tile={tile} title={tile.label} onBack={onBack} />

      <div className="bg-white border border-stone-200 rounded-xl p-3 mb-4">
        {!editingMenu ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">{weekdayLabel}'s menu</p>
              <button onClick={openMenuEditor} className="text-xs font-semibold text-teal-700">{hasMenu ? "Edit" : "Set up"}</button>
            </div>
            {hasMenu ? (
              <p className="text-sm text-stone-700">{menuItems.join(", ")}</p>
            ) : (
              <p className="text-xs text-stone-400">No menu set for {weekdayLabel} yet — using the general amount scale below instead.</p>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Edit {weekdayLabel}'s menu</p>
            <p className="text-[10px] text-stone-400 mb-2">Changes apply to every {weekdayLabel} going forward — handy for a one-off substitution today too, just remember to change it back.</p>
            <div className="space-y-1.5 mb-2">
              {menuDraft.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input value={item} onChange={(e) => setMenuDraft((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))}
                    placeholder="Item name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                  <button onClick={() => setMenuDraft((prev) => prev.filter((_, xi) => xi !== i))} className="text-stone-400 hover:text-rose-600"><X size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setMenuDraft((prev) => [...prev, ""])} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-3"><Plus size={12} /> Add item</button>
            <div className="flex gap-2">
              <button onClick={() => setEditingMenu(false)} className="flex-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg py-2">Cancel</button>
              <button onClick={saveMenu} className="flex-1 text-xs font-semibold text-white bg-teal-700 rounded-lg py-2">Save menu</button>
            </div>
          </div>
        )}
      </div>

      {!editingMenu && (
        <>
          <p className="text-xs text-stone-400 mb-4">
            {hasMenu ? "Everyone starts marked as having eaten everything — tap a name to change just that student." : "Everyone starts on \"All\" — tap a name to change just that student."}
          </p>
          <div className="space-y-2 mb-5">
            {checkedInRoster.map((s) => {
              const isOpen = expanded === s.id;
              if (hasMenu) {
                const perItem = itemSelections[s.id] || {};
                const values = Object.values(perItem);
                const allAll = values.length > 0 && values.every((v) => v === "all");
                const summaryLabel = allAll ? "All" : (MEAL_AMOUNTS.find((a) => a.id === deriveAmount(perItem))?.label || "Mixed");
                return (
                  <div key={s.id} className={`rounded-xl border ${allAll ? "border-stone-200 bg-white" : st.rowActive}`}>
                    <button onClick={() => setExpanded(isOpen ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3">
                      <span className="font-semibold text-stone-800">{s.name}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${st.solid}`}>{summaryLabel}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 space-y-2.5">
                        {menuItems.map((item) => (
                          <div key={item}>
                            <p className="text-xs font-semibold text-stone-600 mb-1">{item}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {MEAL_AMOUNTS.map((a) => (
                                <button key={a.id} onClick={() => setItemAmount(s.id, item, a.id)}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${perItem[item] === a.id ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300"}`}>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <InlineNoteField value={notes[s.id]} onChange={(v) => setNotes((prev) => ({ ...prev, [s.id]: v }))} />
                      </div>
                    )}
                  </div>
                );
              }
              const current = MEAL_AMOUNTS.find((a) => a.id === amounts[s.id]) || MEAL_AMOUNTS[0];
              return (
                <div key={s.id} className={`rounded-xl border ${amounts[s.id] === "all" ? "border-stone-200 bg-white" : st.rowActive}`}>
                  <button onClick={() => setExpanded(isOpen ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-stone-800">{s.name}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${st.solid}`}>{current.label}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {MEAL_AMOUNTS.map((a) => (
                          <button key={a.id} onClick={() => { setAmounts((prev) => ({ ...prev, [s.id]: a.id })); setExpanded(null); }}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${amounts[s.id] === a.id ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300"}`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                      <InlineNoteField value={notes[s.id]} onChange={(v) => setNotes((prev) => ({ ...prev, [s.id]: v }))} />
                    </div>
                  )}
                </div>
              );
            })}
            {notInRoster.map((s) => (
              <div key={s.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between">
                <span className="font-semibold text-stone-400">{s.name}</span>
                <span className="text-xs text-stone-400">Not checked in today</span>
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={checkedInRoster.length === 0} className={`w-full text-white rounded-xl py-4 text-base font-bold disabled:opacity-40 ${st.solid} ${st.solidHover}`}>
            {saved ? "Logged ✓" : `Log ${tile.label} for ${checkedInRoster.length} students`}
          </button>
        </>
      )}
    </div>
  );
}


function DiaperBulkScreen({ tile, date, roster, studentData, checkedInIds, logDiaperBulkWithDefaults, onBack }) {
  const st = TILE_STYLES[tile.color];
  const checkedInRoster = roster.filter((s) => checkedInIds.has(s.id));
  const notInRoster = roster.filter((s) => !checkedInIds.has(s.id));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [types, setTypes] = useState(() => Object.fromEntries(checkedInRoster.map((s) => [s.id, DIAPER_TYPES[0].id])));
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [saved, setSaved] = useState(false);

  const submit = () => {
    logDiaperBulkWithDefaults(date, time, types, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-page">
      <PreschoolScreenHeader tile={tile} title={tile.label} onBack={onBack} />
      <label className="block text-xs font-medium text-stone-500 mb-1">Time</label>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" />
      <p className="text-xs text-stone-400 mb-4">Everyone starts on "{DIAPER_TYPES[0].label}" — tap a name to change just that student.</p>
      <div className="space-y-2 mb-5">
        {checkedInRoster.map((s) => {
          const isOpen = expanded === s.id;
          const current = DIAPER_TYPES.find((d) => d.id === types[s.id]) || DIAPER_TYPES[0];
          return (
            <div key={s.id} className={`rounded-xl border ${types[s.id] === DIAPER_TYPES[0].id ? "border-stone-200 bg-white" : st.rowActive}`}>
              <button onClick={() => setExpanded(isOpen ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-stone-800">{s.name}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${st.solid}`}>{current.label}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {DIAPER_TYPES.map((d) => (
                      <button key={d.id} onClick={() => { setTypes((prev) => ({ ...prev, [s.id]: d.id })); setExpanded(null); }}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${types[s.id] === d.id ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <InlineNoteField value={notes[s.id]} onChange={(v) => setNotes((prev) => ({ ...prev, [s.id]: v }))} />
                </div>
              )}
            </div>
          );
        })}
        {notInRoster.map((s) => (
          <div key={s.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-stone-400">{s.name}</span>
            <span className="text-xs text-stone-400">Not checked in today</span>
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={checkedInRoster.length === 0} className={`w-full text-white rounded-xl py-4 text-base font-bold disabled:opacity-40 ${st.solid} ${st.solidHover}`}>
        {saved ? "Logged ✓" : `Log ${tile.label} for ${checkedInRoster.length} students`}
      </button>
    </div>
  );
}

// Nap — most rooms share one nap block, so that's the default for everyone; the teacher only
// touches a student who didn't nap or napped on a different schedule.
// Redesigned around two separate moments, not one — Start Nap records just when a child goes
// down; End Nap, a genuinely separate action reachable any time later, fills in when they woke.
// The underlying entry sits "in progress" (a start with no end yet) in between, which is what
// makes different children able to sleep and wake at their own real times rather than the whole
// room being forced through one shared start-to-finish window, while still keeping the same
// one-tap-for-everyone efficiency this screen has always had for the common case.
function NapBulkScreen({ date, roster, studentData, checkedInIds, startNapBulk, endNapBulk, onBack }) {
  const tile = PRESCHOOL_TILES.find((t) => t.id === "nap");
  const st = TILE_STYLES[tile.color];
  const checkedInRoster = roster.filter((s) => checkedInIds.has(s.id));
  const notInRoster = roster.filter((s) => !checkedInIds.has(s.id));

  const napFor = (studentId) => (studentData[studentId]?.naps || []).find((n) => n.date === date && !n.skipped);
  const statusFor = (studentId) => {
    const nap = napFor(studentId);
    if (!nap) return "not-started";
    if (nap.start && !nap.end) return "in-progress";
    return "done";
  };

  const [mode, setMode] = useState("start"); // "start" | "end"
  const [sharedTime, setSharedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [excluded, setExcluded] = useState({});
  const [customTimes, setCustomTimes] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [saved, setSaved] = useState(false);

  // Leftover exclusions, custom times, or notes from one mode have no business silently carrying
  // into the other — switching tabs starts each one fresh.
  useEffect(() => { setExcluded({}); setCustomTimes({}); setNotes({}); setExpanded(null); }, [mode]);

  const notStarted = checkedInRoster.filter((s) => statusFor(s.id) === "not-started");
  const inProgress = checkedInRoster.filter((s) => statusFor(s.id) === "in-progress");
  const done = checkedInRoster.filter((s) => statusFor(s.id) === "done");
  const eligible = mode === "start" ? notStarted : inProgress;

  const submit = () => {
    const studentTimes = {};
    eligible.forEach((s) => {
      if (excluded[s.id]) { if (mode === "start") studentTimes[s.id] = null; return; }
      studentTimes[s.id] = customTimes[s.id] || sharedTime;
    });
    if (mode === "start") startNapBulk(date, studentTimes, notes);
    else endNapBulk(date, studentTimes, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-page">
      <PreschoolScreenHeader tile={tile} title="Nap" onBack={onBack} />

      <div className="flex gap-1.5 mb-4 bg-stone-100 rounded-xl p-1">
        <button onClick={() => setMode("start")} className={`flex-1 text-sm font-semibold py-2 rounded-lg ${mode === "start" ? "bg-white text-indigo-700 shadow-sm" : "text-stone-500"}`}>
          Start Nap{notStarted.length > 0 ? ` (${notStarted.length})` : ""}
        </button>
        <button onClick={() => setMode("end")} className={`flex-1 text-sm font-semibold py-2 rounded-lg ${mode === "end" ? "bg-white text-indigo-700 shadow-sm" : "text-stone-500"}`}>
          End Nap{inProgress.length > 0 ? ` (${inProgress.length})` : ""}
        </button>
      </div>

      {eligible.length === 0 ? (
        <p className="text-sm text-stone-400 bg-stone-50 rounded-xl p-4 text-center mb-5">
          {mode === "start" ? "Everyone checked in has already started or finished a nap today." : "No one is currently napping."}
        </p>
      ) : (
        <>
          <p className="text-xs text-stone-400 mb-2">Shared {mode === "start" ? "start" : "wake-up"} time — applies to everyone unless you change a student below.</p>
          <div className="flex items-center gap-2 mb-5 bg-white border border-stone-200 rounded-xl p-3">
            <input type="time" value={sharedTime} onChange={(e) => setSharedTime(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="space-y-2 mb-5">
            {eligible.map((s) => {
              const isOpen = expanded === s.id;
              const isExcluded = Boolean(excluded[s.id]);
              const custom = customTimes[s.id];
              const nap = napFor(s.id);
              return (
                <div key={s.id} className={`rounded-xl border ${isExcluded ? "border-stone-200 bg-stone-50" : custom ? st.rowActive : "border-stone-200 bg-white"}`}>
                  <button onClick={() => setExpanded(isOpen ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3">
                    <span className={`font-semibold ${isExcluded ? "text-stone-400 line-through" : "text-stone-800"}`}>{s.name}</span>
                    <span className="text-xs text-stone-500">
                      {isExcluded ? (mode === "start" ? "Didn't nap" : "Still sleeping") : custom || sharedTime}
                      {mode === "end" && nap?.start ? ` (started ${nap.start})` : ""}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => { setExcluded((prev) => ({ ...prev, [s.id]: !prev[s.id] })); setCustomTimes((prev) => ({ ...prev, [s.id]: null })); }}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${isExcluded ? "bg-stone-600 text-white border-stone-600" : "text-stone-600 border-stone-300"}`}>
                          {mode === "start" ? "Didn't nap" : "Still sleeping"}
                        </button>
                        {!isExcluded && (
                          <input type="time" value={custom || sharedTime} onChange={(e) => setCustomTimes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="rounded-lg border border-stone-300 px-2 py-1 text-xs" />
                        )}
                      </div>
                      <InlineNoteField value={notes[s.id]} onChange={(v) => setNotes((prev) => ({ ...prev, [s.id]: v }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {done.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400 mb-1.5">Finished today</p>
          <div className="space-y-1.5">
            {done.map((s) => {
              const nap = napFor(s.id);
              const mins = nap?.start && nap?.end ? napDurationMinutes(nap.start, nap.end) : null;
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-2 rounded-xl bg-stone-50 text-xs">
                  <span className="font-semibold text-stone-600">{s.name}</span>
                  <span className="text-stone-400">{nap.start}–{nap.end}{mins != null ? ` · ${formatDurationMinutes(mins)}` : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {notInRoster.map((s) => (
        <div key={s.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between mb-2">
          <span className="font-semibold text-stone-400">{s.name}</span>
          <span className="text-xs text-stone-400">Not checked in today</span>
        </div>
      ))}

      {eligible.length > 0 && (() => {
        // Start mode still writes a record for every excluded student too (a "didn't nap" entry
        // is a real, intentional result, not a no-op) — but End mode's excluded students ("still
        // sleeping") are left completely untouched, not written at all, so the count show here
        // needs to actually subtract them or the button would overstate how many students this
        // action is really about to affect.
        const actingOn = mode === "start" ? eligible.length : eligible.filter((s) => !excluded[s.id]).length;
        return (
          <button onClick={submit} disabled={actingOn === 0} className={`w-full text-white rounded-xl py-4 text-base font-bold disabled:opacity-40 ${st.solid} ${st.solidHover}`}>
            {saved ? "Logged ✓" : mode === "start" ? `Start nap for ${actingOn} students` : `End nap for ${actingOn} students`}
          </button>
        );
      })()}
    </div>
  );
}


// Mood — deliberately not defaulted. Assuming a mood is a guess, not a time-saver, so this stays a
// plain tap-each-student-you-have-something-to-say-about screen.
function MoodScreen({ date, roster, studentData, checkedInIds, setMood, onBack }) {
  const tile = PRESCHOOL_TILES.find((t) => t.id === "mood");
  const st = TILE_STYLES[tile.color];
  // Local note drafts, keyed by student — kept independent of the saved mood value itself so
  // either one (tapping a mood pill, or typing a note) can be set first without the other getting
  // lost; each action re-saves using whatever's currently known for both.
  const [noteDrafts, setNoteDrafts] = useState({});
  return (
    <div className="app-page">
      <PreschoolScreenHeader tile={tile} title="Mood" onBack={onBack} />
      <div className="space-y-2">
        {roster.map((s) => {
          const isIn = checkedInIds.has(s.id);
          const today = (studentData[s.id]?.mood || []).find((m) => m.date === date);
          if (!isIn) {
            return (
              <div key={s.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between">
                <span className="font-semibold text-stone-400">{s.name}</span>
                <span className="text-xs text-stone-400">Not checked in today</span>
              </div>
            );
          }
          const currentNote = noteDrafts[s.id] ?? today?.note ?? "";
          return (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl p-3">
              <p className="font-semibold text-stone-800 mb-2">{s.name}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESCHOOL_MOOD_OPTIONS.map((m) => (
                  <button key={m.id} onClick={() => setMood(s.id, date, m.id, currentNote)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${today?.mood === m.id ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300"}`}>
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
              <InlineNoteField value={currentNote} onChange={(v) => setNoteDrafts((prev) => ({ ...prev, [s.id]: v }))}
                onBlur={() => { if (currentNote !== (today?.note || "")) setMood(s.id, date, today?.mood, currentNote); }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Diapers and bathroom trips — genuinely not a whole-room action, so nothing is pre-selected.
// Teacher picks a time and type once, taps whichever kids it applies to right now, logs them all
// in one action, and can keep coming back to this same screen through the day since it's append-
// only — today's entries stay visible below so anything can be reviewed or undone.
// Tap-to-select who's actually in the photo (never a default-everyone tile — a photo is of
// specific kids, not the whole room by assumption), then pick or take the picture itself. The
// actual upload happens after the file is chosen, not before, so there's nothing to clean up if
// a teacher picks students and then changes their mind about the photo.
const BLOG_REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "smile", emoji: "😊" },
  { key: "thumbsup", emoji: "👍" },
  { key: "clap", emoji: "👏" },
  { key: "laugh", emoji: "😂" },
  { key: "wow", emoji: "😮" },
  { key: "pray", emoji: "🙏" },
];

// One reaction per person, chosen from a picker instead of a permanently-visible row of buttons
// — a short tap toggles the most common one (heart) on/off, a long-press (or, for anyone not on
// a touch device, a regular click works too — never gate a feature behind a gesture some input
// types can't perform) opens the full set to pick something more specific.
// Takes a plain reactions object and an onReact(emoji) callback rather than a post directly — the
// caller decides what's actually being reacted to (the whole post, or one specific block within
// it), so this same component works for both without needing to know which one it's rendering
// for.
// WhatsApp's actual pattern, confirmed by research before building this: long-press ANYWHERE on
// the message/content itself opens the picker — there is no separate "React" button to find and
// tap. The picker floats just above the content. The resulting badge itself is deliberately NOT
// rendered here — it's rendered by the caller instead (see ReactionBadge below), specifically so
// it can sit outside this content's own clipped boundary and overlap the true bottom edge of
// whatever visual container it belongs to (the whole post card, not just this one block within
// it) — a badge rendered as this component's own child could never escape past a parent that
// clips its overflow, which a post card does, to keep photos correctly inside its rounded corners.
function ReactableContent({ reactions, currentUserId, onReact, children }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  const safeReactions = reactions || {};
  const myReaction = BLOG_REACTIONS.find((r) => (safeReactions[r.key] || []).some((entry) => reactorIdOf(entry) === currentUserId));

  const startPress = () => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(10); // a light haptic tick, matching the native long-press feel
      setPickerOpen(true);
    }, 450);
  };
  const endPress = () => clearTimeout(pressTimer.current);
  const cancelPress = () => clearTimeout(pressTimer.current);
  // A long-press that already opened the picker shouldn't ALSO let the release be read as a tap on
  // whatever's underneath (opening a photo's lightbox right as the picker appears, for instance) —
  // this runs in the capture phase specifically so it can intercept before that child's own onClick
  // ever sees the event.
  const onClickCapture = (e) => {
    if (longPressFired.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressFired.current = false;
    }
  };

  const choose = (key) => {
    onReact(key);
    setPickerOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={cancelPress}
        onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={cancelPress}
        onClickCapture={onClickCapture}
        onContextMenu={(e) => e.preventDefault()} // suppress the browser's own long-press menu so it doesn't fight with ours
      >
        {children}
      </div>

      {pickerOpen && (
        <div className="anim-expand-up absolute bottom-full left-3 mb-2 bg-white border border-stone-200 rounded-2xl shadow-lg px-2 py-1.5 flex items-center gap-0.5 z-20">
          {BLOG_REACTIONS.map((r) => (
            <button key={r.key} onClick={() => choose(r.key)}
              className={`text-xl leading-none p-1.5 rounded-full hover:bg-stone-100 hover:scale-110 transition-transform ${myReaction?.key === r.key ? "bg-teal-50" : ""}`}>
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The badge itself, deliberately separate from ReactableContent above (see the comment there for
// why) — rendered by the post card at its own outer level so it can overlap the true bottom-left
// edge of the whole card, half on and half off it, the same way WhatsApp's own reaction badges
// overlap the edge of the message bubble they belong to.
function ReactionBadge({ reactions, onOpen, className }) {
  const safeReactions = reactions || {};
  const summary = BLOG_REACTIONS
    .map((r) => ({ ...r, entries: safeReactions[r.key] || [] }))
    .filter((r) => r.entries.length > 0);
  if (summary.length === 0) return null;
  const totalCount = summary.reduce((sum, r) => sum + r.entries.length, 0);
  return (
    <button onClick={onOpen}
      className={`flex items-center gap-0.5 text-xs bg-white border border-stone-200 rounded-full pl-1.5 pr-2 py-1 shadow-md ${className || ""}`}>
      {summary.map((r) => <span key={r.key} className="leading-none">{r.emoji}</span>)}
      {totalCount > 1 && <span className="font-semibold text-stone-600 ml-0.5">{totalCount}</span>}
    </button>
  );
}

// The names-by-emoji breakdown WhatsApp shows when you tap an existing reaction — a tab per emoji
// used (an "All" tab first when more than one kind was used), each listing who's behind it.
// Reactions saved before names were stored alongside them show as "Someone" rather than a blank
// line, since there's no name on file for those older entries to fall back to.
function WhoReactedSheet({ summary, onClose }) {
  const allEntries = summary.flatMap((r) => r.entries.map((entry) => ({ ...r, name: reactorNameOf(entry) || "Someone" })));
  const [activeKey, setActiveKey] = useState(summary.length > 1 ? "all" : summary[0]?.key);
  const shown = activeKey === "all" ? allEntries : allEntries.filter((e) => e.key === activeKey);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:w-80 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-stone-100 overflow-x-auto no-scrollbar">
          {summary.length > 1 && (
            <button onClick={() => setActiveKey("all")}
              className={`shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-full ${activeKey === "all" ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-100"}`}>
              All {allEntries.length}
            </button>
          )}
          {summary.map((r) => (
            <button key={r.key} onClick={() => setActiveKey(r.key)}
              className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full ${activeKey === r.key ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-100"}`}>
              <span>{r.emoji}</span> {r.entries.length}
            </button>
          ))}
          <button onClick={onClose} className="ml-auto shrink-0 text-stone-400 hover:text-stone-600 p-1"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto py-1">
          {shown.map((entry, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="text-lg leading-none">{entry.emoji}</span>
              <span className="text-sm text-stone-700">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlogPostCard({ post, currentUserId, onReact, commentsEnabled, onComment, onOpenMedia }) {
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsOpen, setCommentsOpen] = useState((post.comments || []).length === 0);
  const [whoReactedBlockId, setWhoReactedBlockId] = useState(null);
  const comments = post.comments || [];

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    onComment(post.id, commentDraft);
    setCommentDraft("");
    setCommentsOpen(true);
  };

  const reactedBlocks = post.blocks.filter((b) => Object.values(b.reactions || {}).some((entries) => (entries || []).length > 0));
  const whoReactedBlock = whoReactedBlockId ? post.blocks.find((b) => b.id === whoReactedBlockId) : null;
  const whoReactedSummary = whoReactedBlock ? BLOG_REACTIONS
    .map((r) => ({ ...r, entries: (whoReactedBlock.reactions || {})[r.key] || [] }))
    .filter((r) => r.entries.length > 0) : [];

  return (
    // Deliberately NOT overflow-hidden at this outer level — that lives on the inner wrapper just
    // below instead, so a reaction badge rendered as a sibling of it (further down) can overlap
    // the true bottom-left edge of the WHOLE card — including past the comment box, the actual
    // outer boundary of the white box a person sees — rather than being clipped the moment it
    // tries to extend past whatever rounded-corner boundary is clipping the photos inside.
    <div className="bg-white border border-stone-200 rounded-2xl relative">
      <div className="rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 text-xs font-bold shrink-0">
            {(post.loggedBy || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{post.loggedBy || "Class"}</p>
            <p className="text-[11px] text-stone-400 capitalize">{post.authorType} · {formatRelativeTime(post.timestamp)}</p>
          </div>
        </div>

        {post.title && <p className="display-font text-base font-bold text-stone-900 px-4 pb-2">{post.title}</p>}

        <div className="divide-y divide-stone-100">
          {post.blocks.map((block) => {
            // Falls back to the old separate photoUrls/videoUrl shape for posts saved before mixed
            // batches existed, so nothing already published breaks or needs migrating.
            const media = block.media || [
              ...(block.photoUrls || []).map((url) => ({ url, type: "photo" })),
              ...(block.videoUrl ? [{ url: block.videoUrl, type: "video" }] : []),
            ];
            return (
              <div key={block.id} className="py-3 first:pt-0 last:pb-0">
                <ReactableContent reactions={block.reactions} currentUserId={currentUserId} onReact={(emoji) => onReact(post.id, emoji, block.id)}>
                  {media.length === 1 && (
                    media[0].type === "audio" ? (
                      <div className="px-4 pt-3">
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mb-1">
                          <Music size={16} className="text-stone-400 shrink-0" />
                          <p className="text-xs font-semibold text-stone-700 truncate">{media[0].name || "Audio"}</p>
                        </div>
                        <audio src={media[0].url} controls className="w-full" style={{ height: "36px" }} />
                      </div>
                    ) : (
                      <div className="relative cursor-pointer" onClick={() => onOpenMedia(media[0].url)}>
                        {media[0].type === "video" ? (
                          <>
                            <video src={media[0].url} muted playsInline className="w-full aspect-[4/3] object-cover pointer-events-none" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="bg-white/90 rounded-full p-3"><Play size={20} fill="currentColor" className="text-stone-800 ml-0.5" /></div>
                            </div>
                          </>
                        ) : (
                          <img src={media[0].url} alt="" className="w-full aspect-[4/3] object-cover" />
                        )}
                      </div>
                    )
                  )}
                  {media.length > 1 && (
                    <div className="grid grid-cols-2 gap-0.5">
                      {media.map((m, i) => (
                        <div key={i} className="relative aspect-square cursor-pointer" onClick={() => m.type !== "audio" && onOpenMedia(m.url)}>
                          {m.type === "video" ? (
                            <>
                              <video src={m.url} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="bg-white/90 rounded-full p-2"><Play size={13} fill="currentColor" className="text-stone-800 ml-0.5" /></div>
                              </div>
                            </>
                          ) : m.type === "audio" ? (
                            <div className="w-full h-full bg-stone-50 flex flex-col items-center justify-center gap-1.5 p-2 cursor-default">
                              <Music size={20} className="text-stone-400" />
                              <p className="text-[10px] font-semibold text-stone-600 text-center truncate w-full px-1">{m.name || "Audio"}</p>
                            </div>
                          ) : (
                            <img src={m.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {block.text && <p className="text-sm text-stone-700 leading-relaxed px-4 pt-3"><LinkifiedText text={block.text} linkClassName="underline text-teal-700 hover:text-teal-900" /></p>}
                  {block.text && extractFirstUrl(block.text) && <div className="px-4 pt-1.5"><LinkPreviewCard url={extractFirstUrl(block.text)} /></div>}
                  {!media.length && !block.text && <div className="h-2" />}
                </ReactableContent>
              </div>
            );
          })}
        </div>

        {commentsEnabled && (
          <div className="px-4 py-2.5">
            {comments.length > 0 && !commentsOpen && (
              <button onClick={() => setCommentsOpen(true)} className="text-xs text-stone-400 font-medium mb-1">
                View {comments.length} comment{comments.length === 1 ? "" : "s"}
              </button>
            )}
            {commentsOpen && (
              <div className="space-y-1.5 mb-2">
                {comments.map((c) => (
                  <p key={c.id} className="text-xs text-stone-600 leading-snug">
                    <span className="font-semibold text-stone-800">{c.authorName}</span> {c.text}
                  </p>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()} placeholder="Write a comment..."
                className="flex-1 text-xs rounded-full border border-stone-200 px-3 py-1.5 outline-none focus:border-teal-400" />
              <button onClick={submitComment} className="text-xs font-semibold text-teal-700 px-2">Post</button>
            </div>
          </div>
        )}
      </div>

      {/* Rendered here, as a sibling of the overflow-hidden wrapper above rather than a descendant
          of it — this is what actually lets it overlap the true outer edge of the whole card. One
          badge per block that has reactions; almost always just one, since almost every post is a
          single block, but a multi-part post gets one badge per part, spaced along the same edge
          rather than stacked on top of each other. */}
      {reactedBlocks.length > 0 && (
        <div className="absolute -bottom-3 left-3 right-3 flex flex-wrap gap-1.5 z-10">
          {reactedBlocks.map((block) => (
            <ReactionBadge key={block.id} reactions={block.reactions} onOpen={() => setWhoReactedBlockId(block.id)} />
          ))}
        </div>
      )}

      {whoReactedBlock && <WhoReactedSheet summary={whoReactedSummary} onClose={() => setWhoReactedBlockId(null)} />}
    </div>
  );
}

function BlogFeedView({ posts, currentUserId, currentUserName, currentUserType, commentsEnabled, onReact, onComment, navigate }) {
  const bottomRef = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const sorted = [...posts].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  // Same reasoning as the parent side's own blog view fix — useLayoutEffect, not useEffect, is
  // what makes this genuinely start at the bottom rather than flash the top of the feed for one
  // frame before jumping there. useEffect runs after the browser paints; useLayoutEffect runs
  // before it, so the very first frame shown already reflects the scrolled position.
  useLayoutEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, []); // eslint-disable-line

  // Same reasoning as the parent side's blog view — one continuous, chronological list of every
  // photo and video across the whole feed, so swiping in the lightbox isn't limited to whichever
  // post you tapped into.
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
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="blog" navigate={navigate} />

      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Class Blog</p>
      </div>
      <div className="md:w-[28rem]">
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-8 text-center mt-4">Nothing posted here yet.</p>
        ) : (
          <>
            <p className="text-center text-[11px] text-stone-400 my-4">Beginning of the class blog</p>
            <div className="space-y-4">
              {sorted.map((post) => (
                <BlogPostCard key={post.id} post={post} currentUserId={currentUserId}
                  onReact={onReact}
                  commentsEnabled={commentsEnabled} onComment={onComment} onOpenMedia={openMedia} />
              ))}
            </div>
          </>
        )}
        {(currentUserType === "teacher" || currentUserType === "admin") && (
          <button onClick={() => navigate("blog-compose")} className="w-full mt-4 text-sm font-bold text-white bg-teal-700 rounded-lg py-2.5 hover:bg-teal-800">
            + New post
          </button>
        )}
        <div ref={bottomRef} />
      </div>
      {lightboxIndex !== null && allMedia[lightboxIndex] && (
        <PhotoLightbox url={allMedia[lightboxIndex].url} type={allMedia[lightboxIndex].type} caption={allMedia[lightboxIndex].caption}
          mediaList={allMedia} currentIndex={lightboxIndex} onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}

function BlogComposeScreen({ config, loggedInTeacher, onSubmit, onBack }) {
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([{ id: uid(), text: "", mediaItems: [] }]);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [genState, setGenState] = useState({}); // blockId -> { open, roughNote, generating, error }

  const addBlock = () => setBlocks((prev) => [...prev, { id: uid(), text: "", mediaItems: [] }]);
  const removeBlock = (id) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const updateText = (id, text) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));

  // One mixed batch per part — any combination of photos, videos, and audio files together,
  // added in a single pick. Each video is checked for length right when it's added, independently
  // of the others, so one too-long clip in a batch of ten photos doesn't block the rest.
  const addMedia = async (blockId, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      const itemId = uid();
      if (isVideo) {
        try {
          await validateVideoDuration(file);
        } catch (err) {
          setBlocks((prev) => prev.map((b) => (b.id === blockId
            ? { ...b, mediaItems: [...b.mediaItems, { id: itemId, file: null, preview: null, type: "video", error: err.message }] }
            : b)));
          continue; // eslint-disable-line no-continue
        }
      }
      setBlocks((prev) => prev.map((b) => (b.id === blockId
        ? { ...b, mediaItems: [...b.mediaItems, { id: itemId, file, preview: isAudio ? null : URL.createObjectURL(file), type: isVideo ? "video" : isAudio ? "audio" : "photo", name: isAudio ? file.name : null, error: null }] }
        : b)));
    }
  };
  const removeMedia = (blockId, itemId) => setBlocks((prev) => prev.map((b) => (b.id === blockId
    ? { ...b, mediaItems: b.mediaItems.filter((m) => m.id !== itemId) }
    : b)));

  const toggleGenerate = (blockId) => setGenState((prev) => ({ ...prev, [blockId]: { ...prev[blockId], open: !prev[blockId]?.open, roughNote: "", error: false } }));
  const setRoughNote = (blockId, val) => setGenState((prev) => ({ ...prev, [blockId]: { ...prev[blockId], roughNote: val } }));
  const generateFor = async (blockId) => {
    const note = genState[blockId]?.roughNote?.trim();
    if (!note) return;
    setGenState((prev) => ({ ...prev, [blockId]: { ...prev[blockId], generating: true, error: false } }));
    try {
      const draft = await generateBlogCaption(note, config, loggedInTeacher);
      updateText(blockId, draft || "");
      setGenState((prev) => ({ ...prev, [blockId]: { open: false, roughNote: "", generating: false, error: false } }));
    } catch {
      setGenState((prev) => ({ ...prev, [blockId]: { ...prev[blockId], generating: false, error: true } }));
    }
  };

  const hasContent = blocks.some((b) => b.text.trim() || b.mediaItems.some((m) => m.file));

  const submit = async () => {
    if (!hasContent) { setError("Add at least a photo, a video, or some text first."); return; }
    setError(null);
    setPosting(true);
    setProgress(0);
    try {
      const cleanBlocks = blocks.map((b) => ({ ...b, mediaItems: b.mediaItems.filter((m) => m.file) })); // drop rejected videos, never sent
      await onSubmit(title, cleanBlocks, setProgress);
      onBack();
    } catch (err) {
      setError(describeUploadError(err));
    }
    setPosting(false);
  };

  const activeBlockCount = blocks.filter((b) => b.text.trim() || b.mediaItems.some((m) => m.file)).length;

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-4">New blog post</h1>
      <div className="md:w-96 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give this post a title (optional)"
          className="w-full display-font text-base font-bold rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-teal-400" />
        {blocks.map((block, i) => {
          const gs = genState[block.id] || {};
          return (
            <div key={block.id} className="border border-stone-200 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-stone-400 uppercase">Part {i + 1}</p>
                {blocks.length > 1 && <button onClick={() => removeBlock(block.id)} className="text-[11px] text-rose-500 font-semibold">Remove</button>}
              </div>
              {block.mediaItems.length > 0 && (
                <div className={`grid gap-1 mb-1.5 ${block.mediaItems.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {block.mediaItems.map((m) => (
                    <div key={m.id} className="relative">
                      {m.error ? (
                        <div className="w-full aspect-square rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center p-2">
                          <p className="text-[10px] text-rose-600 text-center">{m.error}</p>
                        </div>
                      ) : m.type === "video" ? (
                        <video src={m.preview} className="w-full aspect-square object-cover rounded-lg" />
                      ) : m.type === "audio" ? (
                        <div className="w-full aspect-square rounded-lg bg-stone-50 border border-stone-200 flex flex-col items-center justify-center gap-2 p-2">
                          <Music size={22} className="text-stone-400" />
                          <p className="text-[10px] text-stone-600 font-semibold text-center truncate w-full px-1">{m.name}</p>
                        </div>
                      ) : (
                        <img src={m.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      )}
                      <button onClick={() => removeMedia(block.id, m.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-block text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 mb-1.5 cursor-pointer">
                + Add photos, video, or audio
                <input type="file" accept="image/*,video/*,audio/*" multiple onChange={(e) => { addMedia(block.id, e.target.files); e.target.value = ""; }} className="hidden" />
              </label>

              {gs.open && (
                <div className="border border-teal-200 bg-teal-50/50 rounded-lg p-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <input value={gs.roughNote || ""} onChange={(e) => setRoughNote(block.id, e.target.value)} placeholder="What's this about? I'll polish it."
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); generateFor(block.id); } }}
                      className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" autoFocus />
                    <button onClick={() => generateFor(block.id)} disabled={!gs.roughNote?.trim() || gs.generating}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white bg-teal-700 rounded-lg px-2.5 py-1.5 hover:bg-teal-800 disabled:opacity-40 shrink-0">
                      {gs.generating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} {gs.generating ? "…" : "Generate"}
                    </button>
                  </div>
                  {gs.error && <p className="text-[11px] text-rose-600 mt-1">Couldn't generate right now — try again, or just type the caption.</p>}
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <textarea value={block.text} onChange={(e) => updateText(block.id, e.target.value)} placeholder="Add a caption..."
                  ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 280)}px`; } }}
                  className="flex-1 text-sm rounded-lg border border-stone-200 px-2.5 py-1.5 outline-none focus:border-teal-400 resize-none overflow-y-auto" style={{ minHeight: "3.25rem" }} />
                <button onClick={() => toggleGenerate(block.id)} title="Generate with AI"
                  className={`shrink-0 rounded-lg p-2 border ${gs.open ? "bg-teal-50 border-teal-300 text-teal-700" : "border-stone-300 text-stone-400 hover:text-teal-700 hover:border-teal-300"}`}>
                  <Sparkles size={15} />
                </button>
              </div>
            </div>
          );
        })}
        <button onClick={addBlock} className="text-xs font-semibold text-teal-700">+ Add another part to this post</button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button onClick={submit} disabled={posting} className="w-full text-sm font-bold text-white bg-teal-700 rounded-lg py-2.5 hover:bg-teal-800 disabled:opacity-50">
          {posting ? `Posting… ${progress}%` : activeBlockCount > 1 ? "Post all parts together" : "Post"}
        </button>
      </div>
    </div>
  );
}

// Same reasoning as the blog feed's own compose button — placed at the bottom, right after the
// newest post, so it's the next thing in view rather than requiring a scroll back to the top.
function TeacherHomeworkView({ posts, navigate }) {
  const sorted = [...posts].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="homework" navigate={navigate} />
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Homework</p>
      <div className="md:w-[28rem]">
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-400 bg-stone-100 rounded-lg px-3 py-8 text-center">Nothing posted here yet.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((post) => (
              <div key={post.id} className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {post.cadence === "weekly" ? "Weekly" : "Daily"}
                  </span>
                  <span className="text-[10px] text-stone-400">{new Date(post.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
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
        <button onClick={() => navigate("homework-compose")} className="w-full mt-4 text-sm font-bold text-white bg-teal-700 rounded-lg py-2.5 hover:bg-teal-800">
          + New homework
        </button>
      </div>
    </div>
  );
}

function HomeworkComposeScreen({ classId, onSubmit, onBack }) {
  const [cadence, setCadence] = useState("daily");
  const [text, setText] = useState("");
  const [attachFile, setAttachFile] = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [attachType, setAttachType] = useState(null); // "photo" | "video" | "audio" | "file"
  const [attachError, setAttachError] = useState(null);
  const [posting, setPosting] = useState(false);

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

  const submit = async () => {
    if (!text.trim() && !attachFile) return;
    setPosting(true);
    setAttachError(null);
    try {
      await onSubmit(cadence, text, attachFile, attachType);
      onBack();
    } catch (err) {
      setAttachError(describeUploadError(err));
      setPosting(false);
    }
  };

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-4">New homework</h1>

      <label className="block text-xs font-medium text-stone-500 mb-1">How often does this repeat?</label>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setCadence("daily")} className={`flex-1 text-sm font-semibold rounded-lg py-2 border ${cadence === "daily" ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-600 border-stone-300"}`}>Daily</button>
        <button onClick={() => setCadence("weekly")} className={`flex-1 text-sm font-semibold rounded-lg py-2 border ${cadence === "weekly" ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-600 border-stone-300"}`}>Weekly</button>
      </div>
      <p className="text-xs text-stone-400 mb-4">Families will see this as "{cadence === "weekly" ? "This week's homework" : "Today's homework"}" — no need to type a title.</p>

      <label className="block text-xs font-medium text-stone-500 mb-1">What's the homework?</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="e.g. Read chapter 4 and answer the review questions."
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3" />

      {attachPreview && (
        <div className="relative inline-block mb-3">
          {attachType === "video" ? <video src={attachPreview} className="h-24 rounded-lg" /> : <img src={attachPreview} alt="" className="h-24 rounded-lg" />}
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

      <button onClick={submit} disabled={posting || (!text.trim() && !attachFile)} className="w-full text-sm font-bold text-white bg-teal-700 rounded-lg py-2.5 hover:bg-teal-800 disabled:opacity-50">
        {posting ? "Posting…" : "Post homework"}
      </button>
    </div>
  );
}

function TapLogScreen({ tile, date, roster, studentData, checkedInIds, dataKey, typeOptions, logBulk, removeLog, onBack }) {
  const st = TILE_STYLES[tile.color];
  const checkedInRoster = roster.filter((s) => checkedInIds.has(s.id));
  const notInRoster = roster.filter((s) => !checkedInIds.has(s.id));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [type, setType] = useState(typeOptions[0].id);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState({});
  const [saved, setSaved] = useState(false);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (selected.length === 0) return;
    logBulk(date, time, type, selected, notes);
    setSelected([]);
    setNotes({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const todaysEntries = roster.flatMap((s) => (studentData[s.id]?.[dataKey] || []).filter((e) => e.date === date).map((e) => ({ ...e, studentId: s.id, studentName: s.name })))
    .sort((a, b) => (a.time < b.time ? 1 : -1));

  return (
    <div className="app-page">
      <PreschoolScreenHeader tile={tile} title={tile.label} onBack={onBack} />
      <div className="flex items-center gap-2 mb-3">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${type === t.id ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-400 mb-2">Tap everyone this applies to, then log them together.</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {checkedInRoster.map((s) => (
          <button key={s.id} onClick={() => toggle(s.id)}
            className={`text-sm font-semibold px-3 py-2 rounded-full border ${selected.includes(s.id) ? `text-white ${st.solid} ${st.solidBorder}` : "text-stone-600 border-stone-300 bg-white"}`}>
            {s.name}
          </button>
        ))}
        {notInRoster.map((s) => (
          <span key={s.id} className="text-sm font-semibold px-3 py-2 rounded-full border border-stone-200 bg-stone-50 text-stone-400">
            {s.name} — not checked in
          </span>
        ))}
      </div>

      {/* One at a time is genuinely rare here — a note is the exception, not something worth
          slowing the fast multi-select-and-log flow down for. Only ever appears once someone's
          actually selected, and stays out of the way of the group-select pills entirely. */}
      {selected.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {selected.map((id) => {
            const s = checkedInRoster.find((r) => r.id === id);
            if (!s) return null;
            return (
              <div key={id} className="flex items-center justify-between gap-2 bg-white border border-stone-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-semibold text-stone-600 shrink-0">{s.name}</span>
                <div className="flex-1 min-w-0"><InlineNoteField value={notes[id]} onChange={(v) => setNotes((prev) => ({ ...prev, [id]: v }))} /></div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={submit} disabled={selected.length === 0}
        className={`w-full text-white rounded-xl py-4 text-base font-bold disabled:opacity-40 mb-5 ${st.solid} ${st.solidHover}`}>
        {saved ? "Logged ✓" : selected.length > 0 ? `Log for ${selected.length} selected` : "Select students above"}
      </button>

      {todaysEntries.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Today so far</p>
          <ul className="space-y-1.5">
            {todaysEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm bg-white border border-stone-200 rounded-lg px-3 py-2">
                <span className="text-stone-700">
                  {formatTime12h(e.time)} — {e.studentName} — {typeOptions.find((t) => t.id === e.type)?.label || e.type}
                  {e.note && <span className="block text-xs text-stone-400 mt-0.5">{e.note}</span>}
                </span>
                <button onClick={() => removeLog(e.studentId, e.id)} className="text-stone-400 hover:text-rose-600 shrink-0"><X size={14} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
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
            <p className={`font-medium text-stone-900 truncate flex-1 min-w-0 ${nameSize}`}>{s.name}</p>
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
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-1 bg-${inc.categoryColor || catMap[inc.category]?.color || "stone"}-100 text-${inc.categoryColor || catMap[inc.category]?.color || "stone"}-700`}>
                  {inc.categoryLabel || catMap[inc.category]?.label || inc.category || "Uncategorized"}
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

// The school-office inbox — not scoped to any class, since it's a shared line to admin, and
// deliberately not attributed to whichever specific admin happens to reply (families shouldn't
// need to track which staff member said what; it's the office, not a person).
// Grouped by family the same way as the teacher's own message list, for the same reason — two
// guardians on one family should read as one office conversation, not two.

// Conversation list — one row per family that actually has a child in this class, found by
// scanning family records rather than keeping a separate index, since a small preschool's family
// list is short enough that this is simpler and less to keep in sync than a denormalized list.
// Grouped by family, not by individual login — two guardians on the same family share one row
// and one conversation here, the same way they share it on their own side, rather than showing up
// as two disconnected families that happen to have the same kids.
function TeacherMessagesView({ classId, roster, config, loggedInTeacher, sendMessageToFamily, sendDirectMessageToFamily, loggedByName, navigate, deepLinkGroupId, deepLinkIsDirect, onCommRead }) {
  const [groups, setGroups] = useState(null); // null = loading
  const [openGroup, setOpenGroup] = useState(null);
  const [mode, setMode] = useState(deepLinkIsDirect ? "direct" : "inbox"); // "inbox" | "direct" | "compose"
  const [directGroups, setDirectGroups] = useState(null); // families this teacher can message individually, across every class they teach
  const [openDirectGroup, setOpenDirectGroup] = useState(null);
  // Captured right before markThreadRead overwrites it — same reasoning as the parent side's own
  // lastReadBeforeOpen: opening a thread marks it read immediately, so without holding onto the
  // value from just before that happens, there'd be no way to know which messages were genuinely
  // still unread at the moment the thread was opened, which the "new messages start here" divider
  // needs.
  const [lastReadBeforeOpen, setLastReadBeforeOpen] = useState(null);
  const openClassroomGroup = async (g) => {
    const readState = await getReadState(loggedInTeacher.uid);
    setLastReadBeforeOpen(readState[`classroom-${g.groupId}`] || null);
    navigateToGroup(g);
    await markThreadRead(loggedInTeacher.uid, `classroom-${g.groupId}`);
    onCommRead?.();
  };
  const openDirectGroupThread = async (g) => {
    const readState = await getReadState(loggedInTeacher.uid);
    setLastReadBeforeOpen(readState[`teacher-direct-${g.groupId}`] || null);
    setOpenDirectGroup(g);
    await markThreadRead(loggedInTeacher.uid, `teacher-direct-${g.groupId}`);
    onCommRead?.();
  };


  // Live-subscribed for whichever ONE conversation is actually open right now, AND (via
  // useLiveJSONMap below) for every family's preview in the inbox list at once — a message
  // arriving with no visible sign of it, whether that's the thread someone has open or just its
  // preview sitting in the list, is exactly what breaks the back-and-forth of a real conversation.
  const liveOpenGroupThread = useLiveJSON(openGroup ? `class:${classId}:messages:${openGroup.groupId}` : null, { messages: [] });
  const liveOpenDirectThread = useLiveJSON(openDirectGroup ? `teacher-messages:${loggedInTeacher.uid}:${openDirectGroup.groupId}` : null, { messages: [] });

  // Every family's classroom-thread preview, live — keyed back to plain groupId (matching how the
  // rest of this component already reads threads[groupId]) rather than the raw storage key
  // useLiveJSONMap itself returns, so switching to live subscriptions here didn't require
  // reshaping every call site that reads from this object.
  const liveThreadsByStorageKey = useLiveJSONMap((groups || []).map((g) => `class:${classId}:messages:${g.groupId}`));
  const threads = Object.fromEntries((groups || []).map((g) => [g.groupId, liveThreadsByStorageKey[`class:${classId}:messages:${g.groupId}`] || { messages: [] }]));

  const liveDirectThreadsByStorageKey = useLiveJSONMap((directGroups || []).map((g) => `teacher-messages:${loggedInTeacher.uid}:${g.groupId}`));
  const directThreads = Object.fromEntries((directGroups || []).map((g) => [g.groupId, liveDirectThreadsByStorageKey[`teacher-messages:${loggedInTeacher.uid}:${g.groupId}`] || { messages: [] }]));

  // For showing an actual unread count on each row in both inbox lists below, not just inside an
  // open conversation — refreshed on the same events that already change what's actually unread
  // (a thread being marked read, or the live thread data itself changing).
  const [listReadState, setListReadState] = useState({});
  useEffect(() => {
    if (!loggedInTeacher) return;
    getReadState(loggedInTeacher.uid).then(setListReadState);
  }, [loggedInTeacher, threads, directThreads]);

  // Same reasoning as the class/tab history work — pushing a real entry here is what lets the
  // Android back button (and the in-app Back button, which now goes through the same mechanism
  // via history.back() rather than clearing state directly) step back to the conversation list
  // instead of skipping past it. Groups aren't loaded yet on the very first render, so this can't
  // safely capture a full group object up front — restoring from a reload just needs the groupId
  // to know a conversation SHOULD reopen once groups finish loading; the effect below that
  // already resolves deepLinkGroupId does exactly that.
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
      const match = (groups || []).find((g) => g.groupId === threadId);
      if (match) setOpenGroup(match);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [groups]);

  // One row per GUARDIAN, not per family — classroom messages are now a private line between each
  // individual guardian and the classroom's teachers, the same way the Direct tab below already
  // works. Two guardians of the same family show up here as two separate conversations.
  const refresh = useCallback(async () => {
    const relevant = await fetchClassFamilies(classId);
    const byGuardian = {};
    relevant.forEach((f) => {
      if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f], studentLinks: f.studentLinks };
    });
    setGroups(Object.values(byGuardian));
  }, [classId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Every GUARDIAN this teacher can message one-on-one, across every class they teach — not just
  // the one class currently open, and deliberately one row per guardian, not one per family. Two
  // guardians of the same family are two genuinely separate, private threads with this teacher
  // (see the matching comment on the parent side's teacherMessagingThread for why), so each needs
  // its own entry here for the teacher to actually choose between them — a family reachable
  // through two of this teacher's classes (two siblings, say) still shows each guardian exactly
  // once, not once per class they happen to share.
  const assignedClassIds = loggedInTeacher?.assignedClassIds || [];
  const refreshDirect = useCallback(async () => {
    if (assignedClassIds.length === 0) { setDirectGroups([]); return; }
    // Fetches per-class rather than in one shot — a teacher only ever has a couple of assigned
    // classes, so this stays cheap, and it's what actually keeps each request within the rule
    // fetchClassFamilies itself is built around (one specific, provably-owned class at a time).
    const perClass = await Promise.all(assignedClassIds.map((id) => fetchClassFamilies(id)));
    const all = perClass.flat();
    const byGuardian = {};
    all.forEach((f) => {
      // Same guardian can appear once per matching class fetch above (two kids, two classes,
      // same teacher) — keyed by their own uid this keeps them counted once regardless.
      if (!byGuardian[f.uid]) byGuardian[f.uid] = { groupId: f.uid, guardians: [f], studentLinks: f.studentLinks };
    });
    setDirectGroups(Object.values(byGuardian));
  }, [assignedClassIds.join(","), loggedInTeacher?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (mode === "direct") refreshDirect(); }, [mode, refreshDirect]);

  // Opens straight into the right family's thread the moment the inbox has actually loaded —
  // can't fire any earlier than that, since the specific group object this needs doesn't exist
  // until the fetch above completes. Skipped for a direct-message deep link (handled by the
  // matching effect below instead), since this one only ever looks at classroom groups.
  useEffect(() => {
    if (!deepLinkGroupId || deepLinkIsDirect || !groups) return;
    const match = groups.find((g) => g.groupId === deepLinkGroupId);
    if (match) openClassroomGroup(match);
  }, [deepLinkGroupId, deepLinkIsDirect, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // The direct-message counterpart to the classroom resolver above — waits on directGroups
  // instead, which only populates once mode is actually "direct" (see the effect above this one).
  // Since mode is initialized to "direct" whenever deepLinkIsDirect is true, that fetch is already
  // underway by the time this runs, so this just waits for it to land.
  useEffect(() => {
    if (!deepLinkGroupId || !deepLinkIsDirect || !directGroups) return;
    const match = directGroups.find((g) => g.groupId === deepLinkGroupId);
    if (match) openDirectGroupThread(match);
  }, [deepLinkGroupId, deepLinkIsDirect, directGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  if (openGroup) {
    const thread = liveOpenGroupThread;
    const childNames = (openGroup.studentLinks || []).filter((l) => l.classId === classId).map((l) => l.studentName).join(", ");
    const guardianNames = openGroup.guardians.map((g) => g.name).join(" & ");
    const storageKey = `class:${classId}:messages:${openGroup.groupId}`;
    return (
      <>
        <GlobalAppStyles />
        <ConversationThreadView title={guardianNames} subtitle={childNames} messages={thread.messages} myRole="teacher" config={config} teacher={loggedInTeacher} threadKey={`classroom-${openGroup.groupId}`}
          lastReadBeforeOpen={lastReadBeforeOpen}
          onBack={() => { window.history.back(); refresh(); }}
          onSend={async (text, attachments) => { await sendMessageToFamily(openGroup.groupId, text, attachments); }}
          onEdit={async (messageId, newText) => { await editMessageInThread(storageKey, messageId, newText); }}
          onDelete={async (messageId) => { await deleteMessageInThread(storageKey, messageId); }} />
      </>
    );
  }

  if (openDirectGroup) {
    const thread = liveOpenDirectThread;
    const childNames = (openDirectGroup.studentLinks || []).filter((l) => assignedClassIds.includes(l.classId)).map((l) => l.studentName).join(", ");
    const guardianNames = openDirectGroup.guardians.map((g) => g.name).join(" & ");
    const storageKey = `teacher-messages:${loggedInTeacher.uid}:${openDirectGroup.groupId}`;
    return (
      <>
        <GlobalAppStyles />
        <ConversationThreadView title={guardianNames} subtitle={childNames} messages={thread.messages} myRole="teacher" config={config} teacher={loggedInTeacher} threadKey={`teacher-direct-${openDirectGroup.groupId}`}
          lastReadBeforeOpen={lastReadBeforeOpen}
          onBack={() => { setOpenDirectGroup(null); refreshDirect(); }}
          onSend={async (text, attachments) => { await sendDirectMessageToFamily(openDirectGroup.groupId, text, attachments); }}
          onEdit={async (messageId, newText) => { await editMessageInThread(storageKey, messageId, newText); }}
          onDelete={async (messageId) => { await deleteMessageInThread(storageKey, messageId); }} />
      </>
    );
  }

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="communication" navigate={navigate} />
      <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-stone-500 mb-3"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-lg font-bold text-stone-900 mb-3">{mode === "direct" ? "My Direct Messages" : "Classroom Messages"}</h1>

      <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 md:w-[28rem]">
        <button onClick={() => setMode("inbox")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${mode === "inbox" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
          <Mail size={14} /> Classroom
        </button>
        <button onClick={() => setMode("direct")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${mode === "direct" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
          <MessageCircle size={14} /> Direct
        </button>
        <button onClick={() => setMode("compose")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${mode === "compose" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>
          <Plus size={14} /> New broadcast
        </button>
      </div>

      {mode === "compose" ? (
        <ClassBroadcastComposer roster={roster} classId={classId} config={config} loggedInTeacher={loggedInTeacher} sendMessageToFamily={sendMessageToFamily} />
      ) : mode === "direct" ? (
        <>
          <p className="text-xs text-stone-400 mb-3">Only you see these — not any other teacher sharing a class with these families, and not admin (though admin can view for oversight).</p>
          {directGroups === null && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
          {directGroups?.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No families linked to your classes yet.</p>}
          <div className="space-y-2">
            {(directGroups || []).map((g) => {
              const thread = directThreads[g.groupId];
              const last = thread?.messages?.[thread.messages.length - 1];
              const childNames = (g.studentLinks || []).filter((l) => assignedClassIds.includes(l.classId)).map((l) => l.studentName).join(", ");
              const guardianNames = g.guardians.map((gu) => gu.name).join(" & ");
              const unreadCount = countUnreadInThread(listReadState, `teacher-direct-${g.groupId}`, thread?.messages, "teacher");
              return (
                <button key={g.groupId} onClick={() => openDirectGroupThread(g)} className="w-full text-left bg-white border-2 border-teal-700/15 rounded-xl p-4 hover:border-teal-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-900">{guardianNames}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-teal-700 text-white text-[11px] font-bold leading-none">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {last && <p className="text-[10px] text-stone-400">{new Date(last.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mb-1">{childNames}</p>
                  <p className="text-xs text-stone-500 truncate">{last ? `${last.senderType === "teacher" ? "You: " : ""}${last.text}` : "No messages yet"}</p>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {groups === null && <p className="text-sm text-stone-400 text-center py-8">Loading…</p>}
          {groups?.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No families are linked to this class yet.</p>}

          <div className="space-y-2">
            {(groups || []).map((g) => {
              const thread = threads[g.groupId];
              const last = thread?.messages?.[thread.messages.length - 1];
              const childNames = (g.studentLinks || []).filter((l) => l.classId === classId).map((l) => l.studentName).join(", ");
              const guardianNames = g.guardians.map((gu) => gu.name).join(" & ");
              const unreadCount = countUnreadInThread(listReadState, `classroom-${g.groupId}`, thread?.messages, "teacher");
              return (
                <button key={g.groupId} onClick={() => openClassroomGroup(g)} className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:border-teal-300">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-900">{guardianNames}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-teal-700 text-white text-[11px] font-bold leading-none">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {last && <p className="text-[10px] text-stone-400">{new Date(last.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mb-1">{childNames}</p>
                  <p className="text-xs text-stone-500 truncate">{last ? `${last.senderType === "teacher" ? "You: " : ""}${last.text}` : "No messages yet"}</p>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CommunicationListView({ roster, studentData, classId, loggedInTeacher, navigate, openStudent, unreadFamilies, onRefreshUnread }) {
  const { classType } = useContext(ClassContext);
  const isPreschool = classType === "preschool";

  const snoozeFamily = async (item) => {
    await snoozeThread(loggedInTeacher.uid, item.threadKey, 60); // snoozes for an hour
    onRefreshUnread();
  };

  return (
    <div className={PAGE}>
      <Header navigate={navigate} />
      <MainTabs active="communication" navigate={navigate} />

      {unreadFamilies.length > 0 && (
        <div className="space-y-2 mb-4">
          {unreadFamilies.map((item) => (
            <div key={item.threadKey} className="bg-teal-50 border border-teal-300 rounded-xl p-3.5 flex items-start gap-2.5">
              <div className="bg-teal-700 text-white rounded-full p-1.5 shrink-0 mt-0.5"><MessageCircle size={14} /></div>
              <button onClick={() => navigate("messages")} className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-stone-900">New message — {item.guardianNames}</p>
                <p className="text-xs text-stone-600 truncate">{item.preview}</p>
              </button>
              <button onClick={() => snoozeFamily(item)} title="Snooze for an hour" className="text-stone-400 hover:text-stone-600 p-1 shrink-0"><Bell size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => navigate("messages")} className="w-full mb-3 flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800">
        <Mail size={16} /> Classroom Messages
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
function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
// Reused across every rendering of a schedule block — teacher-side editor, "today's schedule"
// summaries, and the incident/health-note context lookup — so a period's color stays the same
// wherever it shows up. Deliberately avoids violet/sky/stone/red, which were remapped to muted
// tones in an earlier design pass and would look flat here.
// Deliberately excludes indigo and fuchsia — despite their names, this app's theme renders indigo
// as a dusty rose/mauve and fuchsia as orange/rust, confirmed directly against the actual hex
// values in GlobalAppStyles, not assumed. Using either would make two "different" schedule colors
// look confusingly similar to rose or amber. Every color below was individually checked against
// its real rendered ramp, not just assumed safe because it wasn't on the earlier known-muted list.
const SCHEDULE_BLOCK_COLORS = ["teal", "emerald", "amber", "rose", "cyan", "orange"];
// One flat array of day-instance blocks, replacing the older "named templates + weekday mapping"
// model — each day's copy of a period is its own independent object, since that's what lets a
// teacher drag or resize just one day without disturbing the rest of the week. Migrated from the
// old model exactly once, automatically, the first time a class loads under the new system, so
// nothing already configured gets lost in the switch.
// Resizes and re-compresses an image client-side before it ever reaches Storage — a typical phone
// photo runs 3-15MB, which can make an upload look stuck for a long time (or fail outright) on a
// slow connection. Shrinking to a reasonable max dimension and re-encoding as JPEG cuts that down
// dramatically without a visible quality loss for anything displayed at app size.
function migrateSchedulesToBlocks(config) {
  const schedules = config.planner?.schedules || [];
  const weekdaySchedule = config.planner?.weekdaySchedule || {};
  const blocks = [];
  let colorIdx = 0;
  const colorForLabel = {};
  for (let weekday = 1; weekday <= 5; weekday++) {
    const schedule = schedules.find((s) => s.id === weekdaySchedule[weekday]);
    if (!schedule) continue;
    (schedule.periods || []).forEach((p) => {
      const start = timeToMinutes(p.startTime);
      const end = timeToMinutes(p.endTime);
      if (start == null || end == null) return;
      const key = (p.label || "").toLowerCase().trim();
      if (!(key in colorForLabel)) colorForLabel[key] = SCHEDULE_BLOCK_COLORS[colorIdx++ % SCHEDULE_BLOCK_COLORS.length];
      blocks.push({ id: uid(), day: weekday - 1, label: p.label || "Period", start, end, subjectId: null, color: colorForLabel[key] });
    });
  }
  return blocks;
}
// Elementary only — decides what a newly-typed period label does to config.subjects: link to an
// existing subject with a matching label, create a new one, or (lunch, recess, and the like) do
// neither, since those aren't academic subjects worth tracking benchmarks against. The teacher's
// own "track as a subject" checkbox is the final word — this list is just a sensible default,
// not something they're stuck with if a real subject happens to share a name with it.
function resolveSubjectForLabel(label, subjects, trackAsSubject) {
  const trimmed = (label || "").trim();
  if (!trimmed || !trackAsSubject) return { subjectId: null, nextSubjects: subjects };
  if (SCHEDULE_BLOCK_LIBRARY.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
    return { subjectId: null, nextSubjects: subjects };
  }
  const existing = subjects.find((s) => s.label.toLowerCase() === trimmed.toLowerCase());
  if (existing) return { subjectId: existing.id, nextSubjects: subjects };
  const created = { id: uid(), label: trimmed };
  return { subjectId: created.id, nextSubjects: [...subjects, created] };
}
// Given when something was logged, finds which scheduled period was actually happening at that
// moment — so an incident or health note can show real context ("2:15 PM · during Recess")
// instead of leaving a teacher to reconstruct it from memory later. Matches the exact same day-
// type resolution every other schedule lookup in the app already uses, so this shows the same
// schedule a teacher would see if they opened the planner for that date themselves. Returns null
// if there's no schedule for that date, or the time falls between periods.
function findPeriodAtTime(dateStr, timeStr, config, plannerDays) {
  if (!dateStr || !timeStr) return null;
  const dayTypeMap = {};
  (config.planner?.dayTypes || []).forEach((t) => (dayTypeMap[t.id] = t));
  const dayType = plannerDays?.[dateStr]?.dayType ? dayTypeMap[plannerDays[dateStr].dayType] : null;
  const periods = getScheduleForDate(dateStr, dayType, config, plannerDays);
  if (!periods) return null;
  const mins = timeToMinutes(timeStr);
  if (mins == null) return null;
  const match = periods.find((p) => {
    const start = timeToMinutes(p.startTime);
    const end = timeToMinutes(p.endTime);
    return start != null && end != null && mins >= start && mins < end;
  });
  return match ? match.label : null;
}
// A blog post's timestamp shows relative to now while recent ("2 hours ago"), then falls back to
// an actual date once it's old enough that "X days ago" stops being useful at a glance.
function formatRelativeTime(isoTimestamp) {
  if (!isoTimestamp) return "";
  const then = new Date(isoTimestamp);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: then.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
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
    // categoryLabel is stored directly on preschool-logged incidents (their own category ids,
    // like "fall-bump", were never part of the elementary catMap above and would otherwise show
    // as a raw id instead of a readable label) — prefer it when present, and fall back to catMap
    // for older, elementary-style entries that only ever stored the bare category id.
    incidentLines = incidentsInRange.length === 0
      ? ["No incidents in this range."]
      : incidentsInRange.map((i) => `${i.date} — ${i.categoryLabel || catMap[i.category] || i.category}${i.description ? `: ${i.description}` : ""}`);
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

async function generateHybridReport(student, label, facts, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
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
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

function MonthlyReportsView({ roster, studentData, incidents, classAssessments, config, loggedInTeacher, classType, onBack, onLogSent, onUpdateParentEmail }) {
  const now = new Date();
  const isPreschool = classType === "preschool";
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(false);
  const [reports, setReports] = useState({}); // studentId -> { loading, draft, dataUsed, email, logged }
  const label = monthLabel(year, monthIdx);
  // Assessment logging isn't in use for preschool rooms yet, so the option is hidden entirely
  // below, not just defaulted off — but this stays doubly safe even if that ever drifts, since a
  // preschool report can never actually pull in an assessment section regardless of what state
  // says, the same way the checkbox itself can never be reached to turn it on.
  const opts = { attendance: includeAttendance, incidents: includeIncidents, assessments: isPreschool ? false : includeAssessments };

  const generateOne = async (student) => {
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    const data = studentData[student.id] || emptyStudentData();
    const facts = buildMonthlyFacts(student, data, incidents, classAssessments, config, year, monthIdx, opts);
    const dataUsed = factsToPlainText(student, label, facts);
    try {
      const text = await generateHybridReport(student, label, facts, config, loggedInTeacher);
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
        {!isPreschool && (
          <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAssessments} onChange={(e) => setIncludeAssessments(e.target.checked)} /> Assessment activity</label>
        )}
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
                    <ParentSendActions student={s} subject={`Monthly report — ${label}`} body={r.draft} config={config} signOff={loggedInTeacher?.messageSignOff} size="small" />
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

function CustomRangeReportView({ roster, studentData, incidents, classAssessments, config, loggedInTeacher, classType, onBack, onLogSent, onUpdateParentEmail }) {
  const today = todayISO();
  const isPreschool = classType === "preschool";
  const [startDate, setStartDate] = useState(addDaysISO(today, -13));
  const [endDate, setEndDate] = useState(today);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(false);
  const [reports, setReports] = useState({});
  const label = `${startDate} to ${endDate}`;
  const opts = { attendance: includeAttendance, incidents: includeIncidents, assessments: isPreschool ? false : includeAssessments };

  const generateOne = async (student) => {
    setReports((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    const data = studentData[student.id] || emptyStudentData();
    const facts = buildRangeFacts(student, data, incidents, classAssessments, config, startDate, endDate, opts);
    const dataUsed = factsToPlainText(student, label, facts);
    try {
      const text = await generateHybridReport(student, label, facts, config, loggedInTeacher);
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
        {!isPreschool && (
          <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600"><input type="checkbox" checked={includeAssessments} onChange={(e) => setIncludeAssessments(e.target.checked)} /> Assessment activity</label>
        )}
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
                    <ParentSendActions student={s} subject={`Report — ${label}`} body={r.draft} config={config} signOff={loggedInTeacher?.messageSignOff} size="small" />
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

async function generateAssessmentReport(student, assessment, grade, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
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
      const text = await generateAssessmentReport(student, assessment, grade, config, loggedInTeacher);
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
                    <ParentSendActions student={s} subject={`${assessmentLabel} — Report`} body={r.draft} config={config} signOff={loggedInTeacher?.messageSignOff} size="small" />
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
      const text = await generateSkillReport(student, category, summaryLines, config, loggedInTeacher);
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
                    <ParentSendActions student={s} subject={`${category.title} — Progress note`} body={r.draft} config={config} signOff={loggedInTeacher?.messageSignOff} size="small" />
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

async function generateFluencyReport(student, entry, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

function FluencyDetailView({ student, entry, classId, config, loggedInTeacher, sendMessageToFamily, onBack, onLogSent, onUpdateParentEmail }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);
  const hasP2 = Boolean(student?.parent2Email || student?.parent2Phone);
  const [recipientMode, setRecipientMode] = useState("p1");

  const generate = async () => {
    setLoading(true);
    try { setDraft(await generateFluencyReport(student, entry, config, loggedInTeacher)); }
    catch { setDraft("Could not generate — write manually."); }
    finally { setLoading(false); }
  };

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "fluency-report", subject: `Fluency check — ${entry.date}`, body: draft });
    setLogged(true);
  };

  const sendEmails = [
    (recipientMode === "p1" || recipientMode === "both") && email,
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Email,
  ].filter(Boolean).join(", ");
  const sendPhones = [
    (recipientMode === "p1" || recipientMode === "both") && student?.parentPhone && { phone: student.parentPhone, label: student?.parent1Name || "Parent 1" },
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Phone && { phone: student.parent2Phone, label: student?.parent2Name || "Parent 2" },
  ].filter(Boolean);

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
          {hasP2 && (
            <>
              <label className="block text-xs font-medium text-stone-500 mb-1">Send to</label>
              <div className="flex gap-1.5 mb-1">
                {[["p1", student?.parent1Name || "Parent 1"], ["p2", student?.parent2Name || "Parent 2"], ["both", "Both"]].map(([val, label]) => (
                  <button key={val} onClick={() => setRecipientMode(val)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${recipientMode === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 mb-3">{sendEmails ? `Includes: ${sendEmails}` : "No email on file for the parent(s) selected."}</p>
            </>
          )}
          <div className="flex items-start gap-1.5 mb-3">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setLogged(false); }} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => { setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken)); setLogged(false); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
            {sendEmails && <MailActionButtons email={sendEmails} subject={`Fluency check — ${entry.date}`} body={applyMessageDisclaimer(draft, config, null, loggedInTeacher?.messageSignOff)} />}
            <SendInAppButton studentId={student.id} classId={classId} message={draft} sendMessage={sendMessageToFamily} />
            <button onClick={logSent} disabled={logged} className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-2 ${logged ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-stone-600 border border-stone-300 hover:bg-stone-50"}`}>
              {logged ? <Check size={13} /> : null} {logged ? "Logged as sent" : "Log as sent"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function generateSkillReport(student, category, summaryLines, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
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

function SkillDetailView({ student, data, category, classId, config, loggedInTeacher, sendMessageToFamily, onBack, onLogSent, onUpdateParentEmail }) {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);
  const hasP2 = Boolean(student?.parent2Email || student?.parent2Phone);
  const [recipientMode, setRecipientMode] = useState("p1");

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
    try { setDraft(await generateSkillReport(student, category, summaryLines, config, loggedInTeacher)); }
    catch { setDraft("Could not generate — write manually."); }
    finally { setLoading(false); }
  };

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "skill-report", subject: `${category.title} — Progress note`, body: draft });
    setLogged(true);
  };

  const sendEmails = [
    (recipientMode === "p1" || recipientMode === "both") && email,
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Email,
  ].filter(Boolean).join(", ");
  const sendPhones = [
    (recipientMode === "p1" || recipientMode === "both") && student?.parentPhone && { phone: student.parentPhone, label: student?.parent1Name || "Parent 1" },
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Phone && { phone: student.parent2Phone, label: student?.parent2Name || "Parent 2" },
  ].filter(Boolean);

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
          {hasP2 && (
            <>
              <label className="block text-xs font-medium text-stone-500 mb-1">Send to</label>
              <div className="flex gap-1.5 mb-1">
                {[["p1", student?.parent1Name || "Parent 1"], ["p2", student?.parent2Name || "Parent 2"], ["both", "Both"]].map(([val, label]) => (
                  <button key={val} onClick={() => setRecipientMode(val)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${recipientMode === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 mb-3">{sendEmails ? `Includes: ${sendEmails}` : "No email on file for the parent(s) selected."}</p>
            </>
          )}
          <div className="flex items-start gap-1.5 mb-3">
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setLogged(false); }} rows={6} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <MicButton onResult={(spoken) => { setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken)); setLogged(false); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-50"><RefreshCw size={13} /> Regenerate</button>
            {sendEmails && <MailActionButtons email={sendEmails} subject={`${category.title} — Progress note`} body={applyMessageDisclaimer(draft, config, null, loggedInTeacher?.messageSignOff)} />}
            <SendInAppButton studentId={student.id} classId={classId} message={draft} sendMessage={sendMessageToFamily} />
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

async function generateIncidentMessage(student, incident, categoryLabel, othersInvolved, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

// A class-wide announcement — not addressed to one student's parent, but to every parent in the
// class at once — for celebrating a benchmark segment the whole class just finished together.
async function generateSegmentCelebrationMessage(subjectLabel, segmentLabel, config, teacher) {
  const teacherName = teacher?.name;
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
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

// A general-purpose class-wide announcement — the teacher gives a rough topic in their own
// words, and this turns it into a polished, formal notice to every parent at once. Deliberately
// pushes toward a more formal register than buildStyleInstructions' usual tone setting, since a
// broadcast announcement to the whole class reads differently than a warm note about one child —
// while still keeping the class's school-term wording and sign-off consistent with everything else.

// Drafts a reply within an ongoing conversation, given a quick rough note and the recent
// back-and-forth for context — lighter-weight than the topic-based generators used for starting a
// new broadcast, since a reply usually just needs polishing, not a full brief. Teacher replies get
// the same style/sign-off treatment as other teacher-authored messages; parent replies don't, since
// that disclaimer is specifically framed as coming from the school.
// Drafts a polished blog caption from a quick rough note — no conversation context needed here,
// since a caption stands on its own rather than replying to anything, and no disclaimer sign-off
// either, since a blog post is already clearly attributed via the post's own header, unlike a
// direct message which needs to explain who it's automatically from.
async function generateBlogCaption(roughNote, config, teacher) {
  const prompt = `${buildStyleInstructions(config, teacher?.name)}

This is a caption for a photo (or a standalone note) in a class blog post that every family in the class will see — not a private message to one family.

STRICT RULES:
- Use ONLY the information given below. Do not invent specifics that weren't stated.

What the teacher wants to say, in their own rough words: ${roughNote}

Write a short, warm caption — 1-2 sentences. Output only the caption text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}
async function generateStudentTopicMessage(topic, studentNames, config, teacher) {
  const teacherName = teacher?.name;
  const who = studentNames.length === 1 ? studentNames[0] : `${studentNames.slice(0, -1).join(", ")} and ${studentNames[studentNames.length - 1]}`;
  const prompt = `${buildStyleInstructions(config, teacherName)}

This is a message to the parent(s) of ${studentNames.length === 1 ? "one specific student" : "specific students (siblings or otherwise grouped together)"}: ${who}. The teacher is starting from a rough topic, not a specific logged event like an incident or assessment — write it as a genuine personal note to this family.

STRICT RULES:
- Use ONLY the information given below. Do not invent specifics that weren't stated.
- If the topic is vague or missing a detail, write around it naturally rather than inventing one.
- Do not fabricate any events, dates, or details about the student(s) beyond what the teacher wrote.

What this is about, in the teacher's own words: ${topic}

Write a short, warm, clear message — 2-4 sentences. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
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

function IncidentDetailView({ incident, roster, classId, config, plannerDays, loggedInTeacher, sendMessageToFamily, onBack, onLogSent, onUpdateParentEmail, onUpdateIncident, onRemoveIncident }) {
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [drafts, setDrafts] = useState({}); // studentId -> { draft, email, loading, logged }
  const [recipientModes, setRecipientModes] = useState({}); // studentId -> "p1" | "p2" | "both"
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(incident?.category || "");
  const [editDescription, setEditDescription] = useState(incident?.description || "");
  const [lightboxMedia, setLightboxMedia] = useState(null);

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
  // Prefer what's stored directly on the incident itself — preschool-logged incidents carry their
  // own categoryLabel/categoryColor, since their category ids (like "fall-bump") were never part
  // of the elementary catMap above and would otherwise resolve to nothing here.
  const cat = incident.categoryLabel
    ? { label: incident.categoryLabel, color: incident.categoryColor || "cyan" }
    : catMap[incident.category];
  const involvedStudents = (incident.studentIds || []).map((id) => roster.find((s) => s.id === id)).filter(Boolean);

  const generateFor = async (student) => {
    setDrafts((prev) => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), loading: true } }));
    try {
      const text = await generateIncidentMessage(student, incident, cat?.label || incident.category || "Uncategorized", involvedStudents.length - 1, config, loggedInTeacher);
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
          {incident.time && (
            <span className="text-xs text-stone-400">
              Logged at {incident.time}
              {(() => {
                const period = findPeriodAtTime(incident.date, incident.time, config, plannerDays);
                return period ? ` · during ${period}` : "";
              })()}
            </span>
          )}
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

        {incident.media?.length > 0 && (
          <div className={`grid gap-1 mt-3 mb-1 ${incident.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {incident.media.map((m, i) => (
              <div key={i} className="relative aspect-square cursor-pointer" onClick={() => setLightboxMedia({ url: m.url, type: m.type })}>
                {m.type === "video" ? (
                  <>
                    <video src={m.url} muted playsInline className="w-full h-full object-cover rounded-lg pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <div className="bg-white/90 rounded-full p-2"><Play size={14} fill="currentColor" className="text-stone-800 ml-0.5" /></div>
                    </div>
                  </>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover rounded-lg" />
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs font-semibold text-stone-500 uppercase mb-2 mt-3">Students involved</p>
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
                    {Boolean(s.parent2Email || s.parent2Phone) && (
                      <div className="mb-2">
                        <div className="flex gap-1 mb-1">
                          {[["p1", s.parent1Name || "Parent 1"], ["p2", s.parent2Name || "Parent 2"], ["both", "Both"]].map(([val, label]) => {
                            const active = (recipientModes[s.id] || "p1") === val;
                            return (
                              <button key={val} onClick={() => setRecipientModes((prev) => ({ ...prev, [s.id]: val }))}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${active ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-stone-400">
                          {(() => {
                            const mode = recipientModes[s.id] || "p1";
                            const incl = [(mode === "p1" || mode === "both") && d.email, (mode === "p2" || mode === "both") && s.parent2Email].filter(Boolean).join(", ");
                            return incl ? `Includes: ${incl}` : "No email on file for the parent(s) selected.";
                          })()}
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 mb-2">
                      <textarea value={d.draft} onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: e.target.value, logged: false } }))}
                        rows={4} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                      <MicButton onResult={(spoken) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], draft: prev[s.id].draft ? `${prev[s.id].draft} ${spoken}` : spoken, logged: false } }))} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => generateFor(s)} className="flex items-center gap-1 text-[10px] font-semibold text-stone-600 border border-stone-300 rounded-lg px-2 py-1 hover:bg-stone-50"><RefreshCw size={11} /> Regenerate</button>
                      {(() => {
                        const mode = recipientModes[s.id] || "p1";
                        const sendEmails = [
                          (mode === "p1" || mode === "both") && d.email,
                          (mode === "p2" || mode === "both") && s.parent2Email,
                        ].filter(Boolean).join(", ");
                        const sendPhones = [
                          (mode === "p1" || mode === "both") && s.parentPhone && { phone: s.parentPhone, label: s.parent1Name || "Parent 1" },
                          (mode === "p2" || mode === "both") && s.parent2Phone && { phone: s.parent2Phone, label: s.parent2Name || "Parent 2" },
                        ].filter(Boolean);
                        return (
                          <>
                            {sendEmails && <MailActionButtons email={sendEmails} subject={`About ${s.name} — ${cat?.label || incident.category || "Uncategorized"}`} body={applyMessageDisclaimer(d.draft, config, null, loggedInTeacher?.messageSignOff)} size="small" />}
                            <SendInAppButton studentId={s.id} classId={classId} message={d.draft} sendMessage={sendMessageToFamily}
                              className="flex items-center gap-1 text-[10px] font-semibold text-white bg-teal-700 rounded-lg px-2 py-1 hover:bg-teal-800" />
                          </>
                        );
                      })()}
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
      {lightboxMedia && (
        <PhotoLightbox url={lightboxMedia.url} type={lightboxMedia.type} onClose={() => setLightboxMedia(null)} />
      )}
    </div>
  );
}

// ---------- Planner ----------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PlannerView({ config, plannerDays, plannerEvents, navigate, setPlannerDay, clearPlannerDayType, bulkSetByWeekday, bulkSetByRange, addPlannerEvent, removePlannerEvent, importSchoolCalendar, benchmarkSubjects, addBenchmarkSubject, removeBenchmarkSubject, addBenchmarkSegment, addBenchmarkSegmentBySubjectLabel, updateBenchmarkSegment, removeBenchmarkSegment, toggleSubjectHiddenFromPlanner }) {
  const { classType } = useContext(ClassContext);
  const isPreschool = classType === "preschool";
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
        {!isPreschool && (
          <button onClick={() => setSubTab("benchmarks")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${subTab === "benchmarks" ? "bg-white text-teal-700 shadow-sm" : "text-stone-500"}`}>Benchmarks</button>
        )}
      </div>

      {subTab === "benchmarks" && !isPreschool ? (
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
  // Separate from showDocImport above (which is the per-subject one, opened from inside a
  // specific subject's own detail view) — this is the top-level version, for a single document
  // that covers several subjects at once and needs to say, per benchmark, which one it's for.
  const [showTopLevelImport, setShowTopLevelImport] = useState(false);
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
  const [expandedSegId, setExpandedSegId] = useState(null); // which segment's imported lesson list is shown, if any

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
  // The specific lesson entry (if any) for one exact date, drilling from segment down into its own
  // lessons array — separate from segmentForDate above since a segment covers a whole date RANGE,
  // while this needs to know what was actually said about this one particular day within it.
  const lessonForDate = (dateStr) => {
    const seg = segmentForDate(dateStr);
    return seg?.lessons?.find((l) => l.date === dateStr) || null;
  };
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  const calMonthIdx0 = yearStart.getMonth() + calMonthOffset;
  const calYear = yearStart.getFullYear() + Math.floor(calMonthIdx0 / 12);
  const calMonthIdx = ((calMonthIdx0 % 12) + 12) % 12;
  const calGrid = buildMonthGrid(calYear, calMonthIdx);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold text-stone-800">{yearStart.getFullYear()}–{yearStart.getFullYear() + 1} school year</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowTopLevelImport((v) => !v)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showTopLevelImport ? "bg-teal-700 text-white border-teal-700" : "text-teal-700 border-teal-300"}`}>
            <Upload size={12} /> Import benchmarks from a file
          </button>
          <button onClick={() => setShowAddSubject(true)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed ${showAddSubject ? "bg-teal-700 text-white border-teal-700" : "text-teal-700 border-teal-300"}`}>
            <Plus size={12} /> Track something else
          </button>
        </div>
      </div>

      {showTopLevelImport && (
        <div className="mb-5 md:w-[28rem]">
          <DocumentImportPanel mode="benchmark"
            onApplyBenchmark={(items) => {
              // Per-subject color progression, tracked across this whole batch — otherwise every
              // brand-new subject discovered in the same document would start its very first
              // segment at the same color, and a subject that already has segments would ignore
              // how many it's got and restart from the beginning of the color list too. Only
              // actually used as a fallback now — extracted color from the document itself always
              // wins when the source had real color-coding to preserve.
              const usedCounts = {};
              items.filter((it) => it.subject && it.subject.trim()).forEach((it) => {
                const subjKey = it.subject.trim().toLowerCase();
                const existingSubj = subjects.find((s) => s.label.trim().toLowerCase() === subjKey);
                const baseCount = existingSubj?.segments.length || 0;
                const usedSoFar = usedCounts[subjKey] || 0;
                usedCounts[subjKey] = usedSoFar + 1;
                const newSeg = {
                  label: it.label, startDate: it.start, endDate: it.end,
                  color: it.color || COLOR_CHOICES[(baseCount + usedSoFar) % COLOR_CHOICES.length],
                  lessons: it.lessons || [],
                };
                addSegmentBySubjectLabel(it.subject.trim(), newSeg);
              });
            }}
            onClose={() => setShowTopLevelImport(false)} />
        </div>
      )}

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
                    const lesson = lessonForDate(d);
                    const kind = scheduleKindForDate(d, plannerDays, dayTypes);
                    const dayNum = Number(d.slice(-2));
                    const colorClass = !seg || kind === "none"
                      ? "bg-white text-stone-400"
                      : kind === "half"
                        ? `bg-${seg.color}-200 text-stone-700`
                        : `bg-${seg.color}-400 text-white`;
                    // Tappable, not just a hover title — a hover-only tooltip is effectively
                    // invisible on a phone, which is where this actually needs to work. The small
                    // dot marks which days have an actual lesson entry worth tapping into, so it's
                    // clear at a glance where there's more to see before tapping anything.
                    return (
                      <button key={d} onClick={() => setSelectedCalDay(selectedCalDay === d ? null : d)}
                        className={`relative aspect-square rounded-lg text-[10px] font-semibold flex items-center justify-center ${colorClass} ${selectedCalDay === d ? "ring-2 ring-offset-1 ring-stone-500" : ""}`}>
                        {dayNum}
                        {kind === "none" && <span className="absolute -top-0.5 -right-0.5 text-stone-300 text-[8px]">•</span>}
                        {lesson && <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${kind === "half" ? "bg-stone-600" : "bg-white"}`} />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-stone-400 mt-2">Solid = full school day in a benchmark, light = half day, blank = no school. Tap a day for its lesson.</p>
                {selectedCalDay && (() => {
                  const seg = segmentForDate(selectedCalDay);
                  const lesson = lessonForDate(selectedCalDay);
                  return (
                    <div className="mt-2 bg-white border border-stone-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-stone-400">{selectedCalDay}</p>
                      {lesson ? (
                        <p className="text-xs text-stone-700 mt-0.5">{lesson.title}</p>
                      ) : seg ? (
                        <p className="text-xs text-stone-500 mt-0.5 italic">Part of {seg.label} — no specific lesson text for this day.</p>
                      ) : (
                        <p className="text-xs text-stone-400 mt-0.5 italic">No benchmark scheduled for this day.</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Segments</p>
            <ul className="space-y-1.5 mb-4">
              {active.segments.length === 0 && <li className="text-xs text-stone-400">No segments yet — add your first benchmark period below.</li>}
              {active.segments.map((seg) => (
                <li key={seg.id} className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <button onClick={() => openEditSegment(seg)} className="flex items-center gap-2 text-left hover:opacity-70 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full bg-${seg.color}-400 shrink-0`} />
                      <span className="font-medium text-stone-700 truncate">{seg.label}</span>
                      <span className="text-stone-400 shrink-0">{seg.startDate} → {seg.endDate}</span>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {seg.lessons && seg.lessons.length > 0 && (
                        <button onClick={() => setExpandedSegId(expandedSegId === seg.id ? null : seg.id)} className="text-[11px] font-semibold text-teal-700 hover:underline">
                          {seg.lessons.length} lesson{seg.lessons.length === 1 ? "" : "s"} {expandedSegId === seg.id ? "▲" : "▼"}
                        </button>
                      )}
                      <ConfirmDelete onConfirm={() => removeSegment(active.benchmarkSubjectId, seg.id)} size={13} />
                    </div>
                  </div>
                  {/* Read-only here — this is for seeing what got imported, not re-editing it after
                      the fact. Adjusting a lesson title or date is what the review step during
                      import is for, while the information is still fresh and easy to compare
                      against the source document; this is just the record of what was confirmed. */}
                  {expandedSegId === seg.id && seg.lessons && (
                    <ul className="mt-2 pl-4 border-l-2 border-stone-200 space-y-0.5">
                      {seg.lessons.map((l) => (
                        <li key={l.id} className="flex items-baseline gap-2 text-[11px] text-stone-500">
                          <span className="text-stone-400 shrink-0">{l.date}</span>
                          <span className="truncate">{l.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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
              <DocumentImportPanel mode="benchmark" destinationLabel={active.label} existingSegments={active.segments}
                onApplyBenchmark={(items) => {
                  items.forEach((it, i) => {
                    const newSeg = {
                      label: it.label, startDate: it.start, endDate: it.end,
                      color: it.color || COLOR_CHOICES[(active.segments.length + i) % COLOR_CHOICES.length],
                      lessons: it.lessons || [],
                    };
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

function DocumentImportPanel({ mode, dayTypeOptions, destinationLabel, existingSegments, onApplyCalendar, onApplyBenchmark, onClose }) {
  const [rawText, setRawText] = useState("");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState(null); // null = not extracted yet
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null); // which item's lesson list is open, if any

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

  // A subject-per-item field is only requested when destinationLabel isn't given — that's the
  // "many subjects at once" case (the top-level import), where the document is expected to cover
  // several subjects and each benchmark needs to say which one it belongs to. When destinationLabel
  // IS given (the per-subject import, opened from inside one specific subject), everything found
  // is already known to belong there, so asking the model to also guess a subject name would just
  // be a chance to get it wrong for no benefit.
  const multiSubject = mode === "benchmark" && !destinationLabel;
  const extract = async () => {
    setExtracting(true); setError(""); setItems(null);
    try {
      // The exact 9 names the app's own color palette supports — anything else silently fails to
      // render at all (a build-time Tailwind constraint, not a runtime choice), so the model is
      // told the closed list directly rather than allowed to invent shades of its own.
      const colorNames = COLOR_CHOICES.join(", ");
      const lessonSchemaNote = `Read through the ENTIRE document, every page — do not stop partway through, even if it's long. Extract EVERY individual dated lesson or activity entry, not just a summary of the ranges. For each one, capture its own date and a short title. If the document uses color-coding (distinct background or text colors per entry — this only applies to an actual visual document like a PDF, never to plain text), map each color you see to the single closest name from this exact list: ${colorNames}. Entries that share a visual color must get the same mapped name; omit "color" entirely for any entry with no visible color-coding. Then GROUP the individual dated entries into logical segments — a segment is a unit, week, or pacing period that several consecutive, related entries belong to (contiguous dates, matching color, and/or a shared topic in their titles are all signals of the same segment). Every single dated entry in the document must end up inside some segment's "lessons" array — none should be dropped or summarized away.`;
      const instructions = mode === "calendar"
        ? `Extract every distinct date range and its school status from this document. Valid statuses are exactly: ${dayTypeOptions.map((t) => t.id).join(", ")}. Infer the closest matching status from context (a holiday or break = "no-school", an early dismissal = "half-day" if that option exists, a late start = "late-start" if that option exists, otherwise pick the closest available option). Output ONLY a JSON array, no other text, no markdown fences: [{"start":"YYYY-MM-DD","end":"YYYY-MM-DD","status":"...","label":"short description"}]. Use the same date for "start" and "end" if it's a single day.`
        : multiSubject
          ? `This document covers pacing/benchmarks for MULTIPLE different subjects. ${lessonSchemaNote} Also identify which subject each segment belongs to. Output ONLY a JSON array, no other text, no markdown fences, in exactly this shape: [{"subject":"short subject name, e.g. Math or Chumash","label":"short name of this unit/segment, e.g. Unit 3: Fractions","start":"YYYY-MM-DD","end":"YYYY-MM-DD","color":"one of the exact names above, or omit","lessons":[{"date":"YYYY-MM-DD","title":"short lesson title"}]}]`
          : `${lessonSchemaNote} Output ONLY a JSON array, no other text, no markdown fences, in exactly this shape: [{"label":"short name of this unit/segment, e.g. Unit 3: Fractions","start":"YYYY-MM-DD","end":"YYYY-MM-DD","color":"one of the exact names above, or omit","lessons":[{"date":"YYYY-MM-DD","title":"short lesson title"}]}]`;
      const content = pdfBase64
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } }, { type: "text", text: instructions }]
        : `${instructions}\n\nDocument text:\n${rawText}`;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: await authHeaders(),
        // A full school year of individual dated lessons, each nested inside its own segment, can
        // run well past what the old 2000-token ceiling allowed — that ceiling cut the response off
        // mid-document, which is exactly what read as "only extracting from the first page" (the
        // model saw everything; its own answer just got truncated before it could list the rest).
        // 16000 comfortably covers even a detailed full-year calendar, and there's no cost or
        // rate-limit downside to leaving real headroom unused when a document is shorter.
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 16000, messages: [{ role: "user", content }] }),
      });
      const data = await response.json();
      const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
      const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      // A response that was itself cut off mid-generation (hitting even the raised ceiling on a
      // truly enormous document) fails JSON.parse below with a clear signal here, rather than
      // silently keeping whatever partial array text happened to parse — better to tell the
      // teacher honestly than to quietly hand back an incomplete import.
      if (data.stop_reason === "max_tokens") {
        setError("This document is larger than one pass can fully read — try splitting it into smaller files (e.g. one per term) and importing each separately.");
        return;
      }
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || parsed.length === 0) { setError("Nothing recognizable was found in this document."); setItems(null); }
      else setItems(parsed.map((p) => ({
        ...p,
        id: uid(),
        color: COLOR_CHOICES.includes(p.color) ? p.color : null, // null = not extracted, gets auto-assigned on apply
        lessons: (p.lessons || []).map((l) => ({ ...l, id: uid() })),
      })));
    } catch (e) {
      setError("Could not read this document — try pasting the text directly instead.");
    } finally {
      setExtracting(false);
    }
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id, field, value) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  const updateLesson = (itemId, lessonId, field, value) => setItems((prev) => prev.map((i) => (
    i.id !== itemId ? i : { ...i, lessons: i.lessons.map((l) => (l.id === lessonId ? { ...l, [field]: value } : l)) }
  )));
  const removeLesson = (itemId, lessonId) => setItems((prev) => prev.map((i) => (
    i.id !== itemId ? i : { ...i, lessons: i.lessons.filter((l) => l.id !== lessonId) }
  )));
  const addLesson = (itemId) => setItems((prev) => prev.map((i) => (
    i.id !== itemId ? i : { ...i, lessons: [...i.lessons, { id: uid(), date: i.start || todayISO(), title: "" }] }
  )));

  // Two existing segments overlap this new one if either's start falls inside the other's range —
  // the standard interval-overlap check. Flagged here, in the same editable review list the
  // teacher's already using, rather than a separate merge screen: nudging a date by a day or two
  // to resolve it is the same edit they'd already make for a typo, not a different kind of action
  // that needs its own UI.
  const overlappingExisting = (item) => {
    if (!existingSegments || !item.start || !item.end) return null;
    return existingSegments.find((s) => item.start <= s.endDate && item.end >= s.startDate) || null;
  };

  const apply = () => {
    if (mode === "calendar") onApplyCalendar(items);
    else onApplyBenchmark(items);
    onClose();
  };

  return (
    <div className="bg-white border border-teal-200 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-stone-800 mb-1">Import from a document</p>
      <p className="text-xs text-stone-400 mb-3">
        Paste the text, or upload a plain text/CSV file or a PDF.
        {destinationLabel ? <> Whatever's found will be added to <strong className="text-stone-600">{destinationLabel}</strong>'s benchmark segments — nothing else, and nothing is applied until you review it below.</> : " Nothing is applied until you review it below."}
      </p>

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
          <p className="text-xs font-semibold text-stone-500 uppercase mb-2">
            Review before applying — {items.length} found{destinationLabel ? <> for <span className="normal-case font-semibold text-teal-700">{destinationLabel}</span></> : ""}
          </p>
          <ul className="space-y-1.5 mb-3 max-h-96 overflow-y-auto">
            {items.map((it) => {
              const conflict = overlappingExisting(it);
              const isExpanded = expandedId === it.id;
              return (
              <li key={it.id} className={`bg-stone-50 rounded-lg p-2 ${conflict ? "border border-amber-300" : ""}`}>
                {multiSubject && (
                  <input value={it.subject} onChange={(e) => updateItem(it.id, "subject", e.target.value)} placeholder="Subject"
                    className="w-full rounded border border-teal-200 bg-white px-2 py-1 text-xs font-semibold text-teal-700 mb-1.5" />
                )}
                <div className="flex items-center gap-1.5">
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
                </div>

                {mode === "benchmark" && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Color swatches — the exact 9 the app can actually render, so whatever the
                        model picked (or the teacher picks by hand) is always a real, working
                        choice, never an arbitrary shade that would silently fail to show up. */}
                    <div className="flex items-center gap-1">
                      {COLOR_CHOICES.map((c) => (
                        <button key={c} onClick={() => updateItem(it.id, "color", c)} title={c}
                          className={`w-4 h-4 rounded-full bg-${c}-500 ${it.color === c ? "ring-2 ring-offset-1 ring-stone-400" : "opacity-50 hover:opacity-100"}`} />
                      ))}
                    </div>
                    {it.lessons && it.lessons.length > 0 && (
                      <button onClick={() => setExpandedId(isExpanded ? null : it.id)} className="text-[11px] font-semibold text-teal-700 hover:underline">
                        {isExpanded ? "Hide" : "Show"} {it.lessons.length} lesson{it.lessons.length === 1 ? "" : "s"} {isExpanded ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                )}

                {conflict && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 mt-1.5">
                    Overlaps existing <strong>{conflict.label}</strong> ({conflict.startDate} → {conflict.endDate}) — adjust the dates above to resolve, or leave as-is to keep both.
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-2 pl-2 border-l-2 border-stone-200 space-y-1">
                    {it.lessons.map((l) => (
                      <div key={l.id} className="flex items-center gap-1.5">
                        <input type="date" value={l.date} onChange={(e) => updateLesson(it.id, l.id, "date", e.target.value)} className="rounded border border-stone-200 px-1.5 py-1 text-[11px]" />
                        <input value={l.title} onChange={(e) => updateLesson(it.id, l.id, "title", e.target.value)} placeholder="Lesson title" className="flex-1 rounded border border-stone-200 px-2 py-1 text-[11px]" />
                        <button onClick={() => removeLesson(it.id, l.id)} className="text-stone-300 hover:text-red-500 shrink-0"><Trash2 size={11} /></button>
                      </div>
                    ))}
                    <button onClick={() => addLesson(it.id)} className="text-[11px] font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={11} /> Add lesson</button>
                  </div>
                )}
              </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <button onClick={apply} disabled={items.length === 0} className="flex-1 bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {destinationLabel
                ? `Add ${items.length} item${items.length === 1 ? "" : "s"} to ${destinationLabel}`
                : multiSubject
                  ? `Add ${items.length} benchmark${items.length === 1 ? "" : "s"} across ${new Set(items.map((i) => i.subject.trim().toLowerCase()).filter(Boolean)).size} subject${new Set(items.map((i) => i.subject.trim().toLowerCase()).filter(Boolean)).size === 1 ? "" : "s"}`
                  : `Apply ${items.length} item${items.length === 1 ? "" : "s"}`}
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

// Replaces the old "named templates + weekday mapping" schedule system with a direct, visual
// weekly grid — drag a block to shift it, drag its bottom edge to resize it, tap to rename it. A
// form adds a period once and stamps it across whichever days it applies to; dragging afterward
// is how an individual day gets fine-tuned. Used by both class types — only elementary links a
// period's label to a real, trackable subject.
const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SCHED_DAY_START = 7 * 60;
const SCHED_DAY_END = 16 * 60;
const SCHED_SLOT_MIN = 5;
// Was 2 — bumped up so a real, fully-packed school day (ten-plus short back-to-back periods)
// gives each block enough vertical room for its full label and time range without the two
// wrapping into and visually colliding with each other. The whole grid simply runs longer/scrolls
// more as a result, trading some overview-at-a-glance for actually being legible once it's busy.
const SCHED_PX_PER_MIN = 3;
const SCHED_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const SCHED_MIN_DURATION = 10;
// A compact start–end format for the schedule grid specifically, where every character of width
// counts: drops the redundant trailing AM/PM off the start time when both ends of the range fall
// on the same side of noon (the overwhelmingly common case for any one period), and uses a single
// lowercase letter instead of the full "AM"/"PM" — "7:45–8:15a" instead of "7:45 AM – 8:15 AM".
// formatTime12h itself is left untouched since it's used in plenty of places outside this tight
// grid where the fuller format reads better.
function formatScheduleRange(startHHMM, endHHMM) {
  const start = formatTime12h(startHHMM);
  const end = formatTime12h(endHHMM);
  const startPeriod = start.slice(-2);
  const endPeriod = end.slice(-2);
  const startShort = startPeriod === endPeriod ? start.slice(0, -3) : start.replace(" AM", "a").replace(" PM", "p");
  const endShort = end.replace(" AM", "a").replace(" PM", "p");
  return `${startShort}–${endShort}`;
}

function WeeklyScheduleEditor({ config, persistConfig, classType }) {
  const isElementary = classType !== "preschool";
  const [blocks, setBlocks] = useState(() => config.planner?.scheduleBlocks || migrateSchedulesToBlocks(config));
  const migratedRef = useRef(false);

  // Persist a freshly-migrated result immediately, once — otherwise reloading before the first
  // edit would silently re-run the migration from the old, now-stale schedules data instead of
  // picking up from where the migration already left off.
  useEffect(() => {
    if (!config.planner?.scheduleBlocks && !migratedRef.current) {
      migratedRef.current = true;
      persistConfig({ ...config, planner: { ...config.planner, scheduleBlocks: blocks } });
    }
  }, []); // eslint-disable-line

  const persistBlocks = (next, subjectsPatch) => {
    setBlocks(next);
    const nextConfig = { ...config, planner: { ...config.planner, scheduleBlocks: next } };
    if (subjectsPatch) nextConfig.subjects = subjectsPatch;
    persistConfig(nextConfig);
  };
  const updateBlockLocal = (id, patch) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const deleteBlock = (id) => { persistBlocks(blocks.filter((b) => b.id !== id)); setEditingId(null); };
  // Same subject added for "every day" (or several days at once) becomes several independent
  // blocks, one per day — removing just one, as deleteBlock above does, is correct when that's
  // genuinely what's wanted, but it leaves the same subject sitting on every other day, which can
  // look exactly like deleting silently failed if what was actually wanted was to clear it off the
  // whole week. This removes every block that shares the tapped one's label, in one action.
  const deleteBlockAllDays = (label) => { persistBlocks(blocks.filter((b) => b.label !== label)); setEditingId(null); };

  const [draggingId, setDraggingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("09:30");
  const dragState = useRef(null);

  const onPointerDown = (e, block) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { id: block.id, pointerId: e.pointerId, mode: "move", startY: e.clientY, originalStart: block.start, duration: block.end - block.start, moved: false };
    setDraggingId(block.id);
  };
  const onResizePointerDown = (e, block) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { id: block.id, pointerId: e.pointerId, mode: "resize", startY: e.clientY, originalStart: block.start, originalEnd: block.end, moved: false };
    setDraggingId(block.id);
  };
  const computePatch = (ds, clientY) => {
    const deltaY = clientY - ds.startY;
    const snappedDelta = Math.round((deltaY / SCHED_PX_PER_MIN) / SCHED_SLOT_MIN) * SCHED_SLOT_MIN;
    if (ds.mode === "resize") {
      let newEnd = ds.originalEnd + snappedDelta;
      newEnd = Math.max(ds.originalStart + SCHED_MIN_DURATION, Math.min(SCHED_DAY_END, newEnd));
      return { end: newEnd };
    }
    let newStart = ds.originalStart + snappedDelta;
    newStart = Math.max(SCHED_DAY_START, Math.min(SCHED_DAY_END - ds.duration, newStart));
    return { start: newStart, end: newStart + ds.duration };
  };
  const onPointerMove = (e) => {
    const ds = dragState.current;
    if (!ds || e.pointerId !== ds.pointerId) return;
    if (Math.abs(e.clientY - ds.startY) > 4) ds.moved = true;
    updateBlockLocal(ds.id, computePatch(ds, e.clientY));
  };
  const onPointerUp = (e) => {
    const ds = dragState.current;
    if (!ds || e.pointerId !== ds.pointerId) return;
    if (!ds.moved) {
      const block = blocks.find((b) => b.id === ds.id);
      setEditingId(ds.id);
      setEditValue(block.label);
      setEditStart(minutesToTime(block.start));
      setEditEnd(minutesToTime(block.end));
    } else {
      const patch = computePatch(ds, e.clientY);
      persistBlocks(blocks.map((b) => (b.id === ds.id ? { ...b, ...patch } : b)));
    }
    dragState.current = null;
    setDraggingId(null);
  };
  const [editError, setEditError] = useState("");
  // The typed-time counterpart to dragging a block — same end result (a new start/end on the one
  // block being edited), just reachable without touching the calendar grid at all, which dragging
  // on a phone screen can be fiddly to land precisely.
  const commitEdit = () => {
    if (!editingId || !editValue.trim()) { setEditError("Give this period a name first."); return; }
    const s = timeToMinutes(editStart), e = timeToMinutes(editEnd);
    if (e == null || s == null || e <= s) { setEditError("End time has to be after the start time."); return; }
    const timePatch = { start: s, end: e };
    if (isElementary) {
      const block = blocks.find((b) => b.id === editingId);
      const { subjectId, nextSubjects } = resolveSubjectForLabel(editValue, config.subjects || [], block.trackAsSubject !== false);
      persistBlocks(blocks.map((b) => (b.id === editingId ? { ...b, label: editValue.trim(), subjectId, ...timePatch } : b)), nextSubjects);
    } else {
      persistBlocks(blocks.map((b) => (b.id === editingId ? { ...b, label: editValue.trim(), ...timePatch } : b)));
    }
    setEditingId(null);
    setEditError("");
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("09:30");
  const [newDays, setNewDays] = useState([false, false, false, false, false]);
  const [newTrackAsSubject, setNewTrackAsSubject] = useState(true);
  const [addError, setAddError] = useState("");

  const openAddForm = () => {
    const latestEnd = blocks.length ? Math.max(...blocks.map((b) => b.end)) : SCHED_DAY_START;
    setNewStart(minutesToTime(latestEnd));
    setNewEnd(minutesToTime(Math.min(latestEnd + 30, SCHED_DAY_END)));
    setNewLabel(""); setNewDays([false, false, false, false, false]); setNewTrackAsSubject(true); setAddError("");
    setShowAddForm(true);
  };
  const submitNewPeriod = () => {
    if (!newLabel.trim()) { setAddError("Give this period a name first."); return; }
    const s = timeToMinutes(newStart), e = timeToMinutes(newEnd);
    if (e == null || s == null || e <= s) { setAddError("End time has to be after the start time."); return; }
    if (!newDays.some(Boolean)) { setAddError("Pick at least one day."); return; }
    let subjectId = null;
    let nextSubjects = config.subjects || [];
    if (isElementary) {
      const resolved = resolveSubjectForLabel(newLabel, nextSubjects, newTrackAsSubject);
      subjectId = resolved.subjectId;
      nextSubjects = resolved.nextSubjects;
    }
    const usedColors = new Set(blocks.map((b) => b.color));
    const color = SCHEDULE_BLOCK_COLORS.find((c) => !usedColors.has(c)) || SCHEDULE_BLOCK_COLORS[blocks.length % SCHEDULE_BLOCK_COLORS.length];
    const additions = newDays
      .map((on, dayIdx) => (on ? { id: uid(), day: dayIdx, label: newLabel.trim(), color, start: s, end: e, subjectId, trackAsSubject: newTrackAsSubject } : null))
      .filter(Boolean);
    persistBlocks([...blocks, ...additions], isElementary ? nextSubjects : undefined);
    setShowAddForm(false);
  };

  const allNewDaysOn = newDays.every(Boolean);
  const totalMin = SCHED_DAY_END - SCHED_DAY_START;

  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">Drag a block to shift its time, or drag its bottom edge to resize it. Tap a block to rename, retype its time, or remove it.</p>

      {!showAddForm ? (
        <button onClick={openAddForm} className="w-full mb-3 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">
          + Add period
        </button>
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-3 space-y-2">
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={isElementary ? "Subject / period (e.g. Reading, Lunch)" : "Period (e.g. Snack, Circle Time)"}
            list={isElementary ? "sched-label-options" : undefined}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          {isElementary && (
            <datalist id="sched-label-options">
              {(config.subjects || []).map((s) => <option key={s.id} value={s.label} />)}
              {SCHEDULE_BLOCK_LIBRARY.map((b) => <option key={b} value={b} />)}
            </datalist>
          )}
          <div className="flex gap-2 items-center">
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            <span className="text-xs text-stone-400">to</span>
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setNewDays(newDays.map(() => !allNewDaysOn))} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${allNewDaysOn ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-600 border-stone-300"}`}>
              Every day
            </button>
            {SCHEDULE_DAYS.map((d, i) => (
              <button key={d} onClick={() => setNewDays((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${newDays[i] ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-600 border-stone-300"}`}>
                {d}
              </button>
            ))}
          </div>
          {isElementary && (
            <label className="flex items-center gap-1.5 text-xs text-stone-500">
              <input type="checkbox" checked={newTrackAsSubject} onChange={(e) => setNewTrackAsSubject(e.target.checked)} />
              Track as a subject (links to benchmarks — turn off for things like lunch or recess)
            </label>
          )}
          {addError && <p className="text-xs text-rose-600">{addError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={submitNewPeriod} className="text-xs font-bold text-white bg-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-800">Add</button>
            <button onClick={() => setShowAddForm(false)} className="text-xs font-semibold text-stone-500 px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: "34px repeat(5, 1fr)" }}>
          <div />
          {SCHEDULE_DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-stone-500 py-1.5 border-b border-stone-100">{d}</div>
          ))}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: "34px repeat(5, 1fr)", height: totalMin * SCHED_PX_PER_MIN }}>
          <div className="relative border-r border-stone-100">
            {SCHED_HOURS.map((h) => (
              <div key={h} className="absolute text-[9px] text-stone-400 -translate-y-1/2" style={{ top: (h * 60 - SCHED_DAY_START) * SCHED_PX_PER_MIN, right: 3 }}>
                {h > 12 ? h - 12 : h}
              </div>
            ))}
          </div>
          {SCHEDULE_DAYS.map((_, dayIdx) => (
            <div key={dayIdx} className="relative border-r border-stone-100 last:border-r-0">
              {SCHED_HOURS.map((h) => (
                <div key={h} className="absolute w-full border-t border-stone-100" style={{ top: (h * 60 - SCHED_DAY_START) * SCHED_PX_PER_MIN }} />
              ))}
              {blocks.filter((b) => b.day === dayIdx).map((b) => {
                const st = TILE_STYLES[b.color] || TILE_STYLES.teal;
                const isDragging = draggingId === b.id;
                return (
                  <div key={b.id}
                    onPointerDown={(e) => onPointerDown(e, b)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{
                      position: "absolute", top: (b.start - SCHED_DAY_START) * SCHED_PX_PER_MIN,
                      height: Math.max((b.end - b.start) * SCHED_PX_PER_MIN, 34), left: 2, right: 2,
                      touchAction: "none", cursor: "grab", zIndex: isDragging ? 20 : 1,
                    }}
                    className={`rounded-md border ${st.tileBorder} ${st.tileBg} px-1.5 py-0.5 select-none ${isDragging ? "shadow-md" : ""}`}
                  >
                    <p className={`text-[11px] font-semibold ${st.labelText} leading-tight line-clamp-2 break-words`}>{b.label}</p>
                    <p className={`text-[10px] ${st.labelText} opacity-70 leading-tight whitespace-nowrap`}>
                      {isDragging ? formatTime12h(minutesToTime(b.start)) : formatScheduleRange(minutesToTime(b.start), minutesToTime(b.end))}
                    </p>
                    <div onPointerDown={(e) => onResizePointerDown(e, b)}
                      style={{ position: "absolute", left: 0, right: 0, bottom: -4, height: 12, cursor: "ns-resize", touchAction: "none" }}
                      className="flex items-end justify-center pb-0.5">
                      <div className={`w-6 h-[3px] rounded-full ${st.tileBorder.replace("border-", "bg-")}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {editingId && (() => {
        const block = blocks.find((b) => b.id === editingId);
        if (!block) return null;
        const sameLabelCount = blocks.filter((b) => b.label === block.label).length;
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setEditingId(null); setEditError(""); }}>
            <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-stone-400 mb-2">{SCHEDULE_DAYS[block.day]}</p>
              <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                list={isElementary ? "sched-label-options" : undefined}
                placeholder={isElementary ? "Subject / period" : "Period"}
                className="w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm mb-2" />
              <div className="flex gap-2 items-center mb-2">
                <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-2.5 py-2 text-sm" />
                <span className="text-xs text-stone-400">to</span>
                <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="flex-1 rounded-lg border border-stone-300 px-2.5 py-2 text-sm" />
              </div>
              {editError && <p className="text-xs text-rose-600 mb-2">{editError}</p>}
              <button onClick={commitEdit} className="w-full text-sm font-bold text-white bg-teal-700 rounded-lg py-2 hover:bg-teal-800 mb-3">Save</button>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-100">
                <ConfirmDelete onConfirm={() => deleteBlock(block.id)}
                  label={`Remove from ${SCHEDULE_DAYS[block.day]} only`} className="text-xs text-rose-600 hover:text-rose-800 text-left" size={13} />
                {sameLabelCount > 1 && (
                  <ConfirmDelete onConfirm={() => deleteBlockAllDays(block.label)}
                    label={`Remove "${block.label}" from all ${sameLabelCount} days`} className="text-xs text-rose-600 hover:text-rose-800 text-left" size={13} />
                )}
              </div>
              <button onClick={() => { setEditingId(null); setEditError(""); }} className="w-full text-xs font-semibold text-stone-400 mt-3">Cancel</button>
            </div>
          </div>
        );
      })()}
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

// A separate component from PeriodListEditor on purpose — that one is still shared with Half Day
// templates, which stay untouched, so this doesn't retrofit color-coding onto something that
// needs to keep working exactly as it did. Each period is its own color-coded card, editable
// inline, with the same per-period notes field the regular (non-override) day view already has —
// customizing a day still means seeing and planning that day, not just editing a list.
function DayOverrideScheduleEditor({ periods, onChange, slotDrafts, setSlotDrafts, saveSlot, subjects }) {
  const updatePeriod = (i, field, value) => onChange(periods.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  const movePeriod = (i, dir) => { const next = [...periods]; [next[i], next[i + dir]] = [next[i + dir], next[i]]; onChange(next); };
  const removePeriod = (i) => onChange(periods.filter((_, idx) => idx !== i));
  const addPeriod = () => {
    const usedColors = new Set(periods.map((p) => p.color));
    const color = SCHEDULE_BLOCK_COLORS.find((c) => !usedColors.has(c)) || SCHEDULE_BLOCK_COLORS[periods.length % SCHEDULE_BLOCK_COLORS.length];
    const lastEnd = periods.length ? periods[periods.length - 1].endTime : "09:00";
    onChange([...periods, { id: uid(), label: "New period", startTime: lastEnd, endTime: minutesToTime(Math.min(timeToMinutes(lastEnd) + 30, 23 * 60)), color }]);
  };

  return (
    <div>
      <datalist id="day-override-label-options">
        {(subjects || []).map((s) => <option key={s.id} value={s.label} />)}
        {SCHEDULE_BLOCK_LIBRARY.map((b) => <option key={b} value={b} />)}
      </datalist>
      <div className="space-y-2">
        {periods.map((slot, i) => {
          const st = TILE_STYLES[slot.color] || TILE_STYLES.teal;
          return (
            <div key={slot.id} className={`rounded-lg border ${st.tileBorder} ${st.tileBg} p-2`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <input value={slot.label} onChange={(e) => updatePeriod(i, "label", e.target.value)} placeholder="Subject / period" list="day-override-label-options"
                  className={`flex-1 rounded-lg border border-white/60 bg-white/70 px-2 py-1.5 text-sm font-semibold ${st.labelText}`} />
                <input type="time" value={slot.startTime} onChange={(e) => updatePeriod(i, "startTime", e.target.value)} className="rounded-lg border border-white/60 bg-white/70 px-2 py-1.5 text-xs" />
                <span className="text-stone-400 text-xs">–</span>
                <input type="time" value={slot.endTime} onChange={(e) => updatePeriod(i, "endTime", e.target.value)} className="rounded-lg border border-white/60 bg-white/70 px-2 py-1.5 text-xs" />
                <button disabled={i === 0} onClick={() => movePeriod(i, -1)} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronUp size={13} /></button>
                <button disabled={i === periods.length - 1} onClick={() => movePeriod(i, 1)} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 p-1"><ChevronDown size={13} /></button>
                <ConfirmDelete onConfirm={() => removePeriod(i)} size={13} />
              </div>
              <textarea
                value={slotDrafts[slot.id] || ""}
                onChange={(e) => setSlotDrafts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                onBlur={(e) => saveSlot(slot.id, e.target.value)}
                rows={2} placeholder="What's being covered..."
                className="w-full rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-xs" />
            </div>
          );
        })}
      </div>
      <button onClick={addPeriod} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-2"><Plus size={12} /> Add period</button>
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
            <DayOverrideScheduleEditor periods={template || []} onChange={(next) => setPlannerDay(date, { scheduleOverride: next })}
              slotDrafts={slotDrafts} setSlotDrafts={setSlotDrafts} saveSlot={saveSlot} subjects={config.subjects} />
          ) : template && template.length > 0 && (
            <div className="space-y-2">
              {template.map((slot) => {
                const st = TILE_STYLES[slot.color] || null;
                return (
                <div key={slot.id} className={`rounded-lg border p-2 ${st ? `${st.tileBorder} ${st.tileBg}` : "border-stone-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${st ? st.labelText : "text-stone-700"}`}>{slot.label}</span>
                    <span className={`text-[10px] ${st ? `${st.labelText} opacity-70` : "text-stone-400"}`}>{formatTime12h(slot.startTime)}–{formatTime12h(slot.endTime)}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <textarea
                      value={slotDrafts[slot.id] || ""}
                      onChange={(e) => setSlotDrafts((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                      onBlur={(e) => saveSlot(slot.id, e.target.value)}
                      rows={2} placeholder="What's being covered..."
                      className={`flex-1 rounded-lg border px-2 py-1 text-xs ${st ? "border-white/60 bg-white/70" : "border-stone-200"}`} />
                    <MicButton onResult={(spoken) => {
                      const next = slotDrafts[slot.id] ? `${slotDrafts[slot.id]} ${spoken}` : spoken;
                    setSlotDrafts((prev) => ({ ...prev, [slot.id]: next }));
                    saveSlot(slot.id, next);
                  }} />
                </div>
              </div>
                );
              })}
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

function IncidentForm({ roster, config, presetId, categoryPreset, onCancel, onSave }) {
  const [category, setCategory] = useState(categoryPreset || "");
  const [date, setDate] = useState(todayISO());
  const [time] = useState(() => new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState("");
  const [studentIds, setStudentIds] = useState(presetId ? [presetId] : []);
  const [showDetails, setShowDetails] = useState(Boolean(categoryPreset));
  const [flaggedForAdmin, setFlaggedForAdmin] = useState(false);
  const [mediaItems, setMediaItems] = useState([]); // { id, file, preview, type, error }
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [incidentId] = useState(() => uid()); // generated up front so attachment paths are stable even before saving
  const toggleStudent = (id) => setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addMedia = async (fileList) => {
    const files = Array.from(fileList || []);
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const itemId = uid();
      if (isVideo) {
        try { await validateVideoDuration(file); }
        catch (err) { setMediaItems((prev) => [...prev, { id: itemId, file: null, preview: null, type: "video", error: err.message }]); continue; } // eslint-disable-line no-continue
      }
      setMediaItems((prev) => [...prev, { id: itemId, file, preview: URL.createObjectURL(file), type: isVideo ? "video" : "photo", error: null }]);
    }
  };
  const removeMedia = (itemId) => setMediaItems((prev) => prev.filter((m) => m.id !== itemId));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const media = [];
      for (const item of mediaItems.filter((m) => m.file)) {
        const url = item.type === "video"
          ? await uploadOneVideo(item.file, `incident-attachments/${incidentId}/${uid()}.${(item.file.name || "").split(".").pop() || "mp4"}`)
          : await uploadOneImage(item.file, `incident-attachments/${incidentId}/${uid()}.jpg`);
        media.push({ url, type: item.type });
      }
      onSave({ id: incidentId, category, date, time, description, studentIds, flaggedForAdmin, media });
    } catch (err) {
      setSaveError(describeUploadError(err));
      setSaving(false);
    }
  };

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

        <label className="block text-sm font-semibold text-stone-700 mb-1">Photo or video <span className="text-stone-400 font-normal">(optional)</span></label>
        {mediaItems.length > 0 && (
          <div className={`grid gap-1 mb-1.5 ${mediaItems.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {mediaItems.map((m) => (
              <div key={m.id} className="relative">
                {m.error ? (
                  <div className="w-full aspect-square rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center p-2">
                    <p className="text-[10px] text-rose-600 text-center">{m.error}</p>
                  </div>
                ) : m.type === "video" ? (
                  <video src={m.preview} className="w-full aspect-square object-cover rounded-lg" />
                ) : (
                  <img src={m.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                )}
                <button onClick={() => removeMedia(m.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-block text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 mb-4 cursor-pointer">
          + Add photo or video
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => { addMedia(e.target.files); e.target.value = ""; }} className="hidden" />
        </label>

        {saveError && <p className="text-xs text-rose-600 mb-3">{saveError}</p>}

        <button disabled={studentIds.length === 0 || saving} onClick={save}
          className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40 mb-2">
          {saving ? "Saving…" : "Log it — that's enough for now"}
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
            <button disabled={studentIds.length === 0 || saving} onClick={save}
              className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
              {saving ? "Saving…" : "Save with these details"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// A separate form from IncidentForm above, on purpose — not a preschool-mode branch bolted onto
// it. Sharing one component meant a preschool teacher tapping "Health incident" landed on a form
// still offering "Discipline" and "Social / Peer" as category choices, since both tiles fed the
// same elementary-oriented form and category list. Two real preschool concerns (a physical injury
// or health event, versus a behavioral/care situation that isn't medical) get two real, separate,
// preschool-grounded category lists (config.preschoolHealthIncidents / config.preschoolIncidents
// — see their definitions in DEFAULT_CONFIG for the reasoning behind the specific categories
// chosen), never mixed with elementary's discipline-and-schoolwork categories or with each other.
// variant ("health" | "incident") picks which of those two lists and which title/framing to show.
// Speed matters more here than almost anywhere else in the app — a teacher managing a room of
// toddlers mid-incident needs this to take seconds, not a multi-field form — so category is a row
// of one-tap pills (never a dropdown, which costs an extra tap to open), a student is usually
// already selected coming in, and everything below the fold is optional, addable later.
function PreschoolIncidentForm({ variant, roster, config, presetId, onCancel, onSave }) {
  const isHealth = variant === "health";
  const categories = (isHealth ? config.preschoolHealthIncidents : config.preschoolIncidents)?.categories || [];
  const [category, setCategory] = useState("");
  const [otherText, setOtherText] = useState("");
  const [studentIds, setStudentIds] = useState(presetId ? [presetId] : []);
  const [description, setDescription] = useState("");
  const [notifyFamily, setNotifyFamily] = useState(true);
  const [flaggedForAdmin, setFlaggedForAdmin] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [incidentId] = useState(() => uid());
  const toggleStudent = (id) => setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addMedia = async (fileList) => {
    const files = Array.from(fileList || []);
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const itemId = uid();
      if (isVideo) {
        try { await validateVideoDuration(file); }
        catch (err) { setMediaItems((prev) => [...prev, { id: itemId, file: null, preview: null, type: "video", error: err.message }]); continue; } // eslint-disable-line no-continue
      }
      setMediaItems((prev) => [...prev, { id: itemId, file, preview: URL.createObjectURL(file), type: isVideo ? "video" : "photo", error: null }]);
    }
  };
  const removeMedia = (itemId) => setMediaItems((prev) => prev.filter((m) => m.id !== itemId));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const media = [];
      for (const item of mediaItems.filter((m) => m.file)) {
        const url = item.type === "video"
          ? await uploadOneVideo(item.file, `incident-attachments/${incidentId}/${uid()}.${(item.file.name || "").split(".").pop() || "mp4"}`)
          : await uploadOneImage(item.file, `incident-attachments/${incidentId}/${uid()}.jpg`);
        media.push({ url, type: item.type });
      }
      const categoryLabel = category === "other" ? (otherText.trim() || "Other") : (categories.find((c) => c.id === category)?.label || "");
      const categoryColor = categories.find((c) => c.id === category)?.color || "cyan";
      onSave({
        id: incidentId, kind: isHealth ? "health" : "incident", category, categoryLabel, categoryColor,
        date: todayISO(), time: new Date().toTimeString().slice(0, 5),
        description, studentIds, media, notifyFamily, flaggedForAdmin,
      });
    } catch (err) {
      setSaveError(describeUploadError(err));
      setSaving(false);
    }
  };

  return (
    <div className={PAGE}>
      <button onClick={onCancel} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Cancel</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">{isHealth ? "Log a health incident" : "Log an incident"}</h1>
      <p className="text-xs text-stone-400 mb-5">{isHealth ? "A fall, a bump, anything physical or health-related." : "Anything else worth a note home — a rough drop-off, a peer conflict, and so on."}</p>
      <div className="md:w-96">
        <label className="block text-sm font-semibold text-stone-700 mb-1">Child{roster.length > 1 ? "ren" : ""} involved</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roster.map((s) => {
            const selected = studentIds.includes(s.id);
            return (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className={`text-sm font-semibold px-3 py-2 rounded-full border ${selected ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
                {s.name}
              </button>
            );
          })}
        </div>

        <label className="block text-sm font-semibold text-stone-700 mb-1">What happened</label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`text-sm font-semibold px-3 py-2 rounded-full border ${category === c.id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {category === "other" && (
          <input value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Briefly describe what happened"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" />
        )}

        <label className="block text-sm font-semibold text-stone-700 mb-1">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
        <div className="flex items-start gap-1.5 mb-4">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="Type, or use the mic" />
          <MicButton onResult={(spoken) => setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
        </div>

        <label className="block text-sm font-semibold text-stone-700 mb-1">Photo or video <span className="text-stone-400 font-normal">(optional)</span></label>
        {mediaItems.length > 0 && (
          <div className={`grid gap-1 mb-1.5 ${mediaItems.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {mediaItems.map((m) => (
              <div key={m.id} className="relative">
                {m.error ? (
                  <div className="w-full aspect-square rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center p-2">
                    <p className="text-[10px] text-rose-600 text-center">{m.error}</p>
                  </div>
                ) : m.type === "video" ? (
                  <video src={m.preview} className="w-full aspect-square object-cover rounded-lg" />
                ) : (
                  <img src={m.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                )}
                <button onClick={() => removeMedia(m.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <label className="inline-block text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 mb-4 cursor-pointer">
          + Add photo or video
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => { addMedia(e.target.files); e.target.value = ""; }} className="hidden" />
        </label>

        <button onClick={() => setNotifyFamily((v) => !v)}
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-2.5 text-left ${notifyFamily ? "bg-teal-50 border-teal-300" : "bg-white border-stone-300"}`}>
          <Bell size={18} className={notifyFamily ? "text-teal-600" : "text-stone-400"} />
          <span className={`text-sm font-semibold ${notifyFamily ? "text-teal-700" : "text-stone-600"}`}>
            {notifyFamily ? "Family will be notified" : "Family will not be notified"}
          </span>
          <span className="text-xs text-stone-400 ml-auto">Tap to change</span>
        </button>

        {/* Separate from — not a replacement for — notifying the family above. That happens as
            part of logging the incident either way; this is an additional, optional escalation
            for the cases that also need admin's attention specifically. */}
        <button onClick={() => setFlaggedForAdmin((v) => !v)}
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-4 text-left ${flaggedForAdmin ? "bg-rose-50 border-rose-300" : "bg-white border-stone-300"}`}>
          <Flag size={18} className={flaggedForAdmin ? "text-rose-600 fill-rose-600" : "text-stone-400"} />
          <span className={`text-sm font-semibold ${flaggedForAdmin ? "text-rose-700" : "text-stone-600"}`}>
            {flaggedForAdmin ? "Flagged for admin" : "Flag for admin"}
          </span>
          <span className="text-xs text-stone-400 ml-auto">{flaggedForAdmin ? "Shows on the admin overview" : "Tap to flag"}</span>
        </button>

        {saveError && <p className="text-xs text-rose-600 mb-3">{saveError}</p>}

        <button disabled={studentIds.length === 0 || !category || saving} onClick={save}
          className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">
          {saving ? "Saving…" : "Save"}
        </button>
        {(studentIds.length === 0 || !category) && (
          <p className="text-xs text-stone-400 text-center mt-2">
            {studentIds.length === 0 ? "Select at least one child" : "Select what happened"}
          </p>
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

async function generateMessage(student, flag, config, teacher) {
  const teacherName = teacher?.name;
  const prompt = `${buildStyleInstructions(config, teacherName)}

Situation: ${flag.label}
Suggested next step: ${flag.message}
Student's first name: ${student.name}

Keep it under 120 words, friendly but direct, no exaggeration. Output only the message text, nothing else.`;
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  return text; // clean, no disclaimer baked in — applied only at actual email send time, never here
}

function MessageDraftView({ student, flag, classId, config, loggedInTeacher, sendMessageToFamily, onBack, onSaveParentEmail, onLogSent }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState(student?.parentEmail || "");
  const [logged, setLogged] = useState(false);
  const hasP2 = Boolean(student?.parent2Email || student?.parent2Phone);
  const [recipientMode, setRecipientMode] = useState("p1");

  const run = useCallback(async () => {
    setLoading(true); setError(false); setLogged(false);
    try {
      const text = await generateMessage(student, flag, config, loggedInTeacher);
      setDraft(text || "Could not generate a draft — please write one manually.");
    } catch { setError(true); } finally { setLoading(false); }
  }, [student, flag]);

  useEffect(() => { run(); }, [run]);

  const subject = `About ${student.name} — ${flag.label.split(" — ")[0]}`;

  const logSent = () => {
    onLogSent({ date: todayISO(), channel: "email", type: "automated", source: "flag-message", subject, body: draft });
    setLogged(true);
  };

  const sendEmails = [
    (recipientMode === "p1" || recipientMode === "both") && email,
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Email,
  ].filter(Boolean).join(", ");
  const sendPhones = [
    (recipientMode === "p1" || recipientMode === "both") && student?.parentPhone && { phone: student.parentPhone, label: student?.parent1Name || "Parent 1" },
    (recipientMode === "p2" || recipientMode === "both") && student?.parent2Phone && { phone: student.parent2Phone, label: student?.parent2Name || "Parent 2" },
  ].filter(Boolean);

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Draft message</h1>
      <p className="text-stone-500 text-sm mb-5">{student?.name} — {flag.label}</p>
      <div className="md:w-[32rem]">
        <label className="block text-xs font-medium text-stone-500 mb-1">Parent email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onSaveParentEmail(email)}
          placeholder="parent@example.com" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4" />
        {hasP2 && (
          <>
            <label className="block text-xs font-medium text-stone-500 mb-1">Send to</label>
            <div className="flex gap-1.5 mb-1">
              {[["p1", student?.parent1Name || "Parent 1"], ["p2", student?.parent2Name || "Parent 2"], ["both", "Both"]].map(([val, label]) => (
                <button key={val} onClick={() => setRecipientMode(val)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${recipientMode === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mb-3">{sendEmails ? `Includes: ${sendEmails}` : "No email on file for the parent(s) selected."}</p>
          </>
        )}
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
          {sendEmails && <MailActionButtons email={sendEmails} subject={subject} body={applyMessageDisclaimer(draft, config, null, loggedInTeacher?.messageSignOff)} />}
          <SendInAppButton studentId={student.id} classId={classId} message={draft} sendMessage={sendMessageToFamily} />
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
      const text = await generateSegmentCelebrationMessage(subjectLabel, segmentLabel, config, loggedInTeacher);
      setDraft(text || "Could not generate a draft — please write one manually.");
    } catch { setError(true); } finally { setLoading(false); }
  }, [subjectLabel, segmentLabel]);

  useEffect(() => { run(); }, [run]);

  const [recipientMode, setRecipientMode] = useState("p1"); // "p1" | "p2" | "both" — which parent(s) get this class-wide send
  const parentEmails = roster.flatMap((s) => [
    (recipientMode === "p1" || recipientMode === "both") && s.parentEmail,
    (recipientMode === "p2" || recipientMode === "both") && s.parent2Email,
  ]).filter(Boolean);
  const missingEmail = roster.filter((s) => {
    if (recipientMode === "p1") return !s.parentEmail;
    if (recipientMode === "p2") return !s.parent2Email;
    return !s.parentEmail && !s.parent2Email;
  });
  const subject = `${subjectLabel} — ${segmentLabel} complete!`;

  return (
    <div className={PAGE}>
      <button onClick={onBack} className="flex items-center text-stone-500 text-sm mb-4 hover:text-stone-800"><ChevronLeft size={16} /> Back</button>
      <h1 className="display-font text-xl font-bold text-stone-900 mb-1">Announce to the class</h1>
      <p className="text-stone-500 text-sm mb-5">{subjectLabel} — {segmentLabel}</p>
      <div className="md:w-[32rem]">
        <label className="block text-xs font-medium text-stone-500 mb-1">Send to</label>
        <div className="flex gap-1.5 mb-2">
          {[["p1", "Parent 1"], ["p2", "Parent 2"], ["both", "Both"]].map(([val, label]) => (
            <button key={val} onClick={() => setRecipientMode(val)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${recipientMode === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
              {label}
            </button>
          ))}
        </div>
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
          <MailActionButtons bcc={parentEmails} subject={subject} body={applyMessageDisclaimer(draft, config, null, loggedInTeacher?.messageSignOff)} />
        </div>
        <p className="text-xs text-stone-400 mb-4">Nothing sends automatically — review the message, then send it yourself.</p>
        <button onClick={onDone} className="text-xs font-semibold bg-teal-700 text-white rounded-lg px-4 py-2 hover:bg-teal-800">Done</button>
      </div>
    </div>
  );
}

// The "compose new" half of Classroom Messages — embedded directly in TeacherMessagesView rather
// than living as its own separate top-level destination, since it's fundamentally the same
// classroom channel as the inbox, just the "write something new" side of it instead of "browse
// what's there." No header of its own — the view embedding this provides that.
function ClassBroadcastComposer({ roster, classId, config, loggedInTeacher, sendMessageToFamily }) {
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [sendingInApp, setSendingInApp] = useState(false);
  const [sentInAppTo, setSentInAppTo] = useState(null);

  // AI is an optional assist, not a gate — the textarea above is always writable directly, this
  // just offers a shortcut for turning a rough note into a fuller announcement when wanted.
  const [showGenerate, setShowGenerate] = useState(false);
  const [roughNote, setRoughNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);

  const generate = async () => {
    if (!roughNote.trim() || generating) return;
    setGenerating(true);
    setGenError(false);
    try {
      const text = await generateClassAnnouncementMessage(roughNote.trim(), config, loggedInTeacher);
      setDraft(text || "");
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
    if (isVideo) {
      try { await validateVideoDuration(file); }
      catch (err) { setAttachError(err.message); return; }
    }
    if (!isImage && file.size > MAX_FILE_ATTACHMENT_BYTES) {
      setAttachError("File is too large — the limit is 20MB.");
      return;
    }
    setAttachFile(file);
    setAttachType(isVideo ? "video" : isImage ? "photo" : "file");
    setAttachPreview(isImage || isVideo ? URL.createObjectURL(file) : null);
  };
  const clearAttachment = () => { setAttachFile(null); setAttachPreview(null); setAttachType(null); setAttachError(null); };

  const [recipientMode, setRecipientMode] = useState("p1"); // "p1" | "p2" | "both" — which parent(s) get the emailed version
  const parentEmails = roster.flatMap((s) => [
    (recipientMode === "p1" || recipientMode === "both") && s.parentEmail,
    (recipientMode === "p2" || recipientMode === "both") && s.parent2Email,
  ]).filter(Boolean);
  const missingEmail = roster.filter((s) => {
    if (recipientMode === "p1") return !s.parentEmail;
    if (recipientMode === "p2") return !s.parent2Email;
    return !s.parentEmail && !s.parent2Email;
  });

  const sendInApp = async () => {
    if (!draft.trim() && !attachFile) return;
    setSendingInApp(true);
    setAttachError(null);
    try {
      let attachmentUrl = null;
      if (attachFile) {
        setUploadProgress(0);
        if (attachType === "video") {
          attachmentUrl = await uploadOneVideo(attachFile, `message-attachments/broadcast-${classId}/${uid()}.${(attachFile.name || "").split(".").pop() || "mp4"}`, setUploadProgress);
        } else if (attachType === "photo") {
          attachmentUrl = await uploadOneImage(attachFile, `message-attachments/broadcast-${classId}/${uid()}.jpg`, setUploadProgress);
        } else {
          attachmentUrl = await uploadOneFile(attachFile, `message-attachments/broadcast-${classId}/${uid()}.${(attachFile.name || "").split(".").pop() || "bin"}`, setUploadProgress);
        }
      }
      const relevant = await fetchClassFamilies(classId);
      // Every individual GUARDIAN's own uid — not familyGroupId, which was silently collapsing a
      // two-guardian family down to just one recipient here: both guardians share the same group
      // id, so deduplicating by it (rather than by each guardian's own uid) meant the second
      // guardian's own private thread never received this broadcast at all, not merely a
      // duplicate-avoidance step gone slightly too far.
      const uids = new Set(relevant.map((f) => f.uid));
      for (const familyUid of uids) {
        await sendMessageToFamily(familyUid, draft.trim(), attachmentUrl ? [{ url: attachmentUrl, type: attachType, name: attachType === "file" ? attachFile.name : null }] : []); // eslint-disable-line no-await-in-loop
      }
      setSentInAppTo(uids.size);
    } catch (err) {
      setAttachError(describeUploadError(err));
    }
    setUploadProgress(null);
    setSendingInApp(false);
  };

  return (
    <div className="md:w-[32rem]">
      <p className="text-stone-500 text-sm mb-4">One message to every family in this class at once.</p>

      <label className="block text-xs font-medium text-stone-500 mb-1">Message</label>
      <div className="flex items-start gap-1.5 mb-1.5">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} placeholder="Type your announcement, or use the sparkle button to draft one from a quick note"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={() => setShowGenerate((v) => !v)} title="Draft with AI"
            className={`rounded-lg p-2 border ${showGenerate ? "bg-teal-50 border-teal-300 text-teal-700" : "border-stone-300 text-stone-400 hover:text-teal-700 hover:border-teal-300"}`}>
            <Sparkles size={16} />
          </button>
          <MicButton onResult={(spoken) => setDraft((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
        </div>
      </div>

      {showGenerate && (
        <div className="border border-teal-200 bg-teal-50/50 rounded-lg p-2 mb-3">
          <div className="flex items-center gap-1.5">
            <input value={roughNote} onChange={(e) => setRoughNote(e.target.value)} placeholder="What's this about? I'll turn it into a full announcement."
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
      <div className="flex gap-2 mb-4">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 cursor-pointer">
          <Camera size={14} /> {attachType === "photo" || attachType === "video" ? "Change photo or video" : "Add a photo or video"}
          <input type="file" accept="image/*,video/*" onChange={(e) => { pickAttachment(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-2.5 py-1.5 cursor-pointer">
          <Paperclip size={14} /> {attachType === "file" ? "Change file" : "Add a file"}
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(e) => { pickAttachment(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
        </label>
      </div>
      {attachError && <p className="text-xs text-rose-600 mb-3">{attachError}</p>}

      <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-3 mb-4">
        <p className="text-xs font-semibold text-stone-700 mb-1">Send as an in-app message</p>
        <p className="text-[11px] text-stone-400 mb-2">Goes to every family linked to this class as a separate message in their classroom thread — each family sees only their own copy.</p>
        <button onClick={sendInApp} disabled={sendingInApp || sentInAppTo !== null || (!draft.trim() && !attachFile)}
          className={`flex items-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 ${sentInAppTo !== null ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40"}`}>
          {sendingInApp ? <Loader2 className="animate-spin" size={14} /> : sentInAppTo !== null ? <Check size={14} /> : <MessageCircle size={14} />}
          {sendingInApp ? (uploadProgress !== null ? `Uploading… ${uploadProgress}%` : "Sending…") : sentInAppTo !== null ? `Sent to ${sentInAppTo} famil${sentInAppTo === 1 ? "y" : "ies"}` : "Send in-app to the whole class"}
        </button>
      </div>

      <p className="text-xs font-semibold text-stone-700 mb-1">Or send by email instead</p>
      <label className="block text-xs font-medium text-stone-500 mb-1">Send to</label>
      <div className="flex gap-1.5 mb-2">
        {[["p1", "Parent 1"], ["p2", "Parent 2"], ["both", "Both"]].map(([val, label]) => (
          <button key={val} onClick={() => setRecipientMode(val)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${recipientMode === val ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>
            {label}
          </button>
        ))}
      </div>
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
      <MailActionButtons bcc={parentEmails} subject={subject || "A note from your child's teacher"} body={applyMessageDisclaimer(draft, config, null, loggedInTeacher?.messageSignOff)} />
      <p className="text-xs text-stone-400 mt-3">Email doesn't send automatically — review the message, then send it yourself.</p>
    </div>
  );
}

// ---------- Settings ----------


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

function AddExistingStudentPanel({ globalStudents, roster, config, onAdd, onCancel, onCheckEnrollments }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [scope, setScope] = useState("full-time");
  const [periodIds, setPeriodIds] = useState([]);
  const [existingClasses, setExistingClasses] = useState(null); // null = checking; [] = none found
  const [confirmedAnyway, setConfirmedAnyway] = useState(false);
  const rosterIds = new Set(roster.map((s) => s.id));
  const results = (globalStudents || [])
    .filter((s) => !s.archived && !rosterIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);
  const allPeriods = getAllPeriodsEverywhere(config);
  const togglePeriod = (id) => setPeriodIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectStudent = async (s) => {
    setSelected(s);
    setConfirmedAnyway(false);
    setExistingClasses(null);
    // A real, reported incident happened without this check: a student already enrolled
    // elsewhere got added to a second class with zero warning, and wasn't found again on
    // their actual class's own roster until a parent needed a pickup. This is what closes
    // that gap — checked fresh every time someone is selected, not cached, since enrollment
    // can genuinely change between one search and the next.
    const found = onCheckEnrollments ? await onCheckEnrollments(s.id) : [];
    setExistingClasses(found);
  };

  const hasConflict = existingClasses && existingClasses.length > 0;
  const canAdd = !hasConflict || confirmedAnyway;

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
                <button onClick={() => selectStudent(s)} className="w-full text-left bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm hover:border-teal-300">
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

          {existingClasses === null && (
            <p className="text-xs text-stone-400 mb-3">Checking whether {selected.name} is already in another class…</p>
          )}
          {hasConflict && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3 mb-3">
              <p className="text-sm font-bold text-rose-800 mb-1">Already enrolled elsewhere</p>
              <p className="text-xs text-rose-700 mb-2">
                {selected.name} is already in {existingClasses.map((c) => c.className).join(", ")}. Adding them here will enroll them in <b>both</b> classes at the same time — this is very likely not what you want, and can make it hard for the right teacher to find them later.
              </p>
              <label className="flex items-start gap-2 text-xs font-semibold text-rose-800">
                <input type="checkbox" checked={confirmedAnyway} onChange={(e) => setConfirmedAnyway(e.target.checked)} className="mt-0.5" />
                I understand — add them to this class too, on purpose.
              </label>
            </div>
          )}

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
            <button onClick={() => onAdd(selected, scope, periodIds)} disabled={!canAdd || existingClasses === null || (scope === "periods" && periodIds.length === 0 && allPeriods.length > 0)}
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

const ELEMENTARY_ONBOARDING_STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "subjects", label: "Subjects" },
  { key: "schedule", label: "Schedule" },
  { key: "attendance", label: "Attendance" },
  { key: "messages", label: "Messages" },
  { key: "blog", label: "Blog" },
  { key: "homeworkPosts", label: "Homework" },
  { key: "homeworkTracking", label: "HW Tracking" },
  { key: "points", label: "Points" },
  { key: "incidents", label: "Incidents" },
  { key: "birthdays", label: "Birthdays" },
  { key: "notifications", label: "Notifications" },
  { key: "done", label: "All Set" },
];

// A genuinely different room, not a relabeled elementary class — no subjects (nothing is taught
// as discrete periods), no period schedule, no points. Attendance is check-in/out driven by a
// parent scanning a QR code rather than a teacher tapping a status, so that step is replaced
// entirely rather than reused with different copy. Daily Log and its tiles are this room's actual
// day-to-day tool and get their own step, which elementary has no equivalent of at all.
const PRESCHOOL_ONBOARDING_STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "checkin", label: "Check-in" },
  { key: "dailyLog", label: "Daily Log" },
  { key: "messages", label: "Messages" },
  { key: "blog", label: "Blog" },
  { key: "incidents", label: "Incidents" },
  { key: "birthdays", label: "Birthdays" },
  { key: "notifications", label: "Notifications" },
  { key: "done", label: "All Set" },
];


// The guided setup wizard — a friendlier front door to settings that already exist elsewhere,
// not a separate system. Every change here writes through the same config object Settings uses,
// via the same update(mutator) pattern, so nothing gets out of sync and nothing is duplicated.
function OnboardingWizard({ config, setConfig, onClose, classType }) {
  const steps = classType === "preschool" ? PRESCHOOL_ONBOARDING_STEPS : ELEMENTARY_ONBOARDING_STEPS;
  const completedSteps = config.onboarding?.completedSteps || [];
  const firstIncomplete = steps.findIndex((s) => !completedSteps.includes(s.key));
  const [stepIdx, setStepIdx] = useState(firstIncomplete === -1 ? 0 : firstIncomplete);

  const update = (mutator) => setConfig(mutator(structuredClone(config)));
  const step = steps[stepIdx];

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
    if (stepIdx === steps.length - 1) {
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
          {steps.map((s, i) => (
            <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-teal-600" : "bg-stone-200"}`} />
          ))}
        </div>

        {step.key === "welcome" && <OnboardingWelcomeStep classType={classType} />}
        {step.key === "subjects" && <OnboardingSubjectsStep config={config} update={update} />}
        {step.key === "schedule" && <OnboardingScheduleStep config={config} update={update} />}
        {step.key === "attendance" && <OnboardingAttendanceStep config={config} update={update} />}
        {step.key === "checkin" && <OnboardingCheckinStep />}
        {step.key === "dailyLog" && <OnboardingDailyLogStep config={config} update={update} />}
        {step.key === "messages" && <OnboardingMessagesStep config={config} update={update} />}
        {step.key === "blog" && <OnboardingBlogStep />}
        {step.key === "homeworkPosts" && <OnboardingHomeworkPostsStep />}
        {step.key === "homeworkTracking" && <OnboardingHomeworkTrackingStep config={config} update={update} />}
        {step.key === "points" && <OnboardingPointsStep config={config} update={update} />}
        {step.key === "incidents" && <OnboardingIncidentsStep config={config} update={update} />}
        {step.key === "birthdays" && <OnboardingBirthdaysStep />}
        {step.key === "notifications" && <OnboardingNotificationsStep />}
        {step.key === "done" && <OnboardingDoneStep config={config} classType={classType} />}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
          <button onClick={goBack} disabled={stepIdx === 0} className={`text-xs text-stone-400 hover:text-stone-700 ${stepIdx === 0 ? "opacity-0 pointer-events-none" : ""}`}>Back</button>
          <div className="flex items-center gap-3">
            {step.key !== "welcome" && step.key !== "done" && (
              <button onClick={goNext} className="text-xs text-stone-500 hover:text-stone-700">Skip</button>
            )}
            <button onClick={goNext} className="bg-teal-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-teal-800">
              {stepIdx === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingWelcomeStep({ classType }) {
  return (
    <div>
      <h2 className="display-font text-2xl font-bold text-stone-900 mb-2">
        {classType === "preschool" ? "Let's set up your room" : "Let's set up your class"}
      </h2>
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

// Preschool's actual attendance mechanism — a parent scans a QR code to check their own child in
// or out, rather than a teacher tapping a status the way elementary does. Nothing to configure
// here (the code is already generated and shared school-wide), so this is purely explaining how
// it works and where to find the code, not a settings form like the elementary version.
function OnboardingCheckinStep() {
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">How check-in works here</h2>
      <p className="text-sm text-stone-600 mb-3">Families check their own child in and out by scanning a QR code — nothing for you to set up. The same code works for every family, every day.</p>
      <p className="text-sm text-stone-600 mb-3">Ask your school office for the printed code if one isn't already posted at your door — it's managed school-wide from the admin dashboard, not per class.</p>
      <p className="text-xs text-stone-400">You can also check a student in or out yourself from Attendance, for the times a family forgets to scan.</p>
    </div>
  );
}

// Not a settings form — the tiles themselves and their on/off state are already configurable in
// Settings, and repeating that same editable list here would just be a second place for it to go
// out of sync. This is purely a heads-up on what Daily Log actually is, since it has no
// elementary equivalent to lean on for context the way most of the rest of this flow does.
function OnboardingDailyLogStep({ config }) {
  const enabledTiles = PRESCHOOL_TILES.filter((t) => config.preschool?.tilesEnabled?.[t.id] !== false);
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Your daily log</h2>
      <p className="text-sm text-stone-600 mb-3">This is the main thing you'll fill in each day — a quick log per child that families see in real time: mood, meals, naps, diapers, and photos.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {enabledTiles.map((t) => (
          <span key={t.id} className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 rounded-full px-3 py-1">{t.label}</span>
        ))}
      </div>
      <p className="text-xs text-stone-400">All of these are already on by default — turn any off in Settings if they don't apply to your room.</p>
    </div>
  );
}

// Both class types get this exact step — a class blog works the same way regardless of room type,
// so there's nothing classType-specific to say here the way there is for attendance or homework.
function OnboardingBlogStep() {
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Your class blog</h2>
      <p className="text-sm text-stone-600 mb-3">A running feed of photos and updates from the classroom — every family linked to your class sees it automatically, and gets notified the moment you post.</p>
      <p className="text-sm text-stone-600 mb-3">Post as often as feels right — a single photo with a short caption is enough. There's nothing to set up here; it's ready to use from the Blog tab whenever you are.</p>
      <p className="text-xs text-stone-400">Families won't need to ask "how was today" nearly as often once this becomes a habit.</p>
    </div>
  );
}

// Elementary-only — see the note on OnboardingHomeworkTrackingStep for why these two are kept
// deliberately distinct in both name and copy despite sharing the word "homework."
function OnboardingHomeworkPostsStep() {
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Posting homework</h2>
      <p className="text-sm text-stone-600 mb-3">A dedicated place to post what's due — separate from messages and the blog. Mark each post as daily or weekly, and families automatically see the right heading ("Today's homework" or "This week's homework") without you needing to type a title.</p>
      <p className="text-sm text-stone-600 mb-3">Add a photo, a file, or just plain text — whatever the assignment actually needs. Every family gets notified the moment you post.</p>
      <p className="text-xs text-stone-400">Nothing to set up here either — it's ready to use from the Homework tab.</p>
    </div>
  );
}

// Renamed from the original OnboardingHomeworkStep specifically to stay distinct from the newer
// OnboardingHomeworkPostsStep below — this one is about the teacher's own record of who did or
// didn't turn work in, a completely different feature from posting the assignment itself for
// families to see, and sitting right next to each other in the flow is exactly where that could
// get confused without the copy calling it out directly.
function OnboardingHomeworkTrackingStep({ config, update }) {
  const hw = config.homework || {};
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Track homework completion?</h2>
      <p className="text-sm text-stone-600 mb-4">Different from the homework you just posted for families — this is your own record of which students actually turned work in, entirely optional, and separate either way.</p>
      <label className="flex items-center gap-2 text-sm text-stone-700 mb-3">
        <input type="checkbox" checked={hw.enabled || false} onChange={(e) => update((c) => { c.homework.enabled = e.target.checked; return c; })} />
        Track homework completion for this class
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
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Messaging families</h2>
      <p className="text-sm text-stone-600 mb-3">Every family gets a direct line to your classroom, and you can broadcast one message to everyone at once when you need to. An AI assist can turn a quick note into a fully written message — you can also always just type it yourself.</p>
      <p className="text-sm text-stone-600 mb-4">The settings below shape how that AI assist writes on your behalf — the tone and how it refers to your school. Sample writing, custom opening/closing lines, and more are available later in Settings.</p>

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

// Applies to both class types identically — worth its own step given how easy it is for a teacher
// to miss turning this on themselves and then wonder later why they never got alerted to anything.
function OnboardingNotificationsStep() {
  return (
    <div>
      <h2 className="display-font text-xl font-bold text-stone-900 mb-1">Turn on notifications</h2>
      <p className="text-sm text-stone-600 mb-3">This is what actually alerts you the moment a family messages you — without it, you'd have to remember to check the app yourself.</p>
      <p className="text-sm text-stone-600 mb-3">Add this app to your home screen first (Share → Add to Home Screen on iPhone, or the menu → Add to Home Screen on Android), then open it from that icon and turn notifications on from the settings icon — notifications only work once it's opened that way, not from a browser tab.</p>
      <p className="text-xs text-stone-400">You can do this anytime from Settings if you'd rather skip it for now.</p>
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

function OnboardingDoneStep({ config, classType }) {
  const summary = classType === "preschool"
    ? [
        { done: true, label: "Daily Log ready to use" },
        { done: (config.incidents?.categories || []).length > 0, label: "Incident categories ready" },
        { done: true, label: "Check-in code ready — ask the office if it's not posted yet" },
      ]
    : [
        { done: (config.subjects || []).length > 0, label: `${(config.subjects || []).length} subject${(config.subjects || []).length === 1 ? "" : "s"} added` },
        { done: (config.planner?.schedules || []).some((s) => (s.periods || []).length > 0), label: "Schedule started" },
        { done: config.homework?.enabled, label: "Homework completion tracking on" },
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


// Lets admin set up all five weekdays at once for any of the three preschool meal types, rather
// than only being able to edit "today's" menu from the logging screen itself (which works fine
// for a quick on-the-spot fix, but is the wrong tool for entering a whole week's worth of menus
// in one sitting).
function WeeklyMealMenuEditor({ config, persistConfig }) {
  const [activeMealType, setActiveMealType] = useState("lunch");
  const mealTypeTabs = [
    { id: "lunch", label: "Lunch" },
    { id: "snack-am", label: "Morning Snack" },
    { id: "snack-pm", label: "Afternoon Snack" },
  ];
  const menuForType = config.preschool?.mealMenus?.[activeMealType] || {};

  const updateDay = (weekday, items) => {
    const nextMealMenus = {
      ...(config.preschool?.mealMenus || {}),
      [activeMealType]: { ...(config.preschool?.mealMenus?.[activeMealType] || {}), [weekday]: items },
    };
    persistConfig({ ...config, preschool: { ...config.preschool, mealMenus: nextMealMenus } });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {mealTypeTabs.map((t) => (
          <button key={t.id} onClick={() => setActiveMealType(t.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${activeMealType === t.id ? "bg-teal-700 text-white border-teal-700" : "text-stone-600 border-stone-300"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {MEAL_MENU_WEEKDAYS.map((weekday) => (
          <WeeklyMealMenuDayRow key={weekday} weekday={weekday} items={menuForType[weekday] || []} onSave={(items) => updateDay(weekday, items)} />
        ))}
      </div>
    </div>
  );
}

function WeeklyMealMenuDayRow({ weekday, items, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const open = () => { setDraft(items.length ? [...items] : [""]); setEditing(true); };
  const save = () => { onSave(draft.map((i) => i.trim()).filter(Boolean)); setEditing(false); };
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-stone-700">{MEAL_MENU_WEEKDAY_LABELS[weekday]}</p>
        {!editing && <button onClick={open} className="text-xs font-semibold text-teal-700">{items.length ? "Edit" : "Set up"}</button>}
      </div>
      {!editing ? (
        <p className="text-xs text-stone-500">{items.length ? items.join(", ") : "No items set yet"}</p>
      ) : (
        <div>
          <div className="space-y-1.5 mb-2">
            {draft.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={item} onChange={(e) => setDraft((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))}
                  placeholder="Item name" className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-xs" />
                <button onClick={() => setDraft((prev) => prev.filter((_, xi) => xi !== i))} className="text-stone-400 hover:text-rose-600"><X size={14} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setDraft((prev) => [...prev, ""])} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-2"><Plus size={11} /> Add item</button>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 text-xs font-semibold text-stone-600 border border-stone-300 rounded-lg py-1.5">Cancel</button>
            <button onClick={save} className="flex-1 text-xs font-semibold text-white bg-teal-700 rounded-lg py-1.5">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ config, setConfig, onBack, roster, addStudent, removeStudent, updateStudentField, loadSampleData, clearAllData, className, classId, onRenameClass, onChangePassword, onArchiveClass, onDeleteClass, subCode, onGenerateSubCode, onClearSubCode, globalStudents, onRefreshGlobalStudents, onAddExistingStudent, onCheckStudentEnrollments, loggedInTeacher, onChangeMySignOff, onOpenMyAccount, onOpenOnboarding, createFamilyAccount }) {
  const { classType } = useContext(ClassContext);
  const isPreschool = classType === "preschool";
  // Matches by name, case- and whitespace-insensitively, against the two classes deliberately
  // kept as dedicated demo rooms — every other class now has real students enrolled, so sample
  // data (which overwrites a class's roster wholesale) has no legitimate use anywhere else.
  const isSampleClass = ["sample", "sample preschool"].includes((className || "").trim().toLowerCase());
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedSchedules, setExpandedSchedules] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [classNameInput, setClassNameInput] = useState(className || "");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [previewText, setPreviewText] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [signOff, setSignOff] = useState(loggedInTeacher?.messageSignOff || "");
  const [signOffSaved, setSignOffSaved] = useState(false);
  const saveSignOff = async () => {
    await onChangeMySignOff(signOff.trim());
    setSignOffSaved(true);
    setTimeout(() => setSignOffSaved(false), 2000);
  };
  const runStylePreview = async () => {
    setPreviewLoading(true);
    setPreviewText(null);
    try {
      const text = await generatePreviewMessage(config, loggedInTeacher);
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

          {loggedInTeacher && (
            <Section title="Notifications">
              <NotificationToggle uid={loggedInTeacher.uid} accentColor="#0f766e" />
            </Section>
          )}

          <Section title="Guided setup">
            {(() => {
              const ob = config.onboarding || { started: false, finished: false, completedSteps: [] };
              const doneCount = ob.completedSteps.length;
              const totalSteps = (isPreschool ? PRESCHOOL_ONBOARDING_STEPS : ELEMENTARY_ONBOARDING_STEPS).length;
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
                    <p className="text-xs text-stone-400 mb-3">You're partway through — {doneCount} of {totalSteps} sections done. Pick up right where you left off.</p>
                    <button onClick={onOpenOnboarding} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Continue setup</button>
                  </>
                );
              }
              return (
                <>
                  <p className="text-xs text-stone-400 mb-3">
                    {isPreschool
                      ? "A short, skippable walkthrough to help set up your room — check-in, daily log, messaging, and more, one question at a time."
                      : "A short, skippable walkthrough to help set up your class — subjects, schedule, points, and more, one question at a time."}
                  </p>
                  <button onClick={onOpenOnboarding} className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50">Start guided setup</button>
                </>
              );
            })()}
          </Section>

          {!isPreschool && (
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
          )}

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

              <p className="text-xs text-stone-400 mt-4 pt-4 border-t border-stone-200">Archiving or deleting a class is an admin action now — from the Admin Dashboard's class list.</p>
            </Section>
          )}

          <Section title="Class blog">
            <p className="text-xs text-stone-400 mb-3">Every family linked to this class can see and react to posts here. Comments are a separate choice — reactions (a tap of a heart, a thumbs up) are always available either way.</p>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={config.blogCommentsEnabled !== false}
                onChange={(e) => update((c) => { c.blogCommentsEnabled = e.target.checked; return c; })} />
              Allow parents to comment on blog posts
            </label>
          </Section>

          <Section title="Demo & data reset">
            {isSampleClass ? (
              <>
                <p className="text-xs text-stone-400 mb-3">This class is one of the two dedicated demo rooms (Sample / Sample Preschool) — the only classes where loading sample data, or clearing a class's data outright, is available, now that real students are enrolled everywhere else. Loading sample data also automatically links your own login as a family account on one of the sample students, so "Switch to Parent view" (top of the class screen) shows the real, live parent portal running against this exact demo data — kept in sync every time sample data is reloaded, never a stale, separate mockup.</p>
                <div className="flex flex-wrap gap-2">
                  <ConfirmDelete onConfirm={loadSampleData} label="Load sample data" className="text-xs font-semibold text-teal-700 border border-teal-300 rounded-lg px-3 py-2 hover:bg-teal-50" />
                  <ConfirmDelete onConfirm={clearAllData} label="Clear all data" className="text-xs font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-2 hover:bg-red-50" />
                </div>
              </>
            ) : (
              <p className="text-xs text-stone-400">Not available here — sample data, and clearing a class's data outright, are both limited to the two dedicated demo rooms (Sample / Sample Preschool), to keep this from ever being an option on a class with real, enrolled students.</p>
            )}
          </Section>

          {isPreschool && (
            <Section title="Daily Log tiles">
              <p className="text-xs text-stone-400 mb-2">Turn off any tile your program doesn't use — it disappears from Daily Log, but nothing already logged is deleted.</p>
              <div className="space-y-1.5">
                {PRESCHOOL_TILES.map((tile) => (
                  <label key={tile.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={config.preschool?.tilesEnabled?.[tile.id] !== false}
                      onChange={(e) => update((c) => {
                        c.preschool = { ...(c.preschool || {}), tilesEnabled: { ...(c.preschool?.tilesEnabled || {}), [tile.id]: e.target.checked } };
                        return c;
                      })} />
                    {tile.label}
                  </label>
                ))}
              </div>
            </Section>
          )}

          <Section title="Students">
            <p className="text-xs text-stone-400 mb-3">New students are created by the school office, not from here — ask an admin to add one if they're not in the list yet. You can still pull any existing student into this class below.</p>
            <button onClick={() => setShowAddExisting((v) => !v)} className="text-xs font-semibold text-teal-700 mb-3">
              {showAddExisting ? "Close" : "+ Add an existing student to this class"}
            </button>
            {showAddExisting && (
              <AddExistingStudentPanel globalStudents={globalStudents} roster={roster} config={config} onCheckEnrollments={onCheckStudentEnrollments}
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

        {isPreschool && (
        <p className="text-xs text-stone-400 -mt-2">This school's QR check-in code lives in the Admin Dashboard now — one shared code for everyone, not one per class.</p>
        )}

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
            <WeeklyScheduleEditor config={config} persistConfig={setConfig} classType={classType} />
          </Section>
        </div>

        {isPreschool && (
        <div className="md:col-span-2">
          <Section title="Meal menus">
            <p className="text-xs text-stone-400 mb-3">Set what's served each weekday for lunch and each snack — teachers then pick which specific items a child ate, instead of a general amount. A day left blank just falls back to the general amount scale.</p>
            <WeeklyMealMenuEditor config={config} persistConfig={setConfig} />
          </Section>
        </div>
        )}

        {!isPreschool && (
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
        )}

        {!isPreschool && (
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
        )}

        {!isPreschool && (
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
        )}

        {!isPreschool && (
        <>
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
        </>
        )}

        {!isPreschool && (
        <>
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
        </>
        )}

        {!isPreschool && (
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
        )}

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
              <select value={config.messageStyle?.disclaimerPosition ?? "bottom"} onChange={(e) => update((c) => { c.messageStyle.disclaimerPosition = e.target.value; return c; })} className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white mb-3">
                <option value="bottom">Show it at the end of the message</option>
                <option value="top">Show it at the start of the message</option>
              </select>
              <label className="block text-xs font-medium text-stone-500 mb-1">The exact text of that note</label>
              <p className="text-xs text-stone-400 mb-1.5">This is yours specifically — it follows you across every class you teach, not just this one. Shown in italics so it's visibly distinct from your own words, even in plain-text email or an in-app message. Leave blank to use the default wording.</p>
              <textarea value={signOff} onChange={(e) => setSignOff(e.target.value)} rows={2}
                placeholder="— Sent via your child's classroom system, an automated update. No reply needed unless you have a question. —"
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm mb-2" />
              <button onClick={saveSignOff} className="text-xs font-semibold bg-teal-700 text-white rounded-lg px-3 py-2 hover:bg-teal-800">Save</button>
              {signOffSaved && <p className="text-xs text-emerald-600 mt-1">Saved.</p>}
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

        {!isPreschool && (
          <>
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
          </>
        )}

        {/* Preschool's own, separate category lists — never config.incidents.categories, which is
            elementary's discipline/social/lost-item list and has nothing to do with what a
            preschool health note or regular incident is actually about. Editing these here is
            what item 4 originally asked for but didn't yet have a way to do — the categories
            PreschoolIncidentForm actually shows were fixed to sensible, research-grounded
            defaults, but weren't customizable the way elementary's always have been. */}
        {isPreschool && (
          <>
            <Section title="Health incident categories">
              <p className="text-xs text-stone-400 mb-3">What you'll pick from when logging a health incident — a fall, a bite, a fever, and so on.</p>
              {(config.preschoolHealthIncidents?.categories || []).map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-2 mb-2">
                  <input value={cat.label} onChange={(e) => update((c) => { c.preschoolHealthIncidents.categories[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                  <select value={cat.color} onChange={(e) => update((c) => { c.preschoolHealthIncidents.categories[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                    {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ConfirmDelete onConfirm={() => update((c) => { if (c.preschoolHealthIncidents.categories.length > 1) c.preschoolHealthIncidents.categories.splice(i, 1); return c; })} size={14} />
                </div>
              ))}
              <button onClick={() => update((c) => { c.preschoolHealthIncidents.categories.push({ id: uid(), label: "New category", color: "stone" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add category</button>
            </Section>

            <Section title="Incident categories">
              <p className="text-xs text-stone-400 mb-3">What you'll pick from when logging a non-health incident — a peer conflict, a rough drop-off, and so on.</p>
              {(config.preschoolIncidents?.categories || []).map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-2 mb-2">
                  <input value={cat.label} onChange={(e) => update((c) => { c.preschoolIncidents.categories[i].label = e.target.value; return c; })} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                  <select value={cat.color} onChange={(e) => update((c) => { c.preschoolIncidents.categories[i].color = e.target.value; return c; })} className="rounded-lg border border-stone-300 px-1.5 py-1.5 text-xs bg-white">
                    {COLOR_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ConfirmDelete onConfirm={() => update((c) => { if (c.preschoolIncidents.categories.length > 1) c.preschoolIncidents.categories.splice(i, 1); return c; })} size={14} />
                </div>
              ))}
              <button onClick={() => update((c) => { c.preschoolIncidents.categories.push({ id: uid(), label: "New category", color: "stone" }); return c; })} className="text-xs font-semibold text-teal-700 flex items-center gap-1 mt-1"><Plus size={12} /> Add category</button>
            </Section>
          </>
        )}

        {!isPreschool && (
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
        )}
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

// Reachable directly from the family list itself, rather than needing to open one of the family's
// students first to find any of this — name, guardians, linked children, and getting them their
// login info are all things that belong to the family as a whole, not to any one child in it.

// Recipient toggle for a single student's parent(s) — Parent 1 selected by default, with Parent 2
// available as an add-on if that parent's own contact info is on file. Selecting both sends one
// email to both at once (a single "to" can hold multiple addresses). In-app sending goes to the
// family as a whole regardless of which guardian's email was toggled on, since there's one shared
// family account, not a separate one per guardian's contact method.
function ParentSendActions({ student, classId, subject, body, sendMessageToFamily, config, signOff, size = "normal" }) {
  const hasP2 = Boolean(student.parent2Email || student.parent2Phone);
  const [selected, setSelected] = useState(["p1"]);
  const toggle = (p) => setSelected((prev) => {
    const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
    return next.length === 0 ? prev : next; // never allow zero recipients selected
  });
  const p1Label = student.parent1Name || "Parent 1";
  const p2Label = student.parent2Name || "Parent 2";
  const emails = [
    selected.includes("p1") && student.parentEmail,
    selected.includes("p2") && student.parent2Email,
  ].filter(Boolean).join(", ");
  // The disclaimer belongs only on the email copy — applied right here, at the one point where
  // this shared component actually splits into two different channels, so the in-app send below
  // always stays on the same clean draft the teacher actually saw and reviewed.
  const emailBody = applyMessageDisclaimer(body, config, null, signOff);

  return (
    <div>
      {hasP2 && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-stone-400 mr-0.5">Send to:</span>
            <button onClick={() => toggle("p1")} className={`text-xs font-semibold px-2 py-1 rounded-full border ${selected.includes("p1") ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>{p1Label}</button>
            <button onClick={() => toggle("p2")} className={`text-xs font-semibold px-2 py-1 rounded-full border ${selected.includes("p2") ? "bg-teal-50 border-teal-300 text-teal-800" : "border-stone-300 text-stone-500"}`}>{p2Label}</button>
          </div>
          <p className="text-[10px] text-stone-400">
            {emails ? `Includes: ${emails}` : "No email on file for the parent(s) selected — add one in Settings, or send in-app below."}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {emails && <MailActionButtons email={emails} subject={subject} body={emailBody} size={size} />}
        <SendInAppButton studentId={student.id} classId={classId} message={body} sendMessage={sendMessageToFamily}
          className={`flex items-center gap-1 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 ${size === "small" ? "px-2.5 py-1.5" : "px-3 py-2"}`} />
      </div>
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
      <UpdateAvailableBanner />
      <AppInner />
    </ErrorBoundary>
  );
}

// Detects when a newer version has been deployed while this exact session stayed open, and
// prompts a refresh — the likely real explanation behind "it works on my phone but not on this
// iPad" for something that's already fixed in the code: a classroom tablet that's rarely, if
// ever, fully closed can keep running the exact JS bundle it loaded weeks ago indefinitely, with
// nothing to ever prompt it to check for a newer one on its own, while a phone that gets closed
// and reopened more often naturally picks up the current version without anyone noticing there
// was ever a difference. Compares the actual script bundle THIS page loaded against what a fresh
// fetch of the page right now would load — the real, current truth each time, not a version
// number that has to be remembered and kept in sync by hand.
function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const currentScriptSrc = useRef(null);

  useEffect(() => {
    currentScriptSrc.current = document.querySelector('script[type="module"][src]')?.getAttribute("src") || null;
    if (!currentScriptSrc.current) return; // nothing to compare against — dev mode, or unexpected markup

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`${window.location.origin}/?_check=${Date.now()}`, { cache: "no-store" });
        const html = await res.text();
        const latestScriptSrc = new DOMParser().parseFromString(html, "text/html")
          .querySelector('script[type="module"][src]')?.getAttribute("src");
        if (latestScriptSrc && latestScriptSrc !== currentScriptSrc.current) setUpdateAvailable(true);
      } catch {
        // A failed check (offline, a network hiccup) just means try again next time — never
        // treated as "an update is available," since that would be a false alarm from bad
        // information rather than an actual, confirmed difference.
      }
    };

    // Checks whenever the app becomes visible again after being backgrounded — the natural moment
    // someone actually picks the device back up, and a far more meaningful trigger for a
    // classroom tablet than any fixed timer alone, since it lines up with when a stale session
    // would actually matter to the person holding it.
    const onVisible = () => { if (document.visibilityState === "visible") checkForUpdate(); };
    document.addEventListener("visibilitychange", onVisible);
    checkForUpdate(); // also check once immediately, in case this session was already stale before this code even ran
    const interval = setInterval(checkForUpdate, 20 * 60 * 1000); // and periodically regardless, for a tab simply left open and visible for hours at a stretch
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, []);

  if (!updateAvailable || dismissed) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-teal-800 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <p className="text-sm font-semibold">A newer version is ready.</p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setDismissed(true)} className="text-xs font-semibold text-teal-100 hover:text-white px-2">Later</button>
        <button onClick={() => window.location.reload()} className="text-sm font-bold bg-white text-teal-800 rounded-lg px-3 py-1.5">
          Refresh
        </button>
      </div>
    </div>
  );
}
