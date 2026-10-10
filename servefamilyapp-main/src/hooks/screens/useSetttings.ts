import { useAuthStore } from "@/src/store/authStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetCircleDetails, useGetCircles, useUpdateCirlePrivacy, useUpdateNotificationSettings } from "../Usecircle";
import { useGetProfile, useUpdateProfile } from "../Useuserservice";
import { CircleNotificationSettings } from "@/src/types/Alltypes";
import { useGetNotificationSettings } from "../useSettings";
import { Alert } from "react-native";

export const useSettingsScreen = () => {


    // ============================= STORE DATA AND BACKEND DATA GET ======================
    const updatefrequency = useAuthStore((state) => state.updatefrequency);
    const logout = useAuthStore((state) => state.logout);
    const updateUser = useAuthStore((state) => state.updateUser);
    const user = useAuthStore((state) => state.user);


    const { data: circles, isLoading: circleLoading } = useGetCircleDetails();
    const circleId = circles?.data?.id;
    const { data: profileData, isLoading: isprofileDataLoading } = useGetProfile();
    const { mutate: UpdateCirclePrivacy, isPending: loadingUpdateCirclePrivacy } = useUpdateCirlePrivacy(circleId! );
    const {
        data: circlesList,
        isLoading: isCirleloading,
        refetch,
    } = useGetCircles();
    const { mutateAsync: updateProfile, isPending: UpdateProfileLoading } = useUpdateProfile();
    const {
        data: NotificationSettings,
        isLoading: notificationSettingsLoading
    } = useGetNotificationSettings(circleId!);
    const {
        mutate: UpdateNotificationSettings,
        isPending: isSavingCircleNotificationSettings
    } = useUpdateNotificationSettings(circleId!);


    // =============================  STATE  ========================
    // DATA STATE
    const [freqInput, setFreqInput] = useState(updatefrequency ? String(Number(updatefrequency) / 1000) : "60");
    const [currentNotificationSettings, setCurrentNotificationSettings] = useState<CircleNotificationSettings>({});


    // MODAL STATE
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [locationSharingModalVisible, setLocationSharingModalVisible] = useState(false);
    const [PrivacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [qrModalVisible, SetQrModalVisible] = useState(false);
    const [isCircleNotificationSettingsModalVisible, setIsCircleNotificationSettingsModalVisible] = useState(false);
    const [isCirclesModalOpen, setIsCirclesModalOpen] = useState(false);
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [circlesModalView, setCirclesModalView] = useState<"create" | "invitations" | "list" | "share">("create");

    // ================================= USEEFFECT  ========================================

    useEffect(() => {
        if (profileData) {
            updateUser(profileData?.data);
        }
    }, [profileData, updateUser]);

    // ================================= FUNCTIONS ==========================================
    const handleSelectCircle = useCallback(
        async (circleId: any) => {
            if (circleId) {
                useAuthStore.getState().setActiveCircleId(circleId);
                setIsCirclesModalOpen(false);
            }
        },
        [],
    );

    // ======================= Creator Id =================================
    const circleCreatorId = useMemo(() => {
        const raw = circles?.data?.creator?.id;
        if (raw === undefined || raw === null) return null;
        return String(raw);
    }, [circles]);

    // ================================  Creator Check ==========================
    const isCircleCreator = useMemo(() => {
        if (!user?.id || !circleCreatorId) return false;
        return String(user.id) === circleCreatorId;
    }, [circleCreatorId, user?.id]);



    // ================================ Admin OR Creator Check ====================
    const AdminOrCreatorCheck = () => {
        if (!circles?.data) return false;
        if (!user?.id || !circleCreatorId) return false;
        return String(user.id) === circleCreatorId;
    };


    const handleOpenCircleNotificationSettings = () => {
        if (!circles?.data) return;
        if (!AdminOrCreatorCheck()) {
            Alert.alert("Permission Denied", "Only circle creators and admins can update notification settings.");
            return;
        }
        const settings =
            !notificationSettingsLoading && NotificationSettings
                ? NotificationSettings
                : {};
        setCurrentNotificationSettings(settings as CircleNotificationSettings);
        setIsCircleNotificationSettingsModalVisible(true);
    };



    const handleSaveCircleNotificationSettings = async (newSettings: CircleNotificationSettings) => {
        if (!circles) return;
        try {
            UpdateNotificationSettings(newSettings);
            Alert.alert("Success", "Notification settings updated.");
            setIsCircleNotificationSettingsModalVisible(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update settings.";
            Alert.alert("Error", message);
        }
    };



    return {
        // ============================= STORE DATA AND BACKEND DATA GET ======================
        updatefrequency,
        logout,
        updateUser,
        user,
        circles,
        circleLoading,
        profileData,
        isprofileDataLoading,
        UpdateCirclePrivacy,
        loadingUpdateCirclePrivacy,
        circlesList,
        isCirleloading,
        refetch,
        updateProfile,
        UpdateProfileLoading,
        isSavingCircleNotificationSettings,


        // =============================  STATE  ========================
        freqInput,
        setFreqInput,
        inviteModalVisible,
        setInviteModalVisible,
        locationSharingModalVisible,
        setLocationSharingModalVisible,
        PrivacyModalVisible,
        setPrivacyModalVisible,
        qrModalVisible,
        SetQrModalVisible,
        setCurrentNotificationSettings,
        currentNotificationSettings,
        setIsCircleNotificationSettingsModalVisible,
        isCircleNotificationSettingsModalVisible,
        isCirclesModalOpen,
        isProfileModalVisible,
        setIsProfileModalVisible,
        handleSelectCircle,
        isCircleCreator,
        handleOpenCircleNotificationSettings,
        handleSaveCircleNotificationSettings,
        setIsCirclesModalOpen,
        circlesModalView,
        setCirclesModalView
    }
}
