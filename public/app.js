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
 sales:[],purchases:[],movements:[],transfers:[],cash:{open:false,opening:0,expected:0,openedAt:null,userId:1,registerId:1,closed:[],movements:[],paymentTotals:{Efectivo:0,Yape:0,Plin:0,Izipay:0,Tarjeta:0,Transferencia:0}},cart:[],held:[],quotes:[],documents:[],pointsLedger:[],settings:{strictStock:true,pointsPerSol:1,printer:'browser',currency:'PEN',printHeader:'',printTop:'',printBottom:'',printFarewell:'Gracias por su preferencia.',printHeaderOn:true,printTopOn:true,printBottomOn:true,printFarewellOn:true,printLogo:''},seq:{sale:1,purchase:1,move:1,transfer:1,quote:1,document:1,boleta:1,factura:1,quickMove:1},priceLists:[{id:1,name:'Público',code:'PUB',default:true}],audit:[]
};
function migrate(old){const d=clone(seed);if(!old)return d;Object.assign(d,old);d.version=11; if(!d.activeStoreId)d.activeStoreId=d.stores?.[0]?.id||1;
 if(!d.stores)d.stores=[{id:1,name:old.store?.name||'Tienda Principal',code:'T001',active:true}];
 if(!d.warehouses)d.warehouses=[{id:1,storeId:d.stores[0].id,name:'Almacén Principal',code:'A001',active:true}];
 if(!d.registers)d.registers=[{id:1,storeId:d.stores[0].id,name:'Caja 1',code:'C001',active:true}];
 if(!d.suppliers)d.suppliers=[]; if(!d.cash)d.cash=clone(seed.cash); if(!d.cash.paymentTotals)d.cash.paymentTotals={Efectivo:0,Yape:0,Plin:0,Izipay:0,Tarjeta:0,Transferencia:0};if(!d.cashByStore)d.cashByStore={};
for(const store of d.stores){
  if(!d.cashByStore[store.id]){
    d.cashByStore[store.id]={
      open:false,
      opening:0,
      expected:0,
      openedAt:null,
      userId:null,
      registerId:null,
      closed:[],
      movements:[],
      paymentTotals:{
        Efectivo:0,
        Yape:0,
        Plin:0,
        Izipay:0,
        Tarjeta:0,
        Transferencia:0
      }
    };
  }
  
const legacyCash=d.cash;
if(legacyCash?.open){
  const register=d.registers.find(r=>r.id===Number(legacyCash.registerId));
  const storeId=register?.storeId||d.activeStoreId||d.stores[0]?.id;
  const target=d.cashByStore[storeId];

  const targetIsEmpty=
    !target.open&&
    target.movements.length===0&&
    target.closed.length===0;

  if(targetIsEmpty){
    d.cashByStore[storeId]=clone(legacyCash);
  }
}

} if(!d.priceLists)d.priceLists=[{id:1,name:'Público',code:'PUB',default:true}]; if(!d.audit)d.audit=[]; if(!d.transfers)d.transfers=[]; if(!d.held)d.held=[]; if(!d.quotes)d.quotes=[]; if(!d.documents)d.documents=[]; if(!d.pointsLedger)d.pointsLedger=[]; if(!d.seq.quickMove)d.seq.quickMove=1;
 d.products=(d.products||[]).map(p=>({...p,unit:p.unit||'UND',brand:p.brand||''}));d.clients=(d.clients||[]).map(c=>({...c,points:c.points||0,docType:c.docType||'DNI'}));
 return d;
}

function warehouseForStore(storeId = currentStore()?.id) {
  return (db.warehouses || []).find(
    w => String(w.storeId) === String(storeId) && w.active !== false
  ) || (db.warehouses || []).find(
    w => String(w.storeId) === String(storeId)
  ) || null;
}

function stockOf(p, storeId = currentStore()?.id, warehouseId = null) {
  if (!p) return 0;

  const warehouse = warehouseId != null
    ? (db.warehouses || []).find(w => String(w.id) === String(warehouseId))
    : warehouseForStore(storeId);

  if (p.warehouseStocks && warehouse) {
    return Number(p.warehouseStocks[warehouse.id] ?? 0);
  }

  if (p.storeStocks && storeId != null) {
    return Number(p.storeStocks[storeId] ?? 0);
  }

  return Number(p.stock || 0);
}

function setStock(p, n, storeId = currentStore()?.id, warehouseId = null) {
  if (!p) return;

  const warehouse = warehouseId != null
    ? (db.warehouses || []).find(w => String(w.id) === String(warehouseId))
    : warehouseForStore(storeId);

  if (!warehouse) {
    if (!p.storeStocks) p.storeStocks = {};
    p.storeStocks[storeId] = Number(n);
    p.stock = Object.values(p.storeStocks).reduce(
      (a, v) => a + Number(v || 0), 0
    );
    return;
  }

  if (!p.warehouseStocks) p.warehouseStocks = {};
  p.warehouseStocks[warehouse.id] = Number(n);

  if (!p.storeStocks) p.storeStocks = {};

  for (const store of db.stores || []) {
    const total = (db.warehouses || [])
      .filter(w => String(w.storeId) === String(store.id))
      .reduce(
        (sum, w) => sum + Number(p.warehouseStocks[w.id] || 0),
        0
      );

    p.storeStocks[store.id] = total;
  }

  p.stock = Object.values(p.warehouseStocks).reduce(
    (a, v) => a + Number(v || 0), 0
  );
}

function ensureStocks() {
  for (const p of db.products || []) {
    if (!p.storeStocks) p.storeStocks = {};

    if (!p.warehouseStocks) {
      p.warehouseStocks = {};

      for (const store of db.stores || []) {
        const warehouse = warehouseForStore(store.id);

        if (warehouse) {
          const oldStock = p.storeStocks[store.id];

          p.warehouseStocks[warehouse.id] = Number(
            oldStock ?? (store.id === db.stores[0]?.id ? p.stock || 0 : 0)
          );
        }
      }
    }

    for (const warehouse of db.warehouses || []) {
      if (p.warehouseStocks[warehouse.id] == null) {
        p.warehouseStocks[warehouse.id] = 0;
      }
    }

    for (const store of db.stores || []) {
      p.storeStocks[store.id] = (db.warehouses || [])
        .filter(w => String(w.storeId) === String(store.id))
        .reduce(
          (sum, w) => sum + Number(p.warehouseStocks[w.id] || 0),
          0
        );
    }

    p.stock = Object.values(p.warehouseStocks).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );
  }
}

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

  if (
    view === 'dashboard' ||
    view === 'sales' ||
    view === 'inventory' ||
    view === 'reports'
  ) {
    render();
  }
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

function can(v){
  const p=db.roles?.[session.role]||[];

  if(!(p.includes('*')||p.includes(v)))return false;

  if(session.role==='Cajero'&&cashLocked.includes(v)&&!currentCash().open){
    return false;
  }

  return true;
}

function go(v){
  if(!can(v)){
    if(session.role==='Cajero'&&!currentCash().open&&cashLocked.includes(v)){
      return alert('Caja cerrada. Debes aperturar la caja de esta tienda antes de ingresar a este módulo.');
    }

    return alert('Tu rol no tiene permiso para este módulo.');
  }

  view=v;
  render();
}

function navGroups(){const groups={sales:[],management:[],reports:[],admin:[]};nav.forEach(x=>{if(x[0]!=='dashboard'&&can(x[0]))groups[x[2]].push(x)});return `<div class="nav-home"><button class="nav-item ${view==='dashboard'?'active':''}" onclick="go('dashboard')"><span>⌂</span> Inicio</button></div>${[['sales','Ventas'],['management','Gestión'],['reports','Reportes'],['admin','Administración']].map(([g,t])=>groups[g].length?`<div class="nav-group"><div class="nav-label">${t}</div>${groups[g].map(([k,txt])=>`<button class="nav-item ${view===k?'active':''}" onclick="go('${k}')"><span>${({pos:'▣',cash:'$',quotes:'▤',clients:'♙',products:'▦',inventory:'↕',purchases:'▧',transfers:'⇄',sales:'▤',reports:'◔',users:'♟',settings:'⚙'}[k]||'•')}</span>${txt}</button>`).join('')}</div>`:'').join('')}`}
function closeMobileMenu(){document.body.classList.remove('menu-open')}
function render(){const root=document.getElementById('app');if(!session){root.innerHTML=loginPage();return}const title=nav.find(x=>x[0]===view)?.[1]||'SmartTuClick';root.innerHTML=`<div class="shell"><div class="mobile-backdrop" onclick="closeMobileMenu()"></div><aside class="side"><div class="brand"><span class="brandmark">S</span><span>SmartTuClick</span><button class="mobile-close" onclick="closeMobileMenu()">×</button></div><div class="userbox"><b>${esc(session.name)}</b><span>${esc(session.role)} · ${esc(session.user)}</span></div><div class="nav">${navGroups()}</div><div class="sidefoot">v1.1 · LIVE<br><span>Backend: Render + Neon</span></div></aside><main class="main"><header class="appbar"><button class="menu-toggle" onclick="document.body.classList.add('menu-open')">☰</button><div class="appbar-title"><strong>${esc(title)}</strong><span>${esc(currentStore().name)}</span></div><div class="appbar-actions"><select class="input storeSelect" onchange="switchStore(this.value)">${db.stores.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===currentStore().id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><span class="pill ${currentCash().open?'open':'closed'}">${currentCash().open?'● Caja abierta':'● Caja cerrada'}</span><span class="pill live-pill">● EN VIVO</span><button class="btn alt logout-btn" onclick="logout()">Salir</button></div></header><div class="page-head"><div><h1>${esc(title)}</h1><div class="muted">${esc(db.company.name)}</div></div></div>${pages[view]?.()||pages.dashboard()}</main></div>`;if(view==='pos')setTimeout(toggleCashReceived,0)}
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
  if(currentCash().open){
    return alert('Cierra la caja de la tienda activa antes de salir.');
  }

  try{stcEventSource?.close()}catch{}
  stcEventSource=null;
  stcReady=false;
  stcToken='';

  localStorage.removeItem('smarttuclick_api_token');
  localStorage.removeItem(SESSION_KEY);
  session=null;
  render();
}

function currentStore(){return db.stores.find(s=>s.id===db.activeStoreId)||db.stores[0]}
function currentCash(){
  const id=currentStore().id;
  if(!db.cashByStore)db.cashByStore={};
  if(!db.cashByStore[id]){
    db.cashByStore[id]={
      open:false,
      opening:0,
      expected:0,
      openedAt:null,
      userId:null,
      registerId:null,
      closed:[],
      movements:[],
      paymentTotals:{
        Efectivo:0,
        Yape:0,
        Plin:0,
        Izipay:0,
        Tarjeta:0,
        Transferencia:0
      }
    };
  }
  return db.cashByStore[id];
}

function allCashClosures(){
  return Object.values(db.cashByStore||{})
    .flatMap(cash=>cash.closed||[])
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
}

function switchStore(id){
  const nextStoreId=Number(id);

  if(!db.stores.some(s=>s.id===nextStoreId&&s.active)){
    return alert('La tienda seleccionada no existe o está inactiva.');
  }

  if(currentCash().open){
    return alert('Cierra la caja de la tienda actual antes de cambiar de tienda.');
  }

  db.activeStoreId=nextStoreId;
  save();
  render();
}

