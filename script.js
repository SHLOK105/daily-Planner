/* ============ STORAGE HELPERS ============ */
const store = {
  get(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

/* ============ TABS ============ */
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
  });
});

/* ============ CLOCK ============ */
function pad(n){ return n.toString().padStart(2,'0'); }
function updateClock(){
  const now = new Date();
  document.getElementById('clockTime').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('clockDate').textContent = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
setInterval(updateClock, 1000); updateClock();

/* ============ NOTIFICATIONS ============ */
let notifGranted = (typeof Notification !== 'undefined' && Notification.permission === 'granted');
const notifBtn = document.getElementById('notifBtn');
function refreshNotifBtn(){
  if(notifGranted){ notifBtn.textContent='🔔 alerts ON'; notifBtn.classList.add('on'); }
  else { notifBtn.textContent='🔔 enable alerts'; notifBtn.classList.remove('on'); }
}
refreshNotifBtn();
notifBtn.addEventListener('click', ()=>{
  if(typeof Notification === 'undefined'){ showToast('Not supported','Ye browser notifications support nahi karta.'); return; }
  Notification.requestPermission().then(p=>{ notifGranted = (p==='granted'); refreshNotifBtn(); });
});

function beep(){
  try{
    const sound = document.getElementById('alertSound');
    if(sound){
      sound.currentTime = 0;
      sound.play().catch(()=>{});
    }
  }catch(e){}
}

function fireAlert(title, body){
  beep();
  if(notifGranted){
    try{ new Notification(title, {body}); }catch(e){}
  }
  showToast(title, body);
}

function showToast(title, body){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className='toast';
  el.innerHTML = `<button class="toast-close">✕</button><div class="toast-title">⏰ ${title}</div><div class="toast-body">${body}</div>`;
  el.querySelector('.toast-close').addEventListener('click', ()=>el.remove());
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 15000);
}

/* ============ CUSTOM TIME PICKER HELPERS (AM/PM) ============ */
function initAmPmToggle(container){
  container.querySelectorAll('.ampm-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      container.querySelectorAll('.ampm-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
/* Reads a time-picker block, returns 24hr "HH:MM" string */
function readTimePicker({hourEl, minEl, ampmContainer}){
  const h12 = parseInt(hourEl.value, 10);
  let min = parseInt(minEl.value, 10);
  if(isNaN(min)) min = 0;
  min = Math.max(0, Math.min(59, min));
  const activeBtn = ampmContainer.querySelector('.ampm-btn.active');
  const ampm = activeBtn ? activeBtn.dataset.val : 'AM';
  let h24 = h12 % 12;
  if(ampm === 'PM') h24 += 12;
  return `${pad(h24)}:${pad(min)}`;
}
/* Convert 24hr "HH:MM" -> "8:40 PM" style, for display */
function formatTime12(hhmm){
  if(!hhmm) return '';
  let [h,m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12; if(h12===0) h12 = 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/* ============ DAILY PLANNER ALERTS ============ */
let alerts = store.get('df_alerts', []);
// {id, label, time:'HH:MM', enabled:true, lastFired: 'YYYY-MM-DD'}

function saveAlerts(){ store.set('df_alerts', alerts); }

function renderAlerts(){
  const list = document.getElementById('alertList');
  const empty = document.getElementById('alertEmpty');
  list.innerHTML='';
  if(alerts.length===0){ empty.style.display='block'; return; }
  empty.style.display='none';
  alerts.sort((a,b)=> a.time.localeCompare(b.time));
  alerts.forEach(a=>{
    const item = document.createElement('div');
    item.className='alert-item' + (a.enabled? '' : ' disabled');
    item.innerHTML = `
      <div class="alert-time">${formatTime12(a.time)}</div>
      <div style="flex:1">
        <div class="alert-label">${escapeHtml(a.label)}</div>
        <div class="alert-sub">daily reminder</div>
      </div>
      <label class="switch">
        <input type="checkbox" ${a.enabled?'checked':''} data-id="${a.id}" class="alert-toggle">
        <span class="slider"></span>
      </label>
      <button class="icon-btn alert-del" data-id="${a.id}">🗑</button>
    `;
    list.appendChild(item);
  });
  list.querySelectorAll('.alert-toggle').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const a = alerts.find(x=>x.id===cb.dataset.id);
      a.enabled = cb.checked; saveAlerts(); renderAlerts();
    });
  });
  list.querySelectorAll('.alert-del').forEach(b=>{
    b.addEventListener('click', ()=>{
      alerts = alerts.filter(x=>x.id!==b.dataset.id);
      saveAlerts(); renderAlerts();
    });
  });
}

