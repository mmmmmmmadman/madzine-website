/**
 * MADZINE Brand Website - Main Interactive Logic
 * Pure JavaScript, no frameworks.
 */

/* =========================================================
   1. Dark Mode Toggle
   ========================================================= */
const DarkMode = {
  STORAGE_KEY: 'madzine-mode',
  ATTR: 'data-mode',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = saved || (prefersDark ? 'dark' : 'light');
    this._apply(mode);

    const btn = document.getElementById('mode-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute(this.ATTR);
    const next = current === 'dark' ? 'light' : 'dark';
    this._apply(next);
    localStorage.setItem(this.STORAGE_KEY, next);
  },

  _apply(mode) {
    document.documentElement.setAttribute(this.ATTR, mode);
    const btn = document.getElementById('mode-toggle');
    if (btn) {
      btn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.textContent = mode === 'dark' ? '\u2600' : '\u263E';
    }
  }
};

/* =========================================================
   2. Mobile Navigation
   ========================================================= */
const MobileNav = {
  init() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => this._toggle(toggle, nav));

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => this._close(toggle, nav));
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('is-open')) {
        this._close(toggle, nav);
      }
    });
  },

  _toggle(toggle, nav) {
    const open = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  },

  _close(toggle, nav) {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
};

/* =========================================================
   3. Smooth Scroll Header Behavior
   ========================================================= */
const HeaderScroll = {
  SCROLLED_CLASS: 'header--scrolled',

  init() {
    const header = document.querySelector('header');
    if (!header) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this._update(header);
          ticking = false;
        });
        ticking = true;
      }
    });

    this._update(header);
  },

  _update(header) {
    const offset = window.scrollY;
    if (offset > 60) {
      header.classList.add(this.SCROLLED_CLASS);
    } else {
      header.classList.remove(this.SCROLLED_CLASS);
    }
  }
};

/* =========================================================
   4. Scroll Reveal (fade-in on enter viewport)
   ========================================================= */
const ScrollReveal = {
  init() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
  }
};

/* =========================================================
   5. Slideshow (works page category images)
   ========================================================= */
const Slideshow = {
  INTERVAL: 10000, // 10 seconds

  init() {
    const slideshows = document.querySelectorAll('.works-category__slideshow');
    if (!slideshows.length) return;

    slideshows.forEach((container) => {
      const images = container.querySelectorAll('img');
      if (images.length <= 1) return;

      let current = 0;

      setInterval(() => {
        images[current].classList.remove('active');
        current = (current + 1) % images.length;
        images[current].classList.add('active');
      }, this.INTERVAL);
    });
  }
};

/* =========================================================
   6. Page Transition (fade-in / fade-out)
   ========================================================= */
const PageTransition = {
  _navigating: false,

  init() {
    // Fade-in on load
    document.body.classList.add('page-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('page-enter');
        document.body.classList.add('page-ready');
      });
    });

    // Restore from bfcache (browser back/forward)
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        this._navigating = false;
        document.body.classList.remove('page-exit', 'page-enter');
        document.body.classList.add('page-ready');
      }
    });

    // Fade-out on navigation
    document.addEventListener('click', (e) => {
      if (this._navigating) return;

      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');
      // Skip external links, anchors, javascript, new-tab links
      if (!href ||
          href.startsWith('#') ||
          href.startsWith('javascript') ||
          href.startsWith('http') ||
          link.target === '_blank') return;

      e.preventDefault();
      this._navigating = true;
      document.body.classList.remove('page-ready');
      document.body.classList.add('page-exit');

      setTimeout(function() {
        window.location.href = href;
      }, 500);
    });
  }
};

/* =========================================================
   7. Initialization
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  DarkMode.init();
  MobileNav.init();
  HeaderScroll.init();
  ScrollReveal.init();
  Slideshow.init();
  PageTransition.init();
});
