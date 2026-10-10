import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Switch,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { RNS3 } from "react-native-aws3";
import apiClient from "../../api/apiClient";
import { HIRE_VEHICLE_TYPES, TRANSPORT_VEHICLE_TYPES, getVehicleIconDetails } from "../../utils/vehicleIcons";
import Mapbox from "@rnmapbox/maps";
import { io, Socket } from "socket.io-client";
import { getTaxiSocket } from "@/src/Services/TaxiSocketService";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const LOCATION_SOCKET_URL = 'https://test.servefamily.com';

Mapbox.setAccessToken(MAPBOX_TOKEN);

const awsS3Config = {
  keyPrefix: "uploads/",
  bucket: process.env.EXPO_PUBLIC_AWS_S3_BUCKET || "servefamily",
  region: process.env.EXPO_PUBLIC_AWS_S3_REGION || "eu-north-1",
  accessKey: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY || "",
  secretKey: process.env.EXPO_PUBLIC_AWS_SECRET_KEY || "",
  successActionStatus: 201,
  awsUrl: "s3.eu-north-1.amazonaws.com",
  acl: null,
};

interface TaxiRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VehicleType {
  id: string;
  type: string;
  baseFare: number;
  ratePerKm: number;
  seats: number;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface LocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface ImageUploads {
  nicFront: ImagePicker.ImagePickerAsset | null;
  nicBack: ImagePicker.ImagePickerAsset | null;
  drivingLicenseFront: ImagePicker.ImagePickerAsset | null;
  drivingLicenseBack: ImagePicker.ImagePickerAsset | null;
  vehicleFront: ImagePicker.ImagePickerAsset | null;
  vehicleBack: ImagePicker.ImagePickerAsset | null;
  vehicleIn: ImagePicker.ImagePickerAsset | null;
}

const TaxiRegistrationModal: React.FC<TaxiRegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  // ── Step State ──
  const [activeStep, setActiveStep] = useState<number>(1);