document.getElementById('addAlertBtn').addEventListener('click', ()=>{
  const label = document.getElementById('alertLabel').value.trim();
  const time = readTimePicker({
    hourEl: document.getElementById('alertHour'),
    minEl: document.getElementById('alertMin'),
    ampmContainer: document.getElementById('alertAmPm')
  });
  if(!label){ showToast('Missing info','Label bhi daalo.'); return; }
  alerts.push({ id: 'a'+Date.now(), label, time, enabled:true, lastFired:null });
  saveAlerts(); renderAlerts();
  document.getElementById('alertLabel').value='';
});

function escapeHtml(s){
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

// daily alert AM/PM buttons init
initAmPmToggle(document.getElementById('alertAmPm'));

renderAlerts();

/* ============ WEEKLY TODO ============ */
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let weekData = store.get('df_week', {}); // { Sunday: [{id,text,time,done,overdueFired}], ... }
DAYS.forEach(d=>{ if(!weekData[d]) weekData[d]=[]; });

function saveWeek(){ store.set('df_week', weekData); }

function getWeekRangeLabel(){
  const now = new Date();
  const sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay());
  const sat = new Date(sun);
  sat.setDate(sun.getDate()+6);
  const opts = { day:'numeric', month:'short' };
  return `${sun.toLocaleDateString('en-IN',opts)} → ${sat.toLocaleDateString('en-IN',opts)}`;
}

function renderWeek(){
  document.getElementById('weekRange').textContent = getWeekRangeLabel();
  const grid = document.getElementById('weekGrid');
  grid.innerHTML='';
  const todayName = DAYS[new Date().getDay()];
  DAYS.forEach(day=>{
    const col = document.createElement('div');
    col.className = 'day-col' + (day===todayName ? ' today':'');
    const tasks = weekData[day];
    let tasksHtml = '';
    tasks.forEach(t=>{
      tasksHtml += `
        <div class="task-item ${t.done?'done':''}" data-day="${day}" data-id="${t.id}">
          <div class="task-check" data-day="${day}" data-id="${t.id}"></div>
          <div style="flex:1">
            <div class="task-text">${escapeHtml(t.text)}</div>
          </div>
          <button class="task-del" data-day="${day}" data-id="${t.id}">✕</button>
        </div>`;
    });
    col.innerHTML = `
      <div class="day-title"><span>${day}</span><span>${tasks.filter(t=>t.done).length}/${tasks.length}</span></div>
      <div class="task-list">${tasksHtml || '<div style="color:var(--text-faint); font-size:12px; padding:8px 0;">Koi task nahi</div>'}</div>
      <div class="day-add">
        <input type="text" placeholder="Naya kaam..." class="new-task-text" data-day="${day}">
        <button class="new-task-add" data-day="${day}">+</button>
      </div>
    `;
    grid.appendChild(col);
  });

  grid.querySelectorAll('.task-check').forEach(chk=>{
    chk.addEventListener('click', ()=>{
      const day = chk.dataset.day, id = chk.dataset.id;
      const t = weekData[day].find(x=>x.id===id);
      t.done = !t.done;
      saveWeek(); renderWeek();
    });
  });
  grid.querySelectorAll('.task-del').forEach(b=>{
    b.addEventListener('click', ()=>{
      const day = b.dataset.day, id = b.dataset.id;
      weekData[day] = weekData[day].filter(x=>x.id!==id);
      saveWeek(); renderWeek();
    });
  });

  grid.querySelectorAll('.new-task-add').forEach(b=>{
    b.addEventListener('click', ()=>{
      const day = b.dataset.day;
      const textInput = grid.querySelector(`.new-task-text[data-day="${day}"]`);
      const text = textInput.value.trim();
      if(!text) return;

      weekData[day].push({ id:'t'+Date.now()+Math.random().toString(36).slice(2,6), text, done:false });
      saveWeek(); renderWeek();
    });
  });
  grid.querySelectorAll('.new-task-text').forEach(inp=>{
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ grid.querySelector(`.new-task-add[data-day="${inp.dataset.day}"]`).click(); }
    });
  });
}

document.getElementById('resetWeekBtn').addEventListener('click', ()=>{
  if(!confirm('Pura week ka data clear karna hai? Ye undo nahi hoga.')) return;
  DAYS.forEach(d=> weekData[d] = []);
  saveWeek(); renderWeek();
});

