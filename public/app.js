const KEY='smarttuclick_v11';
const SESSION_KEY='smarttuclick_session';
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>Date.now()+Math.floor(Math.random()*999);
const clone=o=>JSON.parse(JSON.stringify(o));
const seed={
 version:11, company:{id:1,name:'Mi Empresa S.A.C.',ruc:'',igv:0.18},
 activeStoreId:1, stores:[{id:1,name:'Tienda Principal',code:'T001',active:true}],
 warehouses:[{id:1,storeId:1,name:'Almacén Principal',code:'A001',active:true}],
 registers:[{id:1,storeId:1,name:'Caja 1',code:'C001',active:true}],
 products:[
  {id:1,sku:'100001',barcode:'775000000001',name:'Producto demo',category:'General',brand:'',unit:'UND',cost:10,price:18,stock:20,min:5,active:true},
  {id:2,sku:'100002',barcode:'775000000002',name:'Producto 2',category:'General',brand:'',unit:'UND',cost:8,price:15,stock:12,min:4,active:true}
 ],
 clients:[{id:1,doc:'00000000',docType:'DNI',name:'Cliente General',phone:'',email:'',address:'',points:0}],
 suppliers:[],
 users:[{id:1,name:'Administrador',user:'admin',role:'Administrador',password:'demo',active:true}],
 roles:{Administrador:['*'],Gerente:['dashboard','pos','cash','products','inventory','purchases','transfers','quotes','clients','users','sales','reports','settings'],Cajero:['dashboard','pos','cash','clients','sales'],Almacenero:['dashboard','products','inventory','purchases','transfers'],Vendedor:['dashboard','pos','quotes','clients','sales']},
 sales:[],purchases:[],movements:[],transfers:[],cash:{open:false,opening:0,expected:0,openedAt:null,userId:1,registerId:1,closed:[],movements:[],paymentTotals:{Efectivo:0,Yape:0,Plin:0,Izipay:0,Tarjeta:0,Transferencia:0}},cart:[],held:[],quotes:[],documents:[],pointsLedger:[],settings:{strictStock:true,pointsPerSol:1,printer:'browser',currency:'PEN'},seq:{sale:1,purchase:1,move:1,transfer:1,quote:1,document:1,boleta:1,factura:1,quickMove:1},priceLists:[{id:1,name:'Público',code:'PUB',default:true}],audit:[]
};
function migrate(old){const d=clone(seed);if(!old)return d;Object.assign(d,old);d.version=11; if(!d.activeStoreId)d.activeStoreId=d.stores?.[0]?.id||1;
 if(!d.stores)d.stores=[{id:1,name:old.store?.name||'Tienda Principal',code:'T001',active:true}];
 if(!d.warehouses)d.warehouses=[{id:1,storeId:d.stores[0].id,name:'Almacén Principal',code:'A001',active:true}];
 if(!d.registers)d.registers=[{id:1,storeId:d.stores[0].id,name:'Caja 1',code:'C001',active:true}];
 if(!d.suppliers)d.suppliers=[]; if(!d.cash)d.cash=clone(seed.cash); if(!d.cash.paymentTotals)d.cash.paymentTotals={Efectivo:0,Yape:0,Plin:0,Izipay:0,Tarjeta:0,Transferencia:0}; if(!d.priceLists)d.priceLists=[{id:1,name:'Público',code:'PUB',default:true}]; if(!d.audit)d.audit=[]; if(!d.transfers)d.transfers=[]; if(!d.held)d.held=[]; if(!d.quotes)d.quotes=[]; if(!d.documents)d.documents=[]; if(!d.pointsLedger)d.pointsLedger=[]; if(!d.seq.quickMove)d.seq.quickMove=1;
 d.products=(d.products||[]).map(p=>({...p,unit:p.unit||'UND',brand:p.brand||''}));d.clients=(d.clients||[]).map(c=>({...c,points:c.points||0,docType:c.docType||'DNI'}));
 return d;
}
function stockOf(p,storeId=currentStore()?.id){if(!p)return 0;if(p.storeStocks&&storeId!=null)return Number(p.storeStocks[storeId]??0);return Number(p.stock||0)}
function setStock(p,n,storeId=currentStore()?.id){if(!p)return;if(!p.storeStocks)p.storeStocks={};p.storeStocks[storeId]=Number(n);p.stock=Object.values(p.storeStocks).reduce((a,v)=>a+Number(v||0),0)}
function ensureStocks(){for(const p of db.products){if(!p.storeStocks){p.storeStocks={};const sid=db.stores?.[0]?.id||1;p.storeStocks[sid]=Number(p.stock||0)}for(const s of db.stores||[])if(p.storeStocks[s.id]==null)p.storeStocks[s.id]=0}}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x)return migrate(x);const old=JSON.parse(localStorage.getItem('smarttuclick_v4')||localStorage.getItem('smarttuclick_v3')||localStorage.getItem('smarttuclick_v1'));return migrate(old)}catch{return clone(seed)}}
let db=load(),view='dashboard',session=null; ensureStocks();
try{const sid=Number(localStorage.getItem(SESSION_KEY));session=db.users.find(u=>u.id===sid&&u.active)||null}catch{}
const STC_API_URL=location.origin;
const STC_SYNC_KEY=KEY+'_sync';
const STC_TAB_ID=Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
let stcChannel=null;
let stcToken=localStorage.getItem('smarttuclick_api_token')||'';
let stcReady=false;
let stcBusy=false;
try{stcChannel=new BroadcastChannel('smarttuclick-live-v1')}catch{}

async function stcApi(path,options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(stcToken)headers.Authorization='Bearer '+stcToken;
  const r=await fetch(STC_API_URL+path,{...options,headers});
  const text=await r.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
  if(!r.ok)throw Object.assign(new Error(data.error||('HTTP '+r.status)),{status:r.status,data});
  return data;
}

async function stcServerLogin(username,password){
  const data=await stcApi('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
  stcToken=data.token;
  localStorage.setItem('smarttuclick_api_token',stcToken);
  return data.user;
}

async function stcPull(){
  const data=await stcApi('/api/state');
  if(!data?.state)throw new Error('El backend no devolvió estado');
  db=migrate(data.state);
  ensureStocks();
  const sid=Number(localStorage.getItem(SESSION_KEY));
  session=db.users.find(u=>u.id===sid&&u.active)||session;
  return data;
}

async function stcPush(){
  if(!stcToken||!stcReady)return;
  try{
    const data=await stcApi('/api/state',{method:'PUT',body:JSON.stringify({state:db,source:STC_TAB_ID})});
    localStorage.setItem('smarttuclick_api_version',String(data.version||''));
  }catch(e){console.error('SmartTuClick API push:',e);}
}

async function stcConnect(localUser,localPassword){
  if(stcBusy)return false;
  stcBusy=true;
  try{
    const apiUser=await stcServerLogin(localUser.user,localPassword);
    let pulled=false;
    try{await stcPull();pulled=true;}catch(e){
      if(e.status===404){
        stcReady=true;
        await stcPush();
      }else throw e;
    }
    stcReady=true;
    if(pulled){
      ensureStocks();
      if(!can(view))view='dashboard';
      render();
    }
    return true;
  }catch(e){
    stcReady=false;
    console.error('SmartTuClick API connect:',e);
    alert('No se pudo conectar con el servidor: '+(e.message||e));
    return false;
  }finally{stcBusy=false;}
}

async function stcRemoteRefresh(){
  if(!stcToken||!stcReady||stcBusy)return;
  try{
    stcBusy=true;
    await stcPull();
    if(!document.getElementById('modalHost'))render();
  }catch(e){console.error('SmartTuClick API refresh:',e)}
  finally{stcBusy=false}
}

function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
  localStorage.setItem(STC_SYNC_KEY,JSON.stringify({source:STC_TAB_ID,at:Date.now()}));
  try{stcChannel?.postMessage({type:'data-change',source:STC_TAB_ID,at:Date.now()})}catch{}
  if(stcReady)stcPush();
}

function syncFromStorage(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return;
    db=migrate(JSON.parse(raw));
    ensureStocks();
    const sid=Number(localStorage.getItem(SESSION_KEY));
    session=db.users.find(u=>u.id===sid&&u.active)||session;
    if(session&&!can(view))view='dashboard';
    if(document.getElementById('modalHost'))return;
    render();
  }catch{}
}
window.addEventListener('storage',e=>{
  if(e.key===KEY||e.key===STC_SYNC_KEY)syncFromStorage();
  if(e.key==='smarttuclick_api_token'&&e.newValue&&!stcToken)stcToken=e.newValue;
});
try{stcChannel?.addEventListener('message',e=>{if(e.data?.source!==STC_TAB_ID)syncFromStorage()})}catch{}

setInterval(()=>{
  if(!session||document.getElementById('modalHost'))return;
  if(view==='dashboard'||view==='cash'||view==='sales'||view==='inventory'||view==='reports')render();
},3000);

let stcEventSource=null;
function stcStartEvents(){
  try{stcEventSource?.close()}catch{}
  if(!stcToken)return;
  stcEventSource=new EventSource(STC_API_URL+'/api/events?token='+encodeURIComponent(stcToken));
  stcEventSource.addEventListener('STATE_CHANGED',()=>stcRemoteRefresh());
  stcEventSource.onerror=()=>{};
}

function stcInitAfterLoad(){
  if(!session)return;
  const localUser=clone(session);
  const pass=localUser.password||'demo';
  stcConnect(localUser,pass).then(ok=>{if(ok)stcStartEvents()});
}

save();
setTimeout(stcInitAfterLoad,80);

