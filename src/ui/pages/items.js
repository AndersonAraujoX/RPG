
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginPrompt = document.getElementById('login-prompt');
    const mainContent = document.getElementById('main-content');
    const characterDropdown = document.getElementById('character-dropdown');
    const noCharactersMessage = document.getElementById('no-characters-message');
    const characterContent = document.getElementById('character-content');
    const characterNameDisplay = document.getElementById('character-name-display');
    const addItemButton = document.getElementById('add-item-button');
    const itemsList = document.getElementById('items-list');

    // --- VARIÁVEIS DE ESTADO E FIREBASE ---
    let currentUser = null;
    let selectedCharacterId = null;
    let itemsListener = null;
    let auth, db, rtdb;

    function initializeFirebaseServices() {
        if (!firebase.apps.length) {
            console.error("Firebase não foi inicializado. Verifique se firebase-config.js está carregado.");
            return false;
        }
        auth = firebase.auth();
        db = firebase.firestore();
        rtdb = firebase.database();
        return true;
    }

    async function loadCharacters() {
        if (!currentUser || !db) return;
        try {
            const charactersRef = db.collection(`users/${currentUser.uid}/characters`);
            const snapshot = await charactersRef.get();
            characterDropdown.innerHTML = '<option value="">-- Selecione um Herói --</option>';
            noCharactersMessage.classList.add('hidden');
            if (snapshot.empty) {
                noCharactersMessage.classList.remove('hidden');
                return;
            }
            snapshot.forEach(doc => {
                const character = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = character.name || 'Personagem sem nome';
                characterDropdown.appendChild(option);
            });
        } catch (error) {
            console.error("Erro ao carregar personagens:", error);
            noCharactersMessage.textContent = "Erro ao carregar personagens. Verifique a consola e se os Ad-blockers estão desativados.";
            noCharactersMessage.classList.remove('hidden');
        }
    }

    function toggleMainContent(loggedIn) {
        if (loggedIn) {
            loginPrompt.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            mainContent.classList.remove('hidden');
        } else {
            loginPrompt.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            mainContent.classList.add('hidden');
            characterContent.classList.add('hidden');
        }
    }

    function displayItems(snapshot) {
        const sections = {
            weapon: document.getElementById('list-weapon'),
            armor: document.getElementById('list-armor'),
            accessory: document.getElementById('list-accessory'),
            consumable: document.getElementById('list-consumable')
        };
        Object.values(sections).forEach(el => el.innerHTML = '');
        if (!snapshot.exists()) return;

        snapshot.forEach(childSnapshot => {
            const itemId = childSnapshot.key;
            const item = childSnapshot.val();
            let type = item.type;
            if (!type || type === 'other') type = 'consumable';
            if (!sections[type]) type = 'consumable';

            const itemElement = document.createElement('div');
            itemElement.classList.add('bg-gray-800', 'p-4', 'rounded-lg', 'flex', 'justify-between', 'items-start', 'shadow-md', 'border', 'border-gray-700', 'hover:border-rpg-cyan', 'transition-colors');
            itemElement.innerHTML = `
                <div class="flex-grow pr-4">
                    <h3 class="text-lg font-bold text-white mb-1 flex items-center justify-between">
                        ${item.name} 
                        <span class="text-xs font-normal bg-gray-700 text-gray-300 px-2 py-1 rounded-full">${item.quantity}x</span>
                    </h3>
                    <p class="text-gray-400 text-sm italic whitespace-pre-wrap">${item.description || 'Sem descrição.'}</p>
                </div>
                <button data-id="${itemId}" class="delete-item-btn text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 transition-colors" title="Excluir Item">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            `;
            sections[type].appendChild(itemElement);
        });

        Object.entries(sections).forEach(([key, element]) => {
            if (element.children.length === 0) {
                element.innerHTML = `<p class="text-gray-600 text-sm italic text-center py-2">Nenhum item nesta categoria.</p>`;
            }
        });
    }

    async function addItem() {
        const itemName = document.getElementById('itemName').value.trim();
        const itemType = document.getElementById('itemType').value;
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const itemQuantity = parseInt(document.getElementById('itemQuantity').value, 10);

        if (!itemName || !selectedCharacterId || isNaN(itemQuantity) || itemQuantity < 1) {
            alert("Por favor, selecione um personagem e preencha o nome e a quantidade do item (pelo menos 1).");
            return;
        }

        const newItem = {
            name: itemName,
            type: itemType,
            description: itemDescription,
            quantity: itemQuantity,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            const itemsRef = rtdb.ref(`items/${currentUser.uid}/${selectedCharacterId}`);
            await itemsRef.push(newItem);
            document.getElementById('itemName').value = '';
            document.getElementById('itemDescription').value = '';
            document.getElementById('itemQuantity').value = '1';
        } catch (error) {
            console.error("Erro ao adicionar item:", error);
            alert("Falha ao adicionar o item. Verifique sua conexão e tente novamente.");
        }
    }

    async function deleteItem(itemId) {
        if (!currentUser || !selectedCharacterId || !itemId) return;
        if (confirm("Tem certeza que deseja excluir este item?")) {
            try {
                const itemRef = rtdb.ref(`items/${currentUser.uid}/${selectedCharacterId}/${itemId}`);
                await itemRef.remove();
            } catch (error) {
                console.error("Erro ao deletar item:", error);
                alert("Falha ao deletar o item.");
            }
        }
    }

    if (initializeFirebaseServices()) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            toggleMainContent(!!user);
            if (user) loadCharacters();
        });

        loginButton.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => console.error("Erro de login:", error));
        });

        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.reload();
            }).catch(error => {
                console.error("Erro no logout:", error);
                alert("Erro ao deslogar: " + (error.message || error));
            });
        });
    }

    characterDropdown.addEventListener('change', (e) => {
        selectedCharacterId = e.target.value;
        if (itemsListener) itemsListener.off();

        if (selectedCharacterId) {
            characterContent.classList.remove('hidden');
            characterNameDisplay.textContent = characterDropdown.options[characterDropdown.selectedIndex].text;
            const itemsRef = rtdb.ref(`items/${currentUser.uid}/${selectedCharacterId}`);
            itemsListener = itemsRef.orderByChild('createdAt');
            itemsListener.on('value', displayItems, (error) => {
                console.error("Erro ao carregar itens:", error);
                if (itemsList) itemsList.innerHTML = `<p class="text-red-500">Erro ao carregar inventário.</p>`;
            });
        } else {
            characterContent.classList.add('hidden');
            if (itemsList) itemsList.innerHTML = '';
        }
    });

    addItemButton.addEventListener('click', addItem);
    if (itemsList) {
        itemsList.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('delete-item-btn')) {
                deleteItem(e.target.dataset.id);
            }
        });
    }
});
