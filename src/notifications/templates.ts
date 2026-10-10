export const NotificationTemplates = {
  LOW_BATTERY: (deviceName: string, ownerName: string, percent: number) => ({
    title: `MOBILE |🪫 Low Battery: ${deviceName}`,
    body: `${ownerName}'s ${deviceName} battery is low (${percent}%)`
  }),
  
  LOCATION_ARRIVED: (userName: string, deviceName: string, locationName: string) => ({
    title: `📍 Arrived: ${locationName}`,
    body: `${userName}'s ${deviceName} arrived at ${locationName}`
  }),

  LOCATION_LEFT: (userName: string, deviceName: string, locationName: string) => ({
    title: `🏃 Left: ${locationName}`,
    body: `${userName}'s ${deviceName} left ${locationName}`
  }),

  SOS_ALERT: (userName: string) => ({
    title: `🚨 SOS Alert: ${userName}`,
    body: `${userName} has triggered an SOS alert! Please check their location immediately.`
  }),

  MEMBERSHIP_JOINED: (userName: string, circleName: string) => ({
    title: `🎉 New Member`,
    body: `${userName} joined ${circleName}`
  })
};
