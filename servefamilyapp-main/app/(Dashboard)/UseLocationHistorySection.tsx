/* eslint-disable react-hooks/exhaustive-deps */
import LocationHistoryModal from "@/src/components/modals/LocationHistoryModel";
import { LOCATION_HISTORY_LIMIT } from "@/src/constants/MapConstants";
import {useMapStyles} from "@/src/constants/Usemapstyles";
import { useLocationHistory } from "@/src/hooks/Uselocationhistory";
import { UserServices } from "@/src/Services/UserServices";
import { LocationHistoryEntry, LocationHistoryFilterKey } from "@/src/types/models";
import { asNonEmptyString } from "@/src/utils/mapUtils";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

export function useLocationHistorySection({
  currentUserBatteryLevel,
  setCurrentUserBatteryLevel,
  setAccountActionsVisible,
}: {
  currentUserBatteryLevel: any;
  setCurrentUserBatteryLevel: (v: any) => void;
  setAccountActionsVisible: (v: boolean) => void;
}) {
  const locationStyle = useMapStyles();
  const [activeMemberName, setActiveMemberName] = useState<string>("You");

  const {
    isLocationHistoryModalVisible,
    locationHistoryLoading,
    setLocationHistoryLoading,
    locationHistory,
    setLocationHistory,
    locationHistoryError,
    setLocationHistoryError,
    locationHistoryActiveFilter,
    setLocationHistoryActiveFilter,
    locationHistoryCustomStart,
    setLocationHistoryCustomStart,
    locationHistoryCustomEnd,
    setLocationHistoryCustomEnd,
    shouldRenderLocationHistoryMap,
    osrmRouteCoords,                   
    locationHistoryMapRef,
    locationHistoryCameraRef,           
    locationHistoryMapboxLineCoords,     
    locationHistoryFilteredDescending,
    locationHistoryPolylineCoordinates,
    locationHistoryArrowMarkers,
    locationHistoryFilterError,
    locationHistoryMapInitialRegion,
    handleOpenLocationHistoryModal: openLocationHistoryModalBase,
    handleCloseLocationHistoryModal,
    handleCustomFilterStartChange,
    handleCustomFilterEndChange,
  } = useLocationHistory();

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchLocationHistory = useCallback(
    async (filter?: LocationHistoryFilterKey) => {
      if (locationHistoryLoading) return;
      setLocationHistoryError(null);
      setLocationHistoryLoading(true);

      const targetFilter = filter || locationHistoryActiveFilter || "today";

      try {
        const response = await UserServices.GetLocationHistory(
          LOCATION_HISTORY_LIMIT,
          0,
          targetFilter
        );
        const payload = response.data;
        const records = Array.isArray(payload) ? payload : [];

        const normalized: LocationHistoryEntry[] = records
          .map((item: any): LocationHistoryEntry | null => {
            const lat = Number(item?.latitude ?? item?.lat);
            const lon = Number(item?.longitude ?? item?.lng);
            const createdAtRaw =
              asNonEmptyString(item?.createdAt) ??
              asNonEmptyString(item?.created_at) ??
              asNonEmptyString(item?.timestamp) ??
              asNonEmptyString(item?.updatedAt) ??
              asNonEmptyString(item?.updated_at) ??
              new Date().toISOString();

            if (!Number.isFinite(lat) || !Number.isFinite(lon))
              return null;
            return {
              id: asNonEmptyString(item?.id) ?? `${lat}-${lon}-${createdAtRaw}`,
              latitude: lat,
              longitude: lon,
              createdAt: createdAtRaw,
              name: asNonEmptyString(item?.name) ?? null,
              circleId:
                asNonEmptyString(item?.circleId) ??
                asNonEmptyString(item?.circle_id) ??
                null,
            };
          })
          .filter((e: any): e is LocationHistoryEntry => e !== null);

        setLocationHistory(normalized);

        if (records.length > 0) {
          const batteryCandidate = records.find(
            (item: any) => item?.user?.batteryLevel,
          )?.user?.batteryLevel;
          if (batteryCandidate) {
            const b = batteryCandidate as Record<string, unknown>;
            setCurrentUserBatteryLevel({
              batteryLevel:
                typeof b.level === "number" ? b.level : Number(b.level ?? NaN),
              deviceId: asNonEmptyString(b.deviceId) ?? null,
              updatedAt: asNonEmptyString(b.updatedAt) ?? null,
            });
          }
        }
      } catch (error) {
        setLocationHistoryError(
          error instanceof Error ? error.message : "Failed to load location history.",
        );
      } finally {
        setLocationHistoryLoading(false);
      }
    },
    [
      locationHistoryLoading,
      locationHistoryActiveFilter,
      setCurrentUserBatteryLevel,
      setLocationHistory,
      setLocationHistoryError,
      setLocationHistoryLoading,
    ],
  );

  const handleSelectLocationHistoryFilter = useCallback(
    (filterKey: LocationHistoryFilterKey) => {
      setLocationHistoryActiveFilter(filterKey);
      if (filterKey !== "custom") {
        setLocationHistoryCustomStart("");
        setLocationHistoryCustomEnd("");
        void fetchLocationHistory(filterKey);
      }
    },
    [fetchLocationHistory, setLocationHistoryActiveFilter, setLocationHistoryCustomEnd, setLocationHistoryCustomStart],
  );

  const handleRefreshLocationHistory = useCallback(() => {
    void fetchLocationHistory(locationHistoryActiveFilter);
  }, [fetchLocationHistory, locationHistoryActiveFilter]);

  // ── Open handler ───────────────────────────────────────────────────────────
  const handleOpenLocationHistoryModal = useCallback((memberName?: string) => {
    if (memberName) {
      setActiveMemberName(memberName);
    } else {
      setActiveMemberName("You");
    }
    setAccountActionsVisible(false);
    openLocationHistoryModalBase();
    void fetchLocationHistory("today");
  }, [fetchLocationHistory, openLocationHistoryModalBase, setAccountActionsVisible]);

  // ── List item renderer ─────────────────────────────────────────────────────
  const locationHistoryKeyExtractor = useCallback(
    (item: LocationHistoryEntry) => item.id,
    [],
  );

  const renderLocationHistoryItem = useCallback(
    ({ item }: { item: LocationHistoryEntry }) => {
      const createdAtDate = new Date(item.createdAt);
      const timestampLabel = Number.isNaN(createdAtDate.getTime())
        ? item.createdAt
        : createdAtDate.toLocaleString();

      return (
        <View style={locationStyle.locationHistoryListItem}>
          <View style={locationStyle.locationHistoryListItemHeader}>
            <Text style={locationStyle.locationHistoryListItemTimestamp} numberOfLines={1}>
              {timestampLabel}
            </Text>
            {item.name ? (
              <Text style={locationStyle.locationHistoryListItemName} numberOfLines={1}>
                {item.name}
              </Text>
            ) : null}
          </View>
          <Text style={locationStyle.locationHistoryListItemCoords}>
            {`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
          </Text>
          {item.circleId ? (
            <Text style={locationStyle.locationHistoryListItemCircle}>
              {`Circle: ${item.circleId}`}
            </Text>
          ) : null}
        </View>
      );
    },
    [locationStyle],
  );

  // ── Modal JSX ─────────────────────────────────────────────────────────────
  const modal = (
    <LocationHistoryModal
      isLocationHistoryModalVisible={isLocationHistoryModalVisible}
      handleCloseLocationHistoryModal={handleCloseLocationHistoryModal}
      batteryUpdatedAtLabel={currentUserBatteryLevel?.updatedAt || ""}
      batteryLevelPercent={
        currentUserBatteryLevel?.batteryLevel
          ? Number(currentUserBatteryLevel.batteryLevel)
          : null
      }
      locationHistory={locationHistory as any}
      locationHistoryActiveFilter={locationHistoryActiveFilter}
      locationHistoryArrowMarkers={locationHistoryArrowMarkers}
      locationHistoryCustomEnd={locationHistoryCustomEnd}
      locationHistoryCustomStart={locationHistoryCustomStart}
      locationHistoryError={locationHistoryError}
      locationHistoryFilterError={locationHistoryFilterError}
      locationHistoryFilteredDescending={locationHistoryFilteredDescending as any}
      locationHistoryKeyExtractor={locationHistoryKeyExtractor as any}
      locationHistoryLoading={locationHistoryLoading}
      locationHistoryMapInitialRegion={locationHistoryMapInitialRegion}
      locationHistoryPolylineCoordinates={locationHistoryPolylineCoordinates}
      memberName={activeMemberName}
      osrmRouteCoords={osrmRouteCoords}           
      locationHistoryCameraRef={locationHistoryCameraRef} 
      handleRefreshLocationHistory={handleRefreshLocationHistory}
      handleSelectLocationHistoryFilter={handleSelectLocationHistoryFilter as any}
      handleCustomFilterStartChange={handleCustomFilterStartChange}
      handleCustomFilterEndChange={handleCustomFilterEndChange}
      shouldRenderLocationHistoryMap={shouldRenderLocationHistoryMap}
    />
  );

  return {
    modal,
    handleOpenLocationHistoryModal,
  };
}