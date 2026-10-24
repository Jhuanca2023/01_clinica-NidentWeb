// Keep the imported HTML demo compatible with the published Laravel catalog.
export function connectShop(script) {
  const replacements = [
    ["fetch('/assets/products.json?v=2')", "fetch('/api/productos')"],
    [
      "image.src = '/assets/img/' + product.image;",
      "image.src = product.image.startsWith('/')?product.image:'/assets/img/'+product.image;",
    ],
    [
      "Math.min(quantity, 9)",
      "Math.min(quantity, product.stock===null||product.stock===undefined?9:Math.min(9,product.stock))",
    ],
    [
      "quantity >= 9",
      "quantity >= (product.stock===null||product.stock===undefined?9:Math.min(9,product.stock))",
    ],
    [
      "if ((cart[product.id] || 0) >= 9) { notify('Puedes agregar hasta 9 unidades por producto.'); return; }",
      "const limit=product.stock===null||product.stock===undefined?9:Math.min(9,product.stock);if ((cart[product.id] || 0) >= limit) { notify(limit?'Alcanzaste la cantidad disponible para seleccionar.':'Este producto no tiene disponibilidad.'); return; }",
    ],
    [
      "result.textContent = 'Tu selección está lista para revisar. Esta tienda es una demostración: no se ha realizado un pedido ni un cobro.';",
      "const link=document.createElement('a');const url=new URL('/contacto',location.origin);url.searchParams.set('seleccion',JSON.stringify(cart));link.href=url.href;link.textContent='Consultar esta selección con Nident';result.replaceChildren(link);",
    ],
  ];
  for (const [before, after] of replacements)
    script = script.replace(before, after);
  return script;
}
