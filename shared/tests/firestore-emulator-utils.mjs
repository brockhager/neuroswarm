// Firestore emulator testing utilities
// Provides helpers used by tests to clear emulator collections when FIRESTORE_EMULATOR_HOST is set

export async function isEmulatorAvailable() {
  return !!process.env.FIRESTORE_EMULATOR_HOST;
}

async function initAdmin() {
  // dynamic import so this file can be used even if firebase-admin not installed
  const admin = await import('firebase-admin');
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'neuroswarm-test' });
  }
  return admin;
}

export async function clearIdempotencyCollections() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    // nothing to do when emulator isn't configured
    console.log('[FirestoreEmulator] FIRESTORE_EMULATOR_HOST not set — skipping clear');
    return;
  }

  try {
    const admin = await initAdmin();
    const db = admin.firestore();
    const collections = ['idempotency_keys', 'processed_claims'];

    for (const name of collections) {
      try {
        // listDocuments is the most direct way to get doc refs and delete them
        const refs = await db.collection(name).listDocuments();
        if (refs.length === 0) continue;
        // delete in batches
        const batch = db.batch();
        refs.forEach(r => batch.delete(r));
        await batch.commit();
      } catch (err) {
        console.warn('[FirestoreEmulator] failed to clear collection', name, err instanceof Error ? err.message : String(err));
      }
    }

    console.log('[FirestoreEmulator] cleared idempotency collections');
  } catch (e) {
    console.warn('[FirestoreEmulator] emulator cleanup failed', e instanceof Error ? e.message : String(e));
  }
}

export default { isEmulatorAvailable, clearIdempotencyCollections };
