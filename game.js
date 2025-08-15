// ---- CẤU HÌNH LEVEL & ICONS ----
const ROWS = 10, COLS = 8;
const ICONS = [
  '🐱','🐶','🐰','🐼','🐟','🐧','🐘','🦒','🦁','🐵','🦉','🦊','🦓','🐆','🐍'
];
const OBSTACLE = '🪨';

const LEVELS = [
  { time:150, types:5,  obstacles:0,  shuffles:3, bg:'grass' },
  { time:120, types:7,  obstacles:0,  shuffles:3, bg:'forest' },
  { time:100, types:9,  obstacles:0,  shuffles:3, bg:'ocean' },
  { time:85,  types:11, obstacles:8,  shuffles:3, bg:'city' },
  { time:70,  types:13, obstacles:12, shuffles:3, bg:'space' },
  { time:60,  types:14, obstacles:16, shuffles:2, bg:'desert' },
  { time:50,  types:15, obstacles:22, shuffles:2, bg:'temple' },
];

// ---- TRẠNG THÁI GAME ----
const state = {
  level: 1,
  score: 0,
  combo: 0,
  timeLeft: 0,
  timerId: null,
  comboTimerId: null,
  lastMatchAt: 0,
  shufflesLeft: 0,
  grid: [],       // ma trận có viền rỗng để hỗ trợ đi ngoài rìa
  raw: [],        // ma trận hiển thị (không viền)
  lock: false,
  sel: null,
};

const board = document.getElementById('board');
const $level = document.getElementById('level');
const $score = document.getElementById('score');
const $combo = document.getElementById('combo');
const $time  = document.getElementById('time');
const $timebar = document.getElementById('timebar');
const $toast = document.getElementById('toast');
const $shuffles = document.getElementById('shuffles');

// ---- TIỆN ÍCH ----
const randInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=inArr=>{const a=[...inArr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const now=()=>performance.now();

function toast(msg){
  $toast.textContent=msg; $toast.classList.add('show');
  setTimeout(()=> $toast.classList.remove('show'), 1200);
}

// ---- KHỞI TẠO LEVEL ----
function startLevel(n){
  state.level = n;
  const cfg = LEVELS[n-1];
  $level.textContent = n;
  state.combo = 0; updateCombo();
  state.timeLeft = cfg.time; updateTime();
  state.shufflesLeft = cfg.shuffles; $shuffles.textContent = state.shufflesLeft;

  // Tạo danh sách cặp biểu tượng
  const pairsCount = Math.floor((ROWS*COLS - cfg.obstacles)/2);
  const set = ICONS.slice(0, cfg.types);
  const pairs=[];
  for(let i=0;i<pairsCount;i++){ const icon=set[i%set.length]; pairs.push(icon,icon); }
  const cells = shuffle(pairs);

  // Chèn vật cản
  let obstacles = cfg.obstacles;
  while(obstacles-->0){ const pos = randInt(0, ROWS*COLS-1); cells.splice(pos,0,OBSTACLE); }
  // Nếu thừa ô (do chèn obstacles), cắt bớt cuối để khớp kích thước
  const flat = cells.slice(0, ROWS*COLS);

  // Đưa vào ma trận hiển thị
  state.raw = Array.from({length:ROWS},(_,r)=> flat.slice(r*COLS,(r+1)*COLS));

  // Tạo ma trận có viền rỗng (padding 1) để hỗ trợ nối vòng ngoài
  state.grid = Array.from({length:ROWS+2},()=>Array(COLS+2).fill(''));
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) state.grid[r+1][c+1]=state.raw[r][c];

  draw();
  resetTimer();
}

function draw(){
  board.innerHTML='';
  board.style.setProperty('--cols', COLS);
  // layer path
  const pathLayer = document.createElement('svg');
  pathLayer.className='path'; pathLayer.setAttribute('viewBox',`0 0 ${(COLS)*(64+8)} ${(ROWS)*(64+8)}`);
  board.appendChild(pathLayer);

  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const val = state.raw[r][c];
      const div = document.createElement('div');
      div.className='tile';
      if(val==='') { div.style.visibility='hidden'; }
      else if(val===OBSTACLE){ div.classList.add('obstacle'); div.textContent=OBSTACLE; }
      else { div.textContent=val; }
      div.dataset.r=r; div.dataset.c=c;
      div.addEventListener('click', onClickTile);
      board.appendChild(div);
    }
  }
}

