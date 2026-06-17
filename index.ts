<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markwood Chef Orders</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
:root{
  /* Markwood brand tokens — sampled from BrandGuide.jpeg + memory canon */
  --brown:#4A2017; --maroon:#A8331D; --blush:#EACDC5; --cream:#FAE7D9;
  --bg:var(--cream); --card:#FFFFFF; --ink:var(--brown); --muted:#8A6F62;
  --line:#E8D2C5; --accent:var(--maroon); --accent-ink:#FFFFFF;
  /* functional-only additions, not in brand guide — kept desaturated
     so they support rather than compete with the brand palette */
  --good:#5B7A53; --good-bg:#EAF1E6; --warn:#C97A2E; --warn-bg:#FBEEDD;
  --danger:#A8331D; --danger-bg:#F6E2DC;
  --radius:14px; --radius-sm:8px; --shadow:0 2px 10px rgba(74,32,23,.08);
  --shadow-lift:0 8px 24px rgba(74,32,23,.14);
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5}
h1,h2,h3{font-family:"Montserrat",sans-serif;font-weight:700}
.mono{font-family:"IBM Plex Mono",monospace;font-weight:500}
button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,select,textarea{font:inherit;color:inherit;width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:2px solid var(--maroon);outline-offset:1px}
label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin:14px 0 5px}
a{color:var(--maroon)}
.hidden{display:none !important}

/* ===== App shell ===== */
#app{min-height:100vh;display:flex;flex-direction:column}
header.appbar{background:var(--brown);color:#fff;position:sticky;top:0;z-index:50;box-shadow:var(--shadow)}
.appbar-inner{display:flex;align-items:center;gap:12px;padding:14px 20px;max-width:1100px;margin:0 auto}
.brand-mark{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.brand-mark svg{width:30px;height:30px;flex:none}
.brand-mark .name{font-family:"Montserrat",sans-serif;font-weight:800;font-size:17px;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand-mark .sub{font-size:11px;color:var(--blush);font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.appbar-actions{display:flex;align-items:center;gap:14px;flex:none}
.appbar-actions button{font-size:13px;font-weight:600;color:var(--blush);padding:8px 4px;white-space:nowrap}
.appbar-actions button:hover{color:#fff}
.role-pill{font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;background:rgba(255,255,255,.15);color:#fff;padding:4px 10px;border-radius:20px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
@media (max-width:480px){
  .appbar-inner{padding:12px 16px}
  .brand-mark .name{font-size:15px}
  .role-pill{display:none} /* role is already implied by content; saves cramped space on phones */
  .appbar-actions{gap:10px}
}

main{flex:1;max-width:1100px;width:100%;margin:0 auto;padding:24px 20px 60px}

/* ===== Login screen ===== */
#loginScreen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cream);padding:24px}
.login-card{background:#fff;border-radius:var(--radius);box-shadow:var(--shadow-lift);padding:40px 36px;max-width:380px;width:100%;text-align:center}
.login-card svg{width:54px;height:54px;margin-bottom:14px}
.login-card h1{font-size:22px;color:var(--brown);margin-bottom:4px}
.login-card .tag{font-size:13px;color:var(--muted);margin-bottom:26px}
.login-card label{text-align:left}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border-radius:var(--radius-sm);font-weight:700;font-size:14px;transition:transform .08s ease,box-shadow .15s ease}
.btn-primary{background:var(--maroon);color:#fff;width:100%;margin-top:18px}
.btn-primary:hover{box-shadow:0 4px 14px rgba(168,51,29,.35)}
.btn-primary:active{transform:scale(.98)}
.btn-primary:disabled{opacity:.6;cursor:default}
.btn-ghost{background:transparent;color:var(--maroon);border:1.5px solid var(--blush)}
.btn-ghost:hover{background:var(--cream)}
.login-err{color:var(--danger);font-size:13px;margin-top:10px;min-height:18px}
.login-note{font-size:12px;color:var(--muted);margin-top:22px}
.magic-sent{background:var(--good-bg);color:var(--good);border-radius:var(--radius-sm);padding:14px;font-size:13px;margin-top:18px;text-align:left;display:none}

/* ===== Nav tabs (staff + chef share this) ===== */
.tabs{display:flex;gap:6px;margin-bottom:24px;border-bottom:1px solid var(--line);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:10px 4px;font-weight:700;font-size:14px;color:var(--muted);border-bottom:3px solid transparent;white-space:nowrap;margin-right:18px;flex:none}
.tab.active{color:var(--brown);border-bottom-color:var(--maroon)}
@media (max-width:480px){
  main{padding:18px 14px 70px}
  .tab{font-size:13px;margin-right:14px}
}

/* ===== Cards / generic ===== */
.card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px}
.section-title{font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.empty-state{text-align:center;padding:50px 20px;color:var(--muted)}
.empty-state svg{width:40px;height:40px;margin-bottom:12px;opacity:.5}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px}
.pill.good{background:var(--good-bg);color:var(--good)}
.pill.warn{background:var(--warn-bg);color:var(--warn)}
.pill.danger{background:var(--danger-bg);color:var(--danger)}
.pill.muted{background:var(--blush);color:var(--brown)}
.spinner{width:22px;height:22px;border:3px solid var(--blush);border-top-color:var(--maroon);border-radius:50%;animation:spin .7s linear infinite;margin:30px auto}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--brown);color:#fff;padding:12px 22px;border-radius:30px;font-size:13px;font-weight:600;box-shadow:var(--shadow-lift);z-index:200;opacity:0;transition:opacity .25s ease}
.toast.show{opacity:1}

/* ===== Board (signature element) ===== */
.board-intro{margin-bottom:16px}
.board-intro h2{font-size:21px;margin-bottom:6px}
.board-intro p{font-size:13px;color:var(--muted);max-width:560px}
.board-card{padding:6px}
.board-row{padding:16px 14px;border-bottom:1px solid var(--cream)}
.board-row:last-child{border-bottom:none}
.board-row-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.board-species{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px}
.board-species .dot{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.board-price{font-weight:600;font-size:14px;color:var(--maroon)}
.conf-bar-track{position:relative;height:10px;background:var(--cream);border-radius:6px;overflow:visible}
.conf-bar-fill{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,var(--blush),var(--maroon));border-radius:6px}
.conf-bar-marker{position:absolute;top:-3px;width:4px;height:16px;background:var(--brown);border-radius:2px;transform:translateX(-2px)}
.conf-bar-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:6px}
.conf-bar-best{font-weight:700;color:var(--brown)}
.board-row-order{display:flex;align-items:center;gap:10px;margin-top:12px}
.qty-input{width:90px;text-align:right;font-family:"IBM Plex Mono",monospace;font-weight:600}
.btn-sm{padding:8px 12px;font-size:12px}
.special-row{display:flex;align-items:center;justify-content:space-between;padding:10px 4px;border-bottom:1px solid var(--cream)}
.special-row:last-child{border-bottom:none}
.sticky-cart-bar{position:fixed;bottom:0;left:0;right:0;background:var(--maroon);color:#fff;padding:16px 20px;display:none;align-items:center;justify-content:space-between;font-weight:700;cursor:pointer;box-shadow:0 -4px 14px rgba(74,32,23,.2);max-width:1100px;margin:0 auto;border-radius:var(--radius) var(--radius) 0 0}
.sticky-cart-bar.show{display:flex}

/* ===== Cart ===== */
.cart-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--cream);flex-wrap:wrap}
.cart-row > div:first-child{flex:1;min-width:120px}
.cart-row .cart-row-controls{display:flex;align-items:center;gap:12px;margin-left:auto}
.cart-total{display:flex;justify-content:space-between;font-weight:700;padding-top:14px;margin-top:6px;border-top:2px solid var(--cream)}
.order-card-top{display:flex;align-items:center;justify-content:space-between}
.order-item-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:var(--muted)}
@media (max-width:480px){
  .cart-row{flex-direction:column;align-items:stretch}
  .cart-row .cart-row-controls{margin-left:0;width:100%}
  .cart-row .qty-input{flex:none;width:80px}
}

/* ===== Staff admin ===== */
.summary-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cream);gap:12px;flex-wrap:wrap}
.summary-row:last-child{border-bottom:none}
.summary-row-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.summary-row-left .dot{width:10px;height:10px;border-radius:50%;flex:none}
.price-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--cream)}
.price-row:last-child{border-bottom:none}
</style>
</head>
<body>

