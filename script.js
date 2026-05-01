/* =====================================================
SCRIPT.JS — Mon Monde 🌍
Carte gratuite avec Leaflet — aucune clé nécessaire !
===================================================== */

/* =====================================================
🗺️ CRÉATION DE LA CARTE
===================================================== */

// On crée la carte dans l’élément HTML id=“map”
const map = L.map(‘map’, {
center: [20, 10],   // centre du monde au départ
zoom: 3,            // zoom initial (monde entier visible)
zoomControl: false  // on va mettre les boutons zoom ailleurs
});

// Les “tuiles” = les images de la carte (OpenStreetMap, gratuit !)
L.tileLayer(‘https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png’, {
attribution: ‘© <a href="https://www.openstreetmap.org">OpenStreetMap</a>’,
maxZoom: 19
}).addTo(map);

// Boutons zoom en bas à droite
L.control.zoom({ position: ‘bottomright’ }).addTo(map);

// Barre de recherche (Nominatim = gratuit, sans clé)
L.Control.geocoder({
defaultMarkGeocode: false,  // on gère nous-mêmes le déplacement
placeholder: ‘🔍 Rechercher un lieu…’,
geocoder: L.Control.Geocoder.nominatim()
})
.on(‘markgeocode’, function(e) {
// Quand on choisit un résultat, la carte vole vers ce lieu
map.flyTo(e.geocode.center, 13, { duration: 1.5 });
})
.addTo(map);

/* =====================================================
💾 SAUVEGARDE (localStorage)
===================================================== */

function loadPlaces() {
const data = localStorage.getItem(‘monMondePlaces’);
return data ? JSON.parse(data) : [];
}

function savePlaces(places) {
localStorage.setItem(‘monMondePlaces’, JSON.stringify(places));
}

/* =====================================================
📍 VARIABLES GLOBALES
===================================================== */
let pendingLat = null;    // latitude du clic en attente
let pendingLng = null;    // longitude du clic en attente
let pendingPhotos = [];   // photos en attente
let currentId = null;     // id du lieu ouvert dans la modal
let markers = {};         // stocke les marqueurs {id: marker}

/* =====================================================
🖱️ CLIC SUR LA CARTE
===================================================== */
map.on(‘click’, function(e) {
pendingLat = e.latlng.lat;
pendingLng = e.latlng.lng;
document.getElementById(‘popup-add’).classList.remove(‘hidden’);
});

/* =====================================================
POPUP “AJOUTER CE LIEU ?”
===================================================== */

function closePopup() {
document.getElementById(‘popup-add’).classList.add(‘hidden’);
pendingLat = null;
pendingLng = null;
}

function openForm() {
document.getElementById(‘popup-add’).classList.add(‘hidden’);
document.getElementById(‘form-overlay’).classList.remove(‘hidden’);
// Vide le formulaire
document.getElementById(‘inp-name’).value = ‘’;
document.getElementById(‘inp-song’).value = ‘’;
document.getElementById(‘inp-photos’).value = ‘’;
document.getElementById(‘photos-preview’).innerHTML = ‘’;
pendingPhotos = [];
}

function closeForm() {
document.getElementById(‘form-overlay’).classList.add(‘hidden’);
pendingLat = null;
pendingLng = null;
}

/* =====================================================
📸 APERÇU DES PHOTOS
===================================================== */
function previewPhotos() {
const input = document.getElementById(‘inp-photos’);
const preview = document.getElementById(‘photos-preview’);
preview.innerHTML = ‘’;
pendingPhotos = [];

Array.from(input.files).forEach(file => {
const reader = new FileReader();
reader.onload = function(e) {
pendingPhotos.push(e.target.result); // stocke en base64
const img = document.createElement(‘img’);
img.src = e.target.result;
preview.appendChild(img);
};
reader.readAsDataURL(file);
});
}

/* =====================================================
💾 ENREGISTRER UN LIEU
===================================================== */
function savePlace() {
const name = document.getElementById(‘inp-name’).value.trim();
if (!name) {
alert(‘⚠️ Donne un nom à ce lieu !’);
return;
}

const place = {
id:     Date.now(),
name:   name,
song:   document.getElementById(‘inp-song’).value.trim(),
photos: […pendingPhotos],
lat:    pendingLat,
lng:    pendingLng
};

const places = loadPlaces();
places.push(place);
savePlaces(places);

addMarker(place);
renderFavList();
closeForm();
}

