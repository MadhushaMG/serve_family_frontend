import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useFocusEffect, useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  Keyboard,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import Mapbox from "@rnmapbox/maps";
import {
  CustomMarker,
  SavedPlaceMarker,
  SosMarker,
} from "@/src/components/MapMarker";
import { openDirections } from "@/utils/mapUtils";
import {
  BottomSheetScrollView,
  BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  parseBooleanPreference,
  prepareImageAsWebp,
} from "@/src/utils/mapUtils";
import { OSM_TILE_URL } from "@/src/utils/mapTileHelper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import LoadingScreen from "@/src/components/LoadingScreen";
import { useTheme } from "@/src/constants/theme";
import CirclesModal from "@/src/components/modals/CirclesModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BACKGROUND_LOCATION_TASK_NAME,
  BATTERY_SYNC_MIN_INTERVAL_MS,
  isNativePlatform,
  LOW_BATTERY_THRESHOLD,
  STORAGE_KEYS,
} from "@/src/constants/MapConstants";
import AccountActionsModal from "@/src/components/modals/AccountActionsModal";
import { useMapScreen } from "@/src/hooks/useMapScreen";
import {
  setLocationSharingEnabled,
  setNotificationsEnabled,
} from "@/src/utils/tokenManager";
import { useLocationHistorySection } from "./UseLocationHistorySection";
import NotificationModal from "@/src/components/modals/NotificationModal";
import { setNotificationReceptionEnabled } from "@/src/utils/notificationListeners";
import { requestAllLocationPermissions } from "@/src/utils/locationPermissionHelper";
import { requestNotificationPermissions } from "@/src/utils/permissions";
import {
  readBatteryLevel,
  sendBatteryLevelValue,
  sendLowBatteryAlert,
  watchBatteryLevel,
} from "@/src/utils/battery";
import {
  asNonEmptyString,
  normalizeIdentifier,
} from "@/src/utils/mapScreenHelpers";
import MembersPanel from "@/src/components/memberlist";
import PetsAndItemsPanel from "@/src/components/Petsanditemspanel";
import PlacesPanel from "@/src/components/Placespanel";
import { Member, TrackedEntity, SavedPlace } from "@/src/components/types";
import AddEntityModal from "@/src/components/modals/AddEntityModal";
import { LocationPoint, MapType } from "@/src/types/models";
import AddPlaceModal from "@/src/components/modals/AddPlaceModal";
import DevicesModal from "@/src/components/modals/DevicesModal";
import { SafetyService } from "@/src/Services/SafetyService";
import {
  ManageMemberModal,
  MemberRole,
} from "@/src/components/modals/EditMemberModal";
import PaymentModal from "@/src/components/modals/PaymentPlansModal";
import TaxiModal from "@/src/components/modals/TaxiModal";
import TaxiRegistrationModal from "@/src/components/modals/TaxiRegistrationModal";
import DriverModal from "@/src/components/modals/DriverModal";
import TaxiMeterModal from "@/src/components/modals/TaxiMeterModal";
import FloatingTaxiMeterWidget from "@/src/components/FloatingTaxiMeterWidget";
import { useTaxiMeterStore } from "@/src/store/useTaxiMeterStore";
import { FlashList } from "@shopify/flash-list";
import UpdateProfileModal from "@/src/components/modals/Updateprofilemodal";
import LmsModal from "@/src/components/modals/LmsModal";
import { useAuthStore } from "@/src/store/authStore";
import { useBackgroundTracker } from "@/src/hooks/useBackgroundTracker";
import { UserServices } from "@/src/Services/UserServices";
import {
  useAddTrackingDevice,
  useChangeMemberNickname,
  useChangeMemberRelationship,
  useChangeMemberRole,
  useGetCircles,
  useGetMemberLocations,
  useRemoveMember,
  useRemoveMemberRelationship,
  useRemoveTrackingDevice,
  useUpdateTrackingDevice,
} from "@/src/hooks/Usecircle";
import {
  GpsDeviceMarker,
  ItemMarker,
  PetMarker,
} from "@/src/components/Entitymarkers";
import LocationPermissionGate from "../Locationpermissiondisclosure";
import MapBottomSheet, {
  MapBottomSheetRef,
} from "@/src/components/Mapbottomsheet";
import MapTabBar, { MapTabKey, evaluateCoverage } from "@/src/components/Maptabbar";
import MapFabRow from "@/src/components/Mapfabrow";
import { useGetNotifications } from "@/src/hooks/Usenotification";
import { useSettingsScreen } from "@/src/hooks/screens/useSetttings";

// ======================== BACKGROUND TASK (must be defined outside component) ========================

const BACKGROUND_FETCH_TASK = "background-location-task";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("🔴 Background task error:", error);
    return;
  }

  if (data) {
    console.log("🔥 RAW DATA RECEIVED IN BACKGROUND:", JSON.stringify(data));

    const { locations } = data;
    const location =
      locations && locations.length > 0
        ? locations[locations.length - 1]
        : null;

    if (location) {
      const { latitude, longitude, speed } = location.coords;

      try {
        const authStoreRaw = await AsyncStorage.getItem("auth-store");
        if (!authStoreRaw) {
          console.log("⚠️ Auth store not found in background!");
          return;
        }

        const authStore = JSON.parse(authStoreRaw);
        const circleId = authStore?.state?.activeCircleId;
        console.log("🔍 Circle ID from background store:", circleId);
        if (!circleId) {
          console.log("⚠️ Circle ID not found in background store!");
          return;
        }

        const locationName = "Background Location (Raw)";

        await Promise.all([
          UserServices.UpdateCurruntLocation(
            circleId,
            latitude,
            longitude,
            locationName,
            {
              speed: speed ?? 0,
            },
          ),
          UserServices.SendHeartbeart({}),
        ]);

        console.log(`✅ Success: Location sent for Circle: ${circleId}`);
      } catch (err) {
        console.log("❌ Error inside background try-catch:", err);
      }
    }
  }
});

// ======================== CONSTANTS ========================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");

const COLORS = {
  primary: "#4F359B",
  accent: "#EF4444",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  success: "#22C55E",
};

const C = {
  primary: "#3D2DB5",
  sos: "#E53935",
  white: "#FFFFFF",
  sheet: "#FFFFFF",
  handle: "#DDDDDD",
};

const TAB_BAR_HEIGHT = 56;

// ======================== MAP STYLES LIST ========================

const mapStylesList: {
  key: MapType;
  label: string;
  icon: string;
  previewColor: string;
  gradientTop: string;
  gradientBot: string;
  styleURL: string;
}[] = [
  {
    key: "standard",
    label: "Standard",
    icon: "map-outline",
    previewColor: "#4F9EFF",
    gradientTop: "#6DB3FF",
    gradientBot: "#2D7DD2",
    styleURL: Mapbox.StyleURL.Street,
  },
  {
    key: "satellite",
    label: "Satellite",
    icon: "earth",
    previewColor: "#2D6A2D",
    gradientTop: "#3D8B37",
    gradientBot: "#1A3D1A",
    styleURL: Mapbox.StyleURL.Satellite,
  },
  {
    key: "hybrid",
    label: "Hybrid",
    icon: "layers-outline",
    previewColor: "#1A3D4A",
    gradientTop: "#2D6A7A",
    gradientBot: "#0A2030",
    styleURL: Mapbox.StyleURL.SatelliteStreet,
  },
  {
    key: "terrain",
    label: "Terrain",
    icon: "trail-sign-outline",
    previewColor: "#8B6914",
    gradientTop: "#B8860B",
    gradientBot: "#5C4A00",
    styleURL: Mapbox.StyleURL.Outdoors,
  },
];

const resolveMapStyleURL = (type: MapType): string =>
  mapStylesList.find((s) => s.key === type)?.styleURL ?? Mapbox.StyleURL.Street;

// ======================== TYPES ========================

type TabKey = "taxi" | "location" | "driver" | "meter" | "payments" | "lms";

// ======================== TAB & QUICK ACTION DEFINITIONS ========================

const QUICK_ACTIONS: {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  bg: string;
}[] = [
  {
    key: "members",
    label: "Members",
    icon: "account-group",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  { key: "pets", label: "Pets", icon: "paw", color: "#16A34A", bg: "#F0FDF4" },
  {
    key: "items",
    label: "Items",
    icon: "key-variant",
    color: "#0284C7",
    bg: "#F0F9FF",
  },
  {
    key: "place",
    label: "Places",
    icon: "home-map-marker",
    color: "#059669",
    bg: "#ECFDF5",
  },
];

// ======================== FAB COMPONENT ========================

type FabProps = {
  onPress?: () => void;
  style?: object;
  children: React.ReactNode;
  size?: number;
};

// ======================== PILL BADGE COUNTS ========================

interface PillCounts {
  members: number;
  pets: number;
  items: number;
  place: number;
}

// ======================== STICKY SHEET HEADER ========================

interface StickySheetHeaderProps {
  activeSection: string;
  onSectionPress: (key: string) => void;
  pillCounts: PillCounts;
}

// ======================== CUSTOM HANDLE ========================

// ======================== MAIN SCREEN ========================

const MapScreen = () => {
  const cameraRef = useRef<Mapbox.Camera>(null!);
  const sheetRef = useRef<MapBottomSheetRef>(null);
  const sheetScrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const insets = useSafeAreaInsets();
  const updatefrequency = useAuthStore((state) => state.updatefrequency);

  const [sosAlertModal, setSosAlertModal] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("location");
  const [devicesModalVisible, setDevicesModalVisible] = useState(false);
  const [paymentsModalVisible, setPaymentsModalVisible] = useState(false);
  const [taxiModalVisible, setTaxiModalVisible] = useState(false);
  const [taxiRegistrationModalVisible, setTaxiRegistrationModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [meterModalVisible, setMeterModalVisible] = useState(false);
  const [lmsModalVisible, setLmsModalVisible] = useState(false);
  const storeIsModalVisible = useTaxiMeterStore((s) => s.isModalVisible);
  const setStoreModalVisible = useTaxiMeterStore((s) => s.setModalVisible);

  useEffect(() => {
    if (storeIsModalVisible) {
      setMeterModalVisible(true);
    }
  }, [storeIsModalVisible]);
  const [sosDetails, setSosDetails] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);
  const [activeSection, setActiveSection] = useState("members");
  const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [isMapStyleModalOpen, setIsMapStyleModalOpen] = useState(false);
  const [placeModalMode, setPlaceModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [mapLayerStyle, setMapLayerStyle] = useState<MapType>("standard");
  const [locationBeingEdited, setLocationBeingEdited] =
    useState<LocationPoint | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [isAddEntityModalVisible, setIsAddEntityModalVisible] = useState(false);
  const [entityTypeToAdd, setEntityTypeToAdd] = useState<"pet" | "item" | null>(
    null,
  );

  const [editMemberModalVisible, setEditMemberModalVisible] = useState(false);
  const [memberBeingEdited, setMemberBeingEdited] = useState<any>(null);
  const [selectedMemberLocationId, setSelectedMemberLocationId] = useState<
    string | number | null
  >(null);
  const [selectedLocationExists, setSelectedLocationExists] = useState(true);

  const handleOpenMapLayersModal = () => setIsMapStyleModalOpen(true);
  const handleChangeMapStyle = (type: MapType) => {
    setMapLayerStyle(type);
    setIsMapStyleModalOpen(false);
  };

  const lastSeenNotificationIdRef = useRef<string | null>(null);
  const batteryLevelRef = useRef<number | null>(null);
  const lastBatterySyncRef = useRef<number>(0);
  const lowBatteryAlertSentRef = useRef(false);
  const processedSosIdsRef = useRef<Set<string>>(new Set());
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore((state) => state.user);

  const isUserCovered = useMemo(() => {
    return evaluateCoverage(user, user?.metadata);
  }, [user]);

  useEffect(() => {
    if (!isUserCovered && activeTab === "taxi") {
      setActiveTab("location");
    }
  }, [isUserCovered, activeTab]);

  const StickySheetHeader: React.FC<StickySheetHeaderProps> = ({
    activeSection,
    onSectionPress,
    pillCounts,
  }) => (
    <View style={styles.stickyHeadercontainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stickyHeaderpillsRow}
      >
        {QUICK_ACTIONS.map((item) => {
          const isActive = activeSection === item.key;
          const count = pillCounts[item.key as keyof PillCounts] ?? 0;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onSectionPress(item.key)}
              activeOpacity={0.75}
              style={[
                styles.stickyHeaderpill,
                isActive && { backgroundColor: item.bg, borderColor: item.bg },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={14}
                color={isActive ? item.color : "#888"}
              />
              <Text
                style={[
                  styles.stickyHeaderpillLabel,
                  isActive && { color: item.color, fontWeight: "600" },
                ]}
              >
                {item.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.stickyHeaderbadge,
                    { backgroundColor: isActive ? item.color : "#AAAAAA" },
                  ]}
                >
                  <Text style={styles.stickyHeaderbadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.stickyHeaderdivider} />
    </View>
  );

  const Fab = ({ onPress, style, children, size = 46 }: FabProps) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.quickfab,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );


  // ── Animated position shared value (driven by BottomSheet) ──
  const animatedPosition = useSharedValue(SCREEN_HEIGHT * 0.55);

  // ── Toast animation shared value ──
  const toastAnim = useSharedValue(0);

  // ======================== INVITE FLOW HANDLER ========================

  const handleStartInviteFlow = () => {
    if (!selectedCircle) {
      Alert.alert(
        "Select a circle",
        "Choose a circle first to invite new members.",
      );
      return;
    }
    setShareTargetCircle(selectedCircle);
    setShareRequestId((prev: any) => prev + 1);
    setIsCirclesModalOpen(true);
  };

  // ======================== TAB PRESS ========================

  const handleTabPress = useCallback((key: TabKey) => {
    if (key === "payments") {
      setPaymentsModalVisible(true);
      return;
    }

    if (key === "taxi") {
      if (!isUserCovered) {
        Alert.alert(
          "Service Unavailable",
          "Taxi service is currently only available in covered operational areas."
        );
        return;
      }
      setTaxiModalVisible(true);
      return;
    }

    if (key === "driver") {
      setDriverModalVisible(true);
      return;
    }

    if (key === "meter") {
      setMeterModalVisible(true);
      return;
    }

    if (key === "lms") {
      setLmsModalVisible(true);
      return;
    }
    setActiveTab(key);
  }, []);

  // ======================== BATTERY ========================

  const postBatteryLevel = useCallback((level: number, force = false) => {
    const now = Date.now();
    if (!force && lastBatterySyncRef.current > 0) {
      if (now - lastBatterySyncRef.current < BATTERY_SYNC_MIN_INTERVAL_MS)
        return;
    }
    lastBatterySyncRef.current = now;
    void sendBatteryLevelValue(level);
  }, []);

  const handleLowBatteryAlert = useCallback((level: number) => {
    if (level <= LOW_BATTERY_THRESHOLD) {
      if (lowBatteryAlertSentRef.current) return;
      lowBatteryAlertSentRef.current = true;
      void sendLowBatteryAlert(level, LOW_BATTERY_THRESHOLD).catch((error) => {
        console.warn("Failed to send low battery alert", error);
        lowBatteryAlertSentRef.current = false;
      });
    } else if (lowBatteryAlertSentRef.current) {
      lowBatteryAlertSentRef.current = false;
    }
  }, []);

  // ======================== USEMAPSCREEN HOOK ========================
  const router = useRouter();
  const {
    loading,
    loadingStatus,
    location,
    isLeavingCircle,
    isDeletingCircle,
    assignedLocationsByCircle,
    selectedCircle,
    fadeAnim,
    progressAnim,
    setShareRequestId,
    setShareTargetCircle,
    initializeAppData,
    AdminOrCreatorCheck,
    loadAssignedLocations,
    handleLeaveCircle,
    handleDeleteCircle,
    shareTargetCircle,
    shareRequestId,
    handleShareHandled,
    currentUserId,
    currentUserBatteryLevel,
    setCurrentUserBatteryLevel,
    accountActionsVisible,
    isCircleCreator,
    setAccountActionsVisible,
    refreshNotifications,
    handleNotificationReceived,
    isNotificationToastVisible,
    setIsNotificationToastVisible,
    latestNotification,
    setLatestNotification,
    setLocation,
    currentMembership,
  } = useMapScreen();

  const {
    // ============================= STORE DATA AND BACKEND DATA GET ======================
    logout,
    updateProfile,
    UpdateProfileLoading,

    // =============================  STATE  ========================
    isCirclesModalOpen,
    isProfileModalVisible,
    setIsProfileModalVisible,
    handleSelectCircle,
    setIsCirclesModalOpen,
  } = useSettingsScreen();

  // ========================= CIRCLE DATA HOOKS======================//
  const { data: circlesList, isLoading, refetch } = useGetCircles();
  const { data: memberLocations } = useGetMemberLocations(
    Number(updatefrequency),
  );

  // ======================  UPDATE AND ADD AND REMOVE =============

  const {
    mutate: changeRole,
    isPending: isPendingChangeRole,
    isError: isErrorChangeRole,
    error: errorChangeRole,
  } = useChangeMemberRole(selectedCircle);

  const {
    mutate: changeNickname,
    isPending: isPendingChangeNickname,
    isError: isErrorChangeNickname,
    error: errorChangeNickname,
  } = useChangeMemberNickname(selectedCircle);

  const {
    mutate: changeRelationship,
    isPending: isPendingChangeRelationship,
    isError: isErrorChangeRelationship,
    error: errorChangeRelationship,
  } = useChangeMemberRelationship(selectedCircle);

  const {
    mutate: RemoveRelationship,
    isPending: isPendingRemoveRelationship,
    isError: isErrorRemoveRelationship,
    error: errorRemoveRelationship,
  } = useRemoveMemberRelationship(selectedCircle);

  const {
    mutate: RemoveMemeber,
    isPending: isPendingRemoveMember,
    isError: isErrorRemoveMember,
    error: errorRemoveMemeber,
  } = useRemoveMember(selectedCircle);

  const {
    mutate: AddTrackignDevice,
    isPending: isPendingAddTrackignDevice,
    isError: isErrorAddTrackignDevice,
    error: errorAddTrackignDevice,
  } = useAddTrackingDevice(selectedCircle);

  const {
    mutate: UpdateTrackignDevice,
    isPending: isPendingUpdateTrackignDevice,
    isError: isErrorUpdateTrackignDevice,
    error: errorUpdateTrackignDevice,
  } = useUpdateTrackingDevice(selectedCircle);

  const {
    mutate: RemoveTrackignDevice,
    isPending: isPendingRemoveTrackignDevice,
    isError: isErrorRemoveTrackignDevice,
    error: errorRemoveTrackignDevice,
  } = useRemoveTrackingDevice(selectedCircle);

  const {
    data: notificationItem,
    isLoading: notificatinLoading,
    refetch: notificationRefetch,
  } = useGetNotifications(
    {
      page: 1,
      perPage: 20,
    },
    15000,
  );

  const notificationUnreadCount = useMemo(() => {
    const notifs = notificationItem?.data?.notifications;
    return Array.isArray(notifs)
      ? notifs.filter((n: any) => !n.read).length
      : 0;
  }, [notificationItem]);
  // ========================= CIRCLE DATA HOOKS======================//

  const { startBackgroundTracking, stopBackgroundTracking } =
    useBackgroundTracker();

  // ======================== PANEL HANDLERS ========================

  const handleEditMember = useCallback((member: Member) => {
    setMemberBeingEdited(member);
    setSelectedMemberLocationId(null);
    setSelectedLocationExists(true);
    setEditMemberModalVisible(true);
  }, []);

  const handleRemoveMember = useCallback((member: Member) => {
    RemoveMemeber(member.id);
  }, []);

  const handleEditEntity = useCallback((entity: TrackedEntity) => {
    console.log("Edit entity", entity);
  }, []);

  const handleRemoveEntity = useCallback((entity: TrackedEntity) => {
    RemoveTrackignDevice(entity.id);
  }, []);

  const handleEditSavedPlace = (locationPoint: LocationPoint) => {
    if (!selectedCircle) {
      Alert.alert("Select a circle", "Choose a circle before editing a place.");
      return;
    }

    const hasValidId =
      locationPoint?.id !== undefined &&
      locationPoint?.id !== null &&
      String(locationPoint.id).trim().length > 0;
    if (!hasValidId) {
      Alert.alert(
        "Cannot edit place",
        "This saved location is missing an identifier and cannot be updated.",
      );
      return;
    }
    sheetRef.current?.snapToIndex(0);
    setPlaceModalMode("edit");
    setLocationBeingEdited(locationPoint);
    setIsAddPlaceModalOpen(true);
  };

  const handleDeletePlace = useCallback((place: SavedPlace) => {
    console.log("Delete place", place);
  }, []);

  const closeEditMemberModal = useCallback(() => {
    setEditMemberModalVisible(false);
    setMemberBeingEdited(null);
    setSelectedMemberLocationId(null);
  }, []);

  const handleOpenAddEntityModal = (type: "pet" | "item") => {
    setEntityTypeToAdd(type);
    setIsAddEntityModalVisible(true);
  };

  const handleAddPet = useCallback(() => handleOpenAddEntityModal("pet"), []);
  const handleAddItem = useCallback(() => handleOpenAddEntityModal("item"), []);

  const handleAddPlace = useCallback(() => {
    if (!selectedCircle) {
      Alert.alert("Select a circle", "Choose a circle before adding a place.");
      return;
    }
    sheetRef.current?.snapToIndex(0);
    setPlaceModalMode("create");
    setLocationBeingEdited(null);
    setIsAddPlaceModalOpen(true);
  }, [selectedCircle]);

  const handleFocusPlace = useCallback((place: SavedPlace) => {
    cameraRef.current?.setCamera({
      centerCoordinate: [place.longitude, place.latitude],
      zoomLevel: 15,
      animationDuration: 800,
    });
    sheetRef.current?.snapToIndex(0);
  }, []);

  // ======================== SETTINGS HYDRATION ========================

  useEffect(() => {
    if (loading || !selectedCircle?.id) return;

    const enableTracking = async () => {
      const { fgGranted, bgGranted } = await requestAllLocationPermissions();
      if (fgGranted && bgGranted) {
        await startBackgroundTracking();
      }
    };
    enableTracking();
  }, [loading, selectedCircle?.id, startBackgroundTracking]);

  useEffect(() => {
    let cancelled = false;
    const hydrateSettings = async () => {
      try {
        const [storedLocationSharing, storedNotifications] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.locationSharingEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
        ]);
        if (cancelled) return;

        const initialLocationSharing = parseBooleanPreference(
          storedLocationSharing,
          true,
        );
        setLocationSharingEnabled(initialLocationSharing);

        if (!initialLocationSharing && isNativePlatform) {
          try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(
              BACKGROUND_LOCATION_TASK_NAME,
            );
            if (hasStarted)
              await Location.stopLocationUpdatesAsync(
                BACKGROUND_LOCATION_TASK_NAME,
              );
          } catch (stopError) {
            console.warn(
              "Failed to stop location updates during settings hydration",
              stopError,
            );
          }
        }

        const initialNotifications = parseBooleanPreference(
          storedNotifications,
          true,
        );
        setNotificationsEnabled(initialNotifications);
        await setNotificationReceptionEnabled(initialNotifications);
        if (initialNotifications) await requestNotificationPermissions();
      } catch (error) {
        if (!cancelled)
          console.warn("Failed to hydrate settings preferences", error);
      }
    };
    void hydrateSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // ======================== BATTERY SYNC ========================

  useEffect(() => {
    let cancelled = false;
    const syncInitialBattery = async () => {
      const level = await readBatteryLevel();
      console.log(level);
      if (cancelled || level === null) return;
      batteryLevelRef.current = level;
      postBatteryLevel(Number(level), true);
      handleLowBatteryAlert(level);
    };
    void syncInitialBattery();

    const unsubscribe = watchBatteryLevel((level) => {
      if (cancelled) return;
      const previousLevel = batteryLevelRef.current;
      batteryLevelRef.current = level;
      const shouldForce =
        previousLevel === null ||
        Math.abs(level - (previousLevel ?? level)) >= 1;
      postBatteryLevel(level, shouldForce);
      handleLowBatteryAlert(level);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [handleLowBatteryAlert, postBatteryLevel]);

  // ======================== NOTIFICATION POLLING ========================

  useEffect(() => {
    const notifs = notificationItem?.data?.notifications;
    if (!notifs || notifs.length === 0) return;

    const latest = notifs[0];
    const isUnread = !latest.read;
    const notifTime = new Date(latest.createdAt).getTime();
    const isRecent = notifTime > Date.now() - 5 * 60 * 1000;
    if (latest.id !== lastSeenNotificationIdRef.current) {
      if (isUnread && isRecent) {
        setLatestNotification(latest);
        setIsNotificationToastVisible(true);
      }
      lastSeenNotificationIdRef.current = latest.id;
    }
  }, [notificationItem, setIsNotificationToastVisible, setLatestNotification]);

  // ======================== NOTIFICATION TOAST ANIMATION ========================
  // Drives the toast in/out and auto-dismisses it after a few seconds.
  // This is the piece that was missing — the state was being set, but
  // nothing was ever rendered for it.
  const [toastMounted, setToastMounted] = useState(false);
  useEffect(() => {
    if (toastHideTimerRef.current) {
      clearTimeout(toastHideTimerRef.current);
      toastHideTimerRef.current = null;
    }

    if (isNotificationToastVisible) {
      setToastMounted(true);
      toastAnim.value = withTiming(1, { duration: 220 });
      toastHideTimerRef.current = setTimeout(() => {
        setIsNotificationToastVisible(false);
      }, 4000);
    } else {
      toastAnim.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setToastMounted)(false);
      });
    }

    return () => {
      if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
    };
  }, [isNotificationToastVisible, setIsNotificationToastVisible, toastAnim]);

  const toastAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: toastAnim.value,
      transform: [{ translateY: (1 - toastAnim.value) * -16 }],
    };
  });

  const handlePressNotificationToast = useCallback(() => {
    setIsNotificationToastVisible(false);
    setNotificationModalVisible(true);
  }, [setIsNotificationToastVisible]);

  const handleDismissNotificationToast = useCallback(() => {
    setIsNotificationToastVisible(false);
  }, [setIsNotificationToastVisible]);

  const notificationToastTitle =
    latestNotification?.metadata?.title ||
    latestNotification?.metadata?.Title ||
    (latestNotification?.type
      ? String(latestNotification.type).charAt(0).toUpperCase() +
        String(latestNotification.type).slice(1).replace(/_/g, " ")
      : "Notification");

  const handleOpenChat = async () => {
    const url = "sms:";
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Chat Unavailable", "Unable to open the messaging app.");
    }
  };

  // ======================== SOS EXECUTOR ========================

  const executeSosAlert = useCallback(async () => {
    if (isSendingSos) return;
    if (!selectedCircle) {
      Alert.alert(
        "Select a circle",
        "Choose a circle before sending an SOS alert.",
      );
      return;
    }
    setIsSendingSos(true);
    try {
      const circleId = normalizeIdentifier(selectedCircle.id);
      if (!circleId)
        throw new Error(
          "We could not determine which circle to notify. Please select a circle and try again.",
        );

      const circleName = asNonEmptyString(selectedCircle.name);
      // const memberIds = selectedCircleMembers
      //   .map((member) => resolveMemberId(member))
      //   .filter(
      //     (memberId): memberId is string =>
      //       typeof memberId === "string" && memberId.trim().length > 0,
      //   )
      //   .filter((memberId) => !currentUserId || memberId !== currentUserId);
      // const notifyMemberIds = Array.from(new Set(memberIds));

      let coords = location;
      if (!coords) {
        try {
          const latest = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: latest.coords.latitude,
            longitude: latest.coords.longitude,
            heading: latest.coords.heading ?? undefined,
          };
          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            heading: coords.heading,
          });
        } catch (positionError) {
          console.warn(
            "Unable to refresh location for SOS alert",
            positionError,
          );
        }
      }
      if (!coords)
        throw new Error("We could not determine your current location.");

      const payload: Record<string, unknown> = {
        message: circleName
          ? `Emergency SOS – ${circleName}`
          : "Emergency SOS alert",
        latitude: coords.latitude,
        longitude: coords.longitude,
        circleId,
      };
      if (circleName) payload.circleName = circleName;
      if (currentUserId) payload.senderId = currentUserId;
      // if (notifyMemberIds.length) payload.notifyMemberIds = notifyMemberIds;

      const response = await SafetyService.sendSosAlert(payload);
      const successMessage =
        typeof response?.message === "string" &&
        response.message.trim().length > 0
          ? response.message
          : "SOS alert sent successfully.";
      Alert.alert("SOS sent", successMessage);
    } catch (error: any) {
      const message =
        typeof error.message === "string" && error.message.trim().length > 0
          ? error.message
          : "Unable to send the SOS alert.";
      Alert.alert("SOS failed", message);
    } finally {
      setIsSendingSos(false);
    }
  }, [currentUserId, isSendingSos, location, selectedCircle, setLocation]);

  // ======================== SOS PRESS HANDLER ========================

  const handlePressSos = useCallback(() => {
    if (isSendingSos) return;
    if (!selectedCircle) {
      Alert.alert(
        "Select a circle",
        "Choose a circle before sending an SOS alert.",
      );
      return;
    }
    Alert.alert(
      "Send SOS alert?",
      "This will notify your circle members using your current location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "destructive",
          onPress: () => {
            void executeSosAlert();
          },
        },
      ],
    );
  }, [executeSosAlert, isSendingSos, selectedCircle]);

  // ======================== LOCATE ME ========================

  const handleLocatePress = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Allow location access to center the map on your position.",
        );
        return;
      }

      let coords = location;
      try {
        const latest = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = {
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
          heading: latest.coords.heading ?? undefined,
          accuracy: latest.coords.accuracy ?? null,
          speed: latest.coords.speed ?? null,
        };
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading,
          accuracy: coords.accuracy,
          speed: coords.speed,
        });
      } catch (positionError) {
        console.warn("Unable to refresh location for locate", positionError);
      }

      if (!coords) {
        Alert.alert(
          "Location unavailable",
          "We could not determine your current location. Try again in a moment.",
        );
        return;
      }

      cameraRef.current?.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 16,
        animationDuration: 800,
      });
    } catch (error) {
      console.warn("Failed to locate current position", error);
      Alert.alert(
        "Location unavailable",
        "We could not center the map on your location.",
      );
    }
  }, [location, setLocation]);

  // ======================== SOS FOCUS EFFECT ========================

  useFocusEffect(
    useCallback(() => {
      const enable = async () => {
        await setNotificationReceptionEnabled(true, {
          onNavigate: (data: any) => {
            const id: any = data.sosId ?? data.id;
            if (processedSosIdsRef.current.has(id)) return;
            processedSosIdsRef.current.add(id);
            setSosDetails((prev) => [...prev, data]);
            cameraRef.current?.setCamera({
              centerCoordinate: [data.longitude, data.latitude],
              zoomLevel: 15,
              animationDuration: 1000,
            });
            setSosAlertModal(data);
          },
          onNotificationReceived: handleNotificationReceived,
        });
      };
      enable();
      return () => {
        setNotificationReceptionEnabled(false);
      };
    }, [handleNotificationReceived]),
  );

  // ======================== SCROLL-AWARE SECTION TRACKING ========================

  const handleSheetScroll = useCallback(
    (event: any) => {
      const scrollY = event?.nativeEvent?.contentOffset?.y ?? 0;
      const THRESHOLD = 60;
      const placeY = sectionPositions.current["place"];
      const itemsY = sectionPositions.current["items"];
      const petsY = sectionPositions.current["pets"];

      if (placeY !== undefined && scrollY >= placeY - THRESHOLD) {
        if (activeSection !== "place") setActiveSection("place");
        return;
      }
      if (itemsY !== undefined && scrollY >= itemsY - THRESHOLD) {
        if (activeSection !== "items") setActiveSection("items");
        return;
      }
      if (petsY !== undefined && scrollY >= petsY - THRESHOLD) {
        if (activeSection !== "pets") setActiveSection("pets");
        return;
      }
      if (activeSection !== "members") setActiveSection("members");
    },
    [activeSection],
  );

  // ======================== OPEN & SCROLL TO SECTION ========================

  const openAndScrollTo = useCallback((key: string) => {
    setActiveSection(key);
    sheetRef.current?.snapToIndex(2);
    setTimeout(() => {
      const y = sectionPositions.current[key];
      if (y === undefined) return;
      sheetScrollRef.current?.scrollTo({
        y: Math.max(y - 10, 0),
        animated: true,
      });
    }, 450);
  }, []);

  // ======================== LOCATION HISTORY ========================

  const locationHistorySection = useLocationHistorySection({
    currentUserBatteryLevel,
    setCurrentUserBatteryLevel,
    setAccountActionsVisible,
  });

  // ======================== INIT EFFECTS ========================

  useEffect(() => {
    initializeAppData();
    Keyboard.dismiss();
  }, [initializeAppData]);

  useEffect(() => {
    setNotificationsLoading(true);
    refreshNotifications().finally(() => setNotificationsLoading(false));
  }, [refreshNotifications]);

  useEffect(() => {
    Mapbox.setTelemetryEnabled(false);
  }, []);

  // Keep a live GPS fix so the "me" pin matches other member pins.
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;

        const latest = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocation({
            latitude: latest.coords.latitude,
            longitude: latest.coords.longitude,
            heading: latest.coords.heading ?? undefined,
            accuracy: latest.coords.accuracy ?? null,
            speed: latest.coords.speed ?? null,
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading ?? undefined,
              accuracy: pos.coords.accuracy ?? null,
              speed: pos.coords.speed ?? null,
            });
          },
        );
      } catch (error) {
        console.warn("Failed to watch current location", error);
      }
    };

    void startWatching();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [setLocation]);

  const myProfileImage = useMemo(() => {
    const avatar = user?.avatar;
    if (typeof avatar !== "string" || avatar.trim().length === 0) return null;
    const trimmed = avatar.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://api.servefamily.com${trimmed}`;
  }, [user?.avatar]);

  const mySpeedKmh = useMemo(() => {
    const metersPerSecond = location?.speed;
    if (metersPerSecond == null || !Number.isFinite(metersPerSecond) || metersPerSecond < 0) {
      return 0;
    }
    return Math.round(metersPerSecond * 3.6 * 10) / 10;
  }, [location?.speed]);

  const handleClosePlaceModal = useCallback(() => {
    setIsAddPlaceModalOpen(false);
    setLocationBeingEdited(null);
    setPlaceModalMode("create");
  }, []);

  // ======================== DERIVED — SAVED PLACES ========================
  // NOTE: derivedSavedPlaces must be defined before allPoints / mapBounds

  const isLocationAssigned = useCallback(
    (locationId: string): boolean => {
      if (!selectedCircle?.id || !locationId) return false;
      const currentCircleId = normalizeIdentifier(selectedCircle.id);
      if (!currentCircleId) return false;
      return (
        assignedLocationsByCircle[currentCircleId]?.locationId === locationId
      );
    },
    [selectedCircle?.id, assignedLocationsByCircle],
  );

  const derivedSavedPlaces = useMemo<SavedPlace[]>(() => {
    if (!selectedCircle?.locations) return [];

    return selectedCircle.locations.map((loc: any) => ({
      id: loc.id,
      name: loc.name ?? "Unnamed place",
      type: loc.type as SavedPlace["type"],
      latitude: loc.latitude,
      longitude: loc.longitude,
      area: loc.metadata?.radius,
      isAssigned: isLocationAssigned(loc.id),
    }));
  }, [selectedCircle, isLocationAssigned]);

  // ======================== DERIVED — MAP BOUNDS ========================

  const allPoints = useMemo(() => {
    const memberPoints = Array.isArray(memberLocations?.data)
      ? memberLocations.data
          .filter((m: any) => m.longitude && m.latitude)
          .map((m: any) => [m.longitude, m.latitude])
      : [];

    const circleLocationPoints = derivedSavedPlaces
      ? derivedSavedPlaces
          .filter((m) => m.longitude && m.latitude)
          .map((m) => [m.longitude, m.latitude])
      : [];

    return [...memberPoints, ...circleLocationPoints];
  }, [memberLocations?.data, derivedSavedPlaces]);

  const mapBounds = useMemo(() => {
    if (allPoints.length === 0) return undefined;
    if (allPoints.length === 1) {
      return {
        ne: [allPoints[0][0] + 0.01, allPoints[0][1] + 0.01] as [
          number,
          number,
        ],
        sw: [allPoints[0][0] - 0.01, allPoints[0][1] - 0.01] as [
          number,
          number,
        ],
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: 120,
        paddingBottom: 240,
      };
    }
    const longs = allPoints.map((c) => c[0]);
    const lats = allPoints.map((c) => c[1]);
    return {
      ne: [Math.max(...longs), Math.max(...lats)] as [number, number],
      sw: [Math.min(...longs), Math.min(...lats)] as [number, number],
      paddingLeft: 80,
      paddingRight: 80,
      paddingTop: 120,
      paddingBottom: 240,
    };
  }, [allPoints]);

  const topOffset = insets.top;

  const t = useTheme();

  // ======================== SYNC TRACKED ENTITIES FROM CIRCLE ========================
  useEffect(() => {
    if (Array.isArray(selectedCircle?.entities)) {
      setTrackedEntities(selectedCircle.entities);
    } else {
      setTrackedEntities([]);
    }
  }, [selectedCircle?.entities]);

  // ======================== DERIVED — PILL COUNTS ========================

  const pillCounts = useMemo<PillCounts>(() => {
    const safeEntities = Array.isArray(trackedEntities) ? trackedEntities : [];
    return {
      members: 0,
      pets: safeEntities.filter((e) => e.type === "pet").length,
      items: safeEntities.filter((e) => e.type === "item").length,
      place: derivedSavedPlaces?.length ?? 0,
    };
  }, [trackedEntities, derivedSavedPlaces?.length]);

  // ======================== STYLES ========================

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },

    headerContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: t.space[4],
      paddingBottom: t.space[2],
      zIndex: 10,
    },

    roundButton: {
      width: 44,
      height: 44,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.surface,
      justifyContent: "center",
      alignItems: "center",
      ...t.shadows.md,
    },

    notificationFabBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: COLORS.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: t.colors.background,
    },
    notificationFabBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#fff",
    },

    circleSelector: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.colors.surface,
      marginHorizontal: t.space[3],
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[2],
      borderRadius: t.radius.full,
      ...t.shadows.md,
    },

    selectorTextContainer: { flex: 1, justifyContent: "center" },

    selectorLabel: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      textTransform: "uppercase",
      fontWeight: t.typography.weight.bold,
      letterSpacing: t.typography.tracking.widest,
    },

    circleName: {
      fontSize: t.typography.size.base,
      fontWeight: t.typography.weight.bold,
      color: t.colors.primary,
    },

    leftColumn: {
      position: "absolute",
      left: 14,
      zIndex: 0,
    },

    rightColumn: {
      position: "absolute",
      right: 14,
      zIndex: 0,
    },

    bottomFabRow: {
      position: "absolute",
      display: "none",
      left: 14,
      right: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 10,
    },

    checkInButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.white,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      gap: 6,
    },

    checkInLabel: { color: C.primary, fontWeight: "600", fontSize: 14 },

    sosButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.sos,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      shadowColor: C.sos,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
      gap: 6,
    },

    sosLabel: { color: C.white, fontWeight: "700", fontSize: 14 },

    pillButtonSpinner: { marginLeft: 8 },

    layersFab: {
      backgroundColor: C.white,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },

    sheetBg: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },

    contentContainer: { width: "100%", flex: 1 },

    memberModalOverlay: {
      flex: 1,
      backgroundColor: t.colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: t.space[5],
    },
    memberModalBackdrop: { ...StyleSheet.absoluteFillObject },
    memberModalCard: {
      width: "100%",
      backgroundColor: t.colors.surface,
      borderRadius: t.radius["2xl"],
      paddingHorizontal: t.space[5],
      paddingTop: t.space[5],
      paddingBottom: t.space[6],
    },
    memberModalTitle: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      textAlign: "center",
    },
    memberModalSubtitle: {
      fontSize: t.typography.size.base,
      color: t.colors.textTertiary,
      textAlign: "center",
      marginTop: t.space[1],
      marginBottom: t.space[4],
    },
    memberModalLabel: {
      fontSize: t.typography.size.base,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textPrimary,
      marginBottom: t.space[2],
    },
    profileAvatarRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: t.space[2],
      marginBottom: t.space[2],
    },
    profileAvatarPreviewWrapper: {
      width: 72,
      height: 72,
      borderRadius: t.radius.full,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      marginRight: t.space[4],
    },
    profileAvatarImage: { width: "100%", height: "100%" },
    profileAvatarPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    profileAvatarActions: { flex: 1 },
    profileAvatarPrimaryButton: {
      paddingVertical: t.space[2],
      borderRadius: t.radius.md,
      backgroundColor: t.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[2],
    },
    profileAvatarPrimaryText: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.semibold,
    },
    profileAvatarSecondaryButton: {
      paddingVertical: t.space[2],
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    profileAvatarSecondaryText: {
      color: t.colors.textTertiary,
      fontWeight: t.typography.weight.semibold,
    },
    memberModalInput: {
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[2],
      fontSize: 15,
      color: t.colors.textPrimary,
      backgroundColor: t.colors.backgroundAlt,
    },
    memberModalTextarea: { minHeight: 100, textAlignVertical: "top" },
    memberModalError: {
      color: t.colors.error,
      fontSize: 13,
      marginTop: t.space[3],
      textAlign: "center",
    },
    memberModalButtonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: t.space[6],
    },
    memberModalSecondaryButton: {
      flex: 1,
      paddingVertical: t.space[3],
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: t.space[3],
    },
    memberModalSecondaryText: {
      fontSize: 15,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
    },
    memberModalPrimaryButton: {
      flex: 1,
      paddingVertical: t.space[3],
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    memberModalPrimaryButtonDisabled: {
      backgroundColor: t.colors.textDisabled,
    },
    memberModalPrimaryText: {
      fontSize: 15,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textOnPrimary,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    mapStyleModalContent: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    modalCloseIcon: { padding: 4 },
    activateSosText: { fontSize: 13, fontWeight: "600", color: COLORS.accent },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: COLORS.black,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    horizontalOptionsContainer: { paddingHorizontal: 20, gap: 15 },
    mapPreviewCard: {
      width: SCREEN_WIDTH * 0.32,
      alignItems: "center",
      marginRight: 4,
    },
    mapPreviewInner: {
      width: SCREEN_WIDTH * 0.32,
      height: SCREEN_WIDTH * 0.26,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      overflow: "hidden",
    },
    mapPreviewInnerSelected: {
      borderWidth: 2.5,
      borderColor: COLORS.primary,
      borderRadius: 16,
    },
    mapPreviewLabelContainer: { width: "100%", alignItems: "center" },
    mapPreviewLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: COLORS.black,
      textAlign: "center",
    },
    activeStyleIndicatorBar: { alignItems: "center", paddingVertical: 14 },
    activeStyleIndicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#E0E0E0",
    },

    Dragcontainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
      paddingBottom: 8,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomWidth: 0.5,
      borderBottomColor: t.colors.border,
    },
    pill: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.colors.border,
    },
    hint: {
      fontSize: 10,
      color: t.colors.textSecondary,
      marginTop: 4,
      letterSpacing: 0.3,
    },

    quickfab: {
      backgroundColor: t.colors.background,
      alignItems: "center",
      justifyContent: "center",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 5,
    },

    stickyHeadercontainer: {
      backgroundColor: "#FFFFFF",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    stickyHeaderpillsRow: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      alignItems: "center",
    },
    stickyHeaderpill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      backgroundColor: "#FFFFFF",
    },
    stickyHeaderpillLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: "#475569",
    },
    stickyHeaderbadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
      backgroundColor: "#16A34A",
    },
    stickyHeaderbadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    stickyHeaderdivider: { height: 1, backgroundColor: "#F1F5F9" },

    // Notification toast
    notificationToast: {
      position: "absolute",
      left: 14,
      right: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      zIndex: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    notificationToastIconBox: {
      width: 34,
      height: 34,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.selectedBg ?? "#EEEDFE",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      flexShrink: 0,
    },
    notificationToastBody: { flex: 1, minWidth: 0 },
    notificationToastTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: t.colors.textPrimary,
      marginBottom: 2,
    },
    notificationToastMessage: {
      fontSize: 12,
      color: t.colors.textSecondary,
    },
    notificationToastClose: {
      marginLeft: 8,
      padding: 2,
    },
  });

  // ======================== LOADING SCREEN ========================

  if (loading) {
    return (
      <LocationPermissionGate>
        <LoadingScreen
          progressAnim={progressAnim}
          fadeAnim={fadeAnim}
          loadingStatus={loadingStatus}
        />
      </LocationPermissionGate>
    );
  }

  // ======================== RENDER ========================

  return (
    <View style={styles.container}>
      <LocationPermissionGate>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />

        {/* ── Map ── */}
        <Mapbox.MapView
          style={StyleSheet.absoluteFillObject}
          styleURL={Platform.OS === "ios" ? resolveMapStyleURL(mapLayerStyle) : undefined}
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={false}
          localizeLabels={true}
          surfaceView={Platform.OS === "android"}
          preferredFramesPerSecond={60}
        >
          {Platform.OS === "android" && (
            <Mapbox.RasterSource id="osmTileSource" tileSize={256} tileUrlTemplates={[OSM_TILE_URL]}>
              <Mapbox.RasterLayer id="osmTileLayer" style={{ rasterOpacity: 1 }} />
            </Mapbox.RasterSource>
          )}
          <Mapbox.Camera
            ref={cameraRef}
            {...(mapBounds
              ? {
                  bounds: {
                    ne: mapBounds.ne,
                    sw: mapBounds.sw,
                    paddingLeft: mapBounds.paddingLeft,
                    paddingRight: mapBounds.paddingRight,
                    paddingTop: mapBounds.paddingTop,
                    paddingBottom: mapBounds.paddingBottom,
                  },
                  animationDuration: 2000,
                }
              : {})}
          />

          {/* Current user pin — same avatar pin style as other members */}
          {location?.latitude != null && location?.longitude != null && (
            <CustomMarker
              key="current-user-live"
              id={String(currentUserId ?? "me")}
              coordinate={[location.longitude, location.latitude]}
              name={(user?.name ?? "You") as string}
              profileImage={myProfileImage}
              battery={
                typeof currentUserBatteryLevel?.batteryLevel === "number"
                  ? currentUserBatteryLevel.batteryLevel
                  : 0
              }
              speed={mySpeedKmh}
              status="online"
              direction={location.heading ?? 0}
              lastSeen="Now"
              onlineStatus="online"
              accuracy={
                typeof location.accuracy === "number" && location.accuracy > 0
                  ? location.accuracy
                  : 50
              }
              cameraRef={cameraRef}
              activeMarkerId={activeMarkerId}
              onMarkerPress={setActiveMarkerId}
              onJourneyPress={() => {
                locationHistorySection.handleOpenLocationHistoryModal(
                  user?.name ?? "You",
                );
              }}
            />
          )}

          {/* Member markers */}
          {memberLocations?.data &&
            memberLocations.data
              .filter((m: any) => {
                if (m.latitude == null || m.longitude == null) return false;
                // Prefer the live GPS pin for the signed-in user.
                if (
                  location &&
                  currentUserId &&
                  String(m.id) === String(currentUserId)
                ) {
                  return false;
                }
                return true;
              })
              .map((m: any) =>
                m.type === "user" ? (
                  <CustomMarker
                    key={m.id}
                    battery={parseFloat(String(m.battery ?? "0").replace("%", ""))}
                    coordinate={[m.longitude, m.latitude]}
                    name={(m.name ?? "Unknown") as string}
                    status={m.status as any}
                    direction={80}
                    id={m.id as string}
                    lastSeen={m.lastSeenText}
                    onlineStatus={m.status}
                    profileImage={
                      typeof m.avatar === "string" && m.avatar.trim().length > 0
                        ? `https://api.servefamily.com${m.avatar.trim()}`
                        : null
                    }
                    speed={m.speed as number}
                    cameraRef={cameraRef}
                    activeMarkerId={activeMarkerId}
                    onMarkerPress={setActiveMarkerId}
                    onJourneyPress={() => {
                      locationHistorySection.handleOpenLocationHistoryModal(
                        m.name ?? "Member",
                      );
                    }}
                  />
                ) : m.type === "entity" ? (
                  m.relationship === "item" ? (
                    <ItemMarker
                      key={m.id}
                      id={String(m.id)}
                      coordinate={[m.longitude, m.latitude]}
                      name={(m.name ?? "Item") as string}
                      lastSeen={m.lastSeenText}
                      itemKind={m.itemKind ?? "other"} // "key" | "bag" | "wallet" | "laptop" | "other"
                      cameraRef={cameraRef}
                      activeMarkerId={activeMarkerId}
                      onMarkerPress={setActiveMarkerId}
                    />
                  ) : m.relationship === "pet" ? (
                    <PetMarker
                      key={m.id}
                      id={String(m.id)}
                      coordinate={[m.longitude, m.latitude]}
                      name={(m.name ?? "Pet") as string}
                      lastSeen={m.lastSeenText}
                      petKind={m.petKind ?? "other"} // "dog" | "cat" | "bird" | "rabbit" | "other"
                      cameraRef={cameraRef}
                      activeMarkerId={activeMarkerId}
                      onMarkerPress={setActiveMarkerId}
                    />
                  ) : (
                    <GpsDeviceMarker
                      key={m.id}
                      id={String(m.id)}
                      coordinate={[m.longitude, m.latitude]}
                      name={(m.name ?? "GPS Device") as string}
                      lastSeen={m.lastSeenText}
                      battery={
                        m.battery != null
                          ? parseFloat(String(m.battery).replace("%", ""))
                          : undefined
                      }
                      signal={m.signal}
                      cameraRef={cameraRef}
                      activeMarkerId={activeMarkerId}
                      onMarkerPress={setActiveMarkerId}
                    />
                  )
                ) : null,
              )}

          {/* Saved place markers */}
          {derivedSavedPlaces
            .filter((m) => m.longitude != null && m.latitude != null)
            .map((m) => (
              <SavedPlaceMarker
                key={m.id}
                coordinate={[m.longitude, m.latitude]}
                accuracy={m.area as any}
                id={m.id as any}
                color={m.isAssigned ? "yellow" : "red"}
                label={m.name}
                cameraRef={cameraRef}
                activeMarkerId={activeMarkerId}
                onMarkerPress={setActiveMarkerId}
              />
            ))}

          {/* SOS markers — only show the most recent one */}
          {sosDetails.slice(-1).map((s: any, index: number) => (
            <SosMarker
              key={s.sosId ?? `sos-${index}`}
              coordinate={[s.longitude, s.latitude]}
              name={s.title ?? s.name ?? "SOS"}
              triggeredAt={new Date()}
              type={s.type}
              cameraRef={cameraRef}
              id={s.sosId ?? s.id ?? `sos-${index}`}
              activeMarkerId={activeMarkerId}
              onMarkerPress={setActiveMarkerId}
            />
          ))}
        </Mapbox.MapView>

        {/* ── Header ── */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => router.push("/(Dashboard)/setttings")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="settings-sharp"
              size={24}
              color={t.colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleSelector}
            onPress={() => setIsCirclesModalOpen(true)}
            activeOpacity={0.9}
          >
            <View style={styles.selectorTextContainer}>
              <Text style={styles.selectorLabel}>Current Circle</Text>
              <Text style={styles.circleName} numberOfLines={1}>
                {selectedCircle ? selectedCircle.name : "Select Circle"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setAccountActionsVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="person-circle-outline"
              size={26}
              color={t.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Notification toast (new notification received) ── */}
        {(isNotificationToastVisible || toastAnim.value > 0) &&
          toastMounted &&
          latestNotification && (
            <Animated.View
              style={[
                styles.notificationToast,
                { top: insets.top + 64 },
                toastAnimatedStyle,
              ]}
              pointerEvents={isNotificationToastVisible ? "auto" : "none"}
            >
              <TouchableOpacity
                style={styles.notificationToastIconBox}
                activeOpacity={0.85}
                onPress={handlePressNotificationToast}
              >
                <Ionicons
                  name="notifications"
                  size={18}
                  color={t.colors.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationToastBody}
                activeOpacity={0.85}
                onPress={handlePressNotificationToast}
              >
                <Text style={styles.notificationToastTitle} numberOfLines={1}>
                  {notificationToastTitle}
                </Text>
                <Text style={styles.notificationToastMessage} numberOfLines={2}>
                  {latestNotification?.message || "You have a new update."}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationToastClose}
                onPress={handleDismissNotificationToast}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={t.colors.textTertiary}
                />
              </TouchableOpacity>
            </Animated.View>
          )}

        {/* ── Left FAB (Message floating button under Settings button) ── */}
        <View style={[styles.leftColumn, { top: topOffset + 72 }]}>
          <Fab
            onPress={handleOpenChat}
            style={[{ marginBottom: 10 }, styles.roundButton]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={t.colors.textPrimary}
            />
          </Fab>
        </View>

        {/* ── Right FABs ── */}
        <View style={[styles.rightColumn, { top: topOffset + 72 }]}>
          <Fab
            onPress={() => setNotificationModalVisible(true)}
            style={[{ marginBottom: 10 }, styles.roundButton]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={t.colors.textPrimary}
            />
            {notificationUnreadCount > 0 && (
              <View style={styles.notificationFabBadge}>
                <Text style={styles.notificationFabBadgeText}>
                  {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                </Text>
              </View>
            )}
          </Fab>
        </View>

        {/* ── Bottom FAB Row ── */}
        <MapFabRow
          animatedPosition={animatedPosition}
          bottomInset={insets.bottom}
          onLocatePress={() => {
            void handleLocatePress();
          }}
          onSosPress={handlePressSos}
          isSendingSos={isSendingSos}
          onLayersPress={handleOpenMapLayersModal}
        />
        {/* ── Bottom Sheet ── */}
        <MapBottomSheet
          ref={sheetRef}
          activeSection={activeSection}
          onSectionPress={openAndScrollTo}
          pillCounts={pillCounts}
          animatedPosition={animatedPosition}
          onScroll={handleSheetScroll}
        >
          {/* Must be the direct BottomSheet child so it gets a bounded height
              and can scroll long member lists. */}
          <BottomSheetScrollView
            ref={sheetScrollRef as any}
            style={{ flex: 1 }}
            contentContainerStyle={[
              quickTabStyle.sheetContent,
              { paddingBottom: TAB_BAR_HEIGHT + 160 },
            ]}
            stickyHeaderIndices={[0]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces={Platform.OS === "ios"}
            overScrollMode="never"
            nestedScrollEnabled
            onScroll={handleSheetScroll}
          >
            <StickySheetHeader
              activeSection={activeSection}
              onSectionPress={openAndScrollTo}
              pillCounts={pillCounts}
            />

            {/* Members */}
            <View
              onLayout={(e) => {
                sectionPositions.current["members"] = e.nativeEvent.layout.y;
              }}
            >
              <MembersPanel
                members={memberLocations?.data ?? []}
                circleName={selectedCircle?.name}
                creatorId={selectedCircle?.creatorId}
                allowEdit={AdminOrCreatorCheck()}
                allowRemove={AdminOrCreatorCheck()}
                isRemoving={false}
                currentUserId={currentUserId as any}
                onInvite={handleStartInviteFlow}
                onEditMember={handleEditMember}
                onRemoveMember={handleRemoveMember}
                onFocusMap={(memberId) => {
                  console.log("Focus member:", memberId);
                }}
              />
            </View>

            {/* Pets & Items */}
            <View
              onLayout={(e) => {
                sectionPositions.current["pets"] = e.nativeEvent.layout.y;
              }}
            >
              <PetsAndItemsPanel
                entities={memberLocations?.data ?? []}
                allowEdit={AdminOrCreatorCheck()}
                allowRemove={AdminOrCreatorCheck()}
                isRemoving={false}
                onAddPet={handleAddPet}
                onAddItem={handleAddItem}
                onEditEntity={handleEditEntity}
                onRemoveEntity={handleRemoveEntity}
                onFocusMap={(entityId) => {
                  console.log("Focus entity:", entityId);
                }}
                onItemsSectionLayout={(innerY) => {
                  const panelY = sectionPositions.current["pets"] ?? 0;
                  sectionPositions.current["items"] = panelY + innerY;
                }}
              />
            </View>

            {/* Places */}
            <View
              onLayout={(e) => {
                sectionPositions.current["place"] = e.nativeEvent.layout.y;
              }}
            >
              <PlacesPanel
                places={derivedSavedPlaces}
                isDeleting={false}
                canManage={AdminOrCreatorCheck()}
                onAddPlace={handleAddPlace}
                onEditPlace={handleEditSavedPlace}
                onDeletePlace={handleDeletePlace}
                onFocusPlace={handleFocusPlace}
              />
            </View>
          </BottomSheetScrollView>
        </MapBottomSheet>

        {/* ── Tab Bar ── */}
        <MapTabBar
          activeTab={activeTab as MapTabKey}
          onTabPress={(key) => handleTabPress(key as TabKey)}
          userRole={user?.role}
          metadata={user?.metadata}
          user={user}
          isCovered={isUserCovered}
        />

        {/* ══════════════════ MODALS ══════════════════ */}

        {/* Devices */}
        <DevicesModal
          visible={devicesModalVisible}
          onClose={() => setDevicesModalVisible(false)}
        />

        {/* Payments */}
        <PaymentModal
          visible={paymentsModalVisible}
          onClose={() => setPaymentsModalVisible(false)}
          currentPlanName="Free"
        />

        {/* Taxi Services */}
        <TaxiModal
          visible={taxiModalVisible}
          onClose={() => setTaxiModalVisible(false)}
        />

        {/* Taxi Registration */}
        <TaxiRegistrationModal
          isOpen={taxiRegistrationModalVisible}
          onClose={() => setTaxiRegistrationModalVisible(false)}
        />

        {/* Driver Dashboard */}
        <DriverModal
          isOpen={driverModalVisible}
          onClose={() => setDriverModalVisible(false)}
          onOpenRegisterModal={() => setTaxiRegistrationModalVisible(true)}
        />

        {/* Digital Taxi Meter & Floating Overlay Widget */}
        <TaxiMeterModal
          visible={meterModalVisible}
          onClose={() => {
            setMeterModalVisible(false);
            setStoreModalVisible(false);
          }}
        />
        <FloatingTaxiMeterWidget />

        <ManageMemberModal
          visible={editMemberModalVisible}
          onClose={closeEditMemberModal}
          member={memberBeingEdited}
          currentUserRole={
            isCircleCreator
              ? "creator"
              : ((currentMembership?.role as MemberRole) ?? "member")
          }
          circleId={selectedCircle?.id}
          locations={selectedCircle?.Locations}
        />

        {/* Add Place */}
        <AddPlaceModal
          visible={isAddPlaceModalOpen}
          mode={placeModalMode}
          circleId={selectedCircle?.id ?? null}
          circleName={selectedCircle?.name ?? null}
          editingLocation={locationBeingEdited}
          onClose={handleClosePlaceModal}
          onPlaceSaved={loadAssignedLocations}
        />

        {/* Account Actions */}
        <AccountActionsModal
          visible={accountActionsVisible}
          onClose={() => setAccountActionsVisible(false)}
          topPadding={insets.top + 64}
          onPressProfile={() => setIsProfileModalVisible(true)}
          onPressLocationHistory={
            locationHistorySection.handleOpenLocationHistoryModal
          }
          isCovered={isUserCovered}
          onPressRegisterTaxi={() => {
            setAccountActionsVisible(false);
            if (!isUserCovered && user?.role !== "driver") {
              Alert.alert(
                "Service Unavailable",
                "Taxi registration is currently only available in covered operational areas."
              );
              return;
            }
            setTaxiRegistrationModalVisible(true);
          }}
          onPressDriverDashboard={() => {
            setAccountActionsVisible(false);
            setDriverModalVisible(true);
          }}
          onPressLogout={logout}
          onPressDeleteAccount={() => {
            router.push("/(Dashboard)/Deleteaccountscreen");
          }}
          isCircleCreator={isCircleCreator}
          onPressDeleteCircle={handleDeleteCircle}
          onPressLeaveCircle={handleLeaveCircle}
          isDeletingCircle={isDeletingCircle}
          isLeavingCircle={isLeavingCircle}
          canDeleteCircle={Boolean(selectedCircle)}
          canLeaveCircle={Boolean(selectedCircle)}
        />

        {locationHistorySection.modal}

        {/* Profile Modal */}
        <UpdateProfileModal
          key={isProfileModalVisible ? `open-${user?.id}` : "closed"}
          visible={isProfileModalVisible}
          isLoading={UpdateProfileLoading}
          onClose={() => setIsProfileModalVisible(false)}
          onSave={async ({ name, metadata, avatarUpload }) => {
            await updateProfile({
              name: name,
              metadata: metadata,
              profileImage: avatarUpload,
            });
          }}
          initialName={user?.name as string}
          initialMetadata={user?.metadata?.address as any}
          currentAvatarUri={user?.avatar as string}
          prepareImageAsWebp={prepareImageAsWebp}
        />

        {/* Circles */}
        <CirclesModal
          isOpen={isCirclesModalOpen}
          onClose={() => setIsCirclesModalOpen(false)}
          onRefresh={refetch as any}
          circles={circlesList}
          loadingCircles={isLoading}
          onSelectCircle={handleSelectCircle}
          shareTargetCircle={shareTargetCircle as any}
          shareRequestId={shareRequestId}
          onShareHandled={handleShareHandled}
        />

        {/* Notifications */}
        <NotificationModal
          visible={notificationModalVisible}
          onClose={() => setNotificationModalVisible(false)}
          notifications={notificationItem?.data?.notifications}
          onRefresh={notificationRefetch}
          isLoading={notificatinLoading}
        />

        {/* LMS WebView Modal */}
        <LmsModal
          visible={lmsModalVisible}
          onClose={() => setLmsModalVisible(false)}
          circleId={selectedCircle?.id}
          circleName={selectedCircle?.name}
        />

        {/* Add Entity (Pet / Item) */}
        <AddEntityModal
          visible={isAddEntityModalVisible}
          onClose={() => setIsAddEntityModalVisible(false)}
          circleId={selectedCircle?.id || null}
          entityType={entityTypeToAdd}
          onEntityAdded={refetch}
        />

        {/* Map Style Picker */}
        <Modal
          visible={isMapStyleModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsMapStyleModalOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsMapStyleModalOpen(false)}
          >
            <View
              style={[
                styles.mapStyleModalContent,
                {
                  paddingBottom:
                    Platform.OS === "ios" ? insets.bottom + 10 : 20,
                },
              ]}
            >
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity
                  onPress={() => setIsMapStyleModalOpen(false)}
                  style={styles.modalCloseIcon}
                >
                  <Ionicons name="close" size={24} color={COLORS.black} />
                </TouchableOpacity>
                <Text style={styles.activateSosText}>Activate SOS →</Text>
              </View>

              <Text style={styles.modalTitle}>Map type</Text>

              <FlashList
                data={mapStylesList}
                keyExtractor={(item) => item.key}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalOptionsContainer}
                snapToInterval={SCREEN_WIDTH * 0.35 + 15}
                decelerationRate="fast"
                renderItem={({ item }) => {
                  const isSelected = mapLayerStyle === item.key;
                  return (
                    <TouchableOpacity
                      style={styles.mapPreviewCard}
                      onPress={() => handleChangeMapStyle(item.key)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.mapPreviewInner,
                          isSelected && styles.mapPreviewInnerSelected,
                        ]}
                      >
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "55%",
                            backgroundColor: item.gradientTop,
                            borderTopLeftRadius: isSelected ? 13 : 16,
                            borderTopRightRadius: isSelected ? 13 : 16,
                          }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: "50%",
                            backgroundColor: item.gradientBot,
                            borderBottomLeftRadius: isSelected ? 13 : 16,
                            borderBottomRightRadius: isSelected ? 13 : 16,
                          }}
                        />
                        <Ionicons
                          name={item.icon as any}
                          size={32}
                          color="rgba(255,255,255,0.92)"
                          style={{ zIndex: 1 }}
                        />
                        {isSelected && (
                          <View
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: COLORS.primary,
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 2,
                            }}
                          >
                            <Ionicons name="checkmark" size={13} color="#fff" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.mapPreviewLabel,
                          isSelected && {
                            color: COLORS.primary,
                            fontWeight: "700",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.activeStyleIndicatorBar}>
                <View style={styles.activeStyleIndicator} />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* SOS Alert */}
        {sosAlertModal && (
          <Modal
            visible={!!sosAlertModal}
            transparent
            animationType="slide"
            onRequestClose={() => setSosAlertModal(null)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  overflow: "hidden",
                  paddingBottom: insets.bottom,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#ef4444",
                    padding: 20,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}
                  >
                    {sosAlertModal.type === "crash"
                      ? "Crash Detected!"
                      : "SOS Alert!"}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      marginTop: 4,
                      fontSize: 14,
                    }}
                  >
                    {sosAlertModal.title ?? sosAlertModal.name} needs help
                  </Text>
                </View>

                <View style={{ padding: 20 }}>
                  <Text
                    style={{ fontSize: 15, color: "#444", marginBottom: 6 }}
                  >
                    Location received. Tap below to get directions or dismiss.
                  </Text>
                  <View
                    style={{ flexDirection: "row", gap: 12, marginTop: 16 }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#ddd",
                        alignItems: "center",
                        backgroundColor: "#f5f5f5",
                      }}
                      onPress={() => {
                        const id = sosAlertModal.sosId ?? sosAlertModal.id;
                        setSosDetails((prev) =>
                          prev.filter((s) => (s.sosId ?? s.id) !== id),
                        );
                        setSosAlertModal(null);
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "600",
                          color: "#333",
                          fontSize: 15,
                        }}
                      >
                        OK
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: "#ef4444",
                        alignItems: "center",
                      }}
                      onPress={() => {
                        setSosAlertModal(null);
                        openDirections(
                          sosAlertModal.latitude,
                          sosAlertModal.longitude,
                        );
                        setSosDetails([]);
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "700",
                          color: "#fff",
                          fontSize: 15,
                        }}
                      >
                        Get Directions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </LocationPermissionGate>
    </View>
  );
};

// ======================== SHEET CONTENT STYLES ========================

const quickTabStyle = StyleSheet.create({
  sheetContent: { paddingHorizontal: 16, paddingTop: 8 },
});

export default MapScreen;