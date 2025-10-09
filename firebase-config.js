// firebase-config.js
// Firebase Highscore System for Pixel Jump (FINALE, ROBUSTE VERSION)

const firebaseConfig = {
  apiKey: "AIzaSyBlxw4A6HUp3c3ydA1gxQyNfew3VRMuFo8",
  authDomain: "pixel-jumper-43541.firebaseapp.com",
  projectId: "pixel-jumper-43541",
  storageBucket: "pixel-jumper-43541.firebasestorage.app",
  messagingSenderId: "100679285037",
  appId: "1:100679285037:web:a1ac0a00d1c29d3296fba4"
};

let db = null;
let firebaseReady = false;

// Device Fingerprint
function getDeviceId() {
  let deviceId = localStorage.getItem('pixeljump_device');
  if (!deviceId) {
    deviceId = 'px_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('pixeljump_device', deviceId);
  }
  return deviceId;
}

// Rate Limiting
function canSubmitScore() {
  const lastSubmit = localStorage.getItem('pixeljump_last_submit');
  if (lastSubmit && (Date.now() - parseInt(lastSubmit) < 10000)) {
    console.warn('⏱️ Please wait 10 seconds between submissions');
    return false;
  }
  return true;
}

// Lade Firebase Scripts und gib ein Promise zurück
function loadFirebase() {
  return new Promise((resolve) => {
    console.log('🔥 Loading Firebase...');
    const scriptApp = document.createElement('script');
    scriptApp.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    document.head.appendChild(scriptApp);

    scriptApp.onload = () => {
      const scriptFirestore = document.createElement('script');
      scriptFirestore.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
      document.head.appendChild(scriptFirestore);
      
      scriptFirestore.onload = () => {
        try {
          firebase.initializeApp(firebaseConfig);
          db = firebase.firestore();
          firebaseReady = true;
          console.log('✅ Firebase initialized successfully!');
          resolve();
        } catch (error) {
          console.error('❌ Firebase initialization failed:', error);
          resolve();
        }
      };
      scriptFirestore.onerror = () => { console.error('❌ Failed to load Firestore script'); resolve(); };
    };
    scriptApp.onerror = () => { console.error('❌ Failed to load Firebase app script'); resolve(); };
  });
}

// =========================================================================
// WICHTIGE ÄNDERUNG: Wir speichern das Promise der Initialisierung
// =========================================================================
const firebaseInitializationPromise = loadFirebase();

// Submit Score zu Firebase
async function submitScoreToFirebase(name, score) {
  // Zuerst WARTEN, bis die Initialisierung abgeschlossen ist
  await firebaseInitializationPromise;

  if (!firebaseReady) return { success: false, error: 'Firebase not ready' };
  if (!canSubmitScore()) return { success: false, error: 'Please wait' };
  
  try {
    await db.collection('highscores').add({
      name: name || 'Anonymous',
      score: score,
      deviceId: getDeviceId(),
      timestamp: Date.now()
    });
    localStorage.setItem('pixeljump_last_submit', Date.now().toString());
    return { success: true };
  } catch (error) {
    console.error('❌ Firebase submission error:', error);
    return { success: false, error: error.message };
  }
}

// Funktion zum Laden von paginierten Highscores
async function getHighscoresPaged(limit, startAfterDoc = null) {
  // Zuerst WARTEN, bis die Initialisierung abgeschlossen ist
  await firebaseInitializationPromise;

  if (!firebaseReady) {
      console.warn('⚠️ Firebase not ready, returning empty scores');
      return { scores: [], lastDoc: null };
  }
  
  try {
    let query = db.collection("highscores")
        .orderBy("score", "desc")
        .limit(limit);

    if (startAfterDoc) {
        query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();
    const scores = [];
    snapshot.forEach(doc => {
        scores.push({ id: doc.id, ...doc.data() });
    });
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    return { scores, lastDoc };
  } catch (error) {
    console.error("Error getting paged highscores: ", error);
    return { scores: [], lastDoc: null };
  }
}

// Mache die Funktionen global verfügbar
window.submitScoreToFirebase = submitScoreToFirebase;
window.getHighscoresPaged = getHighscoresPaged;