function onClickTile(e){
  if(state.lock) return;
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  const v = state.raw[r][c];
  if(!v || v===OBSTACLE) return;

  if(!state.sel){
    state.sel = {r,c,v,el:e.currentTarget};
    e.currentTarget.classList.add('sel');
    return;
  }

  const a=state.sel, b={r,c,v,el:e.currentTarget};
  if(a.r===b.r && a.c===b.c){ // hủy chọn
    a.el.classList.remove('sel');
    state.sel=null; return;
  }

  if(a.v!==b.v){ // đổi chọn
    a.el.classList.remove('sel');
    state.sel=b; b.el.classList.add('sel'); return;
  }

  // thử nối
  const path = canConnect(a.r+1,a.c+1,b.r+1,b.c+1); // dùng tọa độ có padding
  if(path){
    drawPath(path);
    match(a,b);
  } else {
    toast('Không nối được!');
    a.el.classList.remove('sel');
    state.sel=b; b.el.classList.add('sel');
  }
}

function drawPath(nodes){
  const svg = board.querySelector('svg.path');
  svg.innerHTML='';
  const g = document.createElementNS('http://www.w3.org/2000/svg','polyline');
  g.setAttribute('fill','none');
  g.setAttribute('stroke','url(#grad)');
  g.setAttribute('stroke-width','6');
  const pts = nodes.map(([R,C])=>{
    const x = (C-1)*(64+8)+32+12; // 64 cell + 8 gap + 12 board padding
    const y = (R-1)*(64+8)+32+12;
    return `${x},${y}`;
  }).join(' ');
  g.setAttribute('points', pts);

  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
  grad.id='grad'; grad.setAttribute('x1','0%');grad.setAttribute('x2','100%');grad.setAttribute('y1','0%');grad.setAttribute('y2','0%');
  const s1=document.createElementNS('http://www.w3.org/2000/svg','stop');s1.setAttribute('offset','0%');s1.setAttribute('stop-color','#34d399');
  const s2=document.createElementNS('http://www.w3.org/2000/svg','stop');s2.setAttribute('offset','100%');s2.setAttribute('stop-color','#22d3ee');
  grad.appendChild(s1);grad.appendChild(s2);defs.appendChild(grad);svg.appendChild(defs);

  svg.appendChild(g);
  setTimeout(()=> svg.innerHTML='', 280);
}

function match(a,b){
  // xóa
  state.raw[a.r][a.c]='';
  state.raw[b.r][b.c]='';
  state.grid[a.r+1][a.c+1]='';
  state.grid[b.r+1][b.c+1]='';

  a.el.classList.remove('sel');
  a.el.classList.add('matched');
  b.el.classList.add('matched');
  state.sel=null;

  // điểm + combo
  const base=10;
  const t = now();
  if(t - state.lastMatchAt <= 2000){ state.combo++; }
  else { state.combo=1; }
  state.lastMatchAt=t;

  let bonus=0;
  if(state.combo===1) bonus=0;          // 10
  else if(state.combo===2) bonus=10;    // 20
  else if(state.combo===3) bonus=20;    // 30
  else if(state.combo===4) { bonus=30; addTime(5); toast('+5s ✨ Combo 4'); }
  else if(state.combo>=5) bonus=40;     // 50

  state.score += base + bonus;
  updateScore(); updateCombo();

  // nén xuống dưới
  applyGravity();
  draw();

  // thắng?
  if(isBoardCleared()){
    levelClear();
  }
}

function applyGravity(){
  for(let c=0;c<COLS;c++){
    let stack=[]; // từ dưới lên
    for(let r=ROWS-1;r>=0;r--){
      const v=state.raw[r][c];
      if(v==='') continue; // ô trống
      stack.push(v);
    }
    // đổ lại từ dưới
    for(let r=ROWS-1;r>=0;r--){
      state.raw[r][c] = stack[ROWS-1-r] ?? '';
    }
  }
  // cập nhật grid có viền
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) state.grid[r+1][c+1]=state.raw[r][c];
}

