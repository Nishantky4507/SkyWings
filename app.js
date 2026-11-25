/* SkyWings frontend demonstration. The booking layer is kept separate from page markup. */
const STORAGE_KEYS = { seats:'skywings_seats_v3', bookings:'skywings_bookings_v3', search:'skywings_search_v3', draft:'skywings_draft_v3' };
const API_BASE = 'http://127.0.0.1:8080/api';
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
function showBackendError(message) {
  alert(message || 'Could not connect to the SkyWings C++ backend. Please start RUN_BACKEND.bat first.');
}
const money = value => '₹' + Number(value).toLocaleString('en-IN');
const byId = id => document.getElementById(id);
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const getSeats = () => readStore(STORAGE_KEYS.seats, {});
const getBookings = () => readStore(STORAGE_KEYS.bookings, []);
const toast = message => { const el=byId('toast'); if(!el)return; el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };
const pageName = location.pathname.split('/').pop() || 'index.html';
const searchState = () => readStore(STORAGE_KEYS.search, null);
const draftState = () => readStore(STORAGE_KEYS.draft, null);
const formatDuration = mins => `${Math.floor(mins/60)}h ${mins%60}m`;
const formatDate = date => date ? new Date(date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Date not selected';
const timeMinutes = time => { const [h,m]=time.split(':').map(Number); return h*60+m; };
const flightSeats = id => { const all=getSeats(); if(!all[id]) all[id]=Array(100).fill(0); return all[id]; };
function citySelectOptions(select, selected){
if(!select)return; select.innerHTML='<option value="">Select city</option>'+CITIES.map(city=>`<option value="${city}" ${city===selected?'selected':''}>${city} (${cityCode(city)})</option>`).join('');
}
function setupHome(){
const from=byId('fromCity'),to=byId('toCity'); if(!from||!to)return;
citySelectOptions(from,'Mumbai'); citySelectOptions(to,'Delhi');
const today=new Date(); const localDate=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
byId('departureDate').min=localDate; byId('departureDate').value=localDate;
const ret=byId('returnDate'); if(ret){ret.min=localDate;ret.value=localDate;}
document.querySelectorAll('input[name="tripType"]').forEach(r=>r.addEventListener('change',()=>{byId('returnField').classList.toggle('hidden',r.value!=='roundtrip'||!r.checked);ret.required=r.value==='roundtrip'&&r.checked;}));
byId('flightSearchForm').addEventListener('submit',e=>{
e.preventDefault(); if(from.value===to.value){byId('searchMessage').textContent='Departure and destination cities must be different.';return;}
const tripType=document.querySelector('input[name="tripType"]:checked').value;
if(tripType==='roundtrip'&&ret.value<byId('departureDate').value){byId('searchMessage').textContent='Return date cannot be before departure date.';return;}
const state={from:from.value,to:to.value,date:byId('departureDate').value,returnDate:tripType==='roundtrip'?ret.value:'',tripType,passengers:Number(byId('passengers').value),travelClass:byId('travelClass').value,flightType:byId('flightType').value};
writeStore(STORAGE_KEYS.search,state); location.href='flights.html';
});
document.querySelectorAll('[data-destination]').forEach(card=>card.addEventListener('click',()=>{to.value=card.dataset.destination;byId('search-panel').scrollIntoView({behavior:'smooth'});}));
}
function itineraryList(from,to){
// Routes are generated for every pair in the city list, not limited to a
// manually entered collection of sample routes.
return generateItineraries(from,to);
}
function renderFlightCard(f,state){
const stopCount=f.legs.length-1,stopText=stopCount===0?'Non-stop':`${stopCount} ${stopCount===1?'stop':'stops'}`;
const fare=state.travelClass==='Business Class'?f.firstClassFare:f.economyFare;
const details=f.legs.map((leg,i)=>`<div><strong>${i+1}. ${leg[0]} (${cityCode(leg[0])}) → ${leg[1]} (${cityCode(leg[1])})</strong> · ${leg[2]} – ${leg[3]}${i<f.legs.length-1?`<br>Layover at ${leg[1]}: approximately ${formatDuration(Math.max(0,timeMinutes(f.legs[i+1][2])-timeMinutes(leg[3])))}`:''}</div>`).join('');
return `<article class="flight-card"><div><div class="airline-name">SkyWings Airlines</div><div class="flight-no">${f.number} · ${f.id}</div><div style="margin-top:12px"><span class="stops-label">${stopText}</span></div></div><div><div class="route-line"><div class="route-point"><strong>${f.departure}</strong><span>${f.from} · ${cityCode(f.from)}</span></div><div class="route-middle"><b>${formatDuration(f.duration)}</b><br>${stopText}</div><div class="route-point" style="text-align:right"><strong>${f.arrival}</strong><span>${f.to} · ${cityCode(f.to)}</span></div></div><div class="leg-details">${details}</div></div><div class="fare-box"><div><strong>${money(fare)}</strong><span>per passenger · ${state.travelClass}</span></div><button class="btn btn-primary btn-small" data-select-flight="${f.id}">Select flight</button></div></article>`;
}
function setupFlights(){
const state=searchState(); const list=byId('flightResults'); if(!list)return;
if(!state){list.innerHTML='<div class="empty-state">No recent search found. Return to the home page and search for a flight.</div>';return;}
byId('resultsSubtitle').textContent=`${state.from} (${cityCode(state.from)}) → ${state.to} (${cityCode(state.to)}) · ${formatDate(state.date)} · ${state.passengers} passenger(s) · ${state.travelClass}${state.tripType==='roundtrip'?' · Return '+formatDate(state.returnDate):''}`;
let flights=itineraryList(state.from,state.to);
const filter=byId('resultFlightType'); filter.value=state.flightType||'both';
function draw(){
let shown=[...flights]; if(filter.value==='direct')shown=shown.filter(f=>f.legs.length===1); if(filter.value==='connecting')shown=shown.filter(f=>f.legs.length>1);
const sort=byId('sortFlights').value; if(sort==='price')shown.sort((a,b)=>(state.travelClass==='Business Class'?a.firstClassFare:a.economyFare)-(state.travelClass==='Business Class'?b.firstClassFare:b.economyFare)); if(sort==='departure')shown.sort((a,b)=>timeMinutes(a.departure)-timeMinutes(b.departure)); if(sort==='duration')shown.sort((a,b)=>a.duration-b.duration);
byId('resultCount').textContent=`${shown.length} flight option${shown.length===1?'':'s'} found`;
list.innerHTML=shown.length?shown.map(f=>renderFlightCard(f,state)).join(''):'<div class="empty-state"><h3>No flights could be generated for this search.</h3><p>Please check that the departure and destination cities are different and try again.</p><a class="btn btn-outline" href="index.html#search-panel">Change search</a></div>';
list.querySelectorAll('[data-select-flight]').forEach(btn=>btn.addEventListener('click',async()=>{
  const chosen=flights.find(f=>f.id===btn.dataset.selectFlight);
  btn.disabled=true; btn.textContent='Please wait...';
  try {
    const result=await apiRequest('/flights/initialize',{method:'POST',body:JSON.stringify({flight:chosen})});
    if(!result.ok) throw new Error(result.data.message||'Could not initialize this flight.');
    writeStore(STORAGE_KEYS.draft,{flight:chosen,search:state});
    location.href='passenger.html';
  } catch(error) { showBackendError(error.message); btn.disabled=false; btn.textContent='Select flight'; }
}));
}
filter.addEventListener('change',draw); byId('sortFlights').addEventListener('change',draw); draw();
}
function selectedFlight(){return draftState()?.flight;}
function fareFor(f,cls){return cls==='Business Class'?f.firstClassFare:f.economyFare;}
function setupPassenger(){
const form=byId('passengerForm');
if(!form)return;
const draft=draftState();
if(!draft){
byId('bookingSummary').innerHTML='<h3>No flight selected</h3><a class="btn btn-primary" href="flights.html">Choose a flight</a>';
form.classList.add('hidden');
return;
}

const f=draft.flight;
const search=draft.search;
const passengerCount=Number(search.passengers);
const fields=byId('passengerFields');

fields.innerHTML=Array.from({length:passengerCount},(_,index)=>`
<section class="passenger-entry">
<h4>Passenger ${index+1}</h4>
<div class="form-grid">
<label class="field">
<span>FIRST NAME</span>
<input type="text" name="passengerFirstName" data-passenger="${index}" placeholder="As shown on identity document" minlength="1" required>
</label>
<label class="field">
<span>LAST NAME</span>
<input type="text" name="passengerLastName" data-passenger="${index}" placeholder="As shown on identity document" minlength="1" required>
</label>
<label class="field">
<span>DATE OF BIRTH</span>
<input type="date" name="passengerDob" data-passenger="${index}" max="${new Date().toISOString().slice(0,10)}" required>
</label>
<label class="field">
<span>GENDER</span>
<select name="passengerGender" data-passenger="${index}" required>
<option value="">Select gender</option>
<option value="Female">Female</option>
<option value="Male">Male</option>
<option value="Other">Other</option>
</select>
</label>
<label class="field">
<span>MOBILE NUMBER</span>
<input type="tel" name="passengerPhone" data-passenger="${index}" inputmode="numeric" pattern="[0-9]{10}" placeholder="10-digit mobile number" required>
</label>
<label class="field full">
<span>EMAIL ADDRESS</span>
<input type="email" name="passengerEmail" data-passenger="${index}" placeholder="name@example.com" required>
</label>
</div>
</section>
`).join('');

const base=fareFor(f,search.travelClass)*passengerCount;
const tax=Math.round(base*.05);
const total=base+tax;
byId('bookingSummary').innerHTML=`
<h3>Journey summary</h3>
<div class="summary-row"><span>Route</span><strong>${f.from} → ${f.to}</strong></div>
<div class="summary-row"><span>Flight</span><strong>${f.number}</strong></div>
<div class="summary-row"><span>Date</span><strong>${formatDate(search.date)}</strong></div>
<div class="summary-row"><span>Departure</span><strong>${f.departure}</strong></div>
<div class="summary-row"><span>Journey</span><strong>${formatDuration(f.duration)}</strong></div>
<div class="summary-row"><span>Travel class</span><strong>${search.travelClass}</strong></div>
<div class="summary-row"><span>Passengers</span><strong>${passengerCount}</strong></div>
<div class="summary-row"><span>Base fare</span><strong>${money(base)}</strong></div>
<div class="summary-row"><span>Demo tax (5%)</span><strong>${money(tax)}</strong></div>
<div class="summary-row summary-total"><span>Total</span><strong>${money(total)}</strong></div>
`;

form.addEventListener('submit',event=>{
event.preventDefault();
const passengers=Array.from({length:passengerCount},(_,index)=>({
firstName:fields.querySelector(`[name="passengerFirstName"][data-passenger="${index}"]`).value.trim(),
lastName:fields.querySelector(`[name="passengerLastName"][data-passenger="${index}"]`).value.trim(),
name:(fields.querySelector(`[name="passengerFirstName"][data-passenger="${index}"]`).value.trim()+' '+fields.querySelector(`[name="passengerLastName"][data-passenger="${index}"]`).value.trim()).trim(),
dateOfBirth:fields.querySelector(`[name="passengerDob"][data-passenger="${index}"]`).value,
gender:fields.querySelector(`[name="passengerGender"][data-passenger="${index}"]`).value,
phone:fields.querySelector(`[name="passengerPhone"][data-passenger="${index}"]`).value.trim(),
email:fields.querySelector(`[name="passengerEmail"][data-passenger="${index}"]`).value.trim()
}));
if(passengers.some(person=>!person.firstName||!person.lastName||!person.dateOfBirth||!person.gender||!person.phone||!person.email)){
alert('Please complete the details for every passenger.');
return;
}
writeStore(STORAGE_KEYS.draft,{...draft,passengers});
location.href='seats.html';
});
}

async function renderSeatMap(){
const draft=draftState();
if(!draft)return;
const result=await apiRequest(`/flights/${encodeURIComponent(draft.flight.id)}/seats`);
if(!result.ok) throw new Error(result.data.message||'Could not load seat availability.');
const seats=Array(100).fill(0);
(result.data.seats||[]).forEach(item=>{
  const label=item.seatNumber||'';
  const number=label.startsWith('B')?Number(label.slice(1)):25+Number(label.slice(1));
  if(number>=1&&number<=100) seats[number-1]=item.available?0:1;
});
const make=(start,end)=>Array.from({length:end-start+1},(_,i)=>{
  const number=start+i;
  const label=number<=25?`B${number}`:`E${number-25}`;
  const occupied=Boolean(seats[number-1]);
  return `<div class="seat-wrap"><button type="button" class="seat ${occupied?'occupied':''}" disabled title="${label} - ${occupied?'Unavailable':'Available'}">${label}</button></div>`;
}).join('');
byId('businessSeatMap').innerHTML=make(1,25);
byId('economySeatMap').innerHTML=make(26,100);
const search=draft.search;
const businessAvailable=seats.slice(0,25).filter(value=>value===0).length;
const economyAvailable=seats.slice(25,100).filter(value=>value===0).length;
byId('seatSummary').innerHTML=`
<div class="summary-row"><span>Flight</span><strong>${draft.flight.number}</strong></div>
<div class="summary-row"><span>Passenger(s)</span><strong>${search.passengers}</strong></div>
<div class="summary-row"><span>Requested class</span><strong>${search.travelClass}</strong></div>
<div class="summary-row"><span>Business Class available</span><strong>${businessAvailable}/25</strong></div>
<div class="summary-row"><span>Economy available</span><strong>${economyAvailable}/75</strong></div>
<p class="small-note">Seat preferences are requests only. Seats are assigned from the available inventory and a preferred seat is not guaranteed.</p>`;
const preferenceBox=byId('seatPreferences');
if(preferenceBox){
 const passengers=draft.passengers||[];
 preferenceBox.innerHTML=passengers.map((person,index)=>`<label class="field seat-preference"><span>PASSENGER ${index+1} · ${person.name||'Passenger'} PREFERENCE</span><select class="control" data-seat-preference="${index}"><option value="any">Any available seat</option><option value="window">Window</option><option value="aisle">Aisle</option><option value="middle">Middle</option></select></label>`).join('');
}
}

function generatePNR(existingBookings){
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let pnr='';
do{
pnr=Array.from({length:6},()=>alphabet[secretsIndex(alphabet.length)]).join('');
}while(existingBookings.some(booking=>(booking.pnr||booking.id)===pnr));
return pnr;
}
function secretsIndex(max){
if(window.crypto&&window.crypto.getRandomValues){
const value=new Uint32Array(1);
window.crypto.getRandomValues(value);
return value[0]%max;
}
return Math.floor(Math.random()*max);
}

function setupSeats(){
const button=byId('allocateSeatsButton');
if(!button)return;
const draft=draftState();
if(!draft){
 byId('seatSummary').innerHTML='<p>No active booking. Please select a flight first.</p>';
 button.disabled=true; return;
}
renderSeatMap().catch(error=>showBackendError(error.message));
button.addEventListener('click',async()=>{
 button.disabled=true; button.textContent='Allocating seats...';
 let travelClass=draft.search.travelClass;
 const preferences=Array.from(document.querySelectorAll('[data-seat-preference]')).map(select=>select.value||'any');
 const passengers=(draft.passengers||[]).map((person,index)=>({...person,seatPreference:preferences[index]||'any'}));
 const submitBooking=async(cls)=>apiRequest('/bookings',{method:'POST',body:JSON.stringify({
   flight:draft.flight,travelDate:draft.search.date,travelClass:cls,passengers
 })});
 try {
   let result=await submitBooking(travelClass);
   if(result.status===409 && result.data.needsClassSwitch){
     const alternate=result.data.alternativeClass;
     if(confirm(`${result.data.message} Switch to ${alternate}?`)){
       travelClass=alternate; result=await submitBooking(travelClass);
     } else {
       alert('The alternate class was declined. The next flight leaves in 3 hours.');
       button.disabled=false; button.textContent='Allocate Seats'; return;
     }
   }
   if(!result.ok) throw new Error(result.data.message||'Booking could not be completed.');
   const booking=result.data;
   booking.search={...draft.search,date:draft.search.date};
   writeStore(STORAGE_KEYS.draft,{...draft,passengers,booking});
   location.href='confirmation.html';
 } catch(error) {
   showBackendError(error.message);
   button.disabled=false; button.textContent='Allocate Seats';
 }
});
}

function generateETicketNumber(){
return Array.from({length:13},()=>secretsIndex(10)).join('');
}
function boardingTime(booking){
const departure=booking.flight.departure;
const [hours,minutes]=departure.split(':').map(Number);
const date=new Date(2000,0,1,hours,minutes-40);
return date.toTimeString().slice(0,5);
}
function seatLabel(value){
if(typeof value==='string')return value;
if(typeof value==='number')return value<=25?`B${value}`:`E${value-25}`;
return '—';
}
function passMarkup(booking,passenger,index){
const flight=booking.flight;
const pnr=booking.pnr||booking.id;
const seat=seatLabel((booking.seats||[])[index]);
const zone=seat.startsWith('B')?'1':'3';
const sequence=String(index+1).padStart(3,'0');
const fullName=passenger.name||(passenger.firstName+' '+passenger.lastName).trim();
const passId=`boarding-${pnr}-${index}`;
const payload=JSON.stringify({passenger:fullName,flight:flight.number,from:cityCode(flight.from),to:cityCode(flight.to),date:booking.search.date,seat,pnr,eTicket:passenger.eTicketNumber});
return `
<article class="boarding-pass individual-pass" id="${passId}">
<div class="pass-head">
<img src="assets/icons/skywings-logo.svg" alt="SkyWings Airlines">
<div style="text-align:right"><strong>BOARDING PASS</strong><div style="font-size:11px;opacity:.8;margin-top:5px">PNR: ${pnr}</div></div>
</div>
<div class="pass-body">
<div class="pass-route">
<div><strong>${cityCode(flight.from)}</strong><span>${flight.from}</span><span>${flight.departure}</span></div>
<div><span>✈ SKY WINGS</span><span>${formatDuration(flight.duration)}</span><span>${flight.legs.length===1?'Non-stop':`${flight.legs.length-1} stop(s)`}</span></div>
<div><strong>${cityCode(flight.to)}</strong><span>${flight.to}</span><span>${flight.arrival}</span></div>
</div>
<div class="pass-grid">
<div class="pass-item"><small>PASSENGER NAME</small><strong>${fullName}</strong></div>
<div class="pass-item"><small>AIRLINE / FLIGHT</small><strong>SkyWings Airlines · ${flight.number}</strong></div>
<div class="pass-item"><small>DATE OF BIRTH</small><strong>${formatDate(passenger.dateOfBirth)}</strong></div>
<div class="pass-item"><small>TRAVEL DATE</small><strong>${formatDate(booking.search.date)}</strong></div>
<div class="pass-item"><small>BOARDING TIME (DEMO)</small><strong>${boardingTime(booking)}</strong></div>
<div class="pass-item"><small>GATE (DEMO)</small><strong>${booking.gateNumber||'A12'}</strong></div>
<div class="pass-item"><small>SEAT</small><strong>${seat}</strong></div>
<div class="pass-item"><small>BOARDING ZONE / SEQUENCE</small><strong>Zone ${zone} · ${sequence}</strong></div>
<div class="pass-item"><small>PNR</small><strong>${pnr}</strong></div>
<div class="pass-item"><small>E-TICKET NUMBER</small><strong>${passenger.eTicketNumber||'Not available'}</strong></div>
</div>
<div class="pass-qr-area"><div class="qr-code" data-qr='${payload.replace(/'/g,"&#39;")}'></div><div><strong>Scan at airport checkpoints</strong><p class="small-note">Demonstration boarding pass. Gate and boarding time are sample details and must be verified with the airline.</p></div></div>
${flight.legs.length>1?`<div class="note-box"><strong>Connecting itinerary:</strong> ${flight.legs.map(leg=>`${leg[0]} ${leg[2]} → ${leg[1]} ${leg[3]}`).join(' · ')}</div>`:''}
<div class="pass-actions"><button class="btn btn-primary btn-small" onclick="printIndividualPass('${passId}')">Print this boarding pass</button></div>
</div>
</article>
`;
}
function renderQRCodes(scope=document){
if(typeof QRCode==='undefined')return;
scope.querySelectorAll('.qr-code').forEach(el=>{if(el.dataset.rendered)return;el.dataset.rendered='1';new QRCode(el,{text:el.dataset.qr,width:112,height:112,correctLevel:QRCode.CorrectLevel.M});});
}
function printIndividualPass(id){
document.querySelectorAll('.boarding-pass').forEach(pass=>pass.classList.toggle('print-target',pass.id===id));
window.print();
setTimeout(()=>document.querySelectorAll('.boarding-pass').forEach(pass=>pass.classList.remove('print-target')),500);
}
function bookingTicketMarkup(booking){
const flight=booking.flight;
const pnr=booking.pnr||booking.id;
const people=booking.passengers||(booking.passenger?[booking.passenger]:[]);
const passengerMarkup=people.map((person,index)=>`<div class="pass-item"><small>PASSENGER ${index+1}</small><strong>${person.name||(person.firstName+' '+person.lastName).trim()}</strong></div>`).join('');
return `
<div class="boarding-pass booking-ticket">
<div class="pass-head">
<img src="assets/icons/skywings-logo.svg" alt="SkyWings Airlines">
<div style="text-align:right"><strong>BOARDING PASS</strong><div style="font-size:11px;opacity:.8;margin-top:5px">PNR: ${pnr}</div></div>
</div>
<div class="pass-body">
<div class="pass-route">
<div><strong>${cityCode(flight.from)}</strong><span>${flight.from}</span><span>${flight.departure}</span></div>
<div><span>✈</span><span>${formatDuration(flight.duration)}</span><span>${flight.legs.length===1?'Non-stop':`${flight.legs.length-1} stop(s)`}</span></div>
<div><strong>${cityCode(flight.to)}</strong><span>${flight.to}</span><span>${flight.arrival}</span></div>
</div>
<div class="pass-grid">
${passengerMarkup}
<div class="pass-item"><small>FLIGHT</small><strong>${flight.number}</strong></div>
<div class="pass-item"><small>DATE</small><strong>${formatDate(booking.search.date)}</strong></div>
<div class="pass-item"><small>TRAVEL CLASS</small><strong>${booking.travelClass}</strong></div>
<div class="pass-item"><small>SEAT NUMBER(S)</small><strong>${(booking.seats||[]).map(seatLabel).join(', ')}</strong></div>
<div class="pass-item"><small>PASSENGERS</small><strong>${people.length}</strong></div>
<div class="pass-item"><small>PNR</small><strong>${pnr}</strong></div>
<div class="pass-item"><small>FARE PAID (DEMO)</small><strong>${money(booking.total)}</strong></div>
<div class="pass-item"><small>STATUS</small><strong>${booking.status}</strong></div>
</div>
${flight.legs.length>1?`<div class="note-box"><strong>Connecting itinerary:</strong> ${flight.legs.map(leg=>`${leg[0]} ${leg[2]} → ${leg[1]} ${leg[3]}`).join(' · ')}</div>`:''}
</div>
</div>`;
}
function setupConfirmation(){
const target=byId('boardingPass');if(!target)return;
const draft=draftState();const booking=draft?.booking;
if(!booking){target.innerHTML='<div class="empty-state">No completed booking found. <a href="index.html">Start a booking</a>.</div>';return;}
const people=booking.passengers||(booking.passenger?[booking.passenger]:[]);
people.forEach(person=>{if(!person.eTicketNumber)person.eTicketNumber=generateETicketNumber();});
target.innerHTML=bookingTicketMarkup(booking);
}

async function setupBookings(){
const target=byId('savedBookings');
if(!target)return;
target.innerHTML='<div class="empty-state">Loading your bookings...</div>';
let result;
try { result=await apiRequest('/bookings'); }
catch(error){ showBackendError(error.message); return; }
if(!result.ok){showBackendError(result.data.message);return;}
const bookings=result.data.bookings||[];
if(!bookings.length){
 target.innerHTML='<div class="empty-state"><h3>No bookings yet</h3><p>Your confirmed demonstration bookings will appear here.</p><a class="btn btn-primary" href="index.html#search-panel">Search flights</a></div>';
 return;
}
target.innerHTML=bookings.map(booking=>{
 const people=booking.passengers||(booking.passenger?[booking.passenger]:[]);
 const pnr=booking.pnr||booking.id;
 const individualActions=people.map((person,index)=>{
  const fullName=person.name||(person.firstName+' '+person.lastName).trim()||`Passenger ${index+1}`;
  return `<button class="btn btn-outline btn-small" data-pass-pnr="${pnr}" data-pass-index="${index}">Boarding Pass · ${fullName}</button>`;
 }).join('');
 return `<article class="booking-item">${bookingTicketMarkup(booking)}
 <div class="booking-actions">${individualActions}
 ${booking.status==='Confirmed'?`<button class="btn btn-danger btn-small" data-cancel="${pnr}">Cancel booking</button>`:''}</div>
 <div class="individual-pass-container" id="individual-passes-${pnr}"></div></article>`;
}).join('');
target.querySelectorAll('[data-pass-pnr]').forEach(button=>button.addEventListener('click',()=>{
 const params=new URLSearchParams({pnr:button.dataset.passPnr,passenger:String(Number(button.dataset.passIndex))});
 location.href=`boarding-pass.html?${params.toString()}`;
}));
target.querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',async()=>{
 const pnr=button.dataset.cancel;
 if(!confirm('Are you sure you want to cancel this booking? Its allocated seats will be released.'))return;
 button.disabled=true;
 try{
  const cancelled=await apiRequest(`/bookings/${encodeURIComponent(pnr)}/cancel`,{method:'POST',body:'{}'});
  if(!cancelled.ok)throw new Error(cancelled.data.message||'Cancellation failed.');
  toast('Booking cancelled and seats released.');
  await setupBookings();
 }catch(error){showBackendError(error.message);button.disabled=false;}
}));
}