<div id="loginScreen">
  <div class="login-card">
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" stroke="#4A2017" stroke-width="3"/>
      <path d="M18 30c0-9 7-15 14-15s14 6 14 15c-3-2-9-3-14-3s-11 1-14 3z" fill="#4A2017"/>
      <path d="M27 30c0 8 1 16 5 22 4-6 5-14 5-22" stroke="#4A2017" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <h1 id="loginTitle">Markwood Chef Orders</h1>
    <p class="tag" id="loginTag">Sign in to see what's fresh and place your order</p>

    <div id="loginFormWrap">
      <label for="login_email">Email</label>
      <input id="login_email" type="email" autocomplete="email" placeholder="you@restaurant.com.au">
      <button class="btn btn-primary" id="login_btn" onclick="doMagicLink()">Send me a sign-in link</button>
      <div class="login-err" id="login_err"></div>
      <div class="magic-sent" id="magicSent">Check your email — we've sent a sign-in link. It'll log you straight in, no password needed.</div>
    </div>

    <p class="login-note" id="staffToggleNote">
      Staff? <button class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="showStaffLogin()">Sign in with password</button>
    </p>
    <div id="staffLoginWrap" class="hidden" style="margin-top:18px;text-align:left">
      <label for="staff_pw">Password</label>
      <input id="staff_pw" type="password" autocomplete="current-password">
      <button class="btn btn-primary" onclick="doStaffLogin()">Sign in</button>
    </div>
  </div>
</div>

<div id="app" class="hidden">
  <header class="appbar">
    <div class="appbar-inner">
      <div class="brand-mark">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" stroke="#FAE7D9" stroke-width="3"/>
          <path d="M18 30c0-9 7-15 14-15s14 6 14 15c-3-2-9-3-14-3s-11 1-14 3z" fill="#FAE7D9"/>
          <path d="M27 30c0 8 1 16 5 22 4-6 5-14 5-22" stroke="#FAE7D9" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <div>
          <div class="name">Markwood Chef Orders</div>
          <div class="sub" id="appSubtitle">Wholesale</div>
        </div>
      </div>
      <div class="appbar-actions">
        <span class="role-pill" id="rolePill">Chef</span>
        <button onclick="doSignOut()">Sign out</button>
      </div>
    </div>
  </header>
  <main id="mainContent">
    <div class="spinner"></div>
  </main>
</div>

<div class="toast" id="toast"></div>

<script>
/* ================= CONFIG ================= */
const SUPABASE_URL = "https://jckfsvjodrrauwvpecks.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja2ZzdmpvZHJyYXV3dnBlY2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODk4NTgsImV4cCI6MjA5NjU2NTg1OH0.ECtXTPKstyRW3Q_au5oucobZ1Axw44SDZXz368wNi4g";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const APP_VERSION = "0.1.0";

const $ = id => document.getElementById(id);
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"), 2600); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* ================= STATE ================= */
let currentUser=null;     // auth.users row (session.user)
let myChefRow=null;       // mn_chefs row if this user is a chef, else null
let isStaff=false;
let currentTab="board";   // routing within either chef or staff view

