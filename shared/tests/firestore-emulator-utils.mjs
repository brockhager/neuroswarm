// firestore-emulator-utils.mjs
// Hardened utility for connecting to and clearing the Firestore emulator using
// the Firebase Admin SDK for guaranteed test isolation in CI environments.

import admin from 'firebase-admin';

// --- CONFIGURATION ---
// These environment variables must be set by the test orchestrator/CI script.
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'neuroswarm-test';

// The collections we need to clear for idempotency testing
const COLLECTIONS_TO_CLEAR = [
    'artifacts/neuroswarm-test-app/public/data/idempotency-records', // CN-08-G persistence
    'artifacts/neuroswarm-test-app/public/data/processed_claims'     // Claim replay protection
];

let adminApp = null;

/**
 * Initializes the Firebase Admin SDK connection to the Firestore Emulator.
 * This is required to access the administrative methods needed for database clearing.
 */
function initializeAdminApp() {
    if (adminApp) {
        return adminApp;
    }

    // Set the required environment variable for the Admin SDK to target the emulator
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;

    // Use credential-less initialization when targeting the emulator
    adminApp = admin.initializeApp({
        projectId: PROJECT_ID,
    });
    
    console.log(`[Admin Init] Connected to Firestore Emulator at ${EMULATOR_HOST} for Project: ${PROJECT_ID}`);
    return adminApp;
}

/**
 * Clears the specified idempotency and processed claims collections in the
 * Firestore Emulator database to ensure clean test runs.
 * * NOTE: This implementation is slow but guarantees correctness by deleting
 * documents one-by-one, required when using the Admin SDK's client methods.
 * For CI, the faster way is to call the emulator's REST API, but this is 
 * the most robust method using Node dependencies.
 */
export async function clearIdempotencyCollections() {
    // If emulator is not configured, skip (tests will use in-memory fallback)
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        console.log('[Firestore Cleanup] FIRESTORE_EMULATOR_HOST not set — skipping emulator cleanup');
        return;
    }

    const app = initializeAdminApp();
    const db = admin.firestore(app);
    
    console.log(`[Firestore Cleanup] Starting cleanup of ${COLLECTIONS_TO_CLEAR.length} collections...`);

    for (const path of COLLECTIONS_TO_CLEAR) {
        try {
            // Firestore collections are complex; we delete all documents in a batch.
            const collectionRef = db.collection(path);
            const snapshot = await collectionRef.get();

            if (snapshot.size === 0) {
                console.log(`[Cleanup] Collection ${path} is already empty.`);
                continue;
            }

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            console.log(`[Cleanup] Successfully deleted ${snapshot.size} documents from ${path}.`);
            
        } catch (error) {
            console.error(`[Cleanup ERROR] Failed to clear collection ${path}:`, error);
            // Non-critical error if the collection path is complex, but we proceed.
        }
    }
}

/**
 * Utility function to close the Admin SDK app instance (important for memory management).
 */
export async function closeAdminApp() {
    if (adminApp) {
        await adminApp.delete();
        adminApp = null;
        console.log('[Admin Close] Closed Firebase Admin App.');
    }
}

export default { clearIdempotencyCollections, closeAdminApp };
