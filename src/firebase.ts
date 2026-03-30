import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, onSnapshot, query, setDoc, getDocFromServer, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Lazy Storage initialization to prevent crash if service is not provisioned
let storageInstance: any = null;
export const getStorageInstance = () => {
  if (storageInstance) return storageInstance;
  try {
    storageInstance = getStorage(app);
    return storageInstance;
  } catch (error) {
    console.warn("Firebase Storage service is not available. Please ensure it is enabled in the Firebase Console.", error);
    return null;
  }
};

// Helper for Google Login
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const loginWithCPF = async (cpf: string, pass: string) => {
  const cleanCpf = cpf.replace(/\D/g, '');
  const email = `${cleanCpf}@bemdagente.com.br`;
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("CPF login error:", error);
    throw error;
  }
};

export const checkPreRegistration = async (cpf: string) => {
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // 1. Check pre_registrations (standard flow)
  const preRegRef = doc(db, 'pre_registrations', cleanCpf);
  const preRegSnap = await getDoc(preRegRef);
  if (preRegSnap.exists()) return { ...preRegSnap.data(), source: 'pre_registrations' };

  // 2. Check users collection for documents with CPF as ID (manual admin creation)
  const userCpfRef = doc(db, 'users', cleanCpf);
  const userCpfSnap = await getDoc(userCpfRef);
  if (userCpfSnap.exists() && !userCpfSnap.data().senha_criada) {
    return { ...userCpfSnap.data(), source: 'users_cpf' };
  }

  // 3. Check users collection by CPF field (if document ID is UID but password not set)
  // This is less likely but good for robustness
  return null;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const registerWithCPF = async (cpf: string, pass: string, data: any, phone: string, email: string, birthDate: string) => {
  const cleanCpf = cpf.replace(/\D/g, '');
  const emailToUse = email || `${cleanCpf}@bemdagente.com.br`;
  
  // Format CPF for Firestore (matches rules regex: 000.000.000-00)
  const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  try {
    const result = await createUserWithEmailAndPassword(auth, emailToUse, pass);
    
    // Create user profile with UID as ID
    try {
      await setDoc(doc(db, 'users', result.user.uid), {
        ...data,
        cpf: formattedCpf,
        email: emailToUse,
        telefone: phone,
        data_nascimento: birthDate,
        senha_criada: true,
        status: 'ativo',
        role: 'user',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${result.user.uid}`);
    }
    
    // Cleanup: Delete from pre_registrations
    try {
      await deleteDoc(doc(db, 'pre_registrations', cleanCpf));
    } catch (err) {
      // We don't throw here as the main operation (user creation) succeeded
      console.warn("Could not delete pre-registration doc:", err);
    }

    // Cleanup: Delete manual user doc with CPF as ID if it exists
    try {
      await deleteDoc(doc(db, 'users', cleanCpf));
    } catch (err) {
      // Ignore if it doesn't exist or permission denied
    }

    return result.user;
  } catch (error) {
    console.error("CPF register error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    if (!result.user.emailVerified) {
      throw new Error("Por favor, verifique seu e-mail antes de fazer login.");
    }
    return result.user;
  } catch (error) {
    console.error("Email login error:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(result.user);
    // Sign out immediately so they have to verify before logging in
    await signOut(auth);
    return result.user;
  } catch (error) {
    console.error("Email register error:", error);
    throw error;
  }
};

// Helper for Logout
export const logout = () => signOut(auth);

// Storage Helpers
export const uploadFile = async (path: string, file: File) => {
  const s = getStorageInstance();
  if (!s) throw new Error("Firebase Storage não está disponível. Contate o administrador.");
  const storageRef = ref(s, path);
  const result = await uploadBytes(storageRef, file);
  return getDownloadURL(result.ref);
};

export const deleteFile = async (path: string) => {
  const s = getStorageInstance();
  if (!s) throw new Error("Firebase Storage não está disponível.");
  const storageRef = ref(s, path);
  await deleteObject(storageRef);
};

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
