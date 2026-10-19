// Hero, accordion and shop interactions. Booking is handled by booking.js.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const details = [...document.querySelectorAll('.dental-accordion details')];
  const gallery = document.querySelector('.why-gallery');
  if (gallery) {
    const pictures = [...gallery.querySelectorAll('.why-main-photo,.why-thumbnails>img')];
    const sets = [
      {caption:'Tu bienestar empieza cuando te escuchamos.',photos:[
        ['sliders/hero-woman.webp','Paciente sonriente durante su consulta dental'],
        ['contacto/pexels-3881296.webp','Profesionales acompañando a una paciente durante la revisión'],
        ['contacto/pexels-8413334.webp','Atención individual durante una consulta dental'],
        ['contacto/pexels-19879741.webp','Profesional de odontología atendiendo en consulta']]},
      {caption:'Del diagnóstico a las opciones de tratamiento: conoce cada recurso.',photos:[
        ['contacto/pexels-7800666.webp','Profesionales revisando una radiografía en el monitor del consultorio'],
        ['tratamientos/implant-kit.webp','Instrumental y componentes empleados en implantología'],
        ['tratamientos/aligner-detail.webp','Manos mostrando un alineador dental transparente'],
        ['tratamientos/shade-close.webp','Guía de tonos para comparar el color de los dientes']]},
      {caption:'Organiza tu visita y encuentra tiempo para el cuidado de tu familia.',photos:[
        ['clinica/clinic-room.webp','Consultorio luminoso preparado para una visita dental'],
        ['tratamientos/pexels-7800669.webp','Equipo de odontología trabajando en el consultorio'],
        ['infantil/nident-kids-cepillado.webp','Odontóloga enseñando el cepillado a un niño'],
        ['contacto/pexels-6627447.webp','Profesional acompañando a un paciente durante su consulta']]}
    ];
    let request = 0, transition = null;
    const motionAllowed = () => !reduced.matches && document.documentElement.dataset.motion !== 'off';
    async function selectGallery(index) {
      const ticket = ++request, set = sets[index];
      transition?.kill();
      if (window.gsap) gsap.set(pictures,{clearProps:'opacity,transform,clipPath'});
      gallery.setAttribute('aria-busy','true');
      // Keep the existing photographs visible until all four replacements are ready.
      const loaded = await Promise.all(set.photos.map(async ([file]) => {
        const image = new Image(); image.src = '/assets/img/' + file;
        try { await image.decode(); return true; } catch { return false; }
      }));
      if (ticket !== request) return;
      if (loaded.some(ready => !ready)) {
        gallery.setAttribute('aria-busy','false');
        document.getElementById('why-caption').textContent='No pudimos cargar la galería. Vuelve a abrir esta opción para intentarlo.';
        return;
      }
      const apply = () => {
        if (ticket !== request) return;
        pictures.forEach((picture,i) => {
          picture.src='/assets/img/'+set.photos[i][0];
          picture.alt=set.photos[i][1];
          picture.style.objectPosition = index === 1 && i === 0 ? 'center 18%' : 'center';
        });
        document.getElementById('why-caption').textContent=set.caption;
        gallery.querySelector('.why-photo-count').textContent=`0${index+1} / 03`;
        gallery.dataset.selection=String(index);
        gallery.setAttribute('aria-busy','false');
      };
      if (window.gsap && motionAllowed()) {
        transition=gsap.timeline({defaults:{ease:'power3.out'}})
          .to(pictures,{opacity:.2,clipPath:'inset(0 0 8% 0 round 16px)',duration:.14})
          .call(apply)
          .fromTo(pictures,{opacity:.25,y:8,clipPath:'inset(0 0 12% 0 round 16px)'},
            {opacity:1,y:0,clipPath:'inset(0 0 0% 0 round 16px)',duration:.4,stagger:.045,clearProps:'opacity,transform,clipPath'});
      } else apply();
    }
    details.forEach((detail,index) => detail.addEventListener('toggle',() => {
      if (detail.open) selectGallery(index);
    }));
    const settle = () => { if (!motionAllowed()) transition?.progress(1).kill(); };
    window.addEventListener('nident-motion-change',settle);
    reduced.addEventListener('change',settle);
  }

  async function initShop() {
    if (!document.querySelector('.product-grid')) return;
    const status = document.getElementById('shop-status');
    let products;
    try {
      const response = await fetch('/assets/products.json?v=2');
      if (!response.ok) throw new Error('catalog');
      products = await response.json();
    } catch {
      status.textContent = 'No pudimos cargar la bolsa. Recarga la página para intentarlo de nuevo.';
      document.querySelectorAll('[data-add-product]').forEach(button => button.disabled = true);
      return;
    }
    let stored;
    try { stored = JSON.parse(localStorage.getItem('nident-bag') || '{}'); } catch { stored = {}; }
    const cart = {};
    products.forEach(product => {
      const quantity = Number(stored?.[product.id]);
      if (Number.isInteger(quantity) && quantity > 0) cart[product.id] = Math.min(quantity, 9);
    });
    let toastTimer;
    function notify(message) {
      clearTimeout(toastTimer);
      status.textContent = message;
      toastTimer = setTimeout(() => status.textContent = '', 4000);
    }
    function el(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    const money = amount => `S/ ${amount.toFixed(2)}`;
    function render() {
      const list = document.getElementById('cart-items');
      list.replaceChildren();
      let total = 0, count = 0;
      products.forEach(product => {
        const quantity = cart[product.id];
        if (!quantity) return;
        total += quantity * product.price;
        count += quantity;
        const row = el('article', 'cart-item');
        const image = el('img'); image.src = '/assets/img/' + product.image; image.alt = '';
        const body = el('div'); body.append(el('h3', '', product.name), el('p', '', money(product.price * quantity)));
        const controls = el('div', 'cart-quantity');
        for (const [label, change] of [['−', -1], ['+', 1]]) {
          const button = el('button', '', label); button.type = 'button';
          button.setAttribute('aria-label', `${change < 0 ? 'Quitar una unidad de' : 'Agregar una unidad de'} ${product.name}`);
          button.disabled = change > 0 && quantity >= 9;
          button.addEventListener('click', () => {
            const next = quantity + change;
            if (next <= 0) delete cart[product.id]; else cart[product.id] = next;
            render();
            notify('Bolsa actualizada.');
          });
          controls.append(button);
          if (change < 0) controls.append(el('span', '', String(quantity)));
        }
        const remove = el('button', 'remove-item', 'Quitar'); remove.type = 'button';
        remove.setAttribute('aria-label', `Quitar ${product.name} de la bolsa`);
        remove.addEventListener('click', () => { delete cart[product.id]; render(); notify('Producto retirado de la bolsa.'); });
        controls.append(remove); body.append(controls); row.append(image, body); list.append(row);
      });
      if (!count) list.append(el('p', 'small-note', 'Tu bolsa está vacía. Encuentra algo para tu rutina de cuidado.'));
      document.getElementById('cart-count').textContent = String(count);
      document.getElementById('cart-total').textContent = money(total);
      document.getElementById('cart-review').disabled = !count;
      document.getElementById('cart-result').hidden = true;
      try { localStorage.setItem('nident-bag', JSON.stringify(cart)); } catch { /* Bag remains usable in memory. */ }
    }
    document.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => {
      const product = products.find(item => item.id === button.dataset.addProduct);
      if (!product) return;
      if ((cart[product.id] || 0) >= 9) { notify('Puedes agregar hasta 9 unidades por producto.'); return; }
      cart[product.id] = (cart[product.id] || 0) + 1;
      render(); notify(`${product.name} agregado a tu bolsa.`);
    }));
    document.getElementById('cart-review').addEventListener('click', () => {
      const result = document.getElementById('cart-result');
      result.textContent = 'Tu selección está lista para revisar. Esta tienda es una demostración: no se ha realizado un pedido ni un cobro.';
      result.hidden = false;
    });
    let category = 'Todos';
    const search = document.getElementById('product-search');
    const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    function filter() {
      let count = 0;
      document.querySelectorAll('.product-card').forEach(card => {
        const visible = (category === 'Todos' || card.dataset.category === category) && normalize(card.dataset.search).includes(normalize(search.value.trim()));
        card.hidden = !visible; if (visible) count++;
      });
      document.getElementById('no-products').hidden = count > 0;
    }
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      category = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      filter();
    }));
    search.addEventListener('input', filter);
    render();
  }
  initShop();

})();
