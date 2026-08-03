"use strict";


/* =========================
   Elements
========================= */

const header = document.getElementById("header");

const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");
const menuOverlay = document.getElementById("menuOverlay");

const menuLinks = document.querySelectorAll(".menu a");
const revealElements = document.querySelectorAll(".reveal");


/* =========================
   Menu
========================= */

function openMenu() {

    menuBtn.classList.add("active");
    menu.classList.add("open");
    menuOverlay.classList.add("open");

    document.body.classList.add("menu-open");

    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.setAttribute("aria-label", "メニューを閉じる");

}


function closeMenu() {

    menuBtn.classList.remove("active");
    menu.classList.remove("open");
    menuOverlay.classList.remove("open");

    document.body.classList.remove("menu-open");

    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "メニューを開く");

}


function toggleMenu() {

    const isOpen = menu.classList.contains("open");

    if (isOpen) {

        closeMenu();

    } else {

        openMenu();

    }

}


menuBtn.addEventListener("click", toggleMenu);

menuOverlay.addEventListener("click", closeMenu);


menuLinks.forEach((link) => {

    link.addEventListener("click", closeMenu);

});


document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        closeMenu();

    }

});


/* =========================
   Header Scroll
========================= */

function updateHeader() {

    if (window.scrollY > 40) {

        header.classList.add("scrolled");

    } else {

        header.classList.remove("scrolled");

    }

}


window.addEventListener(
    "scroll",
    updateHeader,
    {
        passive: true
    }
);


updateHeader();


/* =========================
   Scroll Reveal
========================= */

const revealObserver = new IntersectionObserver(

    (entries, observer) => {

        entries.forEach((entry) => {

            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("visible");

            observer.unobserve(entry.target);

        });

    },

    {

        threshold: 0.12,

        rootMargin:
            "0px 0px -40px 0px"

    }

);


revealElements.forEach((element) => {

    revealObserver.observe(element);

});