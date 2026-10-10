import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Linking,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Mapbox from '@rnmapbox/maps';
import { fetchDirections } from '@/src/Services/serveFamilyRoadService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveBookingStore } from "@/src/store/useActiveBookingStore";
import { io, Socket } from 'socket.io-client';
import { getTaxiSocket } from '@/src/Services/TaxiSocketService';
import { calculateDistance } from '../../utils/mapUtils';
import { OSM_TILE_URL } from '../../utils/mapTileHelper';
import apiClient from '../../api/apiClient';
import { API_BASE_URL } from '../../api/axiosInstance';
import { HIRE_VEHICLE_TYPES, TRANSPORT_VEHICLE_TYPES, getVehicleIconDetails } from '../../utils/vehicleIcons';
import { RidesHistoryModal } from './RidesHistoryModal';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const LOCATION_SOCKET_URL = 'https://test.servefamily.com';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#16A34A';
const SECONDARY_BLUE = '#2563EB';
const DROP_COLOR = '#2563EB';
const SUCCESS = '#16A34A';
const TAXI_COLOR = '#16A34A';

const DEFAULT_VEHICLE_TYPES: VehicleType[] = [
  { id: "tuk_1", name: "Tuk Tuk", type: "Tuk", category: "hire", baseFare: 100, ratePerKm: 110 },
  { id: "car_1", name: "Car", type: "Car", category: "hire", baseFare: 150, ratePerKm: 160 },
  { id: "van_1", name: "Van", type: "Van", category: "hire", baseFare: 250, ratePerKm: 220 },
  { id: "bike_1", name: "Bike", type: "Bike", category: "hire", baseFare: 80, ratePerKm: 80 },
];