function dashboard(){const cash=currentCash();let sales=db.sales.filter(x=>
  x.date.slice(0,10)===today()&&
  x.status!=='ANULADA'&&
  x.storeId===currentStore().id
),total=sales.reduce((a,x)=>a+x.total,0),stock=db.products.filter(p=>p.active&&stockOf(p)<=p.min),pending=db.transfers.filter(t=>t.status==='PENDIENTE').length;let quick=[];if(can('pos'))quick.push(`<button class="quick-card primary" onclick="go('pos')"><span>▣</span><b>Nueva venta</b><small>Abrir punto de venta</small></button>`);if(can('cash'))quick.push(`<button class="quick-card ${cash.open?'good':'warn'}" onclick="go('cash')"><span>$</span><b>${cash.open?'Caja abierta':'Aperturar caja'}</b><small>${cash.open?money(cash.expected):'Registrar fondo inicial'}</small></button>`);if(can('products'))quick.push(`<button class="quick-card" onclick="go('products')"><span>▦</span><b>Productos</b><small>Catálogo e inventario</small></button>`);if(can('sales'))quick.push(`<button class="quick-card" onclick="go('sales')"><span>▤</span><b>Ventas</b><small>Consultar comprobantes</small></button>`);
const branchPanel = session.role === 'Administrador'
  ? `<div class="card branch-hub">
      <div class="section-title">
        <div>
          <b style="font-size:18px">Tus sucursales</b>
          <div class="muted">Selecciona una sucursal para operar su caja y ventas.</div>
        </div>
        <span class="tag">${db.stores.filter(s=>s.active).length} activas</span>
      </div>
      <div class="branch-grid">
        ${db.stores.filter(s=>s.active).map(st=>{
          const c = db.cashByStore?.[st.id];
          return `<button class="branch-card ${st.id===currentStore().id?'selected':''}"
            onclick="switchStore('${st.id}')">
            <span class="branch-icon">⌂</span>
            <span class="branch-info"><b>${esc(st.name)}</b></span>
            <span class="branch-status ${c?.open?'is-open':'is-closed'}">
              ${c?.open?'Caja abierta':'Caja cerrada'}
            </span>
            <span class="branch-arrow">
              ${st.id===currentStore().id?'Estás aquí':'Entrar →'}
            </span>
          </button>`;
        }).join('')}
      </div>
    </div>
    <style>
      .branch-hub{margin:18px 0}
      .branch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:14px}
      .branch-card{display:grid;grid-template-columns:42px 1fr;gap:8px 12px;align-items:center;text-align:left;background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:15px;cursor:pointer;transition:.15s}
      .branch-card:hover{border-color:#3b82f6;box-shadow:0 6px 18px #1d4ed812;transform:translateY(-1px)}
      .branch-card.selected{border-color:#2563eb;background:#eff6ff}
      .branch-icon{grid-row:span 2;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#dbeafe;color:#1d4ed8;font-size:24px}
      .branch-info{display:flex;flex-direction:column;gap:4px}
      .branch-status{font-size:11px;font-weight:700}
      .branch-status.is-open{color:#15803d}
      .branch-status.is-closed{color:#b45309}
      .branch-arrow{grid-column:2;font-size:12px;color:#2563eb;font-weight:700}
      @media(max-width:600px){.branch-grid{grid-template-columns:1fr}.branch-card{padding:12px}}
    </style>`
  : '';
return `<div class="welcome"><div><div class="eyebrow">${cash.open?'● OPERACIÓN ACTIVA':'● CAJA CERRADA'}</div><h2>Hola, ${esc(session.name.split(' ')[0])}</h2><p>${cash.open?'Todo listo para trabajar.':'Puedes revisar el sistema. Para vender, primero apertura la caja.'}</p></div>${cash.open?`<button class="btn good" onclick="go('pos')">Ir a vender</button>`:can('cash')?`<button class="btn warn" onclick="go('cash')">Aperturar caja</button>`:''}</div>${branchPanel}<div class="quick-grid">${quick.join('')}</div><div class="dashboard-grid"><div class="card"><div class="section-title"><b>Resumen de hoy</b><span class="tag">${sales.length} ventas</span></div><div class="summary-list"><div><span>Ventas</span><strong>${money(total)}</strong></div><div><span>Productos</span><strong>${db.products.length}</strong></div><div><span>Stock bajo</span><strong class="${stock.length?'danger':'success'}">${stock.length}</strong></div><div><span>Transferencias pendientes</span><strong>${pending}</strong></div></div></div><div class="card"><div class="section-title"><b>Últimas ventas</b>${can('sales')?`<button class="btn alt" onclick="go('sales')">Ver todas</button>`:''}</div>${db.sales.slice(-5).reverse().map(s=>`<div class="listrow"><div><b>${esc(s.doc)}</b><div class="muted">${esc(s.client)}</div></div><strong>${money(s.total)}</strong></div>`).join('')||'<div class="empty">Aún no hay ventas.</div>'}</div></div>`}
const pages={dashboard:dashboard,
pos:()=>{let subtotal=cartTotal();return `<div class="pos"><div><div class="toolbar"><input id="posSearch" class="input grow" autofocus placeholder="🔎 Nombre, SKU o código de barras · F2 lector" onkeydown="if(event.key==='Enter')scan(this.value)" oninput="posFilter(this.value)"><button class="btn alt" onclick="clearCart()">Vaciar</button><button class="btn alt" onclick="holdSale()">Guardar</button><button class="btn alt" onclick="heldSales()">En espera (${db.held.length})</button></div><div id="posProducts" class="products">${posProducts()}</div></div><div class="card cart"><div class="section-title"><b>Venta actual</b><span class="tag">${db.cart.length} líneas</span></div><div id="cartList">${cartHtml()}</div><hr><div class="row"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="clientLookupBox"><div class="clientLookupHead"><span>Cliente</span><button class="btn alt smallBtn" type="button" onclick="clientFormForSale()">+ Añadir cliente</button></div><div class="clientLookup"><select id="saleDocSearchType" class="input docTypeMini" onchange="lookupSaleClient()"><option>DNI</option><option>RUC</option><option>CE</option></select><input id="saleClientDoc" class="input" inputmode="numeric" placeholder="DNI o RUC del cliente" oninput="lookupSaleClient()"><button class="btn alt" type="button" onclick="lookupSaleClient(true)">Buscar</button></div><div id="saleClientResult" class="clientResult">Cliente General · 00000000</div><input type="hidden" id="saleClient" value="${db.clients[0]?.id||''}"></div><div class="row"><span>Documento</span><select id="saleDocType" class="input" onchange="syncSaleDocClient()"><option value="NOTA_VENTA">Nota de venta</option><option value="BOLETA">Boleta (prototipo)</option><option value="FACTURA">Factura (prototipo)</option></select></div><div class="row"><span>Pago</span><div style="display:flex;gap:8px;width:100%"><select id="salePayment" class="input" onchange="toggleCashReceived()"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Izipay</option><option>Tarjeta</option><option>Transferencia</option></select><button class="btn alt" type="button" onclick="openMultiPayment()">Generar pago</button></div></div><div id="cashReceivedRow" class="row"><span>Recibido</span><input id="cashReceived" class="input small" type="number" min="0" step="0.01" placeholder="S/"></div><div class="totalbar"><span>Total</span><span class="total">${money(subtotal)} </span></div><button class="btn good full" onclick="finishSale()">Cobrar y emitir venta</button></div></div>`},
cash:()=>{const cash=currentCash();return `<div class="grid"><div class="card"><b>Turno de caja</b><div class="kpi">${cash.open?'ABIERTA':'CERRADA'}</div>${cash.open?`<p class="muted">Abierta ${new Date(cash.openedAt).toLocaleString()} · ${esc(session.name)}</p><p>Esperado efectivo: <b>${money(cash.expected)}</b></p><button class="btn warn" onclick="closeCash()">Cerrar caja</button>`:`<p class="muted">Selecciona caja y monto inicial.</p><select id="cashRegister" class="input">${db.registers.filter(r=>r.active&&r.storeId===currentStore().id).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><input id="opening" class="input" type="number" placeholder="Monto inicial"><button class="btn good" onclick="openCash()">Abrir caja</button>`}</div><div class="card"><b>Movimientos del turno</b><table class="table"><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Monto</th></tr>${(cash.movements||[]).slice(-30).reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleTimeString()}</td><td>${x.type}</td><td>${esc(x.detail)}</td><td>${money(x.amount)}</td></tr>`).join('')||empty(4)}</table></div></div>${session.role!=='Cajero'?`<div class="section card"><div class="section-title"><b>Administración · Ventas por día y cierre de caja</b><span class="tag">${allCashClosures().length} cierres</span></div><p class="muted">El importe de ventas no incluye el fondo inicial. Haz clic en <b>Ver ventas</b> para revisar el total y los medios de pago.</p><table class="table"><tr><th>Día</th><th>Cierre</th><th>Caja</th><th>Usuario</th><th>Ventas</th><th>Diferencia de caja</th><th></th></tr>${allCashClosures().slice(0,30).map(x=>`<tr><td>${new Date(x.date).toLocaleDateString()}</td><td>${new Date(x.date).toLocaleTimeString()}</td><td>${esc(x.register)}</td><td>${esc(x.user)}</td><td><button class="btn good smallBtn" onclick="viewCashClose(${x.id})">Ver ventas · ${money(Number(x.salesTotal||0))}</button></td><td class="${Number(x.difference||0)?'danger':'success'}">${money(Number(x.difference||0))}</td><td><button class="btn alt smallBtn" onclick="viewCashClose(${x.id})">Ver detalle</button></td></tr>`).join('')||empty(7)}</table></div>`:''}`},
products:()=>`<div class="toolbar"><button class="btn good" onclick="productForm()">+ Nuevo producto</button><button class="btn alt" onclick="downloadProductTemplate()">📄 Descargar plantilla</button><button class="btn alt" onclick="importProductsExcel()">📥 Importar Excel</button><button class="btn alt" onclick="exportProductsExcel()">📤 Exportar Excel</button><button class="btn quickIn" onclick="quickStockMove()">↓ Ingreso rápido</button><button class="btn quickOut" onclick="quickStockMove()">↑ Salida rápida</button><input id="productSearch" class="input grow" placeholder="Buscar producto/SKU/código" oninput="productSearch(this.value)"><select id="catFilter" class="input" onchange="productSearch(document.getElementById('productSearch')?.value||'')"><option value="">Todas las categorías</option>${[...new Set(db.products.map(p=>p.category))].map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="card"><table class="table"><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr><tbody id="productRows">${productRows()}</tbody></table></div>`,
inventory:()=>`<div class="grid"><div class="card"><span>Inventario valorizado</span><div class="kpi">${money(db.products.reduce((a,p)=>a+stockOf(p)*p.cost,0))}</div></div><div class="card"><span>Movimientos</span><div class="kpi">${db.movements.filter(m=>m.storeId===currentStore().id).length}</div></div><div class="card"><span>Stock crítico</span><div class="kpi danger">${db.products.filter(p=>stockOf(p)<=p.min).length}</div></div><div class="card"><span>Unidades</span><div class="kpi">${db.products.reduce((a,p)=>a+stockOf(p),0)}</div></div></div><div class="toolbar section"><input class="input grow" id="kardexSearch" placeholder="Filtrar Kardex" oninput="kardexFilter(this.value)"><button class="btn alt" onclick="adjustStockForm()">Ajuste de inventario</button></div><div class="card"><table class="table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Antes</th><th>Cant.</th><th>Después</th><th>Motivo</th><th>Ref.</th></tr></thead><tbody id="kardexRows">${kardexRows()}</tbody></table></div>`,
purchases:()=>`<div class="toolbar"><button class="btn good" onclick="purchaseForm()">+ Registrar compra</button><button class="btn alt" onclick="supplierForm()">+ Proveedor</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Proveedor</th><th>Documento</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th></tr>${db.purchases.slice().reverse().map(p=>`<tr><td>${new Date(p.date).toLocaleDateString()}</td><td>${esc(p.supplier)}</td><td>${esc(p.doc)}</td><td>${esc(p.product)}</td><td>${p.qty}</td><td>${money(p.total)}</td><td>${p.status}</td></tr>`).join('')||empty(7)}</table></div>`,
transfers:()=>`<div class="toolbar"><button class="btn good" onclick="transferForm()">+ Nueva transferencia</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Origen</th><th>Destino</th><th>Producto</th><th>Cant.</th><th>Estado</th><th></th></tr>${db.transfers.slice().reverse().map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${esc(t.product)}</td><td>${t.qty}</td><td><span class="tag">${t.status}</span></td><td>${t.status==='PENDIENTE'?`<button class="btn good" onclick="receiveTransfer(${t.id})">Recibir</button>`:''}</td></tr>`).join('')||empty(7)}</table></div><div class="notice">🟡 <b>Integración backend pendiente:</b> esta versión ejecuta las transferencias en local. Multi-almacén remoto requiere API + base de datos.</div>`,
quotes:()=>`<div class="toolbar"><button class="btn good" onclick="quoteForm()">+ Nueva cotización</button></div><div class="card"><table class="table"><tr><th>Fecha</th><th>Cotización</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr>${quoteRows()}</table></div><div class="notice">🟡 Cotizaciones son documentos internos de demostración.\</div>`,
clients:()=>`<div class="toolbar"><button class="btn good" onclick="clientForm()">+ Nuevo cliente</button><input class="input grow" placeholder="Buscar cliente/DNI/RUC" oninput="clientSearch(this.value)"></div><div class="card"><table class="table"><tbody id="clientRows"><tr><th>Documento</th><th>Cliente</th><th>Teléfono</th><th>Puntos</th><th></th></tr>${clientRows()}</tbody></table></div>`,
users:()=>`<div class="toolbar"><button class="btn good" onclick="userForm()">+ Nuevo usuario</button></div><div class="card"><table class="table"><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Permisos</th><th>Acciones</th></tr>${db.users.map(u=>`<tr><td>${esc(u.user)}</td><td>${esc(u.name)}</td><td><span class="tag">${esc(u.role)}</span></td><td>${u.active?'Activo':'Inactivo'}</td><td>${(db.roles[u.role]||[]).includes('*')?'Todos':(db.roles[u.role]||[]).length+' módulos'}</td><td><button class="btn alt" onclick="editUser(${u.id})">Editar</button> <button class="btn ${u.active?'warn':'good'}" onclick="toggleUser(${u.id})">${u.active?'Desactivar':'Activar'}</button></td></tr>`).join('')}</table></div>`,
sales:()=>`<div class="toolbar"><input class="input grow" id="salesSearch" placeholder="Buscar comprobante/cliente" oninput="salesFilter(this.value)"><button class="btn alt" onclick="exportCSV()">Exportar CSV</button></div><div class="card"><table class="table"><tbody id="salesRows"><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>${salesRows()}</tbody></table></div>`,
reports:()=>{let total=db.sales.filter(s=>s.status!=='ANULADA').reduce((a,s)=>a+s.total,0),units=db.sales.reduce((a,s)=>a+s.items.reduce((b,i)=>b+i.qty,0),0),buy=db.purchases.reduce((a,p)=>a+p.total,0),margin=db.sales.filter(s=>s.status!=='ANULADA').reduce((a,s)=>a+s.items.reduce((b,i)=>b+(i.price-i.cost)*i.qty,0),0);return `<div class="grid"><div class="card">Ventas<div class="kpi">${money(total)}</div></div><div class="card">Unidades<div class="kpi">${units}</div></div><div class="card">Compras<div class="kpi">${money(buy)}</div></div><div class="card">Margen estimado<div class="kpi">${money(margin)}</div></div></div><div class="grid section"><div class="card span2"><b>Ventas por medio de pago</b>${['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'].map(m=>{let n=db.sales.filter(s=>s.payment===m&&s.status!=='ANULADA').reduce((a,s)=>a+s.total,0);return `<div class="listrow"><span>${m}</span><b>${money(n)}</b></div>`}).join('')}</div><div class="card"><b>Productos bajo mínimo</b>${db.products.filter(p=>stockOf(p)<=p.min).map(p=>`<div class="listrow"><span>${esc(p.name)}</span><b>${stockOf(p)}</b></div>`).join('')||'<div class="empty">Sin alertas.</div>'}</div></div><div class="section card"><b>Reportes preparados</b><p class="muted">Ventas por fecha/producto/cliente/usuario, compras, caja, Kardex, stock, utilidad y puntos. Exportación CSV funciona en esta demo; Excel/PDF quedan como adaptadores.</p></div>`},
settings:()=>`<div class="grid"><div class="card"><h3>Empresa</h3><div class="formgrid"><input id="companyName" class="input" value="${esc(db.company.name)}" placeholder="Razón social"><input id="companyRuc" class="input" value="${esc(db.company.ruc)}" placeholder="RUC"><input id="igv" class="input" type="number" value="${db.company.igv*100}" placeholder="IGV %"><input id="storeName" class="input" value="${esc(currentStore().name)}" placeholder="Tienda"></div><button class="btn" onclick="saveSettings()">Guardar</button></div><div class="card print-config-card"><h3>Datos de Plantillas de Impresión</h3><p class="muted">Configura los mensajes y revisa el comprobante en tiempo real, como en SmartClic.</p><div class="print-config-layout"><div class="print-editor"><details class="print-accordion" open><summary>Mensaje de Cabecera</summary><div class="print-editor-body"><label>Texto de cabecera</label><textarea id="printHeader" class="input" placeholder="Ej. BIENVENIDO A VENDIX">${esc(db.settings.printHeader||'')}</textarea><label class="print-switch"><input type="checkbox" id="printHeaderOn" ${db.settings.printHeaderOn!==false?'checked':''}> ACTIVAR</label></div></details><details class="print-accordion"><summary>Mensaje Superior</summary><div class="print-editor-body"><label>Texto superior</label><textarea id="printTop" class="input" placeholder="Texto debajo de los datos del comprobante">${esc(db.settings.printTop||'')}</textarea><label class="print-switch"><input type="checkbox" id="printTopOn" ${db.settings.printTopOn!==false?'checked':''}> ACTIVAR</label></div></details><details class="print-accordion"><summary>Mensaje Inferior</summary><div class="print-editor-body"><label>Texto inferior</label><textarea id="printBottom" class="input" placeholder="Ej. Cuentas bancarias o información adicional">${esc(db.settings.printBottom||'')}</textarea><label class="print-switch"><input type="checkbox" id="printBottomOn" ${db.settings.printBottomOn!==false?'checked':''}> ACTIVAR</label></div></details><details class="print-accordion"><summary>Mensaje de Despedida</summary><div class="print-editor-body"><label>Texto de despedida</label><textarea id="printFarewell" class="input" placeholder="Ej. Gracias por su preferencia">${esc(db.settings.printFarewell||'Gracias por su preferencia.')}</textarea><label class="print-switch"><input type="checkbox" id="printFarewellOn" ${db.settings.printFarewellOn!==false?'checked':''}> ACTIVAR</label></div></details><div class="print-logo-settings"><b>Logotipo de la empresa</b><p class="muted">Sube el logo que aparecerá en el comprobante.</p><input id="printLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="input" onchange="loadPrintLogo(this)">${db.settings.printLogo?`<img src="${db.settings.printLogo}" alt="Logo actual" style="max-width:130px;max-height:70px;object-fit:contain;margin-top:8px"> <button class="btn alt" onclick="removePrintLogo()">Quitar logo</button>`:''}</div><button class="btn good" onclick="saveSettings()">Guardar configuración de impresión</button></div><div class="print-preview-wrap"><div class="print-preview-title">VISTA PREVIA DEL COMPROBANTE</div><div class="print-preview-paper"><div class="print-preview-brand">${db.settings.printLogo?`<img src="${db.settings.printLogo}" alt="Logo">`: '<div class="print-preview-logo-placeholder">LOGO</div>'}<div class="print-preview-doc"><small>RUC ${esc(db.company.ruc||'00000000000')}</small><b>COMPROBANTE</b><small>F001-000056</small></div></div><div class="print-preview-company"><b>${esc(db.company.name||'EMPRESA SIN REGISTRAR')}</b><br>${esc(currentStore().name||'DIRECCIÓN DE LA EMPRESA')}</div>${db.settings.printHeaderOn!==false&&db.settings.printHeader?`<div class="print-preview-message">${esc(db.settings.printHeader).replace(/\n/g,'<br>')}</div>`:''}${db.settings.printTopOn!==false&&db.settings.printTop?`<div class="print-preview-message">${esc(db.settings.printTop).replace(/\n/g,'<br>')}</div>`:''}<div class="print-preview-info"><div><b>CLIENTE:</b> CLIENTE VARIOS<br><b>DNI:</b> 00000000<br><b>DIRECCIÓN:</b></div><div><b>FECHA EMISIÓN:</b> 09/10/2026<br><b>MONEDA:</b> SOLES<br><b>FORMA DE PAGO:</b> CONTADO</div></div><table class="print-preview-table"><thead><tr><th>N°</th><th>CANT.</th><th>DESCRIPCIÓN</th><th>P. UNIT.</th><th>TOTAL</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>Producto de ejemplo</td><td>10.00</td><td>20.00</td></tr><tr><td>2</td><td>1</td><td>Otro producto</td><td>15.00</td><td>15.00</td></tr></tbody></table><div class="print-preview-total"><b>TOTAL: S/ 35.00</b></div>${db.settings.printBottomOn!==false&&db.settings.printBottom?`<div class="print-preview-message">${esc(db.settings.printBottom).replace(/\n/g,'<br>')}</div>`:''}${db.settings.printFarewellOn!==false&&db.settings.printFarewell?`<div class="print-preview-message">${esc(db.settings.printFarewell).replace(/\n/g,'<br>')}</div>`:''}<div class="print-preview-qr">QR / CÓDIGO DEL COMPROBANTE</div></div><p class="muted">Vista referencial. Los datos reales se colocan al imprimir una venta.</p></div></div><style>.print-config-card{grid-column:1/-1}.print-config-layout{display:grid;grid-template-columns:minmax(300px,1fr) minmax(320px,.95fr);gap:22px;align-items:start}.print-accordion{border-bottom:1px solid #d8dce5}.print-accordion summary{padding:15px 10px;cursor:pointer;font-weight:700;color:#263653;list-style:none}.print-accordion summary:after{content:'⌄';float:right;color:#2563eb}.print-accordion[open] summary:after{content:'⌃'}.print-editor-body{padding:8px 10px 16px}.print-editor-body textarea{min-height:80px;width:100%;margin:8px 0}.print-switch{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#26874a}.print-logo-settings{padding:16px 10px;border-bottom:1px solid #d8dce5}.print-preview-wrap{background:#f3f5f9;border:1px solid #dce1e9;border-radius:8px;padding:14px;position:sticky;top:12px}.print-preview-title{font-size:12px;font-weight:800;letter-spacing:.05em;color:#526079;margin-bottom:10px}.print-preview-paper{background:#fff;border:1px solid #d7dbe2;border-radius:5px;padding:14px;box-shadow:0 2px 8px #18243a12;font-size:9px;color:#20242b;min-height:490px}.print-preview-brand{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.print-preview-brand img{max-width:100px;max-height:55px;object-fit:contain}.print-preview-logo-placeholder{width:78px;height:40px;border:1px dashed #adb5c3;border-radius:4px;display:grid;place-items:center;color:#8992a2;font-size:10px}.print-preview-doc{border:2px solid #777;border-radius:9px;text-align:center;padding:6px;min-width:110px;display:flex;flex-direction:column;gap:3px}.print-preview-doc b{background:#e5e7eb;font-size:11px;padding:4px}.print-preview-company{font-size:10px;margin:8px 0 12px}.print-preview-message{border:1px solid #ed3345;border-radius:8px;padding:8px;text-align:center;font-weight:700;color:#d92335;margin:7px 0;overflow-wrap:anywhere}.print-preview-info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.print-preview-info>div{border:1px solid #777;border-radius:8px;padding:7px;line-height:1.5}.print-preview-table{width:100%;border-collapse:collapse;font-size:8px;margin:12px 0;table-layout:auto}.print-preview-table th,.print-preview-table td{border-bottom:1px solid #d7dbe2;padding:5px 2px;text-align:left}.print-preview-total{text-align:right;padding:10px 0;border-top:1px solid #777;font-size:12px}.print-preview-qr{margin:15px auto 0;border:1px dashed #aab1bf;width:120px;height:48px;display:grid;place-items:center;color:#6b7280;font-size:9px;text-align:center}@media(max-width:850px){.print-config-layout{grid-template-columns:1fr}.print-preview-wrap{position:static}.print-preview-paper{max-width:460px;margin:auto}}</style></div><div class="section card"><div class="section-title"><b>Tiendas, almacenes y cajas</b><button class="btn good" onclick="storeForm()">+ Nueva tienda</button></div><div class="store-cards">${db.stores.map(s=>`
  <div class="store-card">
    <div class="store-card-info">
      <div class="store-card-icon">⌂</div>
      <div>
        <strong>${esc(s.name)}</strong>
        <div class="store-card-status ${s.active?'active':'inactive'}">
          ${s.active?'Tienda activa':'Tienda inactiva'}
        </div>
        <div class="store-card-detail">
          Almacenes: ${db.warehouses.filter(w=>String(w.storeId)===String(s.id)).map(w=>esc(w.name)).join(', ')||'Sin almacenes'}
        </div>
      </div>
    </div>
    <div class="store-card-actions">
      <button class="btn" onclick="editStore('${s.id}')">Editar</button>
      <button class="btn" onclick="toggleStore('${s.id}')">${s.active?'Desactivar':'Activar'}</button>
      <button class="btn danger" onclick="deleteStore('${s.id}')">Eliminar</button>
    </div>
  </div>
