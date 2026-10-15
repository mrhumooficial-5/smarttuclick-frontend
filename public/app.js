
function toggleReportFilters(){
  const panel=document.getElementById('reportFilters');
  if(!panel)return;
  panel.hidden=!panel.hidden;
}

function getReportData(){
  const from=document.getElementById('reportFrom')?.value||'';
  const to=document.getElementById('reportTo')?.value||'';
  const category=document.getElementById('reportCategory')?.value||'';
  const search=(document.getElementById('reportProduct')?.value||'').trim().toLowerCase();

  const products=new Map(db.products.map(p=>[String(p.id),p]));

  const sales=salesVisibleToCurrentUser().filter(s=>{
    if(s.status==='ANULADA')return false;
    const date=String(s.date||'').slice(0,10);
    if(from&&date<from)return false;
    if(to&&date>to)return false;
    return true;
  });

  const items=[];
  for(const sale of sales){
    for(const item of (sale.items||[])){
      const product=products.get(String(item.id));
      if(!product)continue;

      const matchesCategory=!category||String(product.category||'')===category;
      const haystack=[
        product.name,product.sku,product.barcode,item.name
      ].join(' ').toLowerCase();
      const matchesSearch=!search||haystack.includes(search);

      if(!matchesCategory||!matchesSearch)continue;

      items.push({
        sale,
        item,
        product,
        qty:Number(item.qty||0),
        price:Number(item.price||0),
        cost:Number(item.cost||0)
      });
    }
  }

  const saleTotals=new Map();
  for(const row of items){
    const id=String(row.sale.id);
    saleTotals.set(id,(saleTotals.get(id)||0)+row.qty*row.price);
  }

  const total=[...saleTotals.values()].reduce((a,n)=>a+n,0);
  const units=items.reduce((a,row)=>a+row.qty,0);
  const margin=items.reduce((a,row)=>a+(row.price-row.cost)*row.qty,0);

  const paymentTotals={};
  for(const row of items){
    const payments=row.sale.payments||[];
    const saleTotal=Number(row.sale.total||0);
    const itemTotal=Number(row.item.price||0)*Number(row.item.qty||0);
    const ratio=saleTotal>0?itemTotal/saleTotal:0;

    if(payments.length){
      for(const payment of payments){
        const method=payment.method||'Otro';
        paymentTotals[method]=(paymentTotals[method]||0)+Number(payment.amount||0)*ratio;
      }
    }else{
      const method=row.sale.payment||'Otro';
      paymentTotals[method]=(paymentTotals[method]||0)+itemTotal;
    }
  }

  const bestProducts=new Map();
  for(const row of items){
    const id=String(row.product.id);
    if(!bestProducts.has(id)){
      bestProducts.set(id,{
        name:row.product.name,
        category:row.product.category||'Sin categoría',
        qty:0,
        total:0
      });
    }
    const product=bestProducts.get(id);
    product.qty+=row.qty;
    product.total+=row.qty*row.price;
  }

  return {
    sales,items,total,units,margin,paymentTotals,
    bestProducts:[...bestProducts.values()]
      .sort((a,b)=>b.qty-a.qty)
  };
}

function generateSalesReport(){
  const result=document.getElementById('reportResults');
  if(!result)return;

  const data=getReportData();
  const moneyValue=n=>money(n);

  const payments=Object.entries(data.paymentTotals)
    .map(([method,total])=>`
      <div class="listrow">
        <span>${esc(method)}</span>
        <b>${moneyValue(total)}</b>
      </div>
    `).join('')||'<div class="empty">Sin ventas en este periodo.</div>';

  const products=data.bestProducts.slice(0,5).map((p,index)=>`
    <div class="listrow">
      <span>${index+1}. ${esc(p.name)}
        <div class="muted">${esc(p.category)} · ${p.qty} unidades</div>
      </span>
      <b>${moneyValue(p.total)}</b>
    </div>
  `).join('')||'<div class="empty">No hay productos para mostrar.</div>';

  result.innerHTML=`
    <div class="grid">
      <div class="card"><span>Ventas netas</span><div class="kpi">${moneyValue(data.total)}</div></div>
      <div class="card"><span>Unidades vendidas</span><div class="kpi">${data.units}</div></div>
      <div class="card"><span>Compras</span><div class="kpi">${moneyValue(db.purchases.reduce((a,p)=>a+Number(p.total||0),0))}</div></div>
      <div class="card"><span>Margen estimado</span><div class="kpi">${moneyValue(data.margin)}</div></div>
    </div>
    <div class="grid section">
      <div class="card"><b>Ventas por medio de pago</b>${payments}</div>
      <div class="card"><b>Productos más vendidos</b>${products}</div>
    </div>
  `;
}

function downloadReportCSV(){
  const data=getReportData();
  const rows=[
    ['Fecha','Comprobante','Producto','SKU','Categoría','Unidades','Precio unitario','Total'],
    ...data.items.map(row=>[
      row.sale.date,
      row.sale.doc,
      row.product.name,
      row.product.sku||'',
      row.product.category||'',
      row.qty,
      row.price,
      row.qty*row.price
    ])
  ];

  const csv='\uFEFF'+rows.map(row=>
    row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')
  ).join('\r\n');

  const link=document.createElement('a');
  link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  link.download='vendix-reporte.csv';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
