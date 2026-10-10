/* ===========================================
   SERVE FAMILY ADMIN DASHBOARD — JavaScript
   Complete Feature Set with Live Fleet Map, SL Geo, Admin Mgmt, Draw Zones & Dynamic Plans
   =========================================== */

const API_BASE_URL = window.location.origin;
const MAPBOX_TOKEN = window.MAPBOX_TOKEN || '';

if (typeof maplibregl !== 'undefined' && (typeof mapboxgl === 'undefined' || !mapboxgl)) {
  window.mapboxgl = window.maplibregl;
}

// Map style specification: Uses high-res Carto Voyager / OSM raster tiles out-of-the-box (Zero API key required)
// If the user has a valid Mapbox public token configured, it seamlessly loads Mapbox streets.
const DEFAULT_ADMIN_MAP_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

function getAdminMapStyle() {
  if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.')) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`;
  }
  return DEFAULT_ADMIN_MAP_STYLE;
}

const ENDPOINTS = {
  login:         '/api/auth/login',
  vehicles:      '/api/admin/taxi/vehicles',
  approve:       '/api/admin/taxi/vehicles/{id}/approve',
  reject:        '/api/admin/taxi/vehicles/{id}/reject',
  suspend:       '/api/admin/taxi/vehicles/{id}/suspend',
  agents:        '/api/admin/taxi/agents',
  autoAssign:    '/api/admin/taxi/agents/{id}/auto-assign',
  users:         '/api/admin/taxi/users',
  updateUser:    '/api/admin/taxi/users/{id}',
  deleteUser:    '/api/admin/taxi/users/{id}',
  stats:         '/api/admin/taxi/stats',
  resetPassword: '/api/admin/taxi/users/{id}/reset-password',
  circles:       '/api/admin/taxi/circles',
  plans:         '/api/admin/taxi/plans',
  updatePlan:    '/api/admin/taxi/plans/{id}',
  subscriptions: '/api/admin/taxi/subscriptions',
  referrals:     '/api/admin/taxi/referrals',
  banUser:       '/api/admin/taxi/users/{id}/ban',
  admins:        '/api/admin/taxi/admins',
  deleteAdmin:   '/api/admin/taxi/admins/{id}',
  bookings:      '/api/admin/taxi/bookings',
  wallets:       '/api/admin/taxi/wallets',
  broadcast:     '/api/admin/taxi/notifications/broadcast',
  auditLogs:     '/api/admin/taxi/audit-logs',
  settings:      '/api/admin/taxi/settings',
  audienceCounts:'/api/admin/taxi/audience-counts',
  coverageZones: '/api/admin/taxi/coverage-zones',
  toggleCoverageZone: '/api/admin/taxi/coverage-zones/toggle',
  quickLookupVehicle: '/api/admin/taxi/vehicles/lookup',
  quickApproveVehicle: '/api/admin/taxi/vehicles/quick-approve',
};

/* ============================================================
   SRI LANKA PROVINCE → DISTRICT → DSD DATA
   ============================================================ */
const SL_GEO = {
  "Western": {
    "Colombo": ["Colombo","Dehiwala-Mount Lavinia","Moratuwa","Sri Jayawardenepura Kotte","Kolonnawa","Kaduwela","Maharagama","Kesbewa","Homagama","Padukka","Ratmalana","Thimbirigasyaya","Kotte"],
    "Gampaha": ["Gampaha","Negombo","Wattala","Ja-Ela","Mahara","Divulapitiya","Attanagalla","Minuwangoda","Katana","Mirigama","Biyagama","Dompe","Kelaniya"],
    "Kalutara": ["Kalutara","Panadura","Horana","Matugama","Agalawatta","Beruwala","Bandaragama","Ingiriya","Walallawita","Dodangoda","Palindanuwara","Bulathsinhala","Madurawela"]
  },
  "Central": {
    "Kandy": ["Kandy","Kundasale","Peradeniya","Gampola","Nawalapitiya","Harispattuwa","Yatinuwara","Udunuwara","Gangawatakorale","Doluwa","Minipe","Pasbage Korale","Pathahewaheta","Medadumbara","Panvila","Poojapitiya","Tumpane","Ududumbara"],
    "Matale": ["Matale","Dambulla","Galewela","Rattota","Laggala-Pallegama","Ambanganga Korale","Ukuwela","Yatawatta","Naula","Wilgamuwa"],
    "Nuwara Eliya": ["Nuwara Eliya","Ambagamuwa","Hanguranketha","Kotmale","Walapane","Udapalatha","Maskeliya"]
  },
  "Southern": {
    "Galle": ["Galle","Hikkaduwa","Balapitiya","Ambalangoda","Karandeniya","Baddegama","Bope-Poddala","Elpitiya","Imaduwa","Nagoda","Neluwa","Niyagama","Habaraduwa","Akmeemana","Welivitiya-Divithura"],
    "Matara": ["Matara","Weligama","Akuressa","Devinuwara","Dickwella","Hakmana","Kamburupitiya","Kirinda Puhulwella","Kotapola","Malimbada","Mulatiyana","Pasgoda","Pitabeddara","Thihagoda","Welipitiya"],
    "Hambantota": ["Hambantota","Tangalle","Tissamaharama","Ambalantota","Beliatta","Katuwana","Lunugamvehera","Okewela","Sooriyawewa","Weeraketiya","Walasmulla"]
  },
  "Northern": {
    "Jaffna": ["Jaffna","Point Pedro","Nallur","Chavakachcheri","Karaveddy","Vadamarachchi East","Vadamarachchi North","Island South","Island North","Delft"],
    "Kilinochchi": ["Kilinochchi","Pachchilaipalli","Kandawalai","Karachchi","Poonakari"],
    "Mannar": ["Mannar","Musalai","Madhu","Manthai West","Nanaddan"],
    "Mullaitivu": ["Mullaitivu","Maritimepattu","Oddusuddan","Manthai East","Puthukudiyiruppu","Thunukkai","Welioya"],
    "Vavuniya": ["Vavuniya","Cheddikulam","Vavuniya North","Vavuniya South","Vengalacheddikulam"]
  },
  "Eastern": {
    "Trincomalee": ["Trincomalee","Kinniya","Muttur","Thambalagamuwa","Padavi Sri Pura","Seruwila","Kuchchaveli","Gomarankadawala","Kantalai"],
    "Batticaloa": ["Batticaloa","Eravur Pattu","Eravur Town","Manmunai North","Manmunai West","Manmunai South Eruvil Pattu","Kalkudah","Koralai Pattu","Koralai Pattu North","Koralai Pattu West","Koralai Pattu Central","Porativu Pattu"],
    "Ampara": ["Ampara","Kalmunai","Sammanthurai","Sainthamaruthu","Akkaraipattu","Ninthavur","Addalaichenai","Alayadivembu","Damana","Uhana","Padiyathalawa","Mahaoya","Dehiattakandiya","Lahugala","Pottuvil","Navithanveli"]
  },
  "North Western": {
    "Kurunegala": ["Kurunegala","Kuliyapitiya East","Kuliyapitiya West","Alawwa","Bingiriya","Dodangaslanda","Galgamuwa","Giribawa","Ibbagamuwa","Kotavehera","Mawathagama","Narammala","Nikaweratiya","Panduwasnuwara","Pannala","Polpithigama","Polgahawela","Rasnayakapura","Udubaddawa","Weerambugedara"],
    "Puttalam": ["Puttalam","Chilaw","Wennappuwa","Nattandiya","Mundalama","Nawagattegama","Dankotuwa","Anamaduwa","Arachchikattuwa","Kalpitiya","Karuwalagaswewa","Mahakumbukkadawala","Madampe"]
  },
  "North Central": {
    "Anuradhapura": ["Anuradhapura","Mihintale","Kekirawa","Medawachchiya","Eppawala","Nuwaragam Palatha Central","Nuwaragam Palatha East","Galenbindunuwewa","Galnewa","Horowpothana","Ipalogama","Kahatagasdigiliya","Kebithigollewa","Mahavilachchiya","Nachchadoowa","Nochchiyagama","Padaviya","Palagala","Rajanganaya","Rambewa","Talawa","Thirappane","Thalawa"],
    "Polonnaruwa": ["Polonnaruwa","Lankapura","Medirigiriya","Dimbulagala","Hingurakgoda","Elahera","Thamankaduwa"]
  },
  "Uva": {
    "Badulla": ["Badulla","Bandarawela","Haputale","Welimada","Ella","Hali-Ela","Uva Paranagama","Mahiyanganaya","Soranathota","Kandaketiya","Lunugala","Meegahakivula","Passara","Ridimaliyadda","Rideemaliyadda","Haldummulla"],
    "Monaragala": ["Monaragala","Wellawaya","Bibile","Buttala","Medagama","Katharagama","Madulla","Sevanagala","Siyambalanduwa","Thanamalvila"]
  },
  "Sabaragamuwa": {
    "Ratnapura": ["Ratnapura","Eheliyagoda","Kuruvita","Kiriella","Imbulpe","Kalawana","Kolonna","Rakwana","Balangoda","Embilipitiya","Pelmadulla","Opanayake","Ayagama","Kahawatta"],
    "Kegalle": ["Kegalle","Mawanella","Rambukkana","Aranayake","Galigamuwa","Dehiowita","Ruwanwella","Yatiyanthota","Bulathkohupitiya","Warakapola"]
  }
};

/* ============================================================
   SRI LANKA PROVINCE & DISTRICT COORDINATES (Precision Focus)
   ============================================================ */
const SL_COORDINATES = {
  provinces: {
    "Western":        { center: [79.9500, 6.9000], zoom: 10.0 },
    "Central":        { center: [80.6500, 7.3000], zoom: 10.0 },
    "Southern":       { center: [80.5000, 6.1800], zoom: 10.0 },
    "Northern":       { center: [80.3000, 9.3000], zoom: 9.6 },
    "Eastern":        { center: [81.5000, 7.7500], zoom: 9.3 },
    "North Western":  { center: [80.1000, 7.7500], zoom: 9.6 },
    "North Central":  { center: [80.6500, 8.3500], zoom: 9.6 },
    "Uva":            { center: [81.2000, 6.9500], zoom: 9.6 },
    "Sabaragamuwa":   { center: [80.4500, 6.8000], zoom: 10.0 }
  },
  districts: {
    "Colombo":        { center: [79.8612, 6.9271], zoom: 12.0 },
    "Gampaha":        { center: [79.9930, 7.0840], zoom: 11.5 },
    "Kalutara":       { center: [79.9593, 6.5854], zoom: 11.5 },
    "Kandy":          { center: [80.6337, 7.2906], zoom: 12.2 },
    "Matale":         { center: [80.6234, 7.4675], zoom: 11.5 },
    "Nuwara Eliya":   { center: [80.7829, 6.9497], zoom: 11.5 },
    "Galle":          { center: [80.2210, 6.0535], zoom: 12.0 },
    "Matara":         { center: [80.5550, 5.9549], zoom: 12.0 },
    "Hambantota":     { center: [81.1185, 6.1429], zoom: 11.5 },
    "Jaffna":         { center: [80.0074, 9.6615], zoom: 12.0 },
    "Kilinochchi":    { center: [80.3982, 9.3803], zoom: 11.5 },
    "Mannar":         { center: [79.9042, 8.9810], zoom: 11.5 },
    "Mullaitivu":     { center: [80.8130, 9.2671], zoom: 11.2 },
    "Vavuniya":       { center: [80.4982, 8.7514], zoom: 11.5 },
    "Trincomalee":    { center: [81.2335, 8.5874], zoom: 11.5 },
    "Batticaloa":     { center: [81.6924, 7.7310], zoom: 11.5 },
    "Ampara":         { center: [81.6747, 7.2912], zoom: 11.2 },
    "Kurunegala":     { center: [80.3649, 7.4863], zoom: 11.5 },
    "Puttalam":       { center: [79.8283, 8.0408], zoom: 11.2 },
    "Anuradhapura":   { center: [80.4037, 8.3114], zoom: 11.5 },
    "Polonnaruwa":    { center: [81.0003, 7.9403], zoom: 11.5 },
    "Badulla":        { center: [81.0550, 6.9934], zoom: 11.5 },
    "Monaragala":     { center: [81.3487, 6.8728], zoom: 11.2 },
    "Ratnapura":      { center: [80.4037, 6.6828], zoom: 11.5 },
    "Kegalle":        { center: [80.3547, 7.2513], zoom: 12.0 }
  }
};

/* ============================================================
   DEFAULT TIER SPECIFICATIONS (Features from User Design)
   ============================================================ */
const PLAN_DEFINITIONS = [
  {
    name: 'Free',
    tierKey: 'Free',
    defaultPrice: 0,
    isPopular: false,
    btnText: 'Get started free',
    features: [
      { label: 'Groups', val: '1', type: 'text' },
      { label: 'Tracking', val: '1', type: 'text' },
      { label: 'Devices', val: '1', type: 'text' },
      { label: 'Mobile web', val: 'Yes', type: 'yes' },
      { label: 'Health', val: 'No', type: 'no' },
      { label: 'Notifications', val: 'Limited', type: 'limited' },
      { label: 'Phone alert', val: 'No', type: 'no' },
      { label: 'SMS', val: 'No', type: 'no' }
    ]
  },
  {
    name: 'Silver',
    tierKey: 'Silver',
    defaultPrice: 150,
    isPopular: false,
    btnText: 'Subscribe',
    features: [
      { label: 'Groups', val: '3', type: 'text' },
      { label: 'Tracking', val: '3', type: 'text' },
      { label: 'Devices', val: '3', type: 'text' },
      { label: 'Mobile web', val: 'Yes', type: 'yes' },
      { label: 'Health', val: 'Limited', type: 'limited' },
      { label: 'Notifications', val: 'Unlimited', type: 'unlimited' },
      { label: 'Phone alert', val: 'Yes', type: 'yes' },
      { label: 'SMS', val: 'Limited', type: 'limited' }
    ]
  },
  {
    name: 'Gold',
    tierKey: 'Gold',
    defaultPrice: 400,
    isPopular: true,
    badgeText: 'Most popular',
    btnText: 'Subscribe',
    features: [
      { label: 'Groups', val: '6', type: 'text' },
      { label: 'Tracking', val: '6', type: 'text' },
      { label: 'Devices', val: '6', type: 'text' },
      { label: 'Mobile web', val: 'Yes', type: 'yes' },
      { label: 'Health', val: 'Unlimited', type: 'unlimited' },
      { label: 'Notifications', val: 'Unlimited', type: 'unlimited' },
      { label: 'Phone alert', val: 'Yes', type: 'yes' },
      { label: 'SMS', val: 'Yes', type: 'yes' }
    ]
  },
  {
    name: 'Platinum',
    tierKey: 'Platinum',
    defaultPrice: 750,
    isPopular: false,
    btnText: 'Subscribe',
    features: [
      { label: 'Groups', val: '12', type: 'text' },
      { label: 'Tracking', val: '12', type: 'text' },
      { label: 'Devices', val: '12', type: 'text' },
      { label: 'Mobile web', val: 'Yes', type: 'yes' },
      { label: 'Health', val: 'AI + Unlimited', type: 'unlimited' },
      { label: 'Notifications', val: 'Unlimited', type: 'unlimited' },
      { label: 'Phone alert', val: 'Yes', type: 'yes' },
      { label: 'SMS', val: 'Unlimited', type: 'unlimited' }
    ]
  }
];

/* ============================================================
   STATE
   ============================================================ */
let authToken     = localStorage.getItem('servefamily_token') || '';
let currentUser   = null;
let currentTab    = 'dashboard';
let allRegistrations = [], filteredRegistrations = [];
let allTaxis      = [], filteredTaxis = [];
let allVehicleTypes = [];
let allUsers      = [], filteredUsers = [];
let allAgents     = [];
let allAdmins     = [];
let selectedAgentForAssign = null;
let fleetMap      = null, userMap = null, drawMap = null, usersLocMap = null, agentFleetMap = null, circleMembersMap = null;
let userMapMarker = null;
let fleetTabMarkerMap = {};
let usersLocMarkers = [];
let agentFleetMarkers = [];
let circleMembersMarkers = [];
let allCircles    = [];
let currentFilter = 'all';
let currentPage   = 1;
const PAGE_SIZE   = 25;
let currentDriverData = null;
let usersSortCol  = 'createdAt', usersSortDir = 'desc';
let usersFilter   = 'all';
let clockTimer    = null;
let drawPolygon   = null;
let drawPoints    = [];

let soundMuted    = localStorage.getItem('servefamily_sound_muted') === 'true';
let audioCtx      = null;

/* ============================================================
   WEB AUDIO API SOUND PACK MANAGER
   ============================================================ */
function playSound(type = 'click') {
  if (soundMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'login') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.09);
      osc.frequency.setValueAtTime(659.25, now + 0.18);
      osc.frequency.setValueAtTime(880, now + 0.27);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'notification') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.setValueAtTime(1318.5, now + 0.09); // E6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (err) {
    console.warn("Audio sound error:", err);
  }
}

function toggleAudioSound() {
  soundMuted = !soundMuted;
  localStorage.setItem('servefamily_sound_muted', soundMuted ? 'true' : 'false');
  updateSoundToggleButton();
  if (!soundMuted) playSound('click');
}
window.toggleAudio = toggleAudioSound;
window.toggleAudioSound = toggleAudioSound;

function toggleAudioFromSettings(enabled) {
  soundMuted = !enabled;
  localStorage.setItem('servefamily_sound_muted', soundMuted ? 'true' : 'false');
  updateSoundToggleButton();
  if (!soundMuted) playSound('click');
}

function updateSoundToggleButton() {
  const btn = document.getElementById('btn-sound-toggle');
  if (btn) {
    const iconOn = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg><span>Sound ON</span>`;
    const iconOff = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span>Sound OFF</span>`;
    btn.innerHTML = soundMuted ? iconOff : iconOn;
    btn.style.opacity = soundMuted ? '0.65' : '1';
  }
  const settingCheckbox = document.getElementById('setting-sound');
  if (settingCheckbox) {
    settingCheckbox.checked = !soundMuted;
  }
}

/* ============================================================
   SUPER ADMIN RBAC PERMISSIONS ENFORCEMENT
   ============================================================ */
function applyRBACRestrictions() {
  updateSoundToggleButton();
  const isAgentRole = currentUser?.role === 'agent' || currentUser?.agentProfile || currentUser?.metadata?.role === 'agent';
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    roleBadge.textContent = isAgentRole ? 'Regional Agent' : 'Super Admin';
    if (isAgentRole) {
      roleBadge.style.background = 'rgba(16, 185, 129, 0.25)';
      roleBadge.style.color = '#A7F3D0';
      roleBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      roleBadge.style.background = 'rgba(255, 255, 255, 0.22)';
      roleBadge.style.color = '#FFFFFF';
      roleBadge.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }
  }

  const displayName = document.getElementById('display-name');
  if (displayName && currentUser) {
    displayName.title = currentUser.name || currentUser.email || 'Admin';
  }

  if (isAgentRole) {
    document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = '');
  }
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  updateSoundToggleButton();
  const savedToken = localStorage.getItem('servefamily_token');
  const savedUser  = localStorage.getItem('servefamily_user');
  if (savedToken && savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser?.role === 'agent' || parsedUser?.agentProfile) {
        localStorage.removeItem('servefamily_token');
        localStorage.removeItem('servefamily_user');
        window.location.href = '/agent/';
        return;
      }
      currentUser = parsedUser;
      authToken   = savedToken;
      showDashboard();
    } catch {
      showLoginPage();
    }
  } else {
    showLoginPage();
  }
});

/* ============================================================
   CLOCK & GREETING
   ============================================================ */
function startClock() {
  function tick() {
    const now = new Date();
    const h = now.getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const timeStr  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr  = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const greetEl  = document.getElementById('greeting-text');
    const timeEl   = document.getElementById('clock-time');
    const dateEl   = document.getElementById('clock-date');
    if (greetEl) greetEl.textContent = greeting;
    if (timeEl)  timeEl.textContent  = timeStr;
    if (dateEl)  dateEl.textContent  = dateStr;
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}

/* ============================================================
   API HELPER
   ============================================================ */
async function apiRequest(path, method = 'GET', body = null, useAuth = true) {
  let url = API_BASE_URL + path;
  if (method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }
  const headers = { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };
  if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const opts = { method, headers, cache: 'no-store' };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(url, opts);
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }

    if (res.status === 401 && useAuth && path !== ENDPOINTS.login) {
      console.warn("Session 401 Unauthorized — clearing token and redirecting to login");
      authToken = ''; currentUser = null;
      localStorage.removeItem('servefamily_token');
      localStorage.removeItem('servefamily_user');
      showLoginPage();
      toast('Session expired or invalid. Please sign in again.', 'warning');
    }

    if (res.status === 403 && useAuth) {
      console.warn("403 Forbidden on " + path);
      toast(data?.message || 'Access denied. Administrator privileges required.', 'error');
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message }, networkError: true };
  }
}

/* ============================================================
   AUTH
   ============================================================ */
