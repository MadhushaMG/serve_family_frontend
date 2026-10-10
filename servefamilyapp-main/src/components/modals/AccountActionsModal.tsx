import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/src/constants/theme";

interface AccountActionsModalProps {
  visible: boolean;
  onClose: () => void;
  topPadding: number;
  onPressProfile: () => void;
  onPressLocationHistory: () => void;
  onPressRegisterTaxi: () => void;
  onPressDriverDashboard?: () => void;
  onPressLogout: () => void;
  onPressDeleteAccount: () => void;
  isDeletingAccount?: boolean;
  isCircleCreator: boolean;
  onPressDeleteCircle: () => void;
  onPressLeaveCircle: () => void;
  isDeletingCircle: boolean;
  isLeavingCircle: boolean;
  canDeleteCircle: boolean;
  canLeaveCircle: boolean;
  isCovered?: boolean;
}

const AccountActionsModal: React.FC<AccountActionsModalProps> = ({
  visible,
  onClose,
  topPadding,
  onPressProfile,
  onPressLocationHistory,
  onPressRegisterTaxi,
  onPressDriverDashboard,
  onPressLogout,
  onPressDeleteAccount,
  isDeletingAccount = false,
  isCircleCreator,
  onPressDeleteCircle,
  onPressLeaveCircle,
  isDeletingCircle,
  isLeavingCircle,
  canDeleteCircle,
  canLeaveCircle,
  isCovered = true,
}) => {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  // iOS cannot present a second RN Modal while another is still visible.
  // Dismiss this sheet first, then run the action after the dismiss animation.
  const runAfterDismiss = useCallback(
    (action: () => void) => {
      onClose();
      const delay = Platform.OS === "ios" ? 350 : 0;
      if (delay === 0) {
        action();
        return;
      }
      setTimeout(action, delay);
    },
    [onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[styles.container, { paddingTop: topPadding }]}
          pointerEvents="box-none"
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleBadge}>
                <Ionicons name="sparkles" size={14} color="#16A34A" />
                <Text style={styles.title}>Account Menu</Text>
              </View>
            </View>

            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => runAfterDismiss(onPressProfile)}
              >
                <View style={[styles.iconWrap, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#16A34A"
                  />
                </View>
                <Text style={styles.optionLabel}>Update profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => runAfterDismiss(onPressLocationHistory)}
              >
                <View style={[styles.iconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <MaterialCommunityIcons
                    name="map-clock-outline"
                    size={18}
                    color="#2563EB"
                  />
                </View>
                <Text style={styles.optionLabel}>Location history</Text>
              </TouchableOpacity>

              {isCovered ? (
                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.7}
                  onPress={() => runAfterDismiss(onPressRegisterTaxi)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <MaterialCommunityIcons
                      name="taxi"
                      size={18}
                      color="#D97706"
                    />
                  </View>
                  <Text style={styles.optionLabel}>Register Taxi</Text>
                </TouchableOpacity>
              ) : null}


              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => runAfterDismiss(onPressLogout)}
              >
                <View style={[styles.iconWrap, { backgroundColor: "#F3F4F6" }]}>
                  <Ionicons
                    name="exit-outline"
                    size={18}
                    color="#4B5563"
                  />
                </View>
                <Text style={styles.optionLabel}>Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionRow,
                  styles.optionRowDanger,
                  isDeletingAccount && styles.optionDisabled,
                ]}
                activeOpacity={0.7}
                onPress={() => runAfterDismiss(onPressDeleteAccount)}
                disabled={isDeletingAccount}
              >
                <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#EF4444"
                  />
                </View>
                {isDeletingAccount ? (
                  <ActivityIndicator
                    size="small"
                    color="#EF4444"
                    style={styles.spinner}
                  />
                ) : (
                  <Text style={[styles.optionLabel, styles.optionLabelDanger]}>
                    Delete Account
                  </Text>
                )}
              </TouchableOpacity>

              {isCircleCreator ? (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    styles.optionRowDanger,
                    (!canDeleteCircle || isDeletingCircle) &&
                      styles.optionDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => runAfterDismiss(onPressDeleteCircle)}
                  disabled={!canDeleteCircle || isDeletingCircle}
                >
                  <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#EF4444"
                    />
                  </View>
                  {isDeletingCircle ? (
                    <ActivityIndicator
                      size="small"
                      color="#EF4444"
                      style={styles.spinner}
                    />
                  ) : (
                    <Text style={[styles.optionLabel, styles.optionLabelDanger]}>
                      Delete circle
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    styles.optionRowDanger,
                    (!canLeaveCircle || isLeavingCircle) && styles.optionDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => runAfterDismiss(onPressLeaveCircle)}
                  disabled={!canLeaveCircle || isLeavingCircle}
                >
                  <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#EF4444"
                    />
                  </View>
                  {isLeavingCircle ? (
                    <ActivityIndicator
                      size="small"
                      color="#EF4444"
                      style={styles.spinner}
                    />
                  ) : (
                    <Text style={[styles.optionLabel, styles.optionLabelDanger]}>
                      Leave circle
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.2)",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    container: {
      flex: 1,
      alignItems: "flex-end",
      paddingRight: 16,
      zIndex: 2,
      elevation: 2,
    },
    card: {
      width: 230,
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: "rgba(226, 232, 240, 0.8)",
      ...Platform.select({
        ios: {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    cardHeader: {
      paddingHorizontal: 6,
      paddingBottom: 8,
      marginBottom: 4,
    },
    titleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    title: {
      fontSize: 11,
      fontWeight: "700",
      color: "#64748B",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    optionsList: {
      gap: 3,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 14,
    },
    optionRowDanger: {
      marginTop: 2,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    optionLabel: {
      marginLeft: 12,
      fontSize: 14,
      fontWeight: "600",
      color: "#1E293B",
    },
    optionLabelDanger: {
      color: "#EF4444",
    },
    optionDisabled: {
      opacity: 0.5,
    },
    spinner: {
      marginLeft: 12,
    },
  });

export default AccountActionsModal;
