/* Sample demonstration data. These are fictional SkyWings schedules and fares. */
const CITY_CODES = {
Agartala:'IXA', Agra:'AGR', Ahmedabad:'AMD', Aizawl:'AJL', Amritsar:'ATQ',
Aurangabad:'IXU', Bagdogra:'IXB', Bengaluru:'BLR', Bhopal:'BHO', Bhubaneswar:'BBI',
Chandigarh:'IXC', Chennai:'MAA', Coimbatore:'CJB', Dehradun:'DED', Delhi:'DEL',
Dibrugarh:'DIB', Dimapur:'DMU', Goa:'GOI', Gorakhpur:'GOP', Guwahati:'GAU',
Gwalior:'GWL', Hyderabad:'HYD', Imphal:'IMF', Indore:'IDR', Jaipur:'JAI',
Jammu:'IXJ', Jodhpur:'JDH', Kanpur:'KNU', Kochi:'COK', Kolkata:'CCU',
Kozhikode:'CCJ', Leh:'IXL', Lucknow:'LKO', Madurai:'IXM', Mangaluru:'IXE',
Mumbai:'BOM', Nagpur:'NAG', Patna:'PAT', PortBlair:'IXZ', Prayagraj:'IXD',
Pune:'PNQ', Raipur:'RPR', Ranchi:'IXR', Shillong:'SHL', Shirdi:'SAG',
Srinagar:'SXR', Surat:'STV', Thiruvananthapuram:'TRV', Tiruchirappalli:'TRZ',
Udaipur:'UDR', Vadodara:'BDQ', Varanasi:'VNS', Vijayawada:'VGA', Visakhapatnam:'VTZ'
};
const CITIES = Object.keys(CITY_CODES).filter(c=>c!=='PortBlair').map(c=>c==='PortBlair'?'Port Blair':c).sort((a,b)=>a.localeCompare(b));
const cityCode = city => CITY_CODES[city.replace(' ','')] || CITY_CODES[city] || city.toUpperCase().slice(0,3);
const seatArray = () => Array(100).fill(0);
const FLIGHT_DATA = [
{id:'SW101',number:'SW 101',from:'Mumbai',to:'Delhi',departure:'06:30',arrival:'08:45',duration:135,economyFare:4500,firstClassFare:8500,legs:[['Mumbai','Delhi','06:30','08:45']]},
{id:'SW102',number:'SW 102',from:'Mumbai',to:'Delhi',departure:'10:15',arrival:'12:30',duration:135,economyFare:4900,firstClassFare:8900,legs:[['Mumbai','Delhi','10:15','12:30']]},
{id:'SW103',number:'SW 103',from:'Mumbai',to:'Delhi',departure:'18:20',arrival:'20:35',duration:135,economyFare:5200,firstClassFare:9200,legs:[['Mumbai','Delhi','18:20','20:35']]},
{id:'SW201',number:'SW 201',from:'Mumbai',to:'Bengaluru',departure:'07:20',arrival:'09:10',duration:110,economyFare:3900,firstClassFare:7600,legs:[['Mumbai','Bengaluru','07:20','09:10']]},
{id:'SW202',number:'SW 202',from:'Delhi',to:'Mumbai',departure:'14:00',arrival:'16:15',duration:135,economyFare:4700,firstClassFare:8700,legs:[['Delhi','Mumbai','14:00','16:15']]},
{id:'SW203',number:'SW 203',from:'Delhi',to:'Kolkata',departure:'09:40',arrival:'11:50',duration:130,economyFare:4200,firstClassFare:8100,legs:[['Delhi','Kolkata','09:40','11:50']]},
{id:'SW204',number:'SW 204',from:'Bengaluru',to:'Hyderabad',departure:'17:10',arrival:'18:20',duration:70,economyFare:2800,firstClassFare:6200,legs:[['Bengaluru','Hyderabad','17:10','18:20']]},
{id:'SW205',number:'SW 205',from:'Chennai',to:'Mumbai',departure:'12:25',arrival:'14:35',duration:130,economyFare:4100,firstClassFare:7900,legs:[['Chennai','Mumbai','12:25','14:35']]},
{id:'SW206',number:'SW 206',from:'Pune',to:'Delhi',departure:'16:00',arrival:'18:05',duration:125,economyFare:4400,firstClassFare:8300,legs:[['Pune','Delhi','16:00','18:05']]},
{id:'SW207',number:'SW 207',from:'Kolkata',to:'Chennai',departure:'08:00',arrival:'10:35',duration:155,economyFare:5200,firstClassFare:9400,legs:[['Kolkata','Chennai','08:00','10:35']]},
{id:'SW208',number:'SW 208',from:'Hyderabad',to:'Goa',departure:'11:15',arrival:'12:30',duration:75,economyFare:3100,firstClassFare:6500,legs:[['Hyderabad','Goa','11:15','12:30']]},
{id:'SW209',number:'SW 209',from:'Jaipur',to:'Mumbai',departure:'13:20',arrival:'15:10',duration:110,economyFare:3800,firstClassFare:7200,legs:[['Jaipur','Mumbai','13:20','15:10']]},
{id:'SW210',number:'SW 210',from:'Ahmedabad',to:'Delhi',departure:'07:45',arrival:'09:10',duration:85,economyFare:3300,firstClassFare:6900,legs:[['Ahmedabad','Delhi','07:45','09:10']]},
{id:'SW211',number:'SW 211',from:'Kochi',to:'Bengaluru',departure:'15:00',arrival:'16:10',duration:70,economyFare:2900,firstClassFare:6100,legs:[['Kochi','Bengaluru','15:00','16:10']]},
{id:'SW212',number:'SW 212',from:'Lucknow',to:'Mumbai',departure:'10:00',arrival:'12:15',duration:135,economyFare:4600,firstClassFare:8500,legs:[['Lucknow','Mumbai','10:00','12:15']]},
{id:'SW213',number:'SW 213',from:'Guwahati',to:'Kolkata',departure:'09:15',arrival:'10:35',duration:80,economyFare:3000,firstClassFare:6400,legs:[['Guwahati','Kolkata','09:15','10:35']]},
{id:'SW214',number:'SW 214',from:'Indore',to:'Delhi',departure:'17:00',arrival:'18:25',duration:85,economyFare:3400,firstClassFare:7000,legs:[['Indore','Delhi','17:00','18:25']]},
{id:'SW215',number:'SW 215',from:'Varanasi',to:'Mumbai',departure:'06:50',arrival:'09:10',duration:140,economyFare:4800,firstClassFare:8800,legs:[['Varanasi','Mumbai','06:50','09:10']]},
{id:'SW216',number:'SW 216',from:'Bhopal',to:'Pune',departure:'12:00',arrival:'13:35',duration:95,economyFare:3500,firstClassFare:7100,legs:[['Bhopal','Pune','12:00','13:35']]},
{id:'SW301',number:'SW 301',from:'Mumbai',to:'Delhi',departure:'07:00',arrival:'12:10',duration:310,economyFare:3900,firstClassFare:7900,legs:[['Mumbai','Indore','07:00','08:25'],['Indore','Delhi','09:30','12:10']]},
{id:'SW302',number:'SW 302',from:'Mumbai',to:'Delhi',departure:'08:00',arrival:'13:40',duration:340,economyFare:3700,firstClassFare:7600,legs:[['Mumbai','Hyderabad','08:00','09:35'],['Hyderabad','Delhi','11:00','13:40']]},
{id:'SW303',number:'SW 303',from:'Mumbai',to:'Delhi',departure:'05:45',arrival:'15:00',duration:555,economyFare:3400,firstClassFare:7200,legs:[['Mumbai','Bengaluru','05:45','07:35'],['Bengaluru','Hyderabad','09:00','10:10'],['Hyderabad','Delhi','12:00','15:00']]},
{id:'SW304',number:'SW 304',from:'Pune',to:'Kolkata',departure:'06:30',arrival:'12:45',duration:375,economyFare:4200,firstClassFare:8200,legs:[['Pune','Hyderabad','06:30','08:00'],['Hyderabad','Kolkata','10:00','12:45']]},
{id:'SW305',number:'SW 305',from:'Jaipur',to:'Chennai',departure:'07:10',arrival:'14:20',duration:430,economyFare:4500,firstClassFare:8600,legs:[['Jaipur','Mumbai','07:10','09:00'],['Mumbai','Chennai','11:15','14:20']]},
{id:'SW306',number:'SW 306',from:'Ahmedabad',to:'Kochi',departure:'08:15',arrival:'14:50',duration:395,economyFare:4300,firstClassFare:8400,legs:[['Ahmedabad','Bengaluru','08:15','10:20'],['Bengaluru','Kochi','12:15','14:50']]},
{id:'SW307',number:'SW 307',from:'Delhi',to:'Goa',departure:'06:00',arrival:'12:50',duration:410,economyFare:4400,firstClassFare:8500,legs:[['Delhi','Mumbai','06:00','08:15'],['Mumbai','Goa','10:15','12:50']]},
{id:'SW308',number:'SW 308',from:'Lucknow',to:'Bengaluru',departure:'07:30',arrival:'14:00',duration:390,economyFare:4300,firstClassFare:8300,legs:[['Lucknow','Hyderabad','07:30','09:25'],['Hyderabad','Bengaluru','11:20','14:00']]},
{id:'SW309',number:'SW 309',from:'Guwahati',to:'Mumbai',departure:'06:45',arrival:'14:15',duration:450,economyFare:4900,firstClassFare:9100,legs:[['Guwahati','Kolkata','06:45','08:05'],['Kolkata','Mumbai','10:00','14:15']]},
{id:'SW310',number:'SW 310',from:'Srinagar',to:'Delhi',departure:'07:00',arrival:'12:20',duration:320,economyFare:4000,firstClassFare:7800,legs:[['Srinagar','Chandigarh','07:00','08:20'],['Chandigarh','Delhi','10:10','12:20']]}
];