  // ── Vehicle & Driver Info ──
  const [serviceCategory, setServiceCategory] = useState<'hire' | 'transport'>('hire');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>("");
  const [vehicleRegNum, setVehicleRegNum] = useState<string>("");
  const [nicNumber, setNicNumber] = useState<string>("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState<string>("");
  const [mobileNum, setMobileNum] = useState<string>("");
  const [showMobileNum, setShowMobileNum] = useState<boolean>(true);
  const [color, setColor] = useState<string>("");

  // ── Mother Location (Home Location) ──
  const [motherLoc, setMotherLoc] = useState<LocationData>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [isFetchingMotherLoc, setIsFetchingMotherLoc] = useState<boolean>(false);
  const [motherSuggestions, setMotherSuggestions] = useState<MapboxFeature[]>([]);
  const [isSearchingMother, setIsSearchingMother] = useState<boolean>(false);
  const motherSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Base Location (Three-Wheel Park / Station) ──
  const [baseLoc, setBaseLoc] = useState<LocationData>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [isFetchingBaseLoc, setIsFetchingBaseLoc] = useState<boolean>(false);
  const [baseSuggestions, setBaseSuggestions] = useState<MapboxFeature[]>([]);
  const [isSearchingBase, setIsSearchingBase] = useState<boolean>(false);
  // ── WebSocket & Map Picker State ──
  const socketRef = useRef<Socket | null>(null);
  const activeSearchFieldRef = useRef<'mother' | 'base' | null>(null);
  const mapCameraRef = useRef<Mapbox.Camera | null>(null);

  const [mapPickerVisible, setMapPickerVisible] = useState<boolean>(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<'mother' | 'base'>('mother');
  const [mapSelectedLoc, setMapSelectedLoc] = useState<LocationData>({
    address: "",
    latitude: 6.9271,
    longitude: 79.8612,
  });
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);

  // ── Pricing State ──
  const [baseFare, setBaseFare] = useState<string>("100");
  const [ratePerKm, setRatePerKm] = useState<string>("110");
  const [pickupFare, setPickupFare] = useState<string>("50");
  const [pickupPrice, setPickupPrice] = useState<string>("0");

  // ── Vehicle Types ──
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState<boolean>(false);

  // ── Images & Uploads ──
  const [images, setImages] = useState<ImageUploads>({
    nicFront: null,
    nicBack: null,
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleIn: null,
  });

  const [uploadedUrls, setUploadedUrls] = useState({
    nicFront: "",
    nicBack: "",
    drivingLicenseFront: "",
    drivingLicenseBack: "",
    vehicleFront: "",
    vehicleBack: "",
    vehicleIn: "",
  });

  const [uploadingStatus, setUploadingStatus] = useState({
    nicFront: false,
    nicBack: false,
    drivingLicenseFront: false,
    drivingLicenseBack: false,
    vehicleFront: false,
    vehicleBack: false,
    vehicleIn: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── Error Modal State ──
  const [errorDetails, setErrorDetails] = useState<{
    visible: boolean;
    title: string;
    message: string;
    fullError: string;
  }>({
    visible: false,
    title: "",
    message: "",
    fullError: "",
  });
  const [showFullDetails, setShowFullDetails] = useState<boolean>(false);

  // ── Fetch Vehicle Types ──
  useEffect(() => {
    if (isOpen) {
      const fetchVehicleTypes = async () => {
        setIsLoadingTypes(true);
        try {
          const result = await apiClient.get("/taxi/vehicle-types");
          if (result && result.success && Array.isArray(result.data)) {
            setVehicleTypes(result.data);
            if (result.data.length > 0 && !vehicleTypeId) {
              const firstType = result.data[0];
              setVehicleTypeId(firstType.id);
              if (firstType.baseFare) setBaseFare(String(firstType.baseFare));
              if (firstType.ratePerKm) setRatePerKm(String(firstType.ratePerKm));
            }
          }
        } catch (error) {
          console.error("Error fetching vehicle types:", error);
        } finally {
          setIsLoadingTypes(false);
        }
      };
      fetchVehicleTypes();
    }
  }, [isOpen]);

  // ── Select Vehicle Type ──
  const handleSelectVehicleType = (vt: VehicleType) => {
    setVehicleTypeId(vt.id);
    if (vt.baseFare) setBaseFare(String(vt.baseFare));
    if (vt.ratePerKm) setRatePerKm(String(vt.ratePerKm));
  };

  // ── Initialize Socket for Location Search & Geocoding ──
  useEffect(() => {
    if (isOpen) {
      const socket = getTaxiSocket();
      socketRef.current = socket;

      const onSuggestionsResult = (data: any[]) => {
        setIsSearchingMother(false);
        setIsSearchingBase(false);
        if (Array.isArray(data)) {
          const mapped: MapboxFeature[] = data.map((item: any, idx: number) => ({
            id: item.placeId || item.id || `sug_${idx}`,
            place_name: item.text || item.description || item.address || '',
            center: [item.lng || 79.8612, item.lat || 6.9271],
          }));
          if (activeSearchFieldRef.current === 'mother') {
            setMotherSuggestions(mapped);
          } else if (activeSearchFieldRef.current === 'base') {
            setBaseSuggestions(mapped);
          }
        }
      };

      const onLocationResult = (data: any) => {
        setIsResolvingAddress(false);
        if (data && (data.lat || data.latitude)) {
          const lat = Number(data.lat || data.latitude);
          const lng = Number(data.lng || data.longitude);
          const address = data.address || data.place_name || data.description || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setMapSelectedLoc({ address, latitude: lat, longitude: lng });
        }
      };

      const onLocationError = () => {
        setIsResolvingAddress(false);
      };

      socket.on('suggestions_result', onSuggestionsResult);
      socket.on('location_result', onLocationResult);
      socket.on('location_error', onLocationError);

      return () => {
        socket.off('suggestions_result', onSuggestionsResult);
        socket.off('location_result', onLocationResult);
        socket.off('location_error', onLocationError);
        socketRef.current = null;
      };
    }
  }, [isOpen]);

  const handleOpenMapPicker = (target: 'mother' | 'base') => {
    setMapPickerTarget(target);
    const existing = target === 'mother' ? motherLoc : baseLoc;
    if (existing.latitude && existing.longitude) {
      setMapSelectedLoc({
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
      });
    } else {
      setMapSelectedLoc({
        address: 'Moving pin on map...',
        latitude: 6.9271,
        longitude: 79.8612,
      });
    }
    setMapPickerVisible(true);
  };

  const handleConfirmMapPicker = () => {
    if (mapPickerTarget === 'mother') {
      setMotherLoc(mapSelectedLoc);
    } else {
      setBaseLoc(mapSelectedLoc);
    }
    setMapPickerVisible(false);
  };

  const handleMapRegionChangeComplete = async (feature: any) => {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
    const [lng, lat] = feature.geometry.coordinates;
    setMapSelectedLoc((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setIsResolvingAddress(true);

    if (socketRef.current) {
      socketRef.current.emit('get_location', { lat, lng });
    } else {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const address = data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setMapSelectedLoc({ address, latitude: lat, longitude: lng });
      } catch {
        try {
          const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const address = r
            ? [r.name, r.street, r.city, r.region].filter(Boolean).join(", ")
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setMapSelectedLoc({ address, latitude: lat, longitude: lng });
        } catch {}
      } finally {
        setIsResolvingAddress(false);
      }
    }
  };

  // ── WebSocket Search: Mother Location ──
  const handleSearchMotherLocation = (text: string) => {
    setMotherLoc((prev) => ({ ...prev, address: text }));
    activeSearchFieldRef.current = 'mother';
    if (!text.trim() || text.trim().length < 2) {
      setMotherSuggestions([]);
      return;
    }
    setIsSearchingMother(true);
    if (socketRef.current) {
      socketRef.current.emit('search_text', text.trim());
    }
  };

  const handleSelectMotherFeature = (feature: MapboxFeature) => {
    const [lng, lat] = feature.center;
    setMotherLoc({
      address: feature.place_name,
      latitude: lat,
      longitude: lng,
    });
    setMotherSuggestions([]);
  };

  const handleCurrentMotherLocation = async () => {
    setIsFetchingMotherLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to fetch current location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const address = r
        ? [r.name, r.street, r.city, r.region].filter(Boolean).join(", ")
        : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      setMotherLoc({ address, latitude: lat, longitude: lng });
      setMotherSuggestions([]);
      if (socketRef.current && address) {
        socketRef.current.emit('save_location', {
          name: address,
          lat,
          lng,
        });
      }
    } catch (err) {
      console.error("Mother current location error:", err);
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setIsFetchingMotherLoc(false);
    }
  };

  // ── WebSocket Search: Base Location ──
  const handleSearchBaseLocation = (text: string) => {
    setBaseLoc((prev) => ({ ...prev, address: text }));
    activeSearchFieldRef.current = 'base';
    if (!text.trim() || text.trim().length < 2) {
      setBaseSuggestions([]);
      return;
    }
    setIsSearchingBase(true);
    if (socketRef.current) {
      socketRef.current.emit('search_text', text.trim());
    }
  };

  const handleSelectBaseFeature = (feature: MapboxFeature) => {
    const [lng, lat] = feature.center;
    setBaseLoc({
      address: feature.place_name,
      latitude: lat,
      longitude: lng,
    });
    setBaseSuggestions([]);
  };

  const handleCurrentBaseLocation = async () => {
    setIsFetchingBaseLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to fetch current location.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const address = r
        ? [r.name, r.street, r.city, r.region].filter(Boolean).join(", ")
        : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      setBaseLoc({ address, latitude: lat, longitude: lng });
      setBaseSuggestions([]);
    } catch (err) {
      console.error("Base current location error:", err);
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setIsFetchingBaseLoc(false);
    }
  };

  const handleCopyMotherToBase = () => {
    if (!motherLoc.address || !motherLoc.latitude || !motherLoc.longitude) {
      Alert.alert("Mother Location Empty", "Please select Mother (Home) location first.");
      return;
    }
    setBaseLoc({ ...motherLoc });
    setBaseSuggestions([]);
  };

  // ── S3 Image Picker & Upload ──
  const processAndUploadImage = async (key: keyof ImageUploads, pickedAsset: ImagePicker.ImagePickerAsset) => {
    setUploadingStatus((prev) => ({ ...prev, [key]: true }));
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        pickedAsset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );

      const uploadAsset = {
        ...pickedAsset,
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
      };

      setImages((prev) => ({ ...prev, [key]: uploadAsset }));

      const url = await uploadImage(uploadAsset);
      setUploadedUrls((prev) => ({ ...prev, [key]: url }));
    } catch (error: any) {
      console.error(`Error uploading ${key} to S3:`, error);
      setErrorDetails({
        visible: true,
        title: "Upload Failed",
        message: "Failed to upload image to AWS S3. Please try again.",
        fullError: error?.stack || error?.message || JSON.stringify(error) || "Unknown upload error",
      });
      setImages((prev) => ({ ...prev, [key]: null }));
    } finally {
      setUploadingStatus((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handlePickImageFromCamera = async (key: keyof ImageUploads) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is required to take photo of documents.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndUploadImage(key, result.assets[0]);
      }
    } catch (err) {
      console.warn("Camera error:", err);
      Alert.alert("Error", "Could not open camera.");
    }
  };

  const handlePickImageFromGallery = async (key: keyof ImageUploads) => {
    try {
      if (Platform.OS === "ios") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo gallery permission is required to select photo.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndUploadImage(key, result.assets[0]);
      }
    } catch (err) {
      console.warn("Gallery error:", err);
      Alert.alert("Error", "Could not open photo gallery.");
    }
  };