function audit(action,entity,detail=''){db.audit.push({id:uid(),date:new Date().toISOString(),userId:session?.id||null,user:session?.name||'Sistema',action,entity,detail});if(db.audit.length>2000)db.audit=db.audit.slice(-2000)}function money(n){return 'S/ '+Number(n||0).toFixed(2)}function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
const nav=[['dashboard','Inicio','home'],['pos','Punto de venta','sales'],['cash','Caja','sales'],['products','Productos','management'],['inventory','Inventario / Kardex','management'],['purchases','Compras','management'],['transfers','Transferencias','management'],['quotes','Cotizaciones','sales'],['clients','Clientes y puntos','sales'],['users','Usuarios y roles','admin'],['sales','Ventas / comprobantes','sales'],['reports','Reportes','reports'],['settings','Configuración','admin']];
const cashLocked=['pos','products','inventory','quotes','sales'];
function can(v){const p=db.roles?.[session.role]||[];if(!(p.includes('*')||p.includes(v)))return false;if(session.role==='Cajero'&&cashLocked.includes(v)&&!db.cash.open)return false;return true}
function go(v){if(!can(v)){if(session.role==='Cajero'&&!db.cash.open&&cashLocked.includes(v))return alert('Caja cerrada. Debes aperturar la caja antes de ingresar a este módulo.');return alert('Tu rol no tiene permiso para este módulo.');}view=v;render()}
function navGroups(){const groups={sales:[],management:[],reports:[],admin:[]};nav.forEach(x=>{if(x[0]!=='dashboard'&&can(x[0]))groups[x[2]].push(x)});return `<div class="nav-home"><button class="nav-item ${view==='dashboard'?'active':''}" onclick="go('dashboard')"><span>⌂</span> Inicio</button></div>${[['sales','Ventas'],['management','Gestión'],['reports','Reportes'],['admin','Administración']].map(([g,t])=>groups[g].length?`<div class="nav-group"><div class="nav-label">${t}</div>${groups[g].map(([k,txt])=>`<button class="nav-item ${view===k?'active':''}" onclick="go('${k}')"><span>${({pos:'▣',cash:'$',quotes:'▤',clients:'♙',products:'▦',inventory:'↕',purchases:'▧',transfers:'⇄',sales:'▤',reports:'◔',users:'♟',settings:'⚙'}[k]||'•')}</span>${txt}</button>`).join('')}</div>`:'').join('')}`}
function closeMobileMenu(){document.body.classList.remove('menu-open')}
function render(){const root=document.getElementById('app');if(!session){root.innerHTML=loginPage();return}const title=nav.find(x=>x[0]===view)?.[1]||'SmartTuClick';root.innerHTML=`<div class="shell"><div class="mobile-backdrop" onclick="closeMobileMenu()"></div><aside class="side"><div class="brand"><span class="brandmark">S</span><span>SmartTuClick</span><button class="mobile-close" onclick="closeMobileMenu()">×</button></div><div class="userbox"><b>${esc(session.name)}</b><span>${esc(session.role)} · ${esc(session.user)}</span></div><div class="nav">${navGroups()}</div><div class="sidefoot">v1.1 · LIVE<br><span>Backend: Render + Neon</span></div></aside><main class="main"><header class="appbar"><button class="menu-toggle" onclick="document.body.classList.add('menu-open')">☰</button><div class="appbar-title"><strong>${esc(title)}</strong><span>${esc(currentStore().name)}</span></div><div class="appbar-actions"><select class="input storeSelect" onchange="switchStore(this.value)">${db.stores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===currentStore().id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><span class="pill ${db.cash.open?'open':'closed'}">${db.cash.open?'● Caja abierta':'● Caja cerrada'}</span><span class="pill live-pill">● EN VIVO</span><button class="btn alt logout-btn" onclick="logout()">Salir</button></div></header><div class="page-head"><div><h1>${esc(title)}</h1><div class="muted">${esc(db.company.name)}</div></div></div>${pages[view]?.()||pages.dashboard()}</main></div>`;if(view==='pos')setTimeout(toggleCashReceived,0)}
function loginPage(){return `<div class="login"><div class="loginbox card"><div class="brand big">⚡ SmartTuClick</div><p class="muted">Punto de venta y gestión empresarial · modo demo local</p><label>Usuario<select id="loginUser" class="input">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${esc(u.user)} · ${esc(u.role)}</option>`).join('')}</select></label><label>Contraseña<input id="loginPass" class="input" type="password" placeholder="Contraseña" onkeydown="if(event.key==='Enter')login()"></label><button class="btn good full" onclick="login()">Ingresar</button><div class="notice">🟡 Autenticación local de demostración. No es seguridad de producción.</div></div></div>`}
async function login(){
  const u=db.users.find(x=>x.id===Number(document.getElementById('loginUser')?.value));
  const pass=document.getElementById('loginPass')?.value||'';
  if(!u||!u.active||u.password!==pass)return alert('Usuario o contraseña incorrectos.');
  session=u;
  localStorage.setItem(SESSION_KEY,String(u.id));
  view='dashboard';
  render();
  await stcConnect(u,pass);
  stcStartEvents();
}
function logout(){
  if(db.cash.open)return alert('Cierra la caja antes de salir.');
  try{stcEventSource?.close()}catch{}
  stcEventSource=null;stcReady=false;stcToken='';
  localStorage.removeItem('smarttuclick_api_token');
  localStorage.removeItem(SESSION_KEY);session=null;render();
}
function currentStore(){return db.stores.find(s=>s.id===db.activeStoreId)||db.stores[0]}
function switchStore(id){if(db.cash.open)return alert('Cierra la caja antes de cambiar de tienda.');db.activeStoreId=Number(id);save();render()}
function dashboard(){let sales=db.sales.filter(x=>x.date.slice(0,10)===today()&&x.status!=='ANULADA'),total=sales.reduce((a,x)=>a+x.total,0),stock=db.products.filter(p=>p.active&&stockOf(p)<=p.min),pending=db.transfers.filter(t=>t.status==='PENDIENTE').length;let quick=[];if(can('pos'))quick.push(`<button class="quick-card primary" onclick="go('pos')"><span>▣</span><b>Nueva venta</b><small>Abrir punto de venta</small></button>`);if(can('cash'))quick.push(`<button class="quick-card ${db.cash.open?'good':'warn'}" onclick="go('cash')"><span>$</span><b>${db.cash.open?'Caja abierta':'Aperturar caja'}</b><small>${db.cash.open?money(db.cash.expected):'Registrar fondo inicial'}</small></button>`);if(can('products'))quick.push(`<button class="quick-card" onclick="go('products')"><span>▦</span><b>Productos</b><small>Catálogo e inventario</small></button>`);if(can('sales'))quick.push(`<button class="quick-card" onclick="go('sales')"><span>▤</span><b>Ventas</b><small>Consultar comprobantes</small></button>`);return `<div class="welcome"><div><div class="eyebrow">${db.cash.open?'● OPERACIÓN ACTIVA':'● CAJA CERRADA'}</div><h2>Hola, ${esc(session.name.split(' ')[0])}</h2><p>${db.cash.open?'Todo listo para trabajar.':'Puedes revisar el sistema. Para vender, primero apertura la caja.'}</p></div>${db.cash.open?`<button class="btn good" onclick="go('pos')">Ir a vender</button>`:can('cash')?`<button class="btn warn" onclick="go('cash')">Aperturar caja</button>`:''}</div><div class="quick-grid">${quick.join('')}</div><div class="dashboard-grid"><div class="card"><div class="section-title"><b>Resumen de hoy</b><span class="tag">${sales.length} ventas</span></div><div class="summary-list"><div><span>Ventas</span><strong>${money(total)}</strong></div><div><span>Productos</span><strong>${db.products.length}</strong></div><div><span>Stock bajo</span><strong class="${stock.length?'danger':'success'}">${stock.length}</strong></div><div><span>Transferencias pendientes</span><strong>${pending}</strong></div></div></div><div class="card"><div class="section-title"><b>Últimas ventas</b>${can('sales')?`<button class="btn alt" onclick="go('sales')">Ver todas</button>`:''}</div>${db.sales.slice(-5).reverse().map(s=>`<div class="listrow"><div><b>${esc(s.doc)}</b><div class="muted">${esc(s.client)}</div></div><strong>${money(s.total)}</strong></div>`).join('')||'<div class="empty">Aún no hay ventas.</div>'}</div></div>`}
const pages={dashboard:dashboard,
pos:()=>{let subtotal=cartTotal();return `<div class="pos"><div><div class="toolbar"><input id="posSearch" class="input grow" autofocus placeholder="🔎 Nombre, SKU o código de barras · F2 lector" onkeydown="if(event.key==='Enter')scan(this.value)" oninput="posFilter(this.value)"><button class="btn alt" onclick="clearCart()">Vaciar</button><button class="btn alt" onclick="holdSale()">Guardar</button><button class="btn alt" onclick="heldSales()">En espera (${db.held.length})</button></div><div id="posProducts" class="products">${posProducts()}</div></div><div class="card cart"><div class="section-title"><b>Venta actual</b><span class="tag">${db.cart.length} líneas</span></div><div id="cartList">${cartHtml()}</div><hr><div class="row"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="clientLookupBox"><div class="clientLookupHead"><span>Cliente</span><button class="btn alt smallBtn" type="button" onclick="clientFormForSale()">+ Añadir cliente</button></div><div class="clientLookup"><select id="saleDocSearchType" class="input docTypeMini" onchange="lookupSaleClient()"><option>DNI</option><option>RUC</option><option>CE</option></select><input id="saleClientDoc" class="input" inputmode="numeric" placeholder="DNI o RUC del cliente" oninput="lookupSaleClient()"><button class="btn alt" type="button" onclick="lookupSaleClient(true)">Buscar</button></div><div id="saleClientResult" class="clientResult">Cliente General · 00000000</div><input type="hidden" id="saleClient" value="${db.clients[0]?.id||''}"></div><div class="row"><span>Documento</span><select id="saleDocType" class="input" onchange="syncSaleDocClient()"><option value="NOTA_VENTA">Nota de venta</option><option value="BOLETA">Boleta (prototipo)</option><option value="FACTURA">Factura (prototipo)</option></select></div><div class="row"><span>Pago</span><div style="display:flex;gap:8px;width:100%"><select id="salePayment" class="input" onchange="toggleCashReceived()"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Izipay</option><option>Tarjeta</option><option>Transferencia</option></select><button class="btn alt" type="button" onclick="openMultiPayment()">Generar pago</button></div></div><div id="cashReceivedRow" class="row"><span>Recibido</span><input id="cashReceived" class="input small" type="number" min="0" step="0.01" placeholder="S/"></div><div class="totalbar"><span>Total</span><span class="total">${money(subtotal)} </span></div><button class="btn good full" onclick="finishSale()">Cobrar y emitir venta</button></div></div>`},
cash:()=>`<div class="grid"><div class="card"><b>Turno de caja</b><div class="kpi">${db.cash.open?'ABIERTA':'CERRADA'}</div>${db.cash.open?`<p class="muted">Abierta ${new Date(db.cash.openedAt).toLocaleString()} · ${esc(session.name)}</p><p>Esperado efectivo: <b>${money(db.cash.expected)}</b></p><button class="btn warn" onclick="closeCash()">Cerrar caja</button>`:`<p class="muted">Selecciona caja y monto inicial.</p><select id="cashRegister" class="input">${db.registers.filter(r=>r.active).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><input id="opening" class="input" type="number" placeholder="Monto inicial"><button class="btn good" onclick="openCash()">Abrir caja</button>`}</div><div class="card"><b>Movimientos del turno</b><table class="table"><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Monto</th></tr>${(db.cash.movements||[]).slice(-30).reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleTimeString()}</td><td>${x.type}</td><td>${esc(x.detail)}</td><td>${money(x.amount)}</td></tr>`).join('')||empty(4)}</table></div></div>${session.role!=='Cajero'?`<div class="section card"><div class="section-title"><b>Administración · Ventas por día y cierre de caja</b><span class="tag">${db.cash.closed.length} cierres</span></div><p class="muted">El importe de ventas no incluye el fondo inicial. Haz clic en <b>Ver ventas</b> para revisar el total y los medios de pago.</p><table class="table"><tr><th>Día</th><th>Cierre</th><th>Caja</th><th>Usuario</th><th>Ventas</th><th>Diferencia de caja</th><th></th></tr>${db.cash.closed.slice().reverse().slice(0,30).map(x=>`<tr><td>${new Date(x.date).toLocaleDateString()}</td><td>${new Date(x.date).toLocaleTimeString()}</td><td>${esc(x.register)}</td><td>${esc(x.user)}</td><td><button class="btn good smallBtn" onclick="viewCashClose(${x.id})">Ver ventas · ${money(Number(x.salesTotal||0))}</button></td><td class="${Number(x.difference||0)?'danger':'success'}">${money(Number(x.difference||0))}</td><td><button class="btn alt smallBtn" onclick="viewCashClose(${x.id})">Ver detalle</button></td></tr>`).join('')||empty(7)}</table></div>`:''}`,
products:()=>`<div class="toolbar"><button class="btn good" onclick="productForm()">+ Nuevo producto</button><button class="btn alt" onclick="downloadProductTemplate()">📄 Descargar plantilla</button><button class="btn alt" onclick="importProductsExcel()">📥 Importar Excel</button><button class="btn alt" onclick="exportProductsExcel()">📤 Exportar Excel</button><button class="btn quickIn" onclick="quickStockMove()">↓ Ingreso rápido</button><button class="btn quickOut" onclick="quickStockMove()">↑ Salida rápida</button><input id="productSearch" class="input grow" placeholder="Buscar producto/SKU/código" oninput="productSearch(this.value)"><select id="catFilter" class="input" onchange="productSearch(document.getElementById('productSearch')?.value||'')"><option value="">Todas las categorías</option>${[...new Set(db.products.map(p=>p.category))].map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="card"><table class="table"><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr><tbody id="productRows">${productRows()}</tbody></table></div>`,
inventory:()=>`<div class="grid"><div class="card"><span>Inventario valorizado</span><div class="kpi">${money(db.products.reduce((a,p)=>a+stockOf(p)*p.cost,0))}</div></div><div class="card"><span>Movimientos</span><div class="kpi">${db.movements.length}</div></div><div class="card"><span>Stock crítico</span><div class="kpi danger">${db.products.filter(p=>stockOf(p)<=p.min).length}</div></div><div class="card"><span>Unidades</span><div class="kpi">${db.products.reduce((a,p)=>a+stockOf(p),0)}</div></div></div><div class="toolbar section"><input class="input grow" id="kardexSearch" placeholder="Filtrar Kardex" oninput="kardexFilter(this.value)"><button class="btn alt" onclick="adjustStockForm()">Ajuste de inventario</button></div><div class="card"><table class="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Antes</th><th>Cant.</th><th>Después</th><th>Motivo</th><th>Ref.</th></tr></thead><tbody id="kardexRows">${kardexRows()}</tbody></table></div>`,
purchases:()=>`<div class="toolbar"><button class="btn good" onclick="purchaseForm()">+ Registrar compra</button><button class="btn alt" onclick="supplierForm()">+ Proveedor</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Proveedor</th><th>Documento</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th></tr>${db.purchases.slice().reverse().map(p=>`<tr><td>${new Date(p.date).toLocaleDateString()}</td><td>${esc(p.supplier)}</td><td>${esc(p.doc)}</td><td>${esc(p.product)}</td><td>${p.qty}</td><td>${money(p.total)}</td><td>${p.status}</td></tr>`).join('')||empty(7)}</table></div>`,
transfers:()=>`<div class="toolbar"><button class="btn good" onclick="transferForm()">+ Nueva transferencia</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Origen</th><th>Destino</th><th>Producto</th><th>Cant.</th><th>Estado</th><th></th></tr>${db.transfers.slice().reverse().map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${esc(t.product)}</td><td>${t.qty}</td><td><span class="tag">${t.status}</span></td><td>${t.status==='PENDIENTE'?`<button class="btn good" onclick="receiveTransfer(${t.id})">Recibir</button>`:''}</td></tr>`).join('')||empty(7)}</table></div><div class="notice">🟡 <b>Integración backend pendiente:</b> esta versión ejecuta las transferencias en local. Multi-almacén remoto requiere API + base de datos.</div>`,
quotes:()=>`<div class="toolbar"><button class="btn good" onclick="quoteForm()">+ Nueva cotización</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Cotización</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr>${quoteRows()}</table></div><div class="notice">🟡 Cotizaciones son documentos internos de demostración.\</div>`,
clients:()=>`<div class="toolbar"><button class="btn good" onclick="clientForm()">+ Nuevo cliente</button><input class="input grow" placeholder="Buscar cliente/DNI/RUC" oninput="clientSearch(this.value)"></div><div class="card"><table class="table"><tbody id="clientRows"><tr><th>Documento</th><th>Cliente</th><th>Teléfono</th><th>Puntos</th><th></th></tr>${clientRows()}</tbody></table></div>`,
users:()=>`<div class="toolbar"><button class="btn good" onclick="userForm()">+ Nuevo usuario</button></div><div class="card"><table class="table"><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Permisos</th><th>Acciones</th></tr>${db.users.map(u=>`<tr><td>${esc(u.user)}</td><td>${esc(u.name)}</td><td><span class="tag">${esc(u.role)}</span></td><td>${u.active?'Activo':'Inactivo'}</td><td>${(db.roles[u.role]||[]).includes('*')?'Todos':(db.roles[u.role]||[]).length+' módulos'}</td><td><button class="btn alt" onclick="editUser(${u.id})">Editar</button> <button class="btn ${u.active?'warn':'good'}" onclick="toggleUser(${u.id})">${u.active?'Desactivar':'Activar'}</button></td></tr>`).join('')}</table></div><div class="notice">🟡 Autenticación segura todavía es prototipo local. Las contraseñas no deben almacenarse así en producción.</div>`,
sales:()=>`<div class="toolbar"><input class="input grow" id="salesSearch" placeholder="Buscar comprobante/cliente" oninput="salesFilter(this.value)"><button class="btn alt" onclick="exportCSV()">Exportar CSV</button></div><div class="card"><table class="table"><tbody id="salesRows"><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>${salesRows()}</tbody></table></div><div class="notice">🟡 SUNAT: PROTOTIPO. Los documentos actuales son internos y no se envían a SUNAT.</div>`,
reports:()=>{let total=db.sales.filter(s=>s.status!=='ANULADA').reduce((a,s)=>a+s.total,0),units=db.sales.reduce((a,s)=>a+s.items.reduce((b,i)=>b+i.qty,0),0),buy=db.purchases.reduce((a,p)=>a+p.total,0),margin=db.sales.filter(s=>s.status!=='ANULADA').reduce((a,s)=>a+s.items.reduce((b,i)=>b+(i.price-i.cost)*i.qty,0),0);return `<div class="grid"><div class="card">Ventas<div class="kpi">${money(total)}</div></div><div class="card">Unidades<div class="kpi">${units}</div></div><div class="card">Compras<div class="kpi">${money(buy)}</div></div><div class="card">Margen estimado<div class="kpi">${money(margin)}</div></div></div><div class="grid section"><div class="card span2"><b>Ventas por medio de pago</b>${['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'].map(m=>{let n=db.sales.filter(s=>s.payment===m&&s.status!=='ANULADA').reduce((a,s)=>a+s.total,0);return `<div class="listrow"><span>${m}</span><b>${money(n)}</b></div>`}).join('')}</div><div class="card"><b>Productos bajo mínimo</b>${db.products.filter(p=>stockOf(p)<=p.min).map(p=>`<div class="listrow"><span>${esc(p.name)}</span><b>${stockOf(p)}</b></div>`).join('')||'<div class="empty">Sin alertas.</div>'}</div></div><div class="section card"><b>Reportes preparados</b><p class="muted">Ventas por fecha/producto/cliente/usuario, compras, caja, Kardex, stock, utilidad y puntos. Exportación CSV funciona en esta demo; Excel/PDF quedan como adaptadores.</p></div>`},
settings:()=>`<div class="grid"><div class="card"><h3>Empresa</h3><div class="formgrid"><input id="companyName" class="input" value="${esc(db.company.name)}" placeholder="Razón social"><input id="companyRuc" class="input" value="${esc(db.company.ruc)}" placeholder="RUC"><input id="igv" class="input" type="number" value="${db.company.igv*100}" placeholder="IGV %"><input id="storeName" class="input" value="${esc(currentStore().name)}" placeholder="Tienda"></div><button class="btn" onclick="saveSettings()">Guardar</button></div><div class="card"><h3>Operación</h3><div class="formgrid"><select id="strictStock" class="input"><option value="1" ${db.settings.strictStock?'selected':''}>Bloquear venta sin stock</option><option value="0" ${!db.settings.strictStock?'selected':''}>Permitir stock negativo</option></select><input id="pointsRate" class="input" type="number" value="${db.settings.pointsPerSol}" placeholder="Puntos por S/ 1"><select id="printer" class="input"><option value="browser">Impresión del navegador</option><option value="thermal">Adaptador térmico (prototipo)</option></select></div><button class="btn" onclick="saveSettings()">Guardar operación</button></div></div><div class="section card"><div class="section-title"><b>Tiendas, almacenes y cajas</b><button class="btn good" onclick="storeForm()">+ Nueva tienda</button></div><table class="table"><tr><th>Tienda</th><th>Almacenes</th><th>Cajas</th><th>Estado</th></tr>${db.stores.map(s=>`<tr><td>${esc(s.name)}</td><td>${db.warehouses.filter(w=>w.storeId===s.id).map(w=>esc(w.name)).join(', ')}</td><td>${db.registers.filter(r=>r.storeId===s.id).map(r=>esc(r.name)).join(', ')}</td><td>${s.active?'Activa':'Inactiva'}</td></tr>`).join('')}</table></div><div class="section card"><b>Integraciones / arquitectura</b><div class="integration"><span>🟡 SUNAT API</span><span>🟡 XML UBL 2.1</span><span>🟡 CDR</span><span>🟡 Impresión térmica</span><span>🟡 Backend/API</span><span>🟡 PostgreSQL</span><span>🟢 Multiempresa: tenantId previsto</span></div><p class="muted">Todo lo amarillo es interfaz/prototipo. No se realizan envíos reales ni se simula una respuesta de SUNAT como si fuera válida.</p></div>`};
function empty(n){return `<tr><td colspan="${n}" class="empty">Sin registros.</td></tr>`}function cartTotal(){return db.cart.reduce((a,i)=>{let base=i.qty*i.price,d=Number(i.discount||0);let disc=i.discountType==='%'?base*d/100:d;return a+Math.max(0,base-disc)},0)}
function posProducts(q=''){q=q.toLowerCase();return db.products.filter(p=>p.active&&(p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)||String(p.barcode).includes(q))).map(p=>`<div class="product" onclick="addCart(${p.id})"><div class="row"><b>${esc(p.name)}</b><span class="tag">${stockOf(p)}</span></div><div class="muted">${esc(p.sku)} · ${esc(p.category)}</div><div class="price">${money(p.price)}</div></div>`).join('')||'<div class="empty">No hay productos.</div>'}function editCartItem(id){let i=db.cart.find(x=>x.id===id),p=db.products.find(x=>x.id===id);if(!i||!p)return;let dtype=i.discountType||'Monto',disc=Number(i.discount||0),igv=i.igvType||'Inafecto',priceType=i.priceType||'Venta';modal('Edición de ítem',`<div class="item-tabs"><button type="button" class="item-tab active" onclick="showItemTab('info')">Información del ítem</button><button type="button" class="item-tab" onclick="showItemTab('discount')">Descuentos</button><button type="button" class="item-tab" onclick="showItemTab('params')">Otros parámetros</button></div><section id="itemTabInfo"><div class="formgrid"><input class="input" value="${esc(i.sku||p.sku)}" disabled><input id="eiName" class="input" value="${esc(i.name)}"><input id="eiQty" class="input" type="number" min="0.001" step="0.001" value="${i.qty}"><input id="eiPrice" class="input" type="number" min="0" step="0.01" value="${i.price}" ${priceType==='Bonificación'?'disabled':''}><input class="input" value="Stock actual: ${stockOf(p)}" disabled></div></section><section id="itemTabDiscount" class="hidden"><div class="formgrid"><select id="eiDiscType" class="input"><option ${dtype==='Monto'?'selected':''}>Monto</option><option ${dtype==='%'?'selected':''}>%</option></select><input id="eiDisc" class="input" type="number" min="0" step="0.01" value="${disc}" placeholder="Monto de descuento"></div></section><section id="itemTabParams" class="hidden"><div class="formgrid"><select id="eiPriceType" class="input" onchange="toggleBonusPrice()"><option value="Venta" ${priceType==='Venta'?'selected':''}>Precio unitario (Ventas)</option><option value="Bonificación" ${priceType==='Bonificación'?'selected':''}>Producto para Regalo o Bonificación</option></select><select id="eiIgv" class="input"><option ${igv==='Gravado'?'selected':''}>Gravado (Paga IGV)</option><option ${igv==='Exonerado'?'selected':''}>Exonerado (No paga IGV)</option><option ${igv==='Inafecto'?'selected':''}>Inafecto (No paga IGV)</option></select><select id="eiIgvDesc" class="input"><option>Gravado - Operación Onerosa</option><option>Exonerado - Operación Onerosa</option><option>Inafecto - Operación Onerosa</option></select></div><p class="muted">La bonificación sale con valor S/ 0.00, pero descuenta stock normalmente.</p></section>`,`<button class="btn good" onclick="saveCartItem(${id})">Guardar</button>`);window.showItemTab=function(tab){['info','discount','params'].forEach(t=>document.getElementById('itemTab'+(t==='info'?'Info':t==='discount'?'Discount':'Params')).classList.toggle('hidden',t!==tab));document.querySelectorAll('.item-tab').forEach((b,n)=>b.classList.toggle('active',['info','discount','params'][n]===tab));};window.toggleBonusPrice=function(){let bonus=document.getElementById('eiPriceType')?.value==='Bonificación',price=document.getElementById('eiPrice');if(price){price.disabled=bonus;if(bonus)price.value='0';}};window.showItemTab('info');window.toggleBonusPrice()}
function saveCartItem(id){let i=db.cart.find(x=>x.id===id);if(!i)return;let q=Number(document.getElementById('eiQty').value),price=Number(document.getElementById('eiPrice').value),disc=Number(document.getElementById('eiDisc').value||0),priceType=document.getElementById('eiPriceType').value;if(priceType==='Bonificación')price=0;if(q<=0||price<0||disc<0)return alert('Datos inválidos');i.qty=q;i.price=price;i.name=document.getElementById('eiName').value.trim()||i.name;i.discount=priceType==='Bonificación'?0:disc;i.discountType=document.getElementById('eiDiscType').value;i.priceType=priceType;i.igvType=document.getElementById('eiIgv').value.split(' ')[0];i.igvDesc=document.getElementById('eiIgvDesc').value;closeModal();save();render()}
function posFilter(q){document.getElementById('posProducts').innerHTML=posProducts(q)}
function focusBarcode(){if(!session)return;if(!can('pos'))return;if(!db.cash.open){alert('Caja cerrada. Debes aperturar la caja antes de usar el lector.');return}if(view!=='pos'){view='pos';render();setTimeout(focusBarcode,80);return}const el=document.getElementById('posSearch');if(el){el.focus();el.select();el.placeholder='Lector listo · escanea el código';}}
function scan(q){q=q.trim();if(!q)return;let p=db.products.find(x=>String(x.barcode)===q||String(x.sku)===q);if(p){addCart(p.id);setTimeout(focusBarcode,30);return}alert('No existe producto con ese SKU/código.');setTimeout(focusBarcode,30)}
function addCart(id){let p=db.products.find(x=>x.id===id);if(!p)return;let i=db.cart.find(x=>x.id===id);if(i){if(db.settings.strictStock&&i.qty>=stockOf(p))return alert('Stock insuficiente');i.qty++}else{if(db.settings.strictStock&&stockOf(p)<1)return alert('Sin stock');db.cart.push({id:p.id,name:p.name,price:p.price,cost:p.cost,qty:1})}save();render()}
function changeCart(id,d){let i=db.cart.find(x=>x.id===id);if(!i)return;let p=db.products.find(x=>x.id===id);if(d>0&&db.settings.strictStock&&i.qty>=stockOf(p))return alert('Stock insuficiente');i.qty+=d;if(i.qty<=0)db.cart=db.cart.filter(x=>x.id!==id);save();render()}function clearCart(){db.cart=[];save();render()}function cartHtml(){return db.cart.map(i=>`<div class="cartline"><div class="cartitem-main" onclick="editCartItem(${i.id})"><b>${esc(i.name)}</b><div class="muted">${money(i.price)} c/u${i.discount?` · Dscto. ${i.discountType==='%'?i.discount+'%':money(i.discount)}`:''}</div></div><div class="qty"><button class="btn alt" onclick="changeCart(${i.id},-1)">−</button><b>${i.qty}</b><button class="btn alt" onclick="changeCart(${i.id},1)">+</button></div></div>`).join('')||'<div class="empty">Carrito vacío</div>'}
function lookupSaleClient(showAlert=false){const doc=(document.getElementById('saleClientDoc')?.value||'').trim();const type=document.getElementById('saleDocSearchType')?.value||'DNI';const result=document.getElementById('saleClientResult');if(!doc){const c=db.clients[0];if(result)result.innerHTML=`Cliente General · ${esc(c?.doc||'00000000')}`;if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c?.id||'';return c}const c=db.clients.find(x=>x.doc===doc&&x.docType===type)||db.clients.find(x=>x.doc===doc);if(c){if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c.id;if(result)result.innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.docType)} ${esc(c.doc)}`;return c}if(result)result.innerHTML=`<span class="notFound">No encontrado.</span> <button type="button" class="linkBtn" onclick="clientFormForSale()">Añadir cliente</button>`;if(showAlert)clientFormForSale(type,doc);return null}
function syncSaleDocClient(){const type=document.getElementById('saleDocType')?.value;if(type==='FACTURA'){const sel=document.getElementById('saleDocSearchType');if(sel)sel.value='RUC';}else if(type==='BOLETA'){const sel=document.getElementById('saleDocSearchType');if(sel)sel.value='DNI';}lookupSaleClient()}
function clientFormForSale(docType='DNI',doc=''){modal('Añadir cliente',`<div class="formgrid"><select id="cdt" class="input"><option ${docType==='DNI'?'selected':''}>DNI</option><option ${docType==='RUC'?'selected':''}>RUC</option><option ${docType==='CE'?'selected':''}>CE</option></select><input id="cd" class="input" value="${esc(doc)}" placeholder="DNI / RUC"><input id="cn" class="input" placeholder="Nombre"><input id="caName" class="input" placeholder="Apellido"><input id="ct" class="input" placeholder="Teléfono"></div><p class="muted">El cliente quedará seleccionado automáticamente para esta venta.</p>`,`<button class="btn good" onclick="saveClientForSale()">Guardar y seleccionar</button>`)}
function saveClientForSale(){const type=document.getElementById('cdt')?.value||'DNI',doc=(document.getElementById('cd')?.value||'').trim(),name=(document.getElementById('cn')?.value||'').trim(),last=(document.getElementById('caName')?.value||'').trim(),phone=(document.getElementById('ct')?.value||'').trim();if(!name)return alert('Nombre obligatorio.');if(type!=='RUC'&&!doc)return alert('Documento obligatorio.');if(doc&&db.clients.some(x=>x.doc===doc))return alert('Ese documento ya está registrado.');const c={id:uid(),docType:type,doc:doc||'00000000',name:[name,last].filter(Boolean).join(' '),phone,email:'',address:'',points:0};db.clients.push(c);save();closeModal();if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c.id;if(document.getElementById('saleDocSearchType'))document.getElementById('saleDocSearchType').value=type;if(document.getElementById('saleClientDoc'))document.getElementById('saleClientDoc').value=c.doc;if(document.getElementById('saleClientResult'))document.getElementById('saleClientResult').innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.docType)} ${esc(c.doc)}`;}
function finishSale(){
  if(!session||!can('pos'))return alert('Sin permiso.');
  if(!db.cash.open)return alert('Abre la caja antes de cobrar.');
  if(!db.cart.length)return alert('Carrito vacío');

  const payment=document.getElementById('salePayment')?.value||'Efectivo';

  if(payment==='MULTIPLE'){
    return openMultiPayment();
  }

  const total=cartTotal();
  const received=payment==='Efectivo'
    ?Number(document.getElementById('cashReceived')?.value||0)
    :total;

  if(payment==='Efectivo'&&received<total){
    return alert(`Falta ${money(total-received)}.`);
  }

  completeSale([{
    method:payment,
    amount:total,
    received
  }]);
}

function completeSale(payments){

  if(!db.cart.length)return alert('Carrito vacío.');

const total=cartTotal();

const discount=db.cart.reduce((a,i)=>{
  const base=i.qty*i.price;
  const d=Number(i.discount||0);
  return a+(i.discountType==='%'?base*d/100:d);
},0);

  const client=
    db.clients.find(c=>c.id===Number(document.getElementById('saleClient')?.value))
    ||db.clients[0];

  const paid=payments.reduce(
    (a,p)=>a+Number(p.amount||0),
    0
  );

  if(Math.abs(paid-total)>0.009){
    return alert(
      paid<total
        ?`Falta ${money(total-paid)} por pagar.`
        :`Has ingresado ${money(paid-total)} de más.`
    );
  }

  for(const pmt of payments){
    if(
      pmt.method==='Efectivo' &&
      Number(pmt.received||0)<Number(pmt.amount||0)
    ){
      return alert('El efectivo recibido es menor al monto de la venta.');
    }
  }

  const docType=
    document.getElementById('saleDocType')?.value
    ||'NOTA_VENTA';

  if(docType==='FACTURA'&&client.docType!=='RUC'){
    return alert('Para Factura, selecciona un cliente con RUC.');
  }

  if(docType==='BOLETA'&&client.docType==='RUC'){
    return alert('Para Boleta, selecciona un cliente con DNI o CE.');
  }

  for(const i of db.cart){

    const p=db.products.find(x=>x.id===i.id);

    if(!p){
      return alert('Producto no encontrado: '+i.name);
    }

    if(
      db.settings.strictStock &&
      stockOf(p)<i.qty
    ){
      return alert('Stock insuficiente: '+p.name);
    }
  }

  const prefix=
    docType==='FACTURA'
      ?'F001'
      :docType==='BOLETA'
        ?'B001'
        :'NV';

  const seqKey=
    docType==='FACTURA'
      ?'factura'
      :docType==='BOLETA'
        ?'boleta'
        :'sale';

  const number=db.seq[seqKey]++;

  const doc=
    prefix+'-'+String(number).padStart(6,'0');

  for(const i of db.cart){

    const p=db.products.find(x=>x.id===i.id);
    const before=stockOf(p);

    setStock(
      p,
      before-i.qty
    );

    db.movements.push({
      id:db.seq.move++,
      date:new Date().toISOString(),
      productId:p.id,
      product:p.name,
      type:'SALIDA',
      before,
      qty:i.qty,
      after:stockOf(p),
      reason:i.priceType==='Bonificación'
        ?'BONIFICACIÓN'
        :'VENTA',
      storeId:currentStore().id,
      reference:doc,
      user:session.name
    });
  }

  const cashReceived=payments
    .filter(p=>p.method==='Efectivo')
    .reduce(
      (a,p)=>a+Number(p.received||p.amount||0),
      0
    );

  const cashApplied=payments
    .filter(p=>p.method==='Efectivo')
    .reduce(
      (a,p)=>a+Number(p.amount||0),
      0
    );

  const change=Math.max(
    0,
    cashReceived-cashApplied
  );

  const sale={
    id:uid(),
    date:new Date().toISOString(),
    doc,
    docType,
    clientId:client.id,
    client:client.name,
    payment:payments.length>1
      ?'Múltiple'
      :payments[0].method,
    payments:clone(payments),
    total,
    received:cashReceived||total,
    change,
    discount,
    items:clone(db.cart),
    status:'Registrada',
    user:session.name,
    userId:session.id,
    store:currentStore().name,
    storeId:currentStore().id
  };

  db.sales.push(sale);

  db.documents.push({
    id:db.seq.document++,
    saleId:sale.id,
    type:docType,
    series:prefix,
    number,
    status:'PROTOTIPO_SUNAT'
  });

  const points=Math.floor(
    total*Number(db.settings.pointsPerSol||0)
  );

  client.points=(client.points||0)+points;

  db.pointsLedger.push({
    id:uid(),
    date:new Date().toISOString(),
    clientId:client.id,
    type:'EARN',
    points,
    reference:sale.doc
  });

  if(!db.cash.paymentTotals){
    db.cash.paymentTotals={
      Efectivo:0,
      Yape:0,
      Plin:0,
      Izipay:0,
      Tarjeta:0,
      Transferencia:0
    };
  }

  for(const pmt of payments){

    db.cash.paymentTotals[pmt.method]=
      (db.cash.paymentTotals[pmt.method]||0)
      +Number(pmt.amount||0);

    if(pmt.method==='Efectivo'){

      db.cash.expected+=Number(pmt.amount||0);

      db.cash.movements.push({
        date:new Date().toISOString(),
        type:'VENTA',
        detail:sale.doc+' · '+pmt.method,
        amount:Number(pmt.amount||0)
      });

      if(change>0){

        db.cash.expected-=change;

        db.cash.movements.push({
          date:new Date().toISOString(),
          type:'VUELTO',
          detail:sale.doc+' · '+pmt.method,
          amount:-change
        });
      }
    }
  }

  audit(
    'VENTA',
    'VENTA',
    sale.doc+' · '+money(sale.total)
  );

  db.cart=[];

  save();
  render();

  saleCompleteModal(
    sale,
    points
  );
}
function saleCompleteModal(sale,points){let title=sale.docType==='BOLETA'?'Boleta emitida correctamente':sale.docType==='FACTURA'?'Factura emitida correctamente':'Venta registrada correctamente';let wa=`Hola ${sale.client}, te enviamos tu comprobante ${sale.doc} por ${money(sale.total)}. Gracias por tu compra.`;let email=`mailto:?subject=${encodeURIComponent('Comprobante '+sale.doc)}&body=${encodeURIComponent(wa)}`;let paymentSummary=sale.payments?.length>1?`<div class="payment-summary"><div><span>Total</span><b>${money(sale.total)}</b></div>${sale.payments.map(p=>`<div><span>${esc(p.method)}</span><b>${money(p.amount)}</b></div>`).join('')}<div class="change"><span>Vuelto</span><b>${money(sale.change)}</b></div></div>`:sale.payment==='Efectivo'?`<div class="payment-summary"><div><span>Total</span><b>${money(sale.total)}</b></div><div><span>Efectivo recibido</span><b>${money(sale.received)}</b></div><div class="change"><span>Vuelto</span><b>${money(sale.change)}</b></div></div>`:`<div class="payment-summary"><div><span>Total</span><b>${money(sale.total)}</b></div><div><span>Medio de pago</span><b>${esc(sale.payment)}</b></div></div>`;modal('¡Buen trabajo!',`<div class="sale-success"><div class="success-icon">✓</div><h2>${title}</h2><p>Se ha registrado correctamente el comprobante <b>${esc(sale.doc)}</b>.</p>${paymentSummary}<div class="sale-actions"><button class="sale-action" onclick="downloadSalePdf(${sale.id})"><span>▤</span><small>Descargar PDF</small></button><button class="sale-action" onclick="downloadSaleXml(${sale.id})"><span>⌁</span><small>Descargar XML</small></button><button class="sale-action" onclick="window.location.href='${email}'"><span>✉</span><small>Enviar por correo</small></button><button class="sale-action" onclick="sendSaleWhatsApp(${sale.id})"><span>◉</span><small>Enviar por WhatsApp</small></button></div><div class="sale-main-actions"><button class="btn good full" onclick="printSaleFormat(${sale.id},'A4')">Imprimir A4</button><button class="btn good full" onclick="printSaleFormat(${sale.id},'TICKET')">Imprimir Ticket</button><button class="btn primary full" onclick="newSaleAfterComplete()">Nueva venta (ESC)</button></div><p class="muted sale-points">Puntos ganados: ${points}</p></div>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`)}
function newSaleAfterComplete(){closeModal();view='pos';render();setTimeout(focusBarcode,80)}
function openMultiPayment(){let total=cartTotal();let methods=['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'];let rows=methods.map(m=>`<div class="row"><label style="min-width:110px"><b>${m}</b></label><input id="mp_${m}" class="input" type="number" min="0" step="0.01" value="0" placeholder="S/ 0.00" oninput="updateMultiPayment()"></div>`).join('');modal('Generar pago',`<p><b>Total a pagar: ${money(total)}</b></p>${rows}<div class="payment-summary"><div><span>Total asignado</span><b id="mpPaid">S/ 0.00</b></div><div class="change"><span id="mpRemainingLabel">Falta</span><b id="mpRemaining">${money(total)}</b></div></div>`,`<button id="mpConfirm" class="btn good" onclick="confirmMultiPayment()" disabled>Confirmar pago</button>`);window.updateMultiPayment=function(){let paid=methods.reduce((a,m)=>a+Number(document.getElementById('mp_'+m)?.value||0),0),remaining=total-paid;document.getElementById('mpPaid').textContent=money(paid);document.getElementById('mpRemaining').textContent=money(Math.abs(remaining));document.getElementById('mpRemainingLabel').textContent=remaining>0.009?'Falta':remaining<-0.009?'Exceso':'Completo';let btn=document.getElementById('mpConfirm');if(btn)btn.disabled=Math.abs(remaining)>0.009};window.confirmMultiPayment=function(){let payments=methods.map(m=>({method:m,amount:Number(document.getElementById('mp_'+m)?.value||0),received:Number(document.getElementById('mp_'+m)?.value||0)})).filter(x=>x.amount>0);let paid=payments.reduce((a,p)=>a+p.amount,0);if(Math.abs(paid-total)>0.009)return alert(paid<total?`Falta ${money(total-paid)} por asignar.`:`Has asignado ${money(paid-total)} de más.`);closeModal();completeSale(payments)};updateMultiPayment()}function sendSaleWhatsApp(id){let s=saleById(id);if(!s)return;let c=db.clients.find(x=>x.id===s.clientId),phone=(c?.phone||'').replace(/\D/g,'');let msg=`Hola ${c?.name||'cliente'}, te enviamos tu comprobante ${s.doc}. Total: ${money(s.total)}. Gracias por tu compra.`;let url=phone?`https://wa.me/${phone.startsWith('51')?phone:'51'+phone}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;window.open(url,'_blank')}
function downloadSaleXml(id){let s=saleById(id);if(!s)return;let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<comprobante prototipo="true"><tipo>${esc(s.docType)}</tipo><numero>${esc(s.doc)}</numero><cliente>${esc(s.client)}</cliente><moneda>PEN</moneda><total>${s.total.toFixed(2)}</total><pago>${esc(s.payment)}</pago><estado>PROTOTIPO_SUNAT</estado></comprobante>`;let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/xml'}));a.download=s.doc+'.xml';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function downloadSalePdf(id){printSaleFormat(id,'A4')}
function printSaleFormat(id, format = 'A4') {
  const s = saleById(id);
  if (!s) {
    alert('No se encontró la venta.');
    return;
  }

  const items = (s.items || []).map(i => {
    const base = Number(i.qty || 0) * Number(i.price || 0);
    const d = Number(i.discount || 0);

    const disc = i.discountType === '%'
      ? base * d / 100
      : d;

    const total = Math.max(0, base - disc);

    return `
      <tr>
        <td>${esc(i.name)}</td>
        <td>${i.qty}</td>
        <td>${money(i.price)}</td>
        <td>${disc ? money(disc) : '-'}</td>
        <td>${money(total)}</td>
      </tr>
    `;
  }).join('');

  const itemDiscount = (s.items || []).reduce((a, i) => {
    const base = Number(i.qty || 0) * Number(i.price || 0);
    const d = Number(i.discount || 0);

    return a + (
      i.discountType === '%'
        ? base * d / 100
        : d
    );
  }, 0);

  const ticket = format === 'TICKET';

  const w = window.open(
    '',
    '_blank',
    'width=900,height=800'
  );

  if (!w) {
    alert(
      'Chrome bloqueó la ventana de impresión. ' +
      'Permite ventanas emergentes para SmartTuClick.'
    );
    return;
  }

  const company = db.company?.name || 'SmartTuClick';
  const documentType = s.docType || 'VENTA';

  const paymentText = s.payments?.length > 1
    ? s.payments
        .map(p => `${esc(p.method)} ${money(p.amount)}`)
        .join(' · ')
    : esc(s.payment || 'No especificado');

  const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${esc(s.doc || 'Comprobante')}</title>

<style>
@page {
  size: ${ticket ? '80mm auto' : 'A4'};
  margin: ${ticket ? '4mm' : '12mm'};
}

* {
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  font-size: ${ticket ? '11px' : '13px'};
  color: #111;
  padding: ${ticket ? '4px' : '18px'};
  max-width: ${ticket ? '72mm' : '100%'};
  margin: 0 auto;
}

h2 {
  text-align: center;
  margin: 0 0 8px;
}

p {
  margin: 5px 0;
}

.center {
  text-align: center;
}

.right {
  text-align: right;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: ${ticket ? '10px' : '13px'};
}

th,
td {
  padding: 5px 3px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.summary {
  margin-top: 14px;
  border-top: 1px solid #999;
  padding-top: 8px;
}

.change {
  font-size: 15px;
  font-weight: bold;
}

.footer {
  margin-top: 25px;
  text-align: center;
  font-size: 10px;
}
</style>
</head>

<body>

<h2>${esc(company)}</h2>

<p class="center">
  <b>${esc(s.doc || '')}</b>
  ·
  ${esc(documentType)}
</p>

<p>Cliente: ${esc(s.client || 'Cliente general')}</p>
<p>Tienda: ${esc(s.store || '')}</p>

<table>
  <thead>
    <tr>
      <th>Producto</th>
      <th>Cant.</th>
      <th>Precio</th>
      <th>Dscto.</th>
      <th>Importe</th>
    </tr>
  </thead>

  <tbody>
    ${items}
  </tbody>
</table>

${
  itemDiscount
    ? `<p class="right">
         Descuento total:
         <b>${money(itemDiscount)}</b>
       </p>`
    : ''
}

<div class="summary">

  <p class="right">
    <b>Total: ${money(s.total)}</b>
  </p>

  <p>
    Pago: ${paymentText}
  </p>

  ${
    s.payment === 'Efectivo' ||
    s.payments?.some(p => p.method === 'Efectivo')
      ? `
        <p>
          Recibido efectivo:
          ${money(s.received || 0)}
        </p>

        <p class="right change">
          Vuelto:
          ${money(s.change || 0)}
        </p>
      `
      : ''
  }

</div>

<p class="footer">
  DOCUMENTO INTERNO · SMARTTUCLICK
</p>

</body>
</html>
`;

  w.document.open();
  w.document.write(html);
  w.document.close();

  w.onload = function () {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  // Algunos navegadores no disparan onload después de document.write.
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch (e) {
      console.error('Error al imprimir:', e);
    }
  }, 800);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('modalHost')){closeModal();return}if(e.key==='F2'){e.preventDefault();focusBarcode();}})
