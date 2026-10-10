export const AUTH_ENDPOINTS = {
    REFRESH: '/auth/refresh',

    GOOGLE_LOGIN: '/auth/google',
    APPLE_LOGIN: '/auth/apple',
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',

    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_EMAIL_VERIFICATION: '/auth/resend-email-verification',
    MOBILE_NUMBER_SEND_OTP: '/auth/phone/send-otp',
    MOBILE_NUMBER_VERIFY_OTP: '/auth/phone/verify-otp',
    MOBILE_NUMBER_OTP_RESEND: '/auth/phone/resend-otp',

    LOGOUT: '/auth/logout',

    FORGOT_PASSWORD: '/auth/password/request-reset',
    VERIFY_RESET_PASSWORD_OTP: '/auth/password/verify-code',
    RESET_PASSWORD: '/auth/password/reset',

    REQUEST_DELETE_ACCOUNT: "/auth/request-delete-account",
    CONFIRM_DELETE_ACCOUNT: "/auth/confirm-delete-account",
};

export const USER_ENDPOINTS = {
    UPDATE_LIVE_LOCATION: (circleId: string | number) => `/circles/${circleId}/live-location`,

    PROFILE: '/profile',
    UPDATE_PROFILE: '/profile',

    PENDING_REQUESTS: "/profile/pending-requests",
    ASSIGNED_LOCATIONS: "/profile/assigned-locations",

    UPDATE_CURRUNT_LOCATION: (circleId: string | number) => `/profile/circles/${circleId}/location`,

    GET_LOCATION_HISTORY: (limit: number = 100, offset: number = 0, filter: any) =>
        `/profile/location-history?limit=${limit}&offset=${offset}&filter=${filter}`,

    SEND_HEARTBEART: "/profile/heartbeat"
};




export const CIRCLE_ENDPOINTS = {
    UPDATE_PRIVACY: (id: any) => `/circles/${id}/privacy`,
    GET_ALL_RELATIONSHIP_ALL: "/circles/relationships/all",
    GET_MEMBER_LOCATIONS: (id: string | number) => `/circles/${id}/live-status`,


    ADD_TRACKING_DEVICE: (circleId: string | number) => `/circles/${circleId}/devices`,
    UPDATE_TRACKING_DEVICE_DETAILS: (id: string | number, deviceId: string | number) => `/circles/${id}/devices/${deviceId}`,
    REMOVE_TRACKING_DEVICE: (id: string | number, deviceId: string | number) => `/circles/${id}/devices/${deviceId}`,


    LIST: '/circles',
    CREATE: '/circles',
    DETAILS: (circleId: string | number) => `/circles/${circleId}`,
    UPDATE: (circleId: string | number) => `/circles/${circleId}`,
    DELETE: (circleId: string | number) => `/circles/${circleId}`,

    UPDATE_NOTIFICATIONS_SETTINGS: (circleId: string | number) => `/circles/${circleId}/notification-settings`,

    GENERATE_INVITATION_CODE: (circleId: string | number) => `/circles/${circleId}/generate-invitation-code`,

    MEMBERS_ROLE_CHANGE: (circleId: string | number, memberId: string | number) => `/circles/${circleId}/members/${memberId}/role`,
    MEMBERS_NIKNAME_CHANGE: (circleId: string | number, memberId: string | number) => `/circles/${circleId}/members/${memberId}/nickname`,
    MEMBERS_RELATINSHIP_CHANGE: (circleId: string | number, memberId: string | number) => `/circles/${circleId}/members/${memberId}/relationship`,


    DELETE_MEMBERS_RELATIONSHIP: (circleId: string | number, memberId: string | number) => `/circles/${circleId}/members/${memberId}/relationship`,




    REMOVE_DEVICE_CERCUL: (circleId: string | number, deviceId: string | number) => `/circles/${circleId}/devices/${deviceId}`,
    REMOVE_MEMBER: (circleId: string | number, memberId: string | number) => `/circles/${circleId}/members/${memberId}`,
    LEAVE: (circleId: string | number) => `/circles/${circleId}/leave`,
};


