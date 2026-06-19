document.addEventListener('DOMContentLoaded', () => {
    const navbars = document.querySelectorAll('.navbar');

    navbars.forEach((navbar) => {
        const toggle = navbar.querySelector('.menu-toggle');
        const links = navbar.querySelectorAll('.menu a');

        if (toggle) {
            toggle.addEventListener('click', () => {
                navbar.classList.toggle('open');
                const expanded = navbar.classList.contains('open');
                toggle.setAttribute('aria-expanded', expanded.toString());
            });
        }

        links.forEach((link) => {
            link.addEventListener('click', () => {
                if (navbar.classList.contains('open')) {
                    navbar.classList.remove('open');
                    if (toggle) toggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    });
});