function heldSales(){let rows=db.held.slice().reverse().map(h=>`<tr><td>${new Date(h.date).toLocaleString()}</td><td>${h.items.reduce((a,i)=>a+i.qty,0)} und.</td><td><button class="btn good" onclick="restoreHeld(${h.id})">Recuperar</button></td></tr>`).join('')||empty(3);modal('Ventas en espera',`<table class="table"><tr><th>Fecha</th><th>Unidades</th><th></th></tr>${rows}</table>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`)}
function restoreHeld(id){if(db.cart.length)return alert('Vacía la venta actual antes de recuperar otra.');let h=db.held.find(x=>x.id===id);if(!h)return;db.cart=clone(h.items);db.held=db.held.filter(x=>x.id!==id);closeModal();save();render()}
function toggleCashReceived(){let p=document.getElementById('salePayment')?.value,row=document.getElementById('cashReceivedRow');if(row)row.style.display=p==='Efectivo'?'flex':'none'}
function holdSale(){if(!db.cart.length)return alert('Carrito vacío');db.held.push({id:uid(),date:new Date().toISOString(),items:clone(db.cart)});db.cart=[];save();render();alert('Venta guardada en espera.')}
function openCash(){if(db.cash.open)return;let n=Number(document.getElementById('opening').value),registerId=Number(document.getElementById('cashRegister').value);if(document.getElementById('opening').value.trim()==='')return alert('Ingresa el monto inicial de apertura.');if(db.registers.find(r=>r.id===registerId)?.storeId!==currentStore().id)return alert('La caja seleccionada no pertenece a la tienda activa.');db.cash={...db.cash,open:true,opening:n,expected:n,openedAt:new Date().toISOString(),userId:session.id,registerId,movements:[{date:new Date().toISOString(),type:'APERTURA',detail:'Fondo inicial',amount:n}]};audit('APERTURA_CAJA','CAJA',String(registerId));save();render()}
function cashMovement(){if(!db.cash.open)return alert('Abre la caja primero.');modal('Movimiento de caja',`<div class="formgrid"><select id="cmType" class="input"><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select><input id="cmAmount" class="input" type="number" min="0.01" step="0.01" placeholder="Monto"><input id="cmDetail" class="input" placeholder="Detalle / motivo"></div>`,`<button class="btn good" onclick="saveCashMovement()">Registrar</button>`)}
function saveCashMovement(){let type=cmType.value,n=Number(cmAmount.value),detail=cmDetail.value.trim();if(!n||n<=0||!detail)return alert('Completa monto y detalle.');if(type==='EGRESO'&&n>db.cash.expected)return alert('El egreso supera el efectivo disponible.');let amount=type==='INGRESO'?n:-n;db.cash.expected+=amount;db.cash.movements.push({date:new Date().toISOString(),type,detail,amount});audit(type+'_CAJA','CAJA',detail);closeModal();save();render()}
let closeWizard=null;
function closeCash(){
 if(!db.cash.open)return alert('La caja ya está cerrada.');
 const pt=db.cash.paymentTotals||{};
 closeWizard={methods:['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'],index:0,declared:{}};
 closeCashStep();
}
function closeExpected(method){return method==='Efectivo'?Number(db.cash.expected||0):Number((db.cash.paymentTotals||{})[method]||0)}
function closeCashStep(){
 if(!closeWizard)return;
 const method=closeWizard.methods[closeWizard.index],expected=closeExpected(method),declared=closeWizard.declared[method];
 const color=method==='Efectivo'?'good':method==='Yape'?'green':method==='Plin'?'blue':method==='Izipay'?'purple':'alt';
 modal(`Cierre de caja · ${method}`,`<div class="close-method"><div class="close-method-icon ${color}">${method==='Efectivo'?'💵':method==='Yape'?'🟢':method==='Plin'?'🔵':method==='Izipay'?'🟣':method==='Tarjeta'?'💳':'🏦'}</div><div class="muted">Monto esperado</div><div class="close-expected">${money(expected)}</div><label>¿Cuánto tienes registrado en ${esc(method)}?</label><input id="closeDeclared" class="input close-amount" type="number" min="0" step="0.01" inputmode="decimal" value="${declared??''}" placeholder="S/ 0.00" autofocus><div class="close-progress">Método ${closeWizard.index+1} de ${closeWizard.methods.length}</div></div>`,`${closeWizard.index>0?`<button class="btn alt" onclick="closeCashBack()">← Anterior</button>`:''}<button class="btn good" onclick="closeCashNext()">${closeWizard.index===closeWizard.methods.length-1?'Ver resumen':'Continuar →'}</button>`);
 setTimeout(()=>document.getElementById('closeDeclared')?.focus(),50);
}
function closeCashNext(){
 const method=closeWizard.methods[closeWizard.index],n=Number(document.getElementById('closeDeclared')?.value);
 if(!Number.isFinite(n)||n<0)return alert('Ingresa un monto válido.');
 closeWizard.declared[method]=n;
 if(closeWizard.index<closeWizard.methods.length-1){closeWizard.index++;closeCashStep();}else closeCashSummary();
}
function closeCashBack(){if(closeWizard.index>0){closeWizard.index--;closeCashStep();}}
function closeCashSummary(){
 const rows=closeWizard.methods.map(m=>{const e=closeExpected(m),d=Number(closeWizard.declared[m]||0),diff=d-e;return `<div class="close-summary-row"><span><b>${esc(m)}</b><small>Esperado ${money(e)}</small></span><span><b>${money(d)}</b><small class="${Math.abs(diff)<0.005?'success':'danger'}">${Math.abs(diff)<0.005?'✓ Cuadrado':`Diferencia ${money(diff)}`}</small></span></div>`}).join('');
 const totalExpected=closeWizard.methods.reduce((a,m)=>a+closeExpected(m),0),totalDeclared=closeWizard.methods.reduce((a,m)=>a+Number(closeWizard.declared[m]||0),0),diff=totalDeclared-totalExpected;
 modal('Resumen de cierre',`<div class="close-summary"><div class="close-total"><span>Total esperado</span><b>${money(totalExpected)}</b></div>${rows}<div class="close-total final"><span>Diferencia total</span><b class="${Math.abs(diff)<0.005?'success':'danger'}">${money(diff)}</b></div></div>`,`<button class="btn alt" onclick="closeCashBackSummary()">← Revisar</button><button class="btn good" onclick="confirmCashClose()">Confirmar cierre</button>`);
}
function closeCashBackSummary(){closeWizard.index=closeWizard.methods.length-1;closeCashStep()}
function viewCashClose(id){
 const c=db.cash.closed.find(x=>x.id===id);
 if(!c)return alert('No se encontró el cierre.');
 const methods=['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'];
 const sales=(c.saleIds?.length?db.sales.filter(s=>c.saleIds.includes(s.id)):[]).filter(s=>s.status!=='ANULADA');
 const byPayment=Object.fromEntries(methods.map(m=>[m,Number(c.salesByPayment?.[m]||sales.reduce((a,s)=>a+(s.payments?.filter(p=>p.method===m).reduce((z,p)=>z+Number(p.amount||0),0)||0),0))]));
 const total=Number(c.salesTotal??sales.reduce((a,s)=>a+Number(s.total||0),0));
 const rows=methods.map(m=>`<tr><td><b>${esc(m)}</b></td><td>${money(byPayment[m])}</td></tr>`).join('');
 const docs=sales.slice().reverse().map(s=>`<tr><td>${new Date(s.date).toLocaleTimeString()}</td><td>${esc(s.doc)}</td><td>${esc(s.client||'Cliente General')}</td><td>${esc(s.payment||'')}</td><td>${money(s.total)}</td></tr>`).join('')||empty(5);
 modal('Ventas del cierre',`<div class="grid"><div class="card"><div class="muted">Día</div><div class="kpi">${new Date(c.date).toLocaleDateString()}</div></div><div class="card"><div class="muted">Total vendido</div><div class="kpi">${money(total)}</div><div class="muted">${sales.length||Number(c.saleCount||0)} ventas · No incluye fondo inicial</div></div></div><div class="section card"><div class="section-title"><b>Ventas por medio de pago</b></div><table class="table"><tr><th>Medio de pago</th><th>Vendido</th></tr>${rows}<tr><th>TOTAL VENTAS</th><th>${money(total)}</th></tr></table></div><div class="section card"><div class="section-title"><b>Comprobantes del cierre</b></div><table class="table"><tr><th>Hora</th><th>Documento</th><th>Cliente</th><th>Pago</th><th>Monto</th></tr>${docs}</table></div>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`);
}

