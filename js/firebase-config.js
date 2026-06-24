// ============================================
// Firebase config — paste your own project keys here
// Firebase Console → Project Settings → General → Your apps → SDK config
// (Same project type as LinkVault — you can reuse that project or make a new one)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCVpyIyIbPspsn-efUWkGCUsxgYCvUF-XM",
  authDomain: "waste-food-tracking.firebaseapp.com",
  projectId: "waste-food-tracking",
  storageBucket: "waste-food-tracking.firebasestorage.app",
  messagingSenderId: "257335584589",
  appId: "1:257335584589:web:93d6c06cbd04fdd1647904"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

