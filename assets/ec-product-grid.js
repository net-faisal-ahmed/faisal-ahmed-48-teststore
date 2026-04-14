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
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Could not load product');
      }
      return response.json();
    })
    .then(function (product) {
      renderProductPopup(product, currency);
    })
    .catch(function (error) {
      console.error(error);
    });
}

function renderProductPopup(product, currency) {
  closeExistingPopup();

  const overlay = document.createElement('div');
  overlay.className = 'ec-product-popup-overlay';
  overlay.dataset.currency = currency;
  overlay.innerHTML = buildPopupMarkup(product, currency);

  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';

  setTimeout(function () {
    overlay.classList.add('open');
  }, 10);

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) {
      closeProductPopup(overlay);
    }
  });

  overlay.querySelector('.ec-product-popup__close').addEventListener('click', function () {
    closeProductPopup(overlay);
  });

  const optionInputs = overlay.querySelectorAll('.ec-product-popup__option select');
  optionInputs.forEach(function (select) {
    select.addEventListener('change', function () {
      updatePopupVariant(product, overlay);
    });
  });

  updatePopupVariant(product, overlay);

  const addToCartButton = overlay.querySelector('.ec-product-popup__button');
  addToCartButton.addEventListener('click', function () {
    addToCart(product, overlay);
  });
}

function closeExistingPopup() {
  const existing = document.querySelector('.ec-product-popup-overlay');
  if (existing) {
    existing.remove();
    document.documentElement.style.overflow = '';
  }
}

function closeProductPopup(overlay) {
  if (!overlay) return;
  overlay.classList.remove('open');
  document.documentElement.style.overflow = '';
  setTimeout(function () {
    overlay.remove();
  }, 150);
}

function buildPopupMarkup(product, currency) {
  const imageUrl = product.images && product.images.length > 0
    ? `${product.images[0]}?crop=center&height=800&width=800&resize=800x800`
    : '';

  const optionSelectors = product.options.map(function (option, optionIndex) {
    const values = getOptionValues(product, optionIndex);
    const optionsHtml = values.map(function (value) {
      return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
    }).join('');

    return `
      <div class="ec-product-popup__option">
        <label for="product-option-${optionIndex}">${escapeHtml(option)}</label>
        <select id="product-option-${optionIndex}" data-option-index="${optionIndex}">
          ${optionsHtml}
        </select>
      </div>`;
  }).join('');

  return `
    <div class="ec-product-popup">
      <button type="button" class="ec-product-popup__close" aria-label="Close popup">×</button>
      <div class="ec-product-popup__content">

        <div class="ec-product-popup__top">
            <div class="ec-product-popup__image">
                ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(product.title)}" />` : ''}
            </div>
            <div>
                <h2 class="ec-product-popup__title">${escapeHtml(product.title)}</h2>
                <div class="ec-product-popup__price">${formatMoney(product.price, currency)}</div>
                <div class="ec-product-popup__description">${escapeHtml(product.description || '')}</div>
            </div>
        </div>  

        <div class="ec-product-popup__details">
          ${optionSelectors}
          <div class="ec-product-popup__actions">
            <button type="button" class="ec-product-popup__button">Add to cart</button>
            <div class="ec-product-popup__status" aria-live="polite"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function updatePopupVariant(product, overlay) {
  const selects = overlay.querySelectorAll('.ec-product-popup__option select');
  const selectedOptions = Array.from(selects).map(function (select) {
    return select.value;
  });

  const variant = findMatchingVariant(product, selectedOptions);
  const priceElement = overlay.querySelector('.ec-product-popup__price');
  const status = overlay.querySelector('.ec-product-popup__status');
  const button = overlay.querySelector('.ec-product-popup__button');

  const currency = overlay.dataset.currency || 'USD';

  if (variant) {
    priceElement.textContent = formatMoney(variant.price, currency);
    button.disabled = false;
    button.dataset.variantId = variant.id;
    status.textContent = variant.available ? '' : 'Sold out';
    if (!variant.available) {
      button.textContent = 'Sold out';
      button.style.opacity = '0.6';
      button.style.cursor = 'not-allowed';
    } else {
      button.textContent = 'Add to cart';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  } else {
    priceElement.textContent = formatMoney(product.price, currency);
    button.disabled = true;
    button.dataset.variantId = '';
    status.textContent = 'Please choose an option.';
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
  }
}

function findMatchingVariant(product, selectedOptions) {
  return product.variants.find(function (variant) {
    return selectedOptions.every(function (option, index) {
      return variant.options[index] === option;
    });
  });
}

function addToCart(product, overlay) {
  const button = overlay.querySelector('.ec-product-popup__button');
  const status = overlay.querySelector('.ec-product-popup__status');
  const variantId = button.dataset.variantId;

  if (!variantId) {
    status.textContent = 'Please select a variant before adding to cart.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding…';

  fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ id: variantId, quantity: 1 })
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Could not add to cart');
      }
      return response.json();
    })
    .then(function () {
      button.textContent = 'Added ✓';
      status.textContent = 'Product added to cart.';
      setTimeout(function () {
        closeProductPopup(overlay);
      }, 800);
    })
    .catch(function () {
      button.disabled = false;
      button.textContent = 'Add to cart';
      status.textContent = 'Unable to add to cart. Please try again.';
    });
}

function getOptionValues(product, optionIndex) {
  var values = product.variants.reduce(function (acc, variant) {
    var optionValue = variant[`option${optionIndex + 1}`] || '';
    if (optionValue && acc.indexOf(optionValue) === -1) {
      acc.push(optionValue);
    }
    return acc;
  }, []);
  return values;
}

function formatMoney(cents, currency) {
  var amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    return amount.toFixed(2) + ' ' + currency;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