`).join('')}</div></div>`};
function empty(n){return `<tr><td colspan="${n}" class="empty">Sin registros.</td></tr>`}
function cartTotal(){return db.cart.reduce((a,i)=>{let base=i.qty*i.price,d=Number(i.discount||0);let disc=i.discountType==='%'?base*d/100:d;return a+Math.max(0,base-disc)},0)}


function cartHtml(){
  if(!db.cart.length){
    return '<div class="empty">Agrega productos para iniciar la venta.</div>';
  }

  return db.cart.map(i=>{
    const base=Number(i.qty||0)*Number(i.price||0);
    const d=Number(i.discount||0);
    const desc=i.discountType==='%'?base*d/100:d;
    const total=Math.max(0,base-desc);

    return `<div class="listrow">
      <b>${esc(i.name)}</b>
      <div>${money(i.price)} c/u</div>
      <div>Cantidad: ${Number(i.qty||0)}</div>
      <b>${money(total)}</b>
    </div>`;
  }).join('');
}



function cartHtml(){
  if(!db.cart.length){
    return '<div class="empty">Agrega productos para iniciar la venta.</div>';
  }

  return db.cart.map(i=>{
    const base=Number(i.qty||0)*Number(i.price||0);
    const d=Number(i.discount||0);
    const desc=i.discountType==='%'?base*d/100:d;
    const total=Math.max(0,base-desc);

    return `<div class="listrow" style="padding:10px 0;border-bottom:1px solid #e5e7eb">
      <b>${esc(i.name)}</b>
      <div>${money(i.price)} c/u</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        <button class="btn alt smallBtn" onclick="changeCart(${i.id},-1)">−</button>
        <b>${Number(i.qty||0)}</b>
        <button class="btn alt smallBtn" onclick="changeCart(${i.id},1)">+</button>
      </div>
      <b>${money(total)}</b>
    </div>`;
  }).join('');
}

