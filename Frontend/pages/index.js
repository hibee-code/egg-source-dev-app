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
          <a class="btn btn-secondary btn-pill" href="/pages/farm-detail.html?farmId=${farm._id}">View Profile</a>
        </div>
      </div>
    </article>
  `;
};

const renderTestimonials = () => {
  const container = $('#testimonials-grid');
  if (!container) return;
  container.innerHTML = testimonials.map((item) => `
    <article class="testimonial-card">
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
};

const initPage = () => {
  renderNavbar();
  initForm();
  renderTestimonials();
};

window.addEventListener('DOMContentLoaded', initPage);