export const INVITE_ENDPOINTS = {
    INVITE_CIRCLE: (circleId: string) => `/circles/${circleId}/invite`,
    ACCEPT_INVITE: (circleId: string) => `/circles/${circleId}/accept-invite`,
    REJECT_INVITE: (circleId: string) => `/circles/${circleId}/reject-invite`,
    JOIN_BY_CODE: "/circles/join-by-code",

    PENDING_INVITES: '/invites/pending',
    LIST_PENDING_INVITES: (circleId: string) => `/circles/${circleId}/invites`,
};


export const LOCATIONS_ENDPOINT = {

    CREATE_LOCATION_FOR_CIRCLE: (id: string | number) => `/circles/${id}/locations`,
    UPDATE_LOCATION_FOR_CIRCLE: (id: string | number, locationId: string | number) => `/circles/${id}/locations/${locationId}`,
    ASSIGN_LOCATION: (id: string | number) => `/circles/${id}/assign-location`,
    UNASSIGN_LOCATION: (id: string | number) => `/circles/${id}/unassign-location`,
    DELETE_LOCATION: (id: string | number, locationId: string | number) => `/circles/${id}/locations/${locationId}`,
    MARK_LOCATION_REACHED: (id: string | number) => `/circles/${id}/mark-location-reached`,
    MARK_LOCATION_LEFT: (id: string | number) => `/circles/${id}/mark-location-left`,
};


export const NOTIFICATION_ENDPOINTS = {
    STORE_FIREBASE_TOKEN: `/profile/firebase-token`,
    GET_NOTIFICATIONS: `/notifications`,
    MARK_ALL_AS_READ: `/notifications/read-all`,
    MARK_AS_READ: (notificationId: string) => `/notifications/${notificationId}`,
};

export const LOGS_ENDPOINT = {
    GET_LOG: "/logs"
}


export const SUBSCRIPTION_ENDPOINT = {
    GET_ALL_PLANS: `/subscription/plans`,
    GET_CURRENT_PLAN: `/subscription/current`,
    SUBSCRIBE_TO_PLAN: `/subscription/subscribe`,
};


export const SAFETY_ENDPOINT = {
    UPDATE_BATTERY_LEVEL: `/profile/battery`,
    SEND_LOW_BATTERY_ALERT: `/profile/low-battery`,
    REPORT_CRASH: `/profile/crash`,
    SEND_SOS_ALERT: `/profile/sos`,
};


export const TRACKER_ENDPOINT = {
    GET_TRACKER_DATA: `/tracker`,
    GET_TRACKER_BY_DEVICE_ID: (deviceId: string | number) => `/tracker/device/${deviceId}`,
    GET_DEVICE_IDS: `/tracker/devices`,
    ADD_TRACKING_DEVICE: `/tracker/user/devices`,
    GET_ALL_TRACKING_DEVICES: `/tracker/user/devices`,
    DELETE_TRACKING_DEVICE: (deviceId: string | number) => `/tracker/user/devices/${deviceId}`,
    GET_DEVICE_LIVE_STATUS: (deviceId: string | number) => `/tracker/user/devices/${deviceId}/live`,
};


export const PAYMENT_ENDPOINT = {
    IPAY_CALLBACK: `/payment/ipay-callback`,
};


export const REFERRAL_ENDPOINT = {
    GENERATE_REFERRAL_LINK: `/profile/referral/generate`,
    GET_REFERRER_INFO: (code: string) => `/profile/referral/details/${code}`,
};


export const SETTINGS_ENDPOINT = {
    GET_NOTIFICATION_SETTINGS: (circleId: string | number) => `/notifications/settings/${circleId}`,
    UPDATE_NOTIFICATION_SETTINGS: (circleId: string | number) => `/notifications/settings/${circleId}`,
};


export const LOCATION_HISTORY_ENDPOINT = {
    GET_CIRCLE_LOCATION_HISTORY: (id: string | number) => `/circles/${id}/history`,
};

export const QR_ENDPOINT = {
    GENERATE_QR: "/qr/settings"
}