async function handleLogin(e) {
  e.preventDefault();
  const email  = document.getElementById('email').value.trim();
  const pass   = document.getElementById('password').value;
  const errEl  = document.getElementById('login-error');
  const btn    = document.getElementById('login-btn');
  const btnTxt = btn?.querySelector('.btn-text');
  const loader = btn?.querySelector('.btn-loader');
  
  if (errEl) errEl.classList.add('hidden');
  if (btnTxt) btnTxt.classList.add('hidden');
  if (loader) loader.classList.remove('hidden');
  if (btn) btn.disabled = true;

  try {
    const res = await apiRequest(ENDPOINTS.login, 'POST', { email, password: pass }, false);
    if (res.ok && (res.data?.token || res.data?.accessToken || res.data?.data?.token)) {
      const user = res.data.user || res.data.data?.user || { email };

      // Block Agent logins to Super Admin Dashboard
      if (user.role === 'agent' || user.agentProfile) {
        if (errEl) {
          errEl.textContent = 'Access Denied: Agent accounts cannot access Super Admin Dashboard. Redirecting to Agent Portal...';
          errEl.classList.remove('hidden');
        }
        if (btnTxt) btnTxt.classList.remove('hidden');
        if (loader) loader.classList.add('hidden');
        if (btn) btn.disabled = false;
        setTimeout(() => {
          window.location.href = '/agent/';
        }, 1500);
        return;
      }

      authToken   = res.data.token || res.data.accessToken || res.data.data?.token;
      currentUser = user;
      localStorage.setItem('servefamily_token', authToken);
      localStorage.setItem('servefamily_user', JSON.stringify(currentUser));
      
      showDashboard();
      toast('Welcome to Serve Family Admin', 'success');

      if (btnTxt) btnTxt.classList.remove('hidden');
      if (loader) loader.classList.add('hidden');
      if (btn) btn.disabled = false;
      return;
    } else {
      if (errEl) {
        errEl.textContent = res.data?.message || 'Invalid credentials.';
        errEl.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Connection error: ' + err.message;
      errEl.classList.remove('hidden');
    }
  }

  if (btnTxt) btnTxt.classList.remove('hidden');
  if (loader) loader.classList.add('hidden');
  if (btn) btn.disabled = false;
}

function togglePassword() {
  const ip = document.getElementById('password');
  if (ip) ip.type = ip.type === 'password' ? 'text' : 'password';
}

function showLoginPage() {
  const loginPage = document.getElementById('login-page');
  const dashPage  = document.getElementById('dashboard-page');
  if (loginPage) loginPage.classList.add('active');
  if (dashPage)  dashPage.classList.remove('active');
}

function showDashboard() {
  try {
    const loginPage = document.getElementById('login-page');
    const dashPage  = document.getElementById('dashboard-page');
    if (loginPage) loginPage.classList.remove('active');
    if (dashPage)  dashPage.classList.add('active');

    if (currentUser) {
      const name = currentUser.name || currentUser.email || 'Admin';
      const display = name.split('@')[0];
      
      const el1 = document.getElementById('display-name');
      if (el1) el1.textContent = display;

      const el2 = document.getElementById('greeting-name');
      if (el2) el2.textContent = display;

      const el3 = document.getElementById('user-avatar-char');
      if (el3) el3.textContent = display.charAt(0).toUpperCase();
    }
    if (typeof applyRBACRestrictions === 'function') applyRBACRestrictions();
    playSound('login');
    if (typeof initAdminSocket === 'function') initAdminSocket();
    if (typeof switchTab === 'function') switchTab(currentTab);
  } catch (err) {
    console.error("Error in showDashboard:", err);
    document.getElementById('login-page')?.classList.remove('active');
    document.getElementById('dashboard-page')?.classList.add('active');
  }
}

function handleLogout() {
  authToken = ''; currentUser = null;
  allRegistrations=[]; allTaxis=[]; allUsers=[]; allAgents=[]; allAdmins=[];
  localStorage.removeItem('servefamily_token');
  localStorage.removeItem('servefamily_user');
  showLoginPage();
  toast('Logged out', 'info');
}

window.handleLogin = handleLogin;
window.togglePassword = togglePassword;
window.showLoginPage = showLoginPage;
window.showDashboard = showDashboard;
window.handleLogout = handleLogout;

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
const TAB_LABELS = {
  'dashboard':      'Dashboard Overview',
  'taxi-approve':   'Taxi Approval',
  'taxi-manage':    'Manage Taxis',
  'fleet-map':      'Live Fleet Map',
  'coverage':       'Sri Lanka Coverage Zones',
  'agents':         'Agents & Regional',
  'vehicle-types':  'Manage Vehicle Types',
  'trips':          'Trips & Bookings',
  'wallets':        'Driver Wallets',
  'broadcast':      'Broadcast Push & SMS',
  'users':          'Serve Family Users',
  'circles':        'Family Circles',
  'plans':          'Subscription Plans',
  'revenue':        'Revenue & Income',
  'referrals':      'Referrals Program',
  'audit':          'System Audit Logs',
  'system-settings':'Global System Settings',
  'admins':         'Admin Management',
};

function switchTab(tab) {
  currentTab = tab;
  playSound('click');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-' + tab)?.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('breadcrumb-text').textContent = TAB_LABELS[tab] || tab;

  // Auto-close sidebar on mobile
  if (window.innerWidth <= 900) {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    const bd = document.getElementById('sidebar-backdrop');
    if (bd) bd.classList.remove('active');
  }

  // Auto resize maps on tab switch
  if (tab === 'agents')                  setTimeout(() => { if (agentFleetMap) agentFleetMap.resize(); else initAgentFleetMap(); }, 150);
  if (tab === 'fleet-map')               setTimeout(() => { if (fleetMap) fleetMap.resize(); else initFleetTab(); }, 150);
  if (tab === 'coverage')                setTimeout(() => { if (coverageMap) { coverageMap.resize(); renderCoverageOverlays(); } else { initCoverageMap(); } }, 150);

  loadTabData(tab);
}

function refreshCurrentTab() {
  loadTabData(currentTab);
  toast('Refreshed', 'info');
}

async function loadTabData(tab) {
  loadExecutiveStats();
  if      (tab === 'dashboard')      loadDashboardData();
  else if (tab === 'taxi-approve')   loadApprovalQueue();
  else if (tab === 'taxi-manage')    loadTaxiManage();
  else if (tab === 'fleet-map')      loadFleetTab();
  else if (tab === 'coverage')       loadCoverageZones();
  else if (tab === 'agents')         loadAgentsTab();
  else if (tab === 'vehicle-types')  loadVehicleTypesTab();
  else if (tab === 'trips')          loadBookings();
  else if (tab === 'wallets')        loadWallets();
  else if (tab === 'broadcast')      updateBroadcastAudienceBadge();
  else if (tab === 'users')          loadUsersData();
  else if (tab === 'circles')        loadCirclesData();
  else if (tab === 'plans')          loadPlansData();
  else if (tab === 'revenue')        loadRevenueData();
  else if (tab === 'referrals')      loadReferralsData();
  else if (tab === 'audit')          loadAuditLogs();
  else if (tab === 'system-settings')loadSystemSettings();
  else if (tab === 'admins')         loadAdminsData();
}

/* ============================================================
   EXECUTIVE DASHBOARD ANALYTICS LOADER
   ============================================================ */
async function loadDashboardData() {
  try {
    // 1. Fetch system statistics
    const statsRes = await apiRequest(ENDPOINTS.stats);
    if (statsRes.ok && statsRes.data?.data) {
      const s = statsRes.data.data;
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = (val !== undefined && val !== null) ? val : 0; };
      set('dash-total-users', s.totalUsers);
      set('dash-active-users', `${s.totalUsers || 0} Registered`);
      set('dash-total-taxis', s.total);
      set('dash-active-taxis', s.active);
      set('dash-pending-taxis', s.pending);
      set('stat-total-users', s.totalUsers);
      set('stat-total-taxis', s.total);
      set('stat-active-taxis', s.active);
      set('stat-pending-taxis', s.pending);
    }

    // 2. Fetch circles count
    const circlesRes = await apiRequest(ENDPOINTS.circles);
    if (circlesRes.ok && circlesRes.data?.data) {
      const count = Array.isArray(circlesRes.data.data) ? circlesRes.data.data.length : (circlesRes.data.data.total || 0);
      const el = document.getElementById('dash-total-circles');
      if (el) el.textContent = count;
    }

    // 3. Fetch bookings for chart & activity
    let bookingsCount = 0;
    const bookingsRes = await apiRequest(ENDPOINTS.bookings);
    if (bookingsRes.ok && bookingsRes.data?.data) {
      const bData = Array.isArray(bookingsRes.data.data) ? bookingsRes.data.data : (bookingsRes.data.data.bookings || []);
      bookingsCount = bData.length;
    }
    const elBookings = document.getElementById('dash-total-bookings');
    if (elBookings) elBookings.textContent = bookingsCount;

    // 4. Fetch vehicles for fleet gauge breakdown & recent activity
    const vehRes = await apiRequest(ENDPOINTS.vehicles + '?limit=100');
    let vehicles = [];
    if (vehRes.ok) {
      vehicles = vehRes.data?.data || vehRes.data?.vehicles || (Array.isArray(vehRes.data) ? vehRes.data : []);
    }

    // Update Fleet Breakdown Gauges
    const approvedVehicles = vehicles.filter(v => v.approvalStatus === 'approved').length;
    const pendingVehicles = vehicles.filter(v => (v.approvalStatus || 'pending') === 'pending').length;
    const suspendedVehicles = vehicles.filter(v => v.approvalStatus === 'suspended' || v.approvalStatus === 'rejected').length;
    const totalVeh = vehicles.length || 1;

    const setGauge = (valId, barId, count) => {
      const vEl = document.getElementById(valId);
      const bEl = document.getElementById(barId);
      if (vEl) vEl.textContent = count;
      if (bEl) bEl.style.width = `${Math.min(100, Math.round((count / totalVeh) * 100))}%`;
    };
    setGauge('gauge-approved-val', 'gauge-approved-bar', approvedVehicles);
    setGauge('gauge-pending-val', 'gauge-pending-bar', pendingVehicles);
    setGauge('gauge-suspended-val', 'gauge-suspended-bar', suspendedVehicles);

    // Update agents count
    const agentsRes = await apiRequest(ENDPOINTS.agents);
    if (agentsRes.ok && agentsRes.data?.data) {
      const agCount = Array.isArray(agentsRes.data.data) ? agentsRes.data.data.length : 0;
      const aVal = document.getElementById('gauge-agents-val');
      const aBar = document.getElementById('gauge-agents-bar');
      if (aVal) aVal.textContent = agCount;
      if (aBar) aBar.style.width = `${Math.min(100, agCount * 12)}%`;
    }

    // 5. Update Weekly Chart Bars
    const baseVolume = Math.max(bookingsCount, vehicles.length, 14);
    const dayMultipliers = [0.12, 0.14, 0.17, 0.15, 0.18, 0.24, 0.20];
    let weeklySum = 0;
    dayMultipliers.forEach((mult, idx) => {
      const dayVal = Math.max(2, Math.round(baseVolume * mult));
      weeklySum += dayVal;
      const valEl = document.getElementById(`bar-val-${idx}`);
      const fillEl = document.getElementById(`bar-fill-${idx}`);
      if (valEl) valEl.textContent = dayVal;
      if (fillEl) fillEl.style.height = `${Math.min(100, Math.max(12, Math.round((dayVal / (baseVolume * 0.28)) * 100)))}%`;
    });
    const weekSumEl = document.getElementById('dash-weekly-trips-sum');
    if (weekSumEl) weekSumEl.textContent = weeklySum;

    // 6. Populate Recent Activity Table
    const tbody = document.getElementById('dash-recent-activity-tbody');
    if (tbody) {
      if (vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No recent activity recorded</td></tr>';
      } else {
        const recents = vehicles.slice(0, 6);
        tbody.innerHTML = recents.map((v, i) => {
          const driverName = v.driver?.name || 'Driver';
          const status = v.approvalStatus || 'pending';
          const badgeClass = status === 'approved' ? 'badge-online' : status === 'pending' ? 'badge-amber' : 'badge-offline';
          return `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td><strong>${driverName}</strong><div style="font-size:11px;color:#64748B;">${v.driver?.phoneNumber || v.mobileNum || '—'}</div></td>
              <td><code>${v.vehicleRegNum || '—'}</code></td>
              <td>${v.vehicleType?.type || 'Taxi'}</td>
              <td>${v.baseAddress || 'Sri Lanka'}</td>
              <td><span class="${badgeClass}">${status.toUpperCase()}</span></td>
              <td style="color:#64748B;font-size:12px;">${formatDate(v.createdAt)}</td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

/* ============================================================
   EXECUTIVE STATS BAR
   ============================================================ */
async function loadExecutiveStats() {
  const res = await apiRequest(ENDPOINTS.stats);
  if (res.ok && res.data?.data) {
    const s = res.data.data;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? 0; };
    set('stat-total-users',  s.totalUsers);
    set('stat-total-taxis',  s.total);
    set('stat-active-taxis', s.active);
    set('stat-pending-taxis', s.pending);
  }
}

/* ============================================================
   TAXI APPROVAL
   ============================================================ */
async function fetchRegistrations() {
  const res = await apiRequest(ENDPOINTS.vehicles + '?limit=500');
  if (res.ok) {
    const arr = res.data?.data || res.data?.vehicles || (Array.isArray(res.data) ? res.data : null);
    if (arr) {
      allRegistrations = arr;
      const pending = allRegistrations.filter(r => isPending(r)).length;
      const badge = document.getElementById('pending-badge');
      if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? '' : 'none'; }
    }
  }
}

async function loadApprovalQueue() {
  const container = document.getElementById('approval-list');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading records...</span></div>';
  await fetchRegistrations();
  renderApprovalCards();
}

function renderApprovalCards() {
  const container = document.getElementById('approval-list');
  let data = [...allRegistrations];
  if (currentFilter !== 'all') data = data.filter(r => getStatus(r) === currentFilter);
  const q = document.getElementById('search-approval')?.value || '';
  if (q) data = data.filter(r => matchVehicleSearch(r, q));

  document.getElementById('count-pending').textContent  = allRegistrations.filter(r => isPending(r)).length;
  document.getElementById('count-approved').textContent = allRegistrations.filter(r => isApproved(r)).length;
  document.getElementById('count-rejected').textContent = allRegistrations.filter(r => isRejected(r)).length;

  if (data.length === 0) { container.innerHTML = '<div class="empty-state">No matching registrations found.</div>'; return; }

  container.innerHTML = data.map(r => {
    const name   = getDriverName(r);
    const status = getStatus(r);
    const phoneStr = getPhone(r);
    const emailStr = getEmail(r);
    const contactLine = `${emailStr !== '—' ? emailStr : ''}${emailStr !== '—' && phoneStr !== '—' ? ' · ' : ''}${phoneStr !== '—' ? phoneStr : (emailStr === '—' ? 'No contact' : '')}`;
    return `
      <div class="approval-card" onclick="openDocModal('${r.id}')">
        <div class="approval-card-header">
          <div class="driver-avatar">${name.charAt(0).toUpperCase()}</div>
          <div class="driver-info">
            <div class="driver-name">${name}</div>
            <div class="driver-contact">${contactLine}</div>
          </div>
          <span class="approval-status-badge badge-${status}">${status}</span>
        </div>
        <div class="approval-card-body">
          <div class="card-detail-row"><strong>Vehicle:</strong> ${getVehicleDisplay(r) || 'N/A'}</div>
          <div class="card-detail-row"><strong>Reg:</strong> ${getVehiclePlate(r) || 'N/A'}</div>
          <div class="card-detail-row"><strong>Date:</strong> ${formatDate(r.createdAt)}</div>
          ${r.approvedBy ? `<div class="card-detail-row" style="color:#059669;font-weight:600;margin-top:4px;"><strong>Approved By:</strong> ${r.approvedBy}</div>` : ''}
          ${r.approvedAt ? `<div class="card-detail-row" style="font-size:11px;color:var(--text-muted);"><strong>Approved At:</strong> ${formatDate(r.approvedAt)}</div>` : ''}
        </div>
        <div class="approval-card-footer" style="flex-wrap:wrap;gap:6px;">
          <button class="btn-card-view" onclick="event.stopPropagation();openDocModal('${r.id}')">Docs</button>
          <button class="btn-action reject" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();deleteDriverAction('${r.id}','${name}')">Delete</button>
          ${status === 'pending' ? `
            <button class="btn-card-approve" onclick="event.stopPropagation();quickApprove('${r.id}')">Approve</button>
            <button class="btn-card-reject"  onclick="event.stopPropagation();quickReject('${r.id}')">Reject</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function filterApproval(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('filter-' + filter)?.classList.add('active');
  renderApprovalCards();
}

let _approvalSearchTimer = null;
function searchApproval() {
  renderApprovalCards();

  const q = document.getElementById('search-approval')?.value?.trim() || '';
  clearTimeout(_approvalSearchTimer);
  if (q.length >= 2) {
    _approvalSearchTimer = setTimeout(async () => {
      try {
        const res = await apiRequest(`${ENDPOINTS.vehicles}?search=${encodeURIComponent(q)}&limit=100`);
        if (res.ok && res.data?.data) {
          const serverMatches = res.data.data;
          const seenIds = new Set(allRegistrations.map(v => String(v.id)));
          let added = false;
          serverMatches.forEach(v => {
            if (!seenIds.has(String(v.id))) {
              allRegistrations.push(v);
              allTaxis.push(v);
              seenIds.add(String(v.id));
              added = true;
            }
          });
          if (added) {
            renderApprovalCards();
          }
        }
      } catch (err) {
        console.warn('Server approval search error:', err);
      }
    }, 350);
  }
}

/* ============================================================
   INSTANT AGENT VEHICLE APPROVAL
   "oni agent kenekta driver kenekge mobile number eka or vehicle number eka gahala
    e wahane approved karanna puluwan wenna oni"
   ============================================================ */
async function handleQuickLookupVehicle() {
  const input = document.getElementById('quick-approve-input');
  const resultsContainer = document.getElementById('quick-approve-results');
  if (!input || !resultsContainer) return;

  const query = input.value.trim();
  if (!query) {
    toast('Please enter a driver mobile number or vehicle plate number', 'warning');
    input.focus();
    return;
  }

  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = `
    <div style="padding:16px;text-align:center;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;">
      <div class="spinner" style="display:inline-block;width:20px;height:20px;border-width:2px;vertical-align:middle;margin-right:8px;"></div>
      <span style="font-size:13px;color:#64748B;">Searching vehicle across all regions & provinces...</span>
    </div>
  `;

  try {
    const res = await apiRequest(`${ENDPOINTS.quickLookupVehicle}?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      resultsContainer.innerHTML = `
        <div style="padding:14px 18px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:12px;color:#991B1B;font-size:13px;display:flex;align-items:center;justify-content:space-between;">
          <span>${res.data?.message || 'Failed to search driver or vehicle.'}</span>
          <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="document.getElementById('quick-approve-results').style.display='none'">Dismiss</button>
        </div>
      `;
      return;
    }

    const vehicles = res.data?.data || [];
    renderQuickApproveResult(vehicles, query);
  } catch (err) {
    console.error('Quick lookup error:', err);
    resultsContainer.innerHTML = `
      <div style="padding:14px 18px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:12px;color:#991B1B;font-size:13px;">
        Error connecting to server: ${err.message}
      </div>
    `;
  }
}

function renderQuickApproveResult(vehicles, query) {
  const container = document.getElementById('quick-approve-results');
  if (!container) return;

  if (!vehicles || vehicles.length === 0) {
    container.innerHTML = `
      <div style="padding:18px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;text-align:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:#F1F5F9;display:flex;align-items:center;justify-content:center;margin:0 auto 8px auto;color:#64748B;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div style="font-weight:700;font-size:14px;color:#1E293B;">No matching driver or vehicle found for "${query}"</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;">Please check the phone number (e.g. 0771234567) or vehicle plate (e.g. CAB-1234) and try again.</div>
      </div>
    `;
    return;
  }

  // Also merge matching vehicles into allRegistrations and allTaxis
  const seenIds = new Set(allRegistrations.map(v => String(v.id)));
  vehicles.forEach(v => {
    if (!seenIds.has(String(v.id))) {
      allRegistrations.unshift(v);
      allTaxis.unshift(v);
      seenIds.add(String(v.id));
    }
  });

  container.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
      Found ${vehicles.length} Matching Vehicle${vehicles.length > 1 ? 's' : ''} (Island-wide):
    </div>
    ${vehicles.map(v => {
      const driverName = getDriverName(v);
      const phone = getPhone(v);
      const email = getEmail(v);
      const status = (v.approvalStatus || 'pending').toLowerCase();
      const isApproved = status === 'approved';
      const plate = v.vehicleRegNum || 'No Plate';
      const typeDisplay = v.vehicleType?.type || v.vehicleType?.name || 'Taxi';
      const colorDisplay = v.color || '';
      const auditNote = v.approvedBy ? `Approved by: <strong>${v.approvedBy}</strong>${v.approvedAt ? ` on ${formatDate(v.approvedAt)}` : ''}` : 'Pending verification';

      return `
        <div class="quick-result-card">
          <div class="quick-driver-meta">
            <div class="driver-avatar" style="width:44px;height:44px;font-size:18px;">${driverName.charAt(0).toUpperCase()}</div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-size:15px;font-weight:800;color:#0F172A;">${driverName}</span>
                <span class="quick-plate-badge">${plate}</span>
                <span class="approval-status-badge badge-${status}">${status.toUpperCase()}</span>
              </div>
              <div style="font-size:12px;color:#64748B;margin-top:4px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <span><strong>Phone:</strong> <a href="tel:${phone}" style="color:#2563EB;text-decoration:none;font-weight:600;">${phone}</a></span>
                ${email !== '—' ? `<span><strong>Email:</strong> ${email}</span>` : ''}
                <span><strong>Type:</strong> ${typeDisplay}${colorDisplay ? ` (${colorDisplay})` : ''}</span>
                <span><strong>Base:</strong> ${v.baseAddress || 'Sri Lanka'}</span>
              </div>
              <div style="font-size:11px;color:${isApproved ? '#059669' : '#D97706'};margin-top:4px;">
                ${auditNote}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:12px;border-radius:9px;display:inline-flex;align-items:center;gap:6px;" onclick="openDocModal('${v.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>View Documents</span>
            </button>
            ${!isApproved ? `
              <button type="button" class="quick-approve-btn-action" id="btn-quick-app-${v.id}" onclick="executeQuickApprove('${v.id}', '${plate.replace(/'/g, "\\'")}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Approve Vehicle Now</span>
              </button>
            ` : `
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#059669;background:#ECFDF5;padding:7px 14px;border-radius:9px;border:1px solid #A7F3D0;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Active & Approved</span>
              </span>
            `}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function executeQuickApprove(vehicleId, regNum) {
  const btn = document.getElementById(`btn-quick-app-${vehicleId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Approving...';
  }

  try {
    const res = await apiRequest(ENDPOINTS.quickApproveVehicle, 'POST', { vehicleId });
    if (res.ok && res.data?.success) {
      toast(`Vehicle ${regNum} approved successfully! Driver is now activated.`, 'success');
      // Refresh overall records
      await fetchRegistrations();
      allTaxis = [...allRegistrations];
      await loadExecutiveStats();
      renderApprovalCards();
      renderTable();

      // Refresh the quick lookup result
      const input = document.getElementById('quick-approve-input');
      if (input && input.value.trim()) {
        handleQuickLookupVehicle();
      }
    } else {
      toast(`Failed to approve: ${res.data?.message || 'Server error'}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Approve Vehicle Now</span>';
      }
    }
  } catch (err) {
    console.error('Execute quick approve error:', err);
    toast(`Approval failed: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Approve Vehicle Now</span>';
    }
  }
}

window.handleQuickLookupVehicle = handleQuickLookupVehicle;
window.renderQuickApproveResult = renderQuickApproveResult;
window.executeQuickApprove = executeQuickApprove;

/* ============================================================
/* ============================================================
   TAXI DRIVER ONLINE & COORDINATE HELPERS
   Linked to Driver User Account Activity & Live GPS
   ============================================================ */
function isTaxiDriverOnline(v) {
  if (!v) return false;
  if (v.isOnline === false || v.isActive === false) return false;
  if (v.isOnline === true || v.isActive === true) return true;
  return false;
}

function getTaxiCoordinates(v) {
  if (!v) return { lat: null, lng: null };
  const d = v.driver || (typeof allUsers !== 'undefined' && Array.isArray(allUsers) && allUsers.find(u => u.id === v.userId));
  const lat = (v.latitude && Number(v.latitude) !== 0)
    ? Number(v.latitude)
    : (d?.latitude && Number(d.latitude) !== 0
        ? Number(d.latitude)
        : (v.baseLatitude && Number(v.baseLatitude) !== 0 ? Number(v.baseLatitude) : null));
  const lng = (v.longitude && Number(v.longitude) !== 0)
    ? Number(v.longitude)
    : (d?.longitude && Number(d.longitude) !== 0
        ? Number(d.longitude)
        : (v.baseLongitude && Number(v.baseLongitude) !== 0 ? Number(v.baseLongitude) : null));
  return { lat, lng };
}

async function loadTaxiManage() {
  await fetchRegistrations();
  allTaxis = [...allRegistrations];
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody     = document.getElementById('taxi-table-body');
  const statusF   = document.getElementById('status-filter')?.value || '';
  const searchVal = document.getElementById('search-manage')?.value || '';
  let data = allTaxis.filter(r => {
    if (statusF === 'active' && !isTaxiDriverOnline(r)) return false;
    if (statusF && statusF !== 'active' && getStatus(r) !== statusF) return false;
    if (searchVal && !matchVehicleSearch(r, searchVal)) return false;
    return true;
  });
  filteredTaxis = data;
  const start    = (currentPage - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);
  document.getElementById('pagination-info').textContent = `${pageData.length ? start+1 : 0}–${Math.min(start+PAGE_SIZE,data.length)} of ${data.length}`;
  document.getElementById('page-info').textContent       = `Page ${currentPage} of ${Math.max(1,Math.ceil(data.length/PAGE_SIZE))}`;
  document.getElementById('prev-btn').disabled = currentPage <= 1;
  document.getElementById('next-btn').disabled = currentPage >= Math.ceil(data.length/PAGE_SIZE);
  if (!pageData.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No records found.</td></tr>'; return; }
  tbody.innerHTML = pageData.map((r,i) => {
    const status = getStatus(r);
    const auditStamp = r.approvedBy ? `<div style="font-size:10px;color:#047857;margin-top:2px;">By: <strong>${r.approvedBy}</strong></div>` : '';
    const phoneStr = getPhone(r);
    const emailStr = getEmail(r);
    const contactLine = `${emailStr !== '—' ? emailStr : ''}${emailStr !== '—' && phoneStr !== '—' ? ' · ' : ''}${phoneStr !== '—' ? phoneStr : ''}`;
    const online = isTaxiDriverOnline(r);
    return `<tr>
      <td>${start+i+1}</td>
      <td><div class="td-name">${getDriverName(r)}</div><div class="td-email">${contactLine || 'No contact'}</div></td>
      <td>${getVehicleDisplay(r)||'—'}</td>
      <td>${getVehiclePlate(r)||'—'}</td>
      <td><span class="approval-status-badge badge-${status}">${status}</span>${online?'<span class="status-dot online" style="margin-left:6px;display:inline-block;" title="Driver Account Online"></span>':''}${auditStamp}</td>
      <td>${formatDate(r.createdAt)}</td>
      <td>
        <div class="action-group" style="gap:5px;">
          <button class="btn-action view" onclick="openDocModal('${r.id}')">View</button>
          <button class="btn-action reject" onclick="deleteDriverAction('${r.id}', '${getDriverName(r)}')">Delete</button>
          ${status!=='approved'?`<button class="btn-action approve" onclick="quickApprove('${r.id}')">Approve</button>`:''}
          ${status!=='rejected'?`<button class="btn-action reject"  onclick="quickReject('${r.id}')">Reject</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function changePage(dir) {
  currentPage = Math.max(1, Math.min(Math.ceil(filteredTaxis.length/PAGE_SIZE), currentPage+dir));
  renderTable();
}

let _manageSearchTimer = null;
function searchManage() {
  currentPage = 1;
  renderTable();

  const searchVal = document.getElementById('search-manage')?.value?.trim() || '';
  clearTimeout(_manageSearchTimer);
  if (searchVal.length >= 2) {
    _manageSearchTimer = setTimeout(async () => {
      try {
        const res = await apiRequest(`${ENDPOINTS.vehicles}?search=${encodeURIComponent(searchVal)}&limit=100`);
        if (res.ok && res.data?.data) {
          const serverMatches = res.data.data;
          const seenIds = new Set(allTaxis.map(v => String(v.id)));
          let added = false;
          serverMatches.forEach(v => {
            if (!seenIds.has(String(v.id))) {
              allTaxis.push(v);
              allRegistrations.push(v);
              seenIds.add(String(v.id));
              added = true;
            }
          });
          if (added) {
            renderTable();
          }
        }
      } catch (err) {
        console.warn('Server vehicle search error:', err);
      }
    }, 350);
  }
}
function filterManageStatus(){ currentPage=1; renderTable(); }

/* ============================================================
   REGISTER DRIVER (Admin & Regional)
   ============================================================ */
function toggleRegisterDriverInline() {
  openRegisterDriverModal();
}
window.toggleRegisterDriverInline = toggleRegisterDriverInline;

/* ============================================================
   LIVE FLEET & USER MAP TAB (Combined Taxis & Serve Family)
   ============================================================ */
let liveMapEntities = [];
let currentFleetFilter = 'all';
let currentFleetSort = 'name';

async function loadFleetTab() {
  const loadEl = document.getElementById('fleet-tab-loading');
  if (loadEl) loadEl.style.display = 'flex';

  const [vehiclesRes, usersRes] = await Promise.all([
    apiRequest(ENDPOINTS.vehicles + '?limit=500'),
    apiRequest(ENDPOINTS.users)
  ]);

  if (vehiclesRes.ok && vehiclesRes.data?.data) allTaxis = vehiclesRes.data.data;
  if (usersRes.ok && usersRes.data?.data)       allUsers = usersRes.data.data;

  // Build unified entities
  liveMapEntities = [];

  // Add Taxis
  allTaxis.forEach(v => {
    // Check if driver account is online (by vehicle.isActive OR driver user activity/GPS)
    const isOnline = isTaxiDriverOnline(v);
    const coords = getTaxiCoordinates(v);
    const lat = coords.lat;
    const lng = coords.lng;

    liveMapEntities.push({
      id: `taxi_${v.id}`,
      rawId: v.id,
      entityType: 'taxi',
      name: v.driver?.name || getDriverName(v),
      subtitle: `${v.vehicleRegNum || 'Taxi'} · ${v.vehicleType?.type || 'Taxi'}`,
      contact: v.mobileNum || v.driver?.phoneNumber || v.driver?.email || '',
      email: v.driver?.email || '',
      lat: lat || null,
      lng: lng || null,
      isOnline: isOnline,
      address: v.baseAddress || '',
      createdAt: v.createdAt || '',
      raw: v
    });
  });

  // Add Serve Family Users
  allUsers.forEach(u => {
    liveMapEntities.push({
      id: `user_${u.id}`,
      rawId: u.id,
      entityType: 'user',
      name: u.name || 'Serve Family User',
      subtitle: `${u.email || u.phoneNumber || 'User'}${u.isTracker ? ' · GPS Tracker' : ''}`,
      contact: u.phoneNumber || u.email || '',
      email: u.email || '',
      lat: u.latitude != null ? u.latitude : null,
      lng: u.longitude != null ? u.longitude : null,
      isOnline: u.latitude != null && u.longitude != null,
      isTracker: Boolean(u.isTracker),
      address: u.metadata?.address || '',
      createdAt: u.createdAt || '',
      raw: u
    });
  });

  if (loadEl) loadEl.style.display = 'none';
  initFleetTab();
  renderFleetSidebar();
}

function getFilteredSortedFleetEntities() {
  const searchQ = document.getElementById('fleet-search')?.value?.toLowerCase() || '';

  let list = liveMapEntities.filter(item => {
    if (currentFleetFilter === 'taxi')   return item.entityType === 'taxi';
    if (currentFleetFilter === 'user')   return item.entityType === 'user';
    if (currentFleetFilter === 'online') return item.isOnline;
    return true; // 'all'
  });

  if (searchQ) {
    list = list.filter(item => {
      if (item.entityType === 'taxi' && item.raw) {
        return matchVehicleSearch(item.raw, searchQ);
      }
      return (
        (item.name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (item.subtitle || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (item.contact || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        (item.address || '').toLowerCase().includes(searchQ.toLowerCase())
      );
    });
  }

  list.sort((a, b) => {
    if (currentFleetSort === 'name') {
      return a.name.localeCompare(b.name);
    } else if (currentFleetSort === 'type') {
      if (a.entityType !== b.entityType) return a.entityType === 'taxi' ? -1 : 1;
      return a.name.localeCompare(b.name);
    } else if (currentFleetSort === 'online') {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name);
    } else if (currentFleetSort === 'recent') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return 0;
  });

  return list;
}

function renderFleetSidebar() {
  const listEl = document.getElementById('fleet-sidebar-list');
  const countEl = document.getElementById('fleet-tab-count');
  if (!listEl) return;

  const data = getFilteredSortedFleetEntities();
  const onlineCount = liveMapEntities.filter(e => e.isOnline && e.lat != null).length;
  const totalCount  = liveMapEntities.filter(e => e.lat != null).length;

  if (countEl) {
    countEl.textContent = `${onlineCount} Online / ${totalCount} on Map`;
  }

  if (!data.length) {
    listEl.innerHTML = '<div class="empty-state" style="padding:28px 16px;">No matching entities found</div>';
    return;
  }

  listEl.innerHTML = data.map(item => {
    const isTaxi = item.entityType === 'taxi';
    const hasLocation = item.lat != null && item.lng != null;
    const typeBadge = isTaxi
      ? `<span class="badge-type-taxi">Taxi</span>`
      : `<span class="badge-type-user">Family</span>`;

    const statusBadge = isTaxi
      ? (item.isOnline ? `<span class="fleet-item-status online">Online</span>` : `<span class="fleet-item-status offline">Offline</span>`)
      : (hasLocation ? `<span class="fleet-item-status user-badge">GPS Live</span>` : `<span class="fleet-item-status offline">No GPS</span>`);

    const dotClass = isTaxi
      ? (item.isOnline ? 'online' : '')
      : (hasLocation ? 'user-dot' : '');

    return `
      <div class="fleet-list-item ${item.isOnline && isTaxi ? 'online' : ''}" onclick="flyToEntity('${item.id}')">
        <div class="fleet-item-dot ${dotClass}"></div>
        <div class="fleet-item-info">
          <div class="fleet-item-name">
            ${typeBadge}
            <span>${item.name}</span>
          </div>
          <div class="fleet-item-sub">${item.subtitle}</div>
          ${item.address ? `<div class="fleet-item-addr">${item.address}</div>` : ''}
        </div>
        ${statusBadge}
      </div>`;
  }).join('');
}

function initFleetTab() {
  if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') return;
  const gl = window.mapboxgl || window.maplibregl;
  const container = document.getElementById('fleet-tab-map');
  if (!container) return;

  setTimeout(() => {
    try {
      if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;
      if (!fleetMap) {
        fleetMap = new gl.Map({
          container: 'fleet-tab-map',
          style: getAdminMapStyle(),
          center: [80.7718, 7.8731],
          zoom: 7.5
        });
        fleetMap.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
        fleetMap.on('load', () => {
          addFleetTabMarkers();
          fleetMap.resize();
        });
      } else {
        addFleetTabMarkers();
        fleetMap.resize();
      }
    } catch(e) { console.warn('Fleet tab map error:', e); }
  }, 100);
}

function addFleetTabMarkers() {
  if (!fleetMap) return;
  Object.values(fleetTabMarkerMap).forEach(m => m.remove());
  fleetTabMarkerMap = {};

  liveMapEntities.forEach(item => {
    if (item.lat == null || item.lng == null) return;

    const isTaxi = item.entityType === 'taxi';
    const el = document.createElement('div');

    if (isTaxi) {
      el.className = 'fleet-marker' + (item.isOnline ? ' online' : '');
    } else {
      el.className = 'fleet-marker user-marker' + (item.isOnline ? ' online' : '');
    }

    el.title = `${item.name} (${isTaxi ? 'Taxi' : 'Serve Family'})`;
    el.addEventListener('click', () => flyToEntity(item.id));

    let popupContent = '';
    if (isTaxi) {
      popupContent = `
        <div class="map-popup">
          <div class="map-popup-title" style="display:flex;align-items:center;gap:6px;">
            <span class="badge-type-taxi">Taxi</span>
            <strong>${item.name}</strong>
          </div>
          <div class="map-popup-row">Reg: <strong>${item.raw?.vehicleRegNum || 'N/A'}</strong> (${item.raw?.vehicleType?.type || 'Taxi'})</div>
          <div class="map-popup-row">Status: <span style="color:${item.isOnline ? '#10B981' : '#6B7280'};font-weight:700;">${item.isOnline ? 'Online' : 'Offline'}</span></div>
          ${item.contact ? `<div class="map-popup-row">Contact: ${item.contact}</div>` : ''}
          ${item.address ? `<div class="map-popup-addr">${item.address}</div>` : ''}
        </div>`;
    } else {
      popupContent = `
        <div class="map-popup">
          <div class="map-popup-title" style="display:flex;align-items:center;gap:6px;">
            <span class="badge-type-user">Serve Family</span>
            <strong>${item.name}</strong>
          </div>
          <div class="map-popup-row">Account: ${item.email || 'App User'}</div>
          ${item.isTracker ? `<div class="map-popup-row" style="color:#4F46E5;font-weight:700;">GPS Tracker Device</div>` : ''}
          ${item.contact ? `<div class="map-popup-row">Phone: ${item.contact}</div>` : ''}
          <div class="map-popup-addr">${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</div>
        </div>`;
    }

    const popup = new mapboxgl.Popup({ offset: 14, maxWidth: '250px' }).setHTML(popupContent);
    const marker = new mapboxgl.Marker(el).setLngLat([item.lng, item.lat]).setPopup(popup).addTo(fleetMap);
    fleetTabMarkerMap[item.id] = marker;
  });
}

function flyToEntity(entityId) {
  const item = liveMapEntities.find(x => x.id === entityId);
  if (!item || !fleetMap) return;
  if (item.lat == null || item.lng == null) {
    toast(`No GPS location available for "${item.name}"`, 'warning');
    return;
  }
  fleetMap.flyTo({ center: [item.lng, item.lat], zoom: 14.5, duration: 1200 });
  fleetTabMarkerMap[entityId]?.togglePopup();
}

function filterFleet(type) {
  currentFleetFilter = type;
  document.querySelectorAll('.fleet-filter-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('fleet-filter-' + type)?.classList.add('active');
  renderFleetSidebar();

  if (!fleetMap) return;
  const filtered = getFilteredSortedFleetEntities();
  const visibleIds = new Set(filtered.map(f => f.id));

  Object.entries(fleetTabMarkerMap).forEach(([id, marker]) => {
    if (visibleIds.has(id)) {
      marker.getElement().style.display = '';
      marker.getElement().style.opacity = '1';
    } else {
      marker.getElement().style.display = 'none';
    }
  });
}

function changeFleetSort(sortKey) {
  currentFleetSort = sortKey;
  renderFleetSidebar();
}

function searchFleet() {
  renderFleetSidebar();
  if (!fleetMap) return;
  const filtered = getFilteredSortedFleetEntities();
  const visibleIds = new Set(filtered.map(f => f.id));

  Object.entries(fleetTabMarkerMap).forEach(([id, marker]) => {
    if (visibleIds.has(id)) {
      marker.getElement().style.display = '';
      marker.getElement().style.opacity = '1';
    } else {
      marker.getElement().style.display = 'none';
    }
  });
}

/* ============================================================
   AGENTS & REGIONAL MANAGEMENT
   ============================================================ */
async function loadAgentsTab() {
  const container = document.getElementById('agents-list');
  if (container) container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading agents...</span></div>';

  const [agentsRes, vehiclesRes] = await Promise.all([
    apiRequest(ENDPOINTS.agents),
    apiRequest(ENDPOINTS.vehicles + '?limit=500')
  ]);

  allAgents = agentsRes.ok && agentsRes.data?.data ? agentsRes.data.data : [];
  if (vehiclesRes.ok && vehiclesRes.data?.data) allTaxis = vehiclesRes.data.data;

  renderAgentsList(allAgents);
  initAgentFleetMap();
}

function renderAgentsList(agents) {
  const container = document.getElementById('agents-list');
  if (!container) return;
  if (!agents || !agents.length) {
    container.innerHTML = `<div class="empty-card-state">
      <div class="empty-card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <h3 class="empty-card-title">No Regional Agents Added</h3>
      <p class="empty-card-text">Create agents with province/district coverage to automatically assign regional drivers.</p>
      <button class="btn-primary" style="padding:10px 20px;font-size:13px;" onclick="openCreateAgentModal()">Add Regional Agent</button>
    </div>`;
    return;
  }
  container.innerHTML = agents.map(a => {
    const driverCount = a.vehicles?.length || a.assignedDriversCount || 0;
    let dsds = [];
    try { dsds = a.dsds ? JSON.parse(a.dsds) : []; } catch { dsds = a.dsds ? [a.dsds] : []; }
    return `<div class="agent-card">
      <div class="agent-card-header">
        <div class="agent-avatar">${(a.name||a.email||'A').charAt(0).toUpperCase()}</div>
        <div class="agent-info">
          <h4 class="agent-title">${a.name||a.email}</h4>
          <div class="agent-geo-badges">
            ${a.province?`<span class="geo-badge province">${a.province}</span>`:''}
            ${a.district?`<span class="geo-badge district">${a.district}</span>`:''}
          </div>
        </div>
      </div>
      ${dsds.length ? `<div class="agent-dsds">${dsds.map(d=>`<span class="dsd-tag">${d}</span>`).join('')}</div>` : ''}
      <div class="agent-card-body">
        <div class="agent-meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>${a.email}</span></div>
        <div class="agent-meta-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.908.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${a.phone||'No phone'}</span></div>
        <div class="agent-meta-row agent-driver-count"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span>${driverCount} Drivers Assigned</span></div>
      </div>
      <div class="agent-card-actions">
        <button class="btn-assign" onclick="openAssignDriversModal('${a.id}')">Assign Drivers</button>
        ${a.district?`<button class="btn-assign" style="background:#ECFDF5;border-color:#A7F3D0;color:#047857;" onclick="autoAssignDrivers('${a.id}')">Auto-Assign</button>`:''}
        <button class="btn-assign" style="background:#EFF6FF;border-color:#BFDBFE;color:#1D4ED8;" onclick="resendAgentCredentials('${a.id}', '${a.email}')" title="Send Login Credentials via Email">Resend Email</button>
        <button class="btn-danger-sm" onclick="deleteAgent('${a.id}')">Remove</button>
      </div>
    </div>`;
  }).join('');
}

function openCreateAgentModal() {
  ['agent-name','agent-email','agent-phone','agent-location','agent-password'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  const sendEmailChk = document.getElementById('agent-send-email');
  if (sendEmailChk) sendEmailChk.checked = true;
  document.getElementById('agent-province').value = '';
  populateDistricts('');
  document.getElementById('agent-dsds-list').innerHTML = '';
  drawPolygon = null;
  drawPoints  = [];
  const btn = document.getElementById('draw-coverage-btn');
  if(btn) btn.textContent = 'Draw Coverage Area on Map';
  openModalDirect('agent-modal');
}

/* ─── SL Geo Cascade ─────────────────────────────────────────────────────── */
function populateProvinces() {
  const sel = document.getElementById('agent-province');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Province —</option>' +
    Object.keys(SL_GEO).map(p => `<option value="${p}">${p}</option>`).join('');
}

function populateDistricts(province) {
  const dSel  = document.getElementById('agent-district');
  const dsdEl = document.getElementById('agent-dsds-list');
  if (dSel)  dSel.innerHTML  = '<option value="">— Select District —</option>';
  if (dsdEl) dsdEl.innerHTML = '';
  if (!province || !SL_GEO[province]) {
    updateDrawButtonLabel();
    return;
  }
  const districts = Object.keys(SL_GEO[province]);
  if (dSel) dSel.innerHTML = '<option value="">— Select District —</option>' +
    districts.map(d => `<option value="${d}">${d}</option>`).join('');
  updateDrawButtonLabel();
}

function populateDSDs(district) {
  const province = document.getElementById('agent-province')?.value;
  const dsdEl    = document.getElementById('agent-dsds-list');
  if (!dsdEl) return;
  if (!province || !district || !SL_GEO[province]?.[district]) {
    dsdEl.innerHTML='';
    updateDrawButtonLabel();
    return;
  }
  const dsds = SL_GEO[province][district];
  dsdEl.innerHTML = `
    <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-weight:600;">Select Divisional Secretariats (optional — select all that apply):</p>
    <div class="dsd-checkbox-grid">
      ${dsds.map(d => `<label class="dsd-checkbox-item"><input type="checkbox" value="${d}" class="dsd-chk" onchange="updateDrawButtonLabel()" /><span>${d}</span></label>`).join('')}
    </div>`;
  updateDrawButtonLabel();
}

function updateDrawButtonLabel() {
  const province = document.getElementById('agent-province')?.value;
  const district = document.getElementById('agent-district')?.value;
  const btn = document.getElementById('draw-coverage-btn');
  if (!btn) return;
  if (drawPolygon) {
    btn.textContent = `Coverage Area Saved (${drawPoints.length} Points)`;
    return;
  }
  if (district) {
    btn.textContent = `Draw Coverage Area for ${district} (${province})`;
  } else if (province) {
    btn.textContent = `Draw Coverage Area for ${province} Province`;
  } else {
    btn.textContent = 'Draw Coverage Area on Map';
  }
}

function getAgentTargetArea() {
  const province = document.getElementById('agent-province')?.value || '';
  const district = document.getElementById('agent-district')?.value || '';
  const checkedDSDs = Array.from(document.querySelectorAll('.dsd-chk:checked')).map(c => c.value);

  let target = { center: [80.7718, 7.8731], zoom: 7.5, label: 'Sri Lanka' };

  if (district && SL_COORDINATES.districts[district]) {
    const dCoord = SL_COORDINATES.districts[district];
    target = {
      center: dCoord.center,
      zoom: checkedDSDs.length ? dCoord.zoom + 0.6 : dCoord.zoom,
      label: `${district} District (${province} Province)` + (checkedDSDs.length ? ` › ${checkedDSDs.join(', ')}` : '')
    };
  } else if (province && SL_COORDINATES.provinces[province]) {
    const pCoord = SL_COORDINATES.provinces[province];
    target = {
      center: pCoord.center,
      zoom: pCoord.zoom,
      label: `${province} Province`
    };
  }

  return target;
}

/* ─── Draw Coverage Area ─────────────────────────────────────────────────── */
function openDrawModal() {
  openModalDirect('draw-modal');
  const target = getAgentTargetArea();

  const badge = document.getElementById('draw-focus-badge');
  if (badge) badge.textContent = target.label;

  const instruction = document.getElementById('draw-instruction-text');
  if (instruction) {
    instruction.textContent = `Focused on ${target.label}. Click anywhere on the map to place boundary points and outline the agent's service area.`;
  }

  setTimeout(() => initDrawMap(target), 200);
}

function initDrawMap(targetArea) {
  if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') return;
  const gl = window.mapboxgl || window.maplibregl;
  const container = document.getElementById('draw-map-canvas');
  if (!container) return;

  const target = targetArea || getAgentTargetArea();
  if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;

  if (!drawMap) {
    drawMap = new gl.Map({
      container: 'draw-map-canvas',
      style: getAdminMapStyle(),
      center: target.center,
      zoom: target.zoom
    });
    drawMap.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');

    drawMap.on('load', () => {
      drawMap.resize();
      drawMap.jumpTo({ center: target.center, zoom: target.zoom });
    });

    drawMap.on('click', e => {
      drawPoints.push([e.lngLat.lng, e.lngLat.lat]);
      updateDrawPreview();
    });
  } else {
    drawMap.resize();
    drawMap.flyTo({ center: target.center, zoom: target.zoom, duration: 900 });
  }

  // Bind buttons
  const undoBtn = document.getElementById('draw-undo-btn');
  if (undoBtn) {
    undoBtn.onclick = () => {
      drawPoints.pop();
      updateDrawPreview();
    };
  }

  const clearBtn = document.getElementById('draw-clear-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      drawPoints = [];
      updateDrawPreview();
      drawPolygon = null;
      updateDrawButtonLabel();
    };
  }

  const saveBtn = document.getElementById('draw-save-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (drawPoints.length < 3) {
        toast('Draw at least 3 points to form a coverage zone', 'warning');
        return;
      }
      drawPolygon = {
        type: 'Polygon',
        coordinates: [[...drawPoints, drawPoints[0]]]
      };
      toast('Coverage zone saved successfully!', 'success');
      closeModalDirect('draw-modal');
      updateDrawButtonLabel();
    };
  }
}

function updateDrawPreview() {
  if (!drawMap) return;
  try {
    if (drawMap.getLayer('draw-fill'))   drawMap.removeLayer('draw-fill');
    if (drawMap.getLayer('draw-line'))   drawMap.removeLayer('draw-line');
    if (drawMap.getLayer('draw-points')) drawMap.removeLayer('draw-points');
    if (drawMap.getSource('draw-src'))   drawMap.removeSource('draw-src');
  } catch(e) {}

  if (!drawPoints.length) return;

  const features = [];
  if (drawPoints.length > 1) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [...drawPoints, drawPoints[0]] }
    });
  }
  if (drawPoints.length > 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...drawPoints, drawPoints[0]]] }
    });
  }

  // Emit individual Point features for each coordinate
  drawPoints.forEach(pt => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pt }
    });
  });

  drawMap.addSource('draw-src', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features }
  });

  if (drawPoints.length > 2) {
    drawMap.addLayer({
      id: 'draw-fill',
      type: 'fill',
      source: 'draw-src',
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#4F46E5', 'fill-opacity': 0.22 }
    });
  }

  if (drawPoints.length > 1) {
    drawMap.addLayer({
      id: 'draw-line',
      type: 'line',
      source: 'draw-src',
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': '#4F46E5', 'line-width': 2.5 }
    });
  }

  drawMap.addLayer({
    id: 'draw-points',
    type: 'circle',
    source: 'draw-src',
    filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 6, 'circle-color': '#4F46E5', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' }
  });
}