/* ================= AUTH ================= */
function showStaffLogin(){
  $("staffLoginWrap").classList.remove("hidden");
  $("staffToggleNote").classList.add("hidden");
}

async function doMagicLink(){
  const email=$("login_email").value.trim();
  const err=$("login_err"), btn=$("login_btn");
  if(!email){ err.textContent="Enter your email address."; return; }
  err.textContent=""; btn.disabled=true; btn.textContent="Sending…";
  const {error}=await db.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin+location.pathname } });
  btn.disabled=false; btn.textContent="Send me a sign-in link";
  if(error){ err.textContent=error.message; return; }
  $("magicSent").style.display="block";
}

async function doStaffLogin(){
  const email=$("login_email").value.trim();
  const pw=$("staff_pw").value;
  const err=$("login_err");
  if(!email||!pw){ err.textContent="Enter your email and password."; return; }
  const {error}=await db.auth.signInWithPassword({ email, password: pw });
  if(error){ err.textContent=error.message; return; }
}

async function doSignOut(){
  await db.auth.signOut();
  currentUser=null; myChefRow=null; isStaff=false;
}

function showLoginScreen(){
  $("loginScreen").classList.remove("hidden");
  $("app").classList.add("hidden");
}
function showApp(){
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
}

async function resolveIdentity(user){
  // Determine staff vs chef the same way the SQL helper does:
  // a chef is anyone with a matching mn_chefs.user_id row.
  const {data, error} = await db.from("mn_chefs").select("*").eq("user_id", user.id).maybeSingle();
  if(error){ console.warn("Couldn't resolve chef identity", error); }
  if(data){
    myChefRow = data; isStaff = false;
    $("rolePill").textContent = data.business_name || "Chef";
    $("appSubtitle").textContent = "Chef ordering";
  } else {
    myChefRow = null; isStaff = true;
    $("rolePill").textContent = "Staff";
    $("appSubtitle").textContent = "Staff admin";
  }
}

db.auth.onAuthStateChange(async (event, session)=>{
  if(session?.user){
    currentUser=session.user;
    await resolveIdentity(session.user);
    showApp();
    if(event==="SIGNED_IN"||event==="INITIAL_SESSION"){
      boot();
    }
  } else {
    showLoginScreen();
  }
});

/* ================= DATA LAYER ================= */
// Shared reference data + read-only batch-tracker data, loaded once per boot.
let batches=[], movements=[], harvests=[], priceList=[], yieldDefaults=[];
let chefs=[]; // staff only

async function loadSharedData(){
  const [b, m, h, pl, yd] = await Promise.all([
    db.from("mn_batches").select("*"),
    db.from("mn_movements").select("*"),
    db.from("mn_harvests").select("*"),
    db.from("mn_price_list").select("*"),
    db.from("mn_yield_defaults").select("*"),
  ]);
  batches = b.data||[]; movements = m.data||[]; harvests = h.data||[];
  priceList = pl.data||[]; yieldDefaults = yd.data||[];
}

function priceFor(species){ return priceList.find(p=>p.species===species) || null; }
function yieldFor(species){ return yieldDefaults.find(y=>y.species===species) || null; }

/* ----- Block-state accounting, mirrors batch-tracker's own logic -----
   A block's current state is derived by replaying its movements.
   We don't have per-block IDs (block_sizes is a count+kg aggregate), so
   we reconstruct state counts per batch the same way batch-tracker does:
   blocks_total all start "incubating", then movements shift counts
   between states. We sum movements by (batch, to_state) minus (batch, from_state). */
function batchStateCounts(batch){
  const counts = { incubating: batch.blocks_total||0, fruiting:0, complete:0, contaminated:0, failed:0, culled:0 };
  const mvs = movements.filter(m=>m.batch_id===batch.id);
  for(const m of mvs){
    counts[m.from_state] = (counts[m.from_state]||0) - (m.count||0);
    counts[m.to_state]   = (counts[m.to_state]||0)   + (m.count||0);
  }
  return counts;
}

/* ----- This week's availability board -----
   For every species with blocks CURRENTLY in 'fruiting', predict a
   conservative kg range from yield defaults. Blend in actual harvest
   weight already logged in the last 7 days (that's real, not predicted).
   Output sorted by total conservative estimate, descending. */
function computeAvailabilityBoard(){
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
  const bySpecies = {};

  for(const b of batches){
    if(b.archived) continue;
    const counts = batchStateCounts(b);
    const fruitingBlocks = counts.fruiting||0;
    if(fruitingBlocks<=0) continue;
    const yd = yieldFor(b.species);
    if(!bySpecies[b.species]) bySpecies[b.species]={ species:b.species, predictedLow:0, predictedHigh:0, fruitingBlocks:0, actualKgThisWeek:0, batchIds:[] };
    const entry = bySpecies[b.species];
    entry.fruitingBlocks += fruitingBlocks;
    entry.batchIds.push(b.id);
    if(yd){
      entry.predictedLow  += fruitingBlocks * yd.yield_kg_per_block_low;
      entry.predictedHigh += fruitingBlocks * yd.yield_kg_per_block_high;
    }
  }

  // fold in actual harvests from the last 7 days, regardless of current block state
  // (a block may have already moved to 'complete' after being picked — still counts as "available this week")
  for(const h of harvests){
    const hd = new Date(h.harvest_date);
    if(hd < sevenDaysAgo) continue;
    const batch = batches.find(b=>b.id===h.batch_id);
    if(!batch) continue;
    if(!bySpecies[batch.species]) bySpecies[batch.species]={ species:batch.species, predictedLow:0, predictedHigh:0, fruitingBlocks:0, actualKgThisWeek:0, batchIds:[] };
    bySpecies[batch.species].actualKgThisWeek += (h.weight_g||0)/1000;
  }

  const list = Object.values(bySpecies).map(e=>{
    // "tiny bit conservative": lean toward the low end rather than midpoint
    const conservative = e.predictedLow + 0.25*(e.predictedHigh - e.predictedLow);
    // once we have actuals, blend them in as a floor — real picked stock is never less available than predicted
    const displayLow  = Math.max(e.predictedLow, e.actualKgThisWeek);
    const displayHigh = Math.max(e.predictedHigh, e.actualKgThisWeek);
    const displayConservative = Math.max(conservative, e.actualKgThisWeek);
    return {...e, conservative, displayLow, displayHigh, displayConservative};
  });
  list.sort((a,b)=> b.displayConservative - a.displayConservative);
  return list;
}