/*
* Route generator for the demonstration website.
* Every city in CITIES has approximate coordinates, so a sample itinerary can
* be generated for every different origin/destination pair. These are NOT
* real airline schedules or live availability.
*/
const CITY_COORDINATES = {
Agartala:[23.886,91.240], Agra:[27.176,78.008], Ahmedabad:[23.023,72.571], Aizawl:[23.727,92.717], Amritsar:[31.634,74.872],
Aurangabad:[19.876,75.343], Bagdogra:[26.681,88.328], Bengaluru:[12.972,77.595], Bhopal:[23.259,77.413], Bhubaneswar:[20.297,85.825],
Chandigarh:[30.734,76.779], Chennai:[13.083,80.270], Coimbatore:[11.017,76.956], Dehradun:[30.316,78.032], Delhi:[28.614,77.209],
Dibrugarh:[27.472,94.912], Dimapur:[25.906,93.727], Goa:[15.490,73.827], Gorakhpur:[26.760,83.373], Guwahati:[26.145,91.736],
Gwalior:[26.218,78.183], Hyderabad:[17.385,78.487], Imphal:[24.817,93.936], Indore:[22.720,75.858], Jaipur:[26.913,75.787],
Jammu:[32.727,74.857], Jodhpur:[26.239,73.024], Kanpur:[26.449,80.332], Kochi:[9.932,76.267], Kolkata:[22.573,88.364],
Kozhikode:[11.258,75.780], Leh:[34.153,77.577], Lucknow:[26.847,80.947], Madurai:[9.925,78.120], Mangaluru:[12.915,74.856],
Mumbai:[19.076,72.878], Nagpur:[21.146,79.088], Patna:[25.610,85.142], Prayagraj:[25.435,81.846], Pune:[18.520,73.857],
Raipur:[21.251,81.629], Ranchi:[23.345,85.309], Shillong:[25.578,91.894], Shirdi:[19.766,74.477], Srinagar:[34.084,74.797],
Surat:[21.170,72.831], Thiruvananthapuram:[8.524,76.936], Tiruchirappalli:[10.791,78.704], Udaipur:[24.585,73.712],
Vadodara:[22.307,73.181], Varanasi:[25.318,82.974], Vijayawada:[16.506,80.648], Visakhapatnam:[17.687,83.218]
};

