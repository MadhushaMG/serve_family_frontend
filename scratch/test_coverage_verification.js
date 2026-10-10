// Test coverage calculation and Haversine distance logic
const { calculateHaversineDistanceKm } = require('../src/modules/taxi/utils/taxiHelpers.ts');

console.log("=== Testing Coverage Haversine Formula ===");

// Colombo City Center: [6.9271, 79.8612]
// Dehiwala (approx 9 km south): [6.8480, 79.8670]
// Negombo (approx 31 km north): [7.2088, 79.8358]
// Kandy (approx 95 km away): [7.2906, 80.6337]

const colomboLat = 6.9271;
const colomboLng = 79.8612;

const distDehiwala = calculateHaversineDistanceKm(colomboLat, colomboLng, 6.8480, 79.8670);
console.log(`Colombo -> Dehiwala distance: ${distDehiwala.toFixed(2)} km`);

const distNegombo = calculateHaversineDistanceKm(colomboLat, colomboLng, 7.2088, 79.8358);
console.log(`Colombo -> Negombo distance: ${distNegombo.toFixed(2)} km`);

// Test custom zone: Negombo Airport Hub (lat: 7.1808, lng: 79.8841, radius: 15 km)
const airportZone = {
  name: "Negombo Airport Hub",
  lat: 7.1808,
  lng: 79.8841,
  radiusKm: 15,
  isCovered: true
};

const userAtKatunayake = { lat: 7.1725, lng: 79.8853 }; // Airport area (1 km away)
const distAirport = calculateHaversineDistanceKm(userAtKatunayake.lat, userAtKatunayake.lng, airportZone.lat, airportZone.lng);
const isInsideAirportZone = distAirport <= airportZone.radiusKm;
console.log(`User at Katunayake -> Airport Zone distance: ${distAirport.toFixed(2)} km. Covered: ${isInsideAirportZone}`);

if (isInsideAirportZone) {
  console.log("✅ Custom Zone Coverage Verification PASSED!");
} else {
  console.error("❌ Custom Zone Coverage Verification FAILED!");
  process.exit(1);
}