function fmtKg(n){ return (Math.round(n*10)/10).toString(); }

/* ================= CHEF APP ================= */
let chefOrders=[], chefStandingOrders=[];
let cart={}; // species -> qty_kg

async function loadChefOnlyData(){
  if(!myChefRow) return;
  const [o, so] = await Promise.all([
    db.from("mn_orders").select("*, mn_order_items(*)").eq("chef_id", myChefRow.id).order("created_at",{ascending:false}),
    db.from("mn_standing_orders").select("*, mn_standing_order_items(*)").eq("chef_id", myChefRow.id),
  ]);
  chefOrders = o.data||[];
  chefStandingOrders = so.data||[];
}

function renderChefApp(){
  $("mainContent").innerHTML = `
    <div class="tabs">
      <button class="tab ${currentTab==='board'?'active':''}" onclick="setChefTab('board')">This week's board</button>
      <button class="tab ${currentTab==='cart'?'active':''}" onclick="setChefTab('cart')">Your order ${cartCount()?`(${cartCount()})`:''}</button>
      <button class="tab ${currentTab==='history'?'active':''}" onclick="setChefTab('history')">Order history</button>
      <button class="tab ${currentTab==='standing'?'active':''}" onclick="setChefTab('standing')">Standing orders</button>
    </div>
    <div id="chefTabContent"></div>
  `;
  renderChefTab();
}
function setChefTab(t){ currentTab=t; renderChefApp(); }
function cartCount(){ return Object.values(cart).filter(q=>q>0).length; }

function renderChefTab(){
  const el=$("chefTabContent");
  if(currentTab==="board") el.innerHTML = renderBoardView();
  else if(currentTab==="cart") el.innerHTML = renderCartView();
  else if(currentTab==="history") el.innerHTML = renderHistoryView();
  else if(currentTab==="standing") el.innerHTML = renderStandingView();
}

/* ----- THE BOARD (signature element) ----- */
function renderBoardView(){
  const board = computeAvailabilityBoard();
  const specials = priceList.filter(p=>p.special_only);

  if(!board.length){
    return `<div class="card empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <div>Nothing's actively fruiting right now — check back soon, or ask about special order items below.</div>
    </div>`;
  }

  const rows = board.map(e=>{
    const price = priceFor(e.species);
    const priceLabel = price?.unit_price_per_kg ? `$${price.unit_price_per_kg.toFixed(2)}/kg` : "POA";
    const hasActual = e.actualKgThisWeek>0;
    const barMax = Math.max(e.displayHigh * 1.15, 1); // headroom so the high end isn't flush against the edge
    const lowPct = Math.min(100,(e.displayLow/barMax)*100);
    const highPct = Math.min(100,(e.displayHigh/barMax)*100);
    const conservativePct = Math.min(100,(e.displayConservative/barMax)*100);
    const bandWidthPct = Math.max(highPct-lowPct, 1.5); // keep a sliver visible even for a tight/confirmed band
    return `
    <div class="board-row" data-species="${e.species}">
      <div class="board-row-top">
        <div class="board-species">
          <span class="dot" style="background:${speciesColor(e.species)}"></span>
          <span>${e.species}</span>
          ${hasActual?`<span class="pill good" style="margin-left:8px">picked</span>`:`<span class="pill muted" style="margin-left:8px">predicted</span>`}
        </div>
        <div class="board-price mono">${priceLabel}</div>
      </div>
      <div class="conf-bar">
        <div class="conf-bar-track">
          <div class="conf-bar-fill" style="left:${lowPct}%;width:${bandWidthPct}%"></div>
          <div class="conf-bar-marker" style="left:${conservativePct}%" title="Conservative estimate"></div>
        </div>
        <div class="conf-bar-labels mono">
          <span>${fmtKg(e.displayLow)}kg</span>
          <span class="conf-bar-best">~${fmtKg(e.displayConservative)}kg likely</span>
          <span>${fmtKg(e.displayHigh)}kg</span>
        </div>
      </div>
      <div class="board-row-order">
        <input type="number" min="0" step="0.5" placeholder="kg" class="qty-input" id="qty_${cssId(e.species)}" value="${cart[e.species]||''}" oninput="setCartQty('${escSpecies(e.species)}', this.value)">
        <button class="btn btn-ghost btn-sm" onclick="addRepeatLast('${escSpecies(e.species)}')" title="Add what you ordered last time">↻ last order</button>
      </div>
    </div>`;
  }).join("");

  const specialsHtml = specials.length ? `
    <div class="section-title" style="margin-top:28px">Special order items — ask for a quote</div>
    <div class="card">
      ${specials.map(s=>`
        <div class="special-row">
          <div>${s.species}${s.notes?` <span style="color:var(--muted);font-size:12px">· ${s.notes}</span>`:''}</div>
          <button class="btn btn-ghost btn-sm" onclick="requestSpecialQuote('${escSpecies(s.species)}')">Request quote</button>
        </div>`).join("")}
    </div>` : "";

  return `
    <div class="board-intro">
      <h2>What's good this week</h2>
      <p>Predicted from what's currently fruiting in the growing rooms, with picked stock confirmed as it comes in. The dot on each bar is our honest best guess — we'd rather under-promise.</p>
    </div>
    <div class="card board-card">${rows}</div>
    ${specialsHtml}
    <div class="sticky-cart-bar ${cartCount()?'show':''}" onclick="setChefTab('cart')">
      <span>${cartCount()} item${cartCount()===1?'':'s'} in your order</span>
      <span class="mono">Review →</span>
    </div>
  `;
}

