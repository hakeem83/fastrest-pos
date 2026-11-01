import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BusinessBackupBundle, BusinessType } from '../types';
import { StorageService } from './storage';

// Initialize Firebase App, Firestore, and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();

export interface CloudBusinessDoc {
  businessId: string;
  ownerUid: string;
  ownerEmail: string;
  businessName: string;
  branchName: string;
  businessType: BusinessType;
  currency: string;
  ordersCount: number;
  totalRevenueMinor: number;
  openShiftsCount: number;
  inventoryItemsCount: number;
  bundle: BusinessBackupBundle;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

const LAST_SYNC_STORAGE_KEY = 'fastrest_last_cloud_sync_time_v2';
const AUTO_SYNC_STORAGE_KEY = 'fastrest_auto_cloud_sync_enabled_v2';

// Helper to recursively strip `undefined` fields so Firestore map serialization succeeds cleanly
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Helper to sanitize and enforce blueprint string lengths & regex
function sanitizeId(id: string): string {
  const cleaned = (id || 'biz-default')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : 'biz-default';
}

function truncateString(val: string | undefined, maxLen: number, fallback: string): string {
  const str = (val || '').trim();
  if (!str) return fallback;
  return str.slice(0, maxLen);
}

export class CloudSyncService {
  static getFirebaseConfigInfo() {
    return {
      projectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      authDomain: firebaseConfig.authDomain,
      appId: firebaseConfig.appId,
      storageBucket: firebaseConfig.storageBucket,
      apiKeyMasked: `${firebaseConfig.apiKey.slice(0, 8)}••••••••••••••••${firebaseConfig.apiKey.slice(-4)}`,
      apiKeyFull: firebaseConfig.apiKey,
      consoleUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data`,
    };
  }

  static getLastSyncTime(): string | null {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  }

  static setLastSyncTime(iso: string): void {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, iso);
  }

  static isAutoSyncEnabled(): boolean {
    const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
    return val === null ? true : val === 'true';
  }

  static setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
  }

  static subscribeAuth(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  static async signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  static async signOutCloud(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Syncs a single local business (defaulting to the currently active business) to Firestore
   */
  static async syncActiveBusinessToCloud(): Promise<CloudBusinessDoc> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً لتفعيل المزامنة السحابية');
    }

    const rawBundle = StorageService.createBusinessBundle();
    const businessId = sanitizeId(rawBundle.business.id || rawBundle.settings.businessId || 'biz-default');

    // Ensureactive snapshot is also saved locally
    StorageService.saveBusinessSnapshot(businessId);

    const sanitizedBundle = sanitizeForFirestore(rawBundle);
    const orders = rawBundle.saleOrders || [];
    const totalRevenueMinor = orders
      .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const openShiftsCount = (rawBundle.shifts || []).filter((s) => s.status === 'open').length;
    const inventoryItemsCount = (rawBundle.inventory || []).length;

    const docPath = `cloud_businesses/${businessId}`;
    const docRef = doc(db, 'cloud_businesses', businessId);

    // Check if document already exists to preserve createdAt on update
    let existingDocSnap;
    try {
      existingDocSnap = await getDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }

    const payloadBase = {
      businessId,
      ownerUid: sanitizeId(user.uid),
      ownerEmail: truncateString(user.email || 'owner@fastrest.local', 256, 'owner@fastrest.local'),
      businessName: truncateString(rawBundle.settings.restaurantName || rawBundle.business.name, 200, 'منشأة تجارية'),
      branchName: truncateString(rawBundle.settings.branchName || rawBundle.business.branchName, 200, 'الفرع الرئيسي'),
      businessType: (rawBundle.settings.businessType === 'retail' ? 'retail' : 'restaurant') as BusinessType,
      currency: truncateString(rawBundle.settings.currency || 'ج.م', 20, 'ج.م'),
      ordersCount: Math.max(0, Math.floor(orders.length)),
      totalRevenueMinor: Math.max(0, Math.floor(totalRevenueMinor)),
      openShiftsCount: Math.max(0, Math.floor(openShiftsCount)),
      inventoryItemsCount: Math.max(0, Math.floor(inventoryItemsCount)),
      bundle: sanitizedBundle,
    };

    try {
      if (existingDocSnap && existingDocSnap.exists()) {
        const existingData = existingDocSnap.data();
        await setDoc(docRef, {
          ...payloadBase,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          ...payloadBase,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        existingDocSnap && existingDocSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        docPath
      );
    }

    const nowIso = new Date().toISOString();
    this.setLastSyncTime(nowIso);

    return {
      ...payloadBase,
      updatedAt: nowIso,
    };
  }

  /**
   * Syncs ALL registered local businesses on this device to Firestore
   */
  static async syncAllLocalBusinessesToCloud(): Promise<number> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');
    }

    // First sync active business
    await this.syncActiveBusinessToCloud();
    let syncedCount = 1;

    const activeId = StorageService.getActiveBusinessId();
    const allBusinesses = StorageService.getBusinesses();

    for (const biz of allBusinesses) {
      if (biz.id === activeId) continue;
      const rawSnapshot = localStorage.getItem(`fastrest_biz_bundle_${biz.id}`);
      if (!rawSnapshot) continue;

      try {
        const bundle: BusinessBackupBundle = JSON.parse(rawSnapshot);
        const businessId = sanitizeId(biz.id);
        const docPath = `cloud_businesses/${businessId}`;
        const docRef = doc(db, 'cloud_businesses', businessId);

        let existingSnap;
        try {
          existingSnap = await getDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, docPath);
        }

        const orders = bundle.saleOrders || [];
        const totalRevenueMinor = orders
          .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const openShiftsCount = (bundle.shifts || []).filter((s) => s.status === 'open').length;
        const inventoryItemsCount = (bundle.inventory || []).length;

        const payloadBase = {
          businessId,
          ownerUid: sanitizeId(user.uid),
          ownerEmail: truncateString(user.email || 'owner@fastrest.local', 256, 'owner@fastrest.local'),
          businessName: truncateString(bundle.settings?.restaurantName || biz.name, 200, 'منشأة تجارية'),
          branchName: truncateString(bundle.settings?.branchName || biz.branchName, 200, 'الفرع الرئيسي'),
          businessType: (bundle.settings?.businessType === 'retail' ? 'retail' : 'restaurant') as BusinessType,
          currency: truncateString(bundle.settings?.currency || biz.currency || 'ج.م', 20, 'ج.م'),
          ordersCount: Math.max(0, Math.floor(orders.length)),
          totalRevenueMinor: Math.max(0, Math.floor(totalRevenueMinor)),
          openShiftsCount: Math.max(0, Math.floor(openShiftsCount)),
          inventoryItemsCount: Math.max(0, Math.floor(inventoryItemsCount)),
          bundle: sanitizeForFirestore(bundle),
        };

        try {
          if (existingSnap && existingSnap.exists()) {
            const existingData = existingSnap.data();
            await setDoc(docRef, {
              ...payloadBase,
              createdAt: existingData.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(docRef, {
              ...payloadBase,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          syncedCount++;
        } catch (err) {
          handleFirestoreError(
            err,
            existingSnap && existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
            docPath
          );
        }
      } catch (e) {
        console.error('Failed syncing secondary business:', biz.id, e);
      }
    }

    this.setLastSyncTime(new Date().toISOString());
    return syncedCount;
  }

  /**
   * Subscribes in real-time to all cloud-synced branches.
   * If the authenticated user is the Super Admin (magwwad@gmail.com), subscribes to ALL branches across the system.
   */
  static subscribeCloudBusinesses(
    onUpdate: (docs: CloudBusinessDoc[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const user = auth.currentUser;
    if (!user) {
      onUpdate([]);
      return () => {};
    }

    const isSuperAdmin = user.email?.toLowerCase() === 'magwwad@gmail.com';
    const q = isSuperAdmin
      ? query(collection(db, 'cloud_businesses'))
      : query(collection(db, 'cloud_businesses'), where('ownerUid', '==', user.uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: CloudBusinessDoc[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as CloudBusinessDoc);
        });
        onUpdate(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'cloud_businesses');
        } catch (formattedErr) {
          if (onError && formattedErr instanceof Error) {
            onError(formattedErr);
          }
        }
      }
    );
  }

  /**
   * Fetches all cloud businesses for the current user (or all if Super Admin) once
   */
  static async fetchCloudBusinessesOnce(): Promise<CloudBusinessDoc[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const isSuperAdmin = user.email?.toLowerCase() === 'magwwad@gmail.com';
    const q = isSuperAdmin
      ? query(collection(db, 'cloud_businesses'))
      : query(collection(db, 'cloud_businesses'), where('ownerUid', '==', user.uid));

    try {
      const snap = await getDocs(q);
      const list: CloudBusinessDoc[] = [];
      snap.forEach((d) => list.push(d.data() as CloudBusinessDoc));
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'cloud_businesses');
    }
  }

  /**
   * Remotely updates a cloud branch's bundle (e.g. changing menu prices, inventory stock, user PINs, or branch settings)
   * directly in Firestore from the Super Admin Remote Command Center.
   */
  static async updateRemoteBranchBundle(
    cloudDoc: CloudBusinessDoc,
    updatedBundle: BusinessBackupBundle
  ): Promise<CloudBusinessDoc> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('يرجى تسجيل الدخول بحساب Google للأدمين العام أولاً لتعديل بيانات الفرع عن بُعد');
    }

    const businessId = sanitizeId(cloudDoc.businessId);
    const docPath = `cloud_businesses/${businessId}`;
    const docRef = doc(db, 'cloud_businesses', businessId);

    let existingSnap;
    try {
      existingSnap = await getDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }

    const sanitizedBundle = sanitizeForFirestore(updatedBundle);
    const orders = updatedBundle.saleOrders || [];
    const totalRevenueMinor = orders
      .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const openShiftsCount = (updatedBundle.shifts || []).filter((s) => s.status === 'open').length;
    const inventoryItemsCount = (updatedBundle.inventory || []).length;

    const existingOwnerUid =
      existingSnap && existingSnap.exists()
        ? existingSnap.data().ownerUid
        : cloudDoc.ownerUid || sanitizeId(user.uid);
    const existingOwnerEmail =
      existingSnap && existingSnap.exists()
        ? existingSnap.data().ownerEmail
        : cloudDoc.ownerEmail || user.email || 'owner@fastrest.local';

    const payloadBase = {
      businessId,
      ownerUid: sanitizeId(existingOwnerUid),
      ownerEmail: truncateString(existingOwnerEmail, 256, 'owner@fastrest.local'),
      businessName: truncateString(
        updatedBundle.settings?.restaurantName || updatedBundle.business?.name || cloudDoc.businessName,
        200,
        'منشأة تجارية'
      ),
      branchName: truncateString(
        updatedBundle.settings?.branchName || updatedBundle.business?.branchName || cloudDoc.branchName,
        200,
        'الفرع الرئيسي'
      ),
      businessType: (
        updatedBundle.settings?.businessType === 'retail' ? 'retail' : 'restaurant'
      ) as BusinessType,
      currency: truncateString(
        updatedBundle.settings?.currency || cloudDoc.currency || 'ج.م',
        20,
        'ج.م'
      ),
      ordersCount: Math.max(0, Math.floor(orders.length)),
      totalRevenueMinor: Math.max(0, Math.floor(totalRevenueMinor)),
      openShiftsCount: Math.max(0, Math.floor(openShiftsCount)),
      inventoryItemsCount: Math.max(0, Math.floor(inventoryItemsCount)),
      bundle: sanitizedBundle,
    };

    try {
      if (existingSnap && existingSnap.exists()) {
        const existingData = existingSnap.data();
        await setDoc(docRef, {
          ...payloadBase,
          createdAt: existingData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, {
          ...payloadBase,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        existingSnap && existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        docPath
      );
    }

    // If this branch also exists on this local browser, keep its local snapshot in sync
    localStorage.setItem(`fastrest_biz_bundle_${businessId}`, JSON.stringify(sanitizedBundle));
    if (StorageService.getActiveBusinessId() === businessId) {
      StorageService.loadBusinessSnapshot(sanitizedBundle);
    }

    const nowIso = new Date().toISOString();
    this.setLastSyncTime(nowIso);

    return {
      ...payloadBase,
      updatedAt: nowIso,
    };
  }

  /**
   * Restores a cloud business snapshot into local storage and optionally switches to it
   */
  static restoreCloudBusinessToLocal(cloudDoc: CloudBusinessDoc, switchImmediately = true): void {
    if (!cloudDoc || !cloudDoc.bundle) {
      throw new Error('بيانات النسخة السحابية غير مكتملة');
    }

    const bundle = cloudDoc.bundle;
    const bizId = cloudDoc.businessId;

    // Ensure business id consistency
    if (bundle.business) {
      bundle.business.id = bizId;
    }
    if (bundle.settings) {
      bundle.settings.businessId = bizId;
    }

    // Save snapshot in local storage
    localStorage.setItem(`fastrest_biz_bundle_${bizId}`, JSON.stringify(bundle));

    // Register in local businesses list if not present
    const localList = StorageService.getBusinesses();
    const existsIdx = localList.findIndex((b) => b.id === bizId);
    const updatedBizMeta = {
      id: bizId,
      name: cloudDoc.businessName,
      branchName: cloudDoc.branchName,
      businessType: cloudDoc.businessType,
      currency: cloudDoc.currency,
      phone: bundle.settings?.phone || '',
      address: bundle.settings?.address || '',
      createdAt: bundle.business?.createdAt || new Date().toISOString().split('T')[0],
      lastOpenedAt: new Date().toISOString(),
    };

    if (existsIdx >= 0) {
      localList[existsIdx] = updatedBizMeta;
    } else {
      localList.unshift(updatedBizMeta);
    }
    localStorage.setItem('fastrest_businesses_list_v2', JSON.stringify(localList));

    if (switchImmediately) {
      const currentActiveId = StorageService.getActiveBusinessId();
      if (currentActiveId === bizId) {
        StorageService.loadBusinessSnapshot(bundle);
      } else {
        StorageService.switchBusiness(bizId);
      }
    }
  }

  /**
   * Pulls a single branch snapshot from Firestore by businessId and restores it locally
   */
  static async pullSingleCloudBranchById(
    businessId: string,
    switchImmediately = true
  ): Promise<CloudBusinessDoc | null> {
    if (!auth.currentUser) return null;
    const cleanId = sanitizeId(businessId);
    const docPath = `cloud_businesses/${cleanId}`;
    try {
      const snap = await getDoc(doc(db, 'cloud_businesses', cleanId));
      if (!snap.exists()) return null;
      const cloudDoc = snap.data() as CloudBusinessDoc;
      this.restoreCloudBusinessToLocal(cloudDoc, switchImmediately);
      return cloudDoc;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  /**
   * Deletes a branch snapshot from the cloud (does not delete local data)
   */
  static async deleteCloudBusiness(businessId: string): Promise<void> {
    const cleanId = sanitizeId(businessId);
    const docPath = `cloud_businesses/${cleanId}`;
    try {
      await deleteDoc(doc(db, 'cloud_businesses', cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
}