/* ─── Create Agent ───────────────────────────────────────────────────────── */
async function handleCreateAgent(e) {
  e.preventDefault();
  const name       = document.getElementById('agent-name').value.trim();
  const email      = document.getElementById('agent-email').value.trim();
  const phone      = document.getElementById('agent-phone').value.trim();
  const locationName = document.getElementById('agent-location').value.trim() || document.getElementById('agent-district')?.value || '';
  const province   = document.getElementById('agent-province')?.value || '';
  const district   = document.getElementById('agent-district')?.value  || '';
  const password   = document.getElementById('agent-password')?.value?.trim() || '';
  const sendEmail  = document.getElementById('agent-send-email')?.checked ?? true;
  const checkedDSDs= Array.from(document.querySelectorAll('.dsd-chk:checked')).map(c => c.value);

  const body = {
    name, email, phone, phoneNumber: phone,
    locationName: locationName || district || province,
    province, district,
    dsds: checkedDSDs,
    coverageArea: drawPolygon || null,
    password,
    sendEmail
  };

  const res = await apiRequest(ENDPOINTS.agents, 'POST', body);
  if (res.ok) {
    const genPass = res.data?.data?.generatedPassword;
    const isEmailSent = res.data?.data?.credentialsSent;
    const msg = isEmailSent 
      ? `Agent created & credentials emailed to ${email}!\n\nSystem Password: ${genPass}`
      : `Agent created successfully!\n\nSystem Password: ${genPass}`;
    
    alert(msg);
    toast('Regional agent created successfully', 'success');
    closeModalDirect('agent-modal');
    e.target.reset();
    drawPolygon = null;
    drawPoints  = [];
    await loadAgentsTab();
    await loadExecutiveStats();
  } else {
    toast(res.data?.message || 'Failed to create agent', 'error');
  }
}

async function resendAgentCredentials(agentId, email) {
  const customPass = prompt(`Resend system login credentials to ${email}.\n\nEnter custom password or leave blank and click OK to auto-generate a new password:`);
  if (customPass === null) return;

  const body = customPass.trim() ? { password: customPass.trim() } : {};
  const res = await apiRequest(`${ENDPOINTS.agents}/${agentId}/resend-credentials`, 'POST', body);

  if (res.ok) {
    const genPass = res.data?.data?.generatedPassword;
    const isEmailSent = res.data?.data?.credentialsSent;
    alert(isEmailSent 
      ? `Login credentials email successfully sent to ${email}!\n\nPassword: ${genPass}`
      : `Credentials updated, but email send failed.\n\nPassword: ${genPass}`);
    toast(`Credentials email dispatched to ${email}`, 'success');
  } else {
    toast(res.data?.message || 'Failed to resend credentials', 'error');
  }
}

async function deleteAgent(agentId) {
  if (!confirm('Delete this agent? Assigned drivers will be unlinked.')) return;
  const res = await apiRequest(`${ENDPOINTS.agents}/${agentId}`, 'DELETE');
  if (res.ok) { toast('Agent deleted', 'success'); await loadAgentsTab(); await loadExecutiveStats(); }
  else toast(res.data?.message || 'Failed to delete agent', 'error');
}

async function autoAssignDrivers(agentId) {
  const agent = allAgents.find(a => a.id === agentId);
  if (!confirm(`Auto-assign all unassigned taxis in "${agent?.district}" district to ${agent?.name}?`)) return;
  const res = await apiRequest(ENDPOINTS.autoAssign.replace('{id}', agentId), 'POST');
  if (res.ok) {
    toast(res.data.message || 'Auto-assigned successfully', 'success');
    await loadAgentsTab();
    await loadExecutiveStats();
  } else {
    toast(res.data?.message || 'Auto-assign failed', 'error');
  }
}

/* ─── Assign Drivers Modal ───────────────────────────────────────────────── */
function openAssignDriversModal(agentId) {
  selectedAgentForAssign = agentId;
  const agent = allAgents.find(a => a.id === agentId);
  document.getElementById('assign-agent-title').textContent = `Assign Drivers — ${agent?.name || 'Agent'}`;
  const container = document.getElementById('assign-drivers-list');
  if (!allTaxis.length) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No taxi drivers in system</div>';
  } else {
    const assignedIds = agent?.vehicles?.map(v => v.id) || [];
    container.innerHTML = allTaxis.map(v => {
      const driverName = v.driver?.name || getDriverName(v);
      const checked    = (v.agentId === agentId || assignedIds.includes(v.id)) ? 'checked' : '';
      return `<label class="assign-item">
        <input type="checkbox" class="driver-assign-checkbox" value="${v.id}" ${checked} />
        <div>
          <strong>${driverName}</strong> — ${v.vehicleType?.type||'Taxi'}
          <div style="font-size:11px;color:var(--text-muted)">${v.vehicleRegNum||''} · ${v.baseAddress||'No location'}</div>
        </div>
      </label>`;
    }).join('');
  }
  openModalDirect('assign-modal');
}

async function saveDriverAssignments() {
  if (!selectedAgentForAssign) return;
  const vehicleIds = Array.from(document.querySelectorAll('.driver-assign-checkbox:checked')).map(c => c.value);
  const res = await apiRequest(`${ENDPOINTS.agents}/${selectedAgentForAssign}/assign-drivers`, 'POST', { vehicleIds });
  if (res.ok) { toast('Drivers assigned successfully', 'success'); closeModalDirect('assign-modal'); await loadAgentsTab(); await loadExecutiveStats(); }
  else toast(res.data?.message || 'Failed to assign drivers', 'error');
}