renderWeek();

/* ============ AAJ KA SCHEDULE ============ */
let schedule = store.get('df_schedule', []); // {id, start:'HH:MM', end:'HH:MM', label, lastDoneDate:'YYYY-MM-DD'|null}

function saveSchedule(){ store.set('df_schedule', schedule); }
function todayStr(){ return new Date().toISOString().slice(0,10); }

function renderSchedule(){
  const list = document.getElementById('scheduleList');
  const empty = document.getElementById('scheduleEmpty');
  const countEl = document.getElementById('scheduleCount');
  list.innerHTML='';
  if(schedule.length===0){ empty.style.display='block'; countEl.textContent='0/0'; return; }
  empty.style.display='none';
  schedule.sort((a,b)=> a.start.localeCompare(b.start));
  const doneCount = schedule.filter(s=> s.lastDoneDate===todayStr()).length;
  countEl.textContent = `${doneCount}/${schedule.length}`;
  schedule.forEach(s=>{
    const isDone = s.lastDoneDate === todayStr();
    const item = document.createElement('div');
    item.className = 'schedule-item' + (isDone ? ' done' : '');
    item.innerHTML = `
      <div class="schedule-time">${formatTime12(s.start)} - ${formatTime12(s.end)}</div>
      <div class="schedule-check" data-id="${s.id}"></div>
      <div class="schedule-label">${escapeHtml(s.label)}</div>
      <button class="schedule-del" data-id="${s.id}">✕</button>
    `;
    list.appendChild(item);
  });
  list.querySelectorAll('.schedule-check').forEach(chk=>{
    chk.addEventListener('click', ()=>{
      const s = schedule.find(x=>x.id===chk.dataset.id);
      s.lastDoneDate = (s.lastDoneDate===todayStr()) ? null : todayStr();
      saveSchedule(); renderSchedule();
    });
  });
  list.querySelectorAll('.schedule-del').forEach(b=>{
    b.addEventListener('click', ()=>{
      schedule = schedule.filter(x=>x.id!==b.dataset.id);
      saveSchedule(); renderSchedule();
    });
  });
}

initAmPmToggle(document.getElementById('scheduleStartAmPm'));
initAmPmToggle(document.getElementById('scheduleEndAmPm'));

document.getElementById('addScheduleBtn').addEventListener('click', ()=>{
  const label = document.getElementById('scheduleLabel').value.trim();
  const startHourEl = document.getElementById('scheduleStartHour');
  const endHourEl = document.getElementById('scheduleEndHour');

  if(!label){ showToast('Missing info','Kaam ka naam daalo.'); return; }
  if(startHourEl.value.trim()==='' || endHourEl.value.trim()===''){
    showToast('Missing info','Start aur end dono time daalo.'); return;
  }

  const start = readTimePicker({
    hourEl: startHourEl,
    minEl: document.getElementById('scheduleStartMin'),
    ampmContainer: document.getElementById('scheduleStartAmPm')
  });
  const end = readTimePicker({
    hourEl: endHourEl,
    minEl: document.getElementById('scheduleEndMin'),
    ampmContainer: document.getElementById('scheduleEndAmPm')
  });

  schedule.push({ id:'s'+Date.now(), start, end, label, lastDoneDate:null });
  saveSchedule(); renderSchedule();
  document.getElementById('scheduleLabel').value='';
});

renderSchedule();

/* ============ NOTEPAD ============ */
const notepad = document.getElementById('notepad');
notepad.value = store.get('df_notes', '');
let saveTimer;
notepad.addEventListener('input', ()=>{
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    store.set('df_notes', notepad.value);
    const ind = document.getElementById('saveIndicator');
    ind.classList.add('show');
    setTimeout(()=> ind.classList.remove('show'), 1200);
  }, 500);
});

/* ============ ALERT CHECK LOOP ============ */
function checkAlerts(){
  const now = new Date();
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const todayStr = now.toISOString().slice(0,10);

  // daily planner alerts
  let changed = false;
  alerts.forEach(a=>{
    if(a.enabled && a.time===hhmm && a.lastFired !== todayStr){
      fireAlert(a.label, `Scheduled time ho gaya (${formatTime12(a.time)})`);
      a.lastFired = todayStr;
      changed = true;
    }
  });
  if(changed) saveAlerts();
}
setInterval(checkAlerts, 15000);
checkAlerts();