function cssId(s){ return s.replace(/[^a-zA-Z0-9]/g,'_'); }
function escSpecies(s){ return s.replace(/'/g,"\\'"); }

// Stable colour per species so the board has visual rhythm without being garish.
const SPECIES_PALETTE = {
  "Snow White Oyster":"#E8E2D5","Warm White Oyster":"#E3C9A8","Blue Oyster":"#5E7FA3",
  "Chocolate Oyster":"#6B4226","Pink Oyster":"#C96A82","Black-Pearl King Oyster":"#3A3A3A",
  "Lion's Mane":"#D8C18A","Coral Tooth":"#E0B7A0","Chestnut":"#8A5A33","Golden Enoki":"#E8B84B",
  "Maitake":"#7A6651","Shiitake":"#5C3A28","Reishi":"#A8331D","Turkey Tail":"#7B8B6F"
};
function speciesColor(s){ return SPECIES_PALETTE[s] || "#A8331D"; }

function setCartQty(species, val){
  const q = parseFloat(val);
  if(!q || q<=0) delete cart[species]; else cart[species]=q;
  // update sticky bar + cart tab badge without a full re-render (keeps focus in the input)
  const bar = document.querySelector(".sticky-cart-bar");
  if(bar){ bar.classList.toggle("show", cartCount()>0); bar.querySelector("span").textContent = `${cartCount()} item${cartCount()===1?'':'s'} in your order`; }
}

function addRepeatLast(species){
  const last = chefOrders.find(o => o.mn_order_items?.some(i=>i.species===species));
  const item = last?.mn_order_items?.find(i=>i.species===species);
  if(!item){ toast("No previous order for this item yet"); return; }
  cart[species]=item.qty_kg;
  const input=$("qty_"+cssId(species)); if(input) input.value=item.qty_kg;
  toast(`Added ${fmtKg(item.qty_kg)}kg — same as last time`);
  setCartQty(species, item.qty_kg);
}

function requestSpecialQuote(species){
  cart[species] = cart[species] || 1;
  toast(`Added ${species} to your order as a quote request`);
  setChefTab('cart');
}

/* ----- CART / CHECKOUT ----- */
function renderCartView(){
  const items = Object.entries(cart).filter(([,q])=>q>0);
  if(!items.length){
    return `<div class="card empty-state">
      <div>Your order is empty. Head back to the board to add some mushrooms.</div>
      <button class="btn btn-ghost" style="margin-top:14px" onclick="setChefTab('board')">← Back to the board</button>
    </div>`;
  }
  let total=0, hasQuoteItems=false;
  const rows = items.map(([species,qty])=>{
    const price=priceFor(species);
    const lineTotal = price?.unit_price_per_kg ? price.unit_price_per_kg*qty : null;
    if(lineTotal!=null) total+=lineTotal; else hasQuoteItems=true;
    return `<div class="cart-row">
      <div>
        <div style="font-weight:600">${species}</div>
        <div style="font-size:12px;color:var(--muted)">${price?.unit_price_per_kg?`$${price.unit_price_per_kg.toFixed(2)}/kg`:'Price on request'}</div>
      </div>
      <div class="cart-row-controls">
        <input type="number" min="0" step="0.5" class="qty-input" value="${qty}" oninput="setCartQty('${escSpecies(species)}', this.value); renderChefTab()">
        <div class="mono" style="width:70px;text-align:right">${lineTotal!=null?'$'+lineTotal.toFixed(2):'—'}</div>
        <button class="btn-ghost btn-sm" onclick="setCartQty('${escSpecies(species)}', 0); renderChefTab()" style="border:none;color:var(--danger)">✕</button>
      </div>
    </div>`;
  }).join("");

  return `
    <div class="card">
      <div class="section-title">Your order</div>
      ${rows}
      <div class="cart-total">
        <span>Estimated total</span>
        <span class="mono">${hasQuoteItems?'+ quote items · ':''}$${total.toFixed(2)}</span>
      </div>
      <label for="order_date">When do you need this?</label>
      <input type="date" id="order_date" value="${nextWeekday(2)}">
      <label for="order_notes">Notes for Adam &amp; Em (optional)</label>
      <textarea id="order_notes" rows="2" placeholder="Delivery instructions, substitution preferences, etc."></textarea>
      <button class="btn btn-primary" onclick="submitOrder()">Place order</button>
    </div>
  `;
}

function nextWeekday(dayOfWeek){
  const d=new Date(); const diff=(dayOfWeek+7-d.getDay())%7 || 7;
  d.setDate(d.getDate()+diff); return d.toISOString().slice(0,10);
}

async function submitOrder(){
  const items = Object.entries(cart).filter(([,q])=>q>0);
  if(!items.length) return;
  const requested_date = $("order_date").value || todayISO();
  const notes = $("order_notes").value.trim() || null;

  const {data:order, error} = await db.from("mn_orders").insert({
    chef_id: myChefRow.id, order_source:'self', status:'pending', requested_date, notes
  }).select().single();
  if(error){ toast("Couldn't place order: "+error.message); return; }

  const itemRows = items.map(([species,qty])=>{
    const price=priceFor(species);
    return { order_id:order.id, species, qty_kg:qty, unit_price_per_kg: price?.unit_price_per_kg ?? null, is_special_request: !!price?.special_only };
  });
  const {error:itemErr} = await db.from("mn_order_items").insert(itemRows);
  if(itemErr){ toast("Order created but items failed to save: "+itemErr.message); return; }

  cart={};
  toast("Order placed — Adam & Em will confirm shortly");
  await loadChefOnlyData();
  setChefTab('history');
}

/* ----- ORDER HISTORY ----- */
const STATUS_PILL = { pending:"warn", confirmed:"good", fulfilled:"good", cancelled:"danger" };
function renderHistoryView(){
  if(!chefOrders.length) return `<div class="card empty-state">No orders yet — place your first one from the board.</div>`;
  return chefOrders.map(o=>{
    const items=o.mn_order_items||[];
    const total=items.reduce((s,i)=> s + (i.unit_price_per_kg ? i.unit_price_per_kg*i.qty_kg : 0), 0);
    return `<div class="card" style="margin-bottom:14px">
      <div class="order-card-top">
        <div>
          <div style="font-weight:700">${new Date(o.created_at).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} · for ${new Date(o.requested_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div>
          <div style="font-size:12px;color:var(--muted)">${items.length} item${items.length===1?'':'s'}</div>
        </div>
        <span class="pill ${STATUS_PILL[o.status]||'muted'}">${o.status}</span>
      </div>
      <div style="margin-top:10px">
        ${items.map(i=>`<div class="order-item-row"><span>${i.species}</span><span class="mono">${fmtKg(i.qty_kg)}kg</span></div>`).join("")}
      </div>
      <div class="cart-total" style="margin-top:10px"><span>Total</span><span class="mono">$${total.toFixed(2)}</span></div>
    </div>`;
  }).join("");
}

/* ----- STANDING ORDERS ----- */
function renderStandingView(){
  const list = chefStandingOrders.map(so=>{
    const items=so.mn_standing_order_items||[];
    return `<div class="card" style="margin-bottom:14px">
      <div class="order-card-top">
        <div style="font-weight:700">${so.name}</div>
        <button class="btn btn-ghost btn-sm" onclick="useStandingOrder('${so.id}')">Add to cart</button>
      </div>
      <div style="margin-top:10px">${items.map(i=>`<div class="order-item-row"><span>${i.species}</span><span class="mono">${fmtKg(i.qty_kg)}kg</span></div>`).join("")}</div>
    </div>`;
  }).join("");
  return `
    <div class="card empty-state" style="margin-bottom:14px;text-align:left;padding:18px 20px">
      <div style="font-weight:700;margin-bottom:6px;color:var(--ink)">Save your current cart as a standing order</div>
      <div style="font-size:13px;margin-bottom:12px">Next time, add it all back with one tap from this tab.</div>
      <input id="standing_name" placeholder="e.g. Tuesday delivery" style="margin-bottom:10px">
      <button class="btn btn-primary" onclick="saveStandingOrder()">Save current cart as standing order</button>
    </div>
    ${list || `<div class="card empty-state">No standing orders saved yet.</div>`}
  `;
}

async function saveStandingOrder(){
  const items = Object.entries(cart).filter(([,q])=>q>0);
  if(!items.length){ toast("Add items to your cart first"); return; }
  const name = $("standing_name").value.trim() || "Usual order";
  const {data:so,error} = await db.from("mn_standing_orders").insert({chef_id:myChefRow.id, name}).select().single();
  if(error){ toast("Couldn't save: "+error.message); return; }
  const rows = items.map(([species,qty])=>({standing_order_id:so.id, species, qty_kg:qty}));
  await db.from("mn_standing_order_items").insert(rows);
  toast("Standing order saved");
  await loadChefOnlyData();
  renderChefTab();
}

function useStandingOrder(id){
  const so = chefStandingOrders.find(s=>s.id===id);
  if(!so) return;
  for(const item of (so.mn_standing_order_items||[])) cart[item.species]=item.qty_kg;
  toast(`Added "${so.name}" to your cart`);
  setChefTab('cart');
}

/* ================= STAFF APP ================= */
let allOrders=[], allStandingOrders=[];
let staffTab="summary";

async function loadStaffOnlyData(){
  const [c, o] = await Promise.all([
    db.from("mn_chefs").select("*").order("business_name"),
    db.from("mn_orders").select("*, mn_order_items(*), mn_chefs(business_name)").order("created_at",{ascending:false}),
  ]);
  chefs = c.data||[];
  allOrders = o.data||[];
}

function renderStaffApp(){
  $("mainContent").innerHTML = `
    <div class="tabs">
      <button class="tab ${staffTab==='summary'?'active':''}" onclick="setStaffTab('summary')">This week</button>
      <button class="tab ${staffTab==='orders'?'active':''}" onclick="setStaffTab('orders')">Orders ${pendingCount()?`(${pendingCount()})`:''}</button>
      <button class="tab ${staffTab==='chefs'?'active':''}" onclick="setStaffTab('chefs')">Chefs</button>
      <button class="tab ${staffTab==='prices'?'active':''}" onclick="setStaffTab('prices')">Prices</button>
      <button class="tab ${staffTab==='yields'?'active':''}" onclick="setStaffTab('yields')">Yield defaults</button>
    </div>
    <div id="staffTabContent"></div>
  `;
  renderStaffTab();
}
function setStaffTab(t){ staffTab=t; renderStaffApp(); }
function pendingCount(){ return allOrders.filter(o=>o.status==='pending').length; }

function renderStaffTab(){
  const el=$("staffTabContent");
  if(staffTab==="summary") el.innerHTML = renderSummaryView();
  else if(staffTab==="orders") el.innerHTML = renderOrdersView();
  else if(staffTab==="chefs") el.innerHTML = renderChefsView();
  else if(staffTab==="prices") el.innerHTML = renderPricesView();
  else if(staffTab==="yields") el.innerHTML = renderYieldsView();
}

/* ----- THIS WEEK SUMMARY (for Em's email) + low-stock flags ----- */
function renderSummaryView(){
  const board = computeAvailabilityBoard();
  // low stock flag: demand from pending/confirmed orders this week vs predicted supply
  const demandBySpecies = {};
  for(const o of allOrders){
    if(o.status==='cancelled') continue;
    for(const item of (o.mn_order_items||[])) demandBySpecies[item.species]=(demandBySpecies[item.species]||0)+item.qty_kg;
  }
  const rows = board.map(e=>{
    const demand = demandBySpecies[e.species]||0;
    const low = demand > e.displayConservative;
    return `<div class="summary-row">
      <div class="summary-row-left">
        <span class="dot" style="background:${speciesColor(e.species)}"></span>
        <span style="font-weight:700">${e.species}</span>
        ${low?`<span class="pill warn">low stock — ${fmtKg(demand)}kg ordered vs ~${fmtKg(e.displayConservative)}kg likely</span>`:''}
      </div>
      <div class="mono">${fmtKg(e.displayLow)}–${fmtKg(e.displayHigh)}kg <span style="color:var(--muted)">(~${fmtKg(e.displayConservative)}kg likely)</span></div>
    </div>`;
  }).join("");

  const copyText = board.map(e=>`${e.species}: ~${fmtKg(e.displayConservative)}kg (range ${fmtKg(e.displayLow)}–${fmtKg(e.displayHigh)}kg)`).join("\n");

  return `
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">For Em's weekly email</div>
      ${rows || '<div class="empty-state">Nothing fruiting right now.</div>'}
      <button class="btn btn-ghost" style="margin-top:14px" onclick="copySummary(\`${copyText.replace(/`/g,'')}\`)">Copy as text</button>
    </div>
  `;
}
function copySummary(text){
  navigator.clipboard?.writeText(text).then(()=>toast("Copied — paste it straight into the email")).catch(()=>toast("Couldn't copy — select and copy manually"));
}

