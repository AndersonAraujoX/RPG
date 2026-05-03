// This script will be executed on the `Rascunhos/terminal da aliança.html` page.
// It will use the firebase instance initialized in `auth.js`

import { auth, db } from '../auth.js';

// DOM elements
const loginSection = document.getElementById('login-section');
const mainContent = document.getElementById('main-content');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const missionListDiv = document.getElementById('mission-list');
const selectedMissionDisplay = document.getElementById('selected-mission-display');
const characterListDiv = document.getElementById('character-list');
const confirmMissionButton = document.getElementById('confirm-mission-button');

// App state
let missions = [];
let characters = [];
let selectedMission = null;
let selectedCharacter = null;
let currentUser = null;

// --- AUTHENTICATION ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loginSection.style.display = 'none';
        mainContent.style.display = 'block';
        fetchMissionsAndCharacters();
    } else {
        currentUser = null;
        mainContent.style.display = 'none';
        loginSection.style.display = 'block';
    }
});

loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            loginError.textContent = error.message;
        });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// --- DATA FETCHING ---
async function fetchMissionsAndCharacters() {
    // Fetch missions
    const missionsSnapshot = await db.collection('missions').get();
    missions = missionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch user's characters
    const charactersSnapshot = await db.collection('personagens').where('userId', '==', currentUser.uid).get();
    characters = charactersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch mission assignments
    const assignmentsSnapshot = await db.collection('mission_assignments').get();
    const assignments = assignmentsSnapshot.docs.map(doc => doc.data());

    // Update character and mission states based on assignments
    assignments.forEach(assignment => {
        const mission = missions.find(m => m.id === assignment.missionId);
        const character = characters.find(c => c.id === assignment.characterId);
        if(mission) mission.assignedCharacter = assignment.characterId;
        if(character) character.assignedMission = assignment.missionId;
    });

    renderMissions();
    renderCharacters();
}

// --- UI RENDERING ---
function renderMissions() {
    missionListDiv.innerHTML = '';
    missions.forEach(mission => {
        const missionLink = document.createElement('a');
        missionLink.href = "#";
        missionLink.className = `mission-item block w-full text-left bg-gray-900 hover:bg-red-800 hover:text-white transition-colors duration-300 p-4 rounded-md font-semibold \${selectedMission && selectedMission.id === mission.id ? 'selected-mission' : ''}`;
        missionLink.dataset.missionId = mission.id;
        missionLink.textContent = mission.name;
        
        if (mission.assignedCharacter) {
            missionLink.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            missionLink.addEventListener('click', (e) => {
                e.preventDefault();
                selectMission(mission.id);
            });
        }
        missionListDiv.appendChild(missionLink);
    });
}

function renderCharacters() {
    characterListDiv.innerHTML = '';
    characters.forEach(character => {
        const characterCard = document.createElement('div');
        characterCard.className = `character-item bg-gray-900 hover:bg-gray-800 text-white p-3 rounded-md cursor-pointer text-center \${selectedCharacter && selectedCharacter.id === character.id ? 'selected-character' : ''} \${character.assignedMission ? 'opacity-50 cursor-not-allowed' : ''}`;
        characterCard.dataset.characterId = character.id;
        characterCard.textContent = character.nome; // Assuming 'nome' is the character name field
        if (!character.assignedMission) {
            characterCard.addEventListener('click', () => {
                selectCharacter(character.id);
            });
        }
        characterListDiv.appendChild(characterCard);
    });
}

// --- SELECTION LOGIC ---
function selectMission(missionId) {
    selectedMission = missions.find(m => m.id === missionId);
    selectedMissionDisplay.textContent = selectedMission ? selectedMission.name : 'Nenhuma';
    if (selectedCharacter && selectedCharacter.assignedMission) {
        selectedCharacter = null;
    }
    updateConfirmButtonState();
    renderMissions();
    renderCharacters();
}

function selectCharacter(characterId) {
    selectedCharacter = characters.find(c => c.id === characterId);
    updateConfirmButtonState();
    renderCharacters();
}

function updateConfirmButtonState() {
    if (selectedMission && selectedCharacter && !selectedMission.assignedCharacter && !selectedCharacter.assignedMission) {
        confirmMissionButton.disabled = false;
        confirmMissionButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        confirmMissionButton.disabled = true;
        confirmMissionButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// --- MISSION CONFIRMATION ---
async function confirmMission() {
    if (selectedMission && selectedCharacter) {
        try {
            await db.collection('mission_assignments').add({
                missionId: selectedMission.id,
                characterId: selectedCharacter.id,
                userId: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`Missão "\${selectedMission.name}" confirmada com o Agente "\${selectedCharacter.nome}"!`);

            selectedMission = null;
            selectedCharacter = null;
            selectedMissionDisplay.textContent = 'Nenhuma';
            
            fetchMissionsAndCharacters(); // Re-fetch all data to ensure consistency
            updateConfirmButtonState();

        } catch (error) {
            console.error("Error confirming mission: ", error);
            alert("Falha ao confirmar a missão. Tente novamente.");
        }
    } else {
        alert('Por favor, selecione uma missão e um agente.');
    }
}
confirmMissionButton.addEventListener('click', confirmMission);

// --- COUNTDOWN SCRIPT ---
const countdownDate = new Date('July 18, 2025 20:00:00').getTime();
const countdownFunction = setInterval(() => {
    const now = new Date().getTime();
    const distance = countdownDate - now;
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    const formatTime = (time) => time < 10 ? `0\${time}` : time;
    document.getElementById('days').innerText = formatTime(days);
    document.getElementById('hours').innerText = formatTime(hours);
    document.getElementById('minutes').innerText = formatTime(minutes);
    document.getElementById('seconds').innerText = formatTime(seconds);
    if (distance < 0) {
        clearInterval(countdownFunction);
        document.getElementById('countdown').innerHTML = '<span class="text-2xl md:text-3xl font-bold text-red-500 pulsate-red">A HORA CHEGOU. SEM VOLTA.</span>';
    }
}, 1000);
