import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationItem } from '../types/Alltypes';


interface NotificationToastProps {
    visible: boolean;
    notification: NotificationItem | null;
    onPress: () => void;
    onClose: () => void;
    duration?: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
    visible,
    notification,
    onPress,
    onClose,
    duration = 4000,
}) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-150)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visibleRef = useRef(visible);
    visibleRef.current = visible;

    const hideToast = useCallback(() => {
        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (visibleRef.current) onClose();
        });
    }, [onClose, translateY]);

    useEffect(() => {
        if (visible && notification) {
            // Slide down
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                stiffness: 80,
                damping: 15,
            }).start();

            // Auto hide
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                hideToast();
            }, duration);
        } else {
            hideToast();
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [visible, notification, duration, hideToast, translateY]);

    if (!notification) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top, // Show just below the status bar/notch
                    transform: [{ translateY }],
                },
            ]}
        >
            <TouchableOpacity style={styles.content} onPress={onPress}>
                <View style={[styles.iconContainer,
                notification.type === 'alert' ? styles.alertIcon :
                    notification.type === 'success' ? styles.successIcon :
                        styles.infoIcon
                ]}>
                    <Ionicons
                        name={
                            notification.type === 'alert' ? 'warning' :
                                notification.type === 'success' ? 'checkmark' :
                                    'notifications'
                        }
                        size={20}
                        color="#FFF"
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{notification.metadata?.title || "Notification"}</Text>
                    <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
                <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 9999, // Ensure it's on top
        padding: 12,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoIcon: {
        backgroundColor: '#4F359B',
    },
    alertIcon: {
        backgroundColor: '#EF4444',
    },
    successIcon: {
        backgroundColor: '#10B981',
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontWeight: '600',
        fontSize: 14,
        color: '#111',
        marginBottom: 2,
    },
    message: {
        fontSize: 12,
        color: '#666',
    },
    closeButton: {
        padding: 4,
    },
});