/* ----- ORDERS (staff manage all, log on chef's behalf) ----- */
function renderOrdersView(){
  const logFormHtml = `
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">Log an order on a chef's behalf</div>
      <label for="staff_order_chef">Chef</label>
      <select id="staff_order_chef">${chefs.map(c=>`<option value="${c.id}">${c.business_name}</option>`).join("")}</select>
      <label for="staff_order_species">Species</label>
      <select id="staff_order_species">${priceList.map(p=>`<option value="${p.species}">${p.species}</option>`).join("")}</select>
      <label for="staff_order_qty">Quantity (kg)</label>
      <input id="staff_order_qty" type="number" min="0" step="0.5">
      <button class="btn btn-primary" onclick="staffAddOrderLine()">Add line to draft order</button>
      <div id="staffDraftLines" style="margin-top:14px"></div>
      <button class="btn btn-ghost hidden" id="staffSubmitOrderBtn" onclick="staffSubmitOrder()" style="margin-top:10px">Submit order</button>
    </div>
  `;
  const ordersHtml = allOrders.length ? allOrders.map(o=>{
    const items=o.mn_order_items||[];
    const total=items.reduce((s,i)=> s + (i.unit_price_per_kg ? i.unit_price_per_kg*i.qty_kg : 0), 0);
    return `<div class="card" style="margin-bottom:14px">
      <div class="order-card-top">
        <div>
          <div style="font-weight:700">${o.mn_chefs?.business_name||'Unknown chef'}</div>
          <div style="font-size:12px;color:var(--muted)">Ordered ${new Date(o.created_at).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} · for ${new Date(o.requested_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} · ${o.order_source==='staff'?'logged by staff':'self-ordered'}</div>
        </div>
        <select onchange="updateOrderStatus('${o.id}', this.value)" style="width:auto;padding:6px 10px">
          ${['pending','confirmed','fulfilled','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join("")}
        </select>
      </div>
      <div style="margin-top:10px">${items.map(i=>`<div class="order-item-row"><span>${i.species}${i.is_special_request?' · quote requested':''}</span><span class="mono">${fmtKg(i.qty_kg)}kg${i.unit_price_per_kg?` · $${(i.unit_price_per_kg*i.qty_kg).toFixed(2)}`:''}</span></div>`).join("")}</div>
      ${o.notes?`<div style="margin-top:10px;font-size:13px;color:var(--muted)">Note: ${o.notes}</div>`:''}
      <div class="cart-total" style="margin-top:10px"><span>Total</span><span class="mono">$${total.toFixed(2)}</span></div>
    </div>`;
  }).join("") : `<div class="card empty-state">No orders yet.</div>`;

  return logFormHtml + ordersHtml;
}

