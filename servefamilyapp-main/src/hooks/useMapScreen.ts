// FIXME :  meke thawa thiye balanna 

/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated } from "react-native";
import { create } from "zustand";
import { UserServices } from "../Services/UserServices";
import { NotificationService } from "../Services/NotificationServices";
import { AssignedLocationRecord, BatteryLevelInfo, CircleData, UserLocation } from "../types/models";
import { CircleNotificationSettings, NotificationItem } from "../types/Alltypes";
import { useAuthStore } from "../store/authStore";
import {
    asNonEmptyString,
    normalizeRole,
    resolveMemberId,
} from "../utils/mapScreenHelpers";
import {
    buildAssignedLocationRecord,
    parseAssignedLocationsList,
} from "../utils/mapUtils";
import {
    getLastSelectedCircleId,
    updateUserAvatar,
} from "../utils/tokenManager";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
    MIN_ASSIGNED_REFRESH_INTERVAL_MS,
} from "../constants/MapConstants";
import { useDeleteCircle, useGetCircleDetails, useLeaveCircle } from "./Usecircle";
import { useGetNotificationSettings, useUpdateNotificationSettings } from "./useSettings";

// ─────────────────────────────────────────────────────────────
// UserStore types & Zustand store (previously UserStore.ts)
// ─────────────────────────────────────────────────────────────

interface UserStoreLocation {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number;
    updatedAt?: string;
}

interface BatteryInfo {
    level: number;
    deviceId: string | null;
    updatedAt: string | null;
}

interface UserProfile {
    id: string | null;
    name: string | null;
    email: string | null;
    avatar: string | null;
    batteryLevel: BatteryInfo | null;
    [key: string]: any;
}

interface UserState {
    profile: UserProfile | null;
    currentLocation: UserStoreLocation | null;
    assignedLocations: any[];
    isLoading: boolean;
    fetchProfile: () => Promise<void>;
    updateLocation: (
        circleId: string | number,
        location: { latitude: number; longitude: number; name: string; speed: number },
    ) => Promise<void>;
    fetchAssignedLocations: () => Promise<void>;
    setCurrentLocation: (location: UserStoreLocation) => void;
    updateProfileLocally: (fields: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
    profile: null,
    currentLocation: null,
    assignedLocations: [],
    isLoading: false,

    fetchProfile: async () => {
        set({ isLoading: true });
        try {
            const response = await UserServices.GetProfile();
            const data = response?.data?.data ?? response?.data ?? null;
            set({ profile: data });
        } catch (error) {
            console.warn("Failed to fetch profile", error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateLocation: async (circleId, { latitude, longitude, name, speed }) => {
        try {
            await UserServices.UpdateLiveLocation(circleId, latitude, longitude, name, speed);
            set({ currentLocation: { latitude, longitude } });
        } catch (error) {
            console.warn("Failed to update location", error);
        }
    },

    fetchAssignedLocations: async () => {
        try {
            const response = await UserServices.GetAsignLocations();
            const data = response?.data?.data ?? response?.data ?? [];
            set({ assignedLocations: Array.isArray(data) ? data : [] });
        } catch (error) {
            console.warn("Failed to fetch assigned locations", error);
        }
    },

    setCurrentLocation: (location) => set({ currentLocation: location }),

    updateProfileLocally: (fields) => {
        const current = get().profile;
        if (!current) return;
        set({ profile: { ...current, ...fields } });
    },
}));

// ─────────────────────────────────────────────────────────────
// useMapScreen — merges useUser + useMapScreen
// ─────────────────────────────────────────────────────────────

export const useMapScreen = () => {
    // ── Animated refs ──
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const loadingAssignedLocationsRef = useRef(false);
    const lastAssignedFetchTimestampRef = useRef(0);
    const shareRequestCounter = useRef(0);


    const user = useAuthStore((state) => state.user);


    // ── UserStore ──
    const {
        profile,
        currentLocation,
        assignedLocations,
        isLoading: isStoreLoading,
        updateLocation,
        fetchAssignedLocations,
        setCurrentLocation,
    } = useUserStore();

    // ─────────────────────────────────────────────
    // Map state
    // ─────────────────────────────────────────────

    const [loadingStatus, setLoadingStatus] = useState("Initializing...");
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(true);
    const [memberAvatarUrls, setMemberAvatarUrls] = useState<Record<string, string | null>>({});
    const [memberLocations, setMemberLocations] = useState<Record<string, UserLocation>>({});
    const [currentNotificationSettings, setCurrentNotificationSettings] =
        useState<CircleNotificationSettings>({});
    const [isCircleNotificationSettingsModalVisible, setIsCircleNotificationSettingsModalVisible] =
        useState(false);
    const [isSavingCircleNotificationSettings, setIsSavingCircleNotificationSettings] =
        useState(false);
    const [isLeavingCircle, setIsLeavingCircle] = useState(false);
    const [loadingAssignedLocations, setLoadingAssignedLocations] = useState(false);
    const [assignedLocationsByCircle, setAssignedLocationsByCircle] = useState<
        Record<string, AssignedLocationRecord>
    >({});
    const [isDeletingCircle, setIsDeletingCircle] = useState(false);

    // ── Circles modal share state ──
    const [shareTargetCircle, setShareTargetCircle] = useState<CircleData | null>(null);
    const [shareRequestId, setShareRequestId] = useState<number | undefined>(undefined);

    // ── Notification state ──
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
    const [isNotificationToastVisible, setIsNotificationToastVisible] = useState(false);

    // ─────────────────────────────────────────────
    // User (previously useUser) state
    // ─────────────────────────────────────────────

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserBatteryLevel, setCurrentUserBatteryLevel] = useState<BatteryLevelInfo | null>(null);
    const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
    const [profileAvatarOriginal, setProfileAvatarOriginal] = useState<string | null>(null);
    const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
    const [isPickingProfileImage, setIsPickingProfileImage] = useState(false);
    const [profileModalError, setProfileModalError] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [accountActionsVisible, setAccountActionsVisible] = useState(false);
    const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);