function confirmCashClose(){
 const totalExpected=closeWizard.methods.reduce((a,m)=>a+closeExpected(m),0),totalDeclared=closeWizard.methods.reduce((a,m)=>a+Number(closeWizard.declared[m]||0),0);
 const breakdown=Object.fromEntries(closeWizard.methods.map(m=>[m,{expected:closeExpected(m),declared:Number(closeWizard.declared[m]||0),difference:Number(closeWizard.declared[m]||0)-closeExpected(m)}]));
 let r=db.registers.find(x=>x.id===db.cash.registerId);
 const closedAt=new Date().toISOString();
 const openedAt=db.cash.openedAt;
 const closeSales=db.sales.filter(s=>s.storeId===currentStore().id&&s.status!=='ANULADA'&&(!openedAt||s.date>=openedAt)&&s.date<=closedAt);
 const salesByPayment=Object.fromEntries(closeWizard.methods.map(m=>[m,closeSales.reduce((sum,sale)=>sum+(sale.payments?.filter(p=>p.method===m).reduce((a,p)=>a+Number(p.amount||0),0)||0),0)]));
 const salesTotal=closeSales.reduce((a,s)=>a+Number(s.total||0),0);
 db.cash.closed.push({
   id:uid(),
   date:closedAt,
   openedAt,
   opening:Number(db.cash.opening||0),
   expected:totalExpected,
   declared:totalDeclared,
   difference:totalDeclared-totalExpected,
   breakdown,
   salesTotal,
   salesByPayment,
   saleCount:closeSales.length,
   saleIds:closeSales.map(s=>s.id),
   movements:clone(db.cash.movements||[]),
   register:r?.name||'',
   user:session.name,
   storeId:currentStore().id
 });
 audit('CIERRE_CAJA','CAJA',String(db.cash.registerId));
 db.cash.open=false;db.cash.opening=0;db.cash.expected=0;db.cash.openedAt=null;db.cash.movements=[];db.cash.paymentTotals={Efectivo:0,Yape:0,Plin:0,Izipay:0,Tarjeta:0,Transferencia:0};closeWizard=null;closeModal();save();render();
}
function productForm(){modal('Nuevo producto',`<div class="formgrid"><input id="psku" class="input" placeholder="SKU"><input id="pbar" class="input" placeholder="Código de barras"><input id="pname" class="input" placeholder="Nombre"><input id="pcat" class="input" placeholder="Categoría" value="General"><input id="pbrand" class="input" placeholder="Marca"><input id="punit" class="input" placeholder="Unidad" value="UND"><input id="pcost" class="input" type="number" min="0" step="0.01" placeholder="Costo"><input id="pprice" class="input" type="number" min="0" step="0.01" placeholder="Precio"><input id="pstock" class="input" type="number" min="0" step="0.001" placeholder="Stock inicial"><input id="pmin" class="input" type="number" min="0" step="0.001" placeholder="Stock mínimo"></div>`,`<button class="btn good" onclick="saveProduct()">Guardar producto</button>`)}
function saveProduct(){let sku=psku.value.trim(),name=pname.value.trim(),bar=pbar.value.trim(),cost=Number(pcost.value||0),price=Number(pprice.value||0),stock=Number(pstock.value||0),min=Number(pmin.value||0);if(!sku||!name||cost<0||price<0||stock<0||min<0)return alert('Completa los datos del producto.');if(db.products.some(p=>p.sku===sku))return alert('Ese SKU ya existe.');if(bar&&db.products.some(p=>String(p.barcode)===bar))return alert('Ese código de barras ya existe.');let id=uid();let storeStocks={};for(const st of db.stores)storeStocks[st.id]=st.id===currentStore().id?stock:0;db.products.push({id,sku,barcode:bar,name,category:pcat.value.trim()||'General',brand:pbrand.value.trim(),unit:punit.value.trim()||'UND',cost,price,stock,min,active:true,storeStocks});if(stock>0)db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:id,product:name,type:'ENTRADA',before:0,qty:stock,after:stock,reason:'STOCK INICIAL',reference:'INI-'+id,user:session.name,storeId:currentStore().id});closeModal();save();render()}
function editProduct(id){let p=db.products.find(x=>x.id===id);if(!p)return;modal('Editar producto',`<div class="formgrid"><input id="epname" class="input" value="${esc(p.name)}"><input id="epcat" class="input" value="${esc(p.category)}"><input id="epbrand" class="input" value="${esc(p.brand||'')}"><input id="epcost" class="input" type="number" min="0" step="0.01" value="${p.cost}"><input id="epprice" class="input" type="number" min="0" step="0.01" value="${p.price}"><select id="epactive" class="input"><option value="1" ${p.active?'selected':''}>Activo</option><option value="0" ${!p.active?'selected':''}>Inactivo</option></select></div>`,`<button class="btn good" onclick="saveEditProduct(${id})">Guardar</button>`)}
function saveEditProduct(id){let p=db.products.find(x=>x.id===id);if(!p)return;p.name=epname.value.trim()||p.name;p.category=epcat.value.trim()||'General';p.brand=epbrand.value.trim();p.cost=Number(epcost.value||0);p.price=Number(epprice.value||0);p.active=epactive.value==='1';audit('EDITAR','PRODUCTO',p.sku);closeModal();save();render()}
let pendingProductImport = null;