function isBoardCleared(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const v=state.raw[r][c]; if(v && v!==OBSTACLE) return false;
  }
  return true;
}

function levelClear(){
  stopTimer();
  const remain = Math.max(0, state.timeLeft);
  const bonus = remain*10; // quy đổi thời gian x10
  state.score += bonus; updateScore();
  toast(`Hoàn thành level! +${bonus} điểm thời gian`);

  if(state.level<LEVELS.length){
    setTimeout(()=> startLevel(state.level+1), 900);
  } else {
    setTimeout(()=> alert(`🎉 Bạn đã thắng game! Tổng điểm: ${state.score}`), 600);
  }
}

// ---- TIMER ----
function resetTimer(){
  stopTimer();
  const total = LEVELS[state.level-1].time;
  const start = performance.now();
  state.timerId = setInterval(()=>{
    const dt = Math.floor((performance.now()-start)/1000);
    state.timeLeft = Math.max(0, total - dt);
    updateTime();
    if(state.timeLeft<=0){ gameOver(); }
  }, 250);
}
function stopTimer(){ if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }}
function addTime(s){ state.timeLeft += s; updateTime(true); }
function updateTime(boost=false){
  $time.textContent = state.timeLeft;
  const cfg = LEVELS[state.level-1];
  const p = Math.max(0, Math.min(1, state.timeLeft / cfg.time));
  $timebar.style.width = (p*100)+"%";
  if(boost){ $timebar.animate([{transform:'scaleY(1.0)'},{transform:'scaleY(1.3)'}],{duration:180}); }
}

function updateScore(){ $score.textContent = state.score; }
function updateCombo(){ $combo.textContent = state.combo; }

function gameOver(){
  stopTimer();
  alert('⏰ Hết thời gian! Thua cuộc.');
  startLevel(1); state.score=0; updateScore();
}

// ---- LOGIC NỐI TỐI ĐA 2 GÓC RẼ ----
function canConnect(r1,c1,r2,c2){
  if(r1===r2 && c1===c2) return null;
  // chỉ nối giữa hai icon giống nhau & không phải obstacle
  if(state.grid[r1][c1]!==state.grid[r2][c2]) return null;
  if(state.grid[r1][c1]===OBSTACLE || !state.grid[r1][c1]) return null;

  // 0. tạm thời làm trống hai điểm để kiểm tra đường đi
  const val = state.grid[r1][c1];
  state.grid[r1][c1]=''; state.grid[r2][c2]='';

  // A. cùng hàng/cột: đường thẳng
  if(clearLine(r1,c1,r2,c2)) { restore(); return [[r1,c1],[r2,c2]]; }

  // B. 1 góc (L): thử (r1,c2) và (r2,c1)
  if(isEmpty(r1,c2) && clearLine(r1,c1,r1,c2) && clearLine(r1,c2,r2,c2)) { restore(); return [[r1,c1],[r1,c2],[r2,c2]]; }
  if(isEmpty(r2,c1) && clearLine(r1,c1,r2,c1) && clearLine(r2,c1,r2,c2)) { restore(); return [[r1,c1],[r2,c1],[r2,c2]]; }

  // C. 2 góc (Z): duyệt theo cột trung gian & hàng trung gian
  for(let cc=0; cc<state.grid[0].length; cc++){
    if(cc===c1||cc===c2) continue;
    if(isEmpty(r1,cc) && isEmpty(r2,cc) && clearLine(r1,c1,r1,cc) && clearLine(r1,cc,r2,cc) && clearLine(r2,cc,r2,c2)) { restore(); return [[r1,c1],[r1,cc],[r2,cc],[r2,c2]]; }
  }
  for(let rr=0; rr<state.grid.length; rr++){
    if(rr===r1||rr===r2) continue;
    if(isEmpty(rr,c1) && isEmpty(rr,c2) && clearLine(r1,c1,rr,c1) && clearLine(rr,c1,rr,c2) && clearLine(rr,c2,r2,c2)) { restore(); return [[r1,c1],[rr,c1],[rr,c2],[r2,c2]]; }
  }

  restore();
  return null;

  function restore(){ state.grid[r1][c1]=val; state.grid[r2][c2]=val; }
}

