
const API = {
  primary: (date, endpoint) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/${endpoint}`,
  fallback: (date, endpoint) => `https://${date}.currency-api.pages.dev/v1/${endpoint}`,
};

const commonNames = {
  eur: 'Euro', usd: 'US-Dollar', gbp: 'Britisches Pfund', chf: 'Schweizer Franken',
  try: 'Türkische Lira', all: 'Albanischer Lek', mkd: 'Mazedonischer Denar',
  jpy: 'Japanischer Yen', cny: 'Chinesischer Yuan', cad: 'Kanadischer Dollar',
  aud: 'Australischer Dollar', sek: 'Schwedische Krone', nok: 'Norwegische Krone',
  dkk: 'Dänische Krone', pln: 'Polnischer Złoty', bam: 'Konvertible Mark',
  rsd: 'Serbischer Dinar', btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana',
  xau: 'Goldunze', xag: 'Silberunze', aed: 'VAE-Dirham', sar: 'Saudi-Riyal',
};

const flagMap = {
  eur: '🇪🇺', usd: '🇺🇸', gbp: '🇬🇧', chf: '🇨🇭', try: '🇹🇷', all: '🇦🇱',
  mkd: '🇲🇰', jpy: '🇯🇵', cny: '🇨🇳', cad: '🇨🇦', aud: '🇦🇺', sek: '🇸🇪',
  nok: '🇳🇴', dkk: '🇩🇰', pln: '🇵🇱', bam: '🇧🇦', rsd: '🇷🇸', aed: '🇦🇪',
  sar: '🇸🇦', inr: '🇮🇳', brl: '🇧🇷', mxn: '🇲🇽', btc: '₿', eth: 'Ξ',
  sol: '◎', xau: 'Au', xag: 'Ag',
};

const fallbackCurrencies = {
  eur: 'Euro', usd: 'US Dollar', gbp: 'British Pound', chf: 'Swiss Franc', try: 'Turkish Lira',
  all: 'Albanian Lek', mkd: 'Macedonian Denar', jpy: 'Japanese Yen', cny: 'Chinese Yuan',
  cad: 'Canadian Dollar', aud: 'Australian Dollar', sek: 'Swedish Krona', nok: 'Norwegian Krone',
  dkk: 'Danish Krone', pln: 'Polish Zloty', bam: 'Bosnian Convertible Mark', rsd: 'Serbian Dinar',
  btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', xau: 'Gold Ounce', xag: 'Silver Ounce',
};

const params = new URLSearchParams(window.location.search);

const state = {
  from: params.get('from')?.toLowerCase() || localStorage.getItem('kursly-from') || 'eur',
  to: params.get('to')?.toLowerCase() || localStorage.getItem('kursly-to') || 'usd',
  amount: localStorage.getItem('kursly-amount') || '100',
  date: 'latest',
  currencies: fallbackCurrencies,
  rates: null,
  apiDate: null,
  activeTarget: 'from',
  deferredInstall: null,
  favorites: [],
};

try {
  state.favorites = JSON.parse(localStorage.getItem('kursly-favorites') || '[]');
} catch {
  state.favorites = [];
}

const els = {
  amount: document.querySelector('#amount'),
  result: document.querySelector('#result'),
  fromCurrency: document.querySelector('#fromCurrency'),
  toCurrency: document.querySelector('#toCurrency'),
  swapButton: document.querySelector('#swapButton'),
  rateDate: document.querySelector('#rateDate'),
  rateLine: document.querySelector('#rateLine'),
  updatedLine: document.querySelector('#updatedLine'),
  currencyDialog: document.querySelector('#currencyDialog'),
  currencySearch: document.querySelector('#currencySearch'),
  currencyList: document.querySelector('#currencyList'),
  rateGrid: document.querySelector('#rateGrid'),
  refreshButton: document.querySelector('#refreshButton'),
  shareButton: document.querySelector('#shareButton'),
  connectionState: document.querySelector('#connectionState'),
  installButton: document.querySelector('#installButton'),
  toast: document.querySelector('#toast'),
  favoriteButton: document.querySelector('#favoriteButton'),
  favoritesSection: document.querySelector('#favoritesSection'),
  favoritesGrid: document.querySelector('#favoritesGrid'),
  quickAmounts: document.querySelector('.quick-amounts'),
};

const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 });
const compactFormatter = new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 6 });
const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });

function currencyName(code) {
  return commonNames[code] || state.currencies[code] || code.toUpperCase();
}

function currencyIcon(code) {
  return flagMap[code] || code.slice(0, 2).toUpperCase();
}

function parseAmount(value) {
  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatValue(value) {
  if (!Number.isFinite(value)) return '–';
  if (Math.abs(value) >= 1_000_000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)) {
    return value.toLocaleString('de-DE', { notation: 'compact', maximumSignificantDigits: 6 });
  }
  return numberFormatter.format(value);
}

function setCurrencyButton(button, code) {
  button.querySelector('[data-role="flag"]').textContent = currencyIcon(code);
  button.querySelector('[data-role="code"]').textContent = code.toUpperCase();
  button.querySelector('[data-role="name"]').textContent = currencyName(code);
}

function persistState() {
  localStorage.setItem('kursly-from', state.from);
  localStorage.setItem('kursly-to', state.to);
  localStorage.setItem('kursly-amount', els.amount.value);
}

async function fetchWithFallback(date, endpoint) {
  let lastError;
  for (const url of [API.primary(date, endpoint), API.fallback(date, endpoint)]) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Keine Kursdaten verfügbar');
}

async function loadCurrencies() {
  try {
    const data = await fetchWithFallback('latest', 'currencies.min.json');
    state.currencies = { ...fallbackCurrencies, ...data };
    localStorage.setItem('kursly-currencies', JSON.stringify(state.currencies));
  } catch {
    const cached = localStorage.getItem('kursly-currencies');
    if (cached) state.currencies = JSON.parse(cached);
  }
}

async function loadRates({ force = false } = {}) {
  const cacheKey = `kursly-rates-${state.date}-${state.from}`;
  els.updatedLine.textContent = 'Kurs wird geladen …';
  renderRateSkeletons();

  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      state.rates = parsed.rates;
      state.apiDate = parsed.apiDate;
      updateConversion();
      renderRateGrid();
      els.updatedLine.textContent = `Zwischengespeichert · ${formatApiDate(state.apiDate)}`;
    }
  }

  try {
    const data = await fetchWithFallback(state.date, `currencies/${state.from}.min.json`);
    state.rates = data[state.from];
    state.apiDate = data.date;
    localStorage.setItem(cacheKey, JSON.stringify({ rates: state.rates, apiDate: state.apiDate, savedAt: Date.now() }));
    updateConversion();
    renderRateGrid();
    els.updatedLine.textContent = `Datenstand ${formatApiDate(state.apiDate)}`;
  } catch (error) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      state.rates = null;
      els.result.textContent = 'Offline';
      els.rateLine.textContent = 'Keine Kursdaten verfügbar';
      renderRateGrid();
    }
    els.updatedLine.textContent = 'Offline · letzter gespeicherter Kurs';
    showToast('Live-Daten nicht erreichbar. Gespeicherte Werte werden verwendet.');
    console.error(error);
  }
}

function updateConversion() {
  setCurrencyButton(els.fromCurrency, state.from);
  setCurrencyButton(els.toCurrency, state.to);
  persistState();
  updateFavoriteButton();
  updateQuickAmountActive();

  if (!state.rates || !state.rates[state.to]) return;
  const amount = parseAmount(els.amount.value);
  const rate = state.rates[state.to];
  const result = amount * rate;
  const formatted = formatValue(result);
  if (els.result.textContent !== formatted) {
    els.result.textContent = formatted;
    els.result.classList.remove('flash');
    void els.result.offsetWidth;
    els.result.classList.add('flash');
  }
  els.rateLine.textContent = `1 ${state.from.toUpperCase()} = ${compactFormatter.format(rate)} ${state.to.toUpperCase()}`;
}

function updateQuickAmountActive() {
  const current = parseAmount(els.amount.value);
  els.quickAmounts.querySelectorAll('[data-amount]').forEach(button => {
    button.classList.toggle('is-active', parseAmount(button.dataset.amount) === current);
  });
}

function favoriteKey(from, to) {
  return `${from}-${to}`;
}

function isFavorite(from, to) {
  return state.favorites.includes(favoriteKey(from, to));
}

function saveFavorites() {
  localStorage.setItem('kursly-favorites', JSON.stringify(state.favorites));
}

