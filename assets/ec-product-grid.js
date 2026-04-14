document.addEventListener('DOMContentLoaded', function () {
  const grid = document.querySelector('.ec-product-grid');
  if (!grid) return;

  const currency = grid.dataset.shopCurrency || 'USD';
  const productList = grid.querySelector('.ec-product-grid__list');

  if (!productList) return;

  productList.addEventListener('click', function (event) {
    const button = event.target.closest('.ec-product-grid__quick-add');
    if (!button) return;

    const item = button.closest('.ec-product-grid__item');
    if (!item) return;

    const handle = item.dataset.productHandle;
    if (!handle) return;

    event.preventDefault();
    openProductPopup(handle, currency);
  });
});

function openProductPopup(handle, currency) {
  fetch(`/products/${handle}.js`)
    .then(res => res.json())
    .then(product => renderProductPopup(product, currency));
}

function renderProductPopup(product, currency) {
  closeExistingPopup();

  const overlay = document.createElement('div');
  overlay.className = 'ec-product-popup-overlay';
  overlay.dataset.currency = currency;
  overlay.innerHTML = buildPopupMarkup(product, currency);

  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  // Close
  overlay.querySelector('.ec-product-popup__close')
    .addEventListener('click', () => closeProductPopup(overlay));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeProductPopup(overlay);
  });

  // Auto select color
  overlay.querySelectorAll('.ec-color-options').forEach(group => {
    const first = group.querySelector('.ec-color-btn');
    if (first) first.classList.add('active');
  });

  // Auto select size
  overlay.querySelectorAll('.ec-custom-select').forEach(select => {
    const first = select.querySelector('.ec-select-option');
    if (first) {
      first.classList.add('active');
      select.querySelector('.ec-select-trigger span').textContent = first.dataset.value;
    }
  });

  // COLOR click
  overlay.querySelectorAll('.ec-color-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const wrap = btn.closest('.ec-color-options');
      wrap.querySelectorAll('.ec-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePopupVariant(product, overlay);
    });
  });

  // CUSTOM SELECT
  overlay.querySelectorAll('.ec-custom-select').forEach(select => {
    const trigger = select.querySelector('.ec-select-trigger');
    const dropdown = select.querySelector('.ec-select-dropdown');
    const label = trigger.querySelector('span');

    trigger.addEventListener('click', () => {
      select.classList.toggle('open');
    });

    select.querySelectorAll('.ec-select-option').forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;

        label.textContent = value;

        select.querySelectorAll('.ec-select-option')
          .forEach(o => o.classList.remove('active'));

        option.classList.add('active');
        select.classList.remove('open');

        updatePopupVariant(product, overlay);
      });
    });
  });

  // Close dropdown outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ec-custom-select')) {
      document.querySelectorAll('.ec-custom-select')
        .forEach(el => el.classList.remove('open'));
    }
  });

  // ADD TO CART
  overlay.querySelector('.ec-add-btn')
    .addEventListener('click', () => addToCart(overlay));

  updatePopupVariant(product, overlay);
}

