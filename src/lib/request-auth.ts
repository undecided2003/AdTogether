import type { DocumentReference, DocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Return the Firebase user ID represented by a bearer ID token.  API routes
 * use this instead of trusting a UID supplied in a JSON body or a header.
 */
export async function authenticatedUid(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    // Public SDK requests use App IDs and do not authenticate here. Every
    // account-level mutation and metered API path, however, requires a
    // verified email so newly automated sign-ups cannot spend resources or
    // operate an already provisioned legacy profile before verification.
    return decoded.email_verified === true ? decoded.uid : null;
  } catch {
    return null;
  }
}

/**
 * Ensure an email-verified user has their initial profile and 75-credit
 * balance provisioned in Firestore.
 */
export async function ensureUserProfile(uid: string, email?: string | null): Promise<boolean> {
  const userRef = adminDb.collection('users').doc(uid) as DocumentReference;
  try {
    await adminDb.runTransaction(async (transaction: Transaction) => {
      const userSnap = (await transaction.get(userRef)) as DocumentSnapshot;
      if (userSnap.exists) {
        return;
      }
      transaction.set(userRef, {
        uid,
        email: email || '',
        credits: 75,
        country: 'Unknown',
        appIds: [],
        appIdLabels: {},
        creditNotificationStage: 'none',
        createdAt: new Date().toISOString(),
      });
    });
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return false;
  }
}
