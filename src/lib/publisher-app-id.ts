import type { DocumentData, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

/**
 * Resolve a public App ID to its publisher across the current and legacy
 * account shapes. A collision is intentionally treated as invalid rather
 * than choosing an arbitrary account.
 */
export async function findPublisherByAppId(
  db: Firestore,
  appId: string,
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const users = db.collection('users');
  const snapshots = await Promise.all([
    users.where('appIds', 'array-contains', appId).limit(2).get(),
    users.where('appId', '==', appId).limit(2).get(),
    users.where('apiKeys', 'array-contains', appId).limit(2).get(),
    users.where('apiKey', '==', appId).limit(2).get(),
  ]);

  const publishers = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) publishers.set(document.id, document);
  }

  return publishers.size === 1 ? publishers.values().next().value ?? null : null;
}