function buildPopupMarkup(product, currency) {
  const imageUrl = product.images?.[0] || '';

  const optionSelectors = product.options.map((option, index) => {
    const optionName = option.name;
    const values = option.values;

    if (optionName.toLowerCase() === 'color') {
      return `
        <div class="ec-product-popup__option ${optionName.toLowerCase()}">
          <div class="ec-label">${optionName}</div>
          <div class="ec-color-options" data-option-index="${index}">
            ${values.map(v => `
              <button type="button" class="ec-color-btn" data-value="${v}">
                <span>${v}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="ec-product-popup__option ${optionName.toLowerCase()}">
        <div class="ec-label">${optionName}</div>

        <div class="ec-custom-select" data-option-index="${index}">
          <div class="ec-select-trigger">
            <span>Select your ${optionName}</span>
            <span class="ec-arrow">▾</span>
          </div>

          <div class="ec-select-dropdown">
            ${values.map(v => `
              <div class="ec-select-option" data-value="${v}">
                ${v}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="ec-product-popup">
      <button class="ec-product-popup__close">×</button>

      <div class="ec-popup-grid">
        <div class="ec-popup-image">
            ${imageUrl ? `<img src="${imageUrl}" />` : ''}
        </div>
        <div class="ec-popup-details">
            <h2>${product.title}</h2>
            <div class="ec-price">${formatMoney(product.price, currency)}</div>
            <p class="ec-desc">${product.description || ''}</p>
        </div>
      </div>
      <div class="ec-popup-info">
          <div class="ec-popup-info__options">
            ${optionSelectors}
          </div>
          <button class="ec-add-btn" disabled>
                <span>ADD TO CART</span> 
                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" x="0" y="0" viewBox="0 0 24 24" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M22.354 11.646a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708l3.147-3.146H2a.5.5 0 0 1 0-1h18.793l-3.147-3.146a.5.5 0 0 1 .708-.708z" opacity="1" data-original="#000000" class=""></path></g></svg>
          </button>
          <div class="ec-product-popup__status"></div>
        </div>
    </div>
    
  `;
}

function updatePopupVariant(product, overlay) {
  const selectedOptions = [];

  product.options.forEach((option, index) => {
    const name = option.name.toLowerCase();

    if (name === 'color') {
      const group = overlay.querySelector(`.ec-color-options[data-option-index="${index}"]`);
      const active = group?.querySelector('.active');
      selectedOptions[index] = active ? active.dataset.value : '';
    } else {
      const select = overlay.querySelector(`.ec-custom-select[data-option-index="${index}"]`);
      const active = select?.querySelector('.ec-select-option.active');
      selectedOptions[index] = active ? active.dataset.value : '';
    }
  });

  const variant = product.variants.find(v =>
    selectedOptions.every((opt, i) => v.options[i] === opt)
  );

  const priceEl = overlay.querySelector('.ec-price');
  const btn = overlay.querySelector('.ec-add-btn');
  const status = overlay.querySelector('.ec-product-popup__status');

  if (variant) {
    priceEl.textContent = formatMoney(variant.price, overlay.dataset.currency);
    btn.dataset.variantId = variant.id;
    btn.disabled = !variant.available;

    btn.innerHTML = variant.available 
  ? `<span>ADD TO CART </span>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M22.354 11.646a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708l3.147-3.146H2a.5.5 0 0 1 0-1h18.793l-3.147-3.146a.5.5 0 0 1 .708-.708z"/>
    </svg>`
  : 'Sold Out';
    status.textContent = '';
  } else {
    btn.disabled = true;
    btn.dataset.variantId = '';
    status.textContent = 'Please select options';
  }
}

function addToCart(overlay) {
  const btn = overlay.querySelector('.ec-add-btn');
  const status = overlay.querySelector('.ec-product-popup__status');
  const variantId = btn.dataset.variantId;

  if (!variantId) return;

  btn.disabled = true;
  btn.innerHTML = '<span>Adding...</span>';

  fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      id: variantId,
      quantity: 1
    })
  })
    .then(res => res.json())
    .then(() => {
      btn.innerHTML = '<span>Added ✓</span>';
      status.innerHTML = '<span>Added to cart</span>';

      document.dispatchEvent(new CustomEvent('cart:refresh'));

      setTimeout(() => {
        window.location.href = '/cart';
      }, 800);
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerHTML = '<span>ADD TO CART →</span>';
    });
}

function closeExistingPopup() {
  document.querySelector('.ec-product-popup-overlay')?.remove();
}

function closeProductPopup(overlay) {
  overlay.remove();
  document.documentElement.style.overflow = '';
}

function formatMoney(cents, currency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  }).format(cents / 100);
}




document.addEventListener('DOMContentLoaded', function () {
  const menuBtn = document.querySelector('.ec-header__mobile-menu');
  const mobileMenu = document.querySelector('.ec-mobile-menu');
  const body = document.body;

  if (!menuBtn || !mobileMenu) return;

  // TOGGLE MENU
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();

    menuBtn.classList.toggle('is-active');
    mobileMenu.classList.toggle('is-open');
    body.classList.toggle('menu-open');
  });

  // CLOSE ON OUTSIDE CLICK
  document.addEventListener('click', function (e) {
    if (
      !e.target.closest('.ec-mobile-menu') &&
      !e.target.closest('.ec-header__mobile-menu')
    ) {
      closeMenu();
    }
  });

  // CLOSE ON ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  function closeMenu() {
    menuBtn.classList.remove('is-active');
    mobileMenu.classList.remove('is-open');
    body.classList.remove('menu-open');
  }
});