function isEmpty(r,c){ return state.grid[r] && state.grid[r][c]===""; }

function clearLine(r1,c1,r2,c2){
  if(r1===r2){ // ngang
    const [a,b] = c1<c2 ? [c1,c2] : [c2,c1];
    for(let c=a+1;c<b;c++) if(state.grid[r1][c]!=="") return false;
    return true;
  }
  if(c1===c2){ // dọc
    const [a,b] = r1<r2 ? [r1,r2] : [r2,r1];
    for(let r=a+1;r<b;r++) if(state.grid[r][c1]!=="") return false;
    return true;
  }
  return false; // chỉ kiểm tra đường thẳng
}

// ---- HINT & SHUFFLE ----
function findAnyPair(){
  // duyệt tất cả cặp có thể nối (tối đa vài trăm, OK)
  for(let r1=0;r1<ROWS;r1++) for(let c1=0;c1<COLS;c1++){
    const v=state.raw[r1][c1]; if(!v || v===OBSTACLE) continue;
    for(let r2=r1;r2<ROWS;r2++) for(let c2=0;c2<COLS;c2++){
      if(r1===r2 && c2<=c1) continue;
      if(state.raw[r2][c2]!==v) continue;
      const path=canConnect(r1+1,c1+1,r2+1,c2+1);
      if(path) return {r1,c1,r2,c2,path};
    }
  }
  return null;
}

function hint(){
  const p = findAnyPair();
  if(!p){ toast('Không còn nước đi!'); return; }
  // highlight
  const idx1 = p.r1*COLS + p.c1;
  const idx2 = p.r2*COLS + p.c2;
  const tiles = [...board.querySelectorAll('.tile')];
  tiles[idx1].classList.add('sel'); tiles[idx2].classList.add('sel');
  drawPath(p.path);
  setTimeout(()=>{ tiles[idx1].classList.remove('sel'); tiles[idx2].classList.remove('sel'); }, 500);
}

function shuffleBoard(force=false){
  if(!force){
    if(state.shufflesLeft<=0){ toast('Hết lượt xáo trộn'); return; }
    state.shufflesLeft--; $shuffles.textContent=state.shufflesLeft;
  }
  // gom tất cả icon (trừ obstacle, ô trống)
  const items=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const v=state.raw[r][c]; if(v && v!==OBSTACLE) items.push(v);
  }
  const mixed = shuffle(items);
  let k=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const v=state.raw[r][c];
    if(v===OBSTACLE) continue;
    if(v!=='') state.raw[r][c]=mixed[k++];
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) state.grid[r+1][c+1]=state.raw[r][c];
  draw();
}

// ---- SỰ KIỆN UI ----
document.getElementById('btnHint').addEventListener('click', hint);
document.getElementById('btnShuffle').addEventListener('click', ()=>{
  shuffleBoard(false);
});
document.getElementById('btnPause').addEventListener('click', ()=>{
  if(state.timerId){ stopTimer(); toast('Đã tạm dừng'); }
  else { resetTimer(); toast('Tiếp tục'); }
});
document.getElementById('btnRestart').addEventListener('click', ()=>{
  state.score=0; updateScore(); startLevel(1);
});

// ---- LEGEND ----
(function renderLegend(){
  const legend=document.getElementById('legend');
  legend.innerHTML='';
  for(const ic of ICONS){ const s=document.createElement('div'); s.className='tile'; s.textContent=ic; legend.appendChild(s); }
  const ob=document.createElement('div'); ob.className='tile obstacle'; ob.textContent=OBSTACLE; legend.appendChild(ob);
})();

// ---- BẮT ĐẦU ----
startLevel(1);
// đảm bảo luôn có nước đi; nếu không, auto xáo trộn ẩn
setInterval(()=>{ if(!findAnyPair()) shuffleBoard(true); }, 2000);