// ─── Polyline decoder (Google encoded format used by OSRM) ───────────────────
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const pts: { latitude: number; longitude: number }[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, res = 0;
    do { b = encoded.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += res & 1 ? ~(res >> 1) : res >> 1;
    shift = 0; res = 0;
    do { b = encoded.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += res & 1 ? ~(res >> 1) : res >> 1;
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
}

async function fetchOsrmRoute(
  waypoints: { latitude: number; longitude: number }[]
): Promise<{ coords: { latitude: number; longitude: number }[]; durationSec: number; distanceM: number } | null> {
  if (waypoints.length < 2) return null;

  const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
  const destination = `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`;

  // 1. Try Backend /api/directions endpoint first
  try {
    const res = await apiClient.get(`/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
    if (res) {
      const distKm = res.distanceKm ?? (res.distanceM ? res.distanceM / 1000 : (res.distance ? res.distance / 1000 : 0));
      const distM = res.distanceM ?? Math.round((distKm || 0) * 1000);
      const durationSec = res.durationSec ?? res.duration ?? (distKm ? Math.round((distKm / 40) * 3600) : 0);

      let coords: { latitude: number; longitude: number }[] = [];
      if (res.geometry?.coordinates) {
        coords = res.geometry.coordinates.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] }));
      } else if (res.routes?.[0]?.geometry) {
        coords = decodePolyline(res.routes[0].geometry);
      } else {
        coords = waypoints;
      }

      if (distM > 0) {
        return {
          coords,
          durationSec,
          distanceM: distM,
        };
      }
    }
  } catch (err) {
    console.warn('[Directions API] Error fetching from /api/directions, falling back to OSRM:', err);
  }

  // 2. Fallback to public OSRM router
  try {
    const coords = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LocationTrackerApp/1.0' } });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      coords: decodePolyline(route.geometry),
      durationSec: Math.round(route.duration),
      distanceM: Math.round(route.distance),
    };
  } catch {
    return null;
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface AvailableRide {
  vehicleId: string;
  vehicleRegNum: string;
  mobileNum: string;
  driverName?: string;
  driverAvatar?: string | null;
  color: string;
  estimatedFare: number;
  fullEstimatedBill?: number;
  baseFare?: number;
  ratePerKm: number;
  distance: number | null;
  latitude?: number;
  longitude?: number;
  vehicleType?: string;
  vehicleTypeId?: string;
  seats?: number;
  category?: string;
  isOnline?: boolean;
  isWaiting?: boolean;
}

interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  labelType: 'home' | 'work' | 'other';
}

interface Suggestion {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface Stop {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface VehicleType {
  id: string;
  name?: string;
  type?: string;
  category?: string;
  iconUrl?: string;
  baseFare: number;
  ratePerKm: number;
}

interface TaxiModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TaxiModal({ visible, onClose }: TaxiModalProps) {
  const insets = useSafeAreaInsets();

  // ── Drivers panel drag-to-resize snap points (75vh – 100vh) ──
  const SHEET_COLLAPSED = Math.round(height * 0.75);
  const SHEET_MID = Math.round(height * 0.875);
  const SHEET_EXPANDED = Math.round(height * 1.0);
  const sheetHeight = useSharedValue(SHEET_COLLAPSED);
  const sheetStartHeight = useSharedValue(SHEET_COLLAPSED);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const sheetPanGesture = Gesture.Pan()
    .onStart(() => {
      sheetStartHeight.value = sheetHeight.value;
    })
    .onUpdate((e) => {
      const next = sheetStartHeight.value - e.translationY;
      sheetHeight.value = Math.min(SHEET_EXPANDED, Math.max(SHEET_COLLAPSED, next));
    })
    .onEnd((e) => {
      const current = sheetHeight.value;
      const velocity = e.velocityY;
      let target = SHEET_COLLAPSED;
      if (velocity < -500) {
        target = SHEET_EXPANDED;
      } else if (velocity > 500) {
        target = SHEET_COLLAPSED;
      } else {
        const distances = [
          { p: SHEET_COLLAPSED, d: Math.abs(current - SHEET_COLLAPSED) },
          { p: SHEET_MID, d: Math.abs(current - SHEET_MID) },
          { p: SHEET_EXPANDED, d: Math.abs(current - SHEET_EXPANDED) },
        ];
        distances.sort((a, b) => a.d - b.d);
        target = distances[0].p;
      }
      sheetHeight.value = withSpring(target, { damping: 22, stiffness: 180 });
    });

  // ── booking form state ──
  const [tripType, setTripType] = useState<'oneway' | 'return'>('oneway');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);
  const [returnDestinationAddress, setReturnDestinationAddress] = useState('');
  const [returnDestinationLat, setReturnDestinationLat] = useState<number | null>(null);
  const [returnDestinationLng, setReturnDestinationLng] = useState<number | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);

  // Sync pickup and dropoff for return trips
  useEffect(() => {
    if (tripType === 'return') {
      setDropoffLat(pickupLat);
      setDropoffLng(pickupLng);
      setDropoffAddress(pickupAddress);
    }
  }, [tripType, pickupLat, pickupLng, pickupAddress]);

  // ── search / suggestions ──
  const [activeField, setActiveField] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [cachedLocations, setCachedLocations] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // ── map ──
  const cameraRef = useRef<Mapbox.Camera | null>(null);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [isGeocodingCenter, setIsGeocodingCenter] = useState(false);
  const isProgrammaticMove = useRef(false);


  // ── user location ──
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // ── favorites & history ──
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [showSaveFavoriteModal, setShowSaveFavoriteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [favNameInput, setFavNameInput] = useState('');
  const [favTypeInput, setFavTypeInput] = useState<'home' | 'work' | 'other'>('other');
  const [favTargetField, setFavTargetField] = useState<string>('pickup');

  // ── rides & routes ──
  const [isSearchingRides, setIsSearchingRides] = useState(false);
  const [availableRides, setAvailableRides] = useState<AvailableRide[]>([]);
  const [showRides, setShowRides] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AvailableRide | null>(null);
  const [tripRouteCoords, setTripRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [taxiRouteCoords, setTaxiRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [tripDurationSec, setTripDurationSec] = useState<number | null>(null);
  const [tripDrivingDistanceM, setTripDrivingDistanceM] = useState<number | null>(null);
  const [socketDistanceKm, setSocketDistanceKm] = useState<number | null>(null);
  const [taxiEtaSec, setTaxiEtaSec] = useState<number | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFieldRef = useRef<string | null>(null);
  const pendingSuggestionNameRef = useRef<string | null>(null);
  const ridesScrollViewRef = useRef<ScrollView | null>(null);
  const defaultCenter: [number, number] = [79.8612, 6.9271];

  const isValidRoute = Boolean(pickupLat && pickupLng && dropoffLat && dropoffLng);

  useEffect(() => {
    if (!visible) return;

    const socket = getTaxiSocket();
    socketRef.current = socket;

    const onAllLocationsResult = (cachedLocations: any[]) => {
      if (Array.isArray(cachedLocations) && cachedLocations.length > 0) {
        setCachedLocations(
          cachedLocations.map((loc: any) => ({
            name: loc.place_name ? loc.place_name.split(',')[0] : 'Cached Location',
            address: loc.place_name || '',
            latitude: Number(loc.latitude) || 0,
            longitude: Number(loc.longitude) || 0,
          }))
        );
      }
    };

    const onSuggestionsResult = (data: any[]) => {
      setIsSearching(false);
      if (Array.isArray(data)) {
        setSuggestions(
          data.map((item: any) => ({
            name: item.description ? item.description.split(',')[0] : (item.name || 'Location'),
            address: item.description || item.name || '',
            latitude: item.lat || 0,
            longitude: item.lng || 0,
            placeId: item.placeId,
          }))
        );
      }
    };

    const onLocationResult = (data: any) => {
      setIsSearching(false);
      if (data && data.lat && data.lng) {
        const resolvedName =
          pendingSuggestionNameRef.current ||
          data.name ||
          data.description ||
          'Selected Location';
        const targetField = activeFieldRef.current || activeField;
        applyLocation(data.lat, data.lng, resolvedName, targetField || undefined);
        pendingSuggestionNameRef.current = null;
        setShowSearchPanel(false);
        setSuggestions([]);
        setSearchText('');
      }
    };

    const onDistanceResult = (data: any) => {
      if (data) {
        const km = data.distanceKm ?? (data.distanceM ? data.distanceM / 1000 : (data.distance ? data.distance / 1000 : null));
        if (km != null && !isNaN(km) && km > 0) {
          setSocketDistanceKm(Number(km));
          setTripDrivingDistanceM(Math.round(Number(km) * 1000));
        }
      }
    };

    const onDriverLocationUpdate = (data: any) => {
      if (data && data.latitude && data.longitude) {
        useActiveBookingStore.getState().updateDriverLocation(Number(data.latitude), Number(data.longitude));
      }
    };

    const onLocationError = (msg: string) => {
      setIsSearching(false);
      pendingSuggestionNameRef.current = null;
      Alert.alert('Location Error', msg || 'Could not resolve location.');
    };

    socket.on('all_locations_result', onAllLocationsResult);
    socket.on('suggestions_result', onSuggestionsResult);
    socket.on('location_result', onLocationResult);
    socket.on('distance_result', onDistanceResult);
    socket.on('driver_location_update', onDriverLocationUpdate);
    socket.on('location_error', onLocationError);

    return () => {
      socket.off('all_locations_result', onAllLocationsResult);
      socket.off('suggestions_result', onSuggestionsResult);
      socket.off('location_result', onLocationResult);
      socket.off('distance_result', onDistanceResult);
      socket.off('driver_location_update', onDriverLocationUpdate);
      socket.off('location_error', onLocationError);
      // NOTE: Do not disconnect socket; it runs at root level
      socketRef.current = null;
    };
  }, [visible]);

  // ── vehicle types & service category (GET /api/taxi/vehicle-types) ──
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null);
  const [serviceCategory, setServiceCategory] = useState<'hire' | 'transport'>('hire');
  const [radiusKm, setRadiusKm] = useState<number>(5);

  useEffect(() => {
    if (visible) {
      loadFavorites();
      initUserLocation();
      fetchVehicleTypes();
    } else {
      resetRidesState();
      setShowSearchPanel(false);
      setSuggestions([]);
      setActiveField(null);
      activeFieldRef.current = null;
    }
  }, [visible]);

  const fetchVehicleTypes = async () => {
    try {
      const res = await apiClient.get('/taxi/vehicle-types');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setVehicleTypes(res.data);
        if (!selectedVehicleType) {
          setSelectedVehicleType(res.data[0]);
        }
      } else {
        setVehicleTypes(DEFAULT_VEHICLE_TYPES);
        if (!selectedVehicleType) {
          setSelectedVehicleType(DEFAULT_VEHICLE_TYPES[0]);
        }
      }
    } catch (err) {
      console.warn('Vehicle types fetch error:', err);
      setVehicleTypes(DEFAULT_VEHICLE_TYPES);
      if (!selectedVehicleType) {
        setSelectedVehicleType(DEFAULT_VEHICLE_TYPES[0]);
      }
    }
  };

  const resetRidesState = () => {
    setShowRides(false);
    setSelectedRide(null);
    setAvailableRides([]);
    setTripRouteCoords([]);
    setTaxiRouteCoords([]);
    setTripDurationSec(null);
    setTaxiEtaSec(null);
  };

  const initUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      isProgrammaticMove.current = true;
      cameraRef.current?.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 14.5,
        animationDuration: 500,
        padding: {
          paddingBottom: Math.round(height * 0.38),
          paddingTop: 80,
          paddingLeft: 0,
          paddingRight: 0,
        },
      });
      setPickupLat(coords.latitude);
      setPickupLng(coords.longitude);
      setPickupAddress('Current Location');
    } catch {}
  };

  const loadFavorites = async () => {
    try {
      const raw = await AsyncStorage.getItem('NEARU_FAVORITE_LOCATIONS');
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  };

  // ── autocomplete (WebSocket) ──
  const handleSearchInput = (text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim() || text.trim().length <= 2) {
      setSuggestions([]);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      setIsSearching(true);
      if (socketRef.current) {
        socketRef.current.emit('search_text', text.trim());
      }
    }, 300);
  };

  const applyLocation = (lat: number, lng: number, address: string, field?: string) => {
    const target = field ?? activeFieldRef.current ?? activeField;

    if (target === 'pickup') {
      setPickupLat(lat);
      setPickupLng(lng);
      setPickupAddress(address);
      if (tripType === 'return') {
        setDropoffLat(lat);
        setDropoffLng(lng);
        setDropoffAddress(address);
      }
    } else if (target === 'dropoff') {
      setDropoffLat(lat);
      setDropoffLng(lng);
      setDropoffAddress(address);
    } else if (target === 'returnDestination') {
      setReturnDestinationLat(lat);
      setReturnDestinationLng(lng);
      setReturnDestinationAddress(address);
    } else if (target) {
      setStops(prev => prev.map(s => s.id === target ? { ...s, latitude: lat, longitude: lng, address } : s));
    }

    // Zoom/center map with padding so marker displays slightly above center (above bottom panel card)
    isProgrammaticMove.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 15.5,
      animationDuration: 500,
      padding: {
        paddingBottom: Math.round(height * 0.38),
        paddingTop: 80,
        paddingLeft: 0,
        paddingRight: 0,
      },
    });
    setActiveField(null);
    activeFieldRef.current = null;
  };

  const handleSelectSuggestion = (item: Suggestion) => {
    const targetField = activeFieldRef.current || activeField;
    pendingSuggestionNameRef.current = item.name || item.address;

    if (item.placeId && socketRef.current) {
      setIsSearching(true);
      socketRef.current.emit('get_location', {
        placeId: item.placeId,
        description: item.address || item.name,
      });
    } else if (item.latitude && item.longitude) {
      applyLocation(item.latitude, item.longitude, item.name || item.address, targetField || undefined);
      setShowSearchPanel(false);
      setSuggestions([]);
      setSearchText('');
      pendingSuggestionNameRef.current = null;
    }
  };

  const openSearchPanel = (field: string) => {
    activeFieldRef.current = field;
    setActiveField(field);
    const currentText =
      field === 'pickup'
        ? pickupAddress
        : field === 'dropoff'
        ? dropoffAddress
        : field === 'returnDestination'
        ? returnDestinationAddress
        : stops.find(s => s.id === field)?.address ?? '';
    setSearchText(currentText);
    setSuggestions([]);
    setShowSearchPanel(true);
  };

  const handleCurrentLocation = async () => {
    if (!userLocation) return;
    const field = activeFieldRef.current ?? activeField ?? 'pickup';
    isProgrammaticMove.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [userLocation.longitude, userLocation.latitude],
      zoomLevel: 15,
      animationDuration: 400,
      padding: {
        paddingBottom: Math.round(height * 0.38),
        paddingTop: 80,
        paddingLeft: 0,
        paddingRight: 0,
      },
    });
    try {
      const [r] = await Location.reverseGeocodeAsync(userLocation);
      const name = r ? [r.name, r.street, r.city].filter(Boolean).join(', ') : 'Current Location';
      if (socketRef.current && name !== 'Current Location') {
        socketRef.current.emit('save_location', {
          name,
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        });
      }
      applyLocation(userLocation.latitude, userLocation.longitude, name, field);
    } catch { applyLocation(userLocation.latitude, userLocation.longitude, 'Current Location', field); }
  };

  const handleMapRegionChangeComplete = async (feature: any) => {
    setIsMapDragging(false);
    if (isProgrammaticMove.current) { isProgrammaticMove.current = false; return; }
    const currentTarget = activeFieldRef.current || activeField;
    if (!currentTarget || showSearchPanel || showRides) return;
    const [lng, lat] = feature.geometry.coordinates;
    setIsGeocodingCenter(true);
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const address = r ? [r.name, r.street, r.city].filter(Boolean).join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      applyLocation(lat, lng, address, currentTarget);
    } catch { applyLocation(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, currentTarget); }
    finally { setIsGeocodingCenter(false); }
  };

  const addStop = () => setStops(prev => [...prev, { id: Date.now().toString(), address: '', latitude: null, longitude: null }]);
  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id));

  // ── search rides (GET /api/taxi/available-rides) ──
  const handleSearchRides = async () => {
    const isReady = tripType === 'return'
      ? !!(pickupLat && pickupLng && returnDestinationLat && returnDestinationLng)
      : !!(pickupLat && pickupLng && dropoffLat && dropoffLng);

    if (!isReady) {
      Alert.alert('Missing locations', 'Please set all locations.');
      return;
    }

    setIsSearchingRides(true);
    try {
      const wpts = buildTripWaypoints();
      let activeDrivingDistM = tripDrivingDistanceM;
      if (wpts.length >= 2) {
        const routeResult = await fetchTripRoute(wpts);
        if (routeResult?.distanceM) {
          activeDrivingDistM = routeResult.distanceM;
        }
      }

      const ROAD_FACTOR = 1.3;
      const distance = (activeDrivingDistM != null && activeDrivingDistM > 0)
        ? (activeDrivingDistM / 1000)
        : (tripType === 'return'
            ? calculateDistance(pickupLat!, pickupLng!, returnDestinationLat!, returnDestinationLng!) * 2 * ROAD_FACTOR
            : calculateDistance(pickupLat!, pickupLng!, dropoffLat!, dropoffLng!) * ROAD_FACTOR);

      const targetDropLat = tripType === 'return' ? returnDestinationLat : dropoffLat;
      const targetDropLng = tripType === 'return' ? returnDestinationLng : dropoffLng;
      const typeParam = selectedVehicleType ? (selectedVehicleType.name || selectedVehicleType.type || 'Car') : 'Car';
      let url = `/taxi/available-rides?pickupLat=${pickupLat}&pickupLng=${pickupLng}&radiusKm=${radiusKm}&distance=${distance.toFixed(2)}&category=${encodeURIComponent(serviceCategory)}&type=${encodeURIComponent(typeParam)}&sortBy=rate`;
      if (targetDropLat && targetDropLng) {
        url += `&dropLat=${targetDropLat}&dropLng=${targetDropLng}`;
      }
      console.log('=== [TaxiAvailableRides] FETCH URL ===', url);
      const data = await apiClient.get(url);
      console.log('=== [TaxiAvailableRides] RAW API RESPONSE START ===');
      console.log(JSON.stringify(data, null, 2));
      console.log('=== [TaxiAvailableRides] RAW API RESPONSE END ===');
      if (data.success && Array.isArray(data.data)) {
        const rides: AvailableRide[] = data.data.map((item: any) => {
          const lat = item.latitude !== undefined && item.latitude !== null ? item.latitude : item.lat;
          const lng = item.longitude !== undefined && item.longitude !== null ? item.longitude : item.lng;
          const vType = typeof item.vehicleType === 'object' ? item.vehicleType?.type : (item.vehicleType || item.type || '');
          const seats = typeof item.vehicleType === 'object' ? item.vehicleType?.seats : item.seats;
          const category = typeof item.vehicleType === 'object' ? item.vehicleType?.category : item.category;

          const fullBill = item.fullEstimatedBill !== undefined && item.fullEstimatedBill !== null
            ? Number(item.fullEstimatedBill)
            : (item.estimatedFare ? Number(item.estimatedFare) : 0);

          return {
            ...item,
            fullEstimatedBill: fullBill,
            estimatedFare: fullBill > 0 ? fullBill : Number(item.estimatedFare || 0),
            latitude: lat !== undefined && lat !== null && lat !== '' ? Number(lat) : undefined,
            longitude: lng !== undefined && lng !== null && lng !== '' ? Number(lng) : undefined,
            isOnline: item.isOnline !== undefined ? Boolean(item.isOnline) : true,
            isWaiting: item.isWaiting !== undefined ? Boolean(item.isWaiting) : false,
            driverName: item.driverName || item.driver?.name || undefined,
            driverAvatar: item.driverAvatar || item.driver?.avatar || null,
            mobileNum: item.mobileNum || item.driverPhone || item.driver?.phoneNumber || '',
            vehicleType: vType,
            seats: seats,
            category: category,
          };
        });
        console.log('[TaxiAvailableRides] mapped rides:', JSON.stringify(rides, null, 2));
        setAvailableRides(rides);
        setActiveField(null);
        setShowRides(true);
        // Fetch route through all waypoints
        fetchTripRoute(buildTripWaypoints());
        // Zoom map to show all points
        fitMapToTrip(rides);
      } else {
        setAvailableRides([]);
        Alert.alert('Info', 'No drivers available matching your search criteria.');
      }
    } catch (err: any) {
      console.error('[TaxiAvailableRides] Error:', err);
      Alert.alert('Error', 'Failed to search for available drivers.');
    } finally {
      setIsSearchingRides(false);
    }
  };

  // Build ordered waypoints: pickup → stops (with coords) → dropoff/destination → return (if return trip)
  const buildTripWaypoints = () => {
    if (tripType === 'return') {
      if (!pickupLat || !pickupLng || !returnDestinationLat || !returnDestinationLng) return [];
      const validStops = stops
        .filter(s => s.latitude != null && s.longitude != null)
        .map(s => ({ latitude: s.latitude!, longitude: s.longitude! }));
      return [
        { latitude: pickupLat, longitude: pickupLng },
        ...validStops,
        { latitude: returnDestinationLat, longitude: returnDestinationLng },
        { latitude: pickupLat, longitude: pickupLng },
      ];
    } else {
      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) return [];
      const validStops = stops
        .filter(s => s.latitude != null && s.longitude != null)
        .map(s => ({ latitude: s.latitude!, longitude: s.longitude! }));
      return [
        { latitude: pickupLat, longitude: pickupLng },
        ...validStops,
        { latitude: dropoffLat, longitude: dropoffLng },
      ];
    }
  };

  const fetchTripRoute = async (waypoints: { latitude: number; longitude: number }[]) => {
    if (waypoints.length < 2) return null;
    setIsFetchingRoute(true);

    try {
      const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
      const destination = `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`;
      const data = await fetchDirections(origin, destination);

      if (data && data.geometry) {
        let coords: { latitude: number; longitude: number }[] = [];
        if (data.geometry.type === 'MultiLineString') {
          coords = data.geometry.coordinates.flat().map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
        } else if (data.geometry.type === 'LineString') {
          coords = data.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
        }

        const distanceM = (data.distanceKm || 0) * 1000;
        setTripRouteCoords(coords);
        setTripDrivingDistanceM(distanceM);
        setIsFetchingRoute(false);
        return { coords, distanceM, durationSec: Math.round((distanceM / 1000 / 30) * 3600) };
      }
    } catch (e) {
      console.log('[TaxiModal] ServeFamily fetchDirections fallback to OSRM:', e);
    }

    const result = await fetchOsrmRoute(waypoints);
    if (result) {
      setTripRouteCoords(result.coords);
      setTripDurationSec(result.durationSec);
      setTripDrivingDistanceM(result.distanceM);
    }
    setIsFetchingRoute(false);
    return result;
  };

  // Request distance calculation from socket API whenever coordinates change
  useEffect(() => {
    if (!socketRef.current) return;
    const destLat = tripType === 'return' ? returnDestinationLat : dropoffLat;
    const destLng = tripType === 'return' ? returnDestinationLng : dropoffLng;

    if (pickupLat && pickupLng && destLat && destLng) {
      socketRef.current.emit('calculate_distance', {
        originLat: pickupLat,
        originLng: pickupLng,
        destLat,
        destLng,
        pickupLat,
        pickupLng,
        dropoffLat: destLat,
        dropoffLng: destLng,
      });
    } else {
      setSocketDistanceKm(null);
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, returnDestinationLat, returnDestinationLng, tripType]);

  // Draw route preview in booking mode whenever pickup/stops/dropoff change
  const routeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (showRides) return;
    if (routeDebounce.current) clearTimeout(routeDebounce.current);
    const isReady = tripType === 'return'
      ? !!(pickupLat && pickupLng && returnDestinationLat && returnDestinationLng)
      : !!(pickupLat && pickupLng && dropoffLat && dropoffLng);

    if (!isReady) {
      setTripRouteCoords([]);
      setTripDurationSec(null);
      setTripDrivingDistanceM(null);
      return;
    }
    routeDebounce.current = setTimeout(() => {
      const wpts = buildTripWaypoints();
      if (wpts.length >= 2) fetchTripRoute(wpts);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, returnDestinationLat, returnDestinationLng, stops, showRides, tripType]);

  const fitMapToTrip = (rides: AvailableRide[]) => {
    if (!pickupLat || !pickupLng) return;
    const points = [
      { latitude: pickupLat, longitude: pickupLng },
      ...stops.filter(s => s.latitude != null && s.longitude != null).map(s => ({ latitude: s.latitude!, longitude: s.longitude! })),
    ];
    if (tripType === 'return') {
      if (returnDestinationLat && returnDestinationLng) {
        points.push({ latitude: returnDestinationLat, longitude: returnDestinationLng });
      }
    } else {
      if (dropoffLat && dropoffLng) {
        points.push({ latitude: dropoffLat, longitude: dropoffLng });
      }
    }
    points.push(...rides.filter(r => r.latitude && r.longitude).map(r => ({ latitude: r.latitude!, longitude: r.longitude! })));

    if (points.length < 2) return;
    const minLat = Math.min(...points.map(p => p.latitude));
    const maxLat = Math.max(...points.map(p => p.latitude));
    const minLng = Math.min(...points.map(p => p.longitude));
    const maxLng = Math.max(...points.map(p => p.longitude));
    isProgrammaticMove.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
      zoomLevel: 12,
      animationDuration: 600,
      padding: {
        paddingBottom: Math.round(height * 0.38),
        paddingTop: 80,
        paddingLeft: 40,
        paddingRight: 40,
      },
    });
  };

  // ── select taxi marker ──
  const handleSelectRide = async (ride: AvailableRide) => {
    setSelectedRide(ride);
    setTaxiRouteCoords([]);
    setTaxiEtaSec(null);

    // Scroll to the selected driver card in the bottom list
    const index = availableRides.findIndex(r => r.vehicleId === ride.vehicleId);
    if (index >= 0 && ridesScrollViewRef.current) {
      ridesScrollViewRef.current.scrollTo({ y: index * 140, animated: true });
    }

    if (ride.latitude && ride.longitude && pickupLat && pickupLng) {
      // Fetch taxi → pickup route (2-point, not through stops)
      const result = await fetchOsrmRoute([
        { latitude: ride.latitude, longitude: ride.longitude },
        { latitude: pickupLat, longitude: pickupLng },
      ]);
      if (result) {
        setTaxiRouteCoords(result.coords);
        setTaxiEtaSec(result.durationSec);
      } else {
        setTaxiEtaSec(ride.distance != null ? Math.round((ride.distance / 30) * 3600) : null);
      }
      // Pan map to show taxi + pickup
      isProgrammaticMove.current = true;
      cameraRef.current?.setCamera({
        centerCoordinate: [(ride.longitude + (pickupLng ?? ride.longitude)) / 2, (ride.latitude + (pickupLat ?? ride.latitude)) / 2],
        zoomLevel: 13,
        animationDuration: 500,
        padding: {
          paddingBottom: Math.round(height * 0.38),
          paddingTop: 80,
          paddingLeft: 40,
          paddingRight: 40,
        },
      });
    } else {
      setTaxiEtaSec(ride.distance != null ? Math.round((ride.distance / 30) * 3600) : null);
    }
  };

  // ── favorites ──
  const handleSaveFavorite = async () => {
    if (!favNameInput.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    const lat = favTargetField === 'pickup' ? pickupLat : (favTargetField === 'returnDestination' ? returnDestinationLat : dropoffLat);
    const lng = favTargetField === 'pickup' ? pickupLng : (favTargetField === 'returnDestination' ? returnDestinationLng : dropoffLng);
    const addr = favTargetField === 'pickup' ? pickupAddress : (favTargetField === 'returnDestination' ? returnDestinationAddress : dropoffAddress);
    if (!lat || !lng) { Alert.alert('Error', 'No location set.'); return; }
    const newFav: FavoriteLocation = { id: Date.now().toString(), name: favNameInput, address: addr, latitude: lat, longitude: lng, labelType: favTypeInput };
    const updated = [...favorites, newFav];
    setFavorites(updated);
    await AsyncStorage.setItem('NEARU_FAVORITE_LOCATIONS', JSON.stringify(updated)).catch(() => {});
    setShowSaveFavoriteModal(false);
    setFavNameInput('');
  };

  // ── book taxi ──
  const [isBooking, setIsBooking] = useState(false);

  const handleBookTaxi = async (ride: AvailableRide) => {
    const isReady = tripType === 'return'
      ? !!(pickupLat && pickupLng && returnDestinationLat && returnDestinationLng)
      : !!(pickupLat && pickupLng && dropoffLat && dropoffLng);

    if (!isReady) return;
    setIsBooking(true);

    const mappedStops = tripType === 'return'
      ? [
          ...stops.filter(s => s.latitude != null).map(s => ({
            latitude: s.latitude,
            longitude: s.longitude,
            address: s.address,
          })),
          {
            latitude: returnDestinationLat!,
            longitude: returnDestinationLng!,
            address: returnDestinationAddress,
          }
        ]
      : stops.filter(s => s.latitude != null).map(s => ({
          latitude: s.latitude,
          longitude: s.longitude,
          address: s.address,
        }));

    const distanceKm = calculateTripDistance();
    const selectedTypeId = selectedVehicleType
      ? selectedVehicleType.id
      : (ride?.vehicleTypeId || (vehicleTypes.length > 0 ? vehicleTypes[0].id : ""));

    const body = {
      pickupLat: Number(pickupLat),
      pickupLng: Number(pickupLng),
      dropoffLat: Number(tripType === 'return' ? returnDestinationLat : dropoffLat),
      dropoffLng: Number(tripType === 'return' ? returnDestinationLng : dropoffLng),
      pickupAddress: String(pickupAddress),
      dropoffAddress: String(tripType === 'return' ? returnDestinationAddress : dropoffAddress),
      distance: Number(distanceKm),
      vehicleTypeId: String(selectedTypeId),
      ...(ride?.vehicleId ? { vehicleId: ride.vehicleId } : {}),
    };
    try {
      const data = await apiClient.post('/taxi/booking', body);
      console.log('[TaxiBooking] response:', JSON.stringify(data, null, 2));

      const bookingPayload = data?.data || data;
      if (data.success || data.bookingId || data.status === 'pending' || data.data) {
        const rawId = bookingPayload?.id ?? bookingPayload?.bookingId ?? bookingPayload?._id ?? data?.bookingId ?? data?.id;
        if (rawId) {
          const finalPayload = {
            ...(bookingPayload || {}),
            id: String(rawId),
            status: bookingPayload?.status || 'pending',
            pickupAddress: String(pickupAddress),
            dropAddress: String(tripType === 'return' ? returnDestinationAddress : dropoffAddress),
            fare: bookingPayload?.fare || Math.round(Number(distanceKm) * 80 + 100),
            distance: Number(distanceKm),
          };
          await useActiveBookingStore.getState().setActiveBooking(finalPayload as any);
          console.log('✅ Active booking ID saved to store & storage:', finalPayload.id);
        }
        resetRidesState();
        onClose();
      } else {
        Alert.alert('Booking failed', data.message ?? 'Server returned an error.');
      }
    } catch (err: any) {
      console.log('[TaxiBooking] error:', err);
      Alert.alert('Booking Error', err?.message || 'Could not reach the server. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // ── helpers ──
  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}h ${m % 60}min`;
  };

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;

  const calculateTripDistance = () => {
    if (socketDistanceKm != null && socketDistanceKm > 0) {
      return socketDistanceKm;
    }
    if (tripDrivingDistanceM != null && tripDrivingDistanceM > 0) {
      return tripDrivingDistanceM / 1000;
    }
    const ROAD_FACTOR = 1.3;
    if (tripType === 'return') {
      if (!pickupLat || !pickupLng || !returnDestinationLat || !returnDestinationLng) return 0;
      let total = 0;
      let prevLat = pickupLat;
      let prevLng = pickupLng;
      stops.forEach(s => {
        if (s.latitude != null && s.longitude != null) {
          total += calculateDistance(prevLat, prevLng, s.latitude, s.longitude);
          prevLat = s.latitude;
          prevLng = s.longitude;
        }
      });
      total += calculateDistance(prevLat, prevLng, returnDestinationLat, returnDestinationLng);
      total += calculateDistance(returnDestinationLat, returnDestinationLng, pickupLat, pickupLng);
      return total * ROAD_FACTOR;
    } else {
      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) return 0;
      let total = 0;
      let prevLat = pickupLat;
      let prevLng = pickupLng;
      stops.forEach(s => {
        if (s.latitude != null && s.longitude != null) {
          total += calculateDistance(prevLat, prevLng, s.latitude, s.longitude);
          prevLat = s.latitude;
          prevLng = s.longitude;
        }
      });
      total += calculateDistance(prevLat, prevLng, dropoffLat, dropoffLng);
      return total * ROAD_FACTOR;
    }
  };

  const currentDistance = (pickupLat && pickupLng && (tripType === 'return' ? returnDestinationLat : dropoffLat))
    ? calculateTripDistance().toFixed(1)
    : null;

  const pinColor = activeField === 'pickup' ? PRIMARY : activeField === 'returnDestination' ? SUCCESS : DROP_COLOR;

  const isReady = tripType === 'return'
    ? !!(pickupLat && pickupLng && returnDestinationLat && returnDestinationLng)
    : !!(pickupLat && pickupLng && dropoffLat && dropoffLng);

  const tripRouteGeoJSON = useMemo(() => {
    if (tripRouteCoords.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: tripRouteCoords.map(c => [c.longitude, c.latitude]),
      },
    };
  }, [tripRouteCoords]);

  const taxiRouteGeoJSON = useMemo(() => {
    if (taxiRouteCoords.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: taxiRouteCoords.map(c => [c.longitude, c.latitude]),
      },
    };
  }, [taxiRouteCoords]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

        {/* ── MAP ── */}
        <Mapbox.MapView
          style={StyleSheet.absoluteFillObject}
          styleURL={Platform.OS === 'ios' ? Mapbox.StyleURL.Street : undefined}
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={false}
          localizeLabels={true}
          onRegionWillChange={() => setIsMapDragging(true)}
          onRegionDidChange={handleMapRegionChangeComplete}
        >
          {Platform.OS === 'android' && (
            <Mapbox.RasterSource id="osmTaxiTileSource" tileSize={256} tileUrlTemplates={[OSM_TILE_URL]}>
              <Mapbox.RasterLayer id="osmTaxiTileLayer" style={{ rasterOpacity: 1 }} />
            </Mapbox.RasterSource>
          )}
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: defaultCenter,
              zoomLevel: 14,
            }}
          />

          {/* User live location dot */}
          <Mapbox.UserLocation visible={true} />

          {/* Pickup → Dropoff route */}
          {tripRouteGeoJSON && (
            <Mapbox.ShapeSource id="tripRouteSource" shape={tripRouteGeoJSON}>
              <Mapbox.LineLayer
                id="tripRouteLine"
                style={{
                  lineColor: PRIMARY,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {/* Taxi → Pickup route */}
          {taxiRouteGeoJSON && (
            <Mapbox.ShapeSource id="taxiRouteSource" shape={taxiRouteGeoJSON}>
              <Mapbox.LineLayer
                id="taxiRouteLine"
                style={{
                  lineColor: '#6B7280',
                  lineWidth: 3,
                  lineDasharray: [2, 2] as any,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {/* ── PICKUP marker — always visible when coordinate set ── */}
          {pickupLat && pickupLng && (
            <Mapbox.MarkerView
              id="pickupMarker"
              coordinate={[pickupLng, pickupLat]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity onPress={() => !showRides && openSearchPanel('pickup')}>
                <View style={styles.pinWrapper}>
                  <View style={styles.startPin}>
                    <Text style={styles.pinLetter}>A</Text>
                  </View>
                  <View style={styles.pinTip} />
                </View>
              </TouchableOpacity>
            </Mapbox.MarkerView>
          )}

          {/* ── STOP markers — numbered, same purple, always visible ── */}
          {stops.map((stop, idx) =>
            stop.latitude && stop.longitude ? (
              <Mapbox.MarkerView
                key={stop.id}
                id={`stop-${stop.id}`}
                coordinate={[stop.longitude, stop.latitude]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <TouchableOpacity onPress={() => !showRides && openSearchPanel(stop.id)}>
                  <View style={styles.pinWrapper}>
                    <View style={styles.stopPin}>
                      <Text style={styles.pinNumber}>{idx + 1}</Text>
                    </View>
                    <View style={[styles.pinTip, { borderTopColor: '#7C3AED' }]} />
                  </View>
                </TouchableOpacity>
              </Mapbox.MarkerView>
            ) : null
          )}

          {/* ── DESTINATION (Turning point) marker for return trips ── */}
          {tripType === 'return' && returnDestinationLat && returnDestinationLng && (
            <Mapbox.MarkerView
              id="destinationMarker"
              coordinate={[returnDestinationLng, returnDestinationLat]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity onPress={() => !showRides && openSearchPanel('returnDestination')}>
                <View style={styles.pinWrapper}>
                  <View style={styles.destinationPin}>
                    <Text style={styles.pinLetter}>B</Text>
                  </View>
                  <View style={[styles.pinTip, { borderTopColor: SUCCESS }]} />
                </View>
              </TouchableOpacity>
            </Mapbox.MarkerView>
          )}

          {/* ── DROPOFF marker — always visible when coordinate set ── */}
          {tripType === 'oneway' && dropoffLat && dropoffLng && (
            <Mapbox.MarkerView
              id="dropoffMarker"
              coordinate={[dropoffLng, dropoffLat]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity onPress={() => !showRides && openSearchPanel('dropoff')}>
                <View style={styles.pinWrapper}>
                  <View style={styles.endPin}>
                    <Text style={styles.pinLetter}>B</Text>
                  </View>
                  <View style={[styles.pinTip, { borderTopColor: DROP_COLOR }]} />
                </View>
              </TouchableOpacity>
            </Mapbox.MarkerView>
          )}

          {/* ── TAXI markers ── */}
          {showRides && availableRides.map(ride =>
            ride.latitude && ride.longitude ? (
              <Mapbox.MarkerView
                key={ride.vehicleId}
                id={`taxi-${ride.vehicleId}`}
                coordinate={[ride.longitude, ride.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <TouchableOpacity onPress={() => handleSelectRide(ride)}>
                  <View style={styles.taxiMarkerWrap}>
                    <View style={[
                      styles.taxiMarker,
                      selectedRide?.vehicleId === ride.vehicleId && styles.taxiMarkerSelected,
                    ]}>
                      <Ionicons
                        name="car-sport"
                        size={20}
                        color={selectedRide?.vehicleId === ride.vehicleId ? '#FFF' : PRIMARY}
                      />
                    </View>
                    {ride.estimatedFare > 0 ? (
                      <View style={[
                        styles.taxiRegPill,
                        selectedRide?.vehicleId === ride.vehicleId && styles.taxiRegPillSelected,
                      ]}>
                        <Text style={[
                          styles.taxiRegText,
                          selectedRide?.vehicleId === ride.vehicleId && styles.taxiRegTextSelected,
                        ]}>
                          LKR {Math.round(ride.estimatedFare)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Mapbox.MarkerView>
            ) : null
          )}
        </Mapbox.MapView>

        {/* Center crosshair pin */}
        {activeField && !showSearchPanel && !showRides && (
          <View style={styles.centerPinWrap} pointerEvents="none">
            {isMapDragging || isGeocodingCenter
              ? <ActivityIndicator size="small" color={pinColor} style={{ marginBottom: 4 }} />
              : <View style={[styles.pinBubble, { backgroundColor: pinColor }]}>
                  <Text style={styles.pinBubbleText}>
                    {activeField === 'pickup' ? 'PICKUP' : activeField === 'returnDestination' ? 'DESTINATION' : activeField === 'dropoff' ? 'DROP' : 'STOP'}
                  </Text>
                </View>}
            <Ionicons name="location" size={44} color={pinColor} />
          </View>
        )}

        {/* ── TOP BAR ── */}
        <SafeAreaView style={styles.safeTop} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => {
                if (showRides) { resetRidesState(); return; }
                onClose();
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
            </TouchableOpacity>

            {showRides ? (
              <View style={styles.ridesCountBadge}>
                {isFetchingRoute
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <Text style={styles.ridesCountText}>
                      {availableRides.length} driver{availableRides.length !== 1 ? 's' : ''} available
                    </Text>}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.roundBtn, { backgroundColor: '#FFF', flexDirection: 'row', paddingHorizontal: 12, width: 'auto', borderRadius: 20 }]}
                onPress={() => setShowHistoryModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={18} color="#2563EB" style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>My Rides</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* ── FLOATING BUTTONS (booking mode only) ── */}
        {!showRides && (
          <>
            <TouchableOpacity
              style={[styles.laterBtn, { bottom: 280 + insets.bottom }]}
              onPress={() => Alert.alert('Schedule', 'Schedule a ride for later — coming soon.')}
            >
              <Ionicons name="time-outline" size={16} color="#1A1A1A" style={{ marginRight: 5 }} />
              <Text style={styles.laterBtnText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locateBtn, { bottom: 280 + insets.bottom }]}
              onPress={handleCurrentLocation}
            >
              <Ionicons name="locate" size={22} color={PRIMARY} />
            </TouchableOpacity>
          </>
        )}

        {/* ── LOCATE BUTTON (rides mode) ── */}
        {showRides && (
          <TouchableOpacity
            style={[styles.locateBtn, { bottom: 220 + insets.bottom }]}
            onPress={() => fitMapToTrip(availableRides)}
          >
            <Ionicons name="expand" size={20} color={PRIMARY} />
          </TouchableOpacity>
        )}

        {/* ── BOOKING BOTTOM PANEL ── */}
        {!showRides && (
          <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
            <View style={styles.tripToggleRow}>
              <TouchableOpacity style={styles.tripOption} onPress={() => setTripType('oneway')}>
                <View style={[styles.radioRing, tripType === 'oneway' && styles.radioRingOn]}>
                  {tripType === 'oneway' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.tripLabel, tripType === 'oneway' && styles.tripLabelOn]}>One way</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tripOption} onPress={() => setTripType('return')}>
                <View style={[styles.radioRing, tripType === 'return' && styles.radioRingOn]}>
                  {tripType === 'return' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.tripLabel, tripType === 'return' && styles.tripLabelOn]}>Return trip*</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.routeCard}>
              <TouchableOpacity style={styles.locationRow} onPress={() => openSearchPanel('pickup')} activeOpacity={0.75}>
                <Text style={styles.labelPickup}>PICKUP</Text>
                <Text style={[styles.locationText, !pickupAddress && styles.locationPlaceholder]} numberOfLines={1}>
                  {pickupAddress || 'Set pickup location'}
                </Text>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 8 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    initUserLocation();
                  }}
                >
                  <Ionicons name="locate" size={20} color={PRIMARY} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => { setFavTargetField('pickup'); setShowSaveFavoriteModal(true); }}>
                  <Ionicons name="heart-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>

              {stops.map((stop, idx) => (
                <React.Fragment key={stop.id}>
                  <View style={styles.routeConnector}>
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                  </View>
                  <TouchableOpacity style={styles.locationRow} onPress={() => openSearchPanel(stop.id)} activeOpacity={0.75}>
                    <Text style={styles.labelStop}>STOP {idx + 1}</Text>
                    <Text style={[styles.locationText, !stop.address && styles.locationPlaceholder]} numberOfLines={1}>
                      {stop.address || 'Add a stop'}
                    </Text>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => removeStop(stop.id)}>
                      <Ionicons name="close" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </React.Fragment>
              ))}

              {tripType === 'return' ? (
                <>
                  <View style={styles.routeConnector}>
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                    <View style={[styles.connectorDot, { backgroundColor: SUCCESS }]} />
                  </View>
                  <TouchableOpacity style={styles.locationRow} onPress={() => openSearchPanel('returnDestination')} activeOpacity={0.75}>
                    <Text style={[styles.labelDrop, { color: SUCCESS }]}>DESTINATION</Text>
                    <Text style={[styles.locationText, !returnDestinationAddress && styles.locationPlaceholder]} numberOfLines={1}>
                      {returnDestinationAddress || 'Where to first?'}
                    </Text>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={addStop}>
                      <Ionicons name="add" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  <View style={styles.routeConnector}>
                    <View style={[styles.connectorDot, { backgroundColor: SUCCESS }]} />
                    <View style={styles.connectorLine} />
                    <View style={[styles.connectorDot, { backgroundColor: DROP_COLOR }]} />
                  </View>
                  <View style={[styles.locationRow, { opacity: 0.6 }]} pointerEvents="none">
                    <Text style={styles.labelDrop}>RETURN TO</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {pickupAddress || 'Set pickup first'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.routeConnector}>
                    <View style={styles.connectorDot} />
                    <View style={styles.connectorLine} />
                    <View style={[styles.connectorDot, { backgroundColor: DROP_COLOR }]} />
                  </View>
                  <TouchableOpacity style={styles.locationRow} onPress={() => openSearchPanel('dropoff')} activeOpacity={0.75}>
                    <Text style={styles.labelDrop}>DROP</Text>
                    <Text style={[styles.locationText, !dropoffAddress && styles.locationPlaceholder]} numberOfLines={1}>
                      {dropoffAddress || 'Where are you going?'}
                    </Text>
                    <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={addStop}>
                      <Ionicons name="add" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {currentDistance && (
              <View style={styles.distancePill}>
                <Ionicons name="navigate-outline" size={13} color={PRIMARY} />
                <Text style={styles.distancePillText}>
                  {currentDistance} km{tripDurationSec !== null ? ` • ${formatDuration(tripDurationSec)}` : ''}
                </Text>
              </View>
            )}

            {/* Service Category Selector (hire vs transport) */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, marginVertical: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: serviceCategory === 'hire' ? '#FFF' : 'transparent',
                  shadowColor: serviceCategory === 'hire' ? '#000' : 'transparent',
                  shadowOpacity: serviceCategory === 'hire' ? 0.05 : 0,
                  shadowRadius: 2,
                  elevation: serviceCategory === 'hire' ? 1 : 0,
                }}
                onPress={() => setServiceCategory('hire')}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: serviceCategory === 'hire' ? PRIMARY : '#6B7280' }}>
                  🚕 Hire (Passenger)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: serviceCategory === 'transport' ? '#FFF' : 'transparent',
                  shadowColor: serviceCategory === 'transport' ? '#000' : 'transparent',
                  shadowOpacity: serviceCategory === 'transport' ? 0.05 : 0,
                  shadowRadius: 2,
                  elevation: serviceCategory === 'transport' ? 1 : 0,
                }}
                onPress={() => setServiceCategory('transport')}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: serviceCategory === 'transport' ? SECONDARY_BLUE : '#6B7280' }}>
                  📦 Transport (Cargo)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle Types Selector (right below Hire/Transport) */}
            <View style={{ marginBottom: 14, marginTop: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Select Vehicle Type ({serviceCategory === 'hire' ? 'Passenger Hire' : 'Goods Transport'})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {(serviceCategory === 'hire' ? HIRE_VEHICLE_TYPES : TRANSPORT_VEHICLE_TYPES).map((vt) => {
                  const isSelected = selectedVehicleType?.id === vt.id || selectedVehicleType?.name === vt.name;
                  const vtName = vt.name || vt.type || vt.category || 'Vehicle';
                  const dist = calculateTripDistance();
                  const estPrice = vt.baseFare + Math.round(dist * vt.ratePerKm);
                  const iconInfo = getVehicleIconDetails(vtName);

                  return (
                    <TouchableOpacity
                      key={vt.id || vt.name}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? (serviceCategory === 'hire' ? '#DCFCE7' : '#DBEAFE') : '#F9FAFB',
                        borderWidth: 2,
                        borderColor: isSelected ? (serviceCategory === 'hire' ? PRIMARY : SECONDARY_BLUE) : '#E5E7EB',
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        minWidth: 120,
                        shadowColor: isSelected ? PRIMARY : 'transparent',
                        shadowOpacity: 0.12,
                        shadowRadius: 4,
                        elevation: isSelected ? 2 : 0,
                      }}
                      onPress={() => setSelectedVehicleType(vt as any)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: isSelected ? (serviceCategory === 'hire' ? PRIMARY : SECONDARY_BLUE) : '#E5E7EB',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {iconInfo.iconFamily === 'MaterialCommunityIcons' ? (
                          <MaterialCommunityIcons name={iconInfo.iconName as any} size={20} color={isSelected ? '#FFF' : '#4B5563'} />
                        ) : (
                          <Ionicons name={iconInfo.iconName as any} size={18} color={isSelected ? '#FFF' : '#4B5563'} />
                        )}
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? (serviceCategory === 'hire' ? '#15803D' : '#1E40AF') : '#1F2937' }}>
                          {vtName}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? (serviceCategory === 'hire' ? '#166534' : '#1E3A8A') : '#6B7280', marginTop: 2 }}>
                          {dist > 0 ? `LKR ${estPrice}` : `LKR ${vt.baseFare}+`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.searchBtn, (!isValidRoute || isSearchingRides) && styles.searchBtnOff]}
              onPress={handleSearchRides}
              disabled={!isValidRoute || isSearchingRides}
            >
              {isSearchingRides
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.searchBtnText}>Search Available Drivers</Text>}
            </TouchableOpacity>

            {favorites.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
                {favorites.map(fav => (
                  <TouchableOpacity key={fav.id} style={styles.favChip}
                    onPress={() => { const f = activeField ?? 'dropoff'; applyLocation(fav.latitude, fav.longitude, fav.name, f); }}>
                    <View style={styles.favChipIcon}>
                      <Ionicons name={fav.labelType === 'home' ? 'home' : fav.labelType === 'work' ? 'briefcase' : 'location'} size={15} color={PRIMARY} />
                    </View>
                    <View>
                      <Text style={styles.favChipName}>{fav.name}</Text>
                      <Text style={styles.favChipAddr} numberOfLines={1}>{fav.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── RIDES MODE: Always display available drivers list panel at bottom matching driver_card_preview.html ── */}
        {showRides && availableRides.length > 0 && (
          <Animated.View style={[styles.ridesListPanel, sheetAnimatedStyle, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
            <GestureDetector gesture={sheetPanGesture}>
              <View style={styles.sheetHandleArea}>
                <View style={styles.sheetHandle} />
              </View>
            </GestureDetector>
            <Text style={styles.ridesListTitle}>Available Taxis ({availableRides.length})</Text>
            <ScrollView
              ref={ridesScrollViewRef}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {availableRides.map(ride => {
                const isSelected = selectedRide?.vehicleId === ride.vehicleId;
                const isOnline = ride.isOnline !== false;

                return (
                  <TouchableOpacity
                    key={ride.vehicleId}
                    activeOpacity={0.92}
                    onPress={() => handleSelectRide(ride)}
                    style={{
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      borderRadius: 24,
                      padding: 16,
                      marginBottom: 14,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? PRIMARY : '#E5E7EB',
                      shadowColor: isSelected ? PRIMARY : '#000',
                      shadowOpacity: isSelected ? 0.12 : 0.05,
                      shadowRadius: 8,
                      elevation: isSelected ? 3 : 1,
                    }}
                  >
                    {/* Status Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isOnline ? '#16A34A' : '#EF4444',
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isOnline ? '#15803D' : '#DC2626',
                          letterSpacing: 0.5,
                        }}
                      >
                        {isOnline ? 'ONLINE ● AVAILABLE' : 'OFFLINE ● CALL TO BOOK'}
                      </Text>
                    </View>

                    {/* Line 1: Driver Name (left) & Code/Reg Number (right) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                        {ride.driverAvatar ? (
                          <Image
                            source={{ uri: ride.driverAvatar }}
                            style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: '#F3F4F6',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 10,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                            }}
                          >
                            <Ionicons name="person" size={22} color="#6B7280" />
                          </View>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 }} numberOfLines={1}>
                          {ride.driverName || 'Driver'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937' }}>
                          {ride.vehicleRegNum}
                        </Text>
                      </View>
                    </View>

                    {/* Line 2: Fare on one line */}
                    {isOnline && (
                      <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                          {ride.fullEstimatedBill ? 'Total Estimated Bill' : 'Estimated Fare'}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#15803D' }}>
                          LKR {Number(ride.fullEstimatedBill || ride.estimatedFare || 0).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {/* Line 3: Other 3 data items on a single line */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '600' }} numberOfLines={1}>
                        🚘 {ride.color || 'Vehicle'}   •   {ride.vehicleType || 'Taxi'}{ride.seats ? `   •   💺 ${ride.seats} Seats` : ''}
                      </Text>
                    </View>

                    {/* OFFLINE Card Section */}
                    {!isOnline ? (
                      <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 14, padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Ionicons name="information-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B' }}>Driver is Offline</Text>
                        </View>

                        <View style={{ backgroundColor: '#FFF', padding: 10, borderRadius: 10, marginVertical: 6, borderWidth: 1, borderColor: '#FCA5A5' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937', marginBottom: 2 }}>🚗 Vehicle Details:</Text>
                          <Text style={{ fontSize: 11, color: '#4B5563' }}>• Reg Number: <Text style={{ fontWeight: '700', color: '#111827' }}>{ride.vehicleRegNum}</Text></Text>
                          <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>• Type: <Text style={{ fontWeight: '700', color: '#111827' }}>{ride.vehicleType || 'Taxi'}</Text></Text>
                          <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>• Color: <Text style={{ fontWeight: '700', color: '#111827' }}>{ride.color}</Text></Text>
                        </View>

                        <Text style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 15, marginBottom: 10 }}>
                          This driver is currently offline. Call directly to discuss trip details.
                        </Text>

                        <TouchableOpacity
                          style={{
                            backgroundColor: '#DC2626',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            borderRadius: 10,
                          }}
                          onPress={() => {
                            if (ride.mobileNum) Linking.openURL(`tel:${ride.mobileNum}`);
                            else Alert.alert('No Number', 'Driver phone number is not available.');
                          }}
                        >
                          <Ionicons name="call" size={16} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                            Call Driver ({ride.mobileNum || 'Dial'})
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* ONLINE Card Section with Stats & Book Button */
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 12 }}>
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="location-outline" size={15} color="#6B7280" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 }}>{ride.distance != null ? `${ride.distance.toFixed(1)} km` : '—'}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>Away</Text>
                          </View>
                          <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={15} color="#6B7280" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 }}>{isSelected && taxiEtaSec !== null ? formatDuration(taxiEtaSec) : (ride.distance != null ? formatDuration(Math.round((ride.distance / 30) * 3600)) : '—')}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>ETA</Text>
                          </View>
                          <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB' }} />
                          <View style={{ alignItems: 'center' }}>
                            <Ionicons name="navigate-outline" size={15} color="#6B7280" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 }}>{currentDistance ? `${currentDistance} km` : '—'}</Text>
                            <Text style={{ fontSize: 10, color: '#6B7280' }}>Trip</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: PRIMARY,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              paddingVertical: 11,
                              borderRadius: 12,
                              opacity: isBooking ? 0.7 : 1,
                            }}
                            onPress={() => handleBookTaxi(ride)}
                            disabled={isBooking}
                          >
                            {isBooking ? (
                              <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 6 }} />
                            ) : (
                              <Ionicons name="car" size={16} color="#FFF" style={{ marginRight: 6 }} />
                            )}
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
                              {isBooking ? 'Booking…' : 'Book Now'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── NO DRIVERS FALLBACK PANEL: Allow user to broadcast ride request to all drivers ── */}
        {showRides && availableRides.length === 0 && (
          <View style={[styles.ridesListPanel, { paddingBottom: Math.max(insets.bottom + 12, 16), paddingHorizontal: 20 }]}>
            <View style={{ alignItems: 'center', marginVertical: 14 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Ionicons name="car-outline" size={36} color={PRIMARY} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' }}>
                No Direct Drivers Parked Nearby
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, lineHeight: 18, paddingHorizontal: 8 }}>
                No drivers are waiting idle at this spot right now. You can broadcast your ride request directly to all active drivers in the area!
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: PRIMARY,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 14,
                marginBottom: 10,
                opacity: isBooking ? 0.7 : 1,
              }}
              onPress={() => handleBookTaxi({} as AvailableRide)}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="radio-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              )}
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>
                {isBooking ? 'Broadcasting Request…' : 'Broadcast Ride Request'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#F3F4F6',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
              }}
              onPress={() => resetRidesState()}
            >
              <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>Change Pickup / Destination</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SEARCH PANEL ── */}
        {showSearchPanel && (
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 100 }]}>
            <KeyboardAvoidingView
              style={{ flex: 1, backgroundColor: '#FFF' }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.searchOverlay}>
                <SafeAreaView style={{ flex: 1 }}>
                  <View style={styles.searchTopBar}>
                    <TouchableOpacity style={styles.roundBtn}
                      onPress={() => { setShowSearchPanel(false); setSuggestions([]); setSearchText(''); }}>
                      <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <View style={styles.searchInputBox}>
                      <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.searchInput}
                        value={searchText}
                        onChangeText={handleSearchInput}
                        placeholder={activeField === 'pickup' ? 'Search pickup location…' : activeField === 'dropoff' ? 'Search destination…' : 'Search stop location…'}
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                        returnKeyType="search"
                      />
                      {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); }}>
                          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {isSearching && (
                    <View style={styles.searchingRow}>
                      <ActivityIndicator size="small" color={PRIMARY} />
                      <Text style={styles.searchingText}>Searching places…</Text>
                    </View>
                  )}

                  <FlatList
                    data={suggestions}
                    keyExtractor={(_, i) => i.toString()}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                      <View>
                        {searchText.length < 3 && (
                          <TouchableOpacity
                            style={styles.suggRow}
                            onPress={() => {
                              setShowSearchPanel(false);
                              setSearchText('');
                              setSuggestions([]);
                              initUserLocation();
                            }}
                          >
                            <View style={[styles.suggIcon, { backgroundColor: '#DCFCE7' }]}>
                              <Ionicons name="locate" size={18} color={PRIMARY} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.suggName, { color: PRIMARY, fontWeight: '700' }]}>
                                Use Current Location
                              </Text>
                              <Text style={styles.suggAddr} numberOfLines={1}>
                                Set your location automatically using GPS
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        {favorites.length > 0 && searchText.length < 3 && (
                          <View>
                            <Text style={styles.sectionLabel}>Saved Places</Text>
                            {favorites.map(fav => (
                              <TouchableOpacity key={fav.id} style={styles.suggRow}
                                onPress={() => handleSelectSuggestion({ name: fav.name, address: fav.address, latitude: fav.latitude, longitude: fav.longitude })}>
                                <View style={[styles.suggIcon, { backgroundColor: '#EEF2FF' }]}>
                                  <Ionicons name={fav.labelType === 'home' ? 'home' : fav.labelType === 'work' ? 'briefcase' : 'star'} size={17} color={PRIMARY} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.suggName}>{fav.name}</Text>
                                  <Text style={styles.suggAddr} numberOfLines={1}>{fav.address}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        {cachedLocations.length > 0 && searchText.length < 3 && (
                          <View>
                            <Text style={styles.sectionLabel}>Recent Community Locations</Text>
                            {cachedLocations.slice(0, 5).map((loc, idx) => (
                              <TouchableOpacity key={idx} style={styles.suggRow}
                                onPress={() => handleSelectSuggestion({ name: loc.name, address: loc.address, latitude: loc.latitude, longitude: loc.longitude })}>
                                <View style={[styles.suggIcon, { backgroundColor: '#F3F4F6' }]}>
                                  <Ionicons name="time-outline" size={17} color={SECONDARY_BLUE} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.suggName}>{loc.name}</Text>
                                  <Text style={styles.suggAddr} numberOfLines={1}>{loc.address}</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        {suggestions.length > 0 && <Text style={styles.sectionLabel}>Search Results</Text>}
                      </View>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.suggRow} onPress={() => handleSelectSuggestion(item)}>
                        <View style={styles.suggIcon}>
                          <Ionicons name="location-outline" size={17} color="#6B7280" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggName}>{item.name}</Text>
                          <Text style={styles.suggAddr} numberOfLines={1}>{item.address}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </SafeAreaView>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* ── SAVE FAVORITE MODAL ── */}
        <Modal visible={showSaveFavoriteModal} transparent animationType="fade">
          <View style={styles.favModalBg}>
            <View style={styles.favModalCard}>
              <Text style={styles.favModalTitle}>Save to Favorites</Text>
              <TextInput
                style={styles.favModalInput}
                placeholder="Location name (e.g. Home, Office)"
                value={favNameInput}
                onChangeText={setFavNameInput}
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.favTypeRow}>
                {(['home', 'work', 'other'] as const).map(type => (
                  <TouchableOpacity key={type}
                    style={[styles.favTypeBtn, favTypeInput === type && styles.favTypeBtnOn]}
                    onPress={() => setFavTypeInput(type)}>
                    <Ionicons name={type === 'home' ? 'home' : type === 'work' ? 'briefcase' : 'star'} size={16} color={favTypeInput === type ? '#FFF' : '#6B7280'} />
                    <Text style={[styles.favTypeTxt, favTypeInput === type && { color: '#FFF' }]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.favModalBtns}>
                <TouchableOpacity style={styles.favCancelBtn} onPress={() => { setShowSaveFavoriteModal(false); setFavNameInput(''); }}>
                  <Text style={styles.favCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.favSaveBtn} onPress={handleSaveFavorite}>
                  <Text style={styles.favSaveTxt}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── PASSENGER RIDES HISTORY MODAL ── */}
        <RidesHistoryModal
          visible={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E5E5' },

  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 8,
    paddingBottom: 8,
  },
  roundBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },
  ridesCountBadge: {
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3,
  },
  ridesCountText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  laterBtn: {
    position: 'absolute', left: 16, bottom: 290,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },
  laterBtnText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  locateBtn: {
    position: 'absolute', right: 16, bottom: 290,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 4,
  },

  centerPinWrap: {
    position: 'absolute', left: width / 2 - 22, top: height / 2 - 310,
    alignItems: 'center', zIndex: 10,
  },
  pinBubble: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 4 },
  pinBubbleText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // ── Map markers ──
  // Pin shape: circle on top + triangle tip pointing down
  pinWrapper: { alignItems: 'center' },
  startPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: PRIMARY, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 6,
  },
  stopPin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 6,
  },
  endPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: DROP_COLOR, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: DROP_COLOR, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 6,
  },
  destinationPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SUCCESS, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: SUCCESS, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 6,
  },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: PRIMARY,
    marginTop: -1,
  },
  pinLetter: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  pinNumber: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  // Taxi markers
  taxiMarkerWrap: { alignItems: 'center' },
  taxiMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: PRIMARY,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 6,
  },
  taxiMarkerSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  taxiRegPill: {
    marginTop: 3, backgroundColor: '#FFF',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#15803D',
    minWidth: 52, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2,
  },
  taxiRegPillSelected: { backgroundColor: '#15803D', borderColor: '#15803D' },
  taxiRegText: { fontSize: 11, fontWeight: '800', color: '#15803D', letterSpacing: 0.3 },
  taxiRegTextSelected: { color: '#FFF' },

  // Booking bottom panel
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: -3 }, shadowRadius: 8, elevation: 10,
  },
  tripToggleRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tripOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  radioRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  radioRingOn: { borderColor: PRIMARY },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  tripLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tripLabelOn: { color: PRIMARY, fontWeight: '700' },
  routeCard: { backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  labelPickup: { fontSize: 11, fontWeight: '800', color: PRIMARY, width: 52, letterSpacing: 0.3 },
  labelDrop: { fontSize: 11, fontWeight: '800', color: DROP_COLOR, width: 52, letterSpacing: 0.3 },
  labelStop: { fontSize: 10, fontWeight: '800', color: '#6B7280', width: 52, letterSpacing: 0.3 },
  locationText: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '600', marginRight: 8 },
  locationPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  routeConnector: { flexDirection: 'row', alignItems: 'center', marginLeft: 52, height: 14 },
  connectorDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: PRIMARY },
  connectorLine: { flex: 1, height: 1.5, backgroundColor: '#D1D5DB', marginHorizontal: 4 },
  distancePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  distancePillText: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginLeft: 5 },
  searchBtn: { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 14, shadowColor: PRIMARY, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3 },
  searchBtnOff: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  searchBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  favRow: { paddingBottom: 4, paddingRight: 8 },
  favChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 150 },
  favChipIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  favChipName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  favChipAddr: { fontSize: 11, color: '#6B7280', maxWidth: 95 },

  // Fallback rides list (no taxi coordinates)
  ridesListPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 4, paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: -3 }, shadowRadius: 8, elevation: 10,
  },
  sheetHandleArea: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, marginBottom: 2,
  },
  sheetHandle: {
    width: 44, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB',
  },
  ridesListTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  rideListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rideCarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rideReg: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  rideColorTxt: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rideFareVal: { fontSize: 15, fontWeight: '800', color: SUCCESS },

  // Selected taxi popover
  popoverContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: -4 }, shadowRadius: 12, elevation: 12,
    zIndex: 20,
  },
  popoverHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14 },
  popoverClose: { position: 'absolute', top: 16, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  popoverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  popoverCarIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  popoverRegNum: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  popoverColor: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  popoverFareBox: { alignItems: 'flex-end' },
  popoverFareLbl: { fontSize: 11, color: '#9CA3AF' },
  popoverFareVal: { fontSize: 20, fontWeight: '800', color: SUCCESS },

  statsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 11, color: '#9CA3AF' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },

  routeLegend: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendLine: { width: 24, height: 3, borderRadius: 2 },
  legendText: { fontSize: 12, color: '#6B7280' },

  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  phoneText: { fontSize: 15, color: '#374151', fontWeight: '500' },

  popoverActions: { flexDirection: 'row', gap: 12 },
  closeBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#4B5563' },
  bookBtn: { flex: 2, flexDirection: 'row', paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY, shadowColor: PRIMARY, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 4 },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Search panel
  searchOverlay: { flex: 1, backgroundColor: '#FFF' },
  searchTopBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  searchInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginLeft: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  searchingText: { marginLeft: 10, fontSize: 14, color: '#6B7280' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  suggName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  suggAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Favorites modal
  favModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  favModalCard: { backgroundColor: '#FFF', width: width * 0.85, borderRadius: 18, padding: 22 },
  favModalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  favModalInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, color: '#1A1A1A' },
  favTypeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  favTypeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  favTypeBtnOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  favTypeTxt: { marginLeft: 6, fontSize: 13, color: '#4B5563', fontWeight: '600' },
  favModalBtns: { flexDirection: 'row', justifyContent: 'space-between' },

  // Floating Map Header Card Styles
  mapFloatingHeaderCard: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mapPillSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 2,
  },
  mapPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapPillBtnActive: {
    backgroundColor: PRIMARY,
  },
  mapPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 4,
  },
  mapPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapCategoryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapCategoryBtnHireActive: {
    backgroundColor: '#DCFCE7',
  },
  mapCategoryBtnTransportActive: {
    backgroundColor: '#DBEAFE',
  },
  mapCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  mapCategoryTextHireActive: {
    fontWeight: '700',
    color: '#15803D',
  },
  mapCategoryTextTransportActive: {
    fontWeight: '700',
    color: SECONDARY_BLUE,
  },
  favCancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginRight: 8 },
  favCancelTxt: { color: '#4B5563', fontWeight: '700' },
  favSaveBtn: { flex: 1, backgroundColor: PRIMARY, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginLeft: 8 },
  favSaveTxt: { color: '#FFF', fontWeight: '700' },
});