/* ─── Agent Mini Fleet Map ───────────────────────────────────────────────── */
function initAgentFleetMap() {
  if ((typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') || !document.getElementById('fleet-map')) return;
  const gl = window.mapboxgl || window.maplibregl;
  const activeCount = allTaxis.filter(v => isTaxiDriverOnline(v)).length;
  const badge = document.getElementById('online-drivers-count');
  if (badge) badge.textContent = `${activeCount} Active`;

  setTimeout(() => {
    try {
      if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;
      if (!agentFleetMap) {
        agentFleetMap = new gl.Map({
          container: 'fleet-map',
          style: getAdminMapStyle(),
          center: [80.7718, 7.8731],
          zoom: 7
        });
        agentFleetMap.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
        agentFleetMap.on('load', () => {
          addAgentMapMarkers();
          agentFleetMap.resize();
        });
      } else {
        addAgentMapMarkers();
        agentFleetMap.resize();
      }
    } catch(e) { console.warn('Agent fleet map error:', e); }
  }, 100);
}

function addAgentMapMarkers() {
  if (!agentFleetMap) return;
  agentFleetMarkers.forEach(m => m.remove());
  agentFleetMarkers = [];
  allTaxis.forEach(v => {
    const coords = getTaxiCoordinates(v);
    const lat = coords.lat;
    const lng = coords.lng;
    if (!lat || !lng) return;
    const online = isTaxiDriverOnline(v);
    const el = document.createElement('div');
    el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${online?'#10B981':'#94A3B8'};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);cursor:pointer;`;
    const popup = new mapboxgl.Popup({ offset:12, maxWidth:'200px' }).setHTML(`<div class="map-popup"><div class="map-popup-title">${v.vehicleRegNum||'Vehicle'}</div><div class="map-popup-row">Driver: ${v.driver?.name||'Unknown'}</div><div class="map-popup-row" style="color:${online?'#10B981':'#6B7280'}">${online?'Online':'Offline'}</div></div>`);
    const m = new mapboxgl.Marker(el).setLngLat([lng,lat]).setPopup(popup).addTo(agentFleetMap);
    agentFleetMarkers.push(m);
  });
}

/* ============================================================
   USERS TAB — with sort, filter, bulk location map
   ============================================================ */
async function loadUsersData() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="9" class="table-loading"><div class="spinner"></div> Loading users...</td></tr>';
  const res = await apiRequest(ENDPOINTS.users);
  if (res.ok && res.data?.data) {
    allUsers = res.data.data;
    applyUsersFilterSort();
  } else {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Failed to load users</td></tr>';
  }
}

function applyUsersFilterSort() {
  let data = [...allUsers];
  if (usersFilter === 'verified')   data = data.filter(u => u.emailVerified);
  if (usersFilter === 'unverified') data = data.filter(u => !u.emailVerified);
  if (usersFilter === 'banned')     data = data.filter(u => u.metadata?.isBanned);
  if (usersFilter === 'tracker')    data = data.filter(u => u.isTracker);
  if (usersFilter === 'withloc')    data = data.filter(u => u.latitude != null && u.longitude != null);

  const q = document.getElementById('search-users')?.value?.toLowerCase() || '';
  if (q) data = data.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.phoneNumber||'').includes(q));

  data.sort((a,b) => {
    let av = a[usersSortCol], bv = b[usersSortCol];
    if (typeof av === 'string') { av=av.toLowerCase(); bv=(bv||'').toLowerCase(); }
    if (av < bv) return usersSortDir==='asc'?-1:1;
    if (av > bv) return usersSortDir==='asc'?1:-1;
    return 0;
  });
  filteredUsers = data;
  renderUsersTable(filteredUsers);
  updateUserStats(data);
}

function updateUserStats(data) {
  const set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('users-stat-total',   allUsers.length);
  set('users-stat-verified',allUsers.filter(u=>u.emailVerified).length);
  set('users-stat-banned',  allUsers.filter(u=>u.metadata?.isBanned).length);
  set('users-stat-withloc', allUsers.filter(u=>u.latitude!=null).length);
}

function setUsersFilter(filter) {
  usersFilter = filter;
  document.querySelectorAll('.users-filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('uf-'+filter)?.classList.add('active');
  applyUsersFilterSort();
}

function sortUsers(col) {
  if (usersSortCol === col) usersSortDir = usersSortDir==='asc'?'desc':'asc';
  else { usersSortCol=col; usersSortDir='asc'; }
  document.querySelectorAll('.sort-th').forEach(th => th.querySelector('.sort-icon')?.setAttribute('data-dir',''));
  const thEl = document.querySelector(`[data-sort="${col}"]`);
  if (thEl) thEl.querySelector('.sort-icon')?.setAttribute('data-dir', usersSortDir);
  applyUsersFilterSort();
}

function searchUsers(query) { applyUsersFilterSort(); }

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No users match the current filter</td></tr>'; return; }
  tbody.innerHTML = users.map((u,i) => {
    const hasLoc    = u.latitude != null && u.longitude != null;
    const isBanned  = u.metadata?.isBanned;
    const userEsc   = (u.email||u.name||'User').replace(/'/g,"\\'");
    const nameEsc   = (u.name||u.email||'User').replace(/'/g,"\\'");
    const locBtn    = hasLoc
      ? `<button class="btn-map-loc" onclick="openUserLocationMap(${u.latitude},${u.longitude},'${(u.name||'User').replace(/'/g,"\\'")}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Map</button>`
      : '<span style="font-size:11px;color:var(--text-muted)">No Location</span>';
    const passCol = u.password
      ? `<div style="display:flex;align-items:center;gap:5px;"><span id="pass-val-${u.id}" data-revealed="false" style="font-family:monospace;font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">••••••••</span><button class="btn-action view" style="font-size:10px;padding:2px 6px;" onclick="toggleUserPasswordReveal('${u.id}')">Reveal</button></div>`
      : `<button class="btn-action" style="background:#FEF3C7;color:#D97706;font-size:10px;padding:2px 7px;" onclick="openResetPasswordModal('${u.id}','${userEsc}')">Set Pass</button>`;
    return `<tr class="${isBanned?'row-banned':''}">
      <td>${i+1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="user-avatar" style="width:30px;height:30px;font-size:12px;">${(u.name||u.email||'U').charAt(0).toUpperCase()}</div>
          <div>
            <strong>${u.name||'Unnamed'}</strong>${isBanned?'<span class="badge-banned">Banned</span>':''}
            <div style="font-size:10px;color:var(--text-muted)">${u.id.substring(0,8)}…</div>
          </div>
        </div>
      </td>
      <td><div>${u.email||'—'}</div>${u.email?(u.emailVerified?'<span class="badge-verified-green">Verified</span>':'<span class="badge-unverified-gray">Unverified</span>'):''}</td>
      <td><div>${u.phoneNumber||'—'}</div>${u.phoneVerified?'<span class="badge-verified-green">Verified</span>':u.phoneNumber?'<span class="badge-unverified-gray">Unverified</span>':''}</td>
      <td>${passCol}</td>
      <td><span class="${u.isTracker?'badge-online':'badge-offline'}">${u.isTracker?'Tracker':'App User'}</span></td>
      <td>${locBtn}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <div class="action-group">
          <button class="btn-action view" onclick="openEditUserModal('${u.id}')">Edit</button>
          <button class="btn-action" style="background:#EEF2FF;color:#4F46E5;" onclick="openResetPasswordModal('${u.id}','${userEsc}')">Pass</button>
          <button class="btn-action ${isBanned?'approve':'reject'}" onclick="toggleUserBan('${u.id}',${Boolean(isBanned)})">${isBanned?'Unban':'Ban'}</button>
          <button class="btn-action" style="background:#FEE2E2;color:#DC2626;" onclick="confirmDeleteUser('${u.id}','${nameEsc}')">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ─── Users Bulk Location Map ────────────────────────────────────────────── */
function openUsersLocMap() {
  const withLoc = filteredUsers.filter(u => u.latitude != null && u.longitude != null);
  if (!withLoc.length) { toast('No users with location data in current filter', 'warning'); return; }
  openModalDirect('users-loc-modal');
  document.getElementById('users-loc-count').textContent = `${withLoc.length} users with locations`;
  setTimeout(() => initUsersLocMap(withLoc), 200);
}

function initUsersLocMap(users) {
  if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') return;
  const gl = window.mapboxgl || window.maplibregl;
  if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;
  if (!usersLocMap) {
    usersLocMap = new gl.Map({
      container: 'users-loc-map-canvas',
      style: getAdminMapStyle(),
      center: [80.7718, 7.8731],
      zoom: 7
    });
    usersLocMap.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
    usersLocMap.on('load', () => {
      addUsersLocMarkers(users);
      usersLocMap.resize();
    });
  } else {
    usersLocMarkers.forEach(m => m.remove());
    usersLocMarkers = [];
    addUsersLocMarkers(users);
    setTimeout(() => usersLocMap && usersLocMap.resize(), 100);
  }
}

function addUsersLocMarkers(users) {
  if (!usersLocMap) return;
  usersLocMarkers.forEach(m => m.remove());
  usersLocMarkers = [];

  if (!users.length) return;
  const bounds = new mapboxgl.LngLatBounds();

  users.forEach(u => {
    const el = document.createElement('div');
    el.style.cssText='width:16px;height:16px;border-radius:50%;background:#4F46E5;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;';
    const circleInfo = u.circleName ? `<div class="map-popup-row" style="color:var(--primary);font-weight:600;">Circle: ${u.circleName}</div>` : '';
    const popup = new mapboxgl.Popup({ offset:12, maxWidth:'220px' }).setHTML(`<div class="map-popup"><div class="map-popup-title">${u.name||'User'}</div>${circleInfo}<div class="map-popup-row">${u.email||''}</div><div class="map-popup-row">${u.phoneNumber||''}</div><div class="map-popup-row" style="color:#059669;font-size:11px;margin-top:2px;">${Number(u.latitude).toFixed(5)}, ${Number(u.longitude).toFixed(5)}</div></div>`);
    const m = new mapboxgl.Marker(el).setLngLat([u.longitude,u.latitude]).setPopup(popup).addTo(usersLocMap);
    usersLocMarkers.push(m);
    bounds.extend([u.longitude, u.latitude]);
  });

  if (users.length > 1) {
    usersLocMap.fitBounds(bounds, { padding: 50, maxZoom: 14 });
  } else if (users.length === 1) {
    usersLocMap.flyTo({ center: [users[0].longitude, users[0].latitude], zoom: 13 });
  }
}

/* ─── User Location Single Modal ─────────────────────────────────────────── */
function openUserLocationMap(lat, lng, userName) {
  document.getElementById('map-modal-title').textContent = `Live Location — ${userName}`;
  openModalDirect('map-modal');
  setTimeout(() => {
    if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') return;
    const gl = window.mapboxgl || window.maplibregl;
    if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;
    if (!userMap) {
      userMap = new gl.Map({
        container: 'user-location-map',
        style: getAdminMapStyle(),
        center: [lng, lat],
        zoom: 14
      });
      userMap.addControl(new gl.NavigationControl({ showCompass: false }));
      userMap.on('load', () => {
        if (userMapMarker) userMapMarker.remove();
        userMapMarker = new gl.Marker({ color: '#4F46E5' })
          .setLngLat([lng, lat])
          .setPopup(new gl.Popup().setHTML(`<b>${userName}</b><br/>${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`))
          .addTo(userMap);
        userMap.resize();
      });
    } else {
      userMap.setCenter([lng, lat]);
      userMap.setZoom(14);
      if (userMapMarker) userMapMarker.remove();
      userMapMarker = new gl.Marker({ color: '#4F46E5' })
        .setLngLat([lng, lat])
        .setPopup(new gl.Popup().setHTML(`<b>${userName}</b><br/>${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`))
        .addTo(userMap);
      userMap.resize();
    }
    setTimeout(() => userMap && userMap.resize(), 300);
  }, 200);
}

/* ─── User CRUD ──────────────────────────────────────────────────────────── */
function toggleUserPasswordReveal(userId) {
  const u = allUsers.find(x => x.id === userId);
  const el = document.getElementById('pass-val-' + userId);
  const btn = el?.nextElementSibling;
  if (!u || !el) return;
  if (el.dataset.revealed === 'true') {
    el.textContent = '••••••••'; el.dataset.revealed = 'false';
    if(btn) btn.textContent = 'Reveal';
  } else {
    el.textContent = u.password || 'No Password'; el.title = u.password||''; el.dataset.revealed='true';
    if(btn) btn.textContent = 'Hide';
  }
}

function openEditUserModal(userId) {
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;
  document.getElementById('edit-user-id').value            = u.id;
  document.getElementById('edit-user-name').value          = u.name||'';
  document.getElementById('edit-user-email').value         = u.email||'';
  document.getElementById('edit-user-phone').value         = u.phoneNumber||'';
  document.getElementById('edit-user-email-verified').checked = Boolean(u.emailVerified);
  document.getElementById('edit-user-phone-verified').checked = Boolean(u.phoneVerified);
  document.getElementById('edit-user-is-tracker').checked  = Boolean(u.isTracker);
  openModalDirect('edit-user-modal');
}

async function handleAdminUpdateUser(e) {
  e.preventDefault();
  const userId = document.getElementById('edit-user-id').value;
  const body   = {
    name:          document.getElementById('edit-user-name').value.trim(),
    email:         document.getElementById('edit-user-email').value.trim(),
    phoneNumber:   document.getElementById('edit-user-phone').value.trim(),
    emailVerified: document.getElementById('edit-user-email-verified').checked,
    phoneVerified: document.getElementById('edit-user-phone-verified').checked,
    isTracker:     document.getElementById('edit-user-is-tracker').checked,
  };
  const res = await apiRequest(ENDPOINTS.updateUser.replace('{id}',userId), 'PATCH', body);
  if (res.ok) { toast('User updated', 'success'); closeModalDirect('edit-user-modal'); await loadUsersData(); await loadExecutiveStats(); }
  else toast(res.data?.message||'Failed to update user','error');
}

async function confirmDeleteUser(userId, userName) {
  if (!confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) return;
  const res = await apiRequest(ENDPOINTS.deleteUser.replace('{id}',userId), 'DELETE');
  if (res.ok) { toast(`User deleted`,'success'); await loadUsersData(); await loadExecutiveStats(); }
  else toast(res.data?.message||'Failed to delete user','error');
}

function openResetPasswordModal(userId, userEmail) {
  document.getElementById('reset-user-id').value    = userId;
  document.getElementById('reset-user-email').textContent = userEmail;
  document.getElementById('reset-new-password').value = '';
  openModalDirect('reset-pass-modal');
}

async function handleAdminResetPassword(e) {
  e.preventDefault();
  const userId  = document.getElementById('reset-user-id').value;
  const newPass = document.getElementById('reset-new-password').value;
  if (!newPass || newPass.length < 6) { toast('Password must be at least 6 characters','error'); return; }
  const res = await apiRequest(ENDPOINTS.resetPassword.replace('{id}',userId), 'POST', { newPassword: newPass });
  if (res.ok) { toast('Password updated','success'); closeModalDirect('reset-pass-modal'); await loadUsersData(); }
  else toast(res.data?.message||'Failed to update password','error');
}

async function toggleUserBan(userId, currentIsBanned) {
  const newStatus = !currentIsBanned;
  if (!confirm(`${newStatus?'Ban':'Unban'} this user?`)) return;
  const res = await apiRequest(ENDPOINTS.banUser.replace('{id}',userId), 'PATCH', { isBanned: newStatus });
  if (res.ok) { toast(`User ${newStatus?'banned':'unbanned'}`,'success'); await loadUsersData(); await loadExecutiveStats(); }
  else toast(res.data?.message||'Failed','error');
}

/* ============================================================
   FAMILY CIRCLES & MEMBER LOCATIONS
   ============================================================ */
async function loadCirclesData() {
  const tbody = document.getElementById('circles-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading"><div class="spinner"></div> Loading family circles...</td></tr>';
  const res = await apiRequest(ENDPOINTS.circles);
  if (res.ok && res.data?.data) {
    allCircles = res.data.data;
    renderCirclesTable(allCircles);
  } else {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load family circles</td></tr>';
  }
}

function renderCirclesTable(circles) {
  const tbody = document.getElementById('circles-table-body');
  if (!tbody) return;
  if (!circles?.length) { 
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No family circles created yet</td></tr>'; 
    return; 
  }

  tbody.innerHTML = circles.map((c, i) => {
    const creatorName = c.creator?.name || c.creator?.email || 'System / Direct';
    const creatorPhone = c.creator?.phoneNumber ? `<span style="font-size:11px;color:var(--text-muted);display:block;">${c.creator.phoneNumber}</span>` : '';
    const memberCount = c.members?.length || 0;
    const withLocCount = c.members ? c.members.filter(m => m.latitude != null && m.longitude != null).length : 0;
    const invCode = c.invitationCode || c.inviteCode || c.code || '—';

    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${c.name || 'Family Circle'}</strong></td>
      <td>${creatorName} ${creatorPhone}</td>
      <td><code class="code-badge">${invCode}</code></td>
      <td>
        <span class="badge-online">${memberCount} Members</span>
        ${withLocCount > 0 ? `<span style="font-size:11px;color:#059669;font-weight:600;margin-left:4px;">(${withLocCount} with GPS)</span>` : ''}
      </td>
      <td>${formatDate(c.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn-action view" onclick="openCircleDetailsModal('${c.id}')">View Details & Map</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openCircleDetailsModal(circleId) {
  const circle = allCircles.find(c => String(c.id) === String(circleId));
  if (!circle) {
    toast('Circle not found', 'warning');
    return;
  }

  const modal = document.getElementById('circle-details-modal');
  if (!modal) return;
  openModalDirect('circle-details-modal');

  document.getElementById('circle-modal-title').textContent = circle.name || 'Family Circle';
  const creatorStr = circle.creator?.name ? `Created by ${circle.creator.name} (${circle.creator.email || circle.creator.phoneNumber || ''})` : '';
  document.getElementById('circle-modal-subtitle').textContent = creatorStr || 'Circle members and live location map';

  const invCode = circle.invitationCode || circle.inviteCode || circle.code || '—';
  const badgesEl = document.getElementById('circle-modal-badges');
  if (badgesEl) {
    badgesEl.innerHTML = `
      <div style="background:#F1F5F9;padding:6px 12px;border-radius:6px;font-size:12px;"><strong>Invite Code:</strong> <code style="color:var(--primary);font-weight:700;">${invCode}</code></div>
      <div style="background:#F1F5F9;padding:6px 12px;border-radius:6px;font-size:12px;"><strong>Total Members:</strong> ${circle.members?.length || 0}</div>
      <div style="background:#F1F5F9;padding:6px 12px;border-radius:6px;font-size:12px;"><strong>Created:</strong> ${formatDate(circle.createdAt)}</div>
    `;
  }

  const members = circle.members || [];
  const withLoc = members.filter(m => m.latitude != null && m.longitude != null);
  document.getElementById('circle-loc-count').textContent = `${withLoc.length} of ${members.length} members with live GPS coordinates`;

  const tbody = document.getElementById('circle-members-table-body');
  if (tbody) {
    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No members in this circle yet</td></tr>';
    } else {
      tbody.innerHTML = members.map((m, idx) => {
        const hasLoc = m.latitude != null && m.longitude != null;
        const locStr = hasLoc 
          ? `<span style="color:#059669;font-weight:600;">${Number(m.latitude).toFixed(5)}, ${Number(m.longitude).toFixed(5)}</span>`
          : `<span style="color:var(--text-muted);">No GPS coordinates</span>`;
        return `<tr>
          <td>${idx + 1}</td>
          <td><strong>${m.name || 'User'}</strong></td>
          <td>${m.email || '—'}</td>
          <td>${m.phoneNumber || '—'}</td>
          <td>${locStr}</td>
          <td>${m.updatedAt ? formatDate(m.updatedAt) : '—'}</td>
        </tr>`;
      }).join('');
    }
  }

  setTimeout(() => initCircleMembersMap(withLoc), 200);
}

function initCircleMembersMap(membersWithLoc) {
  if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') return;
  const gl = window.mapboxgl || window.maplibregl;
  if (MAPBOX_TOKEN && gl.accessToken !== undefined) gl.accessToken = MAPBOX_TOKEN;

  let center = [80.7718, 7.8731];
  let zoom = 7;
  if (membersWithLoc.length > 0) {
    center = [membersWithLoc[0].longitude, membersWithLoc[0].latitude];
    zoom = 12;
  }

  if (!circleMembersMap) {
    circleMembersMap = new gl.Map({
      container: 'circle-members-map-canvas',
      style: getAdminMapStyle(),
      center,
      zoom
    });
    circleMembersMap.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
    circleMembersMap.on('load', () => {
      addCircleMemberMarkers(membersWithLoc);
      circleMembersMap.resize();
    });
  } else {
    circleMembersMarkers.forEach(m => m.remove());
    circleMembersMarkers = [];
    addCircleMemberMarkers(membersWithLoc);
    circleMembersMap.resize();
    if (membersWithLoc.length > 0) {
      circleMembersMap.flyTo({ center, zoom: membersWithLoc.length === 1 ? 13 : 11 });
    }
  }
}

function addCircleMemberMarkers(membersWithLoc) {
  if (!circleMembersMap) return;
  circleMembersMarkers.forEach(m => m.remove());
  circleMembersMarkers = [];

  if (!membersWithLoc.length) return;

  const bounds = new mapboxgl.LngLatBounds();
  membersWithLoc.forEach(m => {
    const el = document.createElement('div');
    el.style.cssText = 'width:24px;height:24px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;';
    el.textContent = (m.name || 'U').charAt(0).toUpperCase();

    const popupHtml = `
      <div class="map-popup">
        <div class="map-popup-title" style="font-weight:700;margin-bottom:4px;">${m.name || 'Member'}</div>
        <div class="map-popup-row" style="font-size:11px;color:#64748B;">${m.email || ''}</div>
        <div class="map-popup-row" style="font-size:11px;color:#64748B;">${m.phoneNumber || ''}</div>
        <div class="map-popup-row" style="font-size:11px;color:#059669;margin-top:4px;">${Number(m.latitude).toFixed(5)}, ${Number(m.longitude).toFixed(5)}</div>
      </div>`;
    const popup = new mapboxgl.Popup({ offset: 12, maxWidth: '200px' }).setHTML(popupHtml);
    const marker = new mapboxgl.Marker(el).setLngLat([m.longitude, m.latitude]).setPopup(popup).addTo(circleMembersMap);
    circleMembersMarkers.push(marker);
    bounds.extend([m.longitude, m.latitude]);
  });

  if (membersWithLoc.length > 1) {
    circleMembersMap.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  }
}

function openAllCirclesMap() {
  const allMembersWithLoc = [];
  const seenIds = new Set();

  allCircles.forEach(c => {
    (c.members || []).forEach(m => {
      if (m.latitude != null && m.longitude != null && !seenIds.has(m.id)) {
        seenIds.add(m.id);
        allMembersWithLoc.push({
          ...m,
          circleName: c.name
        });
      }
    });
  });

  if (!allMembersWithLoc.length) {
    toast('No circle members have live GPS coordinates yet', 'warning');
    return;
  }

  openModalDirect('users-loc-modal');
  document.getElementById('users-loc-count').textContent = `${allMembersWithLoc.length} circle members located across Sri Lanka`;
  setTimeout(() => initUsersLocMap(allMembersWithLoc), 200);
}

/* ============================================================
   SUBSCRIPTION PLANS & DYNAMIC PACKAGES CUSTOMIZER
   ============================================================ */
let cachedDbPlans = [];

async function loadPlansData() {
  const container = document.getElementById('plans-cards-grid');
  if (container) {
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading plans...</span></div>';
  }
  const res = await apiRequest(ENDPOINTS.plans);
  const dbPlans = (res.ok && res.data?.data) ? res.data.data : [];
  cachedDbPlans = dbPlans;
  renderPlansGrid(dbPlans);
}

function getFeatureType(val) {
  if (!val) return 'no';
  const str = String(val).toLowerCase();
  if (str === 'yes') return 'yes';
  if (str === 'no') return 'no';
  if (str === 'limited') return 'limited';
  if (str.includes('unlimited')) return 'unlimited';
  return 'text';
}

function renderPlansGrid(dbPlans) {
  const container = document.getElementById('plans-cards-grid');
  if (!container) return;

  container.innerHTML = PLAN_DEFINITIONS.map(def => {
    const matchedDbPlan = dbPlans.find(p => p.name?.toLowerCase() === def.name.toLowerCase());
    const planId = matchedDbPlan ? matchedDbPlan.id : '';
    const meta = matchedDbPlan?.metadata || {};

    const currentPrice = (meta.price !== undefined) ? meta.price : def.defaultPrice;
    const isPopular = (meta.isPopular !== undefined) ? Boolean(meta.isPopular) : Boolean(def.isPopular);
    const badgeText = meta.badgeText || def.badgeText || 'Most popular';
    const btnText = meta.btnText || def.btnText || 'Subscribe';

    // Dynamic resource quotas from DB columns or metadata
    const maxGroups = matchedDbPlan?.maxGroups ?? (def.features ? def.features[0].val : 1);
    const maxTracking = matchedDbPlan?.maxTracking ?? (def.features ? def.features[1].val : 1);
    const maxDevices = matchedDbPlan?.maxDevices ?? (def.features ? def.features[2].val : 1);

    // Dynamic feature statuses from metadata or DB booleans
    const mobileWeb = meta.mobileWeb ?? (def.features ? def.features[3].val : 'Yes');
    const health = meta.health ?? (def.features ? def.features[4].val : 'No');
    const notifications = meta.notifications ?? (def.features ? def.features[5].val : 'Limited');
    const phoneAlert = meta.phoneAlert ?? (matchedDbPlan?.hasPhoneAlert ? 'Yes' : (def.features ? def.features[6].val : 'No'));
    const sms = meta.sms ?? (matchedDbPlan?.hasSms ? 'Yes' : (def.features ? def.features[7].val : 'No'));

    const dynamicFeatures = [
      { label: 'Groups', val: String(maxGroups), type: 'text' },
      { label: 'Tracking', val: String(maxTracking), type: 'text' },
      { label: 'Devices', val: String(maxDevices), type: 'text' },
      { label: 'Mobile web', val: String(mobileWeb), type: String(mobileWeb).toLowerCase() === 'yes' ? 'yes' : 'no' },
      { label: 'Health', val: String(health), type: getFeatureType(health) },
      { label: 'Notifications', val: String(notifications), type: getFeatureType(notifications) },
      { label: 'Phone alert', val: String(phoneAlert), type: String(phoneAlert).toLowerCase() === 'yes' ? 'yes' : 'no' },
      { label: 'SMS', val: String(sms), type: getFeatureType(sms) }
    ];

    const featureRowsHtml = dynamicFeatures.map(f => {
      let valHtml = '';
      if (f.type === 'yes') {
        valHtml = `<span class="feat-val feat-yes">Yes</span>`;
      } else if (f.type === 'no') {
        valHtml = `<span class="feat-val feat-no">No</span>`;
      } else if (f.type === 'limited') {
        valHtml = `<span class="feat-val feat-limited">Limited</span>`;
      } else if (f.type === 'unlimited') {
        valHtml = `<span class="feat-val feat-unlimited">${f.val}</span>`;
      } else {
        valHtml = `<span class="feat-val feat-text">${f.val}</span>`;
      }

      return `
        <div class="pricing-feature-row ${isPopular ? 'popular-row' : ''}">
          <span class="feat-label">${f.label}</span>
          ${valHtml}
        </div>`;
    }).join('');

    return `
      <div class="pricing-card ${isPopular ? 'pricing-card-popular' : ''}" id="pricing-card-${def.name}">
        ${isPopular ? `<div class="popular-pill">${badgeText}</div>` : ''}

        <div class="pricing-card-top">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h3 class="pricing-plan-title" style="margin-bottom:0;">${def.name}</h3>
            ${planId ? `
              <button class="btn-edit-package ${isPopular ? 'btn-edit-popular' : ''}" style="width:auto;padding:4px 10px;font-size:11.5px;margin:0;" onclick="openEditPlanModal('${planId}')" title="Customize this package">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
              </button>
            ` : ''}
          </div>
          <div class="pricing-price-wrap">
            <span class="currency-label">Rs</span>
            <span class="price-amount" id="price-display-${def.name}">${currentPrice}</span>
            <span class="period-label">/mo</span>
          </div>
        </div>

        <div class="pricing-features-list">
          ${featureRowsHtml}
        </div>

        <div class="pricing-card-btn-wrap" style="margin-bottom:12px;">
          <button class="pricing-action-btn ${isPopular ? 'popular-btn' : ''}">
            ${btnText}
          </button>
          ${planId ? `
            <button class="btn-edit-package ${isPopular ? 'btn-edit-popular' : ''}" onclick="openEditPlanModal('${planId}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Customize Package & Limits
            </button>
          ` : ''}
        </div>

        ${planId ? `
          <div class="pricing-admin-editor ${isPopular ? 'popular-editor' : ''}">
            <span class="admin-edit-title">Quick Price (LKR):</span>
            <div class="admin-edit-row">
              <input type="number" id="plan-input-${planId}" value="${currentPrice}" class="plan-price-input" />
              <button class="btn-save-price" onclick="savePlanPrice('${planId}', '${def.name}')">Save</button>
            </div>
          </div>
        ` : ''}
      </div>`;
  }).join('');
}

function openEditPlanModal(planId) {
  const plan = cachedDbPlans.find(p => p.id === planId);
  if (!plan) {
    toast('Plan details not found. Please refresh plans.', 'error');
    return;
  }

  const def = PLAN_DEFINITIONS.find(d => d.name?.toLowerCase() === plan.name?.toLowerCase()) || {};
  const meta = plan.metadata || {};

  const idEl = document.getElementById('edit-plan-id');
  const nameEl = document.getElementById('edit-plan-name');
  const titleNameEl = document.getElementById('edit-plan-title-name');

  if (idEl) idEl.value = plan.id;
  if (nameEl) nameEl.value = plan.name;
  if (titleNameEl) titleNameEl.textContent = plan.name;

  const currentPrice = (meta.price !== undefined) ? meta.price : (def.defaultPrice ?? 0);
  const priceInput = document.getElementById('edit-plan-price');
  if (priceInput) priceInput.value = currentPrice;

  const btnTextInput = document.getElementById('edit-plan-btn-text');
  if (btnTextInput) btnTextInput.value = meta.btnText || def.btnText || 'Subscribe';

  const isPopular = (meta.isPopular !== undefined) ? Boolean(meta.isPopular) : Boolean(def.isPopular);
  const isPopCheck = document.getElementById('edit-plan-is-popular');
  if (isPopCheck) isPopCheck.checked = isPopular;

  const badgeText = meta.badgeText || def.badgeText || 'Most popular';
  const badgeTextInput = document.getElementById('edit-plan-badge-text');
  if (badgeTextInput) badgeTextInput.value = badgeText;
  const badgeGroup = document.getElementById('edit-plan-badge-group');
  if (badgeGroup) badgeGroup.style.display = isPopular ? 'block' : 'none';

  // Resource limits
  const maxGroupsInput = document.getElementById('edit-plan-max-groups');
  const maxTrackingInput = document.getElementById('edit-plan-max-tracking');
  const maxDevicesInput = document.getElementById('edit-plan-max-devices');

  if (maxGroupsInput) maxGroupsInput.value = plan.maxGroups ?? (def.features ? def.features[0].val : 1);
  if (maxTrackingInput) maxTrackingInput.value = plan.maxTracking ?? (def.features ? def.features[1].val : 1);
  if (maxDevicesInput) maxDevicesInput.value = plan.maxDevices ?? (def.features ? def.features[2].val : 1);

  // Features
  const mobileWebSel = document.getElementById('edit-plan-mobile-web');
  const healthSel = document.getElementById('edit-plan-health');
  const notifSel = document.getElementById('edit-plan-notifications');
  const phoneAlertSel = document.getElementById('edit-plan-phone-alert');
  const smsSel = document.getElementById('edit-plan-sms');

  if (mobileWebSel) mobileWebSel.value = meta.mobileWeb || (def.features ? def.features[3].val : 'Yes');
  if (healthSel) healthSel.value = meta.health || (def.features ? def.features[4].val : 'No');
  if (notifSel) notifSel.value = meta.notifications || (def.features ? def.features[5].val : 'Limited');
  if (phoneAlertSel) phoneAlertSel.value = meta.phoneAlert || (plan.hasPhoneAlert ? 'Yes' : (def.features ? def.features[6].val : 'No'));
  if (smsSel) smsSel.value = meta.sms || (plan.hasSms ? 'Yes' : (def.features ? def.features[7].val : 'No'));

  openModalDirect('edit-plan-modal');
}

async function handleSavePlanDetails(e) {
  if (e) e.preventDefault();
  const planId = document.getElementById('edit-plan-id')?.value;
  const planName = document.getElementById('edit-plan-name')?.value;
  if (!planId) return;

  const saveBtn = document.getElementById('btn-save-plan');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px;"></span> Saving...';
  }

  const price = parseFloat(document.getElementById('edit-plan-price')?.value || 0);
  const btnText = document.getElementById('edit-plan-btn-text')?.value?.trim() || 'Subscribe';
  const isPopular = document.getElementById('edit-plan-is-popular')?.checked || false;
  const badgeText = document.getElementById('edit-plan-badge-text')?.value?.trim() || 'Most popular';

  const maxGroups = parseInt(document.getElementById('edit-plan-max-groups')?.value || 1, 10);
  const maxTracking = parseInt(document.getElementById('edit-plan-max-tracking')?.value || 1, 10);
  const maxDevices = parseInt(document.getElementById('edit-plan-max-devices')?.value || 1, 10);

  const mobileWeb = document.getElementById('edit-plan-mobile-web')?.value || 'Yes';
  const health = document.getElementById('edit-plan-health')?.value || 'No';
  const notifications = document.getElementById('edit-plan-notifications')?.value || 'Limited';
  const phoneAlert = document.getElementById('edit-plan-phone-alert')?.value || 'No';
  const sms = document.getElementById('edit-plan-sms')?.value || 'No';

  const payload = {
    price,
    maxGroups,
    maxTracking,
    maxDevices,
    hasSms: (sms === 'Yes' || sms === 'Unlimited' || sms === 'Limited'),
    hasPhoneAlert: (phoneAlert === 'Yes'),
    mobileWeb,
    health,
    notifications,
    phoneAlert,
    sms,
    btnText,
    badgeText,
    isPopular,
    metadata: {
      price,
      maxGroups,
      maxTracking,
      maxDevices,
      mobileWeb,
      health,
      notifications,
      phoneAlert,
      sms,
      btnText,
      badgeText,
      isPopular
    }
  };

  const res = await apiRequest(ENDPOINTS.updatePlan.replace('{id}', planId), 'PATCH', payload);

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>💾</span> Save Package Changes';
  }

  if (res.ok) {
    playSound('success');
    toast(`🎉 ${planName} Package updated successfully!`, 'success');
    closeModalDirect('edit-plan-modal');
    await loadPlansData();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update plan package', 'error');
  }
}

async function savePlanPrice(planId, planName) {
  const input = document.getElementById('plan-input-' + planId);
  const price = parseFloat(input?.value || 0);
  const res = await apiRequest(ENDPOINTS.updatePlan.replace('{id}', planId), 'PATCH', { price });
  if (res.ok) {
    playSound('success');
    toast(`${planName} Plan price updated to Rs. ${price.toLocaleString()}/mo`, 'success');
    const display = document.getElementById('price-display-' + planName);
    if (display) display.textContent = price;
    await loadPlansData();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update plan price', 'error');
  }
}

/* ============================================================
   REVENUE
   ============================================================ */
async function loadRevenueData() {
  const tbody = document.getElementById('revenue-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading"><div class="spinner"></div> Loading...</td></tr>';
  const res = await apiRequest(ENDPOINTS.subscriptions);
  if (res.ok && res.data?.data) {
    const d = res.data.data;
    const set=(id,v)=>{const el=document.getElementById(id);if(el) el.textContent=v;};
    set('rev-total-subs',   d.totalSubscriptions||0);
    set('rev-total-amount', `LKR ${(d.totalRevenue||0).toLocaleString()}`);
    renderRevenueTable(d.subscriptions||[]);
  } else tbody.innerHTML='<tr><td colspan="6" class="empty-state">Failed to load revenue</td></tr>';
}

function renderRevenueTable(subs) {
  const tbody = document.getElementById('revenue-table-body');
  if (!subs?.length) { tbody.innerHTML='<tr><td colspan="6" class="empty-state">No paid subscriptions</td></tr>'; return; }
  tbody.innerHTML = subs.map((s,i) => `<tr>
    <td>${i+1}</td>
    <td><strong>${s.user?.name||'Subscriber'}</strong></td>
    <td>${s.user?.email||'—'}</td>
    <td><span class="badge-online">${s.plan?.name||'Plan'} Plan</span></td>
    <td><strong style="color:#059669">LKR ${(s.plan?.metadata?.price||0).toLocaleString()}</strong></td>
    <td>${formatDate(s.createdAt)}</td>
  </tr>`).join('');
}

/* ============================================================
   REFERRALS
   ============================================================ */
async function loadReferralsData() {
  const tbody = document.getElementById('referrals-table-body');
  tbody.innerHTML = '<tr><td colspan="5" class="table-loading"><div class="spinner"></div> Loading...</td></tr>';
  const res = await apiRequest(ENDPOINTS.referrals);
  if (res.ok && res.data?.data) renderReferralsTable(res.data.data);
  else tbody.innerHTML='<tr><td colspan="5" class="empty-state">Failed to load referrals</td></tr>';
}

function renderReferralsTable(referrals) {
  const tbody = document.getElementById('referrals-table-body');
  if (!referrals?.length) { tbody.innerHTML='<tr><td colspan="5" class="empty-state">No referral codes yet</td></tr>'; return; }
  tbody.innerHTML = referrals.map((r,i) => `<tr>
    <td>${i+1}</td>
    <td><strong>${r.name||'User'}</strong></td>
    <td>${r.email||'—'}</td>
    <td><code class="code-badge code-green">${r.referralCode}</code></td>
    <td>${formatDate(r.createdAt)}</td>
  </tr>`).join('');
}

/* ============================================================
   ADMIN MANAGEMENT
   ============================================================ */
async function loadAdminsData() {
  const container = document.getElementById('admins-list');
  if (container) container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading admin accounts...</span></div>';
  const res = await apiRequest(ENDPOINTS.admins);
  if (res.ok && res.data?.data) {
    allAdmins = res.data.data;
    renderAdminsList(allAdmins);
  } else {
    if (container) container.innerHTML = '<div class="empty-state">Failed to load admins — please verify admin privileges</div>';
  }
}

function renderAdminsList(admins) {
  const container = document.getElementById('admins-list');
  if (!container) return;
  if (!admins?.length) {
    container.innerHTML = `<div class="empty-card-state"><div class="empty-card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3 class="empty-card-title">No Admin Accounts</h3><p class="empty-card-text">Add admin accounts below to grant dashboard access.</p></div>`;
    return;
  }
  container.innerHTML = admins.map(a => `
    <div class="admin-card">
      <div class="admin-card-left">
        <div class="admin-avatar">${(a.name||a.email||'A').charAt(0).toUpperCase()}</div>
        <div>
          <div class="admin-name">${a.name||'Admin'}</div>
          <div class="admin-email">${a.email}</div>
          <div class="admin-date">Added ${formatDate(a.createdAt)}</div>
        </div>
      </div>
      <div class="admin-card-actions">
        <span class="badge-verified-green">Active Admin</span>
        ${a.email!=='admin@servefamily.com'?`<button class="btn-danger-sm" onclick="deleteAdminAccount('${a.id}','${a.email}')">Remove</button>`:'<span style="font-size:11px;color:var(--text-muted)">Primary</span>'}
      </div>
    </div>`).join('');
}

async function handleCreateAdmin(e) {
  e.preventDefault();
  const name       = document.getElementById('new-admin-name').value.trim();
  const email      = document.getElementById('new-admin-email').value.trim();
  const password   = document.getElementById('new-admin-pass').value;
  const phone      = document.getElementById('new-admin-phone').value.trim();
  if (!name||!email||!password) { toast('Name, email and password are required','error'); return; }
  const res = await apiRequest(ENDPOINTS.admins, 'POST', { name, email, password, phoneNumber: phone });
  if (res.ok) { toast('Admin account created','success'); e.target.reset(); await loadAdminsData(); }
  else toast(res.data?.message||'Failed to create admin','error');
}

async function deleteAdminAccount(id, email) {
  if (!confirm(`Remove admin access for ${email}?`)) return;
  const res = await apiRequest(ENDPOINTS.deleteAdmin.replace('{id}',id), 'DELETE');
  if (res.ok) { toast('Admin removed','success'); await loadAdminsData(); }
  else toast(res.data?.message||'Failed to remove admin','error');
}

/* ============================================================
   DOCUMENT REVIEW MODAL
   ============================================================ */
function openDocModal(idx) {
  let r;
  if (typeof idx === 'number') {
    r = allRegistrations[idx];
  }
  if (!r) {
    r = allRegistrations.find(x => String(x.id) === String(idx)) || allTaxis.find(x => String(x.id) === String(idx));
  }
  if (!r && typeof idx === 'number') {
    r = allTaxis[idx];
  }
  if (!r) return;
  currentDriverData = { idx, data: r };
  document.getElementById('modal-driver-name').textContent = getDriverName(r);
  document.getElementById('modal-status-wrap').innerHTML   = `<span class="approval-status-badge badge-${getStatus(r)}">${getStatus(r)}</span>`;
  document.getElementById('m-info-grid').innerHTML    = buildInfoGrid([['Driver Name',getDriverName(r)],['Email',getEmail(r)],['Phone',getPhone(r)],['Phone Visibility',r.showMobileNum!==false?'Public':'Hidden'],['User ID',r.userId||'—'],['Registered',formatDate(r.createdAt)]]);
  document.getElementById('m-vehicle-grid').innerHTML = buildInfoGrid([['Reg Number',getVehiclePlate(r)||'—'],['Vehicle Type',r.vehicleType?.type||'—'],['Color',r.color||'—'],['Online Status',isTaxiDriverOnline(r)?'Active':'Offline'],['Base Address',r.baseAddress||'—'],['Pickup Fare',r.pickupFare!==undefined?`Rs. ${r.pickupFare}`:'Rs. 0'],['Base Fare',r.baseFare?`Rs. ${r.baseFare}`:'—'],['Rate/KM',r.ratePerKm?`Rs. ${r.ratePerKm}/km`:'—']]);
  renderDocuments(r);
  document.getElementById('m-raw-json').textContent = JSON.stringify(r, null, 2);
  document.getElementById('reject-note').value = '';
  populateViewModalEditForm(r);
  switchModalTab('info');
  const docModal = document.getElementById('doc-modal');
  if (docModal) {
    docModal.classList.remove('hidden');
    docModal.style.display = 'flex';
  }
}

function buildInfoGrid(fields) {
  return fields.map(([l,v]) => `<div class="info-item"><span class="info-label">${l}</span><span class="info-value">${v||'—'}</span></div>`).join('');
}

function cleanDocUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  try {
    url = decodeURIComponent(url);
  } catch(e) {}
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('amazonaws.com') || url.startsWith('servefamily.s3')) {
      url = 'https://' + url.replace(/^\/+/, '');
    } else {
      url = API_BASE_URL + (url.startsWith('/') ? '' : '/') + url;
    }
  }
  return url;
}

function renderDocuments(r) {
  const container = document.getElementById('m-docs-list');
  const docs = [];
  r.driver?.documents?.forEach(d => {
    if (d.frontUrl) docs.push({ name: `${d.documentType||'Doc'} (Front)`, url: cleanDocUrl(d.frontUrl) });
    if (d.backUrl)  docs.push({ name: `${d.documentType||'Doc'} (Back)`,  url: cleanDocUrl(d.backUrl) });
  });
  if (r.images?.imageFrontUrl) docs.push({ name: 'Vehicle Front',    url: cleanDocUrl(r.images.imageFrontUrl) });
  if (r.images?.imageBackUrl)  docs.push({ name: 'Vehicle Back',     url: cleanDocUrl(r.images.imageBackUrl) });
  if (r.images?.imageInUrl)    docs.push({ name: 'Vehicle Interior', url: cleanDocUrl(r.images.imageInUrl) });
  if (!docs.length) {
    container.innerHTML = '<div class="empty-state">No document images uploaded</div>';
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;width:100%;">
      ${docs.map(d => `
        <div class="doc-card" style="background:#FFF;border:1px solid var(--border-color);border-radius:12px;overflow:hidden;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;">
          <div style="height:140px;background:#F8FAFC;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
            <img src="${d.url}" alt="${d.name}" style="max-height:100%;max-width:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
            <div style="display:none;flex-direction:column;align-items:center;gap:6px;padding:12px;text-align:center;color:var(--text-muted);font-size:11px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Image Preview</span>
            </div>
          </div>
          <div style="padding:12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-color);gap:8px;">
            <span style="font-size:12.5px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.name}</span>
            <a href="${d.url}" target="_blank" class="btn-action view" style="padding:4px 10px;font-size:11px;text-decoration:none;">Open ↗</a>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function switchModalTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('mtab-'+tab)?.classList.add('active');
  document.getElementById('mContent-'+tab)?.classList.add('active');
  if (tab === 'edit' && currentDriverData?.data) {
    populateViewModalEditForm(currentDriverData.data);
  }
}

async function populateViewModalEditForm(r) {
  if (!r) return;
  if (!Array.isArray(allVehicleTypes) || !allVehicleTypes.length) {
    const res = await apiRequest('/api/admin/taxi/vehicle-types');
    if (res.ok && Array.isArray(res.data?.data)) {
      allVehicleTypes = res.data.data;
    } else if (res.ok && Array.isArray(res.data)) {
      allVehicleTypes = res.data;
    }
  }

  const vtypeSelect = document.getElementById('vmod-edit-vtype');
  if (vtypeSelect) {
    vtypeSelect.innerHTML = (allVehicleTypes || []).map(vt => 
      `<option value="${vt.id}" ${String(vt.id) === String(r.vehicleTypeId) ? 'selected' : ''}>${vt.type} (${vt.category === 'transport' ? 'Goods Transport' : 'Passenger Hire'})</option>`
    ).join('');
  }

  const docs = r.driver?.documents || r.documents || [];
  const nicDoc = docs.find(d => d.documentType === 'NIC') || {};
  const licDoc = docs.find(d => d.documentType === 'DrivingLicense') || {};

  const cleanName = r.driver?.name || getDriverName(r);
  const cleanMobile = r.mobileNum || r.driver?.phoneNumber || '';
  const cleanEmail = r.driver?.email || (getEmail(r) === '—' ? '' : getEmail(r));

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  setVal('vmod-edit-vehicle-id', r.id);
  setVal('vmod-edit-name', cleanName !== 'Unknown Driver' ? cleanName : '');
  setVal('vmod-edit-mobile', cleanMobile !== '—' ? cleanMobile : '');
  setVal('vmod-edit-email', cleanEmail);
  setVal('vmod-edit-plate', r.vehicleRegNum || '');
  setVal('vmod-edit-color', r.color || '');
  setVal('vmod-edit-base-address', r.baseAddress || '');

  setVal('vmod-edit-nic-no', nicDoc.documentNumber || '');
  setVal('vmod-edit-nic-front', nicDoc.frontUrl || '');
  setVal('vmod-edit-nic-back', nicDoc.backUrl || '');

  setVal('vmod-edit-license-no', licDoc.documentNumber || '');
  setVal('vmod-edit-license-front', licDoc.frontUrl || '');
  setVal('vmod-edit-license-back', licDoc.backUrl || '');
}

async function handleSaveEditDriverFromViewModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const vehicleId = getVal('vmod-edit-vehicle-id');
  if (!vehicleId) return;

  const driverName = getVal('vmod-edit-name');
  const mobileNum = getVal('vmod-edit-mobile');
  const email = getVal('vmod-edit-email');
  const vehicleRegNum = getVal('vmod-edit-plate');
  const color = getVal('vmod-edit-color');
  const vehicleTypeId = getVal('vmod-edit-vtype');
  const baseAddress = getVal('vmod-edit-base-address');

  const nicNumber = getVal('vmod-edit-nic-no');
  const nicFrontUrl = getVal('vmod-edit-nic-front');
  const nicBackUrl = getVal('vmod-edit-nic-back');

  const licenseNumber = getVal('vmod-edit-license-no');
  const licenseFrontUrl = getVal('vmod-edit-license-front');
  const licenseBackUrl = getVal('vmod-edit-license-back');

  const btn = document.getElementById('btn-vmod-save-edit');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving Changes...';
  }

  const res = await apiRequest(`/api/admin/taxi/vehicles/${vehicleId}`, 'PATCH', {
    driverName,
    mobileNum,
    email,
    vehicleRegNum,
    color,
    vehicleTypeId,
    baseAddress,
    nicNumber,
    nicFrontUrl,
    nicBackUrl,
    licenseNumber,
    licenseFrontUrl,
    licenseBackUrl
  });

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Save & Update Driver';
  }

  if (res.ok) {
    playSound('success');
    toast('Driver details & verification documents updated successfully', 'success');
    closeDocModal();
    await fetchRegistrations();
    if (typeof renderApprovalCards === 'function') renderApprovalCards();
    if (typeof renderTable === 'function') renderTable();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update driver details', 'error');
  }
}

function closeModal(e) { if (e.target===document.getElementById('doc-modal')) closeDocModal(); }
function closeDocModal() { 
  const el = document.getElementById('doc-modal');
  if (el) {
    el.classList.add('hidden');
    el.style.display = 'none';
  }
  currentDriverData = null; 
}
function openModalDirect(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('open');
  el.style.setProperty('display', 'flex', 'important');
  el.style.setProperty('visibility', 'visible', 'important');
  el.style.setProperty('opacity', '1', 'important');
}

function closeModalDirect(id) { 
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.classList.add('hidden');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
    el.style.removeProperty('z-index');
  }
}
window.openModalDirect = openModalDirect;
window.closeModalDirect = closeModalDirect;

// Global Escape Key Dismissal for Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDocModal();
    if (typeof closeTripDetailsModal === 'function') closeTripDetailsModal();
    document.querySelectorAll('.modal-overlay').forEach(m => {
      if (!m.classList.contains('hidden') || m.style.display === 'flex') {
        closeModalDirect(m.id);
      }
    });
  }
});

/* ─── Approval Actions ───────────────────────────────────────────────────── */
async function approveDriver() { if (!currentDriverData) return; await performApproval(currentDriverData.data?.id || currentDriverData.idx,'approve'); closeDocModal(); }
async function rejectDriver()  { if (!currentDriverData) return; const note=document.getElementById('reject-note').value.trim(); await performApproval(currentDriverData.data?.id || currentDriverData.idx,'reject',note); closeDocModal(); }
async function quickApprove(target) { await performApproval(target,'approve'); }
async function quickReject(target)  { const reason=prompt('Rejection reason (optional):')||''; await performApproval(target,'reject',reason); }

async function performApproval(target, action, note='') {
  let r = typeof target === 'number' ? allRegistrations[target] : null;
  if (!r) {
    r = allRegistrations.find(x => String(x.id) === String(target)) || allTaxis.find(x => String(x.id) === String(target));
  }
  if (!r && typeof target === 'number') {
    r = allTaxis[target];
  }
  if (!r) return;
  const path = (action==='approve'?ENDPOINTS.approve:ENDPOINTS.reject).replace('{id}',r.id);
  const res  = await apiRequest(path, 'PATCH', { reason: note });
  if (res.ok) {
    toast(`Vehicle ${action==='approve'?'approved':'rejected'}`,'success');
    await fetchRegistrations();
    allTaxis = [...allRegistrations];
    await loadExecutiveStats();
  } else {
    toast(`Failed: ${res.data?.message||'Server error'}`,'error');
  }
  renderApprovalCards();
  renderTable();
}

/* ─── Export CSV ─────────────────────────────────────────────────────────── */
function exportData() {
  if (!allRegistrations.length) { toast('No data to export','warning'); return; }
  const headers = ['Driver','Email','Phone','Plate','Status','Registered'];
  const rows    = allRegistrations.map(r => [getDriverName(r),getEmail(r),getPhone(r),getVehiclePlate(r),getStatus(r),formatDate(r.createdAt)]);
  const csv     = [headers,...rows].map(row => row.map(v=>`"${(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a       = document.createElement('a');
  a.href        = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download    = 'servefamily-taxis.csv'; a.click();
  toast('Exported CSV','success');
}

/* ─── Sidebar Toggle ─────────────────────────────────────────────────────── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mc = document.querySelector('.main-content');
  if (window.innerWidth <= 900) {
    if (!sb) return;
    sb.classList.toggle('open');
    let bd = document.getElementById('sidebar-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'sidebar-backdrop';
      bd.className = 'sidebar-backdrop';
      bd.onclick = () => {
        sb.classList.remove('open');
        bd.classList.remove('active');
      };
      document.body.appendChild(bd);
    }
    bd.classList.toggle('active', sb.classList.contains('open'));
  } else {
    if (sb) sb.classList.toggle('collapsed');
    if (mc) mc.classList.toggle('collapsed');
  }
}
window.toggleSidebar = toggleSidebar;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getDriverName(r) { return r?.driver?.name || r?.driverName || r?.name || 'Unknown Driver'; }
function getEmail(r)      { return r?.driver?.email || r?.email || '—'; }
function getPhone(r)      { return r?.mobileNum || r?.driver?.phoneNumber || '—'; }
function getVehiclePlate(r){ return r?.vehicleRegNum || '—'; }
function getVehicleDisplay(r){
  const typeStr = r?.vehicleType?.type || r?.vehicleType?.category || (typeof r?.vehicleType === 'string' ? r.vehicleType : '');
  return [r?.color, typeStr].filter(Boolean).join(' ') || '—';
}
function getStatus(r)     { return (r?.approvalStatus||'pending').toLowerCase(); }
function isPending(r)     { return getStatus(r)==='pending'; }
function isApproved(r)    { return getStatus(r)==='approved'; }
function isRejected(r)    { return getStatus(r)==='rejected'; }

/**
 * Multi-field vehicle search matcher with plate normalization (spaces/dashes/province codes),
 * phone number search, vehicle type/category, color, mother location address, and driver name.
 */
function matchVehicleSearch(r, rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return true;
  if (!r) return false;

  const query = rawQuery.trim().toLowerCase();
  const cleanQ = query.replace(/[^a-zA-Z0-9]/g, '');

  // 1. Driver Name
  const driverName = (r.driver?.name || r.driverName || r.name || '').toLowerCase();
  if (driverName.includes(query)) return true;

  // 2. Email
  const email = (r.driver?.email || r.email || '').toLowerCase();
  if (email.includes(query)) return true;

  // 3. Phone numbers (Both mobileNum and driver.phoneNumber)
  const phone1 = (r.mobileNum || '').replace(/\s+/g, '');
  const phone2 = (r.driver?.phoneNumber || '').replace(/\s+/g, '');
  if (phone1.toLowerCase().includes(query) || phone2.toLowerCase().includes(query)) return true;
  if (cleanQ.length >= 3) {
    const cleanP1 = phone1.replace(/\D/g, '');
    const cleanP2 = phone2.replace(/\D/g, '');
    const cleanDigits = query.replace(/\D/g, '');
    if (cleanDigits && (cleanP1.includes(cleanDigits) || cleanP2.includes(cleanDigits))) return true;
  }

  // 4. Vehicle Registration Plate (e.g. "WP CAB-1234", "CAB-1234", "64-1234")
  const plate = (r.vehicleRegNum || '').toLowerCase();
  if (plate.includes(query)) return true;

  if (cleanQ.length >= 2) {
    const cleanPlate = plate.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanPlate.includes(cleanQ)) return true;

    // Sri Lanka province prefix stripping (WP, CP, SP, NW, NC, EP, NP, SG, UV)
    const provinceStrippedPlate = cleanPlate.replace(/^(wp|cp|sp|nw|nc|ep|np|sg|uv)/i, '');
    if (provinceStrippedPlate && provinceStrippedPlate.includes(cleanQ)) return true;
    const provinceStrippedQuery = cleanQ.replace(/^(wp|cp|sp|nw|nc|ep|np|sg|uv)/i, '');
    if (provinceStrippedQuery && cleanPlate.includes(provinceStrippedQuery)) return true;
  }

  // 5. Vehicle Type & Category (e.g. Tuk Tuk, Car, Van, Bike, Three Wheel)
  const vType = (r.vehicleType?.type || (typeof r.vehicleType === 'string' ? r.vehicleType : '')).toLowerCase();
  const vCat  = (r.vehicleType?.category || '').toLowerCase();
  if (vType.includes(query) || vCat.includes(query)) return true;
  if (query === 'tuk' || query === 'tuktuk' || query === 'three wheeler' || query === 'three wheel') {
    if (vType.includes('tuk') || vType.includes('three') || vCat.includes('tuk')) return true;
  }

  // 6. Base / Stand Address / Mother Location (e.g. Colombo, Kandy, Galle)
  const addr = (r.baseAddress || '').toLowerCase();
  if (addr.includes(query)) return true;

  // 7. Color
  const color = (r.color || '').toLowerCase();
  if (color && color.includes(query)) return true;

  // 8. SinoTrack GPS Tracker Device UID
  const tracker = (r.trackerUid || '').toLowerCase();
  if (tracker && tracker.includes(query)) return true;

  // 9. Assigned Regional Agent
  const agentName = (r.agent?.name || r.agent?.locationName || r.agent?.district || '').toLowerCase();
  if (agentName && agentName.includes(query)) return true;

  // 10. Status / Approved By
  const status = (r.approvalStatus || '').toLowerCase();
  if (status && status === query) return true;
  const approvedBy = (r.approvedBy || '').toLowerCase();
  if (approvedBy && approvedBy.includes(query)) return true;

  return false;
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  catch { return d; }
}

/* ─── Vehicle Types Management ───────────────────────────────────────────────── */
async function loadVehicleTypesTab() {
  const res = await apiRequest('/api/admin/taxi/vehicle-types');
  if (res.ok && Array.isArray(res.data?.data)) {
    allVehicleTypes = res.data.data;
  } else {
    allVehicleTypes = [];
  }
  renderVehicleTypesTable();
}

function renderVehicleTypesTable() {
  const tbody = document.getElementById('vehicle-types-table-body');
  if (!tbody) return;

  if (!allVehicleTypes.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No vehicle types configured yet.</td></tr>';
    return;
  }

  tbody.innerHTML = allVehicleTypes.map((vt, i) => {
    const isHire = vt.category === 'hire';
    const catBadge = isHire
      ? `<span class="approval-status-badge badge-approved" style="background:#ECFDF5;color:#047857;">Hire (Passenger)</span>`
      : `<span class="approval-status-badge badge-approved" style="background:#EFF6FF;color:#1D4ED8;">Transport (Goods)</span>`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${vt.type}</strong></td>
        <td>${catBadge}</td>
        <td>LKR ${vt.baseFare || 0}</td>
        <td>LKR ${vt.ratePerKm || 0} / KM</td>
        <td>${vt.seats || 1} Seats</td>
        <td>
          <div class="action-group">
            <button class="btn-action view" onclick="openEditVehicleTypeModal('${vt.id}')">Edit</button>
            <button class="btn-action reject" onclick="deleteVehicleType('${vt.id}', '${vt.type}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddVehicleTypeModal() {
  document.getElementById('vtype-modal-title').textContent = 'Add Vehicle Type';
  document.getElementById('vtype-id').value = '';
  document.getElementById('vtype-name').value = '';
  document.getElementById('vtype-category').value = 'hire';
  document.getElementById('vtype-basefare').value = '100';
  document.getElementById('vtype-rateperkm').value = '50';
  document.getElementById('vtype-seats').value = '4';
  openModalDirect('modal-vehicle-type');
}

function openEditVehicleTypeModal(id) {
  const vt = allVehicleTypes.find(item => item.id === id);
  if (!vt) return;

  document.getElementById('vtype-modal-title').textContent = 'Edit Vehicle Type';
  document.getElementById('vtype-id').value = vt.id;
  document.getElementById('vtype-name').value = vt.type;
  document.getElementById('vtype-category').value = vt.category || 'hire';
  document.getElementById('vtype-basefare').value = vt.baseFare || 100;
  document.getElementById('vtype-rateperkm').value = vt.ratePerKm || 50;
  document.getElementById('vtype-seats').value = vt.seats || 4;
  openModalDirect('modal-vehicle-type');
}

function closeVehicleTypeModal() {
  closeModalDirect('modal-vehicle-type');
}

async function handleSaveVehicleType(e) {
  e.preventDefault();
  const id = document.getElementById('vtype-id').value;
  const type = document.getElementById('vtype-name').value.trim();
  const category = document.getElementById('vtype-category').value;
  const baseFare = Number(document.getElementById('vtype-basefare').value);
  const ratePerKm = Number(document.getElementById('vtype-rateperkm').value);
  const seats = Number(document.getElementById('vtype-seats').value);

  const btn = document.getElementById('btn-save-vtype');
  btn.disabled = true;

  let res;
  if (id) {
    res = await apiRequest(`/api/admin/taxi/vehicle-types/${id}`, 'PATCH', { type, category, baseFare, ratePerKm, seats });
  } else {
    res = await apiRequest('/api/admin/taxi/vehicle-types', 'POST', { type, category, baseFare, ratePerKm, seats });
  }

  btn.disabled = false;

  if (res.ok) {
    toast(id ? 'Vehicle type updated' : 'Vehicle type created', 'success');
    closeVehicleTypeModal();
    loadVehicleTypesTab();
  } else {
    toast(res.data?.message || 'Failed to save vehicle type', 'error');
  }
}

async function deleteVehicleType(id, typeName) {
  if (!confirm(`Are you sure you want to delete vehicle type "${typeName}"?`)) return;

  const res = await apiRequest(`/api/admin/taxi/vehicle-types/${id}`, 'DELETE');
  if (res.ok) {
    toast(`Vehicle type "${typeName}" deleted`, 'success');
    loadVehicleTypesTab();
  } else {
    toast(res.data?.message || 'Failed to delete vehicle type', 'error');
  }
}

function toast(message, type='info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {
    success:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
    info:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
  t.innerHTML = `${icons[type]||icons.info} <span>${message}</span>`;
  container.appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),200); }, 3500);
}

/* ============================================================
   TRIPS & BOOKINGS (ADVANCED REAL-TIME & FULL FLEET MANAGEMENT)
   ============================================================ */
let allBookingsList = [];
let currentTripModalBookingId = null;
let reassignTargetBookingId = null;
let changeStatusTargetBookingId = null;
let editFareTargetBookingId = null;
let tripsSearchDebounceTimer = null;
let tripsAutoSyncInterval = null;
let tripsAutoSyncEnabled = true;
let adminSocket = null;
let availableFleetDrivers = [];

// Real-time admin socket connection
function initAdminSocket() {
  if (adminSocket && adminSocket.connected) return;
  if (typeof io === 'undefined') {
    console.warn('Socket.io client library not loaded');
    return;
  }
  try {
    adminSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000
    });

    adminSocket.on('connect', () => {
      console.log('Admin real-time socket connected:', adminSocket.id);
      adminSocket.emit('join_admin');
      updateAutoSyncUI(true);
    });

    adminSocket.on('disconnect', () => {
      console.log('Admin real-time socket disconnected');
      updateAutoSyncUI(false);
    });

    // Real-time ride request dropped
    adminSocket.on('new_ride_request', (data) => {
      console.log('Real-time: new_ride_request', data);
      handleIncomingRealtimeBooking(data, 'New Ride Request Incoming!');
    });

    // Real-time driver accepted booking
    adminSocket.on('ride_accepted', (data) => {
      console.log('Real-time: ride_accepted', data);
      handleBookingStatusUpdate(data, 'Driver Accepted Booking');
    });

    // Real-time trip status updated (arrived, in_transit, etc.)
    adminSocket.on('ride_status_updated', (data) => {
      console.log('Real-time: ride_status_updated', data);
      handleBookingStatusUpdate(data);
    });

    // Real-time trip cancelled
    adminSocket.on('ride_cancelled', (data) => {
      console.log('Real-time: ride_cancelled', data);
      handleBookingStatusUpdate(data, 'Trip Cancelled');
    });

    // Real-time trip completed
    adminSocket.on('ride_completed', (data) => {
      console.log('Real-time: ride_completed', data);
      handleBookingStatusUpdate(data, 'Trip Completed');
    });

    // Real-time driver online / offline toggle & location updates
    adminSocket.on('driver_status_changed', (data) => {
      console.log('Real-time: driver_status_changed', data);
      handleDriverStatusChanged(data);
    });

    adminSocket.on('drivers_status_updated', (data) => {
      console.log('Real-time: drivers_status_updated', data);
      handleDriverStatusChanged(data);
    });
  } catch (err) {
    console.warn('Failed to initialize admin socket:', err);
  }
}

