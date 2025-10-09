// firebase-config.js
// Firebase Highscore System for Pixel Jump

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

// Device Fingerprint für Spam Prevention
function getDeviceId() {
  let deviceId = localStorage.getItem('pixeljump_device');
  
  if (!deviceId) {
    deviceId = 'px_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('pixeljump_device', deviceId);
  }
  
  return deviceId;
}

// Rate Limiting Check
function canSubmitScore() {
  const lastSubmitKey = 'pixeljump_last_submit';
  const lastSubmit = localStorage.getItem(lastSubmitKey);
  
  if (lastSubmit) {
    const timeSince = Date.now() - parseInt(lastSubmit);
    if (timeSince < 10000) { // 10 Sekunden Cooldown
      console.warn('⏱️ Please wait 10 seconds between submissions');
      return false;
    }
  }
  
  return true;
}

// Lade Firebase Scripts
function loadFirebase() {
  return new Promise((resolve) => {
    console.log('🔥 Loading Firebase...');
    
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    document.head.appendChild(script1);

    script1.onload = function() {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
      document.head.appendChild(script2);
      
      script2.onload = function() {
        console.log('🔥 Firebase scripts loaded');
        
        try {
          const app = firebase.initializeApp(firebaseConfig);
          db = firebase.firestore();
          firebaseReady = true;
          
          console.log('✅ Firebase initialized successfully!');
          resolve();
        } catch (error) {
          console.error('❌ Firebase initialization failed:', error);
          resolve(); // Resolve anyway to not block game
        }
      };
      
      script2.onerror = function() {
        console.error('❌ Failed to load Firestore script');
        resolve();
      };
    };
    
    script1.onerror = function() {
      console.error('❌ Failed to load Firebase app script');
      resolve();
    };
  });
}

// Submit Score zu Firebase
async function submitScoreToFirebase(name, score) {
  if (!firebaseReady) {
    console.error('❌ Firebase not ready!');
    return { success: false, error: 'Firebase not ready' };
  }
  
  // Rate Limiting
  if (!canSubmitScore()) {
    return { success: false, error: 'Please wait before submitting again' };
  }
  
  const deviceId = getDeviceId();
  
  try {
    console.log('📤 Submitting to Firebase:', { name, score, deviceId });
    
    await db.collection('highscores').add({
      name: name || 'Anonymous',
      score: score,
      deviceId: deviceId,
      timestamp: Date.now()
    });
    
    // Update last submit time
    localStorage.setItem('pixeljump_last_submit', Date.now().toString());
    
    console.log('✅ Score submitted successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Firebase submission error:', error);
    return { success: false, error: error.message };
  }
}

// Funktion zum Laden von paginierten Highscores

async function getHighscoresPaged(limit, startAfterDoc = null) {
    try {
        // Stelle sicher, dass 'db' initialisiert ist
        if (!db) {
            console.error("Firestore DB ist nicht initialisiert.");
            return { scores: [], lastDoc: null };
        }

        // KORREKTUR HIER: von "scores" zu "highscores" geändert
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

// Auto-load Firebase when script loads
loadFirebase();

// Make functions globally available
window.submitScoreToFirebase = submitScoreToFirebase;
window.getHighscores = getHighscores;
window.firebaseReady = () => firebaseReady;