function posProducts(q=''){
  q=q.toLowerCase();

  return db.products
    .filter(p=>p.active&&(
      p.name.toLowerCase().includes(q)||
      p.sku.toLowerCase().includes(q)||
      String(p.barcode||'').includes(q)
    ))
    .map(p=>{
      const stock=stockOf(p,currentStore().id);
      const agotado=stock<=0;

      return `<div class="product ${agotado?'out-of-stock':''}" onclick="addCart(${p.id})">
      ${p.image ? `<img src="${p.image}" alt="${esc(p.name)}" style="width:100%;height:110px;object-fit:contain;margin-bottom:10px;border-radius:8px">` : ''}
        <div class="row">
          <b>${esc(p.name)}</b>
          <span class="tag">${esc(p.sku)}</span>
        </div>
        <div class="muted">${esc(p.brand||'Sin marca')} · ${esc(p.category||'General')}</div>
<div class="muted">Código de barras: ${esc(p.barcode||'No registrado')}</div>
<div class="price">${money(p.price)}</div>
        <div class="stock-status ${agotado?'stock-out':'stock-ok'}">
          ${agotado?'⛔ SIN STOCK':'✓ Stock: '+stock}
        </div>
        <button class="btn alt" onclick="event.stopPropagation();alert('Producto: ${esc(p.name).replace(/'/g,"\\'")}\\nCódigo: ${esc(p.sku).replace(/'/g,"\\'")}\\nCategoría: ${esc(p.category||'General')}\\nPrecio: ${money(p.price)}\\nStock: ${stock}')">ⓘ Información</button>
      </div>`;
    }).join('')||'<div class="empty">No hay productos.</div>';
}
function saveCartItem(id){let i=db.cart.find(x=>x.id===id);if(!i)return;let q=Number(document.getElementById('eiQty').value),price=Number(document.getElementById('eiPrice').value),disc=Number(document.getElementById('eiDisc').value||0),priceType=document.getElementById('eiPriceType').value;if(priceType==='Bonificación')price=0;if(q<=0||price<0||disc<0)return alert('Datos inválidos');i.qty=q;i.price=price;i.name=document.getElementById('eiName').value.trim()||i.name;i.discount=priceType==='Bonificación'?0:disc;i.discountType=document.getElementById('eiDiscType').value;i.priceType=priceType;i.igvType=document.getElementById('eiIgv').value.split(' ')[0];i.igvDesc=document.getElementById('eiIgvDesc').value;closeModal();save();render()}
function posFilter(q){document.getElementById('posProducts').innerHTML=posProducts(q)}
function focusBarcode(){if(!session)return;if(!can('pos'))return;if(!currentCash().open){alert('Caja cerrada. Debes aperturar la caja antes de usar el lector.');return}if(view!=='pos'){view='pos';render();setTimeout(focusBarcode,80);return}const el=document.getElementById('posSearch');if(el){el.focus();el.select();el.placeholder='Lector listo · escanea el código';}}
function scan(q){q=q.trim();if(!q)return;let p=db.products.find(x=>String(x.barcode)===q||String(x.sku)===q);if(p){addCart(p.id);setTimeout(focusBarcode,30);return}alert('No existe producto con ese SKU/código.');setTimeout(focusBarcode,30)}
function addCart(id){let p=db.products.find(x=>x.id===id);if(!p)return;let i=db.cart.find(x=>x.id===id);if(i){if(db.settings.strictStock&&i.qty>=stockOf(p,currentStore().id))return alert('Stock insuficiente');i.qty++}else{if(db.settings.strictStock&&stockOf(p,currentStore().id)<1)return alert('Sin stock');db.cart.push({id:p.id,name:p.name,price:p.price,cost:p.cost,qty:1})}save();render()}
function changeCart(id,d){
  let i=db.cart.find(x=>x.id===id);
  if(!i)return;

  let p=db.products.find(x=>x.id===id);
  if(!p)return;

  const sid=currentStore().id;

  if(d>0&&db.settings.strictStock&&i.qty>=stockOf(p,sid))
    return alert('Stock insuficiente');

  i.qty+=d;

  if(i.qty<=0)db.cart=db.cart.filter(x=>x.id!==id);

  save();
  render();
}function lookupSaleClient(showAlert=false){const doc=(document.getElementById('saleClientDoc')?.value||'').trim();const type=document.getElementById('saleDocSearchType')?.value||'DNI';const result=document.getElementById('saleClientResult');if(!doc){const c=db.clients[0];if(result)result.innerHTML=`Cliente General · ${esc(c?.doc||'00000000')}`;if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c?.id||'';return c}const c=db.clients.find(x=>x.doc===doc&&x.docType===type)||db.clients.find(x=>x.doc===doc);if(c){if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c.id;if(result)result.innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.docType)} ${esc(c.doc)}`;return c}if(result)result.innerHTML=`<span class="notFound">No encontrado.</span> <button type="button" class="linkBtn" onclick="clientFormForSale()">Añadir cliente</button>`;if(showAlert)clientFormForSale(type,doc);return null}
function syncSaleDocClient(){const type=document.getElementById('saleDocType')?.value;if(type==='FACTURA'){const sel=document.getElementById('saleDocSearchType');if(sel)sel.value='RUC';}else if(type==='BOLETA'){const sel=document.getElementById('saleDocSearchType');if(sel)sel.value='DNI';}lookupSaleClient()}
function clientFormForSale(docType='DNI',doc=''){modal('Añadir cliente',`<div class="formgrid"><select id="cdt" class="input"><option ${docType==='DNI'?'selected':''}>DNI</option><option ${docType==='RUC'?'selected':''}>RUC</option><option ${docType==='CE'?'selected':''}>CE</option></select><input id="cd" class="input" value="${esc(doc)}" placeholder="DNI / RUC"><input id="cn" class="input" placeholder="Nombre"><input id="caName" class="input" placeholder="Apellido"><input id="ct" class="input" placeholder="Teléfono"></div><p class="muted">El cliente quedará seleccionado automáticamente para esta venta.</p>`,`<button class="btn good" onclick="saveClientForSale()">Guardar y seleccionar</button>`)}
function saveClientForSale(){const type=document.getElementById('cdt')?.value||'DNI',doc=(document.getElementById('cd')?.value||'').trim(),name=(document.getElementById('cn')?.value||'').trim(),last=(document.getElementById('caName')?.value||'').trim(),phone=(document.getElementById('ct')?.value||'').trim();if(!name)return alert('Nombre obligatorio.');if(type!=='RUC'&&!doc)return alert('Documento obligatorio.');if(doc&&db.clients.some(x=>x.doc===doc))return alert('Ese documento ya está registrado.');const c={id:uid(),docType:type,doc:doc||'00000000',name:[name,last].filter(Boolean).join(' '),phone,email:'',address:'',points:0};db.clients.push(c);save();closeModal();if(document.getElementById('saleClient'))document.getElementById('saleClient').value=c.id;if(document.getElementById('saleDocSearchType'))document.getElementById('saleDocSearchType').value=type;if(document.getElementById('saleClientDoc'))document.getElementById('saleClientDoc').value=c.doc;if(document.getElementById('saleClientResult'))document.getElementById('saleClientResult').innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.docType)} ${esc(c.doc)}`;}
function finishSale(){
  if(!session||!can('pos'))return alert('Sin permiso.');
  if(!currentCash().open)return alert('Abre la caja antes de cobrar.');
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
  const cash=currentCash();

  if(!cash.open){
    return alert('Abre la caja de esta tienda antes de vender.');
  }
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

        const stock=stockOf(p,currentStore().id);
    const bloquear=p.blockNegative!==false;
    const permitirNegativo=p.allowNegative===true;

    if(
      db.settings.strictStock &&
      bloquear &&
      !permitirNegativo &&
      stock<i.qty
    ){
      return alert('Stock insuficiente: '+p.name+' · Disponible: '+stock);
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


  const sid = currentStore().id;
  const register = db.registers.find(
    r => String(r.id) === String(cash.registerId)
  );

  const warehouse = db.warehouses.find(
    w => String(w.id) === String(register?.warehouseId) &&
         String(w.storeId) === String(sid) &&
         w.active !== false
  ) || warehouseForStore(sid);

  if (!register || String(register.storeId) !== String(sid)) {
    return alert('La caja no pertenece a la tienda activa.');
  }

  if (!warehouse || String(warehouse.storeId) !== String(sid)) {
    return alert('La caja no tiene un almacén válido asignado.');
  }

  for (const i of db.cart) {
    const p = db.products.find(x => x.id === i.id);

    if (!p) {
      return alert('Producto no encontrado: ' + i.name);
    }

    const before = stockOf(p, sid, warehouse.id);
    const bloquear = p.blockNegative !== false;
    const permitirNegativo = p.allowNegative === true;

    if (
      db.settings.strictStock &&
      bloquear &&
      !permitirNegativo &&
      before < i.qty
    ) {
      return alert(
        `Stock insuficiente en ${warehouse.name}: ${p.name} · Disponible: ${before}`
      );
    }
  }

  for (const i of db.cart) {
    const p = db.products.find(x => x.id === i.id);
    const before = stockOf(p, sid, warehouse.id);
    const after = before - i.qty;

    setStock(p, after, sid, warehouse.id);

    db.movements.push({
      id: db.seq.move++,
      date: new Date().toISOString(),
      productId: p.id,
      product: p.name,
      type: 'SALIDA',
      before,
      qty: i.qty,
      after,
      reason: i.priceType === 'Bonificación'
        ? 'BONIFICACIÓN'
        : 'VENTA',
      storeId: sid,
      warehouseId: warehouse.id,
      registerId: register.id,
      reference: doc,
      user: session.name
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
    store: currentStore().name,
    storeId: currentStore().id,
    warehouseId: warehouse.id,
    warehouse: warehouse.name,
    registerId: register.id,
    register: register.name
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

    if(!cash.paymentTotals){
    cash.paymentTotals={
      Efectivo:0,
      Yape:0,
      Plin:0,
      Izipay:0,
      Tarjeta:0,
      Transferencia:0
    };
  }

  for(const pmt of payments){

    cash.paymentTotals[pmt.method]=
      (cash.paymentTotals[pmt.method]||0)
      +Number(pmt.amount||0);

    if(pmt.method==='Efectivo'){

      cash.expected+=Number(pmt.amount||0);

      cash.movements.push({
        date:new Date().toISOString(),
        type:'VENTA',
        detail:sale.doc+' · '+pmt.method,
        amount:Number(pmt.amount||0)
      });

      if(change>0){

        cash.expected-=change;

        cash.movements.push({
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
function openMultiPayment(){let total=cartTotal();let methods=['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'];let rows=methods.map(m=>`<div class="row"><label style="min-width:110px"><b>${m}</b></label><input id="mp_${m}" class="input" type="number" min="0" step="0.01" value="0" placeholder="S/ 0.00" oninput="updateMultiPayment()"></div>`).join('');modal('Generar pago',`<p><b>Total a pagar: ${money(total)}</b></p>${rows}<div class="payment-summary"><div><span>Total asignado</span><b id="mpPaid">S/ 0.00</b></div><div class="change"><span id="mpRemainingLabel">Falta</span><b id="mpRemaining">${money(total)}</b></div></div>`,`<button id="mpConfirm" class="btn good" onclick="confirmMultiPayment()" disabled>Confirmar pago</button>`);window.updateMultiPayment=function(){let paid=methods.reduce((a,m)=>a+Number(document.getElementById('mp_'+m)?.value||0),0),remaining=total-paid;document.getElementById('mpPaid').textContent=money(paid);document.getElementById('mpRemaining').textContent=money(Math.abs(remaining));document.getElementById('mpRemainingLabel').textContent=remaining>0.009?'Falta':remaining<-0.009?'Exceso':'Completo';let btn=document.getElementById('mpConfirm');if(btn)btn.disabled=Math.abs(remaining)>0.009};window.confirmMultiPayment=function(){let payments=methods.map(m=>({method:m,amount:Number(document.getElementById('mp_'+m)?.value||0),received:Number(document.getElementById('mp_'+m)?.value||0)})).filter(x=>x.amount>0);let paid=payments.reduce((a,p)=>a+p.amount,0);if(Math.abs(paid-total)>0.009)return alert(paid<total?`Falta ${money(total-paid)} por asignar.`:`Has asignado ${money(paid-total)} de más.`);closeModal();completeSale(payments)};updateMultiPayment()}function sendSaleWhatsApp(id){let s=db.sales.find(x=>String(x.id)===String(id));if(!s)return;let c=db.clients.find(x=>x.id===s.clientId),phone=(c?.phone||'').replace(/\D/g,'');let msg=`Hola ${c?.name||'cliente'}, te enviamos tu comprobante ${s.doc}. Total: ${money(s.total)}. Gracias por tu compra.`;let url=phone?`https://wa.me/${phone.startsWith('51')?phone:'51'+phone}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;window.open(url,'_blank')}
function downloadSaleXml(id){let s=db.sales.find(x=>String(x.id)===String(id));if(!s)return;let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<comprobante prototipo="true"><tipo>${esc(s.docType)}</tipo><numero>${esc(s.doc)}</numero><cliente>${esc(s.client)}</cliente><moneda>PEN</moneda><total>${s.total.toFixed(2)}</total><pago>${esc(s.payment)}</pago><estado>PROTOTIPO_SUNAT</estado></comprobante>`;let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/xml'}));a.download=s.doc+'.xml';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function downloadSalePdf(id){printSaleFormat(id,'A4')}

function printSaleFormat(id, format = 'A4') {
    const s = db.sales.find(x => String(x.id) === String(id));

    if (!s) {
        alert('No se encontró la venta para imprimir.');
        return;
    }

    // Abrir la ventana inmediatamente para evitar el bloqueo de ventanas emergentes.
    const w = window.open('', '_blank', 'width=520,height=760');

    if (!w) {
        alert('El navegador bloqueó la impresión. Permite las ventanas emergentes para SmartTuClick y vuelve a intentarlo.');
        return;
    }

    const items = s.items.map(i => {
        const base = Number(i.qty) * Number(i.price);
        const d = Number(i.discount || 0);
        const disc = i.discountType === '%' ? base * d / 100 : d;
        const total = Math.max(0, base - disc);

        return `<tr>
            <td>${esc(i.name)}</td>
            <td>${i.qty}</td>
            <td>${money(i.price)}</td>
            <td>${disc ? money(disc) : '-'}</td>
            <td>${money(total)}</td>
        </tr>`;
    }).join('');

    const itemDiscount = s.items.reduce((a, i) => {
        const base = Number(i.qty) * Number(i.price);
        const d = Number(i.discount || 0);
        return a + (i.discountType === '%' ? base * d / 100 : d);
    }, 0);

    const ticket = format === 'TICKET';
    const printSettings = db.settings || {};
    const printLogo = printSettings.printLogo ? `<div class="center"><img src="${printSettings.printLogo}" style="max-width:${ticket ? '45mm' : '55mm'};max-height:25mm;object-fit:contain"></div>` : '';
    const printHeader = printSettings.printHeaderOn !== false && printSettings.printHeader ? `<p class="center"><b>${esc(printSettings.printHeader).replace(/\n/g, '<br>')}</b></p>` : '';
    const printTop = printSettings.printTopOn !== false && printSettings.printTop ? `<p>${esc(printSettings.printTop).replace(/\n/g, '<br>')}</p>` : '';
    const printBottom = printSettings.printBottomOn !== false && printSettings.printBottom ? `<p>${esc(printSettings.printBottom).replace(/\n/g, '<br>')}</p>` : '';
    const printFarewell = printSettings.printFarewellOn !== false && printSettings.printFarewell ? `<p class="center"><b>${esc(printSettings.printFarewell).replace(/\n/g, '<br>')}</b></p>` : '';

    const payments = Array.isArray(s.payments) && s.payments.length > 0
        ? s.payments.map(p => `${esc(p.method)} ${money(p.amount)}`).join(' · ')
        : esc(s.payment || 'No especificado');

    const cashPayment = Array.isArray(s.payments)
        ? s.payments.some(p => p.method === 'Efectivo')
        : s.payment === 'Efectivo';

    const html = `<!doctype html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${esc(s.doc || 'Venta')}</title>
        <style>
            @page {
                size: ${ticket ? '80mm auto' : 'A4'};
                margin: ${ticket ? '4mm' : '12mm'};
            }
            * { box-sizing: border-box; }
            body {
                font: 13px Arial, sans-serif;
                color: #111;
                margin: auto;
                padding: ${ticket ? '4px' : '18px'};
                max-width: ${ticket ? '72mm' : '100%'};
            }
            h2 { text-align: center; margin: 0 0 8px; }
            p { margin: 5px 0; overflow-wrap: anywhere; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 12px;
                font-size: ${ticket ? '10px' : '13px'};
            }
            td, th {
                padding: 5px 3px;
                border-bottom: 1px solid #ddd;
                text-align: left;
                overflow-wrap: anywhere;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .summary {
                margin-top: 12px;
                border-top: 1px solid #aaa;
                padding-top: 8px;
            }
            .change {
                font-size: 15px;
                font-weight: bold;
            }
            .no-print { margin-bottom: 15px; }
            @media print {
                .no-print { display: none !important; }
            }
        </style>
    </head>
    <body>
        <div class="no-print">
            <button onclick="window.print()">Imprimir</button>
            <button onclick="window.close()">Cerrar</button>
        </div>

        ${printLogo}
        <h2>${esc(db.company.name)}</h2>
        ${printHeader}
        <p class="center"><b>${esc(s.doc || '')} · ${esc(s.docType || '')}</p>
        <p>Cliente: ${esc(s.client || 'Público general')}</p>
        <p>Tienda: ${esc(s.store || '')}</p>
        ${printTop}

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
            <tbody>${items}</tbody>
        </table>

        ${itemDiscount ? `<p class="right">Descuento total: <b>${money(itemDiscount)}</b></p>` : ''}

        <div class="summary">
            <p class="right"><b>Total: ${money(s.total)}</b></p>
            <p>Pago: ${payments}</p>
            ${cashPayment ? `
                <p>Recibido efectivo: ${money(s.received || 0)}</p>
                <p class="right change">Vuelto: ${money(s.change || 0)}</p>
            ` : ''}
        </div>

        ${printBottom}
        ${printFarewell}
        <p class="center" style="margin-top:20px">
            DOCUMENTO INTERNO · SUNAT PROTOTIPO
        </p>
    </body>
    </html>`;

    try {
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();

        // Esperar a que el navegador termine de renderizar el documento.
        setTimeout(() => {
            if (!w.closed) {
                w.focus();
                w.print();
            }
        }, 700);
    } catch (error) {
        w.close();
        console.error('Error al preparar la impresión:', error);
        alert('No se pudo preparar la impresión. Revisa la consola del navegador.');
    }
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('modalHost')){closeModal();return}if(e.key==='F2'){e.preventDefault();focusBarcode();}})
function heldSales(){let rows=db.held.slice().reverse().map(h=>`<tr><td>${new Date(h.date).toLocaleString()}</td><td>${h.items.reduce((a,i)=>a+i.qty,0)} und.</td><td><button class="btn good" onclick="restoreHeld(${h.id})">Recuperar</button></td></tr>`).join('')||empty(3);modal('Ventas en espera',`<table class="table"><tr><th>Fecha</th><th>Unidades</th><th></th></tr>${rows}</table>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`)}
function restoreHeld(id){if(db.cart.length)return alert('Vacía la venta actual antes de recuperar otra.');let h=db.held.find(x=>x.id===id);if(!h)return;db.cart=clone(h.items);db.held=db.held.filter(x=>x.id!==id);closeModal();save();render()}
function toggleCashReceived(){let p=document.getElementById('salePayment')?.value,row=document.getElementById('cashReceivedRow');if(row)row.style.display=p==='Efectivo'?'flex':'none'}
function holdSale(){if(!db.cart.length)return alert('Carrito vacío');db.held.push({id:uid(),date:new Date().toISOString(),items:clone(db.cart)});db.cart=[];save();render();alert('Venta guardada en espera.')}

function openCash(){
  const cash=currentCash();
  if(cash.open)return;

  const openingInput=document.getElementById('opening');
  const registerInput=document.getElementById('cashRegister');

  const n=Number(openingInput.value);
  const registerId=Number(registerInput.value);

  if(openingInput.value.trim()===''){
    return alert('Ingresa el monto inicial de apertura.');
  }

  if(n<0){
    return alert('El monto inicial no puede ser negativo.');
  }

  
  const register = db.registers.find(
    r => String(r.id) === String(registerId)
  );

  if (!register || String(register.storeId) !== String(currentStore().id)) {
    return alert('La caja seleccionada no pertenece a la tienda activa.');
  }

  const warehouse = warehouseForStore(currentStore().id);

  if (!warehouse) {
    return alert('Esta tienda no tiene un almacén configurado.');
  }

  register.warehouseId = warehouse.id;


  cash.open=true;
  cash.opening=n;
  cash.expected=n;
  cash.openedAt=new Date().toISOString();
  cash.userId=session.id;
  cash.registerId=registerId;
  cash.movements=[{
    date:new Date().toISOString(),
    type:'APERTURA',
    detail:'Fondo inicial',
    amount:n
  }];

  audit('APERTURA_CAJA','CAJA',String(registerId));
  save();
  render();
}


function cashMovement(){
  const cash=currentCash();

  if(!cash.open)return alert('Abre la caja primero.');

  modal(
    'Movimiento de caja',
    `<div class="formgrid">
      <select id="cmType" class="input">
        <option value="INGRESO">Ingreso</option>
        <option value="EGRESO">Egreso</option>
      </select>
      <input id="cmAmount" class="input" type="number" min="0.01" step="0.01" placeholder="Monto">
      <input id="cmDetail" class="input" placeholder="Detalle / motivo">
    </div>`,
    `<button class="btn good" onclick="saveCashMovement()">Registrar</button>`
  );
}


function saveCashMovement(){
  const cash=currentCash();
  const type=document.getElementById('cmType').value;
  const n=Number(document.getElementById('cmAmount').value);
  const detail=document.getElementById('cmDetail').value.trim();

  if(!cash.open)return alert('Abre la caja primero.');
  if(!n||n<=0||!detail)return alert('Completa monto y detalle.');
  if(type==='EGRESO'&&n>cash.expected){
    return alert('El egreso supera el efectivo disponible.');
  }

  const amount=type==='INGRESO'?n:-n;
  cash.expected+=amount;

  cash.movements.push({
    date:new Date().toISOString(),
    type,
    detail,
    amount
  });

  audit(type+'_CAJA','CAJA',detail);
  closeModal();
  save();
  render();
}

let closeWizard=null;

function closeCash(){
  const cash=currentCash();

  if(!cash.open)return alert('La caja ya está cerrada.');

  closeWizard={
    methods:['Efectivo','Yape','Plin','Izipay','Tarjeta','Transferencia'],
    index:0,
    declared:{}
  };

  closeCashStep();
}


function closeExpected(method){
  const cash=currentCash();
  return method==='Efectivo'
    ?Number(cash.expected||0)
    :Number((cash.paymentTotals||{})[method]||0);
}



function closeCashStep(){
  if(!closeWizard)return;

  const method=closeWizard.methods[closeWizard.index];
  const expected=closeExpected(method);
  const declared=closeWizard.declared[method];

  const color=method==='Efectivo'?'good':
    method==='Yape'?'green':
    method==='Plin'?'blue':
    method==='Izipay'?'purple':'alt';

  modal(
    `Cierre de caja · ${method}`,
    `<div class="close-method">
      <div class="close-method-icon ${color}">${
        method==='Efectivo'?'💵':
        method==='Yape'?'🟢':
        method==='Plin'?'🔵':
        method==='Izipay'?'🟣':
        method==='Tarjeta'?'💳':'🏦'
      }</div>
      <div class="muted">Monto esperado</div>
      <div class="close-expected">${money(expected)}</div>
      <label>¿Cuánto tienes registrado en ${esc(method)}?</label>
      <input id="closeDeclared" class="input close-amount"
        type="number" min="0" step="0.01" inputmode="decimal"
        value="${declared??''}" placeholder="S/ 0.00" autofocus>
      <div class="close-progress">
        Método ${closeWizard.index+1} de ${closeWizard.methods.length}
      </div>
    </div>`,
    `${closeWizard.index>0?
      `<button class="btn alt" onclick="closeCashBack()">← Anterior</button>`:''}
     <button class="btn good" onclick="closeCashNext()">${
       closeWizard.index===closeWizard.methods.length-1?
       'Ver resumen':'Continuar →'
     }</button>`
  );

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
 const c=Object.values(db.cashByStore||{}).flatMap(cash=>cash.closed||[]).find(x=>x.id===id);
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
 const cash=currentCash();

 const totalExpected=closeWizard.methods.reduce((a,m)=>a+closeExpected(m),0);
 const totalDeclared=closeWizard.methods.reduce((a,m)=>a+Number(closeWizard.declared[m]||0),0);

 const breakdown=Object.fromEntries(
   closeWizard.methods.map(m=>[
     m,
     {
       expected:closeExpected(m),
       declared:Number(closeWizard.declared[m]||0),
       difference:Number(closeWizard.declared[m]||0)-closeExpected(m)
     }
   ])
 );

 let r=db.registers.find(x=>x.id===Number(cash.registerId));
 const closedAt=new Date().toISOString();
 const openedAt=cash.openedAt;

 
 const closeSales=db.sales.filter(s=>
   s.storeId===currentStore().id&&
   Number(s.registerId)===Number(cash.registerId)&&
   s.status!=='ANULADA'&&
   (!openedAt||s.date>=openedAt)&&
   s.date<=closedAt
 );


 const salesByPayment=Object.fromEntries(
   closeWizard.methods.map(m=>[
     m,
     closeSales.reduce((sum,sale)=>
       sum+(sale.payments?.filter(p=>p.method===m)
       .reduce((a,p)=>a+Number(p.amount||0),0)||0),0)
   ])
 );

 const salesTotal=closeSales.reduce((a,s)=>a+Number(s.total||0),0);

 cash.closed.push({
   id:uid(),
   date:closedAt,
   openedAt,
   opening:Number(cash.opening||0),
   expected:totalExpected,
   declared:totalDeclared,
   difference:totalDeclared-totalExpected,
   breakdown,
   salesTotal,
   salesByPayment,
   saleCount:closeSales.length,
   saleIds:closeSales.map(s=>s.id),
   movements:clone(cash.movements||[]),
   register:r?.name||'',
   user:session.name,
   storeId:currentStore().id
 });

 audit('CIERRE_CAJA','CAJA',String(cash.registerId));

 cash.open=false;
 cash.opening=0;
 cash.expected=0;
 cash.openedAt=null;
 cash.userId=null;
 cash.registerId=null;
 cash.movements=[];
 cash.paymentTotals={
   Efectivo:0,
   Yape:0,
   Plin:0,
   Izipay:0,
   Tarjeta:0,
   Transferencia:0
 };

 closeWizard=null;
 closeModal();
 save();
 render();
}
window.confirmCashClose = confirmCashClose;

function productForm(){modal('Nuevo producto',`
<div class="formgrid">
  <input id="psku" class="input" placeholder="SKU">
  <input id="pbar" class="input" placeholder="Código de barras">
  <input id="pname" class="input" placeholder="Descripción del producto">
  <input id="pcat" class="input" placeholder="Categoría" value="General">
  <input id="pbrand" class="input" placeholder="Marca">
  <input id="punit" class="input" placeholder="Unidad" value="UND">
  <input id="pcost" class="input" type="number" min="0" step="0.01" placeholder="Costo">
  <input id="pprice" class="input" type="number" min="0" step="0.01" placeholder="Precio de venta">
  <input id="pstock" class="input" type="number" min="0" step="0.001" placeholder="Stock inicial">
  <input id="pmin" class="input" type="number" min="0" step="0.001" placeholder="Alerta de stock mínimo">
</div>

<div style="margin-top:12px">
  <label for="pimage">Foto del producto</label>
  <input id="pimage" class="input" type="file" accept="image/*">
</div>

<details style="margin-top:16px">
  <summary style="cursor:pointer;font-weight:700;padding:10px">Configuración logística adicional</summary>
  <div class="formgrid" style="margin-top:12px">
    <input id="pnotes" class="input" placeholder="Anotaciones adicionales">
    <label class="input">Control de stock estricto<br>
      <input id="pblockNegative" type="checkbox" checked>
      Bloquear venta sin stock
    </label>
    <label class="input">Control de stock flexible<br>
      <input id="pallowNegative" type="checkbox">
      Permitir stock negativo
    </label>
  </div>
</details>

`,`<button class="btn good" onclick="saveProduct()">Guardar producto</button>`);

const file=document.getElementById('pimage');
const preview=document.getElementById('pimagePreview');
if(file&&preview){
  file.onchange=()=>{
    const f=file.files[0];
    if(!f){preview.style.display='none';return}
    if(f.size>2*1024*1024){
      alert('La imagen supera los 2 MB. Elige una más pequeña.');
      file.value='';
      preview.style.display='none';
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      preview.src=reader.result;
      preview.style.display='block';
    };
    reader.readAsDataURL(f);
  };
}
}

async function saveProduct(){
  let sku=psku.value.trim(),
      name=pname.value.trim(),
      bar=pbar.value.trim(),
      cost=Number(pcost.value||0),
      price=Number(pprice.value||0),
      stock=Number(pstock.value||0),
      min=Number(pmin.value||0),
      blockNegative=pblockNegative.checked,
      allowNegative=pallowNegative.checked;

  if(!sku||!name||cost<0||price<0||stock<0||min<0)
    return alert('Completa los datos del producto.');

  if(db.products.some(p=>p.sku===sku))
    return alert('Ese SKU ya existe.');

  if(bar&&db.products.some(p=>String(p.barcode)===bar))
    return alert('Ese código de barras ya existe.');

  let image='';
  const file=document.getElementById('pimage')?.files?.[0];

  if(file){
    if(!file.type.startsWith('image/'))
      return alert('Selecciona un archivo de imagen válido.');

    try{
      image=await new Promise((resolve,reject)=>{
        const reader=new FileReader();

        reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));

        reader.onload=()=>{
          const img=new Image();

          img.onerror=()=>reject(new Error('La imagen no es válida.'));

          img.onload=()=>{
            const canvas=document.createElement('canvas');
            const scale=Math.min(1,400/img.width,400/img.height);

            canvas.width=Math.round(img.width*scale);
            canvas.height=Math.round(img.height*scale);

            const ctx=canvas.getContext('2d');
            ctx.drawImage(img,0,0,canvas.width,canvas.height);

            resolve(canvas.toDataURL('image/jpeg',0.65));
          };

          img.src=reader.result;
        };

        reader.readAsDataURL(file);
      });
    }catch(e){
      return alert('No se pudo procesar la imagen del producto.');
    }
  }

  let id=uid();
  let storeStocks={};

  for(const st of db.stores)
    storeStocks[st.id]=st.id===currentStore().id?stock:0;

  db.products.push({
    id,sku,barcode:bar,name,
    category:pcat.value.trim()||'General',
    brand:pbrand.value.trim(),
    unit:punit.value.trim()||'UND',
    cost,price,stock,min,
    notes:document.getElementById('pnotes')?.value.trim()||'',
    image,
    blockNegative,allowNegative,
    active:true,storeStocks
  });

  if(stock>0){
    db.movements.push({
      id:db.seq.move++,
      date:new Date().toISOString(),
      productId:id,
      product:name,
      type:'ENTRADA',
      before:0,qty:stock,after:stock,
      reason:'STOCK INICIAL',
      reference:'INI-'+id,
      user:session.name,
      storeId:currentStore().id
    });
  }

  closeModal();
  save();
  render();
}

function editProduct(id){let p=db.products.find(x=>x.id===id);if(!p)return;modal('Editar producto',`<div style="margin-top:12px">
  <label>Foto actual del producto</label>
  ${p.image ? `<img src="${p.image}" alt="${esc(p.name)}" style="display:block;width:120px;height:120px;object-fit:contain;margin:8px 0;border:1px solid #ddd;border-radius:8px">` : '<div style="color:#777;margin:8px 0">Este producto no tiene foto</div>'}
  <label for="epimage">Cambiar foto</label>
  <input id="epimage" class="input" type="file" accept="image/*">
  <label><input id="epremoveimage" type="checkbox"> Quitar foto actual</label>
</div><label><input id="epblockNegative" type="checkbox" ${p.blockNegative!==false?'checked':''}> Bloquear venta cuando no haya stock</label><br><label><input id="epallowNegative" type="checkbox" ${p.allowNegative?'checked':''}> Permitir vender con stock negativo</label></div>`,`<button class="btn good" onclick="saveEditProduct(${id})">Guardar</button>`)}

async function saveEditProduct(id){
  let p=db.products.find(x=>x.id===id);
  if(!p)return;

  let file=document.getElementById('epimage')?.files?.[0];
  let image=p.image||'';

  if(document.getElementById('epremoveimage')?.checked){
    image='';
  }else if(file){
    if(!file.type.startsWith('image/')){
      return alert('Selecciona una imagen válida.');
    }

    try{
      image=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>{
          const img=new Image();
          img.onload=()=>{
            const canvas=document.createElement('canvas');
            const scale=Math.min(1,500/Math.max(img.width,img.height));
            canvas.width=Math.round(img.width*scale);
            canvas.height=Math.round(img.height*scale);
            canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
            resolve(canvas.toDataURL('image/jpeg',0.75));
          };
          img.onerror=reject;
          img.src=reader.result;
        };
        reader.onerror=reject;
        reader.readAsDataURL(file);
      });
    }catch(e){
      return alert('No se pudo cargar la imagen.');
    }
  }

  p.name=document.getElementById('epname').value.trim()||p.name;
  p.category=document.getElementById('epcat').value.trim()||'General';
  p.brand=document.getElementById('epbrand').value.trim();
  p.cost=Number(document.getElementById('epcost').value||0);
  p.price=Number(document.getElementById('epprice').value||0);
  p.active=document.getElementById('epactive').value==='1';
  p.blockNegative=document.getElementById('epblockNegative').checked;
  p.allowNegative=document.getElementById('epallowNegative').checked;
  p.image=image;

  audit('EDITAR','PRODUCTO',p.sku);
  closeModal();
  save();
  render();
}
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
function productRows(list=db.products){
  const sid=currentStore().id;

  return list.map(p=>{
    const stock=stockOf(p,sid);

    return `<tr>
      <td>${esc(p.sku)}</td>
      <td><b>${esc(p.name)}</b><div class="muted">${esc(p.barcode)}</div></td>
      <td>${esc(p.category)}</td>
      <td>${money(p.cost)}</td>
      <td>${money(p.price)}</td>
      <td class="${stock<=p.min?'danger':''}">${stock} ${esc(p.unit)}</td>
      <td>${p.active?'Activo':'Inactivo'}</td>
      <td class="actions">
        <button class="iconAction quickIn" title="Ingreso rápido" onclick="quickStockMove(${p.id},'ENTRADA')">↓</button>
        <button class="iconAction quickOut" title="Salida rápida" onclick="quickStockMove(${p.id},'SALIDA')">↑</button>
        <button class="btn alt" onclick="adjust(${p.id})">Ajustar</button>
        <button class="btn alt" onclick="editProduct(${p.id})">Editar</button>
      </td>
    </tr>`;
  }).join('')||empty(8);
}function adjust(id){let p=db.products.find(x=>x.id===id),n=Number(prompt(`Nuevo stock para ${p.name}`,stockOf(p)));if(!Number.isFinite(n)||n<0)return;let before=stockOf(p),d=n-before;setStock(p,n);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:d>=0?'ENTRADA':'SALIDA',before,qty:Math.abs(d),after:n,reason:'AJUSTE',reference:'AJ-'+db.seq.move,user:session.name,storeId:currentStore().id});save();render()}

function quickStockMove(productId, type) {
  const p = productId
    ? db.products.find(x => String(x.id) === String(productId))
    : null;

  if (productId && !p) return;

  const mode = type || 'ENTRADA';
  const isIn = mode === 'ENTRADA';
  const sid = String(currentStore().id);

  const stores = (db.stores || []).filter(s => s.active !== false);
  const storeOptions = stores.map(s => `
    <option value="${s.id}" ${String(s.id) === sid ? 'selected' : ''}>
      ${esc(s.name)}
    </option>
  `).join('');

  const productOptions = db.products
    .filter(x => x.active)
    .map(x => `
      <option value="${x.id}" ${p && String(x.id) === String(p.id) ? 'selected' : ''}>
        ${esc(x.name)} · ${esc(x.sku)}
      </option>
    `).join('');

  const reasons = isIn
    ? `<option>INGRESO A ALMACÉN</option><option>DEVOLUCIÓN</option><option>AJUSTE POSITIVO</option><option>OTRO INGRESO</option>`
    : `<option>SALIDA DE ALMACÉN</option><option>MERMA</option><option>AJUSTE NEGATIVO</option><option>CONSUMO INTERNO</option><option>OTRA SALIDA</option>`;

  modal(
    isIn ? '↓ Ingreso rápido de stock' : '↑ Salida rápida de stock',
    `
      <div class="quickMoveHead ${isIn ? 'in' : 'out'}">
        <b>${isIn ? 'Entrada' : 'Salida'}</b>
        <span id="qmStoreName">${esc(currentStore().name)}</span>
      </div>

      <div class="formgrid">
        <label>
          Tienda
          <select id="qmStore" class="input"
                  onchange="refreshQuickWarehouses()">
            ${storeOptions}
          </select>
        </label>

        <label>
          Almacén
          <select id="qmWarehouse" class="input"
                  onchange="refreshQuickStock()">
          </select>
        </label>

        <label>
          Producto
          <select id="qmProduct" class="input"
                  onchange="refreshQuickStock()">
            ${productOptions}
          </select>
        </label>

        <div style="margin:10px 0">
          <label for="qmImage">Foto del producto</label>
          <input id="qmImage" class="input" type="file" accept="image/*">
          <button type="button" class="btn alt"
                  onclick="saveQuickStockImage()">Guardar foto</button>
        </div>

        <label>
          Stock actual
          <input id="qmCurrent" class="input" value="0" disabled>
        </label>

        <label>
          Motivo
          <select id="qmReason" class="input">${reasons}</select>
        </label>

        <label>
          Cantidad a ${isIn ? 'ingresar' : 'retirar'}
          <input id="qmQty" class="input qtyInput" type="number"
                 min="0.001" step="0.001" value="1" autofocus>
        </label>

        <label>
          Observación
          <input id="qmNote" class="input" placeholder="Opcional">
        </label>
      </div>

      <div style="margin-top:14px;padding:12px;border:1px solid #e2e8f0;border-radius:10px">
        <b>Reglas de stock del producto</b><br>
        <label>
          <input id="qmBlockNegative" type="checkbox"
            ${p?.blockNegative !== false ? 'checked' : ''}>
          Bloquear venta cuando no haya stock
        </label><br>
        <label>
          <input id="qmAllowNegative" type="checkbox"
            ${p?.allowNegative ? 'checked' : ''}>
          Permitir vender con stock negativo
        </label>
      </div>

      <div class="notice">
        El movimiento actualizará el stock del almacén seleccionado
        y quedará registrado en el Kardex.
      </div>
    `,
    `<button class="btn ${isIn ? 'good' : 'warn'}"
       onclick="saveQuickStockMove('${mode}')">
       ${isIn ? 'Registrar ingreso' : 'Registrar salida'}
     </button>`
  );

  refreshQuickWarehouses();
}


function refreshQuickWarehouses() {
  const storeSelect = document.getElementById('qmStore');
  const warehouseSelect = document.getElementById('qmWarehouse');

  if (!storeSelect || !warehouseSelect) return;

  const storeId = storeSelect.value;
  const store = (db.stores || []).find(
    s => String(s.id) === String(storeId)
  );

  const warehouses = (db.warehouses || []).filter(
    w => String(w.storeId) === String(storeId) &&
         w.active !== false
  );

  warehouseSelect.innerHTML = warehouses.map(w =>
    `<option value="${w.id}">${esc(w.name)}</option>`
  ).join('');

  const storeName = document.getElementById('qmStoreName');
  if (storeName) storeName.textContent = store?.name || '';

  if (!warehouses.length) {
    warehouseSelect.innerHTML = '<option value="">Sin almacenes activos</option>';
  }

  refreshQuickStock();
}



function refreshQuickStock() {
  const productId = document.getElementById('qmProduct')?.value;
  const p = db.products.find(
    x => String(x.id) === String(productId)
  );

  const storeId = document.getElementById('qmStore')?.value;
  const warehouseId = document.getElementById('qmWarehouse')?.value;

  const warehouse = (db.warehouses || []).find(
    w => String(w.id) === String(warehouseId) &&
         String(w.storeId) === String(storeId) &&
         w.active !== false
  );

  const el = document.getElementById('qmCurrent');

  if (el) {
    el.value = p && warehouse
      ? stockOf(p, storeId, warehouse.id)
      : 0;
  }
}




function saveQuickStockMove(type) {
  const productId = Number(document.getElementById('qmProduct')?.value);
  const p = db.products.find(x => x.id === productId);
  const qty = Number(document.getElementById('qmQty')?.value);
  const reason = document.getElementById('qmReason')?.value || '';
  const note = document.getElementById('qmNote')?.value?.trim() || '';

  const sid = document.getElementById('qmStore')?.value;
  const warehouseId = document.getElementById('qmWarehouse')?.value;

  const warehouse = (db.warehouses || []).find(
    w => String(w.id) === String(warehouseId) &&
         String(w.storeId) === String(sid) &&
         w.active !== false
  );

  if (!p || !p.active) {
    return alert('Selecciona un producto activo.');
  }

  if (!warehouse) {
    return alert('Selecciona una tienda que tenga un almacén activo.');
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    return alert('La cantidad debe ser mayor que cero.');
  }

  const before = stockOf(p, sid, warehouse.id);

  if (type === 'SALIDA' && db.settings.strictStock && qty > before) {
    return alert(`Stock insuficiente. Disponible: ${before} ${p.unit}.`);
  }

  const after = type === 'ENTRADA'
    ? before + qty
    : before - qty;

  setStock(p, after, sid, warehouse.id);

  const ref = 'MR-' + String(db.seq.quickMove++).padStart(6, '0');

  db.movements.push({
    id: db.seq.move++,
    date: new Date().toISOString(),
    productId: p.id,
    product: p.name,
    type,
    operation: type === 'ENTRADA' ? 'INGRESO_RAPIDO' : 'SALIDA_RAPIDA',
    before,
    qty,
    after,
    reason,
    reference: ref,
    note,
    warehouseId: warehouse.id,
    user: session.name,
    storeId: warehouse.storeId
  });

  audit(
    type === 'ENTRADA' ? 'INGRESO_RAPIDO' : 'SALIDA_RAPIDA',
    'INVENTARIO',
    `${p.name} x ${qty} · ${ref} · ${warehouse.name}`
  );

  closeModal();
  save();
  render();
}


function adjustStockForm(){
  const sid=currentStore().id;
  const opts=db.products.map(p=>
    `<option value="${p.id}">${esc(p.name)} · stock ${stockOf(p,sid)}</option>`
  ).join('');

  modal(
    'Ajuste de inventario',
    `<div class="formgrid">
      <select id="ap" class="input">${opts}</select>
      <input id="an" class="input" type="number" min="0" placeholder="Nuevo stock">
      <input id="ar" class="input" placeholder="Motivo del ajuste">
    </div>
    <div class="notice">El ajuste afectará únicamente a ${esc(currentStore().name)}.</div>`,
    `<button class="btn good" onclick="saveAdjustForm()">Guardar</button>`
  );
}

function saveAdjustForm(){
  const p=db.products.find(x=>x.id===Number(document.getElementById('ap').value));
  const n=Number(document.getElementById('an').value);
  const reason=document.getElementById('ar').value.trim();
  const sid=currentStore().id;

  if(!p||!Number.isFinite(n)||n<0)
    return alert('Datos inválidos');

  const before=stockOf(p,sid);
  const diff=n-before;

  setStock(p,n,sid);

  db.movements.push({
    id:db.seq.move++,
    date:new Date().toISOString(),
    productId:p.id,
    product:p.name,
    type:diff>=0?'ENTRADA':'SALIDA',
    before,
    qty:Math.abs(diff),
    after:n,
    reason:reason||'AJUSTE',
    reference:'AJ-'+String(db.seq.move).padStart(6,'0'),
    user:session.name,
    storeId:sid
  });

  closeModal();
  save();
  render();
}

function kardexRows(list=db.movements){
  const sid=currentStore().id;
  return list
    .filter(m=>m.storeId===sid)
    .slice()
    .reverse()
    .slice(0,100)
    .map(m=>`<tr><td>${new Date(m.date).toLocaleString()}</td><td>${esc(m.product)}</td><td>${m.type}</td><td>${m.before??'-'}</td><td>${m.qty}</td><td>${m.after??'-'}</td><td>${esc(m.reason)}</td><td>${esc(m.reference||'-')}</td></tr>`)
    .join('')||empty(8);
}
function kardexFilter(q){
  const sid=currentStore().id;
  document.getElementById('kardexRows').innerHTML=kardexRows(
    db.movements.filter(m=>
      m.storeId===sid &&
      `${m.product||''} ${m.reason||''} ${m.reference||''}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
  );
}

function purchaseForm(){modal('Registrar compra',`<div class="formgrid"><select id="sup" class="input"><option value="">Seleccionar proveedor</option>${db.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)} · ${esc(s.doc||'')}</option>`).join('')}</select><input id="pd" class="input" placeholder="Factura/Documento"><select id="prod" class="input">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="qty" class="input" type="number" min="1" placeholder="Cantidad"><select id="pay" class="input"><option>Contado</option><option>Crédito</option></select><input id="cost" class="input" type="number" min="0" step="0.01" placeholder="Costo unitario"></div>`,`<button class="btn good" onclick="savePurchase()">Registrar compra</button>`)}function savePurchase(){let p=db.products.find(x=>x.id==prod.value),q=Number(qty.value),c=Number(cost.value);let supplier=db.suppliers.find(x=>x.id===Number(sup.value));if(!supplier||!q||c<0)return alert('Selecciona proveedor y completa los datos');let sid=currentStore().id;let before=stockOf(p,sid);setStock(p,before+q,sid);p.cost=c;let total=q*c,ref='OC-'+String(db.seq.purchase).padStart(6,'0');db.purchases.push({id:db.seq.purchase++,date:new Date().toISOString(),supplier:supplier.name,supplierId:supplier.id,doc:pd.value||'S/D',product:p.name,productId:p.id,qty:q,cost:c,total,status:pay.value==='Crédito'?'PENDIENTE PAGO':'PAGADA',payment:pay.value,storeId:currentStore().id,user:session.name});audit('CREAR','COMPRA',ref);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:q,after:stockOf(p,sid),reason:'COMPRA',storeId:sid,reference:ref,user:session.name});closeModal();save();render()}
function supplierForm(){modal('Nuevo proveedor',`<div class="formgrid"><input id="sd" class="input" placeholder="RUC/DNI"><input id="sn" class="input" placeholder="Razón social"><input id="sp" class="input" placeholder="Teléfono"><input id="se" class="input" placeholder="Email"></div>`,`<button class="btn good" onclick="saveSupplier()">Guardar</button>`)}function saveSupplier(){if(!sn.value)return alert('Razón social obligatoria');if(sd.value&&db.suppliers.some(x=>x.doc===sd.value.trim()))return alert('Ese documento de proveedor ya existe.');db.suppliers.push({id:uid(),doc:sd.value,name:sn.value,phone:sp.value,email:se.value});closeModal();save();render()}
function transferForm(){if(db.stores.length<2){return alert('Crea al menos dos tiendas para transferir stock.')}modal('Nueva transferencia',`<div class="formgrid"><select id="tf" class="input">${db.stores.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><select id="tt" class="input">${db.stores.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><select id="tp" class="input">${db.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="tq" class="input" type="number" min="1" placeholder="Cantidad"></div>`,`<button class="btn good" onclick="saveTransfer()">Emitir transferencia</button>`)}function saveTransfer(){let f=db.stores.find(s=>s.id==tf.value),t=db.stores.find(s=>s.id==tt.value),p=db.products.find(x=>x.id==tp.value),q=Number(tq.value);if(f.id===t.id||!p||q<1)return alert('Origen y destino deben ser distintos y la cantidad válida');if(db.settings.strictStock&&stockOf(p,f.id)<q)return alert('Stock insuficiente en origen');let before=stockOf(p,f.id);setStock(p,before-q,f.id);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'SALIDA',before,qty:q,after:stockOf(p,f.id),reason:'TRANSFERENCIA',storeId:f.id,reference:'TR-'+String(db.seq.transfer).padStart(6,'0'),user:session.name});db.transfers.push({id:db.seq.transfer++,date:new Date().toISOString(),from:f.name,to:t.name,fromId:f.id,toId:t.id,product:p.name,productId:p.id,qty:q,status:'PENDIENTE',user:session.name});closeModal();save();render()}function receiveTransfer(id){let t=db.transfers.find(x=>x.id===id);if(!t)return;let p=db.products.find(x=>x.id===t.productId),before=stockOf(p,t.toId);setStock(p,before+t.qty,t.toId);t.status='RECIBIDA';db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:t.qty,after:stockOf(p,t.toId),reason:'RECEPCIÓN TRANSFERENCIA',storeId:t.toId,reference:'TR-'+String(t.id).padStart(6,'0'),user:session.name});save();render()}
function quoteRows(){return db.quotes.slice().reverse().map(q=>`<tr><td>${new Date(q.date).toLocaleString()}</td><td>${esc(q.doc)}</td><td>${esc(q.client)}</td><td>${money(q.total)}</td><td>${esc(q.status)}</td><td>${q.status==='ABIERTA'?`<button class="btn good" onclick="loadQuote(${q.id})">Cargar POS</button>`:''}</td></tr>`).join('')||empty(6)}
function quoteForm(){if(!db.cart.length)return alert('Arma primero el carrito del POS y luego crea la cotización.');let client=db.clients[0];modal('Nueva cotización',`<div class="formgrid"><select id="qClient" class="input">${db.clients.map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.doc)}</option>`).join('')}</select><input id="qNote" class="input" placeholder="Observación / vigencia"></div><p class="muted">${db.cart.reduce((a,i)=>a+i.qty,0)} unidades · ${money(cartTotal())}</p>`,`<button class="btn good" onclick="saveQuote()">Guardar cotización</button>`)}
function saveQuote(){let c=db.clients.find(x=>x.id===Number(qClient.value))||db.clients[0],total=cartTotal(),number=db.seq.quote++,doc='COT-'+String(number).padStart(6,'0');db.quotes.push({id:uid(),date:new Date().toISOString(),doc,clientId:c.id,client:c.name,total,items:clone(db.cart),note:qNote.value||'',status:'ABIERTA',storeId:currentStore().id,user:session.name});audit('CREAR','COTIZACION',doc);closeModal();save();render()}
function loadQuote(id){let q=db.quotes.find(x=>x.id===id);if(!q)return;if(db.cart.length&&!confirm('La venta actual será reemplazada por la cotización.'))return;db.cart=clone(q.items);q.status='CARGADA_POS';db.activeStoreId=q.storeId||db.activeStoreId;audit('CARGAR','COTIZACION',q.doc);save();view='pos';render()}
function clientRows(list=db.clients){return list.map(c=>`<tr><td>${esc(c.docType)} ${esc(c.doc)}</td><td><b>${esc(c.name)}</b><div class="muted">${esc(c.email||'')}</div></td><td>${esc(c.phone)}</td><td>${c.points||0}</td><td><button class="btn alt" onclick="pointsHistory(${c.id})">Puntos</button></td></tr>`).join('')||empty(5)}function clientSearch(q){document.getElementById('clientRows').innerHTML='<tr><th>Documento</th><th>Cliente</th><th>Teléfono</th><th>Puntos</th><th></th></tr>'+clientRows(db.clients.filter(c=>(c.name+c.doc+c.phone).toLowerCase().includes(q.toLowerCase())))}function clientForm(){modal('Nuevo cliente',`<div class="formgrid"><select id="cdt" class="input"><option>DNI</option><option>RUC</option><option>CE</option></select><input id="cd" class="input" placeholder="Documento"><input id="cn" class="input" placeholder="Nombre/Razón social"><input id="ct" class="input" placeholder="Teléfono"><input id="ce" class="input" placeholder="Email"><input id="ca" class="input" placeholder="Dirección"></div>`,`<button class="btn good" onclick="saveClient()">Guardar</button>`)}function saveClient(){if(!cn.value)return alert('Nombre obligatorio');if(cd.value&&db.clients.some(x=>x.doc===cd.value.trim()))return alert('Ese documento ya está registrado.');db.clients.push({id:uid(),docType:cdt.value,doc:cd.value,name:cn.value,phone:ct.value,email:ce.value,address:ca.value,points:0});closeModal();save();render()}function pointsHistory(id){let c=db.clients.find(x=>x.id===id),rows=db.pointsLedger.filter(x=>x.clientId===id).slice().reverse().map(x=>`<tr><td>${new Date(x.date).toLocaleString()}</td><td>${x.type}</td><td>${x.points}</td><td>${esc(x.reference||'')}</td></tr>`).join('')||empty(4);modal('Historial de puntos',`<p><b>${esc(c.name)}</b> · ${c.points||0} puntos</p><table class="table"><tr><th>Fecha</th><th>Tipo</th><th>Puntos</th><th>Referencia</th></tr>${rows}</table>`,`<button class="btn alt" onclick="closeModal()">Cerrar</button>`)}

function userStoreOptions(selectedId = '') {
  return (db.stores || [])
    .filter(s => s.active !== false)
    .map(s => `
      <option value="${s.id}" ${String(s.id) === String(selectedId) ? 'selected' : ''}>
        ${esc(s.name)}
      </option>
    `).join('');
}

function userWarehouseOptions(storeId, selectedId = '') {
  return (db.warehouses || [])
    .filter(w =>
      String(w.storeId) === String(storeId) &&
      w.active !== false
    )
    .map(w => `
      <option value="${w.id}" ${String(w.id) === String(selectedId) ? 'selected' : ''}>
        ${esc(w.name)}
      </option>
    `).join('');
}

function userAssignmentRow(index) {
  const firstStore = (db.stores || []).find(s => s.active !== false);
  const storeId = firstStore ? firstStore.id : '';
  const warehouses = (db.warehouses || []).filter(w =>
    String(w.storeId) === String(storeId) &&
    w.active !== false
  );

  return `
    <div class="card user-assignment" data-assignment="${index}" style="margin-top:12px">
      <div class="formgrid">
        <label>
          Tienda
          <select class="input user-store"
                  onchange="refreshUserWarehouses(this)">
            ${userStoreOptions(storeId)}
          </select>
        </label>

        <label>
          Almacén
          <select class="input user-warehouse">
            ${userWarehouseOptions(storeId, warehouses[0]?.id)}
          </select>
        </label>
      </div>

      ${index > 0 ? `
        <button type="button" class="btn danger"
                onclick="removeUserAssignment(this)">
          Quitar asignación
        </button>
      ` : ''}
    </div>
  `;
}

function userForm() {
  modal(
    'Nuevo usuario',
    `
      <div class="formgrid">
        <input id="un" class="input" placeholder="Nombre">
        <input id="uu" class="input" placeholder="Usuario">
        <input id="up" class="input" type="password"
               placeholder="Contraseña">

        <select id="ur" class="input">
          ${Object.keys(db.roles).map(r =>
            `<option value="${esc(r)}">${esc(r)}</option>`
          ).join('')}
        </select>
      </div>

      <h4 style="margin-top:18px">Tiendas y almacenes asignados</h4>

      <div id="userAssignments">
        ${userAssignmentRow(0)}
      </div>

      <button type="button" class="btn alt"
              style="margin-top:12px"
              onclick="addUserAssignment()">
        + Agregar otra tienda y almacén
      </button>
    `,
    `
      <button class="btn good" onclick="saveUser()">
        Guardar usuario
      </button>
    `
  );
}

function refreshUserWarehouses(storeSelect) {
  const row = storeSelect.closest('.user-assignment');
  const warehouseSelect = row.querySelector('.user-warehouse');
  const storeId = storeSelect.value;

  warehouseSelect.innerHTML = userWarehouseOptions(storeId);
}

function addUserAssignment() {
  const container = document.getElementById('userAssignments');
  const index = container.querySelectorAll('.user-assignment').length;

  container.insertAdjacentHTML('beforeend', userAssignmentRow(index));
}

function removeUserAssignment(button) {
  button.closest('.user-assignment').remove();
}

function saveUser() {
  const name = document.getElementById('un').value.trim();
  const username = document.getElementById('uu').value.trim();
  const password = document.getElementById('up').value;
  const role = document.getElementById('ur').value;

  if (!name || !username) {
    return alert('Completa el nombre y el usuario.');
  }

  if (db.users.some(u =>
    u.user.toLowerCase() === username.toLowerCase()
  )) {
    return alert('Ese nombre de usuario ya existe.');
  }

  const rows = [
    ...document.querySelectorAll('#userAssignments .user-assignment')
  ];

  if (!rows.length) {
    return alert('Asigna al menos una tienda y un almacén.');
  }

  const assignments = [];

  for (const row of rows) {
    const storeId = row.querySelector('.user-store').value;
    const warehouseId = row.querySelector('.user-warehouse').value;

    if (!storeId || !warehouseId) {
      return alert('Cada asignación debe tener una tienda y un almacén.');
    }

    const warehouse = db.warehouses.find(w =>
      String(w.id) === String(warehouseId) &&
      String(w.storeId) === String(storeId) &&
      w.active !== false
    );

    if (!warehouse) {
      return alert('El almacén seleccionado no corresponde a esa tienda.');
    }

    const duplicate = assignments.some(a =>
      String(a.storeId) === String(storeId) &&
      String(a.warehouseId) === String(warehouseId)
    );

    if (!duplicate) {
      assignments.push({
        storeId: storeId,
        warehouseId: warehouseId
      });
    }
  }

  if (!assignments.length) {
    return alert('Selecciona al menos una asignación válida.');
  }

  db.users.push({
    id: uid(),
    name: name,
    user: username,
    password: password || 'demo',
    role: role,
    active: true,
    storeAssignments: assignments,
    storeIds: [...new Set(assignments.map(a => a.storeId))],
    warehouseIds: [...new Set(assignments.map(a => a.warehouseId))]
  });

  closeModal();
  save();
  render();
}

function salesRows(list=db.sales){return list.slice().reverse().map(s=>`<tr><td>${new Date(s.date).toLocaleString()}</td><td>${esc(s.doc)}</td><td>${esc(s.client)}</td><td>${esc(s.store||'-')}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td><td>${s.status}</td><td>${s.status!=='ANULADA'?`<button class="btn alt" onclick="printSale(${s.id})">Ver/Imprimir</button> <button class="btn alt" onclick="voidSale(${s.id})">Anular</button>`:''}</td></tr>`).join('')||empty(8)}function salesFilter(q){document.getElementById('salesRows').innerHTML='<tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Tienda</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr>'+salesRows(db.sales.filter(s=>(s.doc+s.client).toLowerCase().includes(q.toLowerCase())))}function voidSale(id){let s=db.sales.find(x=>x.id===id);if(!s||s.status==='ANULADA')return;if(!confirm('¿Anular esta venta? La demo revertirá stock y medios de pago.'))return;s.status='ANULADA';for(const i of s.items){let p=db.products.find(x=>x.id===i.id);if(p){let before=stockOf(p,s.storeId);setStock(p,before+i.qty,s.storeId);db.movements.push({id:db.seq.move++,date:new Date().toISOString(),productId:p.id,product:p.name,type:'ENTRADA',before,qty:i.qty,after:stockOf(p,s.storeId),reason:'ANULACIÓN VENTA',storeId:s.storeId,reference:s.doc,user:session.name})}}let c=db.clients.find(x=>x.id===s.clientId),pts=Math.floor(s.total*Number(db.settings.pointsPerSol||0));if(c){c.points=Math.max(0,(c.points||0)-pts);db.pointsLedger.push({id:uid(),date:new Date().toISOString(),clientId:c.id,type:'REVERSE',points:-pts,reference:s.doc})}let payments=s.payments?.length?s.payments:[{method:s.payment,amount:s.total}];const cash=db.cashByStore?.[s.storeId];
if(cash?.open&&cash.paymentTotals&&String(cash.registerId)===String(s.registerId)){
  for(const pmt of payments){
    cash.paymentTotals[pmt.method]=Math.max(
      0,
      (cash.paymentTotals[pmt.method]||0)-Number(pmt.amount||0)
    );

    if(pmt.method==='Efectivo'){
      cash.expected=Math.max(
        cash.opening,
        cash.expected-Number(pmt.amount||0)
      );

      cash.movements.push({
        date:new Date().toISOString(),
        type:'ANULACIÓN',
        detail:s.doc+' · '+pmt.method,
        amount:-Number(pmt.amount||0)
      });
    }
  }
}save();render()}
function exportCSV(){let rows=[['Fecha','Comprobante','Cliente','Pago','Total','Estado'],...db.sales.map(s=>[s.date,s.doc,s.client,s.payment,s.total,s.status])];let csv=rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='smarttuclick-ventas.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function loadPrintLogo(input){const file=input?.files?.[0];if(!file)return;if(file.size>2*1024*1024){alert('El logo debe pesar máximo 2 MB.');input.value='';return}const reader=new FileReader();reader.onload=()=>{db.settings.printLogo=String(reader.result||'');save();render()};reader.onerror=()=>alert('No se pudo leer la imagen del logo.');reader.readAsDataURL(file)}function removePrintLogo(){db.settings.printLogo='';save();render()}
function saveSettings(){db.company.name=companyName.value.trim()||db.company.name;db.company.ruc=companyRuc.value.trim();db.company.igv=Number(igv.value||18)/100;currentStore().name=storeName.value.trim()||currentStore().name;db.settings.strictStock=strictStock.value==='1';db.settings.pointsPerSol=Number(pointsRate.value||0);db.settings.printer=printer.value;for(const k of ['printHeader','printTop','printBottom','printFarewell']){const el=document.getElementById(k);if(el)db.settings[k]=el.value.trim()}for(const k of ['printHeaderOn','printTopOn','printBottomOn','printFarewellOn']){const el=document.getElementById(k);if(el)db.settings[k]=el.checked}save();render()}

function storeForm() {
  modal(
    'Nueva tienda',
    `
      <div class="formgrid">
        <input
          id="stn"
          class="input"
          placeholder="Nombre de la tienda"
        >

        <input
          id="whn"
          class="input"
          placeholder="Nombre del almacén"
        >

        <input
  id="std"
  class="input"
  placeholder="Dirección de la tienda"