async function setupIndividualBoardingPass(){
const target=byId('individualBoardingPass');
if(!target)return;
const params=new URLSearchParams(location.search);
const pnr=params.get('pnr');const index=Number(params.get('passenger')||0);
target.innerHTML='<div class="empty-state">Loading boarding pass...</div>';
try{
 const result=await apiRequest('/bookings?pnr='+encodeURIComponent(pnr||''));
 if(!result.ok)throw new Error(result.data.message||'Booking not found.');
 const booking=result.data.booking;
 const person=(booking.passengers||[])[index];
 if(!booking||!person){target.innerHTML='<div class="empty-state"><h3>Boarding pass unavailable</h3><p>We could not find this passenger booking.</p><a class="btn btn-primary" href="bookings.html">Return to My Bookings</a></div>';return;}
 target.innerHTML=passMarkup(booking,person,index);
 renderQRCodes(target);
}catch(error){target.innerHTML=`<div class="empty-state">${error.message} <a href="bookings.html">Return to My Bookings</a></div>`;}
}
if(pageName==='boarding-pass.html')setupIndividualBoardingPass();if(pageName==='index.html')setupHome();if(pageName==='flights.html')setupFlights();if(pageName==='passenger.html')setupPassenger();if(pageName==='seats.html')setupSeats();if(pageName==='confirmation.html')setupConfirmation();if(pageName==='bookings.html')setupBookings();
