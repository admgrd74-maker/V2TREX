/* =======================================================================
   PANNEAU ADMIN v3 — tableau entièrement découplé du vocal.
   Format leçon :
     steps[]  : répliques (vocal). Chaque step non-BIP peut avoir changeBoard:true
                → "à ce moment, activer l'état tableau suivant".
     boards[] : liste ordonnée d'états du tableau, sans référence aux répliques.
   Rétrocompatible v2 (fromStep) et v1 (reveals par step) à l'import.
   ======================================================================= */

let steps  = [];
let boards = [];
let stepSeq  = 0;
let boardSeq = 0;
let activeTab = 'vocal';

const ROLE_LABEL = { prof:"Professeur", eleve1:"Élève 1", eleve2:"Élève 2", moi:"Vous (bip)" };
const SZ_LIST    = ['xs','s','m','l','xl'];
const $          = id => document.getElementById(id);

function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function esc(t){ return (t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function getStep(id){  return steps.find(s=>s.id===id); }
function getBoard(id){ return boards.find(b=>b.id===id); }

/* ── Combien de changements de tableau avant la réplique i (inclusif) ── */
function boardNumFor(i){
  let n=0;
  for(let j=0;j<=i;j++) if(steps[j]?.changeBoard) n++;
  return n; // 1-based : 0 = aucun changement
}

/* ── Quel step déclenche le bième état du tableau (0-based) ── */
function triggerStepFor(boardOrdinal){
  let n=-1;
  for(let i=0;i<steps.length;i++){
    if(steps[i].changeBoard){ n++; if(n===boardOrdinal) return i; }
  }
  return null;
}

/* ── Quel état du tableau est actif à la réplique stepIdx ── */
function activeBoardAt(lesson, stepIdx){
  let n=-1;
  for(let i=0;i<=stepIdx;i++){
    if(lesson.steps[i]?.changeBoard) n++;
  }
  return n; // -1 = aucun
}

/* ════════════════════════════════════════
   ONGLETS
════════════════════════════════════════ */
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.toggle('hidden',c.dataset.tab!==tab));
}

/* ════════════════════════════════════════
   VOCAL — répliques
════════════════════════════════════════ */
function addStep(role){
  const s={id:++stepSeq, role, fr:"", audioName:"", audioData:"", changeBoard:false};
  if(role==='moi') s.bip={title:'', question:'', reponse:{reveals:[],audioName:'',audioData:''}};
  steps.push(s);
  renderVocal(); renderTableau();
  const el=document.querySelector('[data-step-id="'+s.id+'"]');
  if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
}
function insertStep(afterId, role){
  const s={id:++stepSeq, role, fr:"", audioName:"", audioData:"", changeBoard:false};
  if(role==='moi') s.bip={title:'', question:'', reponse:{reveals:[],audioName:'',audioData:''}};
  const idx=steps.findIndex(x=>x.id===afterId);
  steps.splice(idx+1, 0, s);
  renderVocal(); renderTableau();
  const el=document.querySelector('[data-step-id="'+s.id+'"]');
  if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
}
function removeStep(id){
  const s=getStep(id);
  if(s && s.role==='moi' && s.bip && (s.bip.title||s.bip.question)){
    if(!confirm('Ce bip a du contenu (titre/question). Supprimer quand même ?')) return;
  }
  steps=steps.filter(s=>s.id!==id);
  renderVocal(); renderTableau();
}
function moveStep(id,dir){
  const i=steps.findIndex(s=>s.id===id); const j=i+dir;
  if(j<0||j>=steps.length) return;
  [steps[i],steps[j]]=[steps[j],steps[i]];
  renderVocal(); renderTableau();
}
function loadAudio(id,input){
  const f=input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{ const s=getStep(id); s.audioName=f.name; s.audioData=e.target.result; renderVocal(); };
  r.readAsDataURL(f);
}
function toggleChangeBoard(id){
  const s=getStep(id); if(!s) return;
  s.changeBoard=!s.changeBoard;
  renderVocal(); renderTableau();
}

function renderVocal(){
  const c=$("tabVocalContent"); c.innerHTML="";

  const legend=document.createElement("div"); legend.className="legend";
  legend.innerHTML=`
    <span><b style="background:var(--prof)"></b>Professeur</span>
    <span><b style="background:var(--eleve1)"></b>Élève 1</span>
    <span><b style="background:var(--eleve2)"></b>Élève 2</span>
    <span><b style="background:var(--moi)"></b>Vous (bip)</span>`;
  c.appendChild(legend);

  const list=document.createElement("div"); list.className="steps";
  steps.forEach((s,i)=>{
    const isMoi=s.role==="moi";
    const bn=s.changeBoard?boardNumFor(i):0;
    const d=document.createElement("div");
    d.className="step"; d.dataset.role=s.role; d.dataset.stepId=s.id;
    d.innerHTML=`
      <div class="step-head">
        <span class="num">${String(i+1).padStart(2,"0")}</span>
        <select class="role-sel" onchange="getStep(${s.id}).role=this.value;if(this.value==='moi')getStep(${s.id}).changeBoard=false;renderVocal();renderTableau()">
          ${Object.keys(ROLE_LABEL).map(r=>`<option value="${r}" ${r===s.role?"selected":""}>${ROLE_LABEL[r]}</option>`).join("")}
        </select>
        ${!isMoi
          ? `<button class="board-toggle${s.changeBoard?' bt-on':''}"
                     onclick="toggleChangeBoard(${s.id})"
                     title="${s.changeBoard?'Le tableau change ici — clic pour désactiver':'Clic pour changer le tableau ici'}">
               📋${s.changeBoard?' → État '+bn:''}
             </button>`
          : ''}
        <span class="spacer"></span>
        <button class="btn sm" onclick="moveStep(${s.id},-1)" title="Monter">↑</button>
        <button class="btn sm" onclick="moveStep(${s.id},1)"  title="Descendre">↓</button>
        <button class="btn sm danger" onclick="removeStep(${s.id})" title="Supprimer">🗑</button>
      </div>
      ${isMoi
        ? `<div class="hint moi-hint">Réplique bip — le tableau reste inchangé.</div>`
        : `<textarea oninput="getStep(${s.id}).fr=this.value;scheduleLiveRefresh()" placeholder="Texte affiché (sous-titre)…">${esc(s.fr)}</textarea>
           <div class="hint">Mots-clés entre &lt;b&gt;…&lt;/b&gt;.</div>
           <div class="audiobox">
             <div class="audiorow">
               <button class="btn sm" onclick="this.nextElementSibling.click()">🎵 ${s.audioName?"Changer":"Charger un .mp3"}</button>
               <input type="file" accept="audio/*" style="display:none" onchange="loadAudio(${s.id},this)">
               ${s.audioData
                 ? `<audio controls src="${s.audioData}" data-audio="${s.id}"></audio><span class="tc-note">${esc(s.audioName)}</span>`
                 : `<span class="hint">aucun audio</span>`}
             </div>
           </div>`}`;
    list.appendChild(d);
    const iz=document.createElement("div"); iz.className="insert-zone";
    iz.innerHTML=`<button class="insert-toggle" onclick="this.closest('.insert-zone').classList.toggle('open')" title="Insérer un bloc ici">＋</button>
      <div class="insert-panel">
        <button class="btn sm" onclick="insertStep(${s.id},'prof')">+ Professeur</button>
        <button class="btn sm" onclick="insertStep(${s.id},'eleve1')">+ Élève 1</button>
        <button class="btn sm" onclick="insertStep(${s.id},'eleve2')">+ Élève 2</button>
        <button class="btn sm" onclick="insertStep(${s.id},'moi')">+ Bip</button>
      </div>`;
    list.appendChild(iz);
  });
  c.appendChild(list);

  const add=document.createElement("div"); add.className="addstep";
  add.innerHTML=`
    <button class="btn sm" onclick="addStep('prof')">+ Professeur</button>
    <button class="btn sm" onclick="addStep('eleve1')">+ Élève 1</button>
    <button class="btn sm" onclick="addStep('eleve2')">+ Élève 2</button>
    <button class="btn sm" onclick="addStep('moi')">+ Bip (client)</button>`;
  c.appendChild(add);

  scheduleLiveRefresh();
}