>

      </div>
    `,
    `
      <button class="btn good" onclick="saveStore()">
        Crear tienda
      </button>
    `
  );
}

function saveStore() {
  const storeName = document.getElementById('stn').value.trim();

  const storeAddress = document.getElementById('std').value.trim();

  const warehouseName = document.getElementById('whn').value.trim();

  if (!storeName) {
    return alert('El nombre de la tienda es obligatorio');
  }

  if (!warehouseName) {
    return alert('El nombre del almacén es obligatorio');
  }

  const storeId = uid();

  db.stores.push({
  id: storeId,
  name: storeName,
  address: storeAddress,
  code: 'T' + storeId,
  active: true
});

  db.warehouses.push({
    id: uid(),
    storeId: storeId,
    name: warehouseName,
    code: 'A' + storeId,
    active: true
  });

  closeModal();
  save();
  render();
}

function editStore(id) {
  const s = db.stores.find(x => String(x.id) === String(id));
  if (!s) return alert('No se encontró la tienda');

  const warehouses = db.warehouses.filter(w => String(w.storeId) === String(s.id));
  const mainWarehouse = warehouses[0];

  modal(
    'Editar tienda',
    `<div class="formgrid">
      <input id="editStoreName" class="input"
        placeholder="Nombre de la tienda"
        value="${esc(s.name)}">

      <input id="editStoreAddress" class="input"
        placeholder="Dirección de la tienda"
        value="${esc(s.address || '')}">

      <input id="editWarehouseName" class="input"
        placeholder="Nombre del almacén"
        value="${esc(mainWarehouse?.name || '')}">
    </div>`,
    `<button class="btn good" onclick="saveEditedStore('${s.id}')">
      Guardar cambios
    </button>`
  );
}

function saveEditedStore(id) {
  const s = db.stores.find(x => String(x.id) === String(id));
  if (!s) return alert('No se encontró la tienda');

  const name = document.getElementById('editStoreName').value.trim();
  const address = document.getElementById('editStoreAddress').value.trim();
  const warehouseName = document.getElementById('editWarehouseName').value.trim();

  if (!name) return alert('El nombre de la tienda es obligatorio');
  if (!warehouseName) return alert('El nombre del almacén es obligatorio');

  s.name = name;
  s.address = address;

  const warehouse = db.warehouses.find(
    w => String(w.storeId) === String(s.id)
  );

  if (warehouse) {
    warehouse.name = warehouseName;
  }

  save();
  closeModal();
  render();
}

function toggleStore(id){
  const s = db.stores.find(x => String(x.id) === String(id));
  if(!s) return alert('No se encontró la tienda');

  if(s.active && db.stores.filter(x => x.active).length <= 1){
    return alert('No puedes desactivar la única tienda activa');
  }

  const action = s.active ? 'desactivar' : 'activar';
  if(!confirm(`¿Deseas ${action} la tienda "${s.name}"?`)) return;

  s.active = !s.active;
  save();
  render();
}




function deleteStore(id) {
  const s = db.stores.find(x => String(x.id) === String(id));
  if (!s) return alert('No se encontró la tienda');

  if (!confirm(`¿Seguro que deseas borrar la tienda "${s.name}"?`)) return;

  db.stores = db.stores.filter(x => String(x.id) !== String(id));
  save();
  render();
}



function modal(title,body,actions){document.getElementById('modalHost')?.remove();document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="modalHost"><div class="modalbox"><div class="section-title"><h3>${esc(title)}</h3><button class="iconbtn" onclick="closeModal()">×</button></div>${body}<div class="modalactions">${actions}<button class="btn alt" onclick="closeModal()">Cancelar</button></div></div></div>`)}function closeModal(){document.getElementById('modalHost')?.remove()}
function resetDemo(){if(confirm('Esto borrará los datos locales de SmartTuClick y volverá a la demo inicial.')){localStorage.removeItem(KEY);db=clone(seed);session=null;localStorage.removeItem(SESSION_KEY);view='dashboard';render()}}
function editUser(id) {
  const u = db.users.find(x => String(x.id) === String(id));
  if (!u) return alert('No se encontró el usuario.');

  const assignments = u.storeAssignments?.length
    ? u.storeAssignments
    : (u.storeIds || []).map(storeId => ({
        storeId,
        warehouseId: (u.warehouseIds || []).find(wid =>
          db.warehouses.some(w =>
            String(w.id) === String(wid) &&
            String(w.storeId) === String(storeId)
          )
        ) || ''
      }));

  const rows = assignments.length ? assignments : [{}];

  modal('Editar usuario', `
    <div class="formgrid">
      <input id="un" class="input" value="${esc(u.name)}" placeholder="Nombre">
      <input id="uu" class="input" value="${esc(u.user)}" placeholder="Usuario">
      <input id="up" class="input" type="password" placeholder="Nueva contraseña (opcional)">

      <select id="ur" class="input">
        ${Object.keys(db.roles).map(r =>
          `<option value="${esc(r)}" ${u.role === r ? 'selected' : ''}>${esc(r)}</option>`
        ).join('')}
      </select>

      <select id="ua" class="input">
        <option value="1" ${u.active ? 'selected' : ''}>Activo</option>
        <option value="0" ${!u.active ? 'selected' : ''}>Inactivo</option>
      </select>
    </div>

    <h4 style="margin-top:18px">Tiendas y almacenes asignados</h4>

    <div id="userAssignments">
      ${rows.map((a, i) => `
        <div class="card user-assignment" style="margin-top:12px">
          <div class="formgrid">
            <label>Tienda
              <select class="input user-store"
                onchange="refreshUserWarehouses(this)">
                ${userStoreOptions(a.storeId ?? '')}
              </select>
            </label>
            <label>Almacén
              <select class="input user-warehouse">
                ${userWarehouseOptions(a.storeId ?? '', a.warehouseId ?? '')}
              </select>
            </label>
          </div>
          ${i > 0 ? `<button type="button" class="btn danger"
            onclick="removeUserAssignment(this)">Quitar asignación</button>` : ''}
        </div>
      `).join('')}
    </div>

    <button type="button" class="btn alt" style="margin-top:12px"
      onclick="addUserAssignment()">+ Agregar otra tienda y almacén</button>
  `, `
    <button class="btn good" onclick="updateUser('${u.id}')">Guardar cambios</button>
    <button class="btn danger" onclick="deleteUser('${u.id}')">Eliminar usuario</button>
  `);
}

