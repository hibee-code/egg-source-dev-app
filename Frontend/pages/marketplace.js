import { renderNavbar } from '/components/layout/navbar.js';
import { SearchAPI, PoultryAPI } from '/assets/js/api.js';
import { Auth } from '/assets/js/auth.js';
import { Format, Loading, Pagination, Toast, $ } from '/assets/js/utils.js';

const LGA_MAP = {
  Lagos: [
    'Agege', 'Alimosho', 'Ifako-Ijaiye', 'Ikeja', 'Kosofe', 'Mushin', 
    'Oshodi-Isolo', 'Shomolu', 'Apapa', 'Eti-Osa', 'Lagos Island', 
    'Lagos Mainland', 'Surulere', 'Ajeromi-Ifelodun', 'Amuwo-Odofin', 
    'Ojo', 'Badagry', 'Ikorodu', 'Lekki', 'Epe'
  ],
  Oyo: [
    'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 
    'Ibadan North East', 'Ibadan North West', 'Ibadan South East', 'Ibadan South West', 
    'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 
    'Itesiwaju', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 
    'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 
    'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere', 'Ibarapa'
  ],
  Ogun: [
    'Abeokuta North', 'Abeokuta South', 'Ogun Waterside', 'Ijebu Ode', 'Ijebu East', 
    'Ijebu North', 'Ijebu North East', 'Ikenne', 'Odogbolu', 'Remo North', 
    'Sagamu', 'Imeko Afon', 'Ipokia', 'Yewa North', 'Yewa South', 'Ado-Odo/Ota', 
    'Ewekoro', 'Ifo', 'Obafemi Owode', 'Odeda'
  ],
};

const LGA_COORDS = {
  // Lagos
  'Ikeja': [3.3421, 6.6018],
  'Surulere': [3.3614, 6.5003],
  'Lekki': [3.4833, 6.4281],
  'Epe': [3.9834, 6.5841],
  'Badagry': [2.8834, 6.4244],
  'Lagos Mainland': [3.3792, 6.5244],
  'Kosofe': [3.3721, 6.5802],
  'Amuwo-Odofin': [3.2844, 6.4682],
  'Ikorodu': [3.5101, 6.6149],
  'Eti-Osa': [3.4833, 6.4281],
  'Alimosho': [3.2678, 6.6083],
  'Agege': [3.3278, 6.6178],
  'Ifako-Ijaiye': [3.2878, 6.6800],
  'Oshodi-Isolo': [3.3100, 6.5500],
  'Shomolu': [3.3700, 6.5400],
  'Apapa': [3.3600, 6.4400],
  'Lagos Island': [3.4000, 6.4500],
  'Ajeromi-Ifelodun': [3.3200, 6.4800],
  'Ojo': [3.1800, 6.4600],
  'Ibeju-Lekki': [3.6500, 6.4300],

  // Oyo
  'Ibadan North': [3.9167, 7.4167],
  'Ibadan South': [3.9000, 7.3300],
  'Oyo East': [3.9300, 7.8400],
  'Ogbomosho': [4.2500, 8.1333],
  'Ibarapa': [3.4833, 7.4333],
  'Ibadan South West': [3.8667, 7.3500],
  'Ibadan North East': [3.9333, 7.3833],
  'Ibadan South East': [3.9000, 7.3300],
  'Ibadan North West': [3.8833, 7.4000],
  'Akinyele': [3.9000, 7.5300],
  'Egbeda': [4.0200, 7.3800],
  'Oluyole': [3.8600, 7.2200],
  'Ido': [3.7700, 7.4700],
  'Lagelu': [4.0900, 7.4800],
  'Oyo West': [3.9000, 7.8500],

  // Ogun
  'Abeokuta North': [3.3294, 7.1994],
  'Abeokuta South': [3.3483, 7.1475],
  'Odeda': [3.4333, 7.1667],
  'Obafemi Owode': [3.4500, 7.0200],
  'Ifo': [3.2000, 6.8100],
  'Sagamu': [3.6500, 6.8400],
  'Ijebu Ode': [3.9200, 6.8200],
  'Remo North': [3.7200, 6.9800],
  'Odogbolu': [3.7700, 6.8400],
  'Ikenne': [3.7100, 6.8700],
  'Ewekoro': [3.2100, 6.9300],
  'Ado-Odo/Ota': [3.0100, 6.7000],
};

