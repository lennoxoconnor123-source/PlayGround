const locations = [
  {name:'Tokyo',country:'Japan',flag:'🇯🇵',image:'tokyo',palette:['#de7893','#554e75','#283e52']},
  {name:'London',country:'United Kingdom',flag:'🇬🇧',image:'london',palette:['#879aa8','#667989','#33424b']},
  {name:'Los Angeles',country:'America',flag:'🇺🇸',image:'la',palette:['#e8a479','#987c8a','#494b62']},
  {name:'Mexico City',country:'Mexico',flag:'🇲🇽',palette:['#e7aa7a','#b37b70','#5a535a']},
  {name:'Budapest',country:'Hungary',flag:'🇭🇺',palette:['#dab5a0','#8c8690','#485360']},
  {name:'Nürburgring',country:'Germany',flag:'🇩🇪',palette:['#9caab5','#788c87','#43544d']},
  {name:'Victoria Falls',country:'Zimbabwe',flag:'🇿🇼',palette:['#e4b782','#a29b7b','#4a665a']},
  {name:'Lagos',country:'Nigeria',flag:'🇳🇬',palette:['#e5a678','#ad8874','#58666a']},
  {name:'Paris',country:'France',flag:'🇫🇷',palette:['#d4a3a2','#918696','#535a6b']},
  {name:'Dubai',country:'UAE',flag:'🇦🇪',palette:['#ecc18c','#b7a296','#6a6b70']},
  {name:'Rome',country:'Italy',flag:'🇮🇹',palette:['#edb68d','#b38b7e','#6d6060']},
  {name:'Sydney',country:'Australia',flag:'🇦🇺',palette:['#8cb7c5','#7497a0','#50696f']},
  {name:'Rio',country:'Brazil',flag:'🇧🇷',palette:['#edb68b','#98a3a0','#4b746c']}
];
const cars = [
  ['Bugatti Chiron','Supercars',95,78,'#3b83cd'],['Lamborghini Aventador SVJ','Supercars',93,82,'#e5bd31'],['Ferrari LaFerrari','Supercars',94,85,'#ef4235'],['McLaren P1','Supercars',92,88,'#ed8c31'],['Koenigsegg Jesko','Supercars',99,80,'#dedede'],['Pagani Huayra','Supercars',93,86,'#a9aeb5'],['Ferrari SF90','Supercars',94,90,'#df332f'],['Ford GT','Supercars',91,87,'#417dc3'],
  ['Nissan Skyline R34','Japanese cars',84,91,'#609ad3'],['Toyota Supra MK4','Japanese cars',85,87,'#ed9a2c'],['Mazda RX-7','Japanese cars',82,94,'#e9c74a'],['Honda NSX','Japanese cars',83,93,'#dc4641'],['Nissan Skyline R32','Japanese cars',81,89,'#babfc5'],['Mitsubishi Evo 9','Japanese cars',80,93,'#d7d9d9'],['Subaru Impreza 22B','Japanese cars',82,92,'#416ec8'],
  ['Ferrari F40','Classic cars',87,82,'#d83b36'],['Lamborghini Countach','Classic cars',85,78,'#efefea'],['Porsche 911 Carrera RS','Classic cars',81,90,'#eee8d7'],['Aston Martin DB5','Classic cars',76,80,'#aab0ad'],['Ford Escort RS Cosworth','Classic cars',78,89,'#557cc5']
].map(([name,category,speed,handling,color])=>({name,category,speed,handling,color}));
let selectedLocation=locations[0], selectedCar=cars[0], game=null, modalType='locations', filter='All';
const $=id=>document.getElementById(id);
function renderSetup(){
  $('selectedLocation').textContent=selectedLocation.name.toUpperCase(); $('selectedCountry').textContent=selectedLocation.country.toUpperCase(); $('selectedFlag').textContent=selectedLocation.flag;
  $('selectedCar').textContent=selectedCar.name.toUpperCase(); $('selectedClass').textContent=selectedCar.category==='Supercars'?'SUPERCAR':selectedCar.category.toUpperCase().replace(/S$/,'');
  $('speedStat').textContent=selectedCar.speed; $('handlingStat').textContent=selectedCar.handling; $('speedBar').style.width=selectedCar.speed+'%'; $('handlingBar').style.width=selectedCar.handling+'%';
  $('featuredLocations').innerHTML=locations.slice(0,3).map((l,i)=>`<button class="location-card ${selectedLocation===l?'active':''}" data-featured="${i}" aria-label="Select ${l.name}"><img src="assets/${l.image}.jpg" alt=""><span class="location-info"><small>${l.flag} ${l.country.toUpperCase()}</small><strong>${l.name.toUpperCase()}</strong></span>${selectedLocation===l?'<span class="location-check">✓</span>':''}</button>`).join('');
  document.querySelectorAll('[data-featured]').forEach(el=>el.onclick=()=>{selectedLocation=locations[+el.dataset.featured];renderSetup()});
}
function openModal(type){modalType=type;filter='All';$('selectionModal').classList.remove('hidden');$('crumb').textContent=type==='garage'?'GARAGE':'LOCATIONS';document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===type));renderModal()}
function closeModal(){$('selectionModal').classList.add('hidden');$('crumb').textContent='RACE';document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view==='home'))}
function renderModal(){
  const garage=modalType==='garage'; $('modalTitle').innerHTML=garage?'CHOOSE YOUR <em>RIDE</em>':'CHOOSE YOUR <em>LOCATION</em>'; $('modalSubtitle').textContent=garage?'20 icons. One driver. Find the car that fits your style.':'The world is waiting. Pick your next destination.';
  let filters=garage?['All','Supercars','Japanese cars','Classic cars']:['All'];
  $('modalFilters').innerHTML=filters.map(f=>`<button class="filter ${f===filter?'active':''}" data-filter="${f}">${f.toUpperCase()} ${f==='All'?(garage?'20':'13'):''}</button>`).join('');
  $('modalFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderModal()});
  if(garage){$('modalGrid').innerHTML=cars.map((c,i)=>({c,i})).filter(({c})=>filter==='All'||c.category===filter).map(({c,i})=>`<button class="choice ${c===selectedCar?'selected':''}" data-car="${i}"><small>${c.category.toUpperCase()}</small><strong>${c.name.toUpperCase()}</strong><span class="choice-stats">SPD ${c.speed} &nbsp; / &nbsp; HND ${c.handling}</span></button>`).join('');$('modalGrid').querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{selectedCar=cars[+b.dataset.car];renderSetup();closeModal()})}
  else{$('modalGrid').innerHTML=locations.map((l,i)=>`<button class="choice ${l===selectedLocation?'selected':''}" data-location="${i}"><span class="choice-flag">${l.flag}</span><small>${l.country.toUpperCase()}</small><strong>${l.name.toUpperCase()}</strong></button>`).join('');$('modalGrid').querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{selectedLocation=locations[+b.dataset.location];renderSetup();closeModal()})}
}
$('allLocations').onclick=$('changeLocation').onclick=()=>openModal('locations');$('changeCar').onclick=()=>openModal('garage');$('closeModal').onclick=closeModal;$('selectionModal').onclick=e=>{if(e.target===$('selectionModal'))closeModal()};document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>b.dataset.view==='home'?closeModal():openModal(b.dataset.view));
function formatTime(seconds){seconds=Math.max(0,Math.floor(seconds||0));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function updateHud(state){$('hudSpeed').textContent=Math.round(state.speed||0);$('hudPosition').textContent=state.place||state.position||11;$('hudProgress').innerHTML=Math.floor((state.progress||0)*100)+'<em>%</em>';$('hudTime').textContent=formatTime(state.time);$('boostBar').style.width=Math.max(0,Math.min(100,state.overdrive||0))+'%';$('boostBar').style.background=state.boostActive?'#fff':'#f54235'}
function startRace(){closeModal();$('resultModal').classList.add('hidden');$('raceScreen').classList.remove('hidden');$('hudLocation').innerHTML=selectedLocation.name.toUpperCase()+' <small>WORLD SPRINT</small>';if(game)game.stop();game=new window.OverdriveGame($('raceCanvas'),{location:selectedLocation,car:selectedCar,onUpdate:updateHud,onFinish:finishRace});game.start();$('raceMessage').textContent='GO!';$('raceMessage').classList.add('show');setTimeout(()=>$('raceMessage').classList.remove('show'),1200)}
function finishRace(result){$('resultTitle').textContent=(result.place||result.position)===1?'YOU WIN.':'FINISH LINE.';const place=result.place||result.position||11;$('resultText').textContent=`You finished ${place}${place===1?'st':place===2?'nd':place===3?'rd':'th'} out of 11 in ${selectedLocation.name}. Time: ${formatTime(result.time)}. Ready to go again?`;$('resultModal').classList.remove('hidden')}
function exitRace(){if(game)game.stop();game=null;$('raceScreen').classList.add('hidden');$('resultModal').classList.add('hidden')}
$('startRace').onclick=startRace;$('exitRace').onclick=exitRace;$('backToMenu').onclick=exitRace;$('raceAgain').onclick=startRace;
const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',' ':'boost',Shift:'boost'};
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('resultModal').classList.contains('hidden'))exitRace();else if(!$('raceScreen').classList.contains('hidden'))exitRace();else closeModal()}if(game&&keyMap[e.key]){e.preventDefault();game.setInput(keyMap[e.key],true)}});window.addEventListener('keyup',e=>{if(game&&keyMap[e.key]){e.preventDefault();game.setInput(keyMap[e.key],false)}});window.addEventListener('blur',()=>{if(game)['left','right','up','down','boost'].forEach(k=>game.setInput(k,false))});
document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(game)game.setInput(key,true)});['pointerup','pointercancel','lostpointercapture'].forEach(event=>b.addEventListener(event,()=>{if(game)game.setInput(key,false)}))});
renderSetup();