function updateFavoriteButton() {
  const active = isFavorite(state.from, state.to);
  els.favoriteButton.classList.toggle('is-active', active);
  els.favoriteButton.setAttribute('aria-pressed', String(active));
  const label = active ? 'Favorit entfernen' : 'Favorit speichern';
  els.favoriteButton.title = label;
  els.favoriteButton.setAttribute('aria-label', label);
}

function toggleFavorite() {
  const key = favoriteKey(state.from, state.to);
  const index = state.favorites.indexOf(key);
  if (index === -1) {
    state.favorites.unshift(key);
    showToast('Als Favorit gespeichert.');
  } else {
    state.favorites.splice(index, 1);
    showToast('Favorit entfernt.');
  }
  saveFavorites();
  updateFavoriteButton();
  renderFavorites();
}

function removeFavorite(key) {
  const index = state.favorites.indexOf(key);
  if (index === -1) return;
  state.favorites.splice(index, 1);
  saveFavorites();
  updateFavoriteButton();
  renderFavorites();
  showToast('Favorit entfernt.');
}

function renderFavorites() {
  els.favoritesSection.hidden = state.favorites.length === 0;
  els.favoritesGrid.innerHTML = state.favorites.map(key => {
    const [from, to] = key.split('-');
    return `
      <button class="rate-tile favorite-tile" type="button" data-from="${from}" data-to="${to}">
        <span class="rate-tile-top">
          <span class="rate-tile-code"><span>${currencyIcon(from)}${currencyIcon(to)}</span><span><strong>${from.toUpperCase()} → ${to.toUpperCase()}</strong><small>${currencyName(from)} / ${currencyName(to)}</small></span></span>
          <span class="favorite-remove" data-remove="${key}" role="button" aria-label="Favorit entfernen">✕</span>
        </span>
      </button>
    `;
  }).join('');
}

function formatApiDate(dateString) {
  if (!dateString) return 'unbekannt';
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? dateString : dateFormatter.format(date);
}

function renderCurrencyList(filter = '') {
  const query = filter.trim().toLocaleLowerCase('de');
  const preferred = ['eur', 'usd', 'gbp', 'chf', 'try', 'all', 'mkd', 'btc', 'eth', 'xau'];
  const entries = Object.entries(state.currencies)
    .filter(([code, name]) => {
      const searchable = `${code} ${name} ${currencyName(code)}`.toLocaleLowerCase('de');
      return searchable.includes(query);
    })
    .sort(([aCode], [bCode]) => {
      const aIndex = preferred.indexOf(aCode);
      const bIndex = preferred.indexOf(bCode);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return currencyName(aCode).localeCompare(currencyName(bCode), 'de');
    });

  if (!entries.length) {
    els.currencyList.innerHTML = '<div class="empty-state">Keine passende Währung gefunden.</div>';
    return;
  }

  els.currencyList.innerHTML = entries.map(([code]) => `
    <button class="currency-option" type="button" data-code="${code}">
      <span class="currency-icon">${currencyIcon(code)}</span>
      <span><strong>${currencyName(code)}</strong><small>${code.toUpperCase()}</small></span>
      <span>${code === (state.activeTarget === 'from' ? state.from : state.to) ? '✓' : ''}</span>
    </button>
  `).join('');
}

function openCurrencyDialog(target) {
  state.activeTarget = target;
  els.currencySearch.value = '';
  renderCurrencyList();
  els.currencyDialog.showModal();
  requestAnimationFrame(() => els.currencySearch.focus());
}

async function selectCurrency(code) {
  if (state.activeTarget === 'from') {
    if (code === state.to) state.to = state.from;
    state.from = code;
    await loadRates();
  } else {
    if (code === state.from) {
      [state.from, state.to] = [state.to, state.from];
      await loadRates();
    } else {
      state.to = code;
      if (!state.rates || !state.rates[state.to]) await loadRates();
      else updateConversion();
    }
  }
  els.currencyDialog.close();
}

function renderRateSkeletons() {
  els.rateGrid.innerHTML = Array.from({ length: 6 }, () => '<div class="rate-tile skeleton" aria-hidden="true"></div>').join('');
}