    // ─────────────────────────────────────────────
    // User memos
    // ─────────────────────────────────────────────



    // ─────────────────────────────────────────────
    // fetchCurrentUserProfile (previously in useUser)
    // ─────────────────────────────────────────────

    const fetchCurrentUserProfile = useCallback(async () => {
        try {
            const userIdCandidate = user?.id;

            const normalizedUserId = userIdCandidate !== undefined && userIdCandidate !== null
                ? String(userIdCandidate)
                : null;

            if (normalizedUserId) setCurrentUserId(normalizedUserId);

            const avatarFromProfile = user?.avatar ? String(user.avatar) : null;
            setCurrentUserAvatarUrl(avatarFromProfile ?? null);

            if (avatarFromProfile) {
                setProfileAvatarOriginal(avatarFromProfile);
                setProfileAvatarPreview(avatarFromProfile);
                void updateUserAvatar(avatarFromProfile);

                if (normalizedUserId) {
                    setMemberAvatarUrls((prev) => {
                        if (prev[normalizedUserId] === avatarFromProfile) return prev;
                        return { ...prev, [normalizedUserId]: avatarFromProfile };
                    });
                }
            } else {
                setProfileAvatarOriginal(null);
                setProfileAvatarPreview(null);
            }

            if (user?.batteryLevel) {
                const batteryData = user.batteryLevel as Record<string, unknown>;
                setCurrentUserBatteryLevel({
                    batteryLevel: batteryData.level as number,
                    deviceId: asNonEmptyString(batteryData.deviceId) ?? null,
                    updatedAt: asNonEmptyString(batteryData.updatedAt) ?? null,
                });
            } else {
                setCurrentUserBatteryLevel(null);
            }

            if (normalizedUserId) {
                const possibleLocation = user?.currentLocation as Record<string, unknown> | undefined;
                if (
                    possibleLocation &&
                    Number.isFinite(possibleLocation.latitude) &&
                    Number.isFinite(possibleLocation.longitude)
                ) {
                    setMemberLocations((prev: any) => {
                        const existing = prev[normalizedUserId];
                        if (
                            existing &&
                            existing.latitude === possibleLocation.latitude &&
                            existing.longitude === possibleLocation.longitude &&
                            existing.accuracy === possibleLocation.accuracy
                        ) {
                            return prev;
                        }
                        return { ...prev, [normalizedUserId]: possibleLocation };
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch current user profile", error);
        }
    }, []);

    // ─────────────────────────────────────────────
    // Profile modal actions (previously in useUser)
    // ─────────────────────────────────────────────

    const handleOpenProfileModal = useCallback(() => {
        const existingAvatar = currentUserAvatarUrl;
        setProfileAvatarOriginal(existingAvatar);
        setProfileAvatarPreview(existingAvatar);
        setProfileModalError(null);
        setIsProfileModalVisible(true);
        setAccountActionsVisible(false);
    }, [currentUserAvatarUrl, profileAvatarOriginal]);



    const handlePickProfileImage = useCallback(async () => {
        if (isSavingProfile || isPickingProfileImage) return;
        try {
            setProfileModalError(null);
            setIsPickingProfileImage(true);

            if (Platform.OS === "ios") {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permission.status !== "granted") {
                    Alert.alert("Permission required", "Allow photo library access to update your profile picture.");
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            const uri = asset.uri;
            if (!uri) return;
        } catch (error) {
            console.warn("Failed to pick profile image", error);
            Alert.alert("Image error", "We couldn't open that image. Please try again.");
        } finally {
            setIsPickingProfileImage(false);
        }
    }, [isPickingProfileImage, isSavingProfile]);

    const handleSubmitProfileUpdate = useCallback(async (Username: string, Usermetadata: any, avatar: any) => {
        if (isSavingProfile) return;
        setProfileModalError(null);
        setIsSavingProfile(true);

        try {
            const trimmedName = Username.trim();
            const trimmedMetadata = Usermetadata ? Usermetadata.trim() : "";
            const hasAvatarChange = Boolean(avatar) && avatar.uri !== profileAvatarOriginal;
            const hasFieldUpdates = trimmedName.length > 0 || trimmedMetadata.length > 0;

            if (!hasAvatarChange && !hasFieldUpdates) {
                setProfileModalError("Nothing to update.");
                setIsSavingProfile(false);
                return;
            }

            const name = trimmedName || undefined;
            const metadata = trimmedMetadata || undefined;
            const profileImage = hasAvatarChange
                ? {
                    uri: avatar!.uri,
                    type: avatar!.type,
                    name: avatar!.name,
                }
                : undefined;

            const response = await UserServices.UpdateProfile(name, metadata, profileImage);

            console.log("Profile update response:", response);

            useAuthStore.getState().updateUser(response.data);
            setIsProfileModalVisible(false);
            Alert.alert("Success", "Profile updated successfully!");

            // if (selectedCircle?.id) {
            //     await useCircleStore.getState().fetchCircleMembers(selectedCircle.id, currentUserId);
            // } else {
            //     await useCircleStore.getState().fetchCircles();
            // }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update profile.";
            setProfileModalError(message);
            console.error("Profile Update Error:", error);
        } finally {
            setIsSavingProfile(false);
        }
    }, [
        currentUserId,
        fetchCurrentUserProfile,
        isSavingProfile,
    ]);

    const closeProfileModal = useCallback(() => {
        if (isSavingProfile) return;
        setIsProfileModalVisible(false);
        setProfileAvatarPreview(profileAvatarOriginal);
    }, [isSavingProfile, profileAvatarOriginal]);

    const toggleCirclesModal = () => setIsCirclesModalOpen((prev) => !prev);



    // ─────────────────────────────────────────────
    // Map actions (previously in useMapScreen)
    // ─────────────────────────────────────────────

    const loadAssignedLocations = useCallback(async (force: boolean = false) => {
        if (loadingAssignedLocationsRef.current) return;

        if (!force) {
            const elapsed = Date.now() - lastAssignedFetchTimestampRef.current;
            if (elapsed < MIN_ASSIGNED_REFRESH_INTERVAL_MS) return;
        }

        loadingAssignedLocationsRef.current = true;
        setLoadingAssignedLocations(true);

        try {
            const response = await UserServices.GetAsignLocations();
            const rawList = parseAssignedLocationsList(response);

            if (!rawList.length) {
                setAssignedLocationsByCircle({});
                return;
            }

            const map: Record<string, AssignedLocationRecord> = {};
            for (const item of rawList) {
                const normalized = buildAssignedLocationRecord(item);
                if (!normalized) continue;
                map[normalized.circleId] = normalized.record;
            }
            setAssignedLocationsByCircle(map);
        } catch (error) {
            console.warn("Failed to load assigned locations", error);
        } finally {
            loadingAssignedLocationsRef.current = false;
            setLoadingAssignedLocations(false);
            lastAssignedFetchTimestampRef.current = Date.now();
        }
    }, []);

    const isInitializingRef = useRef(false);

    const initializeAppData = useCallback(async () => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        try {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } catch (e) {
            console.warn("fadeAnim error:", e);
        }

        try {
            setLoadingStatus("Checking permissions...");
            try {
                Animated.timing(progressAnim, { toValue: 0.1, duration: 500, useNativeDriver: false }).start();
            } catch (e) {}

            try {
                const fg = await Location.getForegroundPermissionsAsync().catch(() => null);
                if (fg?.status === "granted") {
                    const pos =
                        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ||
                        (await Location.getLastKnownPositionAsync().catch(() => null));

                    if (pos && pos.coords) {
                        setLocation({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            heading: pos.coords.heading || 0,
                            accuracy: Number.isFinite(pos.coords.accuracy)
                                ? (pos.coords.accuracy ?? null)
                                : null,
                            speed: pos.coords.speed ?? null,
                        });
                    }
                }
            } catch (e) {
                console.warn("Location permission/load error:", e);
            }

            setLoadingStatus("Loading your profile...");
            try {
                Animated.timing(progressAnim, { toValue: 0.3, duration: 500, useNativeDriver: false }).start();
            } catch (e) {}

            try {
                await fetchCurrentUserProfile();
            } catch (e) {
                console.warn("Fetch profile error:", e);
            }
            await delay(300);

            setLoadingStatus("Syncing circles...");
            try {
                Animated.timing(progressAnim, { toValue: 0.6, duration: 500, useNativeDriver: false }).start();
            } catch (e) {}

            await delay(300);

            try {
                await loadAssignedLocations();
            } catch (e) {
                console.warn("Load assigned locations error:", e);
            }

            setLoadingStatus("Loading places...");
            try {
                Animated.timing(progressAnim, { toValue: 0.9, duration: 400, useNativeDriver: false }).start();
                Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
            } catch (e) {}

            setLoadingStatus("Ready!");
            await delay(200);
        } catch (error) {
            console.error("Startup sequence error:", error);
        } finally {
            setLoading(false);
            isInitializingRef.current = false;
        }
    }, [fetchCurrentUserProfile, loadAssignedLocations, fadeAnim, progressAnim]);








    // ===========================  handle Select Circle ==============================
    const [selectedCircle, setSelectedCircle] = useState<any>()
    const { data: circlesData, isLoading: CircleDataLoading } = useGetCircleDetails();


    useEffect(() => {
        if (CircleDataLoading) {
            setSelectedCircle(null);
        } else {
            setSelectedCircle(circlesData?.data);
        }

    }, [circlesData])

    const handleSelectCircle = useCallback(
        async (circleId: any) => {
            if (circleId) {
                useAuthStore.getState().setActiveCircleId(circleId);
                setIsCirclesModalOpen(false);
            }
        },
        [],
    );


    // ===============================  Current Membership ======================================
    const currentMembership = useMemo((): { role?: string } | null => {
        if (!currentUserId || !selectedCircle) return null;

        const members: unknown[] =
            (Array.isArray(selectedCircle.users) && selectedCircle.users) ||
            (Array.isArray(selectedCircle.members) && selectedCircle.members) ||
            (Array.isArray(selectedCircle.Members) && selectedCircle.Members) ||
            [];

        const me = members.find(
            (m) => resolveMemberId(m as any) === String(currentUserId),
        ) as
            | {
                  role?: string;
                  Membership?: { role?: string };
              }
            | undefined;

        if (!me) return { role: "member" };

        const role =
            normalizeRole(me.Membership?.role ?? me.role) ?? "member";
        return { role };
    }, [currentUserId, selectedCircle]);


    // ======================= Creator Id =================================
    const circleCreatorId = useMemo(() => {
        const raw = selectedCircle?.creator?.id;
        if (raw === undefined || raw === null) return null;
        return String(raw);
    }, [selectedCircle]);


    // ================================  Creator Check ==========================
    const isCircleCreator = useMemo(() => {
        if (!user?.id || !circleCreatorId) return false;
        return user?.id === circleCreatorId;
    }, [circleCreatorId, user?.id]);

    // ================================ Admin OR Creator Check ====================
    const AdminOrCreatorCheck = () => {
        if (!selectedCircle) return;
        // const myMemberRecord = selectedCircleMembers.find((m) => resolveMemberId(m) === currentUserId);
        // const role = normalizeRole(myMemberRecord?.role);
        if (selectedCircle?.creator?.id === user?.id) return true;
        // else if (role === "admin") return true;
        else return false;
    };


    // =============================== Notification Setings ==========================
    const {
        data: NotificationSettings,
        isLoading: notificationSettingsLoading
    } = useGetNotificationSettings(selectedCircle?.id);


    const handleOpenCircleNotificationSettings = () => {
        if (!selectedCircle) return;
        if (!AdminOrCreatorCheck()) {
            Alert.alert("Permission Denied", "Only circle creators and admins can update notification settings.");
            return;
        }
        const settings = !notificationSettingsLoading && NotificationSettings;

        console.log(selectedCircle)
        console.log(settings)
        setCurrentNotificationSettings(settings);
        setIsCircleNotificationSettingsModalVisible(true);
    };
    const {
        mutate: UpdateNotificationSettings
    } = useUpdateNotificationSettings(selectedCircle?.id);
    const handleSaveCircleNotificationSettings = async (newSettings: CircleNotificationSettings) => {
        if (!selectedCircle) return;
        setIsSavingCircleNotificationSettings(true);
        try {
            UpdateNotificationSettings(newSettings);
            Alert.alert("Success", "Notification settings updated.");
            setIsCircleNotificationSettingsModalVisible(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update settings.";
            Alert.alert("Error", message);
        } finally {
            setIsSavingCircleNotificationSettings(false);
        }
    };


    // ==================== Lave circle =======================
    const {
        mutate: laveCircle,
        isPending: loadinglaveCircle
    } = useLeaveCircle();

    const executeLeaveCircle = useCallback(async () => {
        if (!selectedCircle) {
            Alert.alert("No circle selected", "Select a circle before leaving.");
            return;
        }
        if (isLeavingCircle) return;

        setIsLeavingCircle(loadinglaveCircle);
        try {
            const circleIdParam =
                typeof selectedCircle.id === "string" ? selectedCircle.id : String(selectedCircle.id);
            laveCircle(circleIdParam);
            useAuthStore.getState().setActiveCircleId("");
            Alert.alert("Circle left", "You have left the circle successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to leave this circle.";
            Alert.alert("Leave failed", message);
        } finally {
            setIsLeavingCircle(loadinglaveCircle);
            setAccountActionsVisible(false);
        }
    }, [isLeavingCircle, selectedCircle]);

    const handleLeaveCircle = useCallback(() => {
        if (!selectedCircle) {
            Alert.alert("No circle selected", "Select a circle before leaving.");
            return;
        }
        setAccountActionsVisible(false);
        const circleName = selectedCircle?.name ?? "this circle";
        Alert.alert("Leave circle", `Are you sure you want to leave ${circleName}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: () => { void executeLeaveCircle(); } },
        ]);
    }, [executeLeaveCircle, selectedCircle]);



    // =================================== Delete Circle ============================

    const {
        mutate: deleteCircle,
        isPending: isPendingDeleteCircle,
    } = useDeleteCircle();

    const executeDeleteCircle = useCallback(async () => {
        if (!selectedCircle) {
            Alert.alert("No circle selected", "Select a circle before deleting.");
            return;
        }
        if (isDeletingCircle) return;

        setIsDeletingCircle(isPendingDeleteCircle);
        try {
            const circleIdParam =
                typeof selectedCircle.id === "string" ? selectedCircle.id : String(selectedCircle.id);
            deleteCircle(circleIdParam);
            useAuthStore.getState().setActiveCircleId("");

            Alert.alert("Circle deleted", "The circle was deleted successfully.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to delete this circle.";
            Alert.alert("Delete failed", message);
        } finally {
            setIsDeletingCircle(isPendingDeleteCircle);
            setAccountActionsVisible(false);
        }
    }, [isDeletingCircle, selectedCircle]);

    const handleDeleteCircle = useCallback(() => {
        if (!selectedCircle) {
            Alert.alert("No circle selected", "Select a circle before deleting.");
            return;
        }
        setAccountActionsVisible(false);
        const circleName = selectedCircle?.name ?? "this circle";
        Alert.alert(
            "Delete circle",
            `Deleting ${circleName} will remove the circle for every member. This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => { void executeDeleteCircle(); } },
            ],
        );
    }, [executeDeleteCircle, selectedCircle]);

    // ─────────────────────────────────────────────
    // Circles modal share actions
    // ─────────────────────────────────────────────

    const handleOpenShareForCircle = useCallback((circle: CircleData) => {
        shareRequestCounter.current += 1;
        setShareTargetCircle(circle);
        setShareRequestId(shareRequestCounter.current);
        setIsCirclesModalOpen(true);
    }, []);

    const handleShareHandled = useCallback(() => {
        setShareTargetCircle(null);
        setShareRequestId(undefined);
    }, []);

    // ─────────────────────────────────────────────
    // Notification actions
    // ─────────────────────────────────────────────

    const refreshNotifications = useCallback(async () => {
        try {
            const response = await NotificationService.getNotifications();
            const data = response?.data?.notifications ?? response ?? [];
            const sorted = [...data].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            setNotifications(sorted);
        } catch (error) {
            console.warn("Failed to refresh notifications", error);
        }
    }, []);

    const handleNotificationReceived = useCallback(
        async (remoteMessage: any) => {
            await refreshNotifications();

            const title =
                remoteMessage.notification?.title || remoteMessage.data?.title || "New Notification";
            const body =
                remoteMessage.notification?.body ||
                remoteMessage.data?.body ||
                remoteMessage.data?.message ||
                "";

            const newItem: NotificationItem = {
                id: remoteMessage.messageId || Date.now().toString(),
                type: remoteMessage.data?.type || "info",
                message: body,
                read: false,
                metadata: { title, ...remoteMessage.data },
                createdAt: new Date().toISOString(),
            };

            setLatestNotification(newItem);
            setIsNotificationToastVisible(true);
        },
        [refreshNotifications],
    );

    // ─────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────

    return {
        // ── UserStore state ──
        profile,
        currentLocation,
        assignedLocations,
        isStoreLoading,

        // ── UserStore actions ──
        updateLocation,
        fetchAssignedLocations,
        setCurrentLocation,

        // ── Map state ──
        setLoading,
        loading,
        loadingStatus,
        location,
        memberAvatarUrls,
        memberLocations,
        currentNotificationSettings,
        isCircleNotificationSettingsModalVisible,
        isSavingCircleNotificationSettings,
        isLeavingCircle,
        isDeletingCircle,
        loadingAssignedLocations,
        assignedLocationsByCircle,
        setLocation,


        selectedCircle,

        // ── Animated values ──
        fadeAnim,
        progressAnim,

        // ── Map setters ──
        setMemberAvatarUrls,
        setMemberLocations,
        setIsCircleNotificationSettingsModalVisible,
        setLoadingStatus,

        // ── Map actions ──
        initializeAppData,
        handleSelectCircle,
        AdminOrCreatorCheck,
        handleOpenCircleNotificationSettings,
        handleSaveCircleNotificationSettings,
        loadAssignedLocations,
        handleLeaveCircle,
        executeLeaveCircle,
        handleDeleteCircle,
        executeDeleteCircle,

        // ── Circles modal share ──
        shareTargetCircle,
        shareRequestId,
        handleOpenShareForCircle,
        handleShareHandled,

        // ── User state ──
        currentUserId,
        currentUserBatteryLevel,
        setCurrentUserBatteryLevel,
        currentUserAvatarUrl,
        profileAvatarOriginal,
        profileAvatarPreview,
        isPickingProfileImage,
        profileModalError,
        isSavingProfile,
        isProfileModalVisible,
        accountActionsVisible,
        isCirclesModalOpen,
        currentMembership,
        circleCreatorId,
        isCircleCreator,

        setIsProfileModalVisible,
        setAccountActionsVisible,
        setIsCirclesModalOpen,

        // ── User actions ──
        fetchCurrentUserProfile,
        handleOpenProfileModal,
        handlePickProfileImage,
        handleSubmitProfileUpdate,
        closeProfileModal,
        toggleCirclesModal,


        // ── Notification state & actions ──
        notifications,
        latestNotification,
        setLatestNotification,
        isNotificationToastVisible,
        setIsNotificationToastVisible,
        refreshNotifications,
        handleNotificationReceived,
        setShareTargetCircle,
        setShareRequestId
    };
};