/* ════════════════════════════════════════
   TABLEAU — états indépendants
════════════════════════════════════════ */
function addBoard(){
  const b={id:++boardSeq, reveals:[]};
  boards.push(b);
  renderTableau();
  const el=document.querySelector('[data-board-id="'+b.id+'"]');
  if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
}
function insertBoardAfter(afterStepId, afterBoardId){
  const newBoard={id:++boardSeq, reveals:[]};
  const bIdx=boards.findIndex(b=>b.id===afterBoardId);
  boards.splice(bIdx+1, 0, newBoard);
  const newStep={id:++stepSeq, role:'prof', fr:"", audioName:"", audioData:"", changeBoard:true};
  const sIdx=steps.findIndex(s=>s.id===afterStepId);
  steps.splice(sIdx+1, 0, newStep);
  renderVocal(); renderTableau();
  const el=document.querySelector('[data-board-id="'+newBoard.id+'"]');
  if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
}
function removeBoard(id){ boards=boards.filter(b=>b.id!==id); renderTableau(); }

function addReveal(bid){    getBoard(bid).reveals.push({type:"text",cat:"prono",fr:"",en:"",phon:"",at:0,removeAt:0,q:false,size:"m"}); renderTableau(); }
function addImgReveal(bid){ getBoard(bid).reveals.push({type:"image",src:"",at:0,removeAt:0}); renderTableau(); }
function removeReveal(bid,k){ getBoard(bid).reveals.splice(k,1); renderTableau(); }
function loadImgReveal(bid,k,input){
  const f=input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{ getBoard(bid).reveals[k].src=e.target.result; renderTableau(); };
  r.readAsDataURL(f);
}

/* Calcule le temps absolu (s) au début du step stepIdx à partir des durées préchargées. */
function stepT0(stepIdx){
  if(!lessonDurations.length||stepIdx<=0) return 0;
  return lessonDurations.slice(0,stepIdx).reduce((s,d)=>s+d,0);
}

function stampAt(bid,k){
  const board=getBoard(bid);
  const bIdx=boards.findIndex(b=>b.id===bid);
  const lesson=buildLesson();
  if(liveAudio && bIdx===activeBoardAt(lesson,liveIdx)){
    // Temps absolu = décalage du step courant + position audio
    board.reveals[k].at=Math.round((lessonElapsedBefore+liveAudio.currentTime)*10)/10;
    renderTableau(); return;
  }
  const a=document.querySelector('[data-baudio="'+bid+'"]');
  if(!a){ toast("Lance l'audio (inline ou dans le player →)"); return; }
  const trigIdx=triggerStepFor(bIdx);
  const t0=trigIdx!==null?stepT0(trigIdx):0;
  board.reveals[k].at=Math.round((t0+a.currentTime)*10)/10; renderTableau();
}
function stampRemoveAt(bid,k){
  const board=getBoard(bid);
  const bIdx=boards.findIndex(b=>b.id===bid);
  const lesson=buildLesson();
  if(liveAudio && bIdx===activeBoardAt(lesson,liveIdx)){
    board.reveals[k].removeAt=Math.round((lessonElapsedBefore+liveAudio.currentTime)*10)/10;
    renderTableau(); return;
  }
  const a=document.querySelector('[data-baudio="'+bid+'"]');
  if(!a){ toast("Lance l'audio (inline ou dans le player →)"); return; }
  const trigIdx=triggerStepFor(bIdx);
  const t0=trigIdx!==null?stepT0(trigIdx):0;
  board.reveals[k].removeAt=Math.round((t0+a.currentTime)*10)/10; renderTableau();
}

function renderRevealRow(b,r,k){
  if(r.type==='image') return `
    <div class="reveal-img-card">
      <div class="img-thumb">${r.src?`<img src="${r.src}" alt="">`:""}</div>
      <div class="img-meta">
        <button class="btn sm" onclick="this.nextElementSibling.click()">📷 ${r.src?"Changer":"Choisir"}</button>
        <input type="file" accept="image/*" style="display:none" onchange="loadImgReveal(${b.id},${k},this)">
        <div class="img-timing">
          <label class="lab" style="font-size:9px;white-space:nowrap">apparaît (s)</label>
          <input class="at" type="number" step="0.1" min="0" value="${r.at||0}" oninput="getBoard(${b.id}).reveals[${k}].at=parseFloat(this.value)||0;scheduleSlotRefresh()">
          <span class="x" onclick="removeReveal(${b.id},${k})">×</span>
        </div>
        <div class="stamp-row">
          <button class="btn sm" onclick="stampAt(${b.id},${k})">⌖ apparaît ici</button>
        </div>
      </div>
    </div>`;

  const sz=r.size||'m';
  const cat=r.cat||'prono';
  const catOpts=Object.entries(REVEAL_TYPES).map(([v,t])=>
    `<option value="${v}"${cat===v?' selected':''}>${t.label}</option>`).join('');
  return `
    <tr class="rg-row${r.q?' q-on':''}">
      <td class="rg-num">${k+1}</td>
      <td><textarea class="en-ta" rows="1" placeholder="la table" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';getBoard(${b.id}).reveals[${k}].fr=this.value;scheduleSlotRefresh()">${esc(r.fr||'')}</textarea></td>
      <td><textarea class="en-ta" rows="1" placeholder="table" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';getBoard(${b.id}).reveals[${k}].en=this.value;scheduleSlotRefresh()">${esc(r.en||'')}</textarea></td>
      <td><select class="cat-sel" onchange="getBoard(${b.id}).reveals[${k}].cat=this.value;scheduleSlotRefresh()">${catOpts}</select></td>
      <td><input type="text" value="${esc(r.phon||'')}" placeholder="téï-beul (optionnel)" oninput="getBoard(${b.id}).reveals[${k}].phon=this.value;scheduleSlotRefresh()"></td>
      <td><div class="sz-group">${SZ_LIST.map(s=>`<button class="sz-btn${sz===s?' on':''}" onclick="getBoard(${b.id}).reveals[${k}].size='${s}';renderTableau()">${s.toUpperCase()}</button>`).join('')}</div></td>
      <td><div class="tc-wrap"><input class="at" type="number" step="0.1" min="0" value="${r.at||0}" oninput="getBoard(${b.id}).reveals[${k}].at=parseFloat(this.value)||0;scheduleSlotRefresh()"><button class="st-btn" onclick="stampAt(${b.id},${k})" title="Horodater">⌖</button></div></td>
      <td><label class="qtoggle${r.q?' q-on':''}"><input type="checkbox" ${r.q?"checked":""} onchange="getBoard(${b.id}).reveals[${k}].q=this.checked;renderTableau()"><span>Q</span></label></td>
      <td><span class="rg-del" onclick="removeReveal(${b.id},${k})">×</span></td>
    </tr>`;
}