function loadXLSX(){
  return new Promise((resolve,reject)=>{
    if(window.XLSX)return resolve(window.XLSX);

    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

    s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('No se pudo cargar Excel'));
    s.onerror=()=>reject(new Error('No se pudo cargar la librería de Excel'));
    document.head.appendChild(s);
  });
}

async function importProductsExcel(){
  try{
    await loadXLSX();

    const input=document.createElement('input');
    input.type='file';
    input.accept='.xlsx,.xls';

    input.onchange=async()=>{
      const file=input.files?.[0];
      if(!file)return;

      try{
        const buffer=await file.arrayBuffer();
        const workbook=XLSX.read(buffer,{type:'array'});
        const sheet=workbook.Sheets['Productos']||workbook.Sheets[workbook.SheetNames[0]];

        if(!sheet){
          return alert('No se encontró una hoja de productos.');
        }

        const rows=XLSX.utils.sheet_to_json(sheet,{
          defval:'',
          raw:false
        });

        processExcelProducts(rows,file.name);

      }catch(err){
        console.error(err);
        alert('No se pudo leer el archivo Excel.');
      }
    };

    input.click();

  }catch(err){
    console.error(err);
    alert('No se pudo cargar el módulo de Excel. Revisa tu conexión a Internet.');
  }
}

