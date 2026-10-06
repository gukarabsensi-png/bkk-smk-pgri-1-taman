import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import {
  getUserProfile,
  saveUserProfile,
  getAllUsers,
  getPencariKerjaByUserId,
  savePencariKerja,
  getPerusahaanByUserId,
  savePerusahaan,
  logAudit
} from '../services/db.js';
import type { UserProfile, UserRole, PencariKerja, Perusahaan } from '../types.js';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  pencariKerja: PencariKerja | null;
  perusahaan: Perusahaan | null;
  loading: boolean;
  isAdmin: boolean;
  isCompany: boolean;
  isUser: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerUser: (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    extra?: Record<string, any>
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin email yang selalu diberi hak akses Administrator
const SUPER_ADMIN_EMAILS = ['gukarabsensi@gmail.com', 'admin@bkkpgri1taman.sch.id'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pencariKerja, setPencariKerja] = useState<PencariKerja | null>(null);
  const [perusahaan, setPerusahaan] = useState<Perusahaan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = async (firebaseUser: User) => {
    try {
      let profile = await getUserProfile(firebaseUser.uid);
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase() || '');

      if (!profile) {
        // Buat profil pengguna baru jika belum tersimpan di Firestore
        const defaultRole: UserRole = isSuperAdmin ? 'admin' : 'user';
        profile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] ?? 'Pengguna BKK'),
          email: firebaseUser.email || '',
          role: defaultRole,
          status: 'active',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date().toISOString()
        };
        await saveUserProfile(profile);
      } else if (isSuperAdmin && profile.role !== 'admin') {
        profile.role = 'admin';
        await saveUserProfile(profile);
      }

      setUserProfile(profile);

      // Muat data spesifik role
      if (profile.role === 'user') {
        let pk = await getPencariKerjaByUserId(profile.id);
        if (!pk) {
          pk = {
            id: 'pk_' + profile.id.slice(0, 10),
            userId: profile.id,
            namaLengkap: profile.name,
            jenisKelamin: 'L',
            noHp: '',
            pendidikan: [
              {
                id: 'edu_smk',
                jenjang: 'SMK',
                institusi: 'SMK PGRI 1 Taman',
                jurusan: 'Semua Jurusan',
                tahunLulus: new Date().getFullYear()
              }
            ],
            pengalaman: [],
            keahlian: [],
            dokumen: [],
            createdAt: new Date().toISOString()
          };
          await savePencariKerja(pk);
        }
        setPencariKerja(pk);
      } else if (profile.role === 'company') {
        const prs = await getPerusahaanByUserId(profile.id);
        setPerusahaan(prs);
      }
    } catch (err) {
      console.error('Error fetching user data from Firestore:', err);
    }
  };

  useEffect(() => {
    // Tangani hasil redirect jika browser memblokir popup
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await fetchUserData(result.user);
          await logAudit('login_google_redirect', 'auth', result.user.uid, null);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result warning:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserProfile(null);
        setPencariKerja(null);
        setPerusahaan(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await fetchUserData(res.user);
      await logAudit('login_google', 'auth', res.user.uid, userProfile);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        throw new Error(
          `Domain "${currentHost}" belum diizinkan di Firebase Console. Harap buka Firebase Console > Authentication > Settings > Authorized Domains dan tambahkan "${currentHost}".`
        );
      }
      if (err?.code === 'auth/popup-blocked') {
        // Fallback otomatis menggunakan signInWithRedirect jika popup diblokir oleh browser
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          throw new Error('Jendela popup login Google diblokir browser. Izinkan pop-up di browser Anda.');
        }
      }
      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Jendela login Google ditutup sebelum proses selesai.');
      }
      if (err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error('Metode Login Google belum diaktifkan di Firebase Console > Authentication > Sign-in method.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        await fetchUserData(res.user);
        // Sinkronkan password aktual ke dokumen Firestore jika belum ada atau berbeda
        if (res.user.uid) {
          const prof = await getUserProfile(res.user.uid);
          if (prof && prof.password !== pass) {
            await saveUserProfile({ ...prof, password: pass });
          }
        }
        await logAudit('login_email', 'auth', res.user.uid, userProfile);
      } catch (authErr: any) {
        // Jika akun didaftarkan langsung oleh Admin di database Firestore atau password diupdate oleh Admin
        const allUsers = await getAllUsers();
        const matched = allUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim()
        );
        if (matched && matched.password && matched.password === pass) {
          if (matched.status === 'blocked') {
            throw new Error('Akun Anda telah dinonaktifkan / diblokir oleh Administrator BKK.');
          }
          // Login terverifikasi dari Firestore data
          setUserProfile(matched);
          if (matched.role === 'user') {
            const pk = await getPencariKerjaByUserId(matched.id);
            setPencariKerja(pk);
          } else if (matched.role === 'company') {
            const prs = await getPerusahaanByUserId(matched.id);
            setPerusahaan(prs);
          }
          await logAudit('login_email_admin_created', 'auth', matched.id, matched);
          return;
        }
        throw authErr;
      }
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    extra?: Record<string, any>
  ) => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });

      const profile: UserProfile = {
        id: res.user.uid,
        name,
        email,
        role,
        status: 'active',
        password: pass,
        createdAt: new Date().toISOString()
      };
      await saveUserProfile(profile);
      setUserProfile(profile);

      if (role === 'user') {
        const pk: PencariKerja = {
          id: 'pk_' + res.user.uid.slice(0, 10),
          userId: res.user.uid,
          namaLengkap: name,
          jenisKelamin: extra?.jenisKelamin || 'L',
          noHp: extra?.noHp || '',
          tahunLulus: extra?.tahunLulus || new Date().getFullYear(),
          jurusan: extra?.jurusan || '',
          pendidikan: [
            {
              id: 'edu_initial',
              jenjang: 'SMK',
              institusi: 'SMK PGRI 1 Taman',
              jurusan: extra?.jurusan || 'Alumni SMK',
              tahunLulus: extra?.tahunLulus || new Date().getFullYear()
            }
          ],
          pengalaman: [],
          keahlian: [],
          dokumen: [],
          createdAt: new Date().toISOString()
        };
        await savePencariKerja(pk);
        setPencariKerja(pk);
      } else if (role === 'company') {
        const prs: Perusahaan = {
          id: 'prs_' + res.user.uid.slice(0, 10),
          userId: res.user.uid,
          namaPerusahaan: extra?.namaPerusahaan || name,
          bidangUsaha: extra?.bidangUsaha || 'Industri & Manufaktur',
          kabupaten: extra?.kabupaten || 'Sidoarjo',
          email,
          noTelepon: extra?.noTelepon || '',
          namaPic: name,
          jabatanPic: extra?.jabatanPic || 'HRD',
          statusVerifikasi: 'pending',
          createdAt: new Date().toISOString()
        };
        await savePerusahaan(prs);
        setPerusahaan(prs);
      }

      await logAudit('register', 'auth', res.user.uid, profile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setPencariKerja(null);
    setPerusahaan(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'operator';
  const isCompany = userProfile?.role === 'company';
  const isUser = userProfile?.role === 'user';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        pencariKerja,
        perusahaan,
        loading,
        isAdmin,
        isCompany,
        isUser,
        loginWithGoogle,
        loginWithEmail,
        registerUser,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