let currentPage = 1;
let totalPages = 1;
let currentResults = [];
let currentSort = 'newest';
let userCoords = null; // keeps track of { latitude, longitude }

const CACHE_KEY = 'egg_source_gps_location';
const CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

const getCachedLocation = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { coords, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
      return coords;
    }
    sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error('Error reading cached location:', e);
  }
  return null;
};

const setCachedLocation = (coords) => {
  try {
    const data = { coords, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing cached location:', e);
  }
};

const clearCachedLocation = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error('Error clearing cached location:', e);
  }
};

const requestGeolocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable it in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
        }
        reject(new Error(msg));
      },
      options
    );
  });
};

const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return null;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getFarmCoords = (farm) => {
  if (farm.location && farm.location.coordinates && farm.location.coordinates.length === 2) {
    return farm.location.coordinates;
  }
  if (farm.lga && LGA_COORDS[farm.lga]) {
    return LGA_COORDS[farm.lga];
  }
  if (farm.state) {
    if (farm.state === 'Lagos') return [3.3792, 6.5244];
    if (farm.state === 'Oyo') return [3.9167, 7.4167];
    if (farm.state === 'Ogun') return [3.3483, 7.1475];
  }
  return [3.3792, 6.5244];
};

const renderCard = (farm) => {
  const badge = farm.verified ? '<span class="badge-pill badge-pill--success">✓ Verified</span>' : farm.isPremium ? '<span class="badge-pill badge-pill--accent">PREMIUM</span>' : '';
  const chip = farm.deliveryAvailable ? '<span class="product-chip chip--success">Delivery</span>' : '<span class="product-chip chip--muted">Pickup</span>';
  
  let distanceHTML = '';
  if (farm.distance !== undefined && farm.distance !== null) {
    const dist = farm.distance / 1000;
    distanceHTML = `
      <div class="distance-badge">
        <i data-lucide="map-pin"></i>
        <span>${dist.toFixed(1)} km away</span>
      </div>
    `;
  } else if (userCoords) {
    const farmCoords = getFarmCoords(farm);
    const dist = calculateDistance([userCoords.longitude, userCoords.latitude], farmCoords);
    if (dist !== null) {
      distanceHTML = `
        <div class="distance-badge">
          <i data-lucide="map-pin"></i>
          <span>${dist.toFixed(1)} km away</span>
        </div>
      `;
    }
  } else {
    const selectedLga = $('#filter-lga')?.value;
    if (selectedLga && LGA_COORDS[selectedLga]) {
      const farmCoords = getFarmCoords(farm);
      const dist = calculateDistance(LGA_COORDS[selectedLga], farmCoords);
      if (dist !== null) {
        distanceHTML = `
          <div class="distance-badge">
            <i data-lucide="map-pin"></i>
            <span>${dist.toFixed(1)} km away</span>
          </div>
        `;
      }
    }
  }

  return `
    <article class="product-card" data-id="${farm._id}">
      <div class="product-card__image">
        <img src="${farm.imageUrl || 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=900'}" alt="${farm.businessName}" />
        <div class="product-card__badge">${badge}</div>
      </div>
      <div class="product-card__body" style="display: flex; flex-direction: column; flex-grow: 1;">
        <div class="badge-pill badge-pill--muted" style="width: fit-content;">${farm.category || 'Poultry'}</div>
        <h3 class="product-card__title" style="margin: 8px 0 4px;">${farm.businessName}</h3>
        <div class="product-card__meta" style="color: var(--color-text-muted); font-size: 0.88rem;">${farm.lga || 'LGA'}, ${farm.state || 'State'}</div>
        ${distanceHTML}
        <div class="product-card__price" style="margin-top: 12px; margin-bottom: 12px; font-size: 1.25rem; font-weight: var(--font-weight-bold); color: var(--color-primary);">${Format.currency(farm.pricePerCrate || 4200)}</div>
        <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          ${chip}
          <a class="btn btn-secondary btn-pill" href="/pages/farm-detail.html?farmId=${farm._id}">View Details</a>
        </div>
      </div>
    </article>
  `;
};