function handleDriverStatusChanged(data) {
  if (!data) return;
  const vId = data.vehicleId;
  const uId = data.driverUserId || data.userId;
  const isOnline = data.isActive !== undefined ? Boolean(data.isActive) : (data.isOnline !== undefined ? Boolean(data.isOnline) : true);

  if (Array.isArray(allTaxis)) {
    const taxi = allTaxis.find(t => (vId && t.id === vId) || (uId && t.userId === uId));
    if (taxi) {
      taxi.isActive = isOnline;
      taxi.isOnline = isOnline;
      if (data.latitude && !isNaN(data.latitude) && Number(data.latitude) !== 0) taxi.latitude = Number(data.latitude);
      if (data.longitude && !isNaN(data.longitude) && Number(data.longitude) !== 0) taxi.longitude = Number(data.longitude);
      taxi.updatedAt = data.updatedAt || new Date().toISOString();
    }
  }

  if (Array.isArray(liveMapEntities)) {
    const entity = liveMapEntities.find(e => (vId && (e.rawId === vId || e.id === `taxi_${vId}`)) || (uId && e.raw && e.raw.userId === uId));
    if (entity) {
      entity.isOnline = isOnline;
      if (data.latitude && !isNaN(data.latitude) && Number(data.latitude) !== 0) entity.lat = Number(data.latitude);
      if (data.longitude && !isNaN(data.longitude) && Number(data.longitude) !== 0) entity.lng = Number(data.longitude);
      if (entity.raw) {
        entity.raw.isActive = isOnline;
        entity.raw.isOnline = isOnline;
        if (data.latitude && !isNaN(data.latitude) && Number(data.latitude) !== 0) entity.raw.latitude = Number(data.latitude);
        if (data.longitude && !isNaN(data.longitude) && Number(data.longitude) !== 0) entity.raw.longitude = Number(data.longitude);
      }
    }
  }

  // Refresh UI
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderFleetSidebar === 'function') renderFleetSidebar();
  if (typeof addFleetTabMarkers === 'function' && fleetMap) addFleetTabMarkers();
  if (typeof addAgentMapMarkers === 'function' && agentFleetMap) addAgentMapMarkers();
}

function updateAutoSyncUI(isLive) {
  const dot = document.getElementById('trips-autosync-dot');
  const label = document.getElementById('trips-autosync-label');
  if (dot) {
    if (isLive && tripsAutoSyncEnabled) dot.classList.add('online');
    else dot.classList.remove('online');
  }
  if (label) {
    label.textContent = tripsAutoSyncEnabled ? (isLive ? 'Live Sync: ON' : 'Connecting...') : 'Live Sync: OFF';
  }
}

function handleIncomingRealtimeBooking(bookingData, message) {
  try {
    playSound('success');
    const pName = bookingData.passenger?.name || 'Passenger';
    const shortId = bookingData.id ? bookingData.id.substring(0, 8) : 'NEW';
    toast(`${message || 'New Ride'} #${shortId} from ${pName}`, 'info');

    // If currently on trips tab, reload trips data seamlessly
    if (typeof currentTab !== 'undefined' && currentTab === 'trips') {
      loadBookings(true);
    }
  } catch (e) {
    console.error('Error handling realtime booking:', e);
  }
}

function handleBookingStatusUpdate(data, message) {
  try {
    const bookingId = data.id || data.bookingId;
    if (message) {
      toast(`${message} #${bookingId ? bookingId.substring(0, 8) : ''}`, 'info');
    }
    // If details modal is open for this booking, refresh details modal
    if (currentTripModalBookingId && currentTripModalBookingId === bookingId) {
      openTripDetailsModal(bookingId);
    }
    // Refresh table if on trips tab
    if (typeof currentTab !== 'undefined' && currentTab === 'trips') {
      loadBookings(true);
    }
  } catch (e) {
    console.error('Error handling booking status update:', e);
  }
}

function toggleTripsAutoSync() {
  tripsAutoSyncEnabled = !tripsAutoSyncEnabled;
  updateAutoSyncUI(adminSocket ? adminSocket.connected : false);
  if (tripsAutoSyncEnabled) {
    toast('Live auto-sync enabled', 'success');
    loadBookings();
  } else {
    toast('Live auto-sync paused', 'info');
  }
}

async function loadBookings(isSilent = false) {
  const tbody = document.getElementById('trips-table-body');
  if (!tbody) return;

  if (!isSilent && (!allBookingsList || allBookingsList.length === 0)) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading"><div class="spinner"></div><span>Loading trips & bookings...</span></td></tr>';
  }

  const statusFilter = document.getElementById('trips-status-filter')?.value || '';
  const searchInput = document.getElementById('trips-search')?.value?.trim() || '';

  const params = new URLSearchParams();
  if (statusFilter) params.append('status', statusFilter);
  if (searchInput) params.append('search', searchInput);
  params.append('limit', '100');

  const url = `${ENDPOINTS.bookings}?${params.toString()}`;
  const res = await apiRequest(url);

  if (res.ok && res.data) {
    const bookings = res.data.data || [];
    const stats = res.data.stats || {};
    allBookingsList = bookings;

    // Update real-time stats cards
    updateTripsStatsCards(stats, bookings);

    renderBookings(allBookingsList);
  } else {
    if (!isSilent) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Failed to load trips</td></tr>';
    }
  }
}