const CONNECTING_HUBS = ['Delhi','Mumbai','Bengaluru','Hyderabad','Kolkata'];
const ROUTE_DEPARTURES = ['06:20','10:40','15:10'];

function routeDistanceKm(from, to) {
const a=CITY_COORDINATES[from], b=CITY_COORDINATES[to];
if(!a || !b) return 900;
const rad=n=>n*Math.PI/180;
const dLat=rad(b[0]-a[0]), dLon=rad(b[1]-a[1]);
const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function routeLegDuration(from,to) {
// Includes a small allowance for taxi, climb and descent in this fictional model.
return Math.max(45,Math.round((routeDistanceKm(from,to)/700*60+35)/5)*5);
}
function clockAfter(time,minutes) {
const total=(Number(time.slice(0,2))*60+Number(time.slice(3,5))+minutes)%1440;
return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function routeHash(text) {
let hash=0; for(let i=0;i<text.length;i++) hash=(hash*31+text.charCodeAt(i))>>>0;
return hash;
}
function makeRouteFlight(from,to,via,departure,variant) {
const stops=[from,...via,to];
const legs=[]; let currentTime=departure, totalDuration=0;
for(let i=0;i<stops.length-1;i++) {
const legDuration=routeLegDuration(stops[i],stops[i+1]);
const arrival=clockAfter(currentTime,legDuration);
legs.push([stops[i],stops[i+1],currentTime,arrival]);
totalDuration+=legDuration;
if(i<stops.length-2) {
const layover=75+(routeHash(`${from}-${to}-${variant}-${i}`)%46);
totalDuration+=layover;
currentTime=clockAfter(arrival,layover);
}
}
const routeKey=`${from}-${via.join('-')}-${to}-${variant}`;
const id=`SW${routeHash(routeKey).toString().padStart(8,'0')}`;
const distance=routeDistanceKm(from,to);
const baseFare=Math.round((1100+distance*3.15+via.length*350)/100)*100;
const connectionDiscount=via.length?0.92:1;
const economyFare=Math.max(1800,Math.round(baseFare*connectionDiscount/100)*100);
return {
id, number:`SW ${String(routeHash(routeKey)%900+100)}`,
from,to,departure:legs[0][2],arrival:legs[legs.length-1][3],duration:totalDuration,
economyFare,firstClassFare:Math.round(economyFare*1.85/100)*100,
legs,generated:true,via:[...via]
};
}
function generateItineraries(from,to) {
if(!CITIES.includes(from)||!CITIES.includes(to)||from===to) return [];
const flights=[];
// Three daily sample direct departures are generated for every city pair.
ROUTE_DEPARTURES.forEach((departure,index)=>flights.push(makeRouteFlight(from,to,[],departure,`D${index}`)));
// Offer connecting options through available major hubs, including via cities.
const hubs=CONNECTING_HUBS.filter(hub=>hub!==from&&hub!==to);
hubs.slice(0,4).forEach((hub,index)=>{
const departure=ROUTE_DEPARTURES[index%ROUTE_DEPARTURES.length];
flights.push(makeRouteFlight(from,to,[hub],departure,`C${index}`));
});
// Two-stop alternatives provide a longer via-city choice on selected itineraries.
const firstHub=hubs[0], secondHub=hubs.find(h=>h!==firstHub && routeDistanceKm(from,h)+routeDistanceKm(h,to)>routeDistanceKm(from,to)*1.05);
if(firstHub&&secondHub) flights.push(makeRouteFlight(from,to,[firstHub,secondHub],'07:35','T0'));
return flights;
}
