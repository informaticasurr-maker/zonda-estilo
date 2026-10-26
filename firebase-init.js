// Firebase Configuration & Initialization for Zonda Streetwear
const firebaseConfig = {
    apiKey: "AIzaSyD4U0bMFp_Jzi2t3k8gcQlPrCWQLJi_tvw",
    authDomain: "zonda-estilo.firebaseapp.com",
    projectId: "zonda-estilo",
    storageBucket: "zonda-estilo.firebasestorage.app",
    messagingSenderId: "420692244335",
    appId: "1:420692244335:web:f882b6aa9c69a62a689a9a"
};

let firebaseApp = null;
let firestoreDb = null;
let firebaseStorage = null;

try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firestoreDb = firebase.firestore();
        try {
            firebaseStorage = firebase.storage();
        } catch(stErr) {
            console.warn("Firebase Storage init warning:", stErr);
        }
        console.log("🔥 Firebase initialized successfully on Zonda");
    } else if (typeof firebase !== 'undefined' && firebase.apps.length) {
        firebaseApp = firebase.app();
        firestoreDb = firebase.firestore();
        try {
            firebaseStorage = firebase.storage();
        } catch(stErr) {}
    }
} catch(err) {
    console.error("Firebase init error:", err);
}

window.firebaseConfig = firebaseConfig;
window.firebaseApp = firebaseApp;
window.firebaseDb = firestoreDb;
window.firebaseStorage = firebaseStorage;
