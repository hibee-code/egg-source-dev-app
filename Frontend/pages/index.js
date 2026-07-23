import { renderNavbar } from '/components/layout/navbar.js';
import { Format, Toast, $ } from '/assets/js/utils.js';
import { PoultryAPI } from '/assets/js/api.js';

const testimonials = [
  { quote: 'Egg Connect made it easy to compare poultry farms and place bookings fast.', name: 'Sade Ogun', role: 'Retail Buyer' },
  { quote: 'As a farmer, I now reach more buyers with reliable orders and better pricing.', name: 'Tunde Adebayo', role: 'Farm Owner' },
  { quote: 'The marketplace design helped our brand look professional to buyers nationwide.', name: 'Nkechi Okechukwu', role: 'Supply Chain Lead' },
];

const featuredSkeleton = `<div class="farm-card skeleton" style="height: 300px;"></div>`;

const renderFarmCard = (farm) => {
  return `
    <article class="farm-card">
      <div class="farm-card__image">
        <img src="${farm.imageUrl || 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=800'}" alt="${farm.businessName}" />
        <span class="farm-card__badge">Rating ${farm.rating || '4.8'}</span>
      </div>
      <div class="farm-card__body">
        <h3 class="farm-card__title">${farm.businessName}</h3>
        <div class="farm-card__meta"><span>${farm.lga || 'Locality'}</span><span>${farm.state || 'State'}</span></div>
        <div class="farm-card__footer">
          <div>
            <div style="color: var(--color-text-muted); font-size: 0.95rem;">From</div>
            <strong>${Format.currency(farm.pricePerCrate || 4200)}</strong>
          </div>
          <a class="btn btn-secondary btn-pill" href="/farm-detail?farmId=${farm._id}">View Profile</a>
        </div>
      </div>
    </article>
  `;
};

const renderTestimonials = () => {
  const container = $('#testimonials-grid');
  if (!container) return;
  container.innerHTML = testimonials.map((item, idx) => `
    <article class="testimonial-card animate-on-enter" data-delay="${(idx + 1) * 100}">
      <p>"${item.quote}"</p>
      <div class="testimonial-meta">
        <div class="avatar-circle" style="background:${Format.avatarColor(item.name)}">${Format.initials(item.name)}</div>
        <div>
          <strong>${item.name}</strong>
          <div style="color: var(--color-text-muted); font-size: 0.95rem;">${item.role}</div>
        </div>
      </div>
    </article>
  `).join('');
  // Apply staggered transition delays
  requestAnimationFrame(() => {
    const cards = container.querySelectorAll('.testimonial-card.animate-on-enter');
    cards.forEach((c) => {
      const d = Number(c.dataset.delay || 0);
      c.style.transitionDelay = `${d}ms`;
    });
  });
};

const renderFeatured = async () => {
  const container = $('#featured-farms');
  if (!container) return;
  container.innerHTML = featuredSkeleton.repeat(3);

  try {
    const res = await PoultryAPI.getAll({ page: 1, limit: 3 });
    const farms = res.data?.poultries || [];
    if (!farms.length) {
      container.innerHTML = `<div class="farm-card" style="padding: 32px; text-align:center; color: var(--color-text-muted);">No featured farms available.</div>`;
      return;
    }
    container.innerHTML = farms.map(renderFarmCard).join('');
  } catch (err) {
    container.innerHTML = `<div class="farm-card" style="padding: 32px; text-align:center; color: var(--color-accent);">Unable to load featured farms.</div>`;
    Toast.error(err.message || 'Could not load farms.');
  }
};

const initForm = () => {
  const heroForm = $('#hero-search-form');
  heroForm?.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  const heroBtn = heroForm?.querySelector('button');
  if (heroBtn) {
    heroBtn.addEventListener('click', () => {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'hero_cta_click', label: 'start_sourcing' });
      } catch (e) {
        console.log('analytics: hero_cta_click');
      }
      window.location.href = '/marketplace';
    });
  }
};

const initPage = () => {
  renderNavbar();
  initForm();
  renderTestimonials();
  initAnimations();
};

/**
 * Animations + count-up
 */
const initAnimations = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        const delay = el.dataset?.delay ? Number(el.dataset.delay) : 0;
        el.style.transition = `opacity var(--anim-duration, 420ms) var(--anim-ease, ease), transform var(--anim-duration, 420ms) var(--anim-ease, ease)`;
        setTimeout(() => el.classList.add('is-visible'), delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.animate-on-enter').forEach((el) => observer.observe(el));

  // Count up implementation
  const animateCountUp = (el, opts = {}) => {
    if (!el) return;
    if (el.dataset._counted) return;
    const target = parseFloat(el.dataset.count || '0');
    const decimals = Number(el.dataset.decimals || 0);
    const duration = Number(el.dataset.duration || 1200);
    const start = performance.now();
    const startVal = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const current = startVal + (target - startVal) * t;
      el.textContent = Number(current).toFixed(decimals);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = Number(target).toFixed(decimals);
        el.dataset._counted = '1';
      }
    };
    requestAnimationFrame(step);
  };

  // Observe stats and trigger count-up when visible
  const stats = document.querySelectorAll('.stat-value');
  if (stats.length) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          animateCountUp(el, { duration: 1200 });
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.35 });
    stats.forEach((s) => statsObserver.observe(s));
  }
};

window.addEventListener('DOMContentLoaded', initPage);
