// Firebase Admin (server-only). Used by the vote API and the read layer when
// Firestore is configured. If no credentials are present, getDb() returns null
// and the app transparently falls back to the local seed JSON - so the site
// runs with zero setup.
import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore';

let _db: Firestore | null | undefined;

export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}

function initApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const svc = JSON.parse(raw);
    // Vercel stores multi-line private keys with escaped newlines.
    if (typeof svc.private_key === 'string') {
      svc.private_key = svc.private_key.replace(/\\n/g, '\n');
    }
    return initializeApp({
      credential: cert(svc),
      projectId: svc.project_id || process.env.FIREBASE_PROJECT_ID,
    });
  }
  // GOOGLE_APPLICATION_CREDENTIALS path (local data manager convenience).
  return initializeApp({ credential: applicationDefault() });
}

/** Returns a Firestore handle, or null when Firestore isn't configured. */
export function getDb(): Firestore | null {
  // Never read Firestore during `next build`: prerendering ~600 static pages
  // would exhaust the free Spark 50k-reads/day quota on a single deploy (and an
  // uncaught quota error fails the build). The build renders from the committed
  // seed snapshot - which is what we publish from, so it matches Firestore at
  // deploy time. Live data (votes) is read at runtime. Override for a full
  // Firestore-backed build with FORCE_FIRESTORE_AT_BUILD=1.
  if (process.env.NEXT_PHASE === 'phase-production-build' && !process.env.FORCE_FIRESTORE_AT_BUILD) {
    return null;
  }
  // A resolved handle, or the cached null of credential-less seed mode, is
  // returned directly. A FAILED init is deliberately NOT cached (see below), so
  // _db stays undefined and the next call retries.
  if (_db !== undefined) return _db;
  if (!isFirestoreConfigured()) {
    // No credentials configured at all: the documented local/dev/seed mode.
    // Cache the null - this instance can never gain credentials at runtime.
    _db = null;
    return _db;
  }
  try {
    return (_db = getFirestore(initApp()));
  } catch (err) {
    // Credentials ARE configured but init threw (a transient error, or a
    // malformed key mid-deploy). Do NOT cache null here: caching would downgrade
    // this instance to in-memory voting for its whole lifetime after a single
    // hiccup - and in-memory votes silently void cross-instance dedupe. Leaving
    // _db undefined makes the next call retry a real Firestore init instead.
    console.error('[firebase-admin] Firestore init failed (credentials present); will retry on next call:', err);
    return null;
  }
}

export { FieldValue };