let staffDraftOrder=[];
function staffAddOrderLine(){
  const species=$("staff_order_species").value;
  const qty=parseFloat($("staff_order_qty").value);
  if(!qty||qty<=0){ toast("Enter a quantity"); return; }
  staffDraftOrder.push({species,qty_kg:qty});
  $("staff_order_qty").value="";
  renderDraftLines();
}
function renderDraftLines(){
  $("staffDraftLines").innerHTML = staffDraftOrder.map((l,i)=>`<div class="order-item-row"><span>${l.species}</span><span class="mono">${fmtKg(l.qty_kg)}kg <button onclick="removeDraftLine(${i})" style="color:var(--danger);margin-left:8px">✕</button></span></div>`).join("");
  $("staffSubmitOrderBtn").classList.toggle("hidden", staffDraftOrder.length===0);
}
function removeDraftLine(i){ staffDraftOrder.splice(i,1); renderDraftLines(); }
async function staffSubmitOrder(){
  const chef_id=$("staff_order_chef").value;
  if(!chef_id||!staffDraftOrder.length) return;
  const {data:order,error}=await db.from("mn_orders").insert({chef_id, order_source:'staff', status:'confirmed', requested_date: nextWeekday(2)}).select().single();
  if(error){ toast("Couldn't save order: "+error.message); return; }
  const rows=staffDraftOrder.map(l=>({order_id:order.id, species:l.species, qty_kg:l.qty_kg, unit_price_per_kg: priceFor(l.species)?.unit_price_per_kg ?? null}));
  await db.from("mn_order_items").insert(rows);
  staffDraftOrder=[];
  toast("Order logged");
  await loadStaffOnlyData();
  renderStaffApp();
}
async function updateOrderStatus(id, status){
  await db.from("mn_orders").update({status, updated_at:new Date().toISOString()}).eq("id",id);
  await loadStaffOnlyData();
  renderStaffApp();
  toast("Order updated");
}

