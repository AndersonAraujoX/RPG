const firebaseConfig = {
    apiKey: "AIzaSyDzdmWbibdIDwd1VkgOzne1Nd8l4WVBDXw",
    authDomain: "rpg---mesa.firebaseapp.com",
    projectId: "rpg---mesa",
    storageBucket: "rpg---mesa.firebasestorage.app",
    messagingSenderId: "724621847047",
    appId: "1:724621847047:web:cb561e9792b26b80ab98a2",
    measurementId: "G-E9YVLZMB0W"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