function updateUser(id) {
  const u = db.users.find(x => String(x.id) === String(id));
  if (!u) return alert('No se encontró el usuario.');

  const name = document.getElementById('un').value.trim();
  const username = document.getElementById('uu').value.trim();
  const password = document.getElementById('up').value;
  const role = document.getElementById('ur').value;
  const active = document.getElementById('ua').value === '1';

  if (!name || !username) return alert('Completa nombre y usuario.');

  if (db.users.some(x =>
    String(x.id) !== String(id) &&
    x.user.toLowerCase() === username.toLowerCase()
  )) return alert('Ese usuario ya existe.');

  if (u.id === session.id && !active) {
    return alert('No puedes desactivar tu propio usuario.');
  }

  const assignments = [];

  for (const row of document.querySelectorAll('#userAssignments .user-assignment')) {
    const storeId = row.querySelector('.user-store').value;
    const warehouseId = row.querySelector('.user-warehouse').value;

    const warehouse = db.warehouses.find(w =>
      String(w.id) === String(warehouseId) &&
      String(w.storeId) === String(storeId) &&
      w.active !== false
    );

    if (!storeId || !warehouse) {
      return alert('Revisa las tiendas y los almacenes asignados.');
    }

    if (!assignments.some(a =>
      String(a.storeId) === String(storeId) &&
      String(a.warehouseId) === String(warehouseId)
    )) {
      assignments.push({ storeId, warehouseId });
    }
  }

  if (!assignments.length) {
    return alert('Asigna al menos una tienda y un almacén.');
  }

  u.name = name;
  u.user = username;
  u.role = role;
  u.active = active;
  u.storeAssignments = assignments;
  u.storeIds = [...new Set(assignments.map(a => a.storeId))];
  u.warehouseIds = [...new Set(assignments.map(a => a.warehouseId))];

  if (password) u.password = password;

  if (String(u.id) === String(session.id)) session = u;

  audit('MODIFICAR', 'USUARIO', u.user);
  closeModal();
  save();
  render();
}

function deleteUser(id) {
  const u = db.users.find(x => String(x.id) === String(id));
  if (!u) return alert('No se encontró el usuario.');

  if (String(u.id) === String(session.id)) {
    return alert('No puedes eliminar tu propio usuario.');
  }

  if (!confirm(`¿Eliminar definitivamente al usuario "${u.user}"?`)) return;

  audit('ELIMINAR', 'USUARIO', u.user);
  db.users = db.users.filter(x => String(x.id) !== String(id));

  save();
  closeModal();
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