function normalizeImportHeader(v){
  return String(v??'')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ');
}

function parseImportNumber(v,defaultValue=0){
  if(v===null||v===undefined||String(v).trim()==='')return defaultValue;

  let s=String(v).trim()
    .replace(/S\/?/gi,'')
    .replace(/\s/g,'');

  if(s.includes(',')&&s.includes('.')){
    s=s.replace(/,/g,'');
  }else if(s.includes(',')){
    s=s.replace(',','.');
  }

  const n=Number(s);
  return Number.isFinite(n)?n:NaN;
}

function processExcelProducts(rows,fileName='Excel'){

  if(!Array.isArray(rows)||!rows.length){
    return alert('El Excel no contiene productos.');
  }

  const required=[
    'SKU',
    'Código de barras',
    'Nombre',
    'Categoría',
    'Marca',
    'Unidad',
    'Costo',
    'Precio',
    'Stock inicial',
    'Stock mínimo'
  ];

  const first=rows[0]||{};
  const headers=Object.keys(first).map(normalizeImportHeader);

  const expected=required.map(normalizeImportHeader);

  const missing=expected.filter(h=>!headers.includes(h));

  if(missing.length){
    return alert(
      'El Excel no tiene las columnas esperadas:\\n\\n'+
      missing.join('\\n')
    );
  }

  const get=(row,name)=>{
    const target=normalizeImportHeader(name);
    const key=Object.keys(row).find(k=>normalizeImportHeader(k)===target);
    return key!==undefined?row[key]:'';
  };

  const preview=[];
  const errors=[];
  const skuSeen=new Set();
  const barcodeSeen=new Map();

  rows.forEach((row,index)=>{

    const excelRow=index+2;

    const sku=String(get(row,'SKU')??'').trim();
    const barcode=String(get(row,'Código de barras')??'').trim();
    const name=String(get(row,'Nombre')??'').trim();
    const category=String(get(row,'Categoría')??'').trim()||'General';
    const brand=String(get(row,'Marca')??'').trim();
    const unit=String(get(row,'Unidad')??'').trim()||'UND';

    const cost=parseImportNumber(get(row,'Costo'),0);
    const price=parseImportNumber(get(row,'Precio'),0);
    const stock=parseImportNumber(get(row,'Stock inicial'),0);
    const min=parseImportNumber(get(row,'Stock mínimo'),0);

    if(!sku){
      errors.push(`Fila ${excelRow}: falta SKU.`);
      return;
    }

    if(!name){
      errors.push(`Fila ${excelRow}: falta Nombre.`);
      return;
    }

    if(!Number.isFinite(cost)||cost<0){
      errors.push(`Fila ${excelRow}: Costo inválido.`);
      return;
    }

    if(!Number.isFinite(price)||price<0){
      errors.push(`Fila ${excelRow}: Precio inválido.`);
      return;
    }

    if(!Number.isFinite(stock)||stock<0){
      errors.push(`Fila ${excelRow}: Stock inicial inválido.`);
      return;
    }

    if(!Number.isFinite(min)||min<0){
      errors.push(`Fila ${excelRow}: Stock mínimo inválido.`);
      return;
    }

    if(skuSeen.has(sku)){
      errors.push(`Fila ${excelRow}: SKU duplicado en el Excel: ${sku}`);
      return;
    }

    skuSeen.add(sku);

    if(barcode){
      if(barcodeSeen.has(barcode)){
        errors.push(
          `Fila ${excelRow}: código de barras duplicado en el Excel: ${barcode}`
        );
        return;
      }

      barcodeSeen.set(barcode,excelRow);

      const existingBarcode=db.products.find(
        p=>String(p.barcode||'')===barcode&&p.sku!==sku
      );

      if(existingBarcode){
        errors.push(
          `Fila ${excelRow}: código de barras ${barcode} ya pertenece al SKU ${existingBarcode.sku}.`
        );
        return;
      }
    }

    const existing=db.products.find(p=>String(p.sku)===sku);

    preview.push({
      row:excelRow,
      sku,
      barcode,
      name,
      category,
      brand,
      unit,
      cost,
      price,
      stock,
      min,
      existingId:existing?.id||null,
      action:existing?'ACTUALIZAR':'NUEVO'
    });
  });

  const news=preview.filter(x=>x.action==='NUEVO').length;
  const updates=preview.filter(x=>x.action==='ACTUALIZAR').length;

  pendingProductImport={
    fileName,
    rows:preview,
    errors
  };

  const errorHtml=errors.length
    ? `<div class="notice danger">
        <b>Errores encontrados: ${errors.length}</b>
        <div style="max-height:180px;overflow:auto;margin-top:8px">
          ${errors.map(e=>`<div>• ${esc(e)}</div>`).join('')}
        </div>
      </div>`
    : `<div class="notice success">
        ✓ No se encontraron errores en los productos.
      </div>`;

  const previewHtml=preview.length
    ? `<div style="max-height:360px;overflow:auto">
        <table class="table">
          <tr>
            <th>Fila</th>
            <th>SKU</th>
            <th>Producto</th>
            <th>Costo</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acción</th>
          </tr>
          ${preview.map(x=>`
            <tr>
              <td>${x.row}</td>
              <td>${esc(x.sku)}</td>
              <td>${esc(x.name)}</td>
              <td>${money(x.cost)}</td>
              <td>${money(x.price)}</td>
              <td>${x.stock}</td>
              <td>
                <span class="tag ${x.action==='NUEVO'?'good':''}">
                  ${x.action}
                </span>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>`
    : `<div class="empty">No hay productos válidos para importar.</div>`;

  modal(
    'Vista previa · Importar productos',
    `
      <div class="notice">
        <b>${esc(fileName)}</b><br>
        ${news} productos nuevos · ${updates} productos existentes
      </div>

      ${errorHtml}

      ${previewHtml}

      <div class="notice">
        <b>Importante:</b> los productos existentes se actualizarán en
        nombre, categoría, marca, unidad, costo y precio.
        <br>
        <b>El stock actual NO será reemplazado.</b>
        El stock inicial del Excel solo se usará para productos nuevos.
      </div>
    `,
    `
      <button class="btn alt" onclick="closeModal();pendingProductImport=null">
        Cancelar
      </button>

      <button
        class="btn good"
        onclick="confirmProductImport()"
        ${preview.length?'':'disabled'}
      >
        Importar ${preview.length} productos
      </button>
    `
  );
}

function confirmProductImport(){

  if(!pendingProductImport)return;

  const rows=pendingProductImport.rows||[];

  if(!rows.length){
    return alert('No hay productos válidos para importar.');
  }

  let created=0;
  let updated=0;
  let stockUnits=0;

  for(const x of rows){

    let p=db.products.find(p=>String(p.sku)===x.sku);

    if(p){

      p.barcode=x.barcode||p.barcode||'';
      p.name=x.name;
      p.category=x.category;
      p.brand=x.brand;
      p.unit=x.unit;
      p.cost=x.cost;
      p.price=x.price;
      p.min=x.min;
      p.active=true;

      updated++;

    }else{

      const id=uid();

      const storeStocks={};

      for(const st of db.stores||[]){
        storeStocks[st.id]=
          st.id===currentStore().id
            ?x.stock
            :0;
      }

      p={
        id,
        sku:x.sku,
        barcode:x.barcode,
        name:x.name,
        category:x.category,
        brand:x.brand,
        unit:x.unit,
        cost:x.cost,
        price:x.price,
        stock:x.stock,
        min:x.min,
        active:true,
        storeStocks
      };

      db.products.push(p);

      if(x.stock>0){

        db.movements.push({
          id:db.seq.move++,
          date:new Date().toISOString(),
          productId:id,
          product:x.name,
          type:'ENTRADA',
          before:0,
          qty:x.stock,
          after:x.stock,
          reason:'IMPORTACIÓN EXCEL',
          reference:'IMP-'+id,
          user:session.name,
          storeId:currentStore().id
        });

        stockUnits+=x.stock;
      }

      created++;
    }
  }

  audit(
    'IMPORTAR',
    'PRODUCTOS',
    `Excel: ${pendingProductImport.fileName} · Nuevos: ${created} · Actualizados: ${updated}`
  );

  pendingProductImport=null;

  closeModal();
  save();
  render();

  alert(
    'Importación completada.\\n\\n'+
    'Productos nuevos: '+created+'\\n'+
    'Productos actualizados: '+updated+'\\n'+
    'Stock inicial agregado: '+stockUnits
  );
}
function downloadProductTemplate(){
  const link=document.createElement('a');
  link.href='archivos/SmartTuClick-Plantilla-Importacion-Productos.xlsx';
  link.download='SmartTuClick-Plantilla-Importacion-Productos.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function exportProductsExcel(){
  try{

    if(!window.ExcelJS){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
        s.onload=resolve;
        s.onerror=reject;
        document.head.appendChild(s);
      });
    }

        const response=await fetch('archivos/SmartTuClick-Plantilla-Importacion-Productos.xlsx');

    if(!response.ok){
      throw new Error('No se encontró la plantilla de Excel.');
    }

    const buffer=await response.arrayBuffer();

    const workbook=new window.ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);

    const ws=workbook.getWorksheet('Productos');

    if(!ws){
      throw new Error('La hoja Productos no existe en la plantilla.');
    }


    const rows=db.products.map(p=>[
      p.sku||'',
      p.barcode||'',
      p.name||'',
      p.category||'General',
      p.brand||'',
      p.unit||'UND',
      Number(p.cost||0),
      Number(p.price||0),
      Number(stockOf(p)||0),
      Number(p.min||0)
    ]);

    // Limpia solamente los datos de productos
    // y conserva el formato y los desplegables de la plantilla.
    for(let r=2;r<=ws.rowCount;r++){
      for(let c=1;c<=10;c++){
        ws.getCell(r,c).value=null;
      }
    }

    // Escribe los productos actuales
    rows.forEach((row,index)=>{
      const excelRow=ws.getRow(index+2);

      row.forEach((value,colIndex)=>{
        excelRow.getCell(colIndex+1).value=value;
      });
    });

    // Ajusta el ancho de columnas
    const widths=[
      16,20,32,20,20,12,12,12,15,15
    ];

    widths.forEach((width,index)=>{
      ws.getColumn(index+1).width=width;
    });

    const out=await workbook.xlsx.writeBuffer();

    const blob=new Blob(
      [out],
      {
        type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );

    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download='SmartTuClick-Productos-'+today()+'.xlsx';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(()=>{
      URL.revokeObjectURL(link.href);
    },1000);

  }catch(err){

    console.error(err);

    alert(
      'No se pudo exportar el Excel. '+
      (err.message||'Revisa tu conexión a Internet.')
    );
  }
}
function productRows(list=db.products){return list.map(p=>`<tr><td>${esc(p.sku)}</td><td><b>${esc(p.name)}</b><div class="muted">${esc(p.barcode)}</div></td><td>${esc(p.category)}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td class="${stockOf(p)<=p.min?'danger':''}">${stockOf(p)} ${esc(p.unit)}</td><td>${p.active?'Activo':'Inactivo'}</td><td class="actions"><button class="iconAction quickIn" title="Ingreso rápido" onclick="quickStockMove(${p.id},'ENTRADA')">↓</button><button class="iconAction quickOut" title="Salida rápida" onclick="quickStockMove(${p.id},'SALIDA')">↑</button><button class="btn alt" onclick="adjust(${p.id})">Ajustar</button> <button class="btn alt" onclick="editProduct(${p.id})">Editar</button></td></tr>`).join('')||empty(8)}function productSearch(q=''){let cat=document.getElementById('catFilter')?.value||'';const target=document.getElementById('productRows');if(!target)return;target.innerHTML=productRows(db.products.filter(p=>(p.name+p.sku+p.barcode).toLowerCase().includes(q.toLowerCase())&&(!cat||p.category===cat)))}
function adjust(id){let p=db.products.find(x=>x.id===id),n=Number(prompt(`Nuevo stock para ${p.name}`,stockOf(p)));if(!Number.isFinite(n)||n<0)return;let before=stockOf(p),d=n-before;setStock(p,n);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:d>=0?'ENTRADA':'SALIDA',before,qty:Math.abs(d),after:n,reason:'AJUSTE',reference:'AJ-'+db.seq.move,user:session.name,storeId:currentStore().id});save();render()}
function quickStockMove(productId,type){let p=productId?db.products.find(x=>x.id===Number(productId)):null; if(productId&&!p)return; let sid=currentStore().id; let warehouses=db.warehouses.filter(w=>w.storeId===sid&&w.active); let mode=type||'ENTRADA'; let isIn=mode==='ENTRADA'; let productOptions=db.products.filter(x=>x.active).map(x=>`<option value="${x.id}" ${p&&x.id===p.id?'selected':''}>${esc(x.name)} · ${esc(x.sku)} · stock ${stockOf(x,sid)}</option>`).join(''); let whOptions=warehouses.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join(''); let reasons=isIn?`<option>INGRESO A ALMACÉN</option><option>DEVOLUCIÓN</option><option>AJUSTE POSITIVO</option><option>OTRO INGRESO</option>`:`<option>SALIDA DE ALMACÉN</option><option>MERMA</option><option>AJUSTE NEGATIVO</option><option>CONSUMO INTERNO</option><option>OTRA SALIDA</option>`; modal(isIn?'↓ Ingreso rápido de stock':'↑ Salida rápida de stock',`<div class="quickMoveHead ${isIn?'in':'out'}"><b>${isIn?'Entrada':'Salida'}</b><span> ${esc(currentStore().name)}</span></div><div class="formgrid"><label>Producto<select id="qmProduct" class="input" onchange="refreshQuickStock()">${productOptions}</select></label><label>Almacén<select id="qmWarehouse" class="input">${whOptions}</select></label><label>Stock actual<input id="qmCurrent" class="input" value="${stockOf(p,sid)}" disabled></label><label>Motivo<select id="qmReason" class="input">${reasons}</select></label><label>Cantidad a ${isIn?'ingresar':'retirar'}<input id="qmQty" class="input qtyInput" type="number" min="0.001" step="0.001" value="1" autofocus></label><label>Observación<input id="qmNote" class="input" placeholder="Opcional"></label></div><div class="notice">El movimiento actualizará el stock de <b>${esc(currentStore().name)}</b> y quedará registrado en el Kardex.</div>`,`<button class="btn ${isIn?'good':'warn'}" onclick="saveQuickStockMove('${mode}')">${isIn?'Registrar ingreso':'Registrar salida'}</button>`); }
function refreshQuickStock(){let p=db.products.find(x=>x.id===Number(document.getElementById('qmProduct')?.value));let el=document.getElementById('qmCurrent');if(el&&p)el.value=stockOf(p,currentStore().id)}
function saveQuickStockMove(type){let p=db.products.find(x=>x.id===Number(document.getElementById('qmProduct')?.value));let qty=Number(document.getElementById('qmQty')?.value);let reason=document.getElementById('qmReason')?.value||'';let note=document.getElementById('qmNote')?.value?.trim()||'';let sid=currentStore().id;if(!p||!p.active)return alert('Selecciona un producto activo.');if(!Number.isFinite(qty)||qty<=0)return alert('La cantidad debe ser mayor que cero.');let before=stockOf(p,sid);if(type==='SALIDA'&&db.settings.strictStock&&qty>before)return alert(`Stock insuficiente. Disponible: ${before} ${p.unit}.`);let after=type==='ENTRADA'?before+qty:before-qty;setStock(p,after,sid);let ref='MR-'+String(db.seq.quickMove++).padStart(6,'0');db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type,operation:type==='ENTRADA'?'INGRESO_RAPIDO':'SALIDA_RAPIDA',before,qty,after,reason,reference:ref,note,warehouseId:Number(document.getElementById('qmWarehouse')?.value)||null,user:session.name,storeId:sid});audit(type==='ENTRADA'?'INGRESO_RAPIDO':'SALIDA_RAPIDA','INVENTARIO',`${p.name} x ${qty} · ${ref}`);closeModal();save();render()}
function adjustStockForm(){let opts=db.products.map(p=>`<option value="${p.id}">${esc(p.name)} · stock ${stockOf(p)}</option>`).join('');modal('Ajuste de inventario',`<div class="formgrid"><select id="ap" class="input">${opts}</select><input id="an" class="input" type="number" min="0" placeholder="Nuevo stock"><input id="ar" class="input" placeholder="Motivo"></div>`,`<button class="btn good" onclick="saveAdjustForm()">Guardar</button>`)}function saveAdjustForm(){let p=db.products.find(x=>x.id==ap.value),n=Number(an.value);if(!p||!Number.isFinite(n)||n<0)return alert('Datos inválidos');let before=stockOf(p),d=n-before;setStock(p,n);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:d>=0?'ENTRADA':'SALIDA',before,qty:Math.abs(d),after:n,reason:ar.value||'AJUSTE',reference:'AJ-'+db.seq.move,user:session.name,storeId:currentStore().id});closeModal();save();render()}
function kardexRows(list=db.movements){return list.slice().reverse().slice(0,100).map(m=>`<tr><td>${new Date(m.date).toLocaleString()}</td><td>${esc(m.product)}</td><td>${m.type}</td><td>${m.before??'-'}</td><td>${m.qty}</td><td>${m.after??'-'}</td><td>${esc(m.reason)}</td><td>${esc(m.reference||'-')}</td></tr>`).join('')||empty(8)}function kardexFilter(q){document.getElementById('kardexRows').innerHTML=kardexRows(db.movements.filter(m=>(m.product+m.reason+m.reference).toLowerCase().includes(q.toLowerCase())))}
function purchaseForm(){modal('Registrar compra',`<div class="formgrid"><select id="sup" class="input"><option value="">Seleccionar proveedor</option>${db.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)} · ${esc(s.doc||'')}</option>`).join('')}</select><input id="pd" class="input" placeholder="Factura/Documento"><select id="prod" class="input">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="qty" class="input" type="number" min="1" placeholder="Cantidad"><select id="pay" class="input"><option>Contado</option><option>Crédito</option></select><input id="cost" class="input" type="number" min="0" step="0.01" placeholder="Costo unitario"></div>`,`<button class="btn good" onclick="savePurchase()">Registrar compra</button>`)}function savePurchase(){let p=db.products.find(x=>x.id==prod.value),q=Number(qty.value),c=Number(cost.value);let supplier=db.suppliers.find(x=>x.id===Number(sup.value));if(!supplier||!q||c<0)return alert('Selecciona proveedor y completa los datos');let before=stockOf(p);setStock(p,before+q);p.cost=c;let total=q*c,ref='OC-'+String(db.seq.purchase).padStart(6,'0');db.purchases.push({id:db.seq.purchase++,date:new Date().toISOString(),supplier:supplier.name,supplierId:supplier.id,doc:pd.value||'S/D',product:p.name,productId:p.id,qty:q,cost:c,total,status:pay.value==='Crédito'?'PENDIENTE PAGO':'PAGADA',payment:pay.value,storeId:currentStore().id,user:session.name});audit('CREAR','COMPRA',ref);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:q,after:stockOf(p),reason:'COMPRA',storeId:currentStore().id,reference:ref,user:session.name});closeModal();save();render()}
function supplierForm(){modal('Nuevo proveedor',`<div class="formgrid"><input id="sd" class="input" placeholder="RUC/DNI"><input id="sn" class="input" placeholder="Razón social"><input id="sp" class="input" placeholder="Teléfono"><input id="se" class="input" placeholder="Email"></div>`,`<button class="btn good" onclick="saveSupplier()">Guardar</button>`)}function saveSupplier(){if(!sn.value)return alert('Razón social obligatoria');if(sd.value&&db.suppliers.some(x=>x.doc===sd.value.trim()))return alert('Ese documento de proveedor ya existe.');db.suppliers.push({id:uid(),doc:sd.value,name:sn.value,phone:sp.value,email:se.value});closeModal();save();render()}
function transferForm(){if(db.stores.length<2){return alert('Crea al menos dos tiendas para transferir stock.')}modal('Nueva transferencia',`<div class="formgrid"><select id="tf" class="input">${db.stores.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><select id="tt" class="input">${db.stores.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><select id="tp" class="input">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="tq" class="input" type="number" min="1" placeholder="Cantidad"></div>`,`<button class="btn good" onclick="saveTransfer()">Emitir transferencia</button>`)}function saveTransfer(){let f=db.stores.find(s=>s.id==tf.value),t=db.stores.find(s=>s.id==tt.value),p=db.products.find(x=>x.id==tp.value),q=Number(tq.value);if(f.id===t.id||!p||q<1)return alert('Origen y destino deben ser distintos y la cantidad válida');if(db.settings.strictStock&&stockOf(p,f.id)<q)return alert('Stock insuficiente en origen');let before=stockOf(p,f.id);setStock(p,before-q,f.id);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'SALIDA',before,qty:q,after:stockOf(p,f.id),reason:'TRANSFERENCIA',storeId:f.id,reference:'TR-'+String(db.seq.transfer).padStart(6,'0'),user:session.name});db.transfers.push({id:db.seq.transfer++,date:new Date().toISOString(),from:f.name,to:t.name,fromId:f.id,toId:t.id,product:p.name,productId:p.id,qty:q,status:'PENDIENTE',user:session.name});closeModal();save();render()}function receiveTransfer(id){let t=db.transfers.find(x=>x.id===id);if(!t)return;let p=db.products.find(x=>x.id===t.productId),before=stockOf(p,t.toId);setStock(p,before+t.qty,t.toId);t.status='RECIBIDA';db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:t.qty,after:stockOf(p,t.toId),reason:'RECEPCIÓN TRANSFERENCIA',storeId:t.toId,reference:'TR-'+String(t.id).padStart(6,'0'),user:session.name});save();render()}
function quoteRows(){return db.quotes.slice().reverse().map(q=>`<tr><td>${new Date(q.date).toLocaleString()}</td><td>${esc(q.doc)}</td><td>${esc(q.client)}</td><td>${money(q.total)}</td><td>${esc(q.status)}</td><td>${q.status==='ABIERTA'?`<button class="btn good" onclick="loadQuote(${q.id})">Cargar POS</button>`:''}</td></tr>`).join('')||empty(6)}
function quoteForm(){if(!db.cart.length)return alert('Arma primero el carrito del POS y luego crea la cotización.');let client=db.clients[0];modal('Nueva cotización',`<div class="formgrid"><select id="qClient" class="input">${db.clients.map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.doc)}</option>`).join('')}</select><input id="qNote" class="input" placeholder="Observación / vigencia"></div><p class="muted">${db.cart.reduce((a,i)=>a+i.qty,0)} unidades · ${money(cartTotal())}</p>`,`<button class="btn good" onclick="saveQuote()">Guardar cotización</button>`)}
function saveQuote(){let c=db.clients.find(x=>x.id===Number(qClient.value))||db.clients[0],total=cartTotal(),number=db.seq.quote++,doc='COT-'+String(number).padStart(6,'0');db.quotes.push({id:uid(),date:new Date().toISOString(),doc,clientId:c.id,client:c.name,total,items:clone(db.cart),note:qNote.value||'',status:'ABIERTA',storeId:currentStore().id,user:session.name});audit('CREAR','COTIZACION',doc);closeModal();save();render()}
function loadQuote(id){let q=db.quotes.find(x=>x.id===id);if(!q)return;if(db.cart.length&&!confirm('La venta actual será reemplazada por la cotización.'))return;db.cart=clone(q.items);q.status='CARGADA_POS';db.activeStoreId=q.storeId||db.activeStoreId;audit('CARGAR','COTIZACION',q.doc);save();view='pos';render()}
function clientRows(list=db.clients){return list.map(c=>`<tr><td>${esc(c.docType)} ${esc(c.doc)}</td><td><b>${esc(c.name)}</b><div class="muted">${esc(c.email||'')}</div></td><td>${esc(c.phone)}</td><td>${c.points||0}</td><td><button class="btn alt" onclick="pointsHistory(${c.id})">Puntos</button></td></tr>`).join('')||empty(5)}function clientSearch(q){document.getElementById('clientRows').innerHTML='<tr><th>Documento</th><th>Cliente</th><th>Teléfono</th><th>Puntos</th><th></th></tr>'+clientRows(db.clients.filter(c=>(c.name+c.doc+c.phone).toLowerCase().includes(q.toLowerCase())))}function clientForm(){modal('Nuevo cliente',`<div class="formgrid"><select id="cdt" class="input"><option>DNI</option><option>RUC</option><option>CE</option></select><input id="cd" class="input" placeholder="Documento"><input id="cn" class="input" placeholder="Nombre/Razón social"><input id="ct" class="input" placeholder="Teléfono"><input id="ce" class="input" placeholder="Email"><input id="ca" class="input" placeholder="Dirección"></div>`,`<button class="btn good" onclick="saveClient()">Guardar</button>`)}function saveClient(){if(!cn.value)return alert('Nombre obligatorio');if(cd.value&&db.clients.some(x=>x.doc===cd.value.trim()))return alert('Ese documento ya está registrado.');db.clients.push({id:uid(),docType:cdt.value,doc:cd.value,name:cn.value,phone:ct.value,email:ce.value,address:ca.value,points:0});closeModal();save();render()}function pointsHistory(id){let c=db.clients.find(x=>x.id===id),rows=db.pointsLedger.filter(x=>x.clientId===id).slice().reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleString()}</td><td>${x.type}</td><td>${x.points}</td><td>${esc(x.reference||'')}</td></tr>`).join('')||empty(4);modal('Historial de puntos',`<p><b>${esc(c.name)}</b> · ${c.points||0} puntos</p><table class="table"><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Referencia</th></tr>${rows}</table>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`)}
function userForm(){modal('Nuevo usuario',`<div class="formgrid"><input id="un" class="input" placeholder="Nombre"><input id="uu" class="input" placeholder="Usuario"><input id="up" class="input" type="password" placeholder="Contraseña demo"><select id="ur" class="input">${Object.keys(db.roles).map(r=>`<option>${r}</option>`).join('')}</select></div>`,`<button class="btn good" onclick="saveUser()">Guardar</button>`)}function saveUser(){if(!un.value||!uu.value)return alert('Completa los datos');db.users.push({id:uid(),name:un.value,user:uu.value,password:up.value||'demo',role:ur.value,active:true});closeModal();save();render()}
function salesRows(list=db.sales){return list.slice().reverse().map(s=>`<tr><td>${new Date(s.date).toLocaleString()}</td><td>${esc(s.doc)}</td><td>${esc(s.client)}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td><td>${s.status}</td><td>${s.status!=='ANULADA'?`<button class="btn alt" onclick="printSale(${s.id})">Ver/Imprimir</button> <button class="btn alt" onclick="voidSale(${s.id})">Anular</button>`:''}</td></tr>`).join('')||empty(7)}function salesFilter(q){document.getElementById('salesRows').innerHTML='<tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>'+salesRows(db.sales.filter(s=>(s.doc+s.client).toLowerCase().includes(q.toLowerCase())))}function voidSale(id){let s=db.sales.find(x=>x.id===id);if(!s||s.status==='ANULADA')return;if(!confirm('¿Anular esta venta? La demo revertirá stock y medios de pago.'))return;s.status='ANULADA';for(const i of s.items){let p=db.products.find(x=>x.id===i.id);if(p){let before=stockOf(p,s.storeId);setStock(p,before+i.qty,s.storeId);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:i.qty,after:stockOf(p,s.storeId),reason:'ANULACIÓN VENTA',storeId:s.storeId,reference:s.doc,user:session.name})}}let c=db.clients.find(x=>x.id===s.clientId),pts=Math.floor(s.total*Number(db.settings.pointsPerSol||0));if(c){c.points=Math.max(0,(c.points||0)-pts);db.pointsLedger.push({id:uid(),date:new Date().toISOString(),clientId:c.id,type:'REVERSE',points:-pts,reference:s.doc})}let payments=s.payments?.length?s.payments:[{method:s.payment,amount:s.total}];if(db.cash.open&&db.cash.paymentTotals){for(const pmt of payments){db.cash.paymentTotals[pmt.method]=Math.max(0,(db.cash.paymentTotals[pmt.method]||0)-Number(pmt.amount||0));if(pmt.method==='Efectivo'){db.cash.expected=Math.max(0,db.cash.expected-Number(pmt.amount||0));db.cash.movements.push({date:new Date().toISOString(),type:'ANULACIÓN',detail:s.doc+' · '+pmt.method,amount:-Number(pmt.amount||0)});}}}save();render()}
function exportCSV(){let rows=[['Fecha','Comprobante','Cliente','Pago','Total','Estado'],...db.sales.map(s=>[s.date,s.doc,s.client,s.payment,s.total,s.status])];let csv=rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='smarttuclick-ventas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function saveSettings(){db.company.name=companyName.value.trim()||db.company.name;db.company.ruc=companyRuc.value.trim();db.company.igv=Number(igv.value||18)/100;currentStore().name=storeName.value.trim()||currentStore().name;db.settings.strictStock=strictStock.value==='1';db.settings.pointsPerSol=Number(pointsRate.value||0);db.settings.printer=printer.value;save();render()}function storeForm(){modal('Nueva tienda',`<div class="formgrid"><input id="stn" class="input" placeholder="Nombre tienda"><input id="stc" class="input" placeholder="Código"><input id="whn" class="input" placeholder="Almacén principal"><input id="regn" class="input" placeholder="Caja principal"></div>`,`<button class="btn good" onclick="saveStore()">Crear tienda</button>`)}function saveStore(){if(!stn.value)return alert('Nombre obligatorio');let sid=uid();db.stores.push({id:sid,name:stn.value,code:stc.value||'T'+sid,active:true});db.warehouses.push({id:uid(),storeId:sid,name:whn.value||'Almacén principal',code:'A'+sid,active:true});db.registers.push({id:uid(),storeId:sid,name:regn.value||'Caja 1',code:'C'+sid,active:true});closeModal();save();render()}
function modal(title,body,actions){document.getElementById('modalHost')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="modalHost"><div class="modalbox"><div class="section-title"><h3>${esc(title)}</h3><button class="iconbtn" onclick="closeModal()">×</button></div>${body}<div class="modalactions">${actions}<button class="btn alt" onclick="closeModal()">Cancelar</button></div></div></div>`)}function closeModal(){document.getElementById('modalHost')?.remove()}
function resetDemo(){if(confirm('Esto borrará los datos locales de SmartTuClick y volverá a la demo inicial.')){localStorage.removeItem(KEY);db=clone(seed);session=null;localStorage.removeItem(SESSION_KEY);view='dashboard';render()}}
function editUser(id){
  let u=db.users.find(x=>x.id===id);
  if(!u)return;

  modal('Modificar usuario',`
    <div class="formgrid">
      <input id="un" class="input" value="${esc(u.name)}" placeholder="Nombre">
      <input id="uu" class="input" value="${esc(u.user)}" placeholder="Usuario">
      <input id="up" class="input" type="password" placeholder="Nueva contraseña (opcional)">
      <select id="ur" class="input">
        ${Object.keys(db.roles).map(r=>`<option value="${esc(r)}" ${u.role===r?'selected':''}>${esc(r)}</option>`).join('')}
      </select>
      <select id="ua" class="input">
        <option value="1" ${u.active?'selected':''}>Activo</option>
        <option value="0" ${!u.active?'selected':''}>Inactivo</option>
      </select>
    </div>
  `,`
    <button class="btn good" onclick="updateUser(${id})">Guardar cambios</button>
  `);
}

function updateUser(id){
  let u=db.users.find(x=>x.id===id);
  if(!u)return;

  let name=document.getElementById('un').value.trim();
  let user=document.getElementById('uu').value.trim();
  let pass=document.getElementById('up').value.trim();

  if(!name||!user)return alert('Completa los datos');

  if(db.users.some(x=>x.id!==id&&x.user.toLowerCase()===user.toLowerCase()))
    return alert('Ese usuario ya existe.');

  u.name=name;
  u.user=user;

  if(pass)u.password=pass;

  u.role=document.getElementById('ur').value;
  u.active=document.getElementById('ua').value==='1';

  if(u.id===session.id)session=u;

  audit('MODIFICAR','USUARIO',u.user);

  closeModal();
  save();
  render();
}

function toggleUser(id){
  let u=db.users.find(x=>x.id===id);
  if(!u)return;

  if(u.id===session.id)
    return alert('No puedes desactivar tu propio usuario.');

  if(!confirm(`¿${u.active?'Desactivar':'Activar'} al usuario "${u.user}"?`))
    return;

  u.active=!u.active;

  audit(u.active?'ACTIVAR':'DESACTIVAR','USUARIO',u.user);

  save();
  render();
}
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});save();render();
