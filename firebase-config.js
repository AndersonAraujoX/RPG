const firebaseConfig = {
    apiKey: "AIzaSyC-awoLK4cc0XtLtNppibqgYnNLclUeeI4",
    authDomain: "kuar-tor-portal.firebaseapp.com",
    databaseURL: "https://kuar-tor-portal-default-rtdb.firebaseio.com",
    projectId: "kuar-tor-portal",
    storageBucket: "kuar-tor-portal.appspot.com",
    messagingSenderId: "438781244189",
    appId: "1:438781244189:web:99ea6a25fc459b14f567f4",
    measurementId: "G-X5GTEY10VZ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
