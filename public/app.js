function toggleReportFilters(){
  const panel = document.getElementById('reportFilters');
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

function getReportData(){
  const from = document.getElementById('reportFrom')?.value || '';
  const to = document.getElementById('reportTo')?.value || '';
  const category = document.getElementById('reportCategory')?.value || '';
  const search = (document.getElementById('reportProduct')?.value || '')
    .trim()
    .toLowerCase();

  const products = new Map(
    (db.products || []).map(p => [String(p.id), p])
  );

  const sales = (salesVisibleToCurrentUser() || []).filter(s => {
    if (String(s.status || '').toUpperCase() === 'ANULADA') return false;

    const date = String(s.date || '').slice(0, 10);

    if (from && date < from) return false;
    if (to && date > to) return false;

    return true;
  });

  const items = [];

  for (const sale of sales){
    for (const item of (sale.items || [])){
      const product = products.get(String(item.id));
      if (!product) continue;

      if (category && String(product.category || '') !== category) {
        continue;
      }

      const searchable = [
        product.name,
        product.sku,
        product.barcode,
        item.name
      ].join(' ').toLowerCase();

      if (search && !searchable.includes(search)) continue;

      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const cost = Number(item.cost ?? product.cost ?? 0);

      items.push({
        sale,
        item,
        product,
        qty,
        price,
        cost,
        subtotal: qty * price
      });
    }
  }

  const total = items.reduce((sum, row) => sum + row.subtotal, 0);
  const units = items.reduce((sum, row) => sum + row.qty, 0);
  const margin = items.reduce(
    (sum, row) => sum + (row.price - row.cost) * row.qty,
    0
  );

  // Distribuir los pagos según los productos que coinciden con los filtros.
  const paymentTotals = {};

  const itemsBySale = new Map();

  for (const row of items){
    const id = String(row.sale.id);

    if (!itemsBySale.has(id)){
      itemsBySale.set(id, {
        sale: row.sale,
        matchingTotal: 0
      });
    }

    itemsBySale.get(id).matchingTotal += row.subtotal;
  }

  for (const {sale, matchingTotal} of itemsBySale.values()){
    const saleTotal = Number(sale.total || 0);
    const ratio = saleTotal > 0
      ? Math.min(1, matchingTotal / saleTotal)
      : 0;

    const payments = sale.payments || [];

    if (payments.length){
      for (const payment of payments){
        const method = payment.method || 'Otro';
        paymentTotals[method] =
          (paymentTotals[method] || 0) +
          Number(payment.amount || 0) * ratio;
      }
    } else {
      const method = sale.payment || 'Otro';
      paymentTotals[method] =
        (paymentTotals[method] || 0) + matchingTotal;
    }
  }

  const bestProducts = new Map();

  for (const row of items){
    const id = String(row.product.id);

    if (!bestProducts.has(id)){
      bestProducts.set(id, {
        name: row.product.name || row.item.name || 'Producto',
        category: row.product.category || 'Sin categoría',
        qty: 0,
        total: 0
      });
    }

    const product = bestProducts.get(id);
    product.qty += row.qty;
    product.total += row.subtotal;
  }

  return {
    sales,
    items,
    total,
    units,
    margin,
    paymentTotals,
    bestProducts: [...bestProducts.values()]
      .sort((a, b) => b.qty - a.qty)
  };
}

function generateSalesReport(){
  const result = document.getElementById('reportResults');
  if (!result