/* =====================================================
📌 AJOUTER UN MARQUEUR SUR LA CARTE
===================================================== */
function addMarker(place) {
// Crée une icône personnalisée avec un emoji
const icon = L.divIcon({
html: ‘<div class="my-marker">📍</div>’,
className: ‘’,
iconSize: [30, 30],
iconAnchor: [15, 30]
});

// Ajoute le marqueur sur la carte
const marker = L.marker([place.lat, place.lng], { icon: icon })
.addTo(map)
.on(‘click’, function() {
openModal(place.id);
});

markers[place.id] = marker;
}

/* =====================================================
🔍 MODAL : VOIR UN LIEU
===================================================== */
function openModal(id) {
const places = loadPlaces();
const place = places.find(p => p.id === id);
if (!place) return;

currentId = id;

document.getElementById(‘modal-name’).textContent = ’📍 ’ + place.name;
document.getElementById(‘modal-song’).textContent = place.song ? ’🎵 ’ + place.song : ‘’;

const photosDiv = document.getElementById(‘modal-photos’);
photosDiv.innerHTML = ‘’;
if (place.photos && place.photos.length > 0) {
place.photos.forEach(src => {
const img = document.createElement(‘img’);
img.src = src;
photosDiv.appendChild(img);
});
}

document.getElementById(‘modal’).classList.remove(‘hidden’);
}

function closeModal() {
document.getElementById(‘modal’).classList.add(‘hidden’);
currentId = null;
}

/* =====================================================
🗑️ SUPPRIMER UN LIEU
===================================================== */
function deletePlace() {
if (!currentId) return;
if (!confirm(‘Supprimer ce lieu définitivement ?’)) return;

// Supprime le marqueur de la carte
if (markers[currentId]) {
markers[currentId].remove();
delete markers[currentId];
}

// Supprime des données
let places = loadPlaces();
places = places.filter(p => p.id !== currentId);
savePlaces(places);

renderFavList();
closeModal();
}

/* =====================================================
❤️ PANNEAU DES FAVORIS
===================================================== */
function togglePanel() {
document.getElementById(‘panel’).classList.toggle(‘hidden’);
}

function renderFavList() {
const places = loadPlaces();
const list = document.getElementById(‘fav-list’);

if (places.length === 0) {
list.innerHTML = ‘<p class="empty-msg">🌍 Aucun lieu enregistré.<br>Clique sur la carte pour ajouter ton premier souvenir !</p>’;
return;
}

list.innerHTML = ‘’;
places.forEach(place => {
const item = document.createElement(‘div’);
item.className = ‘fav-item’;
item.innerHTML = `<div class="fav-pin">📍</div> <div> <div class="fav-name">${place.name}</div> <div class="fav-sub">${place.song || 'Aucune chanson'}</div> </div>`;
item.addEventListener(‘click’, function() {
// Vole vers le lieu sur la carte
map.flyTo([place.lat, place.lng], 13, { duration: 1.5 });
togglePanel();
setTimeout(() => openModal(place.id), 1600);
});
list.appendChild(item);
});
}

/* =====================================================
🌙 MODE SOMBRE
===================================================== */

// Tuiles pour le mode sombre (CartoDB Dark, gratuit)
const tilesLight = L.tileLayer(‘https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png’, {
attribution: ‘© OpenStreetMap’,
maxZoom: 19
});

const tilesDark = L.tileLayer(‘https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png’, {
attribution: ‘© OpenStreetMap © CartoDB’,
maxZoom: 19
});

// Ajoute les tuiles claires au départ
tilesLight.addTo(map);

function toggleDark() {
const isDark = document.body.classList.toggle(‘dark’);

if (isDark) {
map.removeLayer(tilesLight);
tilesDark.addTo(map);
document.getElementById(‘btn-dark’).textContent = ‘☀️’;
localStorage.setItem(‘darkMode’, ‘true’);
} else {
map.removeLayer(tilesDark);
tilesLight.addTo(map);
document.getElementById(‘btn-dark’).textContent = ‘🌙’;
localStorage.setItem(‘darkMode’, ‘false’);
}
}

/* =====================================================
🚀 AU CHARGEMENT DE LA PAGE
===================================================== */

// Restaure le mode sombre si activé avant
if (localStorage.getItem(‘darkMode’) === ‘true’) {
toggleDark();
}

// Charge tous les marqueurs enregistrés
loadPlaces().forEach(addMarker);

// Génère la liste des favoris
renderFavList();
