import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBw–DtC_htjtNPfhOvahS3q03xTmTH0XDs',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth: Auth;
try { auth = getAuth(app); }
catch { auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }

export { app, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged };
