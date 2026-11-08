// TRILYVA Firebase Analytics bootstrap.
// Analytics failure is intentionally isolated from the renderer.
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXGbi5tZ7y1TdBlT-BQ87ti2r1ooKwzIQ",
  authDomain: "trilyva-tamasrazim.firebaseapp.com",
  projectId: "trilyva-tamasrazim",
  storageBucket: "trilyva-tamasrazim.firebasestorage.app",
  messagingSenderId: "379328294240",
  appId: "1:379328294240:web:8c581051e9b7e964a68205",
  measurementId: "G-RC1MFKG047"
};

(async function startTrilyvaAnalytics() {
  try {
    if (!(await isSupported())) return;

    const app = getApps().some((item) => item.name === "[DEFAULT]")
      ? getApp()
      : initializeApp(firebaseConfig);

    getAnalytics(app);
  } catch (error) {
    // Analytics must never prevent the editor from starting.
    console.warn("[TRILYVA] Firebase Analytics is unavailable.", error);
  }
})();
