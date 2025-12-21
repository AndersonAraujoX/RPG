document.addEventListener('DOMContentLoaded', () => {

    // Menu de Navegação Responsivo
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // Animação do hamburger
            const hamburger = navToggle.querySelector('.hamburger');
            if (navMenu.classList.contains('active')) {
                hamburger.style.background = 'transparent';
                hamburger.style.transform = 'rotate(180deg)';
            } else {
                hamburger.style.background = 'var(--bone-white)';
                hamburger.style.transform = 'rotate(0deg)';
            }
        });
    }

    // Funcionalidade do Accordion (página lore.html)
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const currentlyActive = document.querySelector('.accordion-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
            }
            item.classList.toggle('active');
        });
    });

    // Funcionalidade do Modal (página personagens.html)
    const modal = document.getElementById('char-modal');
    const charCards = document.querySelectorAll('.char-card');
    const closeModalButton = document.querySelector('.close-button');

    if (modal && charCards.length > 0 && closeModalButton) {
        charCards.forEach(card => {
            card.addEventListener('click', () => {
                const name = card.getAttribute('data-name');
                const details = card.getAttribute('data-details');
                const image = card.getAttribute('data-image');

                document.getElementById('modal-name').textContent = name;
                document.getElementById('modal-details').textContent = details;
                document.getElementById('modal-img').src = image;

                modal.style.display = 'block';
            });
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeModalButton.addEventListener('click', closeModal);
        
        // Fechar ao clicar fora do conteúdo do modal
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
});