function renderRateGrid() {
  const codes = ['usd', 'gbp', 'chf', 'try', 'all', 'mkd', 'btc', 'xau'];
  if (!state.rates) {
    els.rateGrid.innerHTML = '<div class="empty-state">Kurse sind derzeit nicht verfügbar.</div>';
    return;
  }

  els.rateGrid.innerHTML = codes
    .filter(code => code !== state.from && state.rates[code])
    .map(code => `
      <button class="rate-tile" type="button" data-code="${code}">
        <span class="rate-tile-top">
          <span class="rate-tile-code"><span>${currencyIcon(code)}</span><span><strong>${code.toUpperCase()}</strong><small>${currencyName(code)}</small></span></span>
          <span class="rate-tile-base">1 ${state.from.toUpperCase()}</span>
        </span>
        <span class="rate-tile-value">${formatValue(state.rates[code])}</span>
      </button>
    `).join('');
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2800);
}

async function shareConversion() {
  if (!state.rates?.[state.to]) return;
  const amount = parseAmount(els.amount.value);
  const result = amount * state.rates[state.to];
  const text = `${formatValue(amount)} ${state.from.toUpperCase()} = ${formatValue(result)} ${state.to.toUpperCase()} · Kursstand ${formatApiDate(state.apiDate)}`;

  try {
    if (navigator.share) await navigator.share({ title: 'Kursly Umrechnung', text });
    else {
      await navigator.clipboard.writeText(text);
      showToast('Umrechnung kopiert.');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Teilen war nicht möglich.');
  }
}

function updateConnectionState() {
  const online = navigator.onLine;
  els.connectionState.textContent = online ? 'Online' : 'Offline-Modus';
  els.connectionState.style.color = online ? 'var(--primary)' : 'var(--danger)';
}

function setDefaultDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  els.rateDate.max = localDate;
  els.rateDate.value = localDate;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  state.deferredInstall = event;
  els.installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  els.installButton.hidden = true;
  state.deferredInstall = null;
  showToast('Kursly wurde installiert.');
});

els.installButton.addEventListener('click', async () => {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  els.installButton.hidden = true;
});

els.amount.value = state.amount;
els.amount.addEventListener('input', updateConversion);
els.amount.addEventListener('focus', () => els.amount.select());
els.fromCurrency.addEventListener('click', () => openCurrencyDialog('from'));
els.toCurrency.addEventListener('click', () => openCurrencyDialog('to'));
els.currencySearch.addEventListener('input', event => renderCurrencyList(event.target.value));
els.currencyList.addEventListener('click', event => {
  const button = event.target.closest('[data-code]');
  if (button) selectCurrency(button.dataset.code);
});
els.swapButton.addEventListener('click', async () => {
  [state.from, state.to] = [state.to, state.from];
  await loadRates();
});
els.rateDate.addEventListener('change', async event => {
  const today = new Date().toISOString().slice(0, 10);
  state.date = event.target.value === today ? 'latest' : event.target.value;
  await loadRates({ force: true });
});
els.refreshButton.addEventListener('click', () => loadRates({ force: true }));
els.shareButton.addEventListener('click', shareConversion);
els.favoriteButton.addEventListener('click', toggleFavorite);
els.favoritesGrid.addEventListener('click', async event => {
  const removeTarget = event.target.closest('[data-remove]');
  if (removeTarget) {
    event.stopPropagation();
    removeFavorite(removeTarget.dataset.remove);
    return;
  }
  const tile = event.target.closest('[data-from]');
  if (!tile) return;
  state.from = tile.dataset.from;
  state.to = tile.dataset.to;
  await loadRates();
  document.querySelector('.converter-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
els.rateGrid.addEventListener('click', event => {
  const tile = event.target.closest('[data-code]');
  if (!tile) return;
  state.to = tile.dataset.code;
  updateConversion();
  document.querySelector('.converter-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.querySelector('.quick-amounts').addEventListener('click', event => {
  const button = event.target.closest('[data-amount]');
  if (!button) return;
  els.amount.value = button.dataset.amount;
  updateConversion();
});
window.addEventListener('online', () => { updateConnectionState(); loadRates({ force: true }); });
window.addEventListener('offline', updateConnectionState);

async function init() {
  setDefaultDate();
  updateConnectionState();
  setCurrencyButton(els.fromCurrency, state.from);
  setCurrencyButton(els.toCurrency, state.to);
  registerServiceWorker();
  renderFavorites();
  updateFavoriteButton();
  await loadCurrencies();
  if (!state.currencies[state.from]) state.from = 'eur';
  if (!state.currencies[state.to]) state.to = 'usd';
  setCurrencyButton(els.fromCurrency, state.from);
  setCurrencyButton(els.toCurrency, state.to);
  await loadRates();
}

init();
