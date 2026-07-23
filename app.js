const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={zip:null,root:'',catalog:{},index:[],detailCache:new Map(),character:null};
const categories=['armor','background','class','companion','deity','disease','epicdestiny','feat','glossary','implement','item','monster','paragonpath','poison','power','race','ritual','theme','trap','weapon'];
const abilityNames=['STR','CON','DEX','INT','WIS','CHA'];

function blankCharacter(){return{schemaVersion:1,id:crypto.randomUUID(),name:'',level:1,race:'',className:'',paragonPath:'',epicDestiny:'',hpMax:20,hpCurrent:20,surgesMax:8,surgesCurrent:8,ac:10,fort:10,ref:10,will:10,speed:6,initiative:0,abilities:Object.fromEntries(abilityNames.map(x=>[x,10])),skills:'',notes:'',entries:[]}}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2200)}
function parseJsonpObject(text){const start=text.indexOf('{'),end=text.lastIndexOf('}');if(start<0||end<0)throw new Error('No JSON object found');return JSON.parse(text.slice(start,end+1))}
function cleanIndexText(v){return String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}

async function loadZip(file){
  $('#statusText').textContent='Reading ZIP…';
  state.zip=await JSZip.loadAsync(file);
  const catalogPath=Object.keys(state.zip.files).find(n=>n.endsWith('/4e_database_files/catalog.js'));
  if(!catalogPath)throw new Error('This ZIP does not contain the Xenoth 4e database.');
  state.root=catalogPath.replace('catalog.js','');
  state.catalog=parseJsonpObject(await state.zip.file(catalogPath).async('text'));
  $('#catalogSummary').textContent=Object.entries(state.catalog).map(([k,v])=>`${k}: ${v.toLocaleString()}`).join(' · ');
  $('#categoryFilter').innerHTML='<option value="all">All categories</option>'+Object.keys(state.catalog).map(k=>`<option value="${k}">${k} (${state.catalog[k].toLocaleString()})</option>`).join('');
  $('#statusText').textContent='Indexing compendium…';
  const entries=[];
  for(const category of Object.keys(state.catalog)){
    const p=`${state.root}${category}/_index.js`;
    const f=state.zip.file(p); if(!f)continue;
    const obj=parseJsonpObject(await f.async('text'));
    for(const [id,text] of Object.entries(obj))entries.push({id,category,text:cleanIndexText(text),name:guessName(cleanIndexText(text),category)});
  }
  state.index=entries;
  $('#statusText').textContent=`Ready: ${entries.length.toLocaleString()} indexed entries.`;
  $('#searchInput').disabled=$('#categoryFilter').disabled=$('#searchButton').disabled=false;
  renderResults(entries.slice(0,80));
  toast('Xenoth compendium loaded');
}
function guessName(text,category){
  const known=text.match(/^(.{2,90}?)(?=\s(?:Level\s\d+|[A-Z][a-z]+\s(?:Attack|Utility|Feature)|Heroic Tier|Paragon Tier|Epic Tier|Medium|Small|Large|Tiny|Huge|Gargantuan)\b)/);
  return (known?.[1]||text.split(/\s{2,}|\.|:/)[0]||category).trim().slice(0,100);
}
function doSearch(){
  const q=$('#searchInput').value.trim().toLowerCase(),cat=$('#categoryFilter').value;
  const terms=q.split(/\s+/).filter(Boolean);
  let rows=state.index.filter(e=>(cat==='all'||e.category===cat)&&terms.every(t=>e.text.toLowerCase().includes(t)));
  rows.sort((a,b)=>score(b,q)-score(a,q)||a.name.localeCompare(b.name));
  renderResults(rows.slice(0,250),rows.length);
}
function score(e,q){if(!q)return 0;const n=e.name.toLowerCase(),t=e.text.toLowerCase();return(n===q?10:n.startsWith(q)?6:n.includes(q)?4:0)+(t.includes(q)?1:0)}
function renderResults(rows,total=rows.length){
  $('#resultCount').textContent=total.toLocaleString(); const box=$('#results'); box.innerHTML='';
  if(!rows.length){box.className='results empty-state';box.textContent='No matching entries.';return} box.className='results';
  for(const e of rows){const node=$('#resultTemplate').content.firstElementChild.cloneNode(true);node.querySelector('strong').textContent=e.name;node.querySelector('small').textContent=e.text.slice(0,180);node.querySelector('.category-pill').textContent=e.category;node.addEventListener('click',ev=>{if(ev.target.closest('.add-label'))addEntryToCharacter(e);else showDetail(e)});box.append(node)}
}
async function showDetail(e){
  $('#detail').innerHTML='<div class="empty-state">Loading full entry…</div>';
  try{const html=await getEntryHtml(e.category,e.id);$('#detail').innerHTML=`<div class="no-print"><button id="detailAdd">Add to character</button></div>${html||`<h2>${escapeHtml(e.name)}</h2><p>${escapeHtml(e.text)}</p>`}`;$('#detailAdd').onclick=()=>addEntryToCharacter(e)}catch(err){$('#detail').innerHTML=`<h2>${escapeHtml(e.name)}</h2><p>${escapeHtml(e.text)}</p><p class="muted">Full entry could not be loaded: ${escapeHtml(err.message)}</p>`}
}
async function getEntryHtml(category,id){
  const key=`${category}:${id}`;if(state.detailCache.has(key))return state.detailCache.get(key);
  const paths=Object.keys(state.zip.files).filter(n=>n.startsWith(`${state.root}${category}/data`)&&n.endsWith('.js')).sort((a,b)=>Number(a.match(/data(\d+)/)?.[1])-Number(b.match(/data(\d+)/)?.[1]));
  for(const p of paths){const text=await state.zip.file(p).async('text');if(!text.includes(`"${id}"`))continue;const obj=parseJsonpObject(text);if(obj[id]){state.detailCache.set(key,obj[id]);return obj[id]}}
  return null;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function initAbilities(){const box=$('#abilities');box.innerHTML='';for(const a of abilityNames){const l=document.createElement('label');l.textContent=a;l.innerHTML+=`<input data-ability="${a}" type="number" value="10">`;box.append(l)}}
function addEntryToCharacter(e){if(!state.character)state.character=blankCharacter();if(state.character.entries.some(x=>x.id===e.id))return toast('Already on character');state.character.entries.push({id:e.id,category:e.category,name:e.name,summary:e.text,used:false,html:''});renderCharacterEntries();toast(`${e.name} added`)}
async function renderCharacterEntries(){const box=$('#characterEntries');box.innerHTML='';const groups=Object.groupBy?Object.groupBy(state.character.entries,e=>e.category):state.character.entries.reduce((a,e)=>((a[e.category]??=[]).push(e),a),{});for(const [cat,items] of Object.entries(groups)){const group=document.createElement('section');group.className='entry-group';group.innerHTML=`<h4>${escapeHtml(cat[0].toUpperCase()+cat.slice(1))} (${items.length})</h4>`;for(const e of items){const d=document.createElement('details');d.className='character-entry';d.innerHTML=`<summary>${escapeHtml(e.name)} <span class="entry-controls no-print"><button data-use>${e.used?'Reset':'Use'}</button><button data-remove>Remove</button></span></summary><div class="entry-body">${e.html||`<p>${escapeHtml(e.summary)}</p><button class="no-print" data-expand>Load full entry</button>`}</div>`;d.querySelector('[data-remove]').onclick=ev=>{ev.preventDefault();state.character.entries=state.character.entries.filter(x=>x.id!==e.id);renderCharacterEntries()};d.querySelector('[data-use]').onclick=ev=>{ev.preventDefault();e.used=!e.used;renderCharacterEntries()};const expand=d.querySelector('[data-expand]');if(expand)expand.onclick=async()=>{expand.disabled=true;expand.textContent='Loading…';e.html=await getEntryHtml(e.category,e.id)||`<p>${escapeHtml(e.summary)}</p>`;renderCharacterEntries()};group.append(d)}box.append(group)}if(!state.character.entries.length)box.innerHTML='<p class="muted">No powers, feats, items, or other entries added yet.</p>'}
function readForm(){const c=state.character;c.name=$('#characterName').value;c.level=+$(`#level`).value||1;for(const [k,id] of [['race','race'],['className','className'],['paragonPath','paragonPath'],['epicDestiny','epicDestiny'],['hpMax','hpMax'],['hpCurrent','hpCurrent'],['surgesMax','surgesMax'],['surgesCurrent','surgesCurrent'],['ac','ac'],['fort','fort'],['ref','ref'],['will','will'],['speed','speed'],['initiative','initiative'],['skills','skills'],['notes','notes']])c[k]=['skills','notes','race','className','paragonPath','epicDestiny'].includes(k)?$(`#${id}`).value:+$(`#${id}`).value||0;$$('[data-ability]').forEach(i=>c.abilities[i.dataset.ability]=+i.value||0);updateHeader();return c}
function writeForm(c){state.character=c;$('#characterName').value=c.name||'';for(const [k,id] of [['level','level'],['race','race'],['className','className'],['paragonPath','paragonPath'],['epicDestiny','epicDestiny'],['hpMax','hpMax'],['hpCurrent','hpCurrent'],['surgesMax','surgesMax'],['surgesCurrent','surgesCurrent'],['ac','ac'],['fort','fort'],['ref','ref'],['will','will'],['speed','speed'],['initiative','initiative'],['skills','skills'],['notes','notes']])$(`#${id}`).value=c[k]??'';$$('[data-ability]').forEach(i=>i.value=c.abilities?.[i.dataset.ability]??10);updateHeader();renderCharacterEntries()}
function updateHeader(){const c=state.character;$('#sheetName').textContent=c.name||'Unnamed Hero';$('#sheetSummary').textContent=`Level ${c.level||1} ${[c.race,c.className].filter(Boolean).join(' ')||'Adventurer'}`}
function storage(){return JSON.parse(localStorage.getItem('xenothCharacters')||'[]')}
function saveCharacter(){readForm();const all=storage(),i=all.findIndex(x=>x.id===state.character.id);if(i>=0)all[i]=structuredClone(state.character);else all.push(structuredClone(state.character));localStorage.setItem('xenothCharacters',JSON.stringify(all));renderLibrary();toast('Character saved locally')}
function renderLibrary(){const all=storage(),box=$('#characterLibrary');$('#savedCount').textContent=all.length;if(!all.length){box.className='cards empty-state';box.textContent='No saved characters yet.';return}box.className='cards';box.innerHTML='';for(const c of all){const d=document.createElement('article');d.className='saved-card';d.innerHTML=`<h3>${escapeHtml(c.name||'Unnamed Hero')}</h3><p>Level ${c.level} ${escapeHtml([c.race,c.className].filter(Boolean).join(' '))}</p><div class="saved-actions"><button data-open>Open</button><button data-delete>Delete</button></div>`;d.querySelector('[data-open]').onclick=()=>{writeForm(structuredClone(c));switchView('character')};d.querySelector('[data-delete]').onclick=()=>{localStorage.setItem('xenothCharacters',JSON.stringify(all.filter(x=>x.id!==c.id)));renderLibrary()};box.append(d)}}
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function switchView(name){$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===name));$$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`))}

initAbilities();writeForm(blankCharacter());renderLibrary();
$('#zipInput').addEventListener('change',e=>loadZip(e.target.files[0]).catch(err=>{$('#statusText').textContent=err.message;toast(err.message)}));
$('#searchButton').onclick=doSearch;$('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch()});$('#categoryFilter').onchange=doSearch;
$$('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));
$('#newCharacter').onclick=()=>writeForm(blankCharacter());$('#saveCharacter').onclick=saveCharacter;
$('#characterName').oninput=()=>{state.character.name=$('#characterName').value;updateHeader()};$('#level').oninput=()=>{state.character.level=+$('#level').value||1;updateHeader()};
$('#shortRest').onclick=()=>{state.character.entries.forEach(e=>{if(/encounter/i.test(e.summary+e.name))e.used=false});renderCharacterEntries();toast('Encounter powers reset')};
$('#extendedRest').onclick=()=>{readForm();state.character.hpCurrent=state.character.hpMax;state.character.surgesCurrent=state.character.surgesMax;state.character.entries.forEach(e=>e.used=false);writeForm(state.character);toast('Extended rest applied')};
$('#spendSurge').onclick=()=>{readForm();if(state.character.surgesCurrent>0){state.character.surgesCurrent--;state.character.hpCurrent=Math.min(state.character.hpMax,state.character.hpCurrent+Math.floor(state.character.hpMax/4));writeForm(state.character)}};
$('#exportCharacter').onclick=()=>{readForm();download(`${(state.character.name||'character').replace(/[^a-z0-9]+/gi,'_')}.json`,JSON.stringify(state.character,null,2))};
$('#importCharacter').onchange=async e=>{try{const c=JSON.parse(await e.target.files[0].text());if(!c.schemaVersion||!Array.isArray(c.entries))throw new Error('Unsupported character file');writeForm(c);toast('Character imported')}catch(err){toast(err.message)}};
$('#printCharacter').onclick=async()=>{readForm();for(const e of state.character.entries)if(!e.html&&state.zip)e.html=await getEntryHtml(e.category,e.id)||'';renderCharacterEntries();$$('.character-entry').forEach(d=>d.open=true);window.print()};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