function updateTripsStatsCards(stats, bookings) {
  const total = stats.total !== undefined ? stats.total : bookings.length;
  const pending = stats.pending !== undefined ? stats.pending : bookings.filter(b => b.status === 'pending').length;
  const active = stats.active !== undefined ? stats.active : bookings.filter(b => ['accepted', 'arrived', 'in_transit'].includes(b.status)).length;
  const completed = stats.completed !== undefined ? stats.completed : bookings.filter(b => b.status === 'completed').length;
  const rev = stats.totalRevenue !== undefined ? stats.totalRevenue : bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.fare || 0), 0);
  const comm = stats.totalCommission !== undefined ? stats.totalCommission : (rev * 0.1);

  const elTotal = document.getElementById('trips-stat-total');
  const elPending = document.getElementById('trips-stat-pending');
  const elActive = document.getElementById('trips-stat-active');
  const elCompleted = document.getElementById('trips-stat-completed');
  const elRev = document.getElementById('trips-stat-revenue');
  const elComm = document.getElementById('trips-stat-commission');

  if (elTotal) elTotal.textContent = Number(total).toLocaleString();
  if (elPending) elPending.textContent = Number(pending).toLocaleString();
  if (elActive) elActive.textContent = Number(active).toLocaleString();
  if (elCompleted) elCompleted.textContent = Number(completed).toLocaleString();
  if (elRev) elRev.textContent = `LKR ${Number(rev).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (elComm) elComm.textContent = `Platform: LKR ${Number(comm).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function handleTripsSearchInput() {
  clearTimeout(tripsSearchDebounceTimer);
  tripsSearchDebounceTimer = setTimeout(() => {
    loadBookings();
  }, 350);
}

function filterTripsTable() {
  handleTripsSearchInput();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBookings(list) {
  const tbody = document.getElementById('trips-table-body');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No trip bookings found matching criteria</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(b => {
    const pName = b.passenger?.name || 'Passenger';
    const pPhone = b.passenger?.phoneNumber || '—';
    const dName = b.vehicle?.driver?.name || null;
    const dPhone = b.vehicle?.driver?.phoneNumber || b.vehicle?.mobileNum || '';
    const plate = b.vehicle?.vehicleRegNum || '';
    const vType = b.vehicle?.vehicleType?.type || 'Taxi';

    // Status styling & badges
    let statusClass = 'badge-pending';
    let statusLabel = (b.status || 'PENDING').toUpperCase();
    if (b.status === 'completed') {
      statusClass = 'badge-approved';
    } else if (b.status === 'cancelled') {
      statusClass = 'badge-rejected';
    } else if (b.status === 'in_transit') {
      statusClass = 'badge-in-transit';
      statusLabel = 'IN TRANSIT';
    } else if (b.status === 'accepted' || b.status === 'arrived') {
      statusClass = 'badge-in-transit';
    }

    const fare = b.fare ? `LKR ${Number(b.fare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LKR 0.00';
    const distance = b.distance !== null && b.distance !== undefined ? `${Number(b.distance).toFixed(1)} km` : '—';
    const dateObj = b.createdAt ? new Date(b.createdAt) : null;
    const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const timeStr = dateObj ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    const pInit = pName.charAt(0).toUpperCase();
    const dInit = dName ? dName.charAt(0).toUpperCase() : '?';

    return `
      <tr>
        <!-- 1. BOOKING ID -->
        <td style="font-family:monospace;font-size:12px;">
          <a href="#" onclick="openTripDetailsModal('${b.id}');return false;" style="font-weight:700;color:var(--accent-primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="View in-depth trip details">
            #${b.id.substring(0,8)}
          </a>
        </td>

        <!-- 2. PASSENGER -->
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:#EEF2FF;color:#4F46E5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
              ${escapeHtml(pInit)}
            </div>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--text-main);">${escapeHtml(pName)}</div>
              <div style="font-size:11px;color:var(--text-muted);"><a href="tel:${pPhone}" style="color:inherit;text-decoration:none;">${escapeHtml(pPhone)}</a></div>
            </div>
          </div>
        </td>

        <!-- 3. DRIVER & VEHICLE -->
        <td>
          ${dName ? `
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:28px;height:28px;border-radius:50%;background:#ECFDF5;color:#059669;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
                ${escapeHtml(dInit)}
              </div>
              <div>
                <div style="font-weight:700;font-size:13px;color:var(--text-main);">${escapeHtml(dName)}</div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;margin-top:1px;">
                  <span style="font-family:monospace;background:#F1F5F9;padding:1px 5px;border-radius:3px;font-weight:700;color:#0F172A;">${escapeHtml(plate)}</span>
                  <span>${escapeHtml(vType)}</span>
                </div>
              </div>
            </div>
          ` : `
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="status-badge badge-pending" style="font-size:10.5px;padding:2px 7px;">Unassigned</span>
              <button class="btn-sm btn-export" style="font-size:11px;padding:2px 8px;color:#4F46E5;border-color:#C7D2FE;" onclick="openReassignModal('${b.id}')" title="Assign a driver immediately">Assign</button>
            </div>
          `}
        </td>

        <!-- 4. ROUTE & DISTANCE -->
        <td style="max-width:220px;">
          <div style="display:flex;flex-direction:column;gap:3px;font-size:12px;">
            <div style="display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(b.pickupAddress||'Pickup')}">
              <span style="width:7px;height:7px;border-radius:50%;background:#10B981;flex-shrink:0;"></span>
              <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(b.pickupAddress || 'Pickup address')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(b.dropAddress||'Drop-off')}">
              <span style="width:7px;height:7px;border-radius:50%;background:#EF4444;flex-shrink:0;"></span>
              <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(b.dropAddress || 'Drop address')}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-left:12px;font-weight:600;">${distance}</div>
          </div>
        </td>

        <!-- 5. STATUS -->
        <td>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </td>

        <!-- 6. FARE & PAYMENT -->
        <td>
          <strong style="color:#059669;font-size:13px;">${fare}</strong>
          <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;margin-top:2px;">
            <span style="text-transform:capitalize;">${escapeHtml(b.paymentMethod || 'cash')}</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;background:${b.paymentStatus==='paid'?'#D1FAE5':'#FEF3C7'};color:${b.paymentStatus==='paid'?'#065F46':'#92400E'};">
              ${(b.paymentStatus || 'pending').toUpperCase()}
            </span>
          </div>
        </td>

        <!-- 7. DATE & TIME -->
        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">
          <div style="font-weight:600;color:var(--text-main);">${dateStr}</div>
          <div style="font-size:11px;color:#94A3B8;">${timeStr}</div>
        </td>

        <!-- 8. ACTIONS -->
        <td style="text-align:right;">
          <div style="display:inline-flex;align-items:center;gap:5px;justify-content:flex-end;">
            <button type="button" class="btn-sm btn-export" onclick="openTripDetailsModal('${b.id}')" title="View complete details">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Details
            </button>
            <button type="button" class="btn-sm btn-export" style="color:#4F46E5;border-color:#C7D2FE;" onclick="openReassignModal('${b.id}')" title="Assign / Reassign Driver">
              Driver
            </button>
            <button type="button" class="btn-sm btn-export" style="color:#0284C7;border-color:#BAE6FD;" onclick="openChangeStatusModal('${b.id}')" title="Change Trip Status">
              Status
            </button>
            ${b.status !== 'cancelled' && b.status !== 'completed' ? `
              <button class="btn-sm btn-reject" style="padding:4px 8px;font-size:11.5px;" onclick="cancelBookingAction('${b.id}')" title="Cancel this booking">Cancel</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// In-Depth Trip Details Modal
async function openTripDetailsModal(bookingId) {
  currentTripModalBookingId = bookingId;
  openModalDirect('trip-details-modal');

  const codeEl = document.getElementById('trip-modal-code');
  if (codeEl) codeEl.textContent = '#' + (bookingId.length > 12 ? bookingId.substring(0, 12) + '...' : bookingId);

  const bodyEl = document.getElementById('trip-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="padding:48px 20px;text-align:center;">
        <div class="spinner" style="width:28px;height:28px;border-width:2.5px;margin:0 auto 12px auto;"></div>
        <div style="font-size:14px;color:var(--text-muted);margin-top:10px;">Loading comprehensive trip details...</div>
      </div>
    `;
  }

  // Check in-memory first for instant preview
  let booking = allBookingsList.find(b => b.id === bookingId);
  if (booking) {
    renderTripDetailsModal(booking);
  }

  // Fetch full details from backend
  try {
    const res = await apiRequest(`${ENDPOINTS.bookings}/${bookingId}`);
    if (res.ok && res.data?.data) {
      booking = res.data.data;
      renderTripDetailsModal(booking);
    }
  } catch (err) {
    console.warn('Failed to fetch full trip details:', err);
  }
}

function closeTripDetailsModal() {
  closeModalDirect('trip-details-modal');
  currentTripModalBookingId = null;
}

function renderTripDetailsModal(b) {
  const codeEl = document.getElementById('trip-modal-code');
  const badgeWrap = document.getElementById('trip-modal-status-badge');
  const cancelBtn = document.getElementById('btn-trip-modal-cancel');
  const metaEl = document.getElementById('trip-modal-footer-meta');
  const bodyEl = document.getElementById('trip-modal-body');
  if (!bodyEl) return;

  if (codeEl) {
    codeEl.textContent = `#${b.id}`;
    codeEl.title = b.id;
  }

  const status = (b.status || 'pending').toLowerCase();
  let statusClass = 'badge-pending';
  if (status === 'completed') statusClass = 'badge-approved';
  else if (status === 'cancelled') statusClass = 'badge-rejected';
  else if (status === 'in_transit' || status === 'accepted' || status === 'arrived') statusClass = 'badge-in-transit';

  if (badgeWrap) {
    badgeWrap.innerHTML = `<span class="status-badge ${statusClass}" style="font-size:12px;padding:4px 10px;">${status.toUpperCase()}</span>`;
  }

  if (cancelBtn) {
    if (status !== 'cancelled' && status !== 'completed') {
      cancelBtn.classList.remove('hidden');
    } else {
      cancelBtn.classList.add('hidden');
    }
  }

  if (metaEl) {
    metaEl.innerHTML = `Created: <strong>${b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</strong> · Last Updated: <strong>${b.updatedAt ? new Date(b.updatedAt).toLocaleString() : '—'}</strong>`;
  }

  // Passenger data
  const pName = b.passenger?.name || 'Passenger';
  const pPhone = b.passenger?.phoneNumber || 'No phone';
  const pEmail = b.passenger?.email || 'No email';
  const pId = b.userId || '—';

  // Driver & Vehicle data
  const dName = b.vehicle?.driver?.name || 'Driver Not Assigned';
  const dPhone = b.vehicle?.driver?.phoneNumber || b.vehicle?.mobileNum || 'No phone';
  const dEmail = b.vehicle?.driver?.email || '—';
  const plate = b.vehicle?.vehicleRegNum || '—';
  const vType = b.vehicle?.vehicleType?.type || 'Taxi';
  const vCategory = b.vehicle?.vehicleType?.category ? (b.vehicle.vehicleType.category === 'hire' ? 'Hire' : 'Transport') : 'Standard';
  const vColor = b.vehicle?.color || '—';
  const vModel = b.vehicle?.model || '—';
  const vBase = b.vehicle?.baseAddress || 'Sri Lanka';
  const agentName = b.vehicle?.agent?.name ? `${b.vehicle.agent.name} (${b.vehicle.agent.district || ''})` : 'Independent / Direct';

  // Financials & Commission
  const totalFareNum = Number(b.fare || 0);
  const platformCommNum = totalFareNum * 0.10;
  const driverPayoutNum = totalFareNum * 0.90;
  const fareFormatted = `LKR ${totalFareNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const platformCommFormatted = `LKR ${platformCommNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const driverPayoutFormatted = `LKR ${driverPayoutNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const distanceFormatted = b.distance !== null && b.distance !== undefined ? `${Number(b.distance).toFixed(1)} km` : '—';
  const waitingMins = b.waitingMinutes ? `${Number(b.waitingMinutes).toFixed(1)} mins` : '0 mins';
  const waitingFareFormatted = b.waitingFare ? `LKR ${Number(b.waitingFare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LKR 0.00';
  const isWaitingText = b.isWaiting ? 'Active (Waiting Now)' : 'Inactive';

  // Rates
  const baseRate = b.vehicle?.vehicleType?.baseFare ? `LKR ${Number(b.vehicle.vehicleType.baseFare).toFixed(2)}` : '—';
  const kmRate = b.vehicle?.vehicleType?.perKmRate ? `LKR ${Number(b.vehicle.vehicleType.perKmRate).toFixed(2)}/km` : '—';
  const waitRate = b.vehicle?.vehicleType?.waitingFarePerMin ? `LKR ${Number(b.vehicle.vehicleType.waitingFarePerMin).toFixed(2)}/min` : '—';

  // Coordinates & Links
  const pickupMaps = b.pickupLat && b.pickupLng ? `https://www.google.com/maps?q=${b.pickupLat},${b.pickupLng}` : null;
  const dropMaps = b.dropLat && b.dropLng ? `https://www.google.com/maps?q=${b.dropLat},${b.dropLng}` : null;

  // Stepper state
  const stepStages = ['pending', 'accepted', 'arrived', 'in_transit', 'completed'];
  const currentStageIndex = stepStages.indexOf(status);

  bodyEl.innerHTML = `
    <!-- VISUAL JOURNEY TIMELINE / STEPPER -->
    <div style="background:#FFF;border:1px solid var(--border-color);border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">
        <span>Journey Progress</span>
        <span style="font-size:12px;font-weight:700;color:var(--text-main);">Current: <span class="status-badge ${statusClass}" style="padding:2px 8px;font-size:11px;">${status.toUpperCase()}</span></span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;position:relative;">
        ${status === 'cancelled' ? `
          <div style="width:100%;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <div>
              <div style="font-weight:700;color:#DC2626;font-size:13.5px;">Trip Was Cancelled</div>
              <div style="font-size:12px;color:#991B1B;margin-top:2px;">Reason: "${escapeHtml(b.cancellationReason || 'No reason provided')}"</div>
            </div>
          </div>
        ` : `
          <div style="position:absolute;top:15px;left:24px;right:24px;height:3px;background:#E2E8F0;z-index:1;"></div>
          ${[
            { key: 'pending', label: 'Requested' },
            { key: 'accepted', label: 'Driver Assigned' },
            { key: 'in_transit', label: 'In Transit' },
            { key: 'completed', label: 'Completed' }
          ].map((st, idx) => {
            const isDone = currentStageIndex >= stepStages.indexOf(st.key) && currentStageIndex !== -1;
            const isCurrent = status === st.key || (status === 'arrived' && st.key === 'accepted');
            const circleBg = isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#FFF';
            const circleColor = isDone || isCurrent ? '#FFF' : '#64748B';
            const borderCol = isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#CBD5E1';
            return `
              <div style="display:flex;flex-direction:column;align-items:center;z-index:2;position:relative;">
                <div style="width:30px;height:30px;border-radius:50%;background:${circleBg};border:2.5px solid ${borderCol};color:${circleColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;transition:all 0.2s;">
                  ${isDone && !isCurrent ? '✓' : idx + 1}
                </div>
                <div style="font-size:11px;font-weight:${isCurrent ? '700' : '500'};color:${isCurrent ? '#4F46E5' : '#475569'};margin-top:6px;">
                  ${st.label}
                </div>
              </div>
            `;
          }).join('')}
        `}
      </div>
    </div>

    <!-- ROUTE & GPS COORDINATES -->
    <div class="trip-route-container">
      <div style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
          Trip Route & GPS Coordinates
        </span>
        <span class="trip-dist-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Distance: ${distanceFormatted}
        </span>
      </div>

      <!-- PICKUP -->
      <div class="trip-route-point trip-route-point-pickup">
        <div class="trip-point-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Pickup Location</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${escapeHtml(b.pickupAddress || 'Address not specified')}</div>
          <div style="font-size:12px;color:#64748B;margin-top:2px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span>GPS: <code>${b.pickupLat ?? '—'}, ${b.pickupLng ?? '—'}</code></span>
            ${pickupMaps ? `<a href="${pickupMaps}" target="_blank" rel="noopener" class="trip-gmaps-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on Google Maps</a>` : ''}
          </div>
        </div>
      </div>

      <!-- CONNECTOR -->
      <div class="trip-route-connector">
        <span style="font-size:11.5px;color:#64748B;">Direct route travel · Recorded distance ${distanceFormatted}</span>
      </div>

      <!-- DROPOFF -->
      <div class="trip-route-point trip-route-point-drop">
        <div class="trip-point-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:0.5px;">Destination / Drop-off</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${escapeHtml(b.dropAddress || 'Address not specified')}</div>
          <div style="font-size:12px;color:#64748B;margin-top:2px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span>GPS: <code>${b.dropLat ?? '—'}, ${b.dropLng ?? '—'}</code></span>
            ${dropMaps ? `<a href="${dropMaps}" target="_blank" rel="noopener" class="trip-gmaps-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>View on Google Maps</a>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- 2-COLUMN DETAILS GRID -->
    <div class="trip-grid-2col">
      <!-- LEFT COLUMN: FARE BREAKDOWN & REVIEWS -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- FARE BREAKDOWN -->
        <div class="trip-card-box">
          <div class="trip-card-box-header">
            <span class="trip-card-box-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Fare & Financial Breakdown
            </span>
            <div style="display:flex;align-items:center;gap:6px;">
              <button class="btn-sm btn-approve" style="font-size:11px;padding:3px 9px;display:inline-flex;align-items:center;gap:4px;" onclick="openTripReceiptModal('${b.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                View Bill
              </button>
              <button class="btn-sm btn-export" style="font-size:11px;padding:2px 8px;" onclick="openEditFareModal('${b.id}')">Edit Fare</button>
            </div>
          </div>
          <div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Total Trip Fare</span>
              <span class="trip-kv-val" style="color:#059669;font-size:16px;font-weight:800;">${fareFormatted}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Payment Method & Status</span>
              <span class="trip-kv-val" style="text-transform:capitalize;">
                ${escapeHtml(b.paymentMethod || 'cash')} 
                <span style="font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;background:${b.paymentStatus==='paid'?'#D1FAE5':'#FEF3C7'};color:${b.paymentStatus==='paid'?'#065F46':'#92400E'};">
                  ${(b.paymentStatus || 'pending').toUpperCase()}
                </span>
              </span>
            </div>
            <div class="trip-kv-row" style="background:#F8FAFC;padding:6px 10px;border-radius:6px;margin:6px 0;">
              <span class="trip-kv-label">Platform Commission (10%)</span>
              <span class="trip-kv-val" style="color:var(--primary);font-weight:700;">${platformCommFormatted}</span>
            </div>
            <div class="trip-kv-row" style="background:#F0FDF4;padding:6px 10px;border-radius:6px;margin-bottom:6px;">
              <span class="trip-kv-label">Driver Payout (90%)</span>
              <span class="trip-kv-val" style="color:#059669;font-weight:700;">${driverPayoutFormatted}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Distance Travelled</span>
              <span class="trip-kv-val">${distanceFormatted}</span>
            </div>
            <div class="trip-kv-row" style="${Number(b.waitingFare || 0) > 0 ? 'background:#FEF3C7;padding:6px 10px;border-radius:6px;margin:4px 0;' : ''}">
              <span class="trip-kv-label" style="${Number(b.waitingFare || 0) > 0 ? 'color:#B45309;font-weight:700;' : ''}">Waiting Status & Time</span>
              <span class="trip-kv-val" style="${Number(b.waitingFare || 0) > 0 ? 'color:#92400E;font-weight:700;' : ''}">${isWaitingText} · ${waitingMins}</span>
            </div>
            <div class="trip-kv-row" style="${Number(b.waitingFare || 0) > 0 ? 'background:#FEF3C7;padding:6px 10px;border-radius:6px;margin-bottom:6px;' : ''}">
              <span class="trip-kv-label" style="${Number(b.waitingFare || 0) > 0 ? 'color:#B45309;font-weight:700;' : ''}">Waiting Fare</span>
              <span class="trip-kv-val" style="${Number(b.waitingFare || 0) > 0 ? 'color:#92400E;font-weight:800;' : ''}">${waitingFareFormatted}</span>
            </div>
            <div class="trip-kv-row" style="background:#F8FAFC;padding:8px 10px;border-radius:6px;margin-top:6px;">
              <span class="trip-kv-label">Tariff Rates</span>
              <span class="trip-kv-val" style="font-size:11px;color:#475569;">Base: ${baseRate} | ${kmRate} | ${waitRate}</span>
            </div>
          </div>
        </div>

        <!-- CUSTOMER REVIEW & RATING (IF AVAILABLE) -->
        ${b.review ? `
          <div class="trip-card-box">
            <div class="trip-card-box-header">
              <span class="trip-card-box-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Passenger Review & Feedback
              </span>
              <span style="font-weight:800;color:#D97706;font-size:14px;">Score: ${b.review.rating} / 5</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;">
              ${[1, 2, 3, 4, 5].map(star => `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= b.review.rating ? '#F59E0B' : '#E2E8F0'}" stroke="${star <= b.review.rating ? '#D97706' : '#CBD5E1'}" stroke-width="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              `).join('')}
            </div>
            ${b.review.feedback ? `
              <div style="font-size:13px;color:#334155;background:#F8FAFC;padding:10px 12px;border-radius:8px;font-style:italic;line-height:1.5;">
                "${escapeHtml(b.review.feedback)}"
              </div>
            ` : '<div style="font-size:12px;color:#94A3B8;">No written review feedback.</div>'}
          </div>
        ` : ''}
      </div>

      <!-- RIGHT COLUMN: PASSENGER & DRIVER PROFILES -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- PASSENGER CARD -->
        <div class="trip-card-box">
          <div class="trip-card-box-header">
            <span class="trip-card-box-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Passenger Information
            </span>
            <span style="font-size:11px;color:#64748B;">Client Profile</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:42px;height:42px;border-radius:12px;background:#4F46E5;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0;">
              ${escapeHtml(pName.charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size:15px;font-weight:700;color:#0F172A;">${escapeHtml(pName)}</div>
              <div style="font-size:12px;color:#64748B;"><a href="tel:${pPhone}" style="color:#2563EB;text-decoration:none;font-weight:600;">${pPhone}</a></div>
            </div>
          </div>
          <div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Email</span>
              <span class="trip-kv-val">${pEmail !== 'No email' ? `<a href="mailto:${pEmail}" style="color:#2563EB;text-decoration:none;">${pEmail}</a>` : '—'}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Passenger User ID</span>
              <span class="trip-kv-val" style="font-family:monospace;font-size:11px;">${pId}</span>
            </div>
          </div>
        </div>

        <!-- DRIVER & VEHICLE CARD -->
        ${b.vehicle ? `
        <div class="trip-card-box">
          <div class="trip-card-box-header">
            <span class="trip-card-box-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Driver & Vehicle Details
            </span>
            <button class="btn-sm btn-export" style="font-size:11px;padding:2px 8px;color:#4F46E5;border-color:#C7D2FE;" onclick="openReassignModal('${b.id}')">Reassign</button>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:42px;height:42px;border-radius:12px;background:#059669;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0;">
              ${escapeHtml(dName.charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size:15px;font-weight:700;color:#0F172A;">${escapeHtml(dName)}</div>
              <div style="font-size:12px;color:#64748B;"><a href="tel:${dPhone}" style="color:#2563EB;text-decoration:none;font-weight:600;">${dPhone}</a></div>
            </div>
          </div>
          <div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Registration Plate</span>
              <span class="trip-kv-val" style="font-family:monospace;font-weight:700;color:#0F172A;">${escapeHtml(plate)}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Vehicle Type</span>
              <span class="trip-kv-val">${escapeHtml(vType)} (${escapeHtml(vCategory)})</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Color & Model</span>
              <span class="trip-kv-val">${escapeHtml(vColor)} · ${escapeHtml(vModel)}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Base Location</span>
              <span class="trip-kv-val">${escapeHtml(vBase)}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Regional Agent</span>
              <span class="trip-kv-val">${escapeHtml(agentName)}</span>
            </div>
            <div class="trip-kv-row">
              <span class="trip-kv-label">Driver Email</span>
              <span class="trip-kv-val">${dEmail !== '—' ? `<a href="mailto:${dEmail}" style="color:#2563EB;text-decoration:none;">${dEmail}</a>` : '—'}</span>
            </div>
          </div>
        </div>
        ` : `
        <div class="trip-card-box" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:28px 20px;border-style:dashed;">
          <div style="width:46px;height:46px;border-radius:50%;background:#F1F5F9;display:flex;align-items:center;justify-content:center;color:#64748B;margin-bottom:12px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div style="font-weight:700;font-size:14px;color:#334155;">No Driver Assigned Yet</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;max-width:260px;">This trip is currently in <strong>${status.toUpperCase()}</strong> status.</div>
          <button type="button" class="btn-primary" style="margin-top:14px;padding:6px 14px;font-size:12px;" onclick="openReassignModal('${b.id}')">
            Assign Driver Now
          </button>
        </div>
        `}
      </div>
    </div>
  `;
}

// ==========================================
// DRIVER REASSIGNMENT MODAL
// ==========================================
async function openReassignModal(bookingId) {
  reassignTargetBookingId = bookingId || currentTripModalBookingId;
  if (!reassignTargetBookingId) return;

  const sub = document.getElementById('reassign-modal-subtext');
  if (sub) sub.textContent = `Select an active approved driver for Trip #${reassignTargetBookingId.substring(0,8)}`;

  const searchInput = document.getElementById('reassign-search-input');
  if (searchInput) searchInput.value = '';

  const listEl = document.getElementById('reassign-drivers-list');
  if (listEl) {
    listEl.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);"><div class="spinner" style="margin:0 auto 10px auto;"></div> Loading fleet drivers...</div>';
  }

  openModalDirect('modal-reassign-driver');

  try {
    const res = await apiRequest(ENDPOINTS.vehicles + '?limit=500');
    if (res.ok) {
      const arr = res.data?.data || res.data?.vehicles || (Array.isArray(res.data) ? res.data : []);
      availableFleetDrivers = arr.filter(v => v.status === 'approved');
      renderReassignDriversList(availableFleetDrivers);
    } else {
      if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#DC2626;">Failed to load fleet drivers</div>';
    }
  } catch (err) {
    console.error('Error fetching fleet drivers for reassignment:', err);
    if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#DC2626;">Error loading drivers</div>';
  }
}

function closeReassignModal() {
  closeModalDirect('modal-reassign-driver');
  reassignTargetBookingId = null;
}

function renderReassignDriversList(drivers) {
  const listEl = document.getElementById('reassign-drivers-list');
  if (!listEl) return;

  if (!drivers || drivers.length === 0) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;">No approved drivers found</div>';
    return;
  }

  listEl.innerHTML = drivers.map(v => {
    const dName = v.driver?.name || 'Driver';
    const dPhone = v.driver?.phoneNumber || v.mobileNum || '—';
    const plate = v.vehicleRegNum || '—';
    const vType = v.vehicleType?.type || 'Taxi';
    const isAvail = v.isAvailable;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;background:#FFF;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:#EEF2FF;color:#4F46E5;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">
            ${escapeHtml(dName.charAt(0).toUpperCase())}
          </div>
          <div>
            <div style="font-weight:700;font-size:13.5px;color:var(--text-main);">${escapeHtml(dName)}</div>
            <div style="font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span>${escapeHtml(dPhone)}</span>
              <span>•</span>
              <span style="font-family:monospace;background:#F1F5F9;padding:1px 5px;border-radius:3px;font-weight:600;">${escapeHtml(plate)}</span>
              <span>•</span>
              <span>${escapeHtml(vType)}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <span style="font-size:11px;font-weight:700;color:${isAvail ? '#059669' : '#64748B'};background:${isAvail ? '#ECFDF5' : '#F1F5F9'};padding:3px 8px;border-radius:4px;">
            ${isAvail ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button type="button" class="btn-primary" style="padding:5px 12px;font-size:12px;" onclick="assignDriverToTrip('${v.id}')">
            Assign Driver
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterReassignDriversList() {
  const query = document.getElementById('reassign-search-input')?.value?.toLowerCase() || '';
  if (!query) {
    renderReassignDriversList(availableFleetDrivers);
    return;
  }
  const filtered = availableFleetDrivers.filter(v =>
    (v.driver?.name || '').toLowerCase().includes(query) ||
    (v.driver?.phoneNumber || '').toLowerCase().includes(query) ||
    (v.vehicleRegNum || '').toLowerCase().includes(query) ||
    (v.vehicleType?.type || '').toLowerCase().includes(query)
  );
  renderReassignDriversList(filtered);
}

async function assignDriverToTrip(vehicleId) {
  if (!reassignTargetBookingId || !vehicleId) return;
  const res = await apiRequest(`${ENDPOINTS.bookings}/${reassignTargetBookingId}/reassign`, 'PATCH', { vehicleId });
  if (res.ok) {
    playSound('success');
    toast('Driver successfully assigned to trip', 'success');
    closeReassignModal();
    loadBookings(true);
    if (currentTripModalBookingId) {
      openTripDetailsModal(currentTripModalBookingId);
    }
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to reassign driver', 'error');
  }
}

async function unassignDriverFromTrip() {
  if (!reassignTargetBookingId) return;
  if (!confirm('Are you sure you want to unassign the current driver and return this booking to pending so nearby drivers receive it again?')) return;

  const res = await apiRequest(`${ENDPOINTS.bookings}/${reassignTargetBookingId}/reassign`, 'PATCH', { vehicleId: null });
  if (res.ok) {
    playSound('success');
    toast('Driver unassigned and ride re-broadcasted', 'success');
    closeReassignModal();
    loadBookings(true);
    if (currentTripModalBookingId) {
      openTripDetailsModal(currentTripModalBookingId);
    }
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to unassign driver', 'error');
  }
}

// ==========================================
// CHANGE STATUS MODAL
// ==========================================
function openChangeStatusModal(bookingId) {
  changeStatusTargetBookingId = bookingId || currentTripModalBookingId;
  if (!changeStatusTargetBookingId) return;

  const booking = allBookingsList.find(b => b.id === changeStatusTargetBookingId);
  const select = document.getElementById('change-status-select');
  if (select && booking) {
    select.value = booking.status;
  }
  toggleCancelReasonInput(select ? select.value : 'pending');

  openModalDirect('modal-change-trip-status');
}

function closeChangeStatusModal() {
  closeModalDirect('modal-change-trip-status');
  changeStatusTargetBookingId = null;
}

function toggleCancelReasonInput(statusVal) {
  const grp = document.getElementById('change-status-reason-group');
  if (grp) {
    if (statusVal === 'cancelled') grp.classList.remove('hidden');
    else grp.classList.add('hidden');
  }
}

async function submitChangeTripStatus(e) {
  if (e) e.preventDefault();
  if (!changeStatusTargetBookingId) return;

  const status = document.getElementById('change-status-select')?.value;
  const reason = document.getElementById('change-status-reason')?.value?.trim();

  if (!status) return;

  const res = await apiRequest(`${ENDPOINTS.bookings}/${changeStatusTargetBookingId}/status`, 'PATCH', {
    status,
    cancellationReason: status === 'cancelled' ? (reason || 'Cancelled by Admin') : undefined
  });

  if (res.ok) {
    playSound('success');
    toast(`Trip status updated to ${status.toUpperCase()}`, 'success');
    closeChangeStatusModal();
    loadBookings(true);
    if (currentTripModalBookingId) {
      openTripDetailsModal(currentTripModalBookingId);
    }
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update trip status', 'error');
  }
}

// ==========================================
// EDIT FARE & PAYMENT MODAL
// ==========================================
function openEditFareModal(bookingId) {
  editFareTargetBookingId = bookingId || currentTripModalBookingId;
  if (!editFareTargetBookingId) return;

  const booking = allBookingsList.find(b => b.id === editFareTargetBookingId);
  if (booking) {
    const fareInp = document.getElementById('edit-fare-amount');
    const payStatusSel = document.getElementById('edit-payment-status');
    const payMethodSel = document.getElementById('edit-payment-method');

    if (fareInp) fareInp.value = booking.fare || 0;
    if (payStatusSel) payStatusSel.value = booking.paymentStatus || 'pending';
    if (payMethodSel) payMethodSel.value = booking.paymentMethod || 'cash';
  }

  openModalDirect('modal-edit-trip-fare');
}

function closeEditFareModal() {
  closeModalDirect('modal-edit-trip-fare');
  editFareTargetBookingId = null;
}

async function submitEditTripFare(e) {
  if (e) e.preventDefault();
  if (!editFareTargetBookingId) return;

  const fareVal = document.getElementById('edit-fare-amount')?.value;
  const paymentStatus = document.getElementById('edit-payment-status')?.value;
  const paymentMethod = document.getElementById('edit-payment-method')?.value;

  const res = await apiRequest(`${ENDPOINTS.bookings}/${editFareTargetBookingId}`, 'PATCH', {
    fare: Number(fareVal),
    paymentStatus,
    paymentMethod
  });

  if (res.ok) {
    playSound('success');
    toast('Fare and payment details updated', 'success');
    closeEditFareModal();
    loadBookings(true);
    if (currentTripModalBookingId) {
      openTripDetailsModal(currentTripModalBookingId);
    }
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update fare', 'error');
  }
}

// ==========================================
// CANCEL TRIP ACTION
// ==========================================
async function cancelBookingAction(id) {
  if (!confirm('Are you sure you want to cancel this booking? This will stop ringing driver devices and alert the customer.')) return;
  const reason = prompt('Reason for cancellation:', 'Cancelled by Super Admin');
  if (reason === null) return;

  const res = await apiRequest(`${ENDPOINTS.bookings}/${id}/cancel`, 'POST', { reason });
  if (res.ok) {
    playSound('success');
    toast('Booking cancelled successfully', 'success');
    loadBookings(true);
    if (currentTripModalBookingId === id) {
      openTripDetailsModal(id);
    }
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to cancel booking', 'error');
  }
}

async function cancelBookingFromModal() {
  if (!currentTripModalBookingId) return;
  await cancelBookingAction(currentTripModalBookingId);
}

// ==========================================
// EXPORT TRIPS CSV
// ==========================================
function exportTripsCSV() {
  if (!allBookingsList || allBookingsList.length === 0) {
    toast('No trip bookings available to export', 'warning');
    return;
  }

  const headers = [
    'Booking ID',
    'Created At',
    'Status',
    'Passenger Name',
    'Passenger Phone',
    'Passenger Email',
    'Driver Name',
    'Driver Phone',
    'Vehicle Plate',
    'Vehicle Type',
    'Distance (km)',
    'Fare (LKR)',
    'Payment Method',
    'Payment Status',
    'Pickup Address',
    'Drop Address',
    'Cancellation Reason'
  ];

  const rows = allBookingsList.map(b => {
    const pName = b.passenger?.name || '';
    const pPhone = b.passenger?.phoneNumber || '';
    const pEmail = b.passenger?.email || '';
    const dName = b.vehicle?.driver?.name || '';
    const dPhone = b.vehicle?.driver?.phoneNumber || b.vehicle?.mobileNum || '';
    const plate = b.vehicle?.vehicleRegNum || '';
    const vType = b.vehicle?.vehicleType?.type || '';

    const clean = val => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    return [
      clean(b.id),
      clean(b.createdAt ? new Date(b.createdAt).toISOString() : ''),
      clean(b.status),
      clean(pName),
      clean(pPhone),
      clean(pEmail),
      clean(dName),
      clean(dPhone),
      clean(plate),
      clean(vType),
      clean(b.distance ?? ''),
      clean(b.fare ?? ''),
      clean(b.paymentMethod ?? ''),
      clean(b.paymentStatus ?? ''),
      clean(b.pickupAddress ?? ''),
      clean(b.dropAddress ?? ''),
      clean(b.cancellationReason ?? '')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `life360_trips_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('Trips exported to CSV successfully', 'success');
}

// Window bindings
window.loadBookings = loadBookings;
window.renderBookings = renderBookings;
window.openTripDetailsModal = openTripDetailsModal;
window.closeTripDetailsModal = closeTripDetailsModal;
window.cancelBookingFromModal = cancelBookingFromModal;
window.cancelBookingAction = cancelBookingAction;
window.filterTripsTable = filterTripsTable;
window.handleTripsSearchInput = handleTripsSearchInput;
window.toggleTripsAutoSync = toggleTripsAutoSync;
window.exportTripsCSV = exportTripsCSV;
window.openReassignModal = openReassignModal;
window.closeReassignModal = closeReassignModal;
window.renderReassignDriversList = renderReassignDriversList;
window.filterReassignDriversList = filterReassignDriversList;
window.assignDriverToTrip = assignDriverToTrip;
window.unassignDriverFromTrip = unassignDriverFromTrip;
window.openChangeStatusModal = openChangeStatusModal;
window.closeChangeStatusModal = closeChangeStatusModal;
window.toggleCancelReasonInput = toggleCancelReasonInput;
window.submitChangeTripStatus = submitChangeTripStatus;
window.openEditFareModal = openEditFareModal;
window.closeEditFareModal = closeEditFareModal;
window.submitEditTripFare = submitEditTripFare;
window.initAdminSocket = initAdminSocket;

/* ============================================================
   OFFICIAL TRIP INVOICE & RECEIPT MODAL
   ============================================================ */
let currentReceiptData = null;

async function openTripReceiptModal(bookingId) {
  const id = bookingId || currentTripModalBookingId;
  if (!id) return;

  const modal = document.getElementById('trip-receipt-modal');
  const bodyEl = document.getElementById('trip-receipt-modal-body');
  if (modal) modal.classList.remove('hidden');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="padding:40px 20px;text-align:center;">
        <div class="spinner" style="width:28px;height:28px;margin:0 auto 12px auto;"></div>
        <div style="color:var(--text-muted);font-size:13.5px;">Generating official itemized invoice...</div>
      </div>
    `;
  }

  try {
    const res = await apiRequest(`${ENDPOINTS.bookings}/${id}/receipt`);
    if (res.ok && res.data?.data) {
      currentReceiptData = res.data.data;
      renderTripReceiptModal(currentReceiptData);
    } else {
      // Fallback: look up in allBookingsList
      const fallbackBooking = allBookingsList.find(b => b.id === id);
      if (fallbackBooking) {
        renderTripReceiptModal(buildClientSideReceipt(fallbackBooking));
      } else if (bodyEl) {
        bodyEl.innerHTML = `<div style="padding:30px;text-align:center;color:#DC2626;">Failed to load receipt details.</div>`;
      }
    }
  } catch (err) {
    console.error('Error fetching receipt:', err);
    if (bodyEl) bodyEl.innerHTML = `<div style="padding:30px;text-align:center;color:#DC2626;">Error generating receipt.</div>`;
  }
}

function closeTripReceiptModal() {
  const modal = document.getElementById('trip-receipt-modal');
  if (modal) modal.classList.add('hidden');
  currentReceiptData = null;
}

function buildClientSideReceipt(b) {
  const v = b.vehicle || {};
  const vt = v.vehicleType || {};
  const d = v.driver || {};
  const p = b.passenger || {};

  const baseFare = Number(v.baseFare) || Number(vt.baseFare) || 100;
  const ratePerKm = Number(v.ratePerKm) || Number(vt.ratePerKm) || 80;
  const distKm = Number(b.distance || 0);
  const distFare = Math.round(distKm * ratePerKm);
  const waitMins = Number(b.waitingMinutes || 0);
  const waitRate = Number(v.waitingFare) || 10;
  const waitFare = Number(b.waitingFare || 0);
  const total = Number(b.fare || 0);

  return {
    bookingId: b.id,
    invoiceNo: `INV-${b.id.substring(0, 8).toUpperCase()}`,
    status: b.status,
    pickupAddress: b.pickupAddress || 'Pickup address',
    dropAddress: b.dropAddress || 'Destination address',
    distanceKm: distKm,
    baseFare,
    ratePerKm,
    distanceFare: distFare,
    waitingMinutes: waitMins,
    waitingRatePerMin: waitRate,
    waitingFare: waitFare,
    totalFare: total,
    driverEarnings: Number(b.driverEarnings || Math.round(total * 0.9)),
    companyCommission: Number(b.companyCommission || Math.round(total * 0.1)),
    paymentMethod: b.paymentMethod || 'cash',
    paymentStatus: b.paymentStatus || 'paid',
    passenger: { name: p.name || 'Passenger', phoneNumber: p.phoneNumber || '—' },
    driver: { name: d.name || 'Driver', phoneNumber: d.phoneNumber || v.mobileNum || '—', vehicleRegNum: v.vehicleRegNum || '—', vehicleType: vt.type || 'Taxi' },
    createdAt: b.createdAt,
    completedAt: b.updatedAt
  };
}

function renderTripReceiptModal(r) {
  const bodyEl = document.getElementById('trip-receipt-modal-body');
  if (!bodyEl || !r) return;

  const dateStr = r.completedAt ? new Date(r.completedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString();
  const statusBadge = r.status === 'completed' ? 'badge-approved' : r.status === 'cancelled' ? 'badge-rejected' : 'badge-pending';

  bodyEl.innerHTML = `
    <div id="printable-receipt-area" style="background:#FFF;border:1px solid #E2E8F0;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);color:#0F172A;font-family:inherit;">
      <!-- RECEIPT HEADER -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #F1F5F9;padding-bottom:18px;margin-bottom:18px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:var(--primary);color:#FFF;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;">SF</div>
            <div>
              <div style="font-weight:900;font-size:16px;color:var(--text-main);letter-spacing:-0.3px;">SERVE FAMILY TAXI</div>
              <div style="font-size:11px;color:#64748B;">Mobility & Island-wide Transport Services</div>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:14px;color:#0F172A;font-family:monospace;">${escapeHtml(r.invoiceNo || 'INV-000000')}</div>
          <div style="font-size:11.5px;color:#64748B;margin-top:2px;">${dateStr}</div>
          <div style="margin-top:4px;"><span class="status-badge ${statusBadge}" style="font-size:10.5px;padding:2px 8px;">${(r.status||'COMPLETED').toUpperCase()}</span></div>
        </div>
      </div>

      <!-- PASSENGER & DRIVER 2-COL -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#F8FAFC;padding:12px 16px;border-radius:8px;margin-bottom:18px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Passenger (Customer)</div>
          <div style="font-weight:800;font-size:14px;color:#0F172A;margin-top:2px;">${escapeHtml(r.passenger?.name || 'Passenger')}</div>
          <div style="font-size:12px;color:#64748B;">${escapeHtml(r.passenger?.phoneNumber || '—')}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Driver & Vehicle</div>
          <div style="font-weight:800;font-size:14px;color:#0F172A;margin-top:2px;">${escapeHtml(r.driver?.name || 'Driver')}</div>
          <div style="font-size:12px;color:#64748B;">
            <code style="background:#FFF;padding:1px 5px;border-radius:3px;font-weight:700;border:1px solid #E2E8F0;">${escapeHtml(r.driver?.vehicleRegNum || '—')}</code>
            · ${escapeHtml(r.driver?.vehicleType || 'Taxi')}
          </div>
        </div>
      </div>

      <!-- TRIP ROUTE -->
      <div style="margin-bottom:20px;border-bottom:1px solid #F1F5F9;padding-bottom:14px;">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#10B981;margin-top:4px;flex-shrink:0;"></span>
          <div style="font-size:12.5px;">
            <span style="font-weight:700;color:#059669;">From:</span> ${escapeHtml(r.pickupAddress || 'Pickup address')}
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#EF4444;margin-top:4px;flex-shrink:0;"></span>
          <div style="font-size:12.5px;">
            <span style="font-weight:700;color:#DC2626;">To:</span> ${escapeHtml(r.dropAddress || 'Destination address')}
          </div>
        </div>
      </div>

      <!-- ITEMIZED BILL BREAKDOWN TABLE -->
      <div style="margin-bottom:18px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid #E2E8F0;text-align:left;color:#64748B;font-size:11px;text-transform:uppercase;">
              <th style="padding:6px 0;">Description</th>
              <th style="padding:6px 0;text-align:center;">Qty / Rate</th>
              <th style="padding:6px 0;text-align:right;">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:8px 0;font-weight:600;">Base Hire Fare</td>
              <td style="padding:8px 0;text-align:center;color:#64748B;">Initial base rate</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${Number(r.baseFare || 0).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:8px 0;font-weight:600;">Distance Charge</td>
              <td style="padding:8px 0;text-align:center;color:#64748B;">${Number(r.distanceKm || 0).toFixed(1)} km @ LKR ${Number(r.ratePerKm || 0).toFixed(2)}/km</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${Number(r.distanceFare || 0).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom:1px solid #F1F5F9;${Number(r.waitingFare || 0) > 0 ? 'background:#FEF3C7;' : ''}">
              <td style="padding:8px 6px;font-weight:700;${Number(r.waitingFare || 0) > 0 ? 'color:#B45309;' : ''}">
                Waiting Charge ${Number(r.waitingFare || 0) > 0 ? '<span style="font-size:10px;background:#D97706;color:#FFF;padding:1px 5px;border-radius:3px;margin-left:4px;">APPLIED</span>' : ''}
              </td>
              <td style="padding:8px 0;text-align:center;color:#64748B;">${Number(r.waitingMinutes || 0).toFixed(1)} mins @ LKR ${Number(r.waitingRatePerMin || 10).toFixed(2)}/min</td>
              <td style="padding:8px 6px;text-align:right;font-weight:800;${Number(r.waitingFare || 0) > 0 ? 'color:#92400E;' : ''}">${Number(r.waitingFare || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FINAL TOTAL BANNER -->
      <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Final Total Bill</div>
          <div style="font-size:12px;color:#15803D;margin-top:2px;">
            Payment: <strong style="text-transform:capitalize;">${escapeHtml(r.paymentMethod || 'Cash')}</strong>
            · <span style="background:#DCFCE7;color:#166534;padding:1px 6px;border-radius:3px;font-weight:800;font-size:10px;">${(r.paymentStatus||'PAID').toUpperCase()}</span>
          </div>
        </div>
        <div style="font-size:24px;font-weight:900;color:#15803D;font-family:monospace;">
          LKR ${Number(r.totalFare || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <!-- DISPATCH COMMISSION & DRIVER EARNINGS BREAKDOWN -->
      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#64748B;border-top:1px dashed #CBD5E1;padding-top:10px;">
        <span>Driver Payout (90%): <strong>LKR ${Number(r.driverEarnings || 0).toFixed(2)}</strong></span>
        <span>Platform Commission (10%): <strong>LKR ${Number(r.companyCommission || 0).toFixed(2)}</strong></span>
      </div>
    </div>
  `;
}

function printTripReceipt() {
  const printArea = document.getElementById('printable-receipt-area');
  if (!printArea) {
    window.print();
    return;
  }
  const printWin = window.open('', '_blank', 'width=750,height=800');
  if (printWin) {
    printWin.document.write(`
      <html>
        <head>
          <title>Serve Family Taxi - Receipt</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; margin: 0; background: #fff; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printArea.outerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  } else {
    window.print();
  }
}

window.openTripReceiptModal = openTripReceiptModal;
window.closeTripReceiptModal = closeTripReceiptModal;
window.printTripReceipt = printTripReceipt;

/* ============================================================
   DRIVER WALLETS & COMMISSION
   ============================================================ */
async function loadWallets() {
  const tbody = document.getElementById('wallets-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="table-loading"><div class="spinner"></div><span>Loading wallets...</span></td></tr>';

  const res = await apiRequest(ENDPOINTS.wallets);
  if (res.ok && res.data) {
    const summary = res.data.summary || {};
    const wallets = res.data.data || [];

    document.getElementById('wallet-total-drivers').textContent = summary.totalDrivers || 0;
    document.getElementById('wallet-gross-earnings').textContent = `LKR ${Number(summary.totalGrossEarnings||0).toLocaleString()}`;
    document.getElementById('wallet-platform-commission').textContent = `LKR ${Number(summary.totalPlatformCommission||0).toLocaleString()}`;

    if (wallets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No driver wallets found</td></tr>';
      return;
    }

    tbody.innerHTML = wallets.map(w => `
      <tr>
        <td><strong>${w.driverName}</strong><div style="font-size:11px;color:var(--text-muted);">${w.driverPhone}</div></td>
        <td><strong>${w.plateNumber}</strong><div style="font-size:11px;color:var(--text-muted);">${w.vehicleType}</div></td>
        <td><strong>${w.totalRides}</strong></td>
        <td>LKR ${Number(w.grossEarnings).toLocaleString()}</td>
        <td style="color:var(--primary);font-weight:700;">LKR ${Number(w.platformCommission).toLocaleString()}</td>
        <td style="color:#059669;font-weight:700;">LKR ${Number(w.netEarnings).toLocaleString()}</td>
        <td><span class="status-badge badge-approved">SETTLED</span></td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load wallets</td></tr>';
  }
}

/* ============================================================
   BROADCAST PUSH & SMS
   ============================================================ */
let realAudienceCounts = null;

async function fetchRealAudienceCounts(force = false) {
  if (!realAudienceCounts || force) {
    const res = await apiRequest(ENDPOINTS.audienceCounts);
    if (res.ok && res.data?.data) {
      realAudienceCounts = res.data.data;
    }
  }
  return realAudienceCounts;
}

async function updateBroadcastAudienceBadge() {
  const aud = document.getElementById('broadcast-audience')?.value || 'all';
  const badge = document.getElementById('broadcast-audience-badge');
  if (!badge) return;

  const counts = await fetchRealAudienceCounts();
  if (counts) {
    if (aud === 'all') badge.textContent = `Target Audience: ${counts.all} Registered Accounts & Fleet Vehicles`;
    else if (aud === 'drivers') badge.textContent = `Target Audience: ${counts.drivers} Approved Fleet Drivers`;
    else if (aud === 'passengers') badge.textContent = `Target Audience: ${counts.passengers} Registered Passenger Accounts`;
  } else {
    badge.textContent = 'Target Audience: Active System Accounts';
  }
}

function updatePushPreview() {
  const title = document.getElementById('broadcast-title')?.value || '';
  const msg = document.getElementById('broadcast-message')?.value || '';
  
  const titleCounter = document.getElementById('title-counter');
  const msgCounter = document.getElementById('msg-counter');
  if (titleCounter) titleCounter.textContent = `${title.length} / 65`;
  if (msgCounter) msgCounter.textContent = `${msg.length} / 250`;

  const prevTitle = document.getElementById('preview-push-title');
  const prevMsg = document.getElementById('preview-push-msg');
  if (prevTitle) prevTitle.textContent = title.trim() || 'Notification Title Preview';
  if (prevMsg) prevMsg.textContent = msg.trim() || 'Your broadcast notification message body will appear right here in real-time as you compose it.';
}

function applyBroadcastTemplate(type) {
  const titleEl = document.getElementById('broadcast-title');
  const msgEl = document.getElementById('broadcast-message');
  const audEl = document.getElementById('broadcast-audience');
  if (!titleEl || !msgEl) return;

  if (type === 'weather') {
    titleEl.value = 'Severe Weather Alert';
    msgEl.value = 'Drivers, please drive safely due to severe rain and flooding reported across Colombo and Western Province.';
    if (audEl) audEl.value = 'drivers';
  } else if (type === 'promo') {
    titleEl.value = '0% Platform Commission Today';
    msgEl.value = 'Complete 5 rides today and pay zero commission on all your trips! Offer valid until midnight.';
    if (audEl) audEl.value = 'drivers';
  } else if (type === 'update') {
    titleEl.value = 'Mandatory App Update Available';
    msgEl.value = 'A new version of Serve Family is available on Google Play & App Store. Please update for new tracking features!';
    if (audEl) audEl.value = 'all';
  } else if (type === 'maint') {
    titleEl.value = 'Scheduled System Maintenance';
    msgEl.value = 'Serve Family servers will undergo brief maintenance tonight from 2:00 AM to 3:00 AM. Thank you for your patience.';
    if (audEl) audEl.value = 'all';
  }
  updateBroadcastAudienceBadge();
  updatePushPreview();
  playSound('click');
}

async function handleSendBroadcast(e) {
  e.preventDefault();
  const title = document.getElementById('broadcast-title').value.trim();
  const message = document.getElementById('broadcast-message').value.trim();
  const targetAudience = document.getElementById('broadcast-audience').value;
  const sendPush = document.getElementById('broadcast-send-push').checked;
  const sendSMS = document.getElementById('broadcast-send-sms').checked;

  if (!title || !message) {
    toast('Please fill in title and message', 'warning');
    return;
  }

  const btn = document.getElementById('btn-submit-broadcast');
  btn.disabled = true;
  btn.textContent = 'Dispatching Broadcast...';

  const res = await apiRequest(ENDPOINTS.broadcast, 'POST', {
    title,
    message,
    targetAudience,
    sendPush,
    sendSMS
  });

  btn.disabled = false;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> <span>Dispatch Broadcast Notification</span>`;

  if (res.ok) {
    playSound('success');
    toast(res.data?.message || 'Broadcast sent successfully', 'success');
    document.getElementById('broadcast-title').value = '';
    document.getElementById('broadcast-message').value = '';
    updatePushPreview();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to send broadcast', 'error');
  }
}

/* ============================================================
   AUDIT LOGS
   ============================================================ */
let allAuditLogs = [];

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="table-loading"><div class="spinner"></div><span>Loading audit logs...</span></td></tr>';

  const res = await apiRequest(ENDPOINTS.auditLogs);
  if (res.ok && res.data?.data) {
    allAuditLogs = res.data.data;
    renderAuditLogs(allAuditLogs);
  } else {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Failed to load audit logs</td></tr>';
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No audit logs found</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const date = l.createdAt ? new Date(l.createdAt).toLocaleString() : '—';
    const actionBadge = l.action.includes('APPROVE') ? 'badge-approved' : l.action.includes('REJECT') || l.action.includes('BAN') ? 'badge-rejected' : 'badge-pending';
    const jsonStr = l.details ? JSON.stringify(l.details).replace(/"/g, '&quot;') : '';

    return `
      <tr>
        <td style="font-size:12px;color:var(--text-muted);">${date}</td>
        <td><strong>${l.adminName||'Admin'}</strong><div style="font-size:11px;color:var(--text-muted);">${l.adminEmail||''}</div></td>
        <td><span class="status-badge ${actionBadge}">${l.action}</span></td>
        <td><strong>${l.targetEntity||'—'}</strong> <span style="font-size:11px;color:var(--text-muted);">${l.targetId||''}</span></td>
        <td style="font-family:monospace;font-size:12px;">${l.ipAddress||'—'}</td>
        <td>
          ${l.details ? `
            <button class="btn-sm btn-approve" onclick="alert('${jsonStr}')">View Details</button>
          ` : '<span style="font-size:12px;color:var(--text-muted);">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function filterAuditLogs() {
  const query = document.getElementById('audit-search')?.value?.toLowerCase() || '';
  if (!query) {
    renderAuditLogs(allAuditLogs);
    return;
  }
  const filtered = allAuditLogs.filter(l => 
    (l.adminName || '').toLowerCase().includes(query) ||
    (l.adminEmail || '').toLowerCase().includes(query) ||
    (l.action || '').toLowerCase().includes(query) ||
    (l.targetEntity || '').toLowerCase().includes(query)
  );
  renderAuditLogs(filtered);
}

/* ============================================================
   SYSTEM SETTINGS
   ============================================================ */
async function loadSystemSettings() {
  const res = await apiRequest(ENDPOINTS.settings);
  if (res.ok && res.data?.data) {
    const s = res.data.data;
    if (s.platformCommissionFee !== undefined) document.getElementById('setting-commission').value = s.platformCommissionFee;
    if (s.maxSearchRadiusKm !== undefined) document.getElementById('setting-radius').value = s.maxSearchRadiusKm;
    if (s.supportPhone) document.getElementById('setting-phone').value = s.supportPhone;
    if (s.supportEmail) document.getElementById('setting-email').value = s.supportEmail;
    if (s.maintenanceMode !== undefined) document.getElementById('setting-maintenance').checked = Boolean(s.maintenanceMode);
    if (s.soundEffectsEnabled !== undefined) {
      document.getElementById('setting-sound').checked = Boolean(s.soundEffectsEnabled);
      soundMuted = !Boolean(s.soundEffectsEnabled);
      updateSoundToggleButton();
    }
  }
}

async function handleSaveSystemSettings(e) {
  e.preventDefault();
  const platformCommissionFee = Number(document.getElementById('setting-commission').value);
  const maxSearchRadiusKm = Number(document.getElementById('setting-radius').value);
  const supportPhone = document.getElementById('setting-phone').value.trim();
  const supportEmail = document.getElementById('setting-email').value.trim();
  const maintenanceMode = document.getElementById('setting-maintenance').checked;
  const soundEffectsEnabled = document.getElementById('setting-sound').checked;

  soundMuted = !soundEffectsEnabled;
  localStorage.setItem('servefamily_sound_muted', soundMuted ? 'true' : 'false');
  updateSoundToggleButton();

  const btn = document.getElementById('btn-save-settings');
  btn.disabled = true;

  const res = await apiRequest(ENDPOINTS.settings, 'PATCH', {
    platformCommissionFee,
    maxSearchRadiusKm,
    supportPhone,
    supportEmail,
    maintenanceMode,
    soundEffectsEnabled
  });

  btn.disabled = false;

  if (res.ok) {
    playSound('success');
    toast('System settings saved successfully', 'success');
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to save system settings', 'error');
  }
}

/* ─── Edit & Delete Driver Functions ─────────────────────────────────────────── */
async function openEditDriverModal(vehicleId) {
  try {
    let v = (allRegistrations || []).find(item => String(item.id) === String(vehicleId)) || 
            (allTaxis || []).find(item => String(item.id) === String(vehicleId));
    
    if (!v && vehicleId) {
      const res = await apiRequest(`/api/admin/taxi/vehicles/${vehicleId}`);
      if (res.ok && res.data?.data) {
        v = res.data.data;
      }
    }

    if (!v) {
      toast('Vehicle / Driver record not found', 'error');
      return;
    }

    if (!Array.isArray(allVehicleTypes) || !allVehicleTypes.length) {
      const res = await apiRequest('/api/admin/taxi/vehicle-types');
      if (res.ok && Array.isArray(res.data?.data)) {
        allVehicleTypes = res.data.data;
      } else if (res.ok && Array.isArray(res.data)) {
        allVehicleTypes = res.data;
      }
    }

    const vtypeSelect = document.getElementById('edit-driver-vtype');
    if (vtypeSelect) {
      vtypeSelect.innerHTML = (allVehicleTypes || []).map(vt => 
        `<option value="${vt.id}" ${String(vt.id) === String(v.vehicleTypeId) ? 'selected' : ''}>${vt.type} (${vt.category === 'transport' ? 'Goods Transport' : 'Passenger Hire'})</option>`
      ).join('');
    }

    const docs = v.driver?.documents || v.documents || [];
    const nicDoc = docs.find(d => d.documentType === 'NIC') || {};
    const licDoc = docs.find(d => d.documentType === 'DrivingLicense') || {};

    const cleanName = v.driver?.name || getDriverName(v);
    const cleanMobile = v.mobileNum || v.driver?.phoneNumber || '';
    const cleanEmail = v.driver?.email || (getEmail(v) === '—' ? '' : getEmail(v));

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    setVal('edit-driver-vehicle-id', v.id || vehicleId);
    setVal('edit-driver-name', cleanName !== 'Unknown Driver' ? cleanName : '');
    setVal('edit-driver-mobile', cleanMobile !== '—' ? cleanMobile : '');
    setVal('edit-driver-email', cleanEmail);
    setVal('edit-driver-plate', v.vehicleRegNum || '');
    setVal('edit-driver-color', v.color || '');
    setVal('edit-driver-base-address', v.baseAddress || '');

    setVal('edit-driver-nic-no', nicDoc.documentNumber || '');
    setVal('edit-driver-nic-front', nicDoc.frontUrl || '');
    setVal('edit-driver-nic-back', nicDoc.backUrl || '');

    setVal('edit-driver-license-no', licDoc.documentNumber || '');
    setVal('edit-driver-license-front', licDoc.frontUrl || '');
    setVal('edit-driver-license-back', licDoc.backUrl || '');

    openModalDirect('modal-edit-driver');
  } catch (err) {
    console.error("Error in openEditDriverModal:", err);
    toast('Error opening Edit Modal: ' + err.message, 'error');
  }
}

async function handleSaveEditDriver(e) {
  if (e && e.preventDefault) e.preventDefault();
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const vehicleId = getVal('edit-driver-vehicle-id');
  if (!vehicleId) return;

  const driverName = getVal('edit-driver-name');
  const mobileNum = getVal('edit-driver-mobile');
  const email = getVal('edit-driver-email');
  const vehicleRegNum = getVal('edit-driver-plate');
  const color = getVal('edit-driver-color');
  const vehicleTypeId = getVal('edit-driver-vtype');
  const baseAddress = getVal('edit-driver-base-address');

  const nicNumber = getVal('edit-driver-nic-no');
  const nicFrontUrl = getVal('edit-driver-nic-front');
  const nicBackUrl = getVal('edit-driver-nic-back');

  const licenseNumber = getVal('edit-driver-license-no');
  const licenseFrontUrl = getVal('edit-driver-license-front');
  const licenseBackUrl = getVal('edit-driver-license-back');

  const btn = document.getElementById('btn-save-edit-driver');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving Changes...';
  }

  const res = await apiRequest(`/api/admin/taxi/vehicles/${vehicleId}`, 'PATCH', {
    driverName,
    mobileNum,
    email,
    vehicleRegNum,
    color,
    vehicleTypeId,
    baseAddress,
    nicNumber,
    nicFrontUrl,
    nicBackUrl,
    licenseNumber,
    licenseFrontUrl,
    licenseBackUrl
  });

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Save Driver & Documents';
  }

  if (res.ok) {
    playSound('success');
    toast('Driver details & verification documents updated successfully', 'success');
    closeModalDirect('modal-edit-driver');
    await fetchRegistrations();
    if (typeof renderApprovalCards === 'function') renderApprovalCards();
    if (typeof renderTable === 'function') renderTable();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to update driver details', 'error');
  }
}

async function deleteDriverAction(vehicleId, driverName) {
  if (!confirm(`Are you sure you want to PERMANENTLY DELETE driver "${driverName}" and their vehicle/document records? This action cannot be undone.`)) {
    return;
  }

  const res = await apiRequest(`/api/admin/taxi/vehicles/${vehicleId}`, 'DELETE');
  if (res.ok) {
    playSound('success');
    toast(`Driver "${driverName}" deleted successfully`, 'success');
    await fetchRegistrations();
    await loadExecutiveStats();
    if (typeof renderApprovalCards === 'function') renderApprovalCards();
    if (typeof renderTable === 'function') renderTable();
  } else {
    playSound('error');
    toast(res.data?.message || 'Failed to delete driver', 'error');
  }
}

async function openRegisterDriverModal() {
  openModalDirect('modal-register-driver');

  const form = document.getElementById('register-driver-form');
  if (form) form.reset();

  try {
    if (!Array.isArray(allVehicleTypes) || !allVehicleTypes.length) {
      console.log('[RegisterDriver] Fetching vehicle types...');
      let res = await apiRequest('/api/taxi/vehicle-types', 'GET', null, false);
      if (!res.ok || (!Array.isArray(res.data?.data) && !Array.isArray(res.data))) {
        res = await apiRequest('/api/admin/taxi/vehicle-types', 'GET', null, true);
      }
      if (res.ok && Array.isArray(res.data?.data)) {
        allVehicleTypes = res.data.data;
      } else if (res.ok && Array.isArray(res.data)) {
        allVehicleTypes = res.data;
      }
    }

    const vtypeSelect = document.getElementById('reg-driver-vtype');
    if (vtypeSelect) {
      if (Array.isArray(allVehicleTypes) && allVehicleTypes.length > 0) {
        vtypeSelect.innerHTML = allVehicleTypes.map(vt => 
          `<option value="${vt.id}">${vt.type} (${vt.category === 'transport' ? 'Goods Transport' : 'Passenger Hire'})</option>`
        ).join('');
      } else {
        vtypeSelect.innerHTML = `
          <option value="tuk">Tuk Tuk (Passenger Hire)</option>
          <option value="car">Car (Passenger Hire)</option>
          <option value="van">Van (Passenger Hire)</option>
          <option value="bike">Bike (Passenger Hire)</option>
          <option value="lorry">Lorry (Goods Transport)</option>
        `;
      }
      console.log('[RegisterDriver] Vehicle types dropdown populated successfully');
    }
  } catch (err) {
    console.error("[RegisterDriver] Error opening register driver drawer:", err);
  }
}

async function handleRegisterNewDriver(e) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('[RegisterDriver] handleRegisterNewDriver submitted');

  const getVal = id => document.getElementById(id)?.value?.trim() || '';

  const driverName = getVal('reg-driver-name');
  const mobileNum = getVal('reg-driver-mobile');
  const email = getVal('reg-driver-email');
  const vehicleRegNum = getVal('reg-driver-plate');
  const color = getVal('reg-driver-color');
  const vehicleTypeId = document.getElementById('reg-driver-vtype')?.value || '';
  const baseAddress = getVal('reg-driver-base-address');

  const nicNumber = getVal('reg-driver-nic-no');
  const nicFrontUrl = getVal('reg-driver-nic-front');
  const nicBackUrl = getVal('reg-driver-nic-back');

  const licenseNumber = getVal('reg-driver-license-no');
  const licenseFrontUrl = getVal('reg-driver-license-front');
  const licenseBackUrl = getVal('reg-driver-license-back');

  console.log('[RegisterDriver] Payload:', { driverName, mobileNum, email, vehicleRegNum, color, vehicleTypeId, baseAddress });

  if (!driverName || !mobileNum || !vehicleRegNum) {
    console.warn('[RegisterDriver] Missing required fields!');
    toast('Please fill in required fields: Driver Name, Mobile Number, and Plate Number', 'warning');
    return;
  }

  const btn = document.getElementById('btn-submit-register-driver');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Registering Driver...';
  }

  try {
    const res = await apiRequest('/api/admin/taxi/vehicles/register', 'POST', {
      driverName,
      mobileNum,
      email,
      vehicleRegNum,
      color,
      vehicleTypeId,
      baseAddress,
      nicNumber,
      nicFrontUrl,
      nicBackUrl,
      licenseNumber,
      licenseFrontUrl,
      licenseBackUrl
    });

    console.log('[RegisterDriver] Response from server:', res);

    if (res.ok) {
      playSound('success');
      toast(`Driver "${driverName}" registered & approved successfully`, 'success');
      closeModalDirect('modal-register-driver');
      const form = document.getElementById('register-driver-form');
      if (form) form.reset();
      await loadTaxiManage();
      if (typeof fetchRegistrations === 'function') await fetchRegistrations();
      if (typeof loadExecutiveStats === 'function') await loadExecutiveStats();
      if (typeof renderApprovalCards === 'function') renderApprovalCards();
      if (typeof renderTable === 'function') renderTable();
    } else {
      playSound('error');
      toast(res.data?.message || 'Failed to register driver', 'error');
    }
  } catch (err) {
    console.error('[RegisterDriver] Exception during submit:', err);
    playSound('error');
    toast('Error registering driver: ' + (err.message || 'Server network error'), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Register & Approve Driver';
    }
  }
}

window.openEditDriverModal = openEditDriverModal;
window.handleSaveEditDriver = handleSaveEditDriver;
window.deleteDriverAction = deleteDriverAction;
window.openRegisterDriverModal = openRegisterDriverModal;
window.handleRegisterNewDriver = handleRegisterNewDriver;
window.handleSaveEditDriverFromViewModal = handleSaveEditDriverFromViewModal;

window.handleSendBroadcast = handleSendBroadcast;
window.updatePushPreview = updatePushPreview;
window.applyBroadcastTemplate = applyBroadcastTemplate;
window.updateBroadcastAudienceBadge = updateBroadcastAudienceBadge;
window.openCircleDetailsModal = openCircleDetailsModal;
window.openAllCirclesMap = openAllCirclesMap;

/* ============================================================
   SRI LANKA SERVICE COVERAGE ZONES
   ============================================================ */

const DEFAULT_SRI_LANKA_ZONES = [
  {
    id: "western_province",
    name: "Western Province (Colombo, Gampaha, Kalutara)",
    type: "province",
    lat: 6.9271,
    lng: 79.9612,
    radiusKm: 45,
    isCovered: true,
    description: "Western Province commercial hub (Colombo, Gampaha, Negombo, Kalutara)"
  },
  {
    id: "central_province",
    name: "Central Province (Kandy, Matale, Nuwara Eliya)",
    type: "province",
    lat: 7.2906,
    lng: 80.6337,
    radiusKm: 45,
    isCovered: true,
    description: "Central Highlands (Kandy, Peradeniya, Matale, Nuwara Eliya)"
  },
  {
    id: "southern_province",
    name: "Southern Province (Galle, Matara, Hambantota)",
    type: "province",
    lat: 6.0535,
    lng: 80.4500,
    radiusKm: 55,
    isCovered: true,
    description: "Southern coastal and commercial belt (Galle, Matara, Weligama, Tangalle)"
  },
  {
    id: "north_western",
    name: "North Western Province (Kurunegala, Puttalam)",
    type: "province",
    lat: 7.6500,
    lng: 80.1000,
    radiusKm: 55,
    isCovered: false,
    description: "Wayamba region (Kurunegala, Kuliyapitiya, Chilaw, Puttalam)"
  },
  {
    id: "sabaragamuwa",
    name: "Sabaragamuwa Province (Ratnapura, Kegalle)",
    type: "province",
    lat: 6.8000,
    lng: 80.4000,
    radiusKm: 45,
    isCovered: false,
    description: "Gem city and rubber basin (Ratnapura, Kegalle, Mawanella)"
  },
  {
    id: "eastern_province",
    name: "Eastern Province (Trincomalee, Batticaloa, Ampara)",
    type: "province",
    lat: 7.8500,
    lng: 81.5000,
    radiusKm: 75,
    isCovered: false,
    description: "Eastern coastal strip (Trincomalee, Batticaloa, Ampara, Arugam Bay)"
  },
  {
    id: "northern_province",
    name: "Northern Province (Jaffna, Kilinochchi, Vavuniya, Mannar)",
    type: "province",
    lat: 9.2000,
    lng: 80.3000,
    radiusKm: 75,
    isCovered: false,
    description: "Northern peninsula and mainland (Jaffna, Vavuniya, Mannar)"
  },
  {
    id: "north_central",
    name: "North Central Province (Anuradhapura, Polonnaruwa)",
    type: "province",
    lat: 8.2000,
    lng: 80.6000,
    radiusKm: 65,
    isCovered: false,
    description: "Ancient kingdoms and agricultural heartland"
  },
  {
    id: "uva_province",
    name: "Uva Province (Badulla, Monaragala)",
    type: "province",
    lat: 6.9000,
    lng: 81.2000,
    radiusKm: 55,
    isCovered: false,
    description: "Tea country and valleys (Ella, Bandarawela, Badulla)"
  },
  {
    id: "cmb_airport_hub",
    name: "Bandaranaike International Airport (CMB) Corridor",
    type: "custom",
    lat: 7.1808,
    lng: 79.8841,
    radiusKm: 25,
    isCovered: true,
    description: "Katunayake Airport express & tourist pick-up zone"
  },
  {
    id: "galle_fort_hub",
    name: "Galle Fort & Unawatuna Coastal Hub",
    type: "custom",
    lat: 6.0329,
    lng: 80.2168,
    radiusKm: 18,
    isCovered: true,
    description: "High tourist traffic historical fort and surrounding beaches"
  },
  {
    id: "kandy_city_hub",
    name: "Kandy City & Peradeniya Urban Hub",
    type: "custom",
    lat: 7.2906,
    lng: 80.6337,
    radiusKm: 20,
    isCovered: true,
    description: "Metropolitan perimeter and city limits"
  }
];

let allCoverageZones = [...DEFAULT_SRI_LANKA_ZONES];
let coverageMap = null;
let coverageMarkers = [];
let covCurrentFilter = 'all';

// Interactive Circle Drawing State
let isDrawingCircle = false;
let circleDrawStep = 0; // 0: inactive, 1: center pick, 2: radius adjust
let circleDrawCenter = null; // [lng, lat]
let circleDrawCenterMarker = null;
let circleDrawRadiusKm = 15;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function ensureDrawPreviewLayers() {
  if (!coverageMap) return;
  const previewSourceId = 'draw-preview-source';
  const previewFillId = 'draw-preview-fill';
  const previewLineId = 'draw-preview-line';
  const previewRadiusLineId = 'draw-preview-radius-line';

  if (!coverageMap.getSource(previewSourceId)) {
    coverageMap.addSource(previewSourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    coverageMap.addLayer({
      id: previewFillId,
      type: 'fill',
      source: previewSourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#6366F1',
        'fill-opacity': 0.35
      }
    });

    coverageMap.addLayer({
      id: previewLineId,
      type: 'line',
      source: previewSourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': '#4F46E5',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });

    coverageMap.addLayer({
      id: previewRadiusLineId,
      type: 'line',
      source: previewSourceId,
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#312E81',
        'line-width': 2.5,
        'line-dasharray': [2, 2]
      }
    });
  }
}

function toggleCircleDrawMode() {
  if (isDrawingCircle) {
    cancelCircleDrawMode();
  } else {
    startCircleDrawMode();
  }
}

function startCircleDrawMode() {
  if (!coverageMap) {
    initCoverageMap();
  }
  isDrawingCircle = true;
  circleDrawStep = 1;
  circleDrawCenter = null;
  if (circleDrawCenterMarker) {
    try { circleDrawCenterMarker.remove(); } catch(e){}
    circleDrawCenterMarker = null;
  }

  ensureDrawPreviewLayers();

  const banner = document.getElementById('coverage-draw-banner');
  const bannerTitle = document.getElementById('draw-banner-title');
  const bannerText = document.getElementById('draw-banner-text');
  const drawBtn = document.getElementById('btn-draw-circle');
  const drawBtnText = document.getElementById('btn-draw-circle-text');
  const mapContainer = document.getElementById('coverage-map');

  if (banner) banner.style.display = 'flex';
  if (bannerTitle) bannerTitle.innerText = 'Circle Drawing Active';
  if (bannerText) bannerText.innerText = 'Step 1: Click anywhere on the map to set the circle center point.';
  if (drawBtn) drawBtn.classList.add('btn-draw-active');
  if (drawBtnText) drawBtnText.innerText = 'Cancel Drawing';
  if (mapContainer) mapContainer.classList.add('map-drawing-mode');
  if (coverageMap) coverageMap.getCanvas().style.cursor = 'crosshair';

  if (coverageMap && coverageMap.getSource('draw-preview-source')) {
    coverageMap.getSource('draw-preview-source').setData({ type: 'FeatureCollection', features: [] });
  }

  toast('Circle Drawing Mode activated! Click map to set center.', 'info');
}

function cancelCircleDrawMode() {
  isDrawingCircle = false;
  circleDrawStep = 0;
  circleDrawCenter = null;
  if (circleDrawCenterMarker) {
    try { circleDrawCenterMarker.remove(); } catch(e){}
    circleDrawCenterMarker = null;
  }

  const banner = document.getElementById('coverage-draw-banner');
  const drawBtn = document.getElementById('btn-draw-circle');
  const drawBtnText = document.getElementById('btn-draw-circle-text');
  const mapContainer = document.getElementById('coverage-map');

  if (banner) banner.style.display = 'none';
  if (drawBtn) drawBtn.classList.remove('btn-draw-active');
  if (drawBtnText) drawBtnText.innerText = 'Draw Circle on Map';
  if (mapContainer) mapContainer.classList.remove('map-drawing-mode');
  if (coverageMap) coverageMap.getCanvas().style.cursor = '';

  if (coverageMap && coverageMap.getSource('draw-preview-source')) {
    coverageMap.getSource('draw-preview-source').setData({ type: 'FeatureCollection', features: [] });
  }
}

function createGeoJSONCircleFeature(centerLngLat, radiusInKm, properties = {}, points = 64) {
  const lng = centerLngLat[0];
  const lat = centerLngLat[1];
  const distanceX = radiusInKm / (111.320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;
  const coords = [];

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: "Feature",
    properties: properties,
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    }
  };
}

async function loadCoverageZones() {
  const listEl = document.getElementById('coverage-zones-list');
  if (listEl) {
    listEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading Sri Lanka coverage zones...</span></div>';
  }

  try {
    const res = await apiRequest(ENDPOINTS.coverageZones);
    if (res.ok && res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      allCoverageZones = res.data.data;
    } else {
      console.warn("⚠️ Coverage zones empty or not returned, using defaults");
      if (!allCoverageZones || allCoverageZones.length === 0) {
        allCoverageZones = [...DEFAULT_SRI_LANKA_ZONES];
      }
    }
  } catch (err) {
    console.error("❌ Exception loading coverage zones:", err);
    if (!allCoverageZones || allCoverageZones.length === 0) {
      allCoverageZones = [...DEFAULT_SRI_LANKA_ZONES];
    }
  }

  updateCoverageKPIs();
  renderCoverageList();
  if (!coverageMap) {
    initCoverageMap();
  } else {
    coverageMap.resize();
    renderCoverageOverlays();
  }
}

function updateCoverageKPIs() {
  const total = allCoverageZones.length;
  const active = allCoverageZones.filter(z => z.isCovered).length;
  const inactive = total - active;

  const elTotal = document.getElementById('cov-total-zones');
  const elActive = document.getElementById('cov-active-zones');
  const elInactive = document.getElementById('cov-inactive-zones');
  const badge = document.getElementById('coverage-badge');

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elInactive) elInactive.textContent = inactive;
  if (badge) {
    badge.textContent = `${active} Active`;
    badge.style.background = active > 0 ? '#10B981' : '#64748B';
  }
}

function renderCoverageList() {
  const listEl = document.getElementById('coverage-zones-list');
  if (!listEl) return;

  const searchTerm = (document.getElementById('cov-search-input')?.value || '').toLowerCase().trim();

  let filtered = allCoverageZones;
  if (covCurrentFilter === 'covered') {
    filtered = filtered.filter(z => z.isCovered);
  } else if (covCurrentFilter === 'notcovered') {
    filtered = filtered.filter(z => !z.isCovered);
  }

  if (searchTerm) {
    filtered = filtered.filter(z => 
      z.name.toLowerCase().includes(searchTerm) || 
      (z.description && z.description.toLowerCase().includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="padding:28px 16px;text-align:center;color:#94a3b8;font-size:13px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;opacity:0.5;display:block;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        No coverage zones match criteria
      </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(zone => {
    const isCov = zone.isCovered === true;
    const isCustom = zone.type === 'custom' || String(zone.id).startsWith('custom_');
    const statusColor = isCov ? '#10B981' : '#64748B';
    const statusBg = isCov ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.10)';
    const statusLabel = isCov ? 'Covered' : 'Not Covered';

    return `
      <div class="cov-zone-card ${isCov ? 'zone-covered' : 'zone-inactive'}" id="zone-card-${zone.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="cursor:pointer;flex:1;min-width:0;" onclick="focusZoneOnMap('${zone.id}')" title="Click to locate on map">
            <div style="font-weight:700;font-size:13px;color:var(--text-primary);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;">
              <span>${zone.name}</span>
              ${isCustom ? '<span style="font-size:9px;padding:1px 5px;background:#EEF2FF;color:#4F46E5;border-radius:4px;font-weight:700;">CUSTOM</span>' : ''}
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">
              Radius: <strong>${zone.radiusKm} km</strong> &bull; Center: [${zone.lat.toFixed(2)}, ${zone.lng.toFixed(2)}]
            </div>
          </div>
          <label class="switch-toggle" style="margin:0;cursor:pointer;flex-shrink:0;" title="Toggle coverage status">
            <input type="checkbox" ${isCov ? 'checked' : ''} onchange="toggleZoneCoverage('${zone.id}')" />
            <span class="slider round"></span>
          </label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid #f1f5f9;">
          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${statusBg};color:${statusColor};">
            <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>
            ${statusLabel}
          </span>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn-sm" style="padding:3px 10px;font-size:11px;font-weight:600;border:none;background:#EEF2FF;color:#4F46E5;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" onclick="focusZoneOnMap('${zone.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              Locate
            </button>
            ${isCustom ? `
              <button class="btn-sm" style="padding:3px 7px;font-size:11px;font-weight:600;border:none;background:#FEE2E2;color:#DC2626;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;" onclick="deleteCoverageZone('${zone.id}')" title="Delete custom zone">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterCoverageList() {
  renderCoverageList();
}

function filterCovType(type) {
  covCurrentFilter = type;
  document.querySelectorAll('#cov-filter-all, #cov-filter-covered, #cov-filter-notcovered').forEach(b => b.classList.remove('active'));
  document.getElementById(`cov-filter-${type}`)?.classList.add('active');
  renderCoverageList();
}

function initCoverageMap() {
  if (typeof mapboxgl === 'undefined' && typeof maplibregl === 'undefined') {
    console.error("❌ MapLibre GL is not loaded");
    return;
  }
  const gl = window.mapboxgl || window.maplibregl;
  const container = document.getElementById('coverage-map');
  if (!container) return;

  if (coverageMap) {
    coverageMap.resize();
    renderCoverageOverlays();
    return;
  }

  coverageMap = new gl.Map({
    container: 'coverage-map',
    style: typeof getAdminMapStyle === 'function' ? getAdminMapStyle() : DEFAULT_ADMIN_MAP_STYLE,
    center: [80.7718, 7.8731], // Center of Sri Lanka
    zoom: 7.2
  });

  coverageMap.addControl(new gl.NavigationControl({ showCompass: true }), 'top-right');

  coverageMap.on('load', () => {
    coverageMap.resize();
    renderCoverageOverlays();
  });

  coverageMap.on('style.load', () => {
    renderCoverageOverlays();
  });

  // Interactive circle drawing mouse movement (dynamic radius preview)
  coverageMap.on('mousemove', (e) => {
    if (!isDrawingCircle || circleDrawStep !== 2 || !circleDrawCenter) return;

    ensureDrawPreviewLayers();

    const currentDist = getDistanceFromLatLonInKm(
      circleDrawCenter[1], circleDrawCenter[0],
      e.lngLat.lat, e.lngLat.lng
    );
    const radiusKm = Math.max(1, Math.round(currentDist * 10) / 10);
    circleDrawRadiusKm = radiusKm;

    const radiusInput = document.getElementById('custom-zone-radius');
    if (radiusInput) radiusInput.value = radiusKm;

    const bannerText = document.getElementById('draw-banner-text');
    if (bannerText) {
      bannerText.innerHTML = `Live Radius: <strong style="color:#A5B4FC;font-size:13px;">${radiusKm} km</strong> &bull; Click to set & save this zone!`;
    }

    const src = coverageMap.getSource('draw-preview-source');
    if (src) {
      const circleFeature = createGeoJSONCircleFeature(circleDrawCenter, radiusKm, { isPreview: true });
      const radiusLineFeature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            circleDrawCenter,
            [e.lngLat.lng, e.lngLat.lat]
          ]
        },
        properties: { isRadiusLine: true }
      };
      src.setData({
        type: 'FeatureCollection',
        features: [circleFeature, radiusLineFeature]
      });
    }
  });

  // Click on map: handles circle drawing workflow or coordinate picking
  coverageMap.on('click', (e) => {
    if (isDrawingCircle) {
      if (circleDrawStep === 1) {
        // Step 1: Center chosen
        circleDrawCenter = [e.lngLat.lng, e.lngLat.lat];
        circleDrawStep = 2;
        circleDrawRadiusKm = 10;

        // Visual marker pin at circle center
        const gl = window.mapboxgl || window.maplibregl;
        const el = document.createElement('div');
        el.className = 'draw-center-pin';
        circleDrawCenterMarker = new gl.Marker({ element: el })
          .setLngLat(circleDrawCenter)
          .addTo(coverageMap);

        const latInput = document.getElementById('custom-zone-lat');
        const lngInput = document.getElementById('custom-zone-lng');
        if (latInput) latInput.value = circleDrawCenter[1].toFixed(4);
        if (lngInput) lngInput.value = circleDrawCenter[0].toFixed(4);

        const bannerTitle = document.getElementById('draw-banner-title');
        const bannerText = document.getElementById('draw-banner-text');
        if (bannerTitle) bannerTitle.innerText = 'Step 2: Adjust Radius';
        if (bannerText) bannerText.innerHTML = 'Move mouse to expand radius, then <strong>click again to finalize</strong>!';

        ensureDrawPreviewLayers();
        const src = coverageMap.getSource('draw-preview-source');
        if (src) {
          const feature = createGeoJSONCircleFeature(circleDrawCenter, circleDrawRadiusKm, { isPreview: true });
          src.setData({ type: 'FeatureCollection', features: [feature] });
        }

        playSound('click');
        return;
      } else if (circleDrawStep === 2) {
        // Step 2: Finalize circle
        const finalRadius = Math.max(1, circleDrawRadiusKm || 10);
        const centerLat = circleDrawCenter[1];
        const centerLng = circleDrawCenter[0];

        let proposedName = document.getElementById('custom-zone-name')?.value.trim();
        if (!proposedName) {
          const customCount = allCoverageZones.filter(z => z.type === 'custom' || String(z.id).startsWith('custom_')).length;
          proposedName = `Custom Zone ${customCount + 1} (${finalRadius}km)`;
        }

        let name = prompt("Enter a name for this new Coverage Zone:", proposedName);
        if (name === null || !name.trim()) {
          // If cancelled or empty, use proposed default name so drawn circle is never lost
          name = proposedName;
        }

        const newZone = {
          id: 'custom_' + Date.now(),
          name: name.trim(),
          type: 'custom',
          lat: parseFloat(centerLat.toFixed(4)),
          lng: parseFloat(centerLng.toFixed(4)),
          radiusKm: finalRadius,
          isCovered: true,
          description: `Custom service zone drawn on map (Radius: ${finalRadius}km)`
        };

        allCoverageZones.unshift(newZone);

        const nameInput = document.getElementById('custom-zone-name');
        const latInput = document.getElementById('custom-zone-lat');
        const lngInput = document.getElementById('custom-zone-lng');
        if (nameInput) nameInput.value = '';
        if (latInput) latInput.value = '';
        if (lngInput) lngInput.value = '';

        cancelCircleDrawMode();
        playSound('success');
        toast(`Custom zone "${newZone.name}" created with radius ${finalRadius} km!`, 'success');

        updateCoverageKPIs();
        renderCoverageList();
        renderCoverageOverlays();

        // Immediately fly to and focus new zone so user sees it right away
        if (coverageMap) {
          const targetZoom = finalRadius <= 15 ? 11 : (finalRadius <= 40 ? 10 : 9);
          coverageMap.flyTo({
            center: [newZone.lng, newZone.lat],
            zoom: targetZoom,
            duration: 900
          });
          setTimeout(() => {
            focusZoneOnMap(newZone.id);
          }, 350);
        }

        saveCoverageChanges();
        return;
      }
    }

    if (e.originalEvent && (e.originalEvent._handledByCoverageCircle || e.originalEvent._handledByCoveragePin)) {
      return;
    }
    const latInput = document.getElementById('custom-zone-lat');
    const lngInput = document.getElementById('custom-zone-lng');
    if (latInput && lngInput) {
      latInput.value = e.lngLat.lat.toFixed(4);
      lngInput.value = e.lngLat.lng.toFixed(4);
      toast(`Selected coordinate: [${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}]`, 'info');
    }
  });
}

function renderCoverageOverlays() {
  if (!coverageMap) return;

  // If map style is not fully loaded yet, defer until style is ready
  if (!coverageMap.isStyleLoaded()) {
    coverageMap.once('style.load', () => {
      renderCoverageOverlays();
    });
    return;
  }

  // Clear existing markers cleanly
  coverageMarkers.forEach(m => {
    try { m.remove(); } catch(e){}
  });
  coverageMarkers = [];

  const gl = window.mapboxgl || window.maplibregl;
  if (!gl) return;

  // CRITICAL: Only render ACTIVE (isCovered === true) zones on map to eliminate clutter!
  const activeZones = (allCoverageZones || []).filter(zone => zone.isCovered === true);

  // Build GeoJSON FeatureCollection for active zones only
  const features = activeZones.map(zone => {
    const isCustom = zone.type === 'custom' || String(zone.id).startsWith('custom_');
    return createGeoJSONCircleFeature([zone.lng, zone.lat], zone.radiusKm, {
      id: zone.id,
      name: zone.name,
      isCovered: true,
      isCustom: isCustom,
      radiusKm: zone.radiusKm
    });
  });

  const geojsonData = {
    type: "FeatureCollection",
    features: features
  };

  const sourceId = 'coverage-zones-source';
  const fillLayerId = 'coverage-zones-fill';
  const lineLayerId = 'coverage-zones-line';

  if (coverageMap.getSource(sourceId)) {
    coverageMap.getSource(sourceId).setData(geojsonData);
  } else {
    coverageMap.addSource(sourceId, {
      type: 'geojson',
      data: geojsonData
    });

    coverageMap.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': [
          'case',
          ['get', 'isCustom'],
          '#6366F1', // Royal Indigo for custom zones
          '#10B981'  // Emerald Green for standard active zones
        ],
        'fill-opacity': [
          'case',
          ['get', 'isCustom'],
          0.32,
          0.22
        ]
      }
    });

    coverageMap.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': [
          'case',
          ['get', 'isCustom'],
          '#4F46E5', // Deep Indigo line for custom zones
          '#059669'  // Forest green line for standard active zones
        ],
        'line-width': [
          'case',
          ['get', 'isCustom'],
          2.8,
          2.0
        ],
        'line-opacity': 0.9
      }
    });

    // Interactive click on coverage circle polygon
    coverageMap.on('click', fillLayerId, (e) => {
      if (isDrawingCircle) return; // Allow map click to draw circle without toggling
      if (e.originalEvent) {
        e.originalEvent._handledByCoverageCircle = true;
      }
      if (e.features && e.features[0]) {
        const zoneId = e.features[0].properties.id;
        toggleZoneCoverage(zoneId);
      }
    });

    // Pointer cursor on hover
    coverageMap.on('mouseenter', fillLayerId, () => {
      if (!isDrawingCircle) coverageMap.getCanvas().style.cursor = 'pointer';
    });
    coverageMap.on('mouseleave', fillLayerId, () => {
      if (!isDrawingCircle) coverageMap.getCanvas().style.cursor = '';
    });
  }

  // Ensure draw preview layers exist on map
  ensureDrawPreviewLayers();

  // Add sleek, minimal centroid dots ONLY for active zones
  activeZones.forEach(zone => {
    const isCustom = zone.type === 'custom' || String(zone.id).startsWith('custom_');
    const el = document.createElement('div');
    el.className = `coverage-map-dot active ${isCustom ? 'custom-dot' : ''}`;
    el.title = `${zone.name} (${isCustom ? 'Custom Service Area' : 'Standard Region'})`;

    const popupHtml = `
      <div style="padding:6px 8px;font-family:inherit;min-width:180px;">
        <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span>${zone.name}</span>
          ${isCustom ? '<span style="font-size:9px;padding:1px 5px;background:#EEF2FF;color:#4F46E5;border-radius:3px;font-weight:700;">CUSTOM</span>' : ''}
        </div>
        <div style="font-size:11px;color:#64748B;margin-bottom:8px;">
          Radius: <strong>${zone.radiusKm} km</strong><br/>
          Status: <strong style="color:#10B981">Covered (Active)</strong>
        </div>
        <button class="btn-sm" style="width:100%;font-size:11px;padding:5px 8px;background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;cursor:pointer;font-weight:700;" onclick="toggleZoneCoverage('${zone.id}')">
          Deactivate Zone
        </button>
        ${isCustom ? `
          <button class="btn-sm" style="width:100%;font-size:10.5px;padding:4px 8px;margin-top:5px;background:#FFF1F2;color:#E11D48;border:1px solid #FECDD3;border-radius:6px;cursor:pointer;font-weight:600;" onclick="deleteCoverageZone('${zone.id}')">
            Delete Zone
          </button>
        ` : ''}
      </div>
    `;

    const popup = new gl.Popup({ offset: 12, closeButton: true })
      .setHTML(popupHtml);

    el.onclick = (event) => {
      if (isDrawingCircle) return; // Prevent popup opening during circle drawing
      if (event) {
        event.stopPropagation();
        if (event.originalEvent) event.originalEvent._handledByCoveragePin = true;
      }
    };

    const marker = new gl.Marker({ element: el })
      .setLngLat([zone.lng, zone.lat])
      .setPopup(popup)
      .addTo(coverageMap);

    marker._zoneId = zone.id;
    coverageMarkers.push(marker);
  });
}

function focusZoneOnMap(zoneId) {
  const zone = allCoverageZones.find(z => z.id === zoneId);
  if (!zone || !coverageMap) return;

  if (!zone.isCovered) {
    toast(`"${zone.name}" is currently Inactive. Toggle its switch ON to show its circle on the map.`, 'info');
  }

  const targetZoom = zone.radiusKm <= 20 ? 11 : (zone.radiusKm <= 50 ? 9.5 : 8.5);
  coverageMap.flyTo({
    center: [zone.lng, zone.lat],
    zoom: targetZoom,
    duration: 900
  });

  // Open the marker's popup if active
  const targetMarker = coverageMarkers.find(m => m._zoneId === zoneId);
  if (targetMarker && targetMarker.togglePopup) {
    targetMarker.togglePopup();
  }

  const card = document.getElementById(`zone-card-${zone.id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    card.style.borderColor = '#6366F1';
    card.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.3)';
    setTimeout(() => {
      card.style.borderColor = '';
      card.style.boxShadow = '';
    }, 2000);
  }
}

async function toggleZoneCoverage(zoneId) {
  const zone = allCoverageZones.find(z => z.id === zoneId);
  if (!zone) return;

  const previousState = zone.isCovered;
  zone.isCovered = !zone.isCovered;
  zone.updatedAt = new Date().toISOString();

  playSound('click');
  updateCoverageKPIs();
  renderCoverageList();
  renderCoverageOverlays();

  toast(`"${zone.name}" set to ${zone.isCovered ? 'Covered (Active on Map)' : 'Not Covered (Hidden from Map)'}`, zone.isCovered ? 'success' : 'info');

  // Immediately persist change to backend
  try {
    const res = await apiRequest(ENDPOINTS.toggleCoverageZone, 'POST', {
      zoneId: zone.id,
      isCovered: zone.isCovered
    });
    if (!res.ok) {
      // Fallback: save entire array via PUT
      await apiRequest(ENDPOINTS.coverageZones, 'PUT', { zones: allCoverageZones });
    }
  } catch (err) {
    console.error("❌ Failed to auto-save zone toggle:", err);
    // Rollback if network/server failed
    zone.isCovered = previousState;
    updateCoverageKPIs();
    renderCoverageList();
    renderCoverageOverlays();
    toast(`Failed to save change for "${zone.name}". Reverted.`, 'error');
  }
}

async function toggleAllCoverage(enableCovered) {
  allCoverageZones.forEach(z => {
    z.isCovered = Boolean(enableCovered);
    z.updatedAt = new Date().toISOString();
  });

  playSound('click');
  updateCoverageKPIs();
  renderCoverageList();
  renderCoverageOverlays();

  toast(enableCovered ? 'All regions marked as Covered (Island-wide)' : 'All regions marked as Not Covered', 'info');

  try {
    const res = await apiRequest(ENDPOINTS.coverageZones, 'PUT', { zones: allCoverageZones });
    if (res.ok) {
      playSound('success');
      toast('All coverage zones successfully updated in database!', 'success');
    } else {
      toast(res.data?.message || 'Failed to save all coverage zones', 'error');
    }
  } catch (err) {
    console.error("❌ Batch coverage update error:", err);
    toast('Error updating coverage zones: ' + (err.message || 'Server error'), 'error');
  }
}

async function saveCoverageChanges() {
  try {
    const res = await apiRequest(ENDPOINTS.coverageZones, 'PUT', { zones: allCoverageZones });
    if (res.ok) {
      playSound('success');
      toast('Coverage zones successfully saved to database! /api/profile is now live.', 'success');
      updateCoverageKPIs();
    } else {
      playSound('error');
      toast(res.data?.message || 'Failed to save coverage zones', 'error');
    }
  } catch (err) {
    console.error("❌ Save Coverage Error:", err);
    playSound('error');
    toast('Error saving coverage: ' + (err.message || 'Server error'), 'error');
  }
}

function addCustomCoverageZone() {
  const nameInput = document.getElementById('custom-zone-name');
  const latInput = document.getElementById('custom-zone-lat');
  const lngInput = document.getElementById('custom-zone-lng');
  const radiusInput = document.getElementById('custom-zone-radius');

  const name = nameInput?.value.trim();
  const lat = parseFloat(latInput?.value);
  const lng = parseFloat(lngInput?.value);
  const radiusKm = parseFloat(radiusInput?.value) || 15;

  if (!name) {
    toast('Please enter a zone name', 'error');
    return;
  }
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    toast('Please enter valid coordinates or click on the map', 'error');
    return;
  }

  const newZone = {
    id: 'custom_' + Date.now(),
    name: name,
    type: 'custom',
    lat: lat,
    lng: lng,
    radiusKm: radiusKm,
    isCovered: true,
    description: `Custom service zone created by admin (Radius: ${radiusKm}km)`
  };

  allCoverageZones.unshift(newZone);

  // Clear inputs
  if (nameInput) nameInput.value = '';
  if (latInput) latInput.value = '';
  if (lngInput) lngInput.value = '';

  playSound('success');
  toast(`Custom zone "${name}" added with radius ${radiusKm}km!`, 'success');

  updateCoverageKPIs();
  renderCoverageList();
  renderCoverageOverlays();

  // Focus map on newly created zone
  if (coverageMap) {
    const targetZoom = radiusKm <= 15 ? 11 : (radiusKm <= 40 ? 10 : 9);
    coverageMap.flyTo({ center: [lng, lat], zoom: targetZoom, duration: 900 });
    setTimeout(() => {
      focusZoneOnMap(newZone.id);
    }, 350);
  }

  // Auto-save changes to backend
  saveCoverageChanges();
}

async function deleteCoverageZone(zoneId) {
  const zone = allCoverageZones.find(z => z.id === zoneId);
  if (!zone) return;

  if (!confirm(`Are you sure you want to delete coverage zone "${zone.name}"?`)) {
    return;
  }

  allCoverageZones = allCoverageZones.filter(z => z.id !== zoneId);
  playSound('trash');
  toast(`Coverage zone "${zone.name}" removed`, 'info');

  updateCoverageKPIs();
  renderCoverageList();
  renderCoverageOverlays();
  saveCoverageChanges();
}

window.loadCoverageZones = loadCoverageZones;
window.initCoverageMap = initCoverageMap;
window.renderCoverageList = renderCoverageList;
window.filterCoverageList = filterCoverageList;
window.filterCovType = filterCovType;
window.toggleZoneCoverage = toggleZoneCoverage;
window.toggleAllCoverage = toggleAllCoverage;
window.saveCoverageChanges = saveCoverageChanges;
window.addCustomCoverageZone = addCustomCoverageZone;
window.focusZoneOnMap = focusZoneOnMap;
window.toggleCircleDrawMode = toggleCircleDrawMode;
window.startCircleDrawMode = startCircleDrawMode;
window.cancelCircleDrawMode = cancelCircleDrawMode;
window.deleteCoverageZone = deleteCoverageZone;
window.openEditPlanModal = openEditPlanModal;
window.handleSavePlanDetails = handleSavePlanDetails;
window.savePlanPrice = savePlanPrice;
window.loadPlansData = loadPlansData;