function renderBoardBlock(b, stepIdx){
  const s=steps[stepIdx];
  const assocAudio=s?.audioData||'';
  const textRows=b.reveals.map((r,k)=>r.type!=='image'?renderRevealRow(b,r,k):null).filter(Boolean);
  const imgCards=b.reveals.map((r,k)=>r.type==='image'?renderRevealRow(b,r,k):null).filter(Boolean);
  const d=document.createElement("div");
  d.className="step board-state"; d.dataset.boardId=b.id;
  d.innerHTML=`
    <div class="step-head">
      <span class="board-badge">📋 Tableau</span>
      <span class="trigger-info">réplique <b>${String(stepIdx+1).padStart(2,"0")}</b> · ${ROLE_LABEL[s?.role||'prof']}</span>
      <span class="spacer"></span>
      <button class="btn sm danger" onclick="removeBoard(${b.id})" title="Supprimer">🗑</button>
    </div>
    ${assocAudio
      ? `<div class="audiobox" style="margin:8px 0"><div class="audiorow">
           <span class="tc-note" style="font-size:10px;opacity:.7">Audio réplique ${String(stepIdx+1).padStart(2,"0")}</span>
           <audio controls src="${assocAudio}" data-baudio="${b.id}"></audio>
         </div></div>`
      : `<div class="hint" style="margin:6px 0 10px">Pas d'audio — horodatage inline indisponible.</div>`}
    ${textRows.length
      ? `<table class="reveals-grid"><thead><tr>
           <th class="rg-num">#</th><th>Texte FR</th><th>Texte EN</th><th>Type</th>
           <th>Prono</th><th>Taille</th><th>App. (s)</th><th>?</th><th></th>
         </tr></thead><tbody>${textRows.join("")}</tbody></table>`
      : ''}
    ${imgCards.join('')}
    ${!b.reveals.length?`<div class="hint">Aucun mot — cet état efface le tableau.</div>`:''}
    <div class="board-add-row">
      <button class="btn sm" onclick="addReveal(${b.id})">+ mot</button>
      <button class="btn sm" onclick="addImgReveal(${b.id})">+ image</button>
    </div>`;
  return d;
}

function addBipReponseReveal(sid){
  const s=getStep(sid); if(!s?.bip) return;
  if(!s.bip.reponse) s.bip.reponse={reveals:[],audioName:'',audioData:''};
  s.bip.reponse.reveals.push({type:"text",cat:"prono",fr:"",en:"",phon:"",at:0,removeAt:0,q:false,size:"m"});
  renderTableau();
}
function removeBipReponseReveal(sid,k){
  const s=getStep(sid); if(!s?.bip?.reponse) return;
  s.bip.reponse.reveals.splice(k,1); renderTableau();
}
function loadBipReponseAudio(sid,input){
  const f=input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    const s=getStep(sid);
    if(!s.bip.reponse) s.bip.reponse={reveals:[],audioName:'',audioData:''};
    s.bip.reponse.audioName=f.name; s.bip.reponse.audioData=e.target.result; renderTableau();
  };
  r.readAsDataURL(f);
}
function stampBipReponseAt(sid,k){
  const s=getStep(sid); if(!s?.bip?.reponse) return;
  const a=document.querySelector('[data-brep-audio="'+sid+'"]');
  if(!a){ toast("Lance l'audio réponse d'abord"); return; }
  s.bip.reponse.reveals[k].at=Math.round(a.currentTime*10)/10; renderTableau();
}
function stampBipReponseRemoveAt(sid,k){
  const s=getStep(sid); if(!s?.bip?.reponse) return;
  const a=document.querySelector('[data-brep-audio="'+sid+'"]');
  if(!a){ toast("Lance l'audio réponse d'abord"); return; }
  s.bip.reponse.reveals[k].removeAt=Math.round(a.currentTime*10)/10; renderTableau();
}
function renderBipReponseRevealRow(s,r,k){
  const sz=r.size||'m'; const cat=r.cat||'prono';
  const catOpts=Object.entries(REVEAL_TYPES).map(([v,t])=>`<option value="${v}"${cat===v?' selected':''}>${t.label}</option>`).join('');
  return `
    <tr class="rg-row${r.q?' q-on':''}">
      <td class="rg-num">${k+1}</td>
      <td><textarea class="en-ta" rows="1" placeholder="la table" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';getStep(${s.id}).bip.reponse.reveals[${k}].fr=this.value;scheduleSlotRefresh()">${esc(r.fr||'')}</textarea></td>
      <td><textarea class="en-ta" rows="1" placeholder="table"    oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';getStep(${s.id}).bip.reponse.reveals[${k}].en=this.value;scheduleSlotRefresh()">${esc(r.en||'')}</textarea></td>
      <td><select class="cat-sel" onchange="getStep(${s.id}).bip.reponse.reveals[${k}].cat=this.value;scheduleSlotRefresh()">${catOpts}</select></td>
      <td><input type="text" value="${esc(r.phon||'')}" placeholder="téï-beul" oninput="getStep(${s.id}).bip.reponse.reveals[${k}].phon=this.value;scheduleSlotRefresh()"></td>
      <td><div class="sz-group">${SZ_LIST.map(z=>`<button class="sz-btn${sz===z?' on':''}" onclick="getStep(${s.id}).bip.reponse.reveals[${k}].size='${z}';renderTableau()">${z.toUpperCase()}</button>`).join('')}</div></td>
      <td><div class="tc-wrap"><input class="at" type="number" step="0.1" min="0" value="${r.at||0}" oninput="getStep(${s.id}).bip.reponse.reveals[${k}].at=parseFloat(this.value)||0;scheduleSlotRefresh()"><button class="st-btn" onclick="stampBipReponseAt(${s.id},${k})" title="⌖">⌖</button></div></td>
      <td><label class="qtoggle${r.q?' q-on':''}"><input type="checkbox" ${r.q?"checked":""} onchange="getStep(${s.id}).bip.reponse.reveals[${k}].q=this.checked;renderTableau()"><span>Q</span></label></td>
      <td><span class="rg-del" onclick="removeBipReponseReveal(${s.id},${k})">×</span></td>
    </tr>`;
}

function renderBipBlock(s, stepIdx){
  if(!s.bip) s.bip={title:'', question:''};
  if(!s.bip.reponse) s.bip.reponse={reveals:[],audioName:'',audioData:''};
  const rep=s.bip.reponse;
  const textRows=rep.reveals.map((r,k)=>renderBipReponseRevealRow(s,r,k));
  const d=document.createElement("div");
  d.className="step bip-block"; d.dataset.stepId=s.id;
  d.innerHTML=`
    <div class="step-head">
      <span class="board-badge bip-badge">🔔 Bip</span>
      <span class="trigger-info">réplique <b>${String(stepIdx+1).padStart(2,"0")}</b> · Vous</span>
    </div>
    <div class="bip-fields">
      <label class="lab">Titre (optionnel)</label>
      <input type="text" placeholder="Comment dit-on en anglais :"
        value="${esc(s.bip.title||'')}"
        oninput="getStep(${s.id}).bip.title=this.value;scheduleLiveRefresh()">
      <label class="lab" style="margin-top:8px">Question / phrase</label>
      <input type="text" placeholder="Je voudrais le faire"
        value="${esc(s.bip.question||'')}"
        oninput="getStep(${s.id}).bip.question=this.value;scheduleLiveRefresh()">
    </div>
    <div class="step-head" style="margin-top:14px;border-top:1px solid rgba(255,255,255,.07);padding-top:12px">
      <span class="board-badge" style="background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.28);color:rgba(134,239,172,.90)">👁 Voir la réponse</span>
    </div>
    <div class="audiobox" style="margin:8px 0"><div class="audiorow">
      <button class="btn sm" onclick="this.nextElementSibling.click()">🎵 ${rep.audioName?"Changer":"Charger un .mp3"}</button>
      <input type="file" accept="audio/*" style="display:none" onchange="loadBipReponseAudio(${s.id},this)">
      ${rep.audioData
        ? `<audio controls src="${rep.audioData}" data-brep-audio="${s.id}"></audio><span class="tc-note">${esc(rep.audioName)}</span>`
        : `<span class="hint">aucun audio</span>`}
    </div></div>
    ${textRows.length
      ? `<table class="reveals-grid"><thead><tr>
           <th class="rg-num">#</th><th>Texte FR</th><th>Texte EN</th><th>Type</th>
           <th>Prono</th><th>Taille</th><th>App. (s)</th><th>?</th><th></th>
         </tr></thead><tbody>${textRows.join("")}</tbody></table>`
      : `<div class="hint">Aucun mot dans la réponse.</div>`}
    <div class="board-add-row">
      <button class="btn sm" onclick="addBipReponseReveal(${s.id})">+ mot réponse</button>
    </div>`;
  return d;
}

function renderTableau(){
  const c=$("tabTableauContent"); c.innerHTML="";
  let bIdx=-1;
  let hasContent=false;

  steps.forEach((s,i)=>{
    if(s.changeBoard){
      bIdx++;
      const b=boards[bIdx];
      if(b){
        c.appendChild(renderBoardBlock(b,i)); hasContent=true;
        const iz=document.createElement("div"); iz.className="insert-zone";
        iz.innerHTML=`<button class="insert-toggle" onclick="this.closest('.insert-zone').classList.toggle('open')" title="Insérer un état tableau ici">＋</button>
          <div class="insert-panel">
            <button class="btn sm" onclick="insertBoardAfter(${s.id},${b.id})">📋 État tableau ici</button>
          </div>`;
        c.appendChild(iz);
      }
    }
    if(s.role==='moi'){
      c.appendChild(renderBipBlock(s,i)); hasContent=true;
    }
  });

  // Boards orphelins sans déclencheur
  for(let i=bIdx+1;i<boards.length;i++){
    const b=boards[i];
    const d=document.createElement("div");
    d.className="step board-state no-trigger"; d.dataset.boardId=b.id;
    d.innerHTML=`<div class="step-head">
      <span class="board-badge">📋 Tableau</span>
      <span class="trigger-info warn">⚠ non déclenché — active 📋 sur une réplique vocale</span>
      <span class="spacer"></span>
      <button class="btn sm danger" onclick="removeBoard(${b.id})">🗑</button>
    </div>`;
    c.appendChild(d);
  }

  if(!hasContent){
    const empty=document.createElement("div"); empty.className="hint";
    empty.style.cssText="margin:24px auto;text-align:center";
    empty.textContent="Active 📋 sur une réplique vocale ou ajoute un bip pour créer du contenu tableau.";
    c.appendChild(empty);
  }

  const add=document.createElement("div"); add.className="addstep";
  add.innerHTML=`<button class="btn sm" onclick="addBoard()">+ Ajouter un état tableau</button>`;
  c.appendChild(add);

  scheduleLiveRefresh();
  scheduleSlotRefresh();
  requestAnimationFrame(()=>{
    document.querySelectorAll('textarea.en-ta').forEach(ta=>{
      ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px';
    });
  });
}

function render(){ renderVocal(); renderTableau(); }

/* ════════════════════════════════════════
   EXPORT / IMPORT
════════════════════════════════════════ */
function buildLesson(){
  const nameProf=$("mNameProf")?.value.trim()||"";
  const nameE1  =$("mNameE1")?.value.trim()||"";
  const nameE2  =$("mNameE2")?.value.trim()||"";
  const characters={};
  if(nameProf) characters.prof  ={name:nameProf};
  if(nameE1)   characters.eleve1={name:nameE1};
  if(nameE2)   characters.eleve2={name:nameE2};
  return {
    format:"mt-lesson", version:2,
    title:$("mTitle").value||"Leçon sans titre",
    pair:$("mPair").value,
    ...(Object.keys(characters).length?{characters}:{}),
    steps:steps.map(s=>{
      const o={role:s.role};
      if(s.role!=="moi"){ o.fr=s.fr||""; o.audioName=s.audioName||null; o.audio=s.audioData||null; }
      if(s.changeBoard) o.changeBoard=true;
      if(s.role==='moi' && s.bip){
        const rep=s.bip.reponse;
        const repRevs=(rep?.reveals||[]).filter(r=>r.en&&r.en.trim()).map(r=>({
          en:r.en,
          ...(r.fr?{fr:r.fr}:{}),
          ...(r.cat&&r.cat!=='prono'?{cat:r.cat}:{}),
          ...(r.phon?{phon:r.phon}:{}),
          at:r.at||0,
          ...(r.removeAt>0?{removeAt:r.removeAt}:{}),
          ...(r.q?{q:true}:{}),
          ...(r.size&&r.size!=='m'?{size:r.size}:{})
        }));
        o.bip={
          title:s.bip.title||'', question:s.bip.question||'',
          ...(repRevs.length||rep?.audioData?{reponse:{
            ...(repRevs.length?{reveals:repRevs}:{}),
            ...(rep?.audioData?{audio:rep.audioData, audioName:rep.audioName||null}:{})
          }}:{})
        };
      }
      return o;
    }),
    boards:boards.map(b=>{
      const revs=b.reveals.filter(r=>r.type==='image'?r.src:r.en&&r.en.trim());
      return {
        reveals:revs.map(r=>r.type==='image'
          ?{type:"image",src:r.src,at:r.at||0,...(r.removeAt>0?{removeAt:r.removeAt}:{})}
          :{en:r.en,
            ...(r.fr?{fr:r.fr}:{}),
            ...(r.cat&&r.cat!=='prono'?{cat:r.cat}:{}),
            ...(r.phon?{phon:r.phon}:{}),
            at:r.at||0,
            ...(r.removeAt>0?{removeAt:r.removeAt}:{}),
            ...(r.q?{q:true}:{}),
            ...(r.size&&r.size!=='m'?{size:r.size}:{})})
      };
    })
  };
}

function exportLesson(){
  const data=buildLesson();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(data.title.replace(/[^\w\-]+/g,"_").toLowerCase()||"lecon")+".mtlesson";
  a.click(); toast("Leçon exportée ✓");
}

function parseReveals(arr){
  return (arr||[]).map(r=>r.type==='image'
    ?{type:"image",src:r.src||"",at:r.at||0,removeAt:r.removeAt||0}
    :{type:"text",cat:r.cat||'prono',fr:r.fr||"",en:r.en||"",phon:r.phon||"",at:r.at||0,removeAt:r.removeAt||0,q:!!r.q,size:r.size||'m'});
}

function importLesson(file){
  const r=new FileReader();
  r.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      $("mTitle").value=d.title||""; $("mPair").value=d.pair||"fr-en";
      if($("mNameProf")) $("mNameProf").value=d.characters?.prof?.name||"";
      if($("mNameE1"))   $("mNameE1").value  =d.characters?.eleve1?.name||"";
      if($("mNameE2"))   $("mNameE2").value  =d.characters?.eleve2?.name||"";
      stepSeq=0; boardSeq=0;

      steps=(d.steps||[]).map(s=>({
        id:++stepSeq, role:s.role||"prof", fr:s.fr||"",
        audioName:s.audioName||"", audioData:s.audio||"",
        changeBoard:!!s.changeBoard,
        bip: s.role==='moi' ? {
          title:s.bip?.title||'', question:s.bip?.question||'',
          reponse:{
            reveals:parseReveals(s.bip?.reponse?.reveals),
            audioName:s.bip?.reponse?.audioName||'',
            audioData:s.bip?.reponse?.audio||''
          }
        } : undefined
      }));

      if(d.boards){
        const hasFromStep=d.boards.some(b=>b.fromStep!==undefined);
        if(hasFromStep){
          // Format v2 ancien (fromStep) → conversion
          const sorted=[...d.boards].sort((a,b)=>a.fromStep-b.fromStep);
          sorted.forEach(b=>{ if(steps[b.fromStep]) steps[b.fromStep].changeBoard=true; });
          boards=sorted.map(b=>({id:++boardSeq, reveals:parseReveals(b.reveals)}));
        } else {
          // Format v2 nouveau (changeBoard dans steps)
          boards=d.boards.map(b=>({id:++boardSeq, reveals:parseReveals(b.reveals)}));
          // Si aucun step ne déclenche de board (export incomplet), auto-assigner
          const hasAnyTrigger=steps.some(s=>s.changeBoard);
          if(!hasAnyTrigger && boards.length){
            let assigned=0;
            for(let i=0;i<steps.length&&assigned<boards.length;i++){
              if(steps[i].role!=='moi'){ steps[i].changeBoard=true; assigned++; }
            }
          }
        }
      } else {
        // Format v1 (reveals par step)
        boards=[];
        (d.steps||[]).forEach((s,i)=>{
          if(s.reveals?.length){
            steps[i].changeBoard=true;
            boards.push({id:++boardSeq, reveals:parseReveals(s.reveals)});
          }
        });
      }

      render(); liveIdx=0; liveStop(); updateStepCounter(0);
      toast("Leçon importée ✓");
    }catch(e){ toast("Fichier illisible"); }
  };
  r.readAsText(file);
}

/* ════════════════════════════════════════
   PREVIEW LIVE PERMANENTE
════════════════════════════════════════ */
let liveIdx          = 0;
let liveAudio        = null;
let liveTimerInterval= null;
let liveBoardTimers  = [];
let liveIsPlaying    = false;
let liveRefreshTimeout = null;
let liveReady        = false;
let livePvSeq        = 0;

// Barre de progression leçon
let lessonDurations     = [];  // durée audio de chaque step (0 si pas d'audio)
let lessonElapsedBefore = 0;   // secondes totales jouées avant le step courant
let liveSeekOffset      = 0;   // offset dans l'audio courant après un seek (reset après usage)

const LIVE_SIZES    = { xs:'13px', s:'18px', m:'clamp(14px,3.5vw,24px)', l:'32px', xl:'42px' };
const LIVE_SIZES_PX = { xs:13,     s:18,     m:24,                       l:32,     xl:42     };

const REVEAL_TYPES = {
  prono:        { label:'se dit',       icon:'../assets/icons/podcast.png',     phonSize:'l', svg:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' },
  traduction:   { label:'veut dire',    icon:'../assets/icons/traduire.png',    phonSize:'l', svg:'<line x1="17" y1="1" x2="17" y2="11"/><path d="M13 5l4-4 4 4"/><line x1="7" y1="13" x2="7" y2="23"/><path d="M3 19l4 4 4-4"/>' },
  construction: { label:'se construit', icon:'../assets/icons/reglages.png',    phonSize:'m', svg:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
  contraction:  { label:'contraction',  icon:'../assets/icons/les-ciseaux.png', phonSize:'l', svg:'<polyline points="5 7 2 12 5 17"/><polyline points="19 7 22 12 19 17"/><line x1="2" y1="12" x2="22" y2="12"/>' },
  expression:   { label:"s'utilise",    icon:'../assets/icons/evaluation.png',  phonSize:'s', svg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
};

/* ════════════════════════════════════════
   SLOT MACHINE — PREVIEW LIVE (mini 140px)
════════════════════════════════════════ */
const PV_SLOT_H = 140;
let pvSlotWords  = [];
let pvSlotActive = -1;

function pvSlotFontSize(en){
  const l=(en||'').length;
  if(l<=9)  return 46;
  if(l<=12) return 41;
  if(l<=16) return 38;
  return 22;
}
function pvSlotFontSizeFr(fr){
  const l=(fr||'').length;
  if(l<=9)  return 15;
  if(l<=13) return 14;
  return 13;
}

function pvSlotCardHTML(r){
  const td=REVEAL_TYPES[r.cat||'prono']||REVEAL_TYPES.prono;
  const sz=pvSlotFontSize(r.en||'');
  let h=`<div class="pv-ctype"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${td.svg||''}</svg>
    <span>${td.label}</span></div>`;
  if(r.fr?.trim()){
    const szFr=pvSlotFontSizeFr(r.fr);
    h+=`<div class="pv-cword-fr" style="font-size:${szFr}px">${esc(r.fr)}</div>`;
  }
  h+=`<div class="pv-cword" style="font-size:${sz}px">${esc(r.en||'')}</div>`;
  if(r.phon?.trim()) h+=`<div class="pv-cphon">${esc(r.phon)}</div>`;
  return h;
}

function pvInitSlotTrack(){
  const sl=document.getElementById('pvLiveSlate'); if(!sl) return;
  sl.innerHTML='';
  pvSlotWords=[]; pvSlotActive=-1;
  const track=document.createElement('div');
  track.id='pvSlotTrack'; track.className='pv-slot-track';
  sl.appendChild(track);
}

function pvAddBoardToTrack(reveals, boardAbsT){
  const track=document.getElementById('pvSlotTrack'); if(!track) return;
  (reveals||[]).forEach(r=>{
    if(r.type==='image') return;
    const w=Object.assign({},r);
    w._absAt=(r.at&&r.at>boardAbsT)?r.at:boardAbsT;
    const i=pvSlotWords.length;
    pvSlotWords.push(w);
    const el=document.createElement('div');
    el.className='pv-slot'; el.dataset.pvSlotIdx=i; el.dataset.cat=w.cat||'prono';
    el.innerHTML=pvSlotCardHTML(w);
    track.appendChild(el);
  });
  pvUpdateSlotClasses(false);
}

function pvUpdateTrackPos(animated){
  const track=document.getElementById('pvSlotTrack'); if(!track) return;
  const sl=document.getElementById('pvLiveSlate');
  const h=sl?sl.offsetHeight:420;
  const cy=h/2;
  const displayIdx=pvSlotActive<0?0:pvSlotActive;
  const y=Math.round(cy-PV_SLOT_H/2-displayIdx*PV_SLOT_H);
  // Léger overshoot — même clic roulette que l'app
  track.style.transition=animated?'transform .55s cubic-bezier(.3,1.12,.4,1)':'none';
  track.style.transform='translateY('+y+'px)';
}

function pvUpdateSlotClasses(animated){
  const displayIdx=pvSlotActive<0?0:pvSlotActive;
  document.querySelectorAll('#pvSlotTrack .pv-slot').forEach(el=>{
    const i=parseInt(el.dataset.pvSlotIdx);
    el.className='pv-slot';
    if(i===displayIdx)        el.classList.add('pv-slot-active');
    else if(i===displayIdx-1) el.classList.add('pv-slot-prev');
    else if(i===displayIdx+1) el.classList.add('pv-slot-next');
    else if(i<displayIdx)     el.classList.add('pv-slot-history');
    else                      el.classList.add('pv-slot-future');
    el.dataset.cat=pvSlotWords[i]?.cat||'prono';
  });
  pvUpdateTrackPos(animated!==false);
}

function pvActivateSlot(idx){
  pvSlotActive=idx;
  pvUpdateSlotClasses(true);
}

function pvTickSlot(absT){
  if(!pvSlotWords.length) return;
  let next=0;
  for(let i=pvSlotWords.length-1;i>=0;i--){
    if((pvSlotWords[i]._absAt||0)<=absT){ next=i; break; }
  }
  if(next!==pvSlotActive) pvActivateSlot(next);
}

/* Prépare la piste pour la lecture.
   fullRebuild=true  → reconstruction complète (seek, lancement, import).
   fullRebuild=false → mode incrémental : on ajoute seulement le board du step
                       courant si changeBoard=true. La piste existante reste intacte. */
function livePrepareForPlay(t, fullRebuild){
  const lesson=buildLesson();
  const trackMissing=!document.getElementById('pvSlotTrack');

  if(fullRebuild||trackMissing){
    pvInitSlotTrack();
    let bIdx=-1, elapsed=0;
    for(let i=0;i<=liveIdx&&i<lesson.steps.length;i++){
      if(lesson.steps[i]?.changeBoard){
        bIdx++;
        if(bIdx<lesson.boards.length)
          pvAddBoardToTrack(lesson.boards[bIdx].reveals, elapsed);
      }
      elapsed+=(lessonDurations[i]||0);
    }
  } else if(lesson.steps[liveIdx]?.changeBoard){
    // Ajoute uniquement le board qui vient de se déclencher
    const bIdx=lesson.steps.slice(0,liveIdx+1).filter(s=>s.changeBoard).length-1;
    if(bIdx>=0&&bIdx<lesson.boards.length)
      pvAddBoardToTrack(lesson.boards[bIdx].reveals, lessonElapsedBefore);
  }
  // Dans tous les cas : avance le slot actif sans rien reconstruire
  pvTickSlot(t);
}

/* Appelée sur timeupdate : avance le slot actif. */
function liveTickReveals(t){
  pvTickSlot(t);
}

/* Preview statique (hors lecture) : reconstruit la piste, active le dernier mot. */
function pvBuildStaticPreview(){
  const lesson=buildLesson();
  pvInitSlotTrack();
  let bIdx=-1, elapsed=0;
  for(let i=0;i<=liveIdx&&i<lesson.steps.length;i++){
    if(lesson.steps[i]?.changeBoard){
      bIdx++;
      if(bIdx<lesson.boards.length)
        pvAddBoardToTrack(lesson.boards[bIdx].reveals, elapsed);
    }
    elapsed+=(lessonDurations[i]||0);
  }
  if(pvSlotWords.length){ pvSlotActive=pvSlotWords.length-1; pvUpdateSlotClasses(false); }
}

/* ════════════════════════════════════════
   PREVIEW — lecture complète de la leçon
════════════════════════════════════════ */
let liveAtBip=false;    // pausé sur un bip, en attente de "Continuer"
let liveIsPaused=false; // audio en pause (position préservée, liveAudio intact)

/* Précharge les durées de tous les audios de la leçon */
function preloadLessonDurations(){
  return Promise.all(steps.map(s=>{
    if(!s.audioData) return Promise.resolve(0);
    return new Promise(res=>{
      const a=new Audio();
      a.onloadedmetadata=()=>res(isFinite(a.duration)?a.duration:0);
      a.onerror=()=>res(0);
      a.src=s.audioData;
    });
  }));
}

/* Met à jour la barre de progression (elapsed = secondes écoulées) */
function updateProgressBar(elapsed){
  const fill=document.getElementById('pvProgressFill'); if(!fill) return;
  const total=lessonDurations.reduce((a,b)=>a+b,0);
  const totEl=document.getElementById('pvTimeTot');
  if(totEl) totEl.textContent=total>0?total.toFixed(1)+'s':'—';
  if(!total){ fill.style.width='0%'; return; }
  const pct=Math.min(100, elapsed/total*100);
  fill.style.width=pct.toFixed(2)+'%';
}

/* Avance ou recule de delta secondes dans la leçon */
function seekRelative(delta){
  // Calculer la position courante en secondes absolues
  const currentSec = lessonElapsedBefore +
    (liveAudio ? liveAudio.currentTime : 0);
  const total = lessonDurations.reduce((a,b)=>a+b,0);
  const target = Math.max(0, Math.min(total||0, currentSec+delta));
  seekToAbsolute(target);
}

/* Navigue à targetSec (temps absolu leçon). Reprend si lecture en cours. */
async function seekToAbsolute(targetSec){
  if(lessonDurations.length !== steps.length)
    lessonDurations = await preloadLessonDurations();
  const total = lessonDurations.reduce((a,b)=>a+b,0);
  if(!total) return;

  const wasPlaying = liveIsPlaying || liveAtBip;
  const wasPaused  = liveIsPaused;

  // Arrêt propre
  liveIsPlaying=false; liveAtBip=false; liveIsPaused=false;
  if(liveAudio){ liveAudio.pause(); liveAudio.ontimeupdate=null; liveAudio=null; }
  clearInterval(liveTimerInterval);
  const cb=document.getElementById('pvContinueBtn'); if(cb) cb.style.display='none';

  // Trouver le step cible
  let elapsed=0, targetIdx=steps.length-1, offset=0;
  for(let i=0;i<steps.length;i++){
    const dur=lessonDurations[i]||0;
    if(elapsed+dur > targetSec){ targetIdx=i; offset=targetSec-elapsed; break; }
    elapsed+=dur;
  }

  liveIdx=targetIdx; lessonElapsedBefore=elapsed; liveSeekOffset=offset;
  updateStepUI(steps[targetIdx], targetIdx);
  updateProgressBar(targetSec);
  const timerEl=document.getElementById('pvLiveTimer');
  if(timerEl) timerEl.textContent='⏱ '+targetSec.toFixed(1)+'s';

  if(wasPlaying){
    liveIsPlaying=true;
    updateLivePlayBtn();
    playCurrentStep(); // gère livePrepareForPlay + seek audio via liveSeekOffset
  } else {
    livePrepareForPlay(targetSec); // afficher le tableau sans lancer la lecture
    if(wasPaused) liveIsPaused=true; // conserver l'état pause
    updateLivePlayBtn();
  }
}

function liveToggle(){
  if(liveAtBip) return; // bip en cours → ignorer, utiliser "Continuer"
  if(liveIsPaused){
    // Reprendre depuis la pause
    liveIsPaused=false; liveIsPlaying=true;
    updateLivePlayBtn();
    if(liveAudio){
      liveAudio.play().catch(()=>{});
      // Relancer l'intervalle de sauvegarde du timer
      clearInterval(liveTimerInterval);
      const t0=lessonElapsedBefore;
      liveTimerInterval=setInterval(()=>{
        const el=document.getElementById('pvLiveTimer');
        if(liveAudio&&el) el.textContent='⏱ '+(t0+liveAudio.currentTime).toFixed(1)+'s';
      },80);
    } else {
      playCurrentStep(); // si on était entre deux steps
    }
  } else if(liveIsPlaying){
    // Mettre en pause
    liveIsPaused=true; liveIsPlaying=false;
    if(liveAudio) liveAudio.pause();
    clearInterval(liveTimerInterval);
    updateLivePlayBtn();
  } else {
    livePlayLesson();
  }
}

async function livePlayLesson(){
  liveStop();
  liveIdx=0;
  lessonElapsedBefore=0;
  liveIsPlaying=true;
  updateLivePlayBtn();
  // Précharge toutes les durées audio pour une barre proportionnelle au temps
  lessonDurations = await preloadLessonDurations();
  if(!liveIsPlaying) return; // stop() appelé pendant le chargement
  playCurrentStep();
}

function liveStop(){
  liveIsPlaying=false; liveAtBip=false; liveIsPaused=false;
  if(liveAudio){ liveAudio.pause(); liveAudio.ontimeupdate=null; liveAudio=null; }
  clearInterval(liveTimerInterval);
  const cb=document.getElementById('pvContinueBtn');
  if(cb) cb.style.display='none';
  updateLivePlayBtn();
  pvInitSlotTrack();
  const timerEl=document.getElementById('pvLiveTimer');
  if(timerEl) timerEl.textContent='⏱ 0.0s';
  updateProgressBar(0);
}

function liveRestart(){ liveStop(); liveIdx=0; lessonElapsedBefore=0; updateStepCounter(); }

/* Appelé quand l'utilisateur clique "→ Continuer" après un bip */
function liveContinue(){
  if(!liveAtBip) return;
  liveAtBip=false;
  const cb=document.getElementById('pvContinueBtn');
  if(cb) cb.style.display='none';
  liveIdx++;
  if(liveIsPlaying) playCurrentStep();
}

/* Moteur de lecture : joue le step liveIdx puis enchaîne */
function playCurrentStep(){
  if(!liveIsPlaying) return;
  if(liveIdx>=steps.length){ liveFinished(); return; }

  const s=steps[liveIdx];
  updateStepUI(s, liveIdx);

  if(s.role==='moi'){
    showBipBoard(s);
    return; // attend liveContinue()
  }

  // t0 = temps absolu au début de ce step ; seekOff = offset si seek en cours
  const t0 = lessonElapsedBefore;
  const seekOff = liveSeekOffset; liveSeekOffset = 0;
  livePrepareForPlay(t0 + seekOff, seekOff > 0);

  if(s.audioData){
    liveAudio=new Audio(s.audioData);
    if(seekOff > 0){
      // Dès que les métadonnées sont dispo, on positionne la tête de lecture
      liveAudio.addEventListener('loadedmetadata', ()=>{ if(liveAudio) liveAudio.currentTime=seekOff; }, {once:true});
    }
    liveAudio.ontimeupdate=()=>{
      const absT = t0 + liveAudio.currentTime;
      liveTickReveals(absT);
      const el=document.getElementById('pvLiveTimer');
      if(el) el.textContent='⏱ '+absT.toFixed(1)+'s';
      updateProgressBar(absT);
    };
    liveAudio.onended=()=>{
      const dur=liveAudio.duration||lessonDurations[liveIdx]||0;
      lessonElapsedBefore+=dur;
      liveAudio.ontimeupdate=null; liveAudio=null;
      clearInterval(liveTimerInterval);
      liveIdx++;
      if(liveIsPlaying) playCurrentStep();
    };
    liveAudio.play().catch(()=>{});
    clearInterval(liveTimerInterval);
    liveTimerInterval=setInterval(()=>{
      const el=document.getElementById('pvLiveTimer');
      if(liveAudio&&el) el.textContent='⏱ '+(t0+liveAudio.currentTime).toFixed(1)+'s';
    },80);
  } else {
    // Pas d'audio : accumuler la durée préchargée et enchaîner
    lessonElapsedBefore += lessonDurations[liveIdx]||0;
    liveIdx++;
    playCurrentStep();
  }
}

/* Affiche le bip dans le caption — la piste slot reste visible */
function showBipBoard(s){
  liveAtBip=true;
  updateLivePlayBtn();
  const timerEl=document.getElementById('pvLiveTimer');
  if(timerEl) timerEl.textContent='⏱ '+lessonElapsedBefore.toFixed(1)+'s';
  const capEl=document.getElementById('pvLiveCap');
  if(capEl){
    let html='<b>🔔 À vous !</b>';
    if(s.bip?.title) html+=` <span style="opacity:.6;font-size:10px">${esc(s.bip.title)}</span>`;
    if(s.bip?.question) html+=`<br><span style="font-weight:700;color:#fbbf24">${esc(s.bip.question)}</span>`;
    capEl.innerHTML=html;
  }
  const cb=document.getElementById('pvContinueBtn');
  if(cb) cb.style.display='';
}

function liveFinished(){
  liveIsPlaying=false;
  updateLivePlayBtn();
  const capEl=document.getElementById('pvLiveCap');
  if(capEl) capEl.textContent='✓ Leçon terminée';
  updateProgressBar(Infinity); // 100%
}

function updateLivePlayBtn(){
  const btn=document.getElementById('pvLivePlayBtn'); if(!btn) return;
  if(liveIsPlaying){
    btn.textContent='⏸'; btn.title='Pause'; btn.classList.add('playing');
  } else if(liveIsPaused){
    btn.textContent='▶'; btn.title='Reprendre'; btn.classList.remove('playing');
  } else {
    btn.textContent='▶'; btn.title='Lancer la leçon complète'; btn.classList.remove('playing');
  }
}

function updateStepUI(s, idx){
  const spkEl=document.getElementById('pvLiveSpeaker');
  if(spkEl){ spkEl.textContent=ROLE_LABEL[s.role]; spkEl.dataset.who=s.role==='moi'?'vous':s.role; }
  const capEl=document.getElementById('pvLiveCap');
  if(capEl) capEl.innerHTML=s.role==='moi'?'<b>🔔 À vous !</b>':(s.fr||'…');
  updateStepCounter(idx);
}

function updateStepCounter(idx){
  const i=idx!==undefined?idx:liveIdx;
  const el=document.getElementById('pvLiveStep');
  if(el) el.textContent=steps.length?`${String(i+1).padStart(2,'0')} / ${steps.length}`:'— / —';
}

function scheduleLiveRefresh(){
  if(!liveReady) return;
  clearTimeout(liveRefreshTimeout);
  liveRefreshTimeout=setTimeout(()=>{
    if(steps.length&&liveIdx>=steps.length) liveIdx=steps.length-1;
    updateStepCounter();
    if(liveIsPlaying&&liveAudio){
      livePrepareForPlay(lessonElapsedBefore+liveAudio.currentTime, true);
    }
    // le slot machine ne se reconstruit PAS ici — uniquement via scheduleSlotRefresh
  },250);
}

let pvSlotRefreshTimeout=null;
/* Déclenché uniquement par les champs tableau (contenu des boards). */
function scheduleSlotRefresh(){
  if(!liveReady) return;
  clearTimeout(pvSlotRefreshTimeout);
  pvSlotRefreshTimeout=setTimeout(()=>{
    if(liveIsPlaying && liveAudio){
      livePrepareForPlay(lessonElapsedBefore + liveAudio.currentTime, true);
    } else if(!liveAtBip){
      pvBuildStaticPreview();
    }
  },250);
}

$("exportBtn").onclick=exportLesson;
$("importBtn").onclick=()=>$("fileImport").click();
$("fileImport").onchange=function(){ if(this.files[0]) importLesson(this.files[0]); this.value=""; };

/* ════════════════════════════════════════
   LEÇON D'EXEMPLE + INITIALISATION
════════════════════════════════════════ */
$("mTitle").value="Les mots en « -able / -ible »";
if($("mNameProf")) $("mNameProf").value="Marc";
if($("mNameE1"))   $("mNameE1").value  ="Sophie";
if($("mNameE2"))   $("mNameE2").value  ="Julien";
steps=[
  {id:++stepSeq, role:"prof",   changeBoard:true,  fr:'Les mots en « -ible »… <b>possible</b>. Et un mot de tous les jours : <b>table</b>.', audioName:"",audioData:""},
  {id:++stepSeq, role:"prof",   changeBoard:false, fr:'Vous saviez même pas que vous connaissiez ces mots !', audioName:"",audioData:""},
  {id:++stepSeq, role:"prof",   changeBoard:true,  fr:'Petit exercice. <b>« table »</b> en anglais ?', audioName:"",audioData:""},
  {id:++stepSeq, role:"moi",    changeBoard:false, fr:"", audioName:"",audioData:"", bip:{title:"",question:"",reponse:{reveals:[],audioName:'',audioData:''}}},
  {id:++stepSeq, role:"eleve1", changeBoard:false, fr:"Table ?", audioName:"",audioData:""}
];
boards=[
  {id:++boardSeq, reveals:[
    {type:"text",en:"possible",phon:"po-si-beul",at:1.6,removeAt:0,q:false,size:"m"},
    {type:"text",en:"table",   phon:"téï-beul",  at:4.2,removeAt:0,q:false,size:"m"}
  ]},
  {id:++boardSeq, reveals:[
    {type:"text",en:"table",phon:"téï-beul",at:0,removeAt:0,q:true,size:"l"}
  ]}
];
render();
liveReady=true;
updateStepCounter(0);
pvBuildStaticPreview();

// Clic sur la barre de progression = seek
document.getElementById('pvProgressFill')?.closest('.pv-progress-wrap')?.addEventListener('click', async e=>{
  if(!steps.length) return;
  if(lessonDurations.length !== steps.length)
    lessonDurations = await preloadLessonDurations();
  const total = lessonDurations.reduce((a,b)=>a+b,0);
  if(!total) return;
  const wrap = e.currentTarget;
  const frac = Math.max(0, Math.min(1, (e.clientX - wrap.getBoundingClientRect().left) / wrap.offsetWidth));
  seekToAbsolute(frac * total);
});