  const handlePickImage = (key: keyof ImageUploads) => {
    Alert.alert(
      "Select Image Source 📷",
      "Choose whether to take a new photo with Camera or pick from Photo Gallery.",
      [
        {
          text: "📷 Take Photo (Camera)",
          onPress: () => handlePickImageFromCamera(key),
        },
        {
          text: "🖼️ Choose from Gallery",
          onPress: () => handlePickImageFromGallery(key),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const uploadImage = async (image: ImagePicker.ImagePickerAsset | null, retries = 3): Promise<string> => {
    if (!image) return "";
    const uri = image.uri;
    const extension = uri.split(".").pop()?.toLowerCase();

    let mimeType = image.mimeType || "";
    if (!mimeType || mimeType === "image") {
      if (extension === "png") mimeType = "image/png";
      else if (extension === "gif") mimeType = "image/gif";
      else if (extension === "webp") mimeType = "image/webp";
      else mimeType = "image/jpeg";
    }

    const file = {
      uri: uri,
      name: image.fileName || `upload_${Date.now()}.${extension || "jpg"}`,
      type: mimeType,
    };

    let lastError: any = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await RNS3.put(file, awsS3Config);
        if ((response.status === 201 || response.status === 200) && response.body?.postResponse?.location) {
          return response.body.postResponse.location;
        }
        const detail = response.text || (response.body ? JSON.stringify(response.body) : "No detail");
        lastError = new Error(`Failed to upload image to S3 (Attempt ${attempt}/${retries}). Status: ${response.status}. Details: ${detail}`);
      } catch (err) {
        lastError = err;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError || new Error("Failed to upload image to S3 after retries");
  };

  // ── Form Validation & Submit ──
  const handleSubmit = async () => {
    if (isLoading) return;

    if (!vehicleTypeId) {
      Alert.alert("Missing Vehicle Type", "Please select a Vehicle Type.");
      return;
    }
    if (!vehicleRegNum.trim()) {
      Alert.alert("Missing Reg Number", "Please enter the Vehicle Registration Number.");
      return;
    }
    if (!mobileNum.trim()) {
      Alert.alert("Missing Mobile Number", "Please enter the Contact Mobile Number.");
      return;
    }
    if (!motherLoc.address || !motherLoc.latitude || !motherLoc.longitude) {
      Alert.alert("Missing Mother Location", "Please select Mother (Home) Location with coordinates.");
      return;
    }
    if (!baseLoc.address || !baseLoc.latitude || !baseLoc.longitude) {
      Alert.alert("Missing Base Location", "Please select Base (Three-Wheel Park) Location with coordinates.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        vehicleTypeId: vehicleTypeId,
        vehicleRegNum: vehicleRegNum.trim(),
        mobileNum: mobileNum.trim(),
        showMobileNum: showMobileNum,
        color: color.trim(),

        motherLatitude: Number(motherLoc.latitude),
        motherLongitude: Number(motherLoc.longitude),
        motherAddress: motherLoc.address.trim(),

        baseLatitude: Number(baseLoc.latitude),
        baseLongitude: Number(baseLoc.longitude),
        baseAddress: baseLoc.address.trim(),

        baseFare: Number(baseFare) || 0,
        pickupFare: Number(pickupFare) || 0,
        pickupPrice: Number(pickupPrice) || 0,
        ratePerKm: Number(ratePerKm) || 0,

        nicNumber: nicNumber.trim(),
        nicFrontUrl: uploadedUrls.nicFront || "",
        nicBackUrl: uploadedUrls.nicBack || "",
        drivingLicenseNumber: drivingLicenseNumber.trim(),
        drivingLicenseFrontUrl: uploadedUrls.drivingLicenseFront || "",
        drivingLicenseBackUrl: uploadedUrls.drivingLicenseBack || "",
        vehicleFrontUrl: uploadedUrls.vehicleFront || "",
        vehicleBackUrl: uploadedUrls.vehicleBack || "",
        vehicleInUrl: uploadedUrls.vehicleIn || "",
      };

      console.log("=== TAXI REGISTER PAYLOAD ===", JSON.stringify(payload, null, 2));

      const data = await apiClient.post("/taxi/register", payload);

      if (data && data.success === false) {
        setErrorDetails({
          visible: true,
          title: "Registration Failed",
          message: data.message || "Failed to register vehicle",
          fullError: JSON.stringify(data, null, 2),
        });
      } else {
        Alert.alert("Success 🎉", "Vehicle registered successfully!");
        onClose();
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorDetails({
        visible: true,
        title: "Registration Error",
        message: error?.message || "Network error while registering vehicle.",
        fullError: error?.stack || error?.message || JSON.stringify(error) || "Unknown registration error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyError = async () => {
    await Clipboard.setStringAsync(errorDetails.fullError);
    Alert.alert("Copied", "Error details copied to clipboard!");
  };

  const UPLOAD_ORDER: (keyof ImageUploads)[] = [
    "nicFront",
    "nicBack",
    "drivingLicenseFront",
    "drivingLicenseBack",
    "vehicleFront",
    "vehicleBack",
    "vehicleIn",
  ];

  const isSlotUnlocked = (key: keyof ImageUploads): boolean => {
    const index = UPLOAD_ORDER.indexOf(key);
    if (index === 0) return true;
    const previousKey = UPLOAD_ORDER[index - 1];
    return Boolean(uploadedUrls[previousKey]);
  };

  const renderImagePicker = (key: keyof ImageUploads, label: string) => {
    const image = images[key];
    const isUploading = uploadingStatus[key];
    const isUploaded = Boolean(uploadedUrls[key]);
    const isUnlocked = isSlotUnlocked(key);

    return (
      <View style={[styles.inputGroup, !isUnlocked && { opacity: 0.6 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.label}>{label}</Text>
          {isUploaded && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#16A34A', marginLeft: 4 }}>Uploaded ✓</Text>
            </View>
          )}
          {!isUnlocked && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed" size={14} color="#6B7280" />
              <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>Locked 🔒</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.imagePicker,
            isUploaded && { borderColor: '#16A34A', borderWidth: 2, backgroundColor: '#F0FDF4' },
            !isUnlocked && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
          ]}
          onPress={() => {
            if (!isUnlocked) {
              Alert.alert('Slot Locked 🔒', 'Please upload the previous photo first.');
              return;
            }
            handlePickImage(key);
          }}
          disabled={isUploading || !isUnlocked}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color="#16A34A" />
              <Text style={[styles.imagePlaceholderText, { marginTop: 4, color: '#16A34A', fontWeight: '700' }]}>
                Uploading to S3...
              </Text>
            </View>
          ) : image ? (
            <View style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              {isUploaded && (
                <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#16A34A', borderRadius: 12, padding: 4 }}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name={isUnlocked ? "camera-outline" : "lock-closed-outline"} size={26} color={isUnlocked ? "#16A34A" : "#9CA3AF"} />
              <Text style={[styles.imagePlaceholderText, !isUnlocked && { color: "#6B7280" }]}>
                {isUnlocked ? "Tap to select & upload image" : "Upload previous photo to unlock"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Display S3 URL underneath the Image Preview when Uploaded */}
        {isUploaded && uploadedUrls[key] ? (
          <View style={styles.s3UrlBadge}>
            <Ionicons name="cloud-done-outline" size={15} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.s3UrlText} numberOfLines={1} ellipsizeMode="middle">
              {uploadedUrls[key]}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                await Clipboard.setStringAsync(uploadedUrls[key]);
                Alert.alert("Copied 📋", "S3 Image URL copied to clipboard!");
              }}
              style={{ marginLeft: 6, padding: 2 }}
            >
              <Ionicons name="copy-outline" size={15} color="#2563EB" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#16A34A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vehicle Registration</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Steps Indicator Bar */}
          <View style={styles.stepBar}>
            {[
              { num: 1, title: "Vehicle" },
              { num: 2, title: "Locations" },
              { num: 3, title: "Pricing" },
              { num: 4, title: "Documents" },
            ].map((step) => (
              <TouchableOpacity
                key={step.num}
                style={[
                  styles.stepTab,
                  activeStep === step.num && styles.activeStepTab,
                ]}
                onPress={() => setActiveStep(step.num)}
              >
                <View
                  style={[
                    styles.stepBadge,
                    activeStep === step.num && styles.activeStepBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      activeStep === step.num && styles.activeStepBadgeText,
                    ]}
                  >
                    {step.num}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepTabText,
                    activeStep === step.num && styles.activeStepTabText,
                  ]}
                >
                  {step.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* STEP 1: VEHICLE & CONTACT DETAILS */}
            {activeStep === 1 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>1. Vehicle & Contact Information</Text>

                {/* Service Category Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Service Category *</Text>
                  <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: 10,
                        backgroundColor: serviceCategory === 'hire' ? '#FFF' : 'transparent',
                        elevation: serviceCategory === 'hire' ? 2 : 0,
                      }}
                      onPress={() => setServiceCategory('hire')}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: serviceCategory === 'hire' ? '#16A34A' : '#6B7280' }}>
                        🚕 Hire (Passenger)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: 'center',
                        borderRadius: 10,
                        backgroundColor: serviceCategory === 'transport' ? '#FFF' : 'transparent',
                        elevation: serviceCategory === 'transport' ? 2 : 0,
                      }}
                      onPress={() => setServiceCategory('transport')}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: serviceCategory === 'transport' ? '#2563EB' : '#6B7280' }}>
                        📦 Transport (Cargo)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Type *</Text>
                  {isLoadingTypes ? (
                    <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 10 }} />
                  ) : (
                    <View style={styles.typesContainer}>
                      {(
                        serviceCategory === 'hire'
                          ? HIRE_VEHICLE_TYPES
                          : TRANSPORT_VEHICLE_TYPES
                      ).map((vt) => {
                        const isSelected = vehicleTypeId === vt.id || vehicleTypeId === vt.name;
                        const iconInfo = getVehicleIconDetails(vt.name || vt.type);

                        return (
                          <TouchableOpacity
                            key={vt.id}
                            style={[
                              styles.typeCard,
                              isSelected && styles.selectedTypeCard,
                            ]}
                            onPress={() => {
                              setVehicleTypeId(vt.id);
                              handleSelectVehicleType(vt as any);
                            }}
                          >
                             {iconInfo.iconFamily === "MaterialCommunityIcons" ? (
                               <MaterialCommunityIcons
                                 name={iconInfo.iconName as any}
                                 size={28}
                                 color={isSelected ? "#FFF" : "#16A34A"}
                               />
                             ) : (
                               <Ionicons
                                 name={iconInfo.iconName as any}
                                 size={28}
                                 color={isSelected ? "#FFF" : "#16A34A"}
                               />
                             )}
                            <Text style={[styles.typeText, isSelected && styles.selectedTypeText]}>
                              {vt.name}
                            </Text>
                            <Text style={[styles.typeSubtext, isSelected && styles.selectedTypeSubtext]}>
                              Rs. {vt.baseFare} Base
                            </Text>
                            <Text style={[styles.typeSubtext, isSelected && styles.selectedTypeSubtext]}>
                              Rs. {vt.ratePerKm}/km
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Reg Num *</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleRegNum}
                    onChangeText={setVehicleRegNum}
                    placeholder="e.g. WP ABC-1234"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NIC Number</Text>
                  <TextInput
                    style={styles.input}
                    value={nicNumber}
                    onChangeText={setNicNumber}
                    placeholder="e.g. 199012345678 or 901234567V"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Driving License Number</Text>
                  <TextInput
                    style={styles.input}
                    value={drivingLicenseNumber}
                    onChangeText={setDrivingLicenseNumber}
                    placeholder="e.g. B1234567"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={mobileNum}
                    onChangeText={setMobileNum}
                    placeholder="0771234567"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Show Mobile Number to Customers</Text>
                    <Text style={styles.switchSublabel}>
                      Allow passengers to see your phone number for ride calls.
                    </Text>
                  </View>
                  <Switch
                    value={showMobileNum}
                    onValueChange={setShowMobileNum}
                    trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                    thumbColor={showMobileNum ? "#16A34A" : "#9CA3AF"}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Color</Text>
                  <TextInput
                    style={styles.input}
                    value={color}
                    onChangeText={setColor}
                    placeholder="e.g. Yellow, Red, Black"
                  />
                </View>

                <TouchableOpacity
                  style={styles.nextStepBtn}
                  onPress={() => setActiveStep(2)}
                >
                  <Text style={styles.nextStepBtnText}>Next: Location Settings ➔</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: MOTHER & BASE LOCATIONS (MAPBOX & CURRENT LOCATION) */}
            {activeStep === 2 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>2. Mother & Base Locations</Text>

                {/* ── MOTHER LOCATION SECTION ── */}
                <View style={styles.locationSectionHeader}>
                  <Ionicons name="home" size={20} color="#16A34A" />
                  <Text style={styles.locationSectionTitle}>Mother Location (Home)</Text>
                </View>
                <Text style={styles.locationHelpText}>
                  Your permanent home address/location.
                </Text>

                <View style={styles.inputGroup}>
                  <View style={styles.searchBoxRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={motherLoc.address}
                      onChangeText={handleSearchMotherLocation}
                      placeholder="Search Home location (Mapbox)..."
                    />
                    {isSearchingMother && (
                      <ActivityIndicator size="small" color="#16A34A" style={styles.inlineSpinner} />
                    )}
                  </View>

                  {/* Suggestions List */}
                  {motherSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {motherSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectMotherFeature(item)}
                        >
                          <Ionicons name="location-outline" size={18} color="#16A34A" />
                          <Text style={styles.suggestionText}>{item.place_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.currentLocBtn, { flex: 1 }]}
                      onPress={handleCurrentMotherLocation}
                      disabled={isFetchingMotherLoc}
                    >
                      {isFetchingMotherLoc ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="navigate-circle-outline" size={18} color="#FFF" />
                          <Text style={styles.currentLocBtnText}>Use GPS</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.currentLocBtn, { flex: 1, backgroundColor: "#2563EB" }]}
                      onPress={() => handleOpenMapPicker('mother')}
                    >
                      <Ionicons name="map-outline" size={18} color="#FFF" />
                      <Text style={styles.currentLocBtnText}>Select on Map</Text>
                    </TouchableOpacity>
                  </View>

                  {motherLoc.latitude && motherLoc.longitude ? (
                    <View style={styles.coordBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      <Text style={styles.coordText}>
                        Lat: {motherLoc.latitude.toFixed(5)}, Lng: {motherLoc.longitude.toFixed(5)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* ── BASE LOCATION SECTION ── */}
                <View style={[styles.locationSectionHeader, { marginTop: 24 }]}>
                  <Ionicons name="car-sport" size={20} color="#2563EB" />
                  <Text style={styles.locationSectionTitle}>Base Location (Three-Wheel Park)</Text>
                </View>
                <Text style={styles.locationHelpText}>
                  Your park or stand location where you park your vehicle.
                </Text>

                <View style={styles.inputGroup}>
                  <View style={styles.searchBoxRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={baseLoc.address}
                      onChangeText={handleSearchBaseLocation}
                      placeholder="Search Park/Stand location (Socket)..."
                    />
                    {isSearchingBase && (
                      <ActivityIndicator size="small" color="#2563EB" style={styles.inlineSpinner} />
                    )}
                  </View>

                  {/* Suggestions List */}
                  {baseSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {baseSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectBaseFeature(item)}
                        >
                          <Ionicons name="location-outline" size={18} color="#2563EB" />
                          <Text style={styles.suggestionText}>{item.place_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.currentLocBtn, { flex: 1, backgroundColor: "#2563EB" }]}
                      onPress={handleCurrentBaseLocation}
                      disabled={isFetchingBaseLoc}
                    >
                      {isFetchingBaseLoc ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="navigate-circle-outline" size={16} color="#FFF" />
                          <Text style={styles.currentLocBtnText}>GPS</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.currentLocBtn, { flex: 1, backgroundColor: "#16A34A" }]}
                      onPress={() => handleOpenMapPicker('base')}
                    >
                      <Ionicons name="map-outline" size={16} color="#FFF" />
                      <Text style={styles.currentLocBtnText}>Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.currentLocBtn, { flex: 1, backgroundColor: "#4B5563" }]}
                      onPress={handleCopyMotherToBase}
                    >
                      <Ionicons name="copy-outline" size={16} color="#FFF" />
                      <Text style={styles.currentLocBtnText}>Same Home</Text>
                    </TouchableOpacity>
                  </View>

                  {baseLoc.latitude && baseLoc.longitude ? (
                    <View style={[styles.coordBadge, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                      <Text style={[styles.coordText, { color: "#1E40AF" }]}>
                        Lat: {baseLoc.latitude.toFixed(5)}, Lng: {baseLoc.longitude.toFixed(5)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.stepActionRow}>
                  <TouchableOpacity
                    style={styles.prevStepBtn}
                    onPress={() => setActiveStep(1)}
                  >
                    <Text style={styles.prevStepBtnText}>⬅ Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setActiveStep(3)}
                  >
                    <Text style={styles.nextStepBtnText}>Next: Pricing ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: PRICING DETAILS */}
            {activeStep === 3 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>3. Pricing & Rates</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Base Fare (LKR) *</Text>
                  <TextInput
                    style={styles.input}
                    value={baseFare}
                    onChangeText={setBaseFare}
                    placeholder="e.g. 100"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Rate Per Km (LKR) *</Text>
                  <TextInput
                    style={styles.input}
                    value={ratePerKm}
                    onChangeText={setRatePerKm}
                    placeholder="e.g. 110"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pickup Fare (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={pickupFare}
                    onChangeText={setPickupFare}
                    placeholder="e.g. 50"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pickup Price (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={pickupPrice}
                    onChangeText={setPickupPrice}
                    placeholder="e.g. 0"
                    keyboardType="numeric"
                  />
                </View>

                {/* Fare Summary Calculation Preview */}
                <View style={styles.farePreviewCard}>
                  <Text style={styles.farePreviewTitle}>💡 Sample Trip Calculation Preview</Text>
                  <Text style={styles.farePreviewText}>
                    5 km Trip Estimated Fare:{" "}
                    <Text style={{ fontWeight: "700", color: "#16A34A" }}>
                      LKR {(Number(baseFare) || 0) + (Number(ratePerKm) || 0) * 5 + (Number(pickupFare) || 0)}
                    </Text>
                  </Text>
                </View>

                <View style={styles.stepActionRow}>
                  <TouchableOpacity
                    style={styles.prevStepBtn}
                    onPress={() => setActiveStep(2)}
                  >
                    <Text style={styles.prevStepBtnText}>⬅ Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nextStepBtn}
                    onPress={() => setActiveStep(4)}
                  >
                    <Text style={styles.nextStepBtnText}>Next: Documents ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 4: DOCUMENTS & PHOTOS UPLOAD */}
            {activeStep === 4 && (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>4. Documents & Vehicle Photos</Text>

                {/* Sequential Upload Info Banner */}
                <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="information-circle-outline" size={24} color="#2563EB" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E40AF' }}>
                      Sequential Document Upload
                    </Text>
                    <Text style={{ fontSize: 12, color: '#1E3A8A', marginTop: 2, lineHeight: 16 }}>
                      Please upload photos one by one in sequence. Each photo slot unlocks automatically after the previous photo is uploaded successfully!
                    </Text>
                  </View>
                </View>

                <Text style={styles.subSectionTitle}>🪪 NIC Photos</Text>
                {renderImagePicker("nicFront", "NIC Front Photo")}
                {renderImagePicker("nicBack", "NIC Back Photo")}

                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>💳 Driving License Photos</Text>
                {renderImagePicker("drivingLicenseFront", "Driving License Front Photo")}
                {renderImagePicker("drivingLicenseBack", "Driving License Back Photo")}

                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>🚗 Vehicle Photos</Text>
                {renderImagePicker("vehicleFront", "Vehicle Front Photo")}
                {renderImagePicker("vehicleBack", "Vehicle Back Photo")}
                {renderImagePicker("vehicleIn", "Vehicle Inside (Interior) Photo")}

                <View style={styles.stepActionRow}>
                  <TouchableOpacity
                    style={styles.prevStepBtn}
                    onPress={() => setActiveStep(3)}
                  >
                    <Text style={styles.prevStepBtnText}>⬅ Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.disabledButton, { flex: 2 }]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                        <Text style={styles.submitButtonText}>Submit Vehicle</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

        {/* Custom Error details modal */}
        <Modal visible={errorDetails.visible} transparent animationType="fade">
          <View style={styles.errorModalBg}>
            <View style={styles.errorModalCard}>
              <View style={styles.errorModalHeader}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
                <Text style={styles.errorModalTitle}>{errorDetails.title}</Text>
              </View>

              <Text style={styles.errorModalMessage}>{errorDetails.message}</Text>

              <TouchableOpacity
                style={styles.detailsToggle}
                onPress={() => setShowFullDetails(!showFullDetails)}
              >
                <Text style={styles.detailsToggleText}>
                  {showFullDetails ? "Hide Full Details ▲" : "Show Full Details ▼"}
                </Text>
              </TouchableOpacity>

              {showFullDetails && (
                <ScrollView style={styles.fullErrorScroll} contentContainerStyle={{ padding: 8 }}>
                  <Text style={styles.fullErrorText}>{errorDetails.fullError}</Text>
                </ScrollView>
              )}

              <View style={styles.errorModalActions}>
                <TouchableOpacity
                  style={[styles.errorActionBtn, styles.errorCopyBtn]}
                  onPress={handleCopyError}
                >
                  <Ionicons name="copy-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.errorCopyBtnText}>Copy Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.errorActionBtn, styles.errorCloseBtn]}
                  onPress={() => {
                    setErrorDetails((prev) => ({ ...prev, visible: false }));
                    setShowFullDetails(false);
                  }}
                >
                  <Text style={styles.errorCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── INTERACTIVE MAP LOCATION PICKER MODAL ── */}
        <Modal
          visible={mapPickerVisible}
          animationType="slide"
          onRequestClose={() => setMapPickerVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <View style={{ flex: 1, backgroundColor: "#FFF" }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: "#FFF",
                  borderBottomWidth: 1,
                  borderColor: "#E5E7EB",
                  zIndex: 10,
                }}
              >
                <TouchableOpacity onPress={() => setMapPickerVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle-outline" size={28} color="#374151" />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1F2937" }}>
                  🌐 OSM - {mapPickerTarget === "mother" ? "Mother Location (Home)" : "Base Location (Stand)"}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              {/* OpenStreetMap (OSM) Interactive Map */}
              <View style={{ flex: 1, position: "relative" }}>
                <Mapbox.MapView
                  style={StyleSheet.absoluteFillObject}
                  logoEnabled={false}
                  attributionEnabled={false}
                  scaleBarEnabled={false}
                  onRegionDidChange={handleMapRegionChangeComplete}
                >
                  <Mapbox.Camera
                    ref={mapCameraRef}
                    defaultSettings={{
                      centerCoordinate: [
                        mapSelectedLoc.longitude || 79.8612,
                        mapSelectedLoc.latitude || 6.9271,
                      ],
                      zoomLevel: 15,
                    }}
                  />
                  <Mapbox.RasterSource
                    id="osmTileSource"
                    tileUrlTemplates={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
                    tileSize={256}
                  >
                    <Mapbox.RasterLayer id="osmTileLayer" style={{ rasterOpacity: 1 }} />
                  </Mapbox.RasterSource>
                </Mapbox.MapView>

                {/* Center Target Pin */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    marginTop: -36,
                    marginLeft: -18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="location"
                    size={40}
                    color={mapPickerTarget === "mother" ? "#16A34A" : "#2563EB"}
                  />
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#000",
                      marginTop: -4,
                    }}
                  />
                </View>
              </View>

              {/* Floating Bottom Location Card */}
              <View
                style={{
                  backgroundColor: "#FFF",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons
                    name={mapPickerTarget === "mother" ? "home" : "car-sport"}
                    size={22}
                    color={mapPickerTarget === "mother" ? "#16A34A" : "#2563EB"}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1F2937", flex: 1 }} numberOfLines={2}>
                    {isResolvingAddress ? "Resolving address..." : mapSelectedLoc.address || "Selected Location"}
                  </Text>
                  {isResolvingAddress && <ActivityIndicator size="small" color="#16A34A" style={{ marginLeft: 8 }} />}
                </View>

                {mapSelectedLoc.latitude && mapSelectedLoc.longitude && (
                  <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
                    Lat: {mapSelectedLoc.latitude.toFixed(5)}, Lng: {mapSelectedLoc.longitude.toFixed(5)}
                  </Text>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#F3F4F6",
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                    }}
                    onPress={async () => {
                      try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === "granted") {
                          const loc = await Location.getCurrentPositionAsync({});
                          const lat = loc.coords.latitude;
                          const lng = loc.coords.longitude;
                          mapCameraRef.current?.setCamera({
                            centerCoordinate: [lng, lat],
                            zoomLevel: 15,
                            animationDuration: 1000,
                          });
                        }
                      } catch {}
                    }}
                  >
                    <Ionicons name="navigate-outline" size={18} color="#374151" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>GPS</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 2,
                      backgroundColor: mapPickerTarget === "mother" ? "#16A34A" : "#2563EB",
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={handleConfirmMapPicker}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>
                      Confirm Location ✓
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  stepBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    justifyContent: "space-around",
  },
  stepTab: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeStepTab: {
    backgroundColor: "#DCFCE7",
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  activeStepBadge: {
    backgroundColor: "#16A34A",
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  activeStepBadgeText: {
    color: "#FFF",
  },
  stepTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeStepTabText: {
    color: "#15803D",
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  switchSublabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  typesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeCard: {
    flex: 1,
    minWidth: "46%",
    margin: "2%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  selectedTypeCard: {
    borderColor: "#16A34A",
    backgroundColor: "#16A34A",
  },
  typeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 6,
  },
  selectedTypeText: {
    color: "#FFF",
  },
  typeSubtext: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  selectedTypeSubtext: {
    color: "#E5E7EB",
  },
  locationSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 6,
  },
  locationHelpText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  searchBoxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineSpinner: {
    position: "absolute",
    right: 12,
  },
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  currentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  currentLocBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  coordBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  coordText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600",
    marginLeft: 6,
  },
  farePreviewCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  farePreviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  farePreviewText: {
    fontSize: 13,
    color: "#15803D",
  },
  imagePicker: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 10,
    height: 110,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
  },
  stepActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  nextStepBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  nextStepBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  prevStepBtn: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  prevStepBtnText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
  errorModalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalCard: {
    backgroundColor: "#FFF",
    width: "90%",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  errorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 10,
    flex: 1,
  },
  errorModalMessage: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 16,
    lineHeight: 22,
  },
  detailsToggle: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  detailsToggleText: {
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 14,
  },
  fullErrorScroll: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fullErrorText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: "#374151",
  },
  errorModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  errorActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  errorCopyBtn: {
    backgroundColor: "#16A34A",
    marginRight: 8,
  },
  errorCopyBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  errorCloseBtn: {
    backgroundColor: "#F3F4F6",
    marginLeft: 8,
  },
  errorCloseBtnText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 14,
  },
  s3UrlBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  s3UrlText: {
    fontSize: 11,
    color: "#15803D",
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});

export default TaxiRegistrationModal;