const renderResults = (farms) => {
  const grid = $('#marketplace-results-grid');
  const count = $('#marketplace-results-count');
  if (!grid || !count) return;

  if (!farms.length) {
    grid.innerHTML = `<div class="card" style="padding: 32px; text-align: center; color: var(--color-text-muted); grid-column: 1 / -1;">No listings match these filters.</div>`;
    count.textContent = '0 verified listings';
    return;
  }

  count.textContent = `Showing ${farms.length} verified listings in Nigeria`;
  grid.innerHTML = farms.map(renderCard).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const renderMap = (farms, selectedLgaCoord = null) => {
  const root = $('#map-markers-root');
  const contextText = $('#map-location-context');
  const userLegend = $('#user-location-legend');
  if (!root) return;
  root.innerHTML = '';

  const activeState = $('#filter-state')?.value || 'All States';
  const activeLga = $('#filter-lga')?.value || '';
  
  if (userCoords) {
    const radiusVal = $('#filter-radius')?.value || '10';
    contextText.textContent = `GPS: Within ${radiusVal} km`;
  } else {
    contextText.textContent = activeLga ? `${activeLga}, ${activeState}` : activeState;
  }

  // Define points array
  const points = (farms || []).map(farm => {
    return {
      id: farm._id,
      name: farm.businessName,
      price: farm.pricePerCrate,
      rating: farm.rating ?? 4.8,
      coords: getFarmCoords(farm),
      isUserCenter: false,
      lga: farm.lga,
      state: farm.state
    };
  });

  if (userCoords) {
    points.push({
      id: 'user-gps-location',
      name: 'Your Location',
      coords: [userCoords.longitude, userCoords.latitude],
      isUserCenter: true
    });
    if (userLegend) {
      userLegend.classList.remove('hidden');
      userLegend.innerHTML = `
        <span class="legend-dot legend-dot--user"></span>
        Your Location
      `;
    }
  } else if (selectedLgaCoord) {
    points.push({
      id: 'selected-center',
      name: `Selected Center: ${activeLga}`,
      coords: selectedLgaCoord,
      isUserCenter: true
    });
    if (userLegend) {
      userLegend.classList.remove('hidden');
      userLegend.innerHTML = `
        <span class="legend-dot legend-dot--user"></span>
        Selected Center
      `;
    }
  } else {
    if (userLegend) userLegend.classList.add('hidden');
  }

  if (!points.length) {
    return;
  }

  const lats = points.map(p => p.coords[1]);
  const lons = points.map(p => p.coords[0]);

  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);

  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;
  const padLat = latDiff === 0 ? 0.05 : latDiff * 0.25;
  const padLon = lonDiff === 0 ? 0.05 : lonDiff * 0.25;

  minLat -= padLat;
  maxLat += padLat;
  minLon -= padLon;
  maxLon += padLon;

  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;

  points.forEach(point => {
    const x = ((point.coords[0] - minLon) / lonRange) * 100;
    const y = 100 - (((point.coords[1] - minLat) / latRange) * 100);

    const marker = document.createElement('div');
    marker.className = `map-marker${point.isUserCenter ? ' active' : ''}`;
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.dataset.id = point.id;

    if (point.isUserCenter) {
      marker.innerHTML = `
        <div class="marker-pin marker-pin--center"></div>
        <div class="marker-tooltip">
          <h4 class="marker-tooltip__title" style="white-space: normal;">${point.name}</h4>
          <div class="marker-tooltip__meta">Search Target</div>
        </div>
      `;
    } else {
      marker.innerHTML = `
        <div class="marker-pulse"></div>
        <div class="marker-pin">
          <span class="marker-inner">🥚</span>
        </div>
        <div class="marker-tooltip">
          <h4 class="marker-tooltip__title">${point.name}</h4>
          <div class="marker-tooltip__meta">${point.lga}, ${point.state}</div>
          <div class="marker-tooltip__footer">
            <span class="marker-tooltip__price">₦${point.price || 4200}</span>
            <span class="marker-tooltip__rating">★ ${point.rating.toFixed(1)}</span>
          </div>
        </div>
      `;

      marker.addEventListener('mouseenter', () => {
        const card = document.querySelector(`.product-card[data-id="${point.id}"]`);
        if (card) card.classList.add('highlighted');
      });

      marker.addEventListener('mouseleave', () => {
        const card = document.querySelector(`.product-card[data-id="${point.id}"]`);
        if (card) card.classList.remove('highlighted');
      });

      marker.addEventListener('click', () => {
        const card = document.querySelector(`.product-card[data-id="${point.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlighted');
          setTimeout(() => card.classList.remove('highlighted'), 2000);
        }
      });
    }

    root.appendChild(marker);
  });
};

const loadLgas = () => {
  const state = $('#filter-state')?.value;
  const lgaField = $('#filter-lga');
  if (!lgaField) return;
  lgaField.innerHTML = `<option value="">All LGAs</option>`;
  (LGA_MAP[state] || []).forEach((lga) => {
    lgaField.innerHTML += `<option value="${lga}">${lga}</option>`;
  });
};

const sortResults = (farms) => {
  if (!farms || !farms.length) return farms;
  return farms.slice().sort((a, b) => {
    if (currentSort === 'newest') {
      // If distance exists, distance-sort by default
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    }
    if (currentSort === 'top') return (b.rating || 0) - (a.rating || 0);
    if (currentSort === 'priceAsc') return (a.pricePerCrate || 0) - (b.pricePerCrate || 0);
    return (b.pricePerCrate || 0) - (a.pricePerCrate || 0);
  });
};

const applyFilters = async (page = 1) => {
  const btn = $('#filter-apply');
  Loading.show(btn, 'Searching...');
  currentPage = page;

  try {
    const filters = {
      category: $('#filter-category')?.value,
      minPrice: $('#filter-min-price')?.value,
      maxPrice: $('#filter-max-price')?.value,
      deliveryAvailable: $('#filter-delivery')?.checked,
      stockAvailable: $('#filter-stock')?.checked,
      page,
      limit: 9,
    };

    if (userCoords) {
      filters.latitude = userCoords.latitude;
      filters.longitude = userCoords.longitude;
      const radiusVal = $('#filter-radius')?.value || '10';
      filters.maxDistance = parseFloat(radiusVal) * 1000; // to meters
    } else {
      filters.state = $('#filter-state')?.value;
      filters.lga = $('#filter-lga')?.value;
    }

    const response = await SearchAPI.searchPoultries(filters);
    let farms = [];
    let apiTotalPages = 1;
    if (response && response.data) {
      if (Array.isArray(response.data)) {
        farms = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        farms = response.data.data;
        apiTotalPages = response.data.totalPages || 1;
      }
    }

    const selectedLga = $('#filter-lga')?.value;
    let selectedLgaCoord = null;
    if (userCoords) {
      farms.forEach(farm => {
        if (farm.distance === undefined || farm.distance === null) {
          const farmCoords = getFarmCoords(farm);
          const distKm = calculateDistance([userCoords.longitude, userCoords.latitude], farmCoords);
          if (distKm !== null) {
            farm.distance = distKm * 1000; // in meters
          }
        }
      });
    } else if (selectedLga && LGA_COORDS[selectedLga]) {
      selectedLgaCoord = LGA_COORDS[selectedLga];
      farms.forEach(farm => {
        const distKm = calculateDistance(selectedLgaCoord, getFarmCoords(farm));
        if (distKm !== null) {
          farm.distance = distKm * 1000; // in meters
        }
      });
    }

    currentResults = sortResults(farms);
    totalPages = apiTotalPages || response.pagination?.totalPages || Math.max(1, Math.ceil((farms.length || 0) / 9));
    renderResults(currentResults);
    renderMap(currentResults, selectedLgaCoord);
    Pagination.render($('#pagination'), { page: currentPage, totalPages }, applyFilters);
  } catch (err) {
    Toast.error(err.message || 'Unable to load listings');
    $('#marketplace-results-grid').innerHTML = `<div class="card" style="padding: 32px; text-align: center; color: var(--color-accent); grid-column: 1 / -1;">Try again later.</div>`;
  } finally {
    Loading.hide(btn);
  }
};

const toggleGpsUI = (active) => {
  const btnGeoloc = $('#btn-geolocation');
  const gpsBadge = $('#gps-status-badge');
  const radiusGrp = $('#filter-radius-group');
  const stateSel = $('#filter-state');
  const lgaSel = $('#filter-lga');

  if (active) {
    if (btnGeoloc) btnGeoloc.classList.add('hidden');
    if (gpsBadge) gpsBadge.classList.remove('hidden');
    if (radiusGrp) radiusGrp.classList.remove('hidden');
    if (stateSel) { stateSel.disabled = true; stateSel.value = ''; }
    if (lgaSel) { lgaSel.disabled = true; lgaSel.innerHTML = '<option value="">All LGAs</option>'; }
  } else {
    if (btnGeoloc) btnGeoloc.classList.remove('hidden');
    if (gpsBadge) gpsBadge.classList.add('hidden');
    if (radiusGrp) radiusGrp.classList.add('hidden');
    if (stateSel) stateSel.disabled = false;
    if (lgaSel) lgaSel.disabled = false;
  }
};

const initPage = async () => {
  renderNavbar({ searchBar: true });

  // Initialize Lucide icons for static elements (button icons, map header)
  if (window.lucide) {
    window.lucide.createIcons();
  }

  $('#filter-state')?.addEventListener('change', loadLgas);
  $('#filter-apply')?.addEventListener('click', () => applyFilters(1));
  $('#filter-radius')?.addEventListener('change', () => applyFilters(1));
  $('#filter-sort')?.addEventListener('change', (event) => {
    currentSort = event.target.value;
    renderResults(sortResults(currentResults));
    renderMap(currentResults, ($('#filter-lga')?.value && LGA_COORDS[$('#filter-lga').value]) || null);
  });

  // Geolocation trigger
  $('#btn-geolocation')?.addEventListener('click', async () => {
    const btn = $('#btn-geolocation');
    Loading.show(btn, 'Locating...');
    try {
      const coords = await requestGeolocation();
      userCoords = coords;
      setCachedLocation(coords);
      toggleGpsUI(true);
      Toast.success('Location updated successfully');
      applyFilters(1);
    } catch (err) {
      Toast.error(err.message || 'Could not access location');
    } finally {
      Loading.hide(btn);
    }
  });

  // Clear Geolocation
  $('#btn-clear-gps')?.addEventListener('click', () => {
    userCoords = null;
    clearCachedLocation();
    toggleGpsUI(false);
    loadLgas();
    applyFilters(1);
  });

  $('#filter-clear')?.addEventListener('click', () => {
    ['filter-state', 'filter-lga', 'filter-min-price', 'filter-max-price', 'filter-category'].forEach((id) => {
      const field = document.getElementById(id);
      if (!field) return;
      if (field.type === 'checkbox') {
        field.checked = false;
      } else {
        field.value = '';
      }
    });
    const delivery = document.getElementById('filter-delivery');
    if (delivery) delivery.checked = false;
    const stock = document.getElementById('filter-stock');
    if (stock) stock.checked = false;
    
    // Clear GPS as well
    userCoords = null;
    clearCachedLocation();
    toggleGpsUI(false);

    loadLgas();
    applyFilters(1);
  });

  window.addEventListener('navbar:search', (event) => {
    $('#filter-category').value = event.detail.query;
    applyFilters(1);
  });

  // Check cache for existing GPS permission/location
  const cachedCoords = getCachedLocation();
  if (cachedCoords) {
    userCoords = cachedCoords;
    toggleGpsUI(true);
  }

  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  const category = params.get('category');
  
  if (state && !userCoords) {
    $('#filter-state').value = state;
  }
  if (category) {
    $('#filter-category').value = category;
  }
  
  loadLgas();
  applyFilters(1);
};

window.addEventListener('DOMContentLoaded', initPage);