/* ----- CHEFS (onboarding) ----- */
function renderChefsView(){
  const rows = chefs.map(c=>`
    <div class="card" style="margin-bottom:12px">
      <div class="order-card-top">
        <div>
          <div style="font-weight:700">${c.business_name}</div>
          <div style="font-size:12px;color:var(--muted)">${c.contact_name||''} ${c.email?'· '+c.email:''} ${c.phone?'· '+c.phone:''}</div>
        </div>
        <span class="pill ${c.active?'good':'muted'}">${c.active?'active':'inactive'}</span>
      </div>
    </div>`).join("");
  return `
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">Invite a new chef</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Sends a magic-link sign-in email — no password for them to manage.</p>
      <label for="new_chef_business">Business name</label>
      <input id="new_chef_business" placeholder="The Pines Restaurant">
      <label for="new_chef_contact">Contact name</label>
      <input id="new_chef_contact" placeholder="Jamie">
      <label for="new_chef_email">Email</label>
      <input id="new_chef_email" type="email" placeholder="jamie@thepines.com.au">
      <label for="new_chef_phone">Phone (optional)</label>
      <input id="new_chef_phone">
      <button class="btn btn-primary" onclick="inviteChef()">Send invite</button>
    </div>
    ${rows || '<div class="card empty-state">No chefs onboarded yet.</div>'}
  `;
}
async function inviteChef(){
  const business_name=$("new_chef_business").value.trim();
  const email=$("new_chef_email").value.trim();
  if(!business_name||!email){ toast("Business name and email are required"); return; }
  const contact_name=$("new_chef_contact").value.trim()||null;
  const phone=$("new_chef_phone").value.trim()||null;
  const {data:session} = await db.auth.getSession();
  try{
    const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-chef`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session.session.access_token}` },
      body: JSON.stringify({email, business_name, contact_name, phone})
    });
    const out = await res.json();
    if(!res.ok){ toast("Couldn't invite: "+(out.error||res.statusText)); return; }
    toast(`Invited ${business_name}`);
    await loadStaffOnlyData(); renderStaffApp();
  }catch(e){ toast("Couldn't reach invite service: "+e.message); }
}

/* ----- PRICE LIST ----- */
function renderPricesView(){
  return `<div class="card">
    <div class="section-title">Standard wholesale prices</div>
    ${priceList.map(p=>`
      <div class="price-row">
        <span style="flex:1">${p.species}</span>
        <label style="display:flex;align-items:center;gap:6px;margin:0;font-size:12px;color:var(--muted)"><input type="checkbox" style="width:auto" ${p.special_only?'checked':''} onchange="updatePriceField('${escSpecies(p.species)}','special_only',this.checked)"> Quote only</label>
        <span class="mono">$</span>
        <input type="number" min="0" step="0.5" class="qty-input" style="width:80px" value="${p.unit_price_per_kg??''}" placeholder="POA" onchange="updatePriceField('${escSpecies(p.species)}','unit_price_per_kg',this.value?parseFloat(this.value):null)">
        <span style="font-size:12px;color:var(--muted)">/kg</span>
      </div>`).join("")}
  </div>`;
}
async function updatePriceField(species, field, value){
  await db.from("mn_price_list").update({[field]:value, updated_at:new Date().toISOString()}).eq("species",species);
  await loadSharedData();
  toast("Saved");
}

/* ----- YIELD DEFAULTS ----- */
function renderYieldsView(){
  return `<div class="card">
    <div class="section-title">Yield estimates (kg per block)</div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:14px">These drive the prediction on the chef board. Tune them as real harvest data comes in — start conservative.</p>
    ${yieldDefaults.map(y=>`
      <div class="price-row">
        <span style="flex:1">${y.species}</span>
        <input type="number" min="0" step="0.05" class="qty-input" style="width:75px" value="${y.yield_kg_per_block_low}" onchange="updateYieldField('${escSpecies(y.species)}','yield_kg_per_block_low',parseFloat(this.value)||0)">
        <span style="color:var(--muted)">–</span>
        <input type="number" min="0" step="0.05" class="qty-input" style="width:75px" value="${y.yield_kg_per_block_high}" onchange="updateYieldField('${escSpecies(y.species)}','yield_kg_per_block_high',parseFloat(this.value)||0)">
        <span style="font-size:12px;color:var(--muted)">kg/block</span>
      </div>`).join("")}
  </div>`;
}
async function updateYieldField(species, field, value){
  await db.from("mn_yield_defaults").update({[field]:value, updated_at:new Date().toISOString()}).eq("species",species);
  await loadSharedData();
  toast("Saved");
}

/* ================= BOOT / ROUTING ================= */
async function boot(){
  $("mainContent").innerHTML = `<div class="spinner"></div>`;
  await loadSharedData();
  if(isStaff){ await loadStaffOnlyData(); renderStaffApp(); } else { await loadChefOnlyData(); renderChefApp(); }
}
</script>
</body>
</html>
