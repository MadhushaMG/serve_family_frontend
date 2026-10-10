export const openApiSpec = {
  openapi: "3.0.1",
  info: {
    title: "Serve Family",
    version: "3.0.1",
    description: "API for group location tracking and notifications",
  },
  servers: [
    { url: "http://localhost:3000", description: "Local" },
    { url: "http://api.servofamily.com", description: "Production Server" },
    { url: "https://bubbles-render.onrender.com", description: "Render (production)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", nullable: true },
          emailVerified: {
            type: "boolean",
            description: "Whether the user's email has been verified",
          },
          phoneNumber: { type: "string", nullable: true },
          phoneVerified: {
            type: "boolean",
            description: "Whether the user's phone number has been verified",
          },
          avatar: {
            type: "string",
            nullable: true,
            description: "Full URL to the user's avatar image. Returns null if no avatar is set.",
          },
          role: {
            type: "string",
            enum: ["user", "driver", "admin", "agent"],
            description: "Role of the user in the platform (e.g. driver, user, admin)",
            example: "user",
          },
          coverageStatus: {
            type: "string",
            enum: ["covered", "notcovered"],
            description: "Geographic coverage status of the user based on admin coverage zones in Sri Lanka",
            example: "covered",
          },
          isCovered: {
            type: "boolean",
            description: "True if the user's current location falls inside any active coverage zone",
            example: true,
          },
          metadata: {
            type: "object",
            nullable: true,
            description: "User metadata containing role, coverageStatus, and coveredArea",
            properties: {
              role: { type: "string", example: "user" },
              coverageStatus: { type: "string", enum: ["covered", "notcovered"], example: "covered" },
              isCovered: { type: "boolean", example: true },
              coveredArea: { type: "string", nullable: true, example: "Western Province (Western Province, Sri Lanka)" },
            },
          },
          plan: {
            type: "object",
            nullable: true,
            description: "User's current subscription plan",
            properties: {
              id: { type: "string" },
              name: { type: "string", enum: ["Free", "Silver", "Gold", "Platinum"] },
              metadata: { type: "object", nullable: true },
            },
          },
          batteryLevel: {
            type: "object",
            nullable: true,
            description: "User's latest battery level information",
            properties: {
              batteryLevel: {
                type: "integer",
                description: "Battery level percentage (0-100)",
                minimum: 0,
                maximum: 100,
              },
              deviceId: {
                type: "string",
                nullable: true,
                description: "Device ID associated with this battery reading",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Timestamp when the battery level was last updated",
              },
            },
          },
          currentLocation: {
            type: "object",
            nullable: true,
            description:
              "User's current location (latest location history entry). Only included when fetching circle details.",
            properties: {
              id: { type: "string", description: "Location history entry ID" },
              latitude: { type: "number", description: "Latitude coordinate" },
              longitude: { type: "number", description: "Longitude coordinate" },
              name: {
                type: "string",
                nullable: true,
                description: "Location name (e.g., 'Home', 'Work', or place name)",
              },
              metadata: {
                type: "object",
                nullable: true,
                description: "Additional location metadata",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Timestamp when this location was recorded",
              },
            },
          },
        },
      },
    },
    NotificationSettings: {
      type: "object",
      properties: {
        location_reached: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "all_members"
        },
        location_left: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "all_members"
        },
        sos_alert: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "creator_and_admins"
        },
        low_battery: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "creator_and_admins"
        },
        crash_detected: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "creator_and_admins"
        },
        invite: {
          type: "string",
          enum: ["all_members", "creator_and_admins", "none"],
          default: "creator_and_admins"
        }
      }
    },
      
      CircleUser: {
        type: "object",
        description: "User with membership information in a circle",
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              Membership: {
                type: "object",
                description: "Membership data for this user in the circle",
                properties: {
                  role: { type: "string", enum: ["admin", "member"] },
                  status: { type: "string", enum: ["pending", "accepted", "rejected"] },
                  nickname: {
                    type: "string",
                    nullable: true,
                    description: "User's nickname in this circle",
                  },
                  code: {
                    type: "string",
                    nullable: true,
                    description: "Invitation code for this membership (if pending)",
                  },
                  codeExpiresAt: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                    description: "Expiration date for the invitation code",
                  },
                },
              },
            },
          },
        ],
      },
      Location: {
        type: "object",
        properties: {
          id: { type: "string" },
          circleId: { type: "string" },
          name: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          metadata: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Circle: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          creatorId: { type: "string" },
          metadata: { type: "object" },
          invitationCode: {
            type: "string",
            nullable: true,
            description:
              "Unique 6-character invitation code for this circle. Generated automatically when circle is created and can be regenerated by creator/admin. Expires after 2 days.",
          },
          invitationCodeExpiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "Expiration date for the invitation code. Codes expire 2 days after generation.",
          },
          notificationSettings: {
            type: "object",
            nullable: true,
            description:
              "Notification settings for the circle. Maps notification types to recipient types. Defaults to 'creator_and_admins' for all types if not set.",
            additionalProperties: {
              type: "string",
              enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
            },
          },
          creator: { $ref: "#/components/schemas/User" },
          users: {
            type: "array",
            items: { $ref: "#/components/schemas/CircleUser" },
            description:
              "List of users in this circle with their membership information (role, status, nickname)",
          },
          locations: { type: "array", items: { $ref: "#/components/schemas/Location" } },
          locationHistory: {
            type: "array",
            items: { $ref: "#/components/schemas/LocationHistory" },
            description:
              "Paginated location history for the last 24 hours. Contains location records for all members in the circle, ordered by creation time (most recent first).",
          },
          locationHistoryPagination: {
            type: "object",
            description: "Pagination metadata for location history",
            properties: {
              page: {
                type: "integer",
                description: "Current page number (1-based)",
                example: 1,
              },
              perPage: {
                type: "integer",
                description: "Number of items per page",
                example: 50,
              },
              total: {
                type: "integer",
                description: "Total number of location history records in the last 24 hours",
                example: 150,
              },
              totalPages: {
                type: "integer",
                description: "Total number of pages",
                example: 3,
              },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Membership: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          circleId: { type: "string" },
          role: { type: "string", enum: ["admin", "member"] },
          status: { type: "string", enum: ["pending", "accepted", "rejected"] },
          nickname: {
            type: "string",
            nullable: true,
            description: "User's nickname in this circle",
          },
          code: {
            type: "string",
            nullable: true,
            description:
              "Deprecated: Not used for direct invitations. Direct invitations no longer use codes - they appear in pending invitations list.",
          },
          codeExpiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "Deprecated: Not used for direct invitations. Direct invitations no longer have expiration dates.",
          },
          user: { $ref: "#/components/schemas/User" },
          circle: { $ref: "#/components/schemas/Circle" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          token: { type: "string", description: "JWT access token" },
          refreshToken: {
            type: "string",
            description: "Opaque refresh token to be sent in request body for /auth/refresh",
          },
          user: { $ref: "#/components/schemas/User" },
          plan: {
            type: "object",
            nullable: true,
            description: "User's current subscription plan",
            properties: {
              id: { type: "string" },
              name: { type: "string", enum: ["Free", "Silver", "Gold", "Platinum"] },
              metadata: { type: "object", nullable: true },
            },
          },
          message: {
            type: "string",
            nullable: true,
            description: "Optional message (e.g., email verification required)",
          },
        },
      },
      Plan: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", enum: ["Free", "Silver", "Gold", "Platinum"] },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserPlan: {
        type: "object",
        description: "User subscription information",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          planId: { type: "string" },
          Plan: { $ref: "#/components/schemas/Plan" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
      },
      ProfileResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { $ref: "#/components/schemas/User" },
        },
      },
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
      },
      Notification: {
        type: "object",
        description: "A notification record",
        properties: {
          id: { type: "string", format: "uuid" },
          type: {
            type: "string",
            enum: [
              "location_reached",
              "location_left",
              "invite",
              "membership_accepted",
              "membership_rejected",
              "member_removed",
              "role_updated",
              "nickname_updated",
              "location_added",
              "location_removed",
              "location_assigned",
              "location_unassigned",
              "crash_detected",
              "sos_alert",
              "low_battery",
            ],
            description: "Type of notification",
          },
          message: { type: "string", description: "Notification message" },
          read: { type: "boolean", description: "Whether the notification has been read" },
          metadata: {
            type: "object",
            nullable: true,
            description: "Additional metadata for the notification",
          },
          createdAt: { type: "string", format: "date-time" },
          actor: {
            type: "object",
            nullable: true,
            description: "User who triggered the notification",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              avatar: { type: "string", nullable: true },
            },
          },
          circle: {
            type: "object",
            nullable: true,
            description: "Circle associated with the notification",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          location: {
            type: "object",
            nullable: true,
            description: "Location associated with the notification",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
            },
          },
        },
      },
      NotificationsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              notifications: {
                type: "array",
                items: { $ref: "#/components/schemas/Notification" },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  perPage: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          },
        },
      },
      ReadNotificationResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              read: { type: "boolean" },
              updatedCount: {
                type: "integer",
                description: "Number of notifications marked as read (when marking all)",
              },
            },
          },
        },
      },
      FirebaseToken: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          token: { type: "string", description: "Firebase Cloud Messaging token" },
          deviceId: { type: "string", nullable: true, description: "Unique device identifier" },
          deviceType: {
            type: "string",
            nullable: true,
            description: "Device type (e.g., 'ios', 'android', 'web')",
          },
          userAgent: { type: "string", nullable: true },
          deviceDetails: {
            type: "object",
            nullable: true,
            description: "Additional device information",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserLocation: {
        type: "object",
        description:
          "Assigned location - represents a location assigned to a user by an admin/creator",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          circleId: { type: "string", nullable: true },
          locationId: { type: "string", nullable: true },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
          location: { $ref: "#/components/schemas/Location" },
        },
      },
      LocationHistory: {
        type: "object",
        description:
          "Location history - GPS coordinate tracking record of where a user was at a specific time",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          latitude: { type: "number", description: "Latitude coordinate (required)" },
          longitude: { type: "number", description: "Longitude coordinate (required)" },
          name: {
            type: "string",
            nullable: true,
            description:
              "Optional name for the location (e.g., 'Home', 'Work', or place name from Google Maps)",
            maxLength: 255,
          },
          circleId: { type: "string", nullable: true },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      ApiLog: {
        type: "object",
        properties: {
          id: { type: "string" },
          method: { type: "string", description: "HTTP method (POST, PUT, DELETE, PATCH, etc.)" },
          path: { type: "string", description: "Request path" },
          action: {
            type: "string",
            nullable: true,
            description:
              "Human-readable action description (e.g., 'Create Circle', 'Invite User', 'Update Profile')",
          },
          userId: { type: "string", nullable: true, description: "User ID if authenticated" },
          ipAddress: { type: "string", nullable: true, description: "Client IP address" },
          userAgent: { type: "string", nullable: true, description: "User agent string" },
          requestBody: {
            type: "object",
            nullable: true,
            description: "Request body (sanitized, sensitive fields redacted)",
          },
          statusCode: { type: "integer", nullable: true, description: "HTTP status code" },
          responseTime: {
            type: "integer",
            nullable: true,
            description: "Response time in milliseconds",
          },
          error: { type: "string", nullable: true, description: "Error message if request failed" },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      LogsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              logs: {
                type: "array",
                items: { $ref: "#/components/schemas/ApiLog" },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          },
        },
      },
      TrackerData: {
        type: "object",
        description: "GPS tracker data from SinoTrack devices",
        properties: {
          id: { type: "string" },
          deviceId: { type: "string", description: "Device ID from tracker" },
          msgType: { type: "string", nullable: true, description: "Message type" },
          gpsStatus: {
            type: "string",
            nullable: true,
            description: "GPS status (A = valid, V = invalid)",
          },
          latitude: { type: "number", nullable: true, description: "Latitude in decimal degrees" },
          longitude: {
            type: "number",
            nullable: true,
            description: "Longitude in decimal degrees",
          },
          speed: { type: "number", nullable: true, description: "Speed in km/h" },
          course: { type: "number", nullable: true, description: "Course in degrees" },
          statusHex: { type: "string", nullable: true, description: "Status hex value" },
          rawData: { type: "string", nullable: true, description: "Original packet data" },
          metadata: {
            type: "object",
            nullable: true,
            description: "Additional parsed data (time, date, header, extra)",
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TrackerResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              trackerData: {
                type: "array",
                items: { $ref: "#/components/schemas/TrackerData" },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          },
        },
      },
      TrackerDeviceResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              deviceId: { type: "string" },
              trackerData: {
                type: "array",
                items: { $ref: "#/components/schemas/TrackerData" },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          },
        },
      },
      DeviceIdsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              deviceIds: {
                type: "array",
                items: { type: "string" },
                description: "List of unique device IDs",
              },
            },
          },
        },
      },
UserDevice: {
  type: "object",
  description: "User's tracking device association",
  properties: {
    id: { type: "string", description: "Unique identifier for the device association" },
    userId: { type: "string", description: "User ID who owns this device" },
    deviceId: { type: "string", description: "Device ID from tracker" },
    name: {
      type: "string",
      nullable: true,
      description: "Optional friendly name for the device",
    },
    simNumber: { 
      type: "string", 
      nullable: true, 
      description: "SIM card number inside the tracker" 
    },
    deviceType: { 
      type: "string", 
      nullable: true, 
      description: "Type of the device (e.g., Car, Van, Bike, Person)" 
    },
   
    metadata: { type: "object", nullable: true, description: "Additional metadata" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
},


AddUserDeviceRequest: {
  type: "object",
  required: ["deviceId"],
  properties: {
    deviceId: { 
      type: "string", 
      description: "Device ID to associate with the user" 
    },
    name: {
      type: "string",
      nullable: true,
      description: "Optional friendly name for the device",
    }, 
    simNumber: {
      type: "string",
      nullable: true,
      description: "Mobile number of the SIM card inside the tracker"
    },
    deviceType: {
      type: "string",
      nullable: true,
      description: "Type of the vehicle (e.g. Car, Van, Bike, Bus)"
    }
  } 
},



      AddUserDeviceResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              device: { $ref: "#/components/schemas/UserDevice" },
            },
          },
        },
      },
      UserDevicesResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              devices: {
                type: "array",
                items: { $ref: "#/components/schemas/UserDevice" },
              },
            },
          },
        },
      },
      RemoveUserDeviceResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
      },

Entity: {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    type: { type: "string" },
    deviceId: { type: "string", nullable: true },
    ownerId: { type: "string", format: "uuid", nullable: true },
    metadata: { type: "object", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
},
CircleEntity: {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    entityId: { type: "string", format: "uuid" },
    circleId: { type: "string", format: "uuid" },
    metadata: { type: "object", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
},
},
  tags: [
    {
      name: "Authentication",
      description: "User authentication and authorization endpoints",
    },
    {
      name: "User Profile",
      description: "Manage current user's profile information",
    },
    {
      name: "Circles",
      description: "Circle management - create, read, update, and delete circles",
    },
    {
      name: "Invitations",
      description: "Manage circle invitations - send, accept, reject, and list invitations",
    },
    {
      name: "Locations",
      description:
        "Location management - assign locations to users and track location reach events",
    },
    {
      name: "Notifications",
      description: "Push notification and device token management",
    },
    {
      name: "Logs",
      description: "API request logging - view logged non-GET requests",
    },
    {
      name: "Subscriptions",
      description:
        "Subscription and plan management - view plans, subscribe to plans, and manage user subscriptions",
    },
    {
      name: "Safety & Alerts",
      description:
        "Safety features including crash detection, SOS alerts, battery monitoring, and emergency notifications",
    },
    {
      name: "Tracker",
      description: "GPS tracker data endpoints - retrieve data from SinoTrack GPS devices",
    },
    {
      name: "Payments",
      description: "Payment gateway callback handling"
    },
    {
      name: "Referrals",
      description: "User referral link generation and tracking",
    },
   {
      name: "QR Profile",
      description: "Smart QR Profile management"
    },
    {
      name: "Settings",
      description: "Notification and Circle Settings Management"
    },
  ],

paths: {


// --- TAXI MODULE FULL API ENDPOINTS ---
    
    "/api/taxi/vehicle-types": {
      get: {
        summary: "Get all vehicle types (Tuk Tuk, Car, Van, etc.)",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of vehicle types with ID, name, category, and default rates",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          category: { type: "string" },
                          iconUrl: { type: "string" },
                          baseFare: { type: "number" },
                          ratePerKm: { type: "number" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/taxi/register": {
      post: {
        summary: "Register a new vehicle with Mother Location & pricing",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  vehicleTypeId: { type: "string", description: "ID obtained from GET /api/taxi/vehicle-types" },
                  vehicleRegNum: { type: "string" },
                  mobileNum: { type: "string" },
                  showMobileNum: { type: "boolean" },
                  color: { type: "string" },
                  motherLatitude: { type: "number", description: "Mother Location Latitude (Home/Stand base)" },
                  motherLongitude: { type: "number", description: "Mother Location Longitude" },
                  motherAddress: { type: "string", description: "Mother Location Address" },
                  baseLatitude: { type: "number", description: "Alternative key for motherLatitude" },
                  baseLongitude: { type: "number", description: "Alternative key for motherLongitude" },
                  baseAddress: { type: "string", description: "Alternative key for motherAddress" },
                  baseFare: { type: "number" },
                  pickupFare: { type: "number" },
                  pickupPrice: { type: "number" },
                  ratePerKm: { type: "number" },
                  nicNumber: { type: "string", description: "National Identity Card (NIC) number" },
                  nicFrontUrl: { type: "string" },
                  nicBackUrl: { type: "string" },
                  drivingLicenseNumber: { type: "string", description: "Driving License number" },
                  drivingLicenseFrontUrl: { type: "string", description: "Driving License Front photo URL" },
                  drivingLicenseBackUrl: { type: "string", description: "Driving License Back photo URL" },
                  vehicleFrontUrl: { type: "string" },
                  vehicleBackUrl: { type: "string" },
                  vehicleInUrl: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Vehicle registered successfully with Mother Location" } }
      }
    },

    "/api/admin/taxi/vehicles/register": {
      post: {
        summary: "Register a new driver & vehicle by Agent",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["driverName", "mobileNum", "vehicleTypeId", "vehicleRegNum"],
                properties: {
                  driverName: { type: "string" },
                  mobileNum: { type: "string" },
                  email: { type: "string" },
                  vehicleTypeId: { type: "string" },
                  vehicleRegNum: { type: "string" },
                  color: { type: "string" },
                  baseAddress: { type: "string" },
                  nicNumber: { type: "string" },
                  drivingLicenseNumber: { type: "string" },
                  nicFrontUrl: { type: "string" },
                  nicBackUrl: { type: "string" },
                  drivingLicenseFrontUrl: { type: "string" },
                  drivingLicenseBackUrl: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Driver registered & approved successfully by Regional Agent" } }
      }
    },

    "/api/admin/taxi/settings": {
      get: {
        summary: "Get global system settings",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Global system settings retrieved" } }
      },
      patch: {
        summary: "Update global system settings",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  platformCommissionFee: { type: "number" },
                  maxSearchRadiusKm: { type: "number" },
                  supportPhone: { type: "string" },
                  supportEmail: { type: "string" },
                  maintenanceMode: { type: "boolean" },
                  soundEffectsEnabled: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "System settings updated successfully" } }
      }
    },

    "/api/admin/taxi/coverage-zones": {
      get: {
        summary: "Get Sri Lanka coverage zones & active status",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Coverage zones list retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          description: { type: "string" },
                          center: {
                            type: "object",
                            properties: {
                              latitude: { type: "number" },
                              longitude: { type: "number" }
                            }
                          },
                          radiusKm: { type: "number" },
                          isActive: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        summary: "Update Sri Lanka coverage zones array",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  zones: {
                    type: "array",
                    items: { type: "object" }
                  }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Coverage zones saved successfully" } }
      }
    },

    "/api/admin/taxi/coverage-zones/toggle": {
      post: {
        summary: "Toggle coverage zone active/inactive state",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["zoneId"],
                properties: {
                  zoneId: { type: "string" },
                  isActive: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Zone toggled successfully" } }
      }
    },

    "/api/admin/taxi/audit-logs": {
      get: {
        summary: "Get system admin activity audit logs",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Audit logs retrieved" } }
      }
    },

    "/api/admin/taxi/bookings": {
      get: {
        summary: "Get all trip bookings for command center roster",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Bookings list retrieved" } }
      }
    },

    "/api/admin/taxi/wallets": {
      get: {
        summary: "Get driver wallet balances & platform commissions",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Wallets & commission summary retrieved" } }
      }
    },

    "/api/admin/taxi/notifications/broadcast": {
      post: {
        summary: "Dispatch broadcast push notifications & SMS",
        tags: ["Admin Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "message"],
                properties: {
                  title: { type: "string" },
                  message: { type: "string" },
                  targetAudience: { type: "string", enum: ["all", "drivers", "passengers"] },
                  sendPush: { type: "boolean" },
                  sendSMS: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Broadcast notification dispatched successfully" } }
      }
    },

    "/api/taxi/update-settings": {
      patch: {
        summary: "Update driver vehicle rates, settings, and Mother Location",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ratePerKm: { type: "number" },
                  baseFare: { type: "number" },
                  pickupFare: { type: "number" },
                  showMobileNum: { type: "boolean" },
                  isActive: { type: "boolean" },
                  motherLatitude: { type: "number", description: "Updated Mother Location Latitude" },
                  motherLongitude: { type: "number", description: "Updated Mother Location Longitude" },
                  motherAddress: { type: "string", description: "Updated Mother Location Address" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Driver vehicle settings & Mother location updated" } }
      }
    },

    "/api/taxi/update-rate": {
      patch: {
        summary: "Update driver's rate per KM & settings",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ratePerKm: { type: "number" },
                  baseFare: { type: "number" },
                  pickupFare: { type: "number" },
                  showMobileNum: { type: "boolean" },
                  isActive: { type: "boolean" },
                  motherLatitude: { type: "number" },
                  motherLongitude: { type: "number" },
                  motherAddress: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Rate updated successfully" } }
      }
    },

    "/api/taxi/estimate": {
      post: {
        summary: "Calculate road distance & estimated taxi fares (POST)",
        description: "Calculates the real driving road distance via OpenStreetMap/pgRouting and returns comprehensive fare estimates for all vehicle types (Tuk, Car, Van, etc.) based on base fare, rate per km, and pickup fare.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pickupLat", "pickupLng", "dropLat", "dropLng"],
                properties: {
                  pickupLat: { type: "number", example: 6.9344, description: "Pickup Latitude" },
                  pickupLng: { type: "number", example: 79.8428, description: "Pickup Longitude" },
                  dropLat: { type: "number", example: 6.9248, description: "Drop-off Latitude" },
                  dropLng: { type: "number", example: 79.8436, description: "Drop-off Longitude" },
                  pickupAddress: { type: "string", example: "Colombo Fort Station", description: "Optional pickup address label" },
                  dropAddress: { type: "string", example: "Galle Face Green", description: "Optional drop-off address label" },
                  category: { type: "string", enum: ["hire", "transport"], example: "hire", description: "Filter vehicle category (hire or transport)" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Fare estimates calculated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        distanceKm: { type: "number", example: 2.2, description: "Calculated distance in KM" },
                        isRoadDistance: { type: "boolean", example: true, description: "True if calculated using road network (pgRouting)" },
                        source: { type: "string", example: "pgrouting_osm" },
                        startAddress: { type: "string", nullable: true, example: "Colombo Fort Station" },
                        endAddress: { type: "string", nullable: true, example: "Galle Face Green" },
                        startLocation: {
                          type: "object",
                          properties: { lat: { type: "number" }, lng: { type: "number" } }
                        },
                        endLocation: {
                          type: "object",
                          properties: { lat: { type: "number" }, lng: { type: "number" } }
                        },
                        routeGeometry: {
                          type: "object",
                          nullable: true,
                          description: "GeoJSON LineString containing full road path coordinates"
                        },
                        estimates: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              vehicleTypeId: { type: "string", example: "c2bf12a4-1234-..." },
                              type: { type: "string", example: "Tuk" },
                              category: { type: "string", example: "hire" },
                              seats: { type: "number", example: 3 },
                              baseFare: { type: "number", example: 100 },
                              pickupFare: { type: "number", example: 50 },
                              ratePerKm: { type: "number", example: 80 },
                              estimatedFare: { type: "number", example: 326 },
                              distanceKm: { type: "number", example: 2.2 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: "Invalid coordinates provided" },
          500: { description: "Internal server error" }
        }
      },
      get: {
        summary: "Calculate road distance & estimated taxi fares (GET)",
        description: "Query parameters variant for getting real driving road distance and fare estimates for all vehicle types.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "pickupLat", in: "query", required: true, schema: { type: "number" }, example: 6.9344, description: "Pickup Latitude" },
          { name: "pickupLng", in: "query", required: true, schema: { type: "number" }, example: 79.8428, description: "Pickup Longitude" },
          { name: "dropLat", in: "query", required: true, schema: { type: "number" }, example: 6.9248, description: "Drop-off Latitude" },
          { name: "dropLng", in: "query", required: true, schema: { type: "number" }, example: 79.8436, description: "Drop-off Longitude" },
          { name: "category", in: "query", required: false, schema: { type: "string", enum: ["hire", "transport"] }, description: "Filter vehicle category" }
        ],
        responses: {
          200: {
            description: "Fare estimates calculated successfully"
          },
          400: { description: "Invalid coordinates provided" }
        }
      }
    },

    "/api/taxi/estimate-fare": {
      post: {
        summary: "Calculate road distance & fare estimates (Alias POST)",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pickupLat", "pickupLng", "dropLat", "dropLng"],
                properties: {
                  pickupLat: { type: "number", example: 6.9344 },
                  pickupLng: { type: "number", example: 79.8428 },
                  dropLat: { type: "number", example: 6.9248 },
                  dropLng: { type: "number", example: 79.8436 },
                  category: { type: "string", enum: ["hire", "transport"] }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Fare estimates calculated successfully" } }
      },
      get: {
        summary: "Calculate road distance & fare estimates (Alias GET)",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "pickupLat", in: "query", required: true, schema: { type: "number" } },
          { name: "pickupLng", in: "query", required: true, schema: { type: "number" } },
          { name: "dropLat", in: "query", required: true, schema: { type: "number" } },
          { name: "dropLng", in: "query", required: true, schema: { type: "number" } },
          { name: "category", in: "query", required: false, schema: { type: "string", enum: ["hire", "transport"] } }
        ],
        responses: { 200: { description: "Fare estimates calculated successfully" } }
      }
    },

    "/api/taxi/waiting": {
      patch: {
        summary: "Update driver waiting state & waiting fare",
        description: "Start/stop driver waiting meter during an active ride, or update waiting charges.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isWaiting: { type: "boolean", description: "True to start waiting timer, false to stop", example: true },
                  waitingFare: { type: "number", description: "Custom waiting fare per minute", example: 10 },
                  toggle: { type: "boolean", description: "Toggle waiting state automatically" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Waiting status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        isWaiting: { type: "boolean" },
                        waitingStartedAt: { type: "string", nullable: true },
                        waitingFare: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: "Vehicle not found" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/taxi/booking": {
      post: {
        summary: "Book a ride",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  pickupLat: { type: "number" },
                  pickupLng: { type: "number" },
                  dropoffLat: { type: "number" },
                  dropoffLng: { type: "number" },
                  pickupAddress: { type: "string" },
                  dropoffAddress: { type: "string" },
                  distance: { type: "number" },
                  vehicleTypeId: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Booking created" } }
      }
    },

    "/api/taxi/available-rides": {
      get: {
        summary: "Get available drivers with fare estimation",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "pickupLat", in: "query", required: false, schema: { type: "number" }, description: "Pickup Latitude" },
          { name: "pickupLng", in: "query", required: false, schema: { type: "number" }, description: "Pickup Longitude" },
          { name: "dropLat", in: "query", required: false, schema: { type: "number" }, description: "Dropoff Latitude for road distance & full bill calculation" },
          { name: "dropLng", in: "query", required: false, schema: { type: "number" }, description: "Dropoff Longitude for road distance & full bill calculation" },
          { name: "radiusKm", in: "query", required: false, schema: { type: "number" }, description: "Driver search radius in KM (e.g. 2, 5, 10). Default 25 KM." },
          { name: "distance", in: "query", required: false, schema: { type: "number" }, description: "Trip distance in KM for estimated fare calculation (e.g. 8.5)" },
          { name: "sortBy", in: "query", required: false, schema: { type: "string", enum: ["rate", "fare", "distance"], default: "rate" }, description: "Sort order: 'rate' (lowest rate per KM first - default), 'fare' (lowest total bill first), or 'distance' (nearest driver first)" },
          { name: "category", in: "query", required: false, schema: { type: "string", enum: ["hire", "transport"] }, description: "Select vehicle category dropdown" },
          { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Free-text search by vehicle type name (e.g. Tuk, Car, Van, Bike)" }
        ],
        responses: { 200: { description: "List of available drivers sorted by rate with fullEstimatedBill" } }
      }
    },

    "/api/taxi/booking/{bookingId}": {
      get: {
        summary: "Get booking details",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Booking details" } }
      }
    },

    "/api/taxi/booking/{bookingId}/accept": {
      patch: {
        summary: "Driver accepts a ride",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Ride accepted" } }
      }
    },

    "/api/taxi/booking/{bookingId}/accept-bid": {
      patch: {
        summary: "Driver accepts a ride with a custom bid fare",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "bookingId", in: "path", required: true, schema: { type: "string" }, description: "Booking ID" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleId", "bidFare"],
                properties: {
                  vehicleId: { type: "string", description: "Driver vehicle ID" },
                  bidFare: { type: "number", description: "Proposed custom fare amount" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Ride accepted with bid fare successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Ride accepted with bid!" },
                    data: {
                      type: "object",
                      properties: {
                        bidFare: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: "Ride not available" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/taxi/driver/bookings": {
      get: {
        summary: "Get all incoming or assigned bookings/hires for logged in driver",
        description: "Retrieves a list of all bookings assigned to the driver's registered vehicle.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["pending", "accepted", "arrived", "in_transit", "completed", "cancelled"] },
            description: "Filter bookings by status"
          }
        ],
        responses: {
          200: {
            description: "List of driver bookings retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          userId: { type: "string", description: "Passenger User ID" },
                          vehicleId: { type: "string" },
                          pickupLat: { type: "number" },
                          pickupLng: { type: "number" },
                          dropoffLat: { type: "number" },
                          dropoffLng: { type: "number" },
                          pickupAddress: { type: "string" },
                          dropoffAddress: { type: "string" },
                          fare: { type: "number" },
                          distance: { type: "number" },
                          status: { type: "string", example: "pending" },
                          createdAt: { type: "string", format: "date-time" },
                          passenger: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              email: { type: "string" },
                              avatar: { type: "string" },
                              phoneNumber: { type: "string" }
                            }
                          },
                          vehicle: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              vehicleRegNum: { type: "string" },
                              vehicleType: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  type: { type: "string" },
                                  category: { type: "string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: "Vehicle not found for this driver" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/taxi/my-bookings": {
      get: {
        summary: "Get passenger's booking history",
        description: "Retrieves all bookings made by the logged-in passenger user.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["pending", "accepted", "arrived", "in_transit", "completed", "cancelled"] },
            description: "Filter passenger bookings by status"
          }
        ],
        responses: {
          200: {
            description: "Passenger booking history retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          pickupLat: { type: "number" },
                          pickupLng: { type: "number" },
                          dropoffLat: { type: "number" },
                          dropoffLng: { type: "number" },
                          pickupAddress: { type: "string" },
                          dropoffAddress: { type: "string" },
                          fare: { type: "number" },
                          distance: { type: "number" },
                          status: { type: "string" },
                          createdAt: { type: "string", format: "date-time" },
                          vehicle: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              vehicleRegNum: { type: "string" },
                              driver: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  name: { type: "string" },
                                  email: { type: "string" },
                                  avatar: { type: "string" },
                                  phoneNumber: { type: "string" }
                                }
                              },
                              vehicleType: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  type: { type: "string" },
                                  category: { type: "string" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          500: { description: "Server error" }
        }
      }
    },

    "/api/taxi/booking/{bookingId}/status": {
      patch: {
        summary: "Update ride status (arrived, started, completed)",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { status: { type: "string", enum: ["accepted", "arrived", "in_transit", "completed"] } }
              }
            }
          }
        },
        responses: { 200: { description: "Status updated" } }
      }
    },

    "/api/taxi/active-vehicles": {
      get: {
        summary: "Get all active vehicles on map",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "category", in: "query", required: false, schema: { type: "string", enum: ["hire", "transport"] }, description: "Select vehicle category dropdown" },
          { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Free-text search by vehicle type name (e.g. Tuk, Car, Van, Bike)" },
          { name: "isOnline", in: "query", required: false, schema: { type: "boolean" }, description: "Filter by online status (true/false)" }
        ],
        responses: {
          200: {
            description: "List of active vehicles on map with fallback coordinates and driver details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          userId: { type: "string" },
                          vehicleRegNum: { type: "string" },
                          color: { type: "string" },
                          isOnline: { type: "boolean" },
                          displayedLatitude: { type: "number" },
                          displayedLongitude: { type: "number" },
                          locationType: { type: "string", example: "live_location" },
                          mobileNum: { type: "string" },
                          showMobileNum: { type: "boolean" },
                          ratePerKm: { type: "number" },
                          baseFare: { type: "number" },
                          pickupFare: { type: "number" },
                          vehicleType: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              type: { type: "string" },
                              category: { type: "string" }
                            }
                          },
                          driver: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              avatar: { type: "string" },
                              phoneNumber: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/taxi/driver/earnings": {
      get: {
        summary: "Get driver earnings summary & wallet metrics",
        description: "Retrieves driver's completed trip earnings with 90% net driver payout and 10% platform commission breakdown (today, this week, this month, all-time, and recent trips).",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Driver earnings and wallet breakdown retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        driver: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            vehicleId: { type: "string" },
                            vehicleRegNum: { type: "string" },
                            approvalStatus: { type: "string" },
                            isActive: { type: "boolean" }
                          }
                        },
                        today: {
                          type: "object",
                          properties: {
                            rides: { type: "number", example: 4 },
                            grossFare: { type: "number", example: 2500 },
                            companyCommission: { type: "number", example: 250 },
                            netEarnings: { type: "number", example: 2250 }
                          }
                        },
                        thisWeek: {
                          type: "object",
                          properties: {
                            rides: { type: "number", example: 18 },
                            grossFare: { type: "number", example: 12500 },
                            companyCommission: { type: "number", example: 1250 },
                            netEarnings: { type: "number", example: 11250 }
                          }
                        },
                        thisMonth: {
                          type: "object",
                          properties: {
                            rides: { type: "number", example: 45 },
                            grossFare: { type: "number", example: 38000 },
                            companyCommission: { type: "number", example: 3800 },
                            netEarnings: { type: "number", example: 34200 }
                          }
                        },
                        total: {
                          type: "object",
                          properties: {
                            rides: { type: "number", example: 120 },
                            grossFare: { type: "number", example: 95000 },
                            companyCommission: { type: "number", example: 9500 },
                            netEarnings: { type: "number", example: 85500 }
                          }
                        },
                        commissionRate: { type: "string", example: "10%" },
                        driverShare: { type: "string", example: "90%" },
                        recentRides: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              pickupAddress: { type: "string" },
                              dropAddress: { type: "string" },
                              distance: { type: "number" },
                              fare: { type: "number" },
                              companyCommission: { type: "number" },
                              netEarnings: { type: "number" },
                              passengerName: { type: "string" },
                              passengerPhone: { type: "string", nullable: true },
                              createdAt: { type: "string", format: "date-time" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: "No registered vehicle found for this driver" },
          500: { description: "Server error retrieving driver earnings" }
        }
      }
    },

    "/api/taxi/booking/{bookingId}/receipt": {
      get: {
        summary: "Get official trip invoice / receipt breakdown",
        description: "Retrieves complete billing breakdown for a ride including base fare, distance rate, waiting time & waiting charges, pickup fare, discounts, payment status, and driver details.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "bookingId", in: "path", required: true, schema: { type: "string" }, description: "Booking ID" }
        ],
        responses: {
          200: {
            description: "Detailed receipt / bill returned successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        invoiceNo: { type: "string", example: "INV-01FB5E5E" },
                        bookingId: { type: "string" },
                        status: { type: "string", example: "completed" },
                        paymentStatus: { type: "string", example: "paid" },
                        paymentMethod: { type: "string", example: "cash" },
                        pickupAddress: { type: "string" },
                        dropAddress: { type: "string" },
                        distanceKm: { type: "number", example: 5.4 },
                        baseFare: { type: "number", example: 150 },
                        ratePerKm: { type: "number", example: 90 },
                        distanceFare: { type: "number", example: 486 },
                        pickupFare: { type: "number", example: 0 },
                        waitingMinutes: { type: "number", example: 6 },
                        waitingRatePerMin: { type: "number", example: 10 },
                        waitingFare: { type: "number", example: 60 },
                        discountAmount: { type: "number", example: 0 },
                        totalFare: { type: "number", example: 696 },
                        driver: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            phoneNumber: { type: "string" },
                            vehicleRegNum: { type: "string" },
                            vehicleType: { type: "string" }
                          }
                        },
                        passenger: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            phoneNumber: { type: "string" },
                            email: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { description: "Unauthorized to access this receipt" },
          404: { description: "Booking not found" },
          500: { description: "Server error" }
        }
      }
    },

    "/api/taxi/booking/{bookingId}/send-receipt": {
      post: {
        summary: "Send luxury HTML ride receipt email to passenger",
        description: "Dispatches a beautifully styled HTML invoice and thank you email via SMTP to passenger or specified email address.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "bookingId", in: "path", required: true, schema: { type: "string" }, description: "Booking ID" }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email", description: "Optional custom recipient email. Defaults to passenger's account email." }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Receipt email sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Receipt email sent successfully to user@example.com" },
                    toEmail: { type: "string", example: "user@example.com" },
                    invoiceNo: { type: "string", example: "INV-01FB5E5E" }
                  }
                }
              }
            }
          },
          400: { description: "No recipient email address found" },
          404: { description: "Booking not found" },
          500: { description: "Failed to send receipt email" }
        }
      }
    },

    "/api/taxi/driver/status": {
      get: {
        summary: "Get current driver online/offline & vehicle status",
        description: "Checks driver's live status, real-time socket connection, and approval status.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Driver status returned successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        vehicleId: { type: "string" },
                        vehicleRegNum: { type: "string" },
                        isActive: { type: "boolean" },
                        isOnline: { type: "boolean" },
                        status: { type: "string", example: "online" },
                        approvalStatus: { type: "string", example: "approved" },
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        ratePerKm: { type: "number" },
                        baseFare: { type: "number" },
                        pickupFare: { type: "number" },
                        waitingFare: { type: "number" },
                        isWaiting: { type: "boolean" }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: "No registered vehicle found for this driver" }
        }
      },
      patch: {
        summary: "Toggle driver online / offline status",
        description: "Toggles driver active status or explicitly sets online/offline with optional coordinates. Broadcasts real-time socket updates to passengers and admin.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["online", "offline"], description: "Desired status" },
                  isOnline: { type: "boolean" },
                  latitude: { type: "number" },
                  longitude: { type: "number" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Driver status updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Driver is now ONLINE" },
                    data: {
                      type: "object",
                      properties: {
                        vehicleId: { type: "string" },
                        vehicleRegNum: { type: "string" },
                        isActive: { type: "boolean" },
                        isOnline: { type: "boolean" },
                        status: { type: "string", example: "online" }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { description: "Cannot go online. Vehicle approval status is not approved." },
          404: { description: "No registered vehicle found for this driver" }
        }
      }
    },

    "/api/taxi/driver/heartbeat": {
      post: {
        summary: "Driver heartbeat / ping keep-alive",
        description: "Periodically pings the server to update driver live coordinates and refresh online presence timestamp.",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  latitude: { type: "number", example: 6.9271 },
                  longitude: { type: "number", example: 79.8612 },
                  isOnline: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Heartbeat acknowledged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Heartbeat acknowledged" },
                    data: {
                      type: "object",
                      properties: {
                        vehicleId: { type: "string" },
                        isActive: { type: "boolean" },
                        isOnline: { type: "boolean" },
                        lastActiveAt: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          },
          404: { description: "No registered vehicle found for this driver" }
        }
      }
    },

    "/api/taxi/nearby": {
      get: {
        summary: "Discover nearby available taxi rides (Max 25km radius)",
        description: "Returns active, approved vehicles strictly within a 25km proximity radius of passenger coordinates. Excludes own vehicle if logged in as a driver.",
        tags: ["Taxi"],
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number" }, description: "Passenger pickup latitude" },
          { name: "longitude", in: "query", required: true, schema: { type: "number" }, description: "Passenger pickup longitude" },
          { name: "category", in: "query", required: false, schema: { type: "string", enum: ["hire", "transport"] } },
          { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Vehicle type (e.g. Tuk, Car, Van)" }
        ],
        responses: {
          200: {
            description: "Nearby available vehicles returned successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    count: { type: "number" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          vehicleRegNum: { type: "string" },
                          distanceKm: { type: "number" },
                          baseFare: { type: "number" },
                          ratePerKm: { type: "number" },
                          waitingFare: { type: "number" },
                          pickupFare: { type: "number" },
                          isOnline: { type: "boolean" },
                          driver: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              phoneNumber: { type: "string" },
                              avatar: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/taxi/booking/{bookingId}/review": {
      post: {
        summary: "Submit passenger rating and review for completed ride",
        tags: ["Taxi"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "bookingId", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
                  feedback: { type: "string", example: "Safe driving, very polite driver!" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Review submitted successfully" },
          400: { description: "Invalid rating or ride not completed" },
          403: { description: "Unauthorized" },
          404: { description: "Booking not found" }
        }
      }
    },

"/api/circles/{id}/privacy": {
      put: {
        summary: "Update circle privacy settings",
        description: "Allows a user to toggle sharing of their location, battery, and avatar within a specific circle.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
            description: "Circle ID"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  shareLocation: { type: "boolean", description: "Toggle location sharing", example: false },
                  shareBattery: { type: "boolean", description: "Toggle battery status sharing", example: true },
                  shareAvatar: { type: "boolean", description: "Toggle avatar sharing", example: true }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Privacy settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Privacy settings updated successfully" },
                    data: {
                      type: "object",
                      properties: {
                        userId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
                        circleId: { type: "string", example: "123e4567-e89b-12d3-a456-426614174000" },
                        shareLocation: { type: "boolean", example: false },
                        shareBattery: { type: "boolean", example: true },
                        shareAvatar: { type: "boolean", example: true }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { 
            description: "Forbidden",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "You are not a member of this circle" }
                  }
                }
              }
            }
          },
          500: { description: "Internal server error" }
        }
      }
    },

    "/api/circles/{id}/history": {
      get: {
        tags: ["Location-History"],
        summary: "Get circle location history",
        description: "Retrieve location history (journeys) for all members in a circle for the last 7 days.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            schema: { type: "string" },
            required: true,
            description: "The circle ID",
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 100 } },
        ],
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        circleId: { type: "string" },
                        history: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Circle not found" },
        },
      },
    },


"/api/circles/relationships/all": {
      "get": {
        "summary": "Get all available relationship types",
        "tags": ["Circles"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "List of relationships returned successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "name": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },


"/api/circles/{id}/live-status": {
      get: {
        summary: "Get live location status of circle members",
        description: "Retrieve a sorted list of circle members with real-time status (Online/Offline), location names, and coordinates. The requesting user is always returned first in the list.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        responses: {
          "200": {
            description: "Successful response with sorted member data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          avatar: { type: "string", nullable: true },
                          latitude: { type: "number", nullable: true },
                          longitude: { type: "number", nullable: true },
                          status: { 
                            type: "string", 
                            enum: ["Online", "Offline"],
                            description: "Online if updated within last 5 minutes" 
                          },
                          locationText: { type: "string", description: "Geofence name or formatted coordinates" },
                          lastSeen: { type: "string", format: "date-time" },
                          isMe: { type: "boolean", description: "True if this is the requesting user" },
                          role: { type: "string" },
                          isTracker: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Circle not found" }
        }
      }
    },



    "/api/circles/{id}/devices": {
      post: {
        summary: "Add a tracking device (Entity) to a circle",
        description: "Links a GPS tracking device to a specific circle. If an entity doesn't exist for the deviceId, it creates one.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  deviceId: { type: "string", description: "The unique ID of the tracker" },
                  name: { type: "string", description: "Friendly name for the vehicle" },
                },
                required: ["deviceId"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Device successfully added to circle",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/Entity" },
                  },
                },
              },
            },
          },
        },
      },
    },


"/api/circles/{id}/devices/{deviceId}": {
      put: {
        summary: "Update device details in a circle",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "deviceId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Device ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "New name for the device" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Device updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          "404": { description: "Device not found in this circle" },
          "401": { description: "Unauthorized" },
        },
      },
      delete: {
        summary: "Remove a device from a circle",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "deviceId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Device ID",
          },
        ],
        responses: {
          "200": {
            description: "Device removed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": { description: "Device not found in this circle" },
          "401": { description: "Unauthorized" },
        },
      },
    },


"/api/profile/circles/{circleId}/live-location": {
      "post": {
        "summary": "Update current location and return circle live status",
        "description": "Saves the user's location and immediately returns the real-time status of all members in the circle, including speed and battery.",
        "tags": ["User Profile"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "circleId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "latitude": { "type": "number", "example": 6.9271 },
                  "longitude": { "type": "number", "example": 79.8612 },
                  "name": { "type": "string", "example": "Colombo, Sri Lanka" },
                  "speed": { "type": "number", "example": 45 }
                },
                "required": ["latitude", "longitude"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successfully updated and returned live data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "name": { "type": "string" },
                          "avatar": { "type": "string", "nullable": true },
                          "latitude": { "type": "number" },
                          "longitude": { "type": "number" },
                          "status": { "type": "string", "example": "Online" },
                          "speed": { "type": "string", "example": "45" },
                          "locationText": { "type": "string" },
                          "lastSeen": { "type": "string", "format": "date-time" },
                          "isMe": { "type": "boolean" },
                          "role": { "type": "string" },
                          "battery": { "type": "string", "example": "85%" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Circle not found" }
        }
      }
    },



"/api/profile": {
      "get": {
        "summary": "Get current user's profile",
        "tags": ["User Profile"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "User profile with latest battery, plan and location details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ProfileResponse" }
              }
            }
          },
          "401": { "description": "Unauthorized" },
          "404": { "description": "User not found" }
        }
      },
      "put": {
        "summary": "Update current user's profile",
        "tags": ["User Profile"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": false,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "metadata": { "type": "string", "description": "JSON string or plain text metadata" },
                  "profileImage": { "type": "string", "format": "binary" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated user profile with all details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ProfileResponse" }
              }
            }
          },
          "400": { "description": "Bad request" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "User not found" },
          "409": { "description": "Conflict (e.g., phone number already in use)" }
        }
      }
    },



    "/api/auth/dev-login": {
      post: {
        summary: "Development login (dev only)",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Returns a dev JWT token and a refresh token in the response body (dev only). Store the refresh token securely and send it in the request body to /api/auth/refresh.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { description: "Bad request" },
          "403": { description: "Disabled in production" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        summary: "Refresh access token using refresh token provided in the request body",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Returns a new access token and rotated refresh token in the response body",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "401": {
            description: "Invalid or expired refresh token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },



"/api/auth/apple": {
      "post": {
        "summary": "Sign in with Apple identityToken",
        "description": "Authenticate user using Apple's identityToken. Backend verifies the token with Apple and issues access+refresh tokens.",
        "tags": ["Authentication"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["identityToken"],
                "properties": {
                  "identityToken": {
                    "type": "string",
                    "description": "The JWT identity token received from Apple"
                  },
                  "user": {
                    "type": "object",
                    "description": "Optional user info (name) sent by Apple only on the very first login",
                    "properties": {
                      "name": {
                        "type": "object",
                        "properties": {
                          "firstName": { "type": "string" },
                          "lastName": { "type": "string" }
                        }
                      }
                    }
                  },
                  "fcmToken": {
                    "type": "string",
                    "description": "Firebase Cloud Messaging token for notifications"
                  },
                  "deviceId": {
                    "type": "string",
                    "description": "Unique device identifier"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request - missing token or invalid data"
          },
          "401": {
            "description": "Unauthorized - Invalid Apple Token"
          },
          "500": {
            "description": "Server error"
          }
        }
      }
    },



    "/api/auth/google": {
      post: {
        summary:
          "Sign in with Google ID token (mobile/web). Backend verifies the ID token with Google and issues access+refresh tokens.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { idToken: { type: "string" } },
                required: ["idToken"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Auth tokens",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { description: "Invalid token or missing idToken" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user with email/password",
        description:
          "Register a new user account with email and password. A verification code will be sent via email (expires in 30 minutes).",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address",
                  },
"referralCode": { "type": "string", "description": "Optional referral code from the link" },
                  password: {
                    type: "string",
                    minLength: 8,
                    description: "Password (minimum 8 characters)",
                  },
                  name: { type: "string", description: "User's full name" },
                },
                required: ["email", "password", "name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "User registered successfully. Verification code sent via email. User must verify email and login to receive tokens.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - validation error",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "409": {
            description: "Conflict - email already in use",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login with email/password",
        description:
          "Authenticate using email and password. A warning will be returned if email is not verified.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address",
                  },
                  password: { type: "string", description: "Password" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Login successful. Returns tokens and user information. Tokens are only returned if email is verified.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": {
            description: "Bad request - missing required fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "401": {
            description: "Unauthorized - invalid credentials",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "403": {
            description:
              "Forbidden - email not verified. User must verify email address before logging in.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/auth/verify-email": {
      post: {
        summary: "Verify email address with verification code",
        description:
          "Verify an email address using the verification code sent during registration or resend. Codes expire after 30 minutes.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address to verify",
                  },
                  code: {
                    type: "string",
                    description: "6-character verification code from email (case-insensitive)",
                    example: "ABC123",
                  },
                },
                required: ["email", "code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid code, expired code, or missing fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/resend-email-verification": {
      post: {
        summary: "Resend email verification code",
        description:
          "Request a new verification code to be sent to the user's email address. The new code expires after 30 minutes.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address to resend verification code to",
                  },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification code sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - email already verified or missing email",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/phone/send-otp": {
      post: {
        summary: "Send OTP to phone number",
        description:
          "Send a 6-digit OTP code to the provided phone number. This endpoint works for both registration and login. The OTP expires after 10 minutes. The OTP is sent via SMS using SMSlenz API.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phoneNumber: {
                    type: "string",
                    description: "Phone number to send OTP to",
                  },
                  name: {
                    type: "string",
                    description:
                      "Optional: User's name (for registration, will be required when verifying OTP)",
                  },
                },
                required: ["phoneNumber"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "OTP sent successfully. In development mode, OTP is returned in response. In production, OTP is sent via SMS.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    otp: { type: "string", description: "OTP code (only in development mode)" },
                    expiresAt: {
                      type: "string",
                      format: "date-time",
                      description: "Expiration time (only in development mode)",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - phone number is required",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "500": {
            description: "Server error - failed to generate OTP",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/phone/verify-otp": {
      post: {
        summary: "Verify phone OTP and register/login",
        description:
          "Verify the OTP code sent to a phone number and either register a new user or log in an existing user. If the phone number is not registered, a new user account will be created (name is required for registration). If the phone number is already registered, the user will be logged in. No password is required for phone OTP authentication.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phoneNumber: {
                    type: "string",
                    description: "Phone number to verify",
                  },
                  code: {
                    type: "string",
                    description: "6-digit OTP code received via SMS",
                    example: "123456",
                  },
                  name: {
                    type: "string",
                    description:
                      "Required for registration (new users), optional for login (existing users)",
                  },
                },
                required: ["phoneNumber", "code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP verified successfully. Returns tokens and user information.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": {
            description: "Bad request - invalid OTP, expired OTP, or missing name for registration",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "409": {
            description: "Conflict - phone number already in use",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/phone/resend-otp": {
      post: {
        summary: "Resend OTP to phone number",
        description:
          "Request a new OTP code to be sent to the phone number. The new OTP expires after 10 minutes. The OTP is sent via SMS using SMSlenz API.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phoneNumber: {
                    type: "string",
                    description: "Phone number to resend OTP to",
                  },
                },
                required: ["phoneNumber"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "OTP resent successfully. In development mode, OTP is returned in response.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    otp: { type: "string", description: "OTP code (only in development mode)" },
                    expiresAt: {
                      type: "string",
                      format: "date-time",
                      description: "Expiration time (only in development mode)",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - phone number is required",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          "500": {
            description: "Server error - failed to generate OTP",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Revoke refresh token (logout)",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Refresh token revoked",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
          },
          "400": {
            description: "Bad request (missing token)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/auth/password/request-reset": {
      post: {
        summary: "Request password reset",
        description:
          "Request a password reset code to be sent via email or SMS. The reset code expires after 15 minutes. For security reasons, the response does not reveal whether the account exists.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address (required if phoneNumber is not provided)",
                  },
                  phoneNumber: {
                    type: "string",
                    description: "Phone number (required if email is not provided)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset code sent (if account exists)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    resetCode: {
                      type: "string",
                      description: "Reset code (only returned in development mode for testing)",
                    },
                    expiresAt: {
                      type: "string",
                      format: "date-time",
                      description: "Expiration time (only returned in development mode)",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description:
              "Bad request - either email or phoneNumber is required, or account has no password",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/auth/password/verify-code": {
      post: {
        summary: "Verify password reset code",
        description:
          "Verify the password reset code sent via email or SMS. This must be called before resetting the password. The code expires after 15 minutes.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Email address (required if phoneNumber is not provided)",
                  },
                  phoneNumber: {
                    type: "string",
                    description: "Phone number (required if email is not provided)",
                  },
                  code: {
                    type: "string",
                    description: "6-character reset code",
                    minLength: 6,
                    maxLength: 6,
                  },
                },
                required: ["code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Reset code verified successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    resetId: {
                      type: "string",
                      description: "Reset ID to be used in the reset password endpoint",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid or expired reset code",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
   


"/api/auth/request-delete-account": {
      "post": {
        "tags": ["Auth"],
        "summary": "Request to permanently delete account (Sends OTP)",
        "description": "Generates a 6-digit OTP and sends it to the user's registered email to verify account deletion.",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "OTP sent successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "message": { "type": "string", "example": "OTP has been sent to your email. Please verify to permanently delete your account." }
                  }
                }
              }
            }
          },
          "400": {
            "description": "No email associated with the account"
          },
          "404": {
            "description": "User not found"
          }
        }
      }
    },
    "/api/auth/confirm-delete-account": {
      "post": {
        "tags": ["Auth"],
        "summary": "Confirm and permanently delete account",
        "description": "Verifies the OTP and permanently deletes the user account along with all related personal data (Vehicles, Bookings, Locations, etc.). This action is irreversible.",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "code": { 
                    "type": "string", 
                    "example": "123456",
                    "description": "The 6-digit OTP sent to the user's email"
                  }
                },
                "required": ["code"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Account completely deleted",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean", "example": true },
                    "message": { "type": "string", "example": "Your account and all personal data have been permanently deleted." }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid or expired OTP"
          }
        }
      }
    },

   "/api/auth/password/reset": {
      post: {
        summary: "Reset password with verified code",
        description:
          "Reset the password using a verified reset code. After successful reset, all existing refresh tokens are revoked for security. The new password must be at least 8 characters long.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  resetId: {
                    type: "string",
                    description: "Reset ID returned from verify-code endpoint",
                  },
                  newPassword: {
                    type: "string",
                    minLength: 8,
                    description: "New password (minimum 8 characters)",
                  },
                },
                required: ["resetId", "newPassword"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid reset ID, expired code, or password too short",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": {
            description: "User not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/circles": {
      get: {
        summary: "List circles",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "perPage", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "List of circles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Circle" } },
                    meta: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a circle",
        description:
          "Creates a new circle. Automatically generates a unique 6-character invitation code that expires in 2 days. The invitation code is returned in the response and can be used by any registered user to join the circle.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  metadata: { type: "object" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created circle with invitation code",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Circle" } } },
          },
        },
      },
    },
    "/api/circles/{id}": {
      get: {
        summary: "Get a circle",
        description:
          "Get circle details including members, locations, and location history. Location history is paginated and shows the last 24 hours of location data for all members in the circle.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
parameters: [
          {
            in: "path",
            name: "id",
            schema: { type: "string" },
            required: true,
            description: "The circle ID",
          },
          
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number for history",
          },
          {
            name: "perPage",
            in: "query",
            schema: { type: "integer", default: 100 },
            description: "History records per page",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "History start date (ISO 8601)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "History end date (ISO 8601)",
          },
        ],
        responses: {
          "200": {
            description: "Circle",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Circle" } } },
          },
          "404": { description: "Not found" },
        },
      },
      put: {
        summary: "Update a circle",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, metadata: { type: "object" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Circle" } } },
          },
          "403": { description: "Forbidden" },
        },
      },
      delete: {
        summary: "Delete a circle",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },

    "/api/circles/{id}/notification-settings": {
      put: {
        summary: "Update notification settings for a circle",
        description:
          "Update notification settings for a circle. Only circle creators and admins can update these settings. You can update all settings at once or just a few - the settings will be merged with existing ones. Each notification type can be set to notify: all members, only creator and admins, only the triggering user, or none.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  notificationSettings: {
                    type: "object",
                    description:
                      "Notification settings mapping notification types to recipient types",
                    additionalProperties: {
                      type: "string",
                      enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                    },
                    properties: {
                      location_reached: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member reaches a location",
                        example: "all_members",
                      },
                      location_left: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member leaves a location",
                        example: "creator_and_admins",
                      },
                      invite: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when an invitation is sent",
                        example: "creator_and_admins",
                      },
                      membership_accepted: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member joins the circle",
                        example: "all_members",
                      },
                      membership_rejected: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when an invitation is rejected",
                        example: "creator_and_admins",
                      },
                      member_removed: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member is removed from the circle",
                        example: "creator_and_admins",
                      },
                      role_updated: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member's role is updated",
                        example: "creator_and_admins",
                      },
                      nickname_updated: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member's nickname is updated",
                        example: "none",
                      },
                      location_added: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a location is added to the circle",
                        example: "creator_and_admins",
                      },
                      location_removed: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a location is removed from the circle",
                        example: "creator_and_admins",
                      },
                      location_assigned: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a location is assigned to a member",
                        example: "creator_and_admins",
                      },
                      location_unassigned: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a location is unassigned from a member",
                        example: "creator_and_admins",
                      },
                      crash_detected: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when an app crash is detected",
                        example: "creator_and_admins",
                      },
                      sos_alert: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when an SOS alert is triggered",
                        example: "all_members",
                      },
                      low_battery: {
                        type: "string",
                        enum: ["all_members", "creator_and_admins", "triggering_user_only", "none"],
                        description: "Who to notify when a member's battery is low",
                        example: "creator_and_admins",
                      },
                    },
                  },
                },
                required: ["notificationSettings"],
                example: {
                  notificationSettings: {
                    location_reached: "all_members",
                    location_left: "creator_and_admins",
                    sos_alert: "all_members",
                    low_battery: "creator_and_admins",
                    crash_detected: "creator_and_admins",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Notification settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid notification type or recipient type",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "403": {
            description: "Forbidden - only creator and admins can update notification settings",
          },
          "404": { description: "Circle not found" },
        },
      },
    },
    "/api/circles/{id}/invite": {
      post: {
        summary: "Invite a user to a circle",
        description:
          "Invites a user to join a circle by email. This creates a direct invitation that appears in the user's pending invitations list. The invitation does not include a code - users can accept or reject it directly. For code-based invitations, use the circle's invitation code (generated when the circle is created).",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["admin", "member"], default: "member" },
                  nickname: {
                    type: "string",
                    nullable: true,
                    description: "Optional nickname for the user in this circle",
                  },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Invitation sent successfully. Returns membership (pending status).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Membership" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request" },
          "403": { description: "Forbidden - only creator and admins can invite" },
          "404": { description: "Circle not found" },
        },
      },
    },
    "/api/circles/{id}/accept-invite": {
      post: {
        summary: "Accept an invitation to join a circle",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Invitation accepted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": { description: "No pending invitation found" },
        },
      },
    },
    "/api/circles/{id}/reject-invite": {
      post: {
        summary: "Reject an invitation to join a circle",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Invitation rejected",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": { description: "No pending invitation found" },
        },
      },
    },
    "/api/circles/{id}/invites": {
      get: {
        summary: "List pending invitations for a circle (creator and admins only)",
        description: "Returns all pending invitations for a circle (direct email invitations).",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "List of pending invitations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Membership" },
                    },
                  },
                },
              },
            },
          },
          "403": { description: "Forbidden - only creator and admins can view invites" },
          "404": { description: "Circle not found" },
        },
      },
    },
    "/api/invites/pending": {
      get: {
        summary: "List current user's pending invitations",
        description: "Returns all pending direct invitations for the authenticated user.",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of pending invitations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Membership" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/circles/join-by-code": {
      post: {
        summary: "Join a circle using an invitation code",
        description:
          "Join a circle using a 6-character invitation code. The code is generated automatically when a circle is created and expires after 2 days. Any registered user can use the circle's invitation code to join. Codes can be regenerated by the circle creator or admin.",
        tags: ["Invitations"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    description: "6-character invitation code for the circle (case-insensitive)",
                    example: "ABC123",
                  },
                },
                required: ["code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successfully joined circle",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description:
              "Bad request - code is required, code has expired, or user is already a member",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Invalid code - circle not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/generate-invitation-code": {
      post: {
        summary: "Generate or regenerate invitation code for a circle",
        description:
          "Generates a new invitation code for a circle that expires in 2 days. Only circle creators and admins can generate codes. This will replace any existing invitation code.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Invitation code generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "403": {
            description: "Forbidden - only creator and admins can generate invitation codes",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/members/{userId}/role": {
      put: {
        summary: "Update user role in a circle (creator only)",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "User ID to update role for",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["admin", "member"] },
                },
                required: ["role"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User role updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Membership" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request" },
          "403": { description: "Forbidden - only creator can change user roles" },
          "404": { description: "Circle not found or user is not a member" },
        },
      },
    },
    "/api/circles/{id}/members/{userId}/nickname": {
      put: {
        summary: "Update user's nickname in a circle (creator or admin only)",
        description:
          "Update a user's nickname for a specific circle. Only circle creators and admins can update nicknames.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "User ID to update nickname for",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nickname: {
                    type: "string",
                    nullable: true,
                    description:
                      "Nickname for the user in this circle. Set to null to remove nickname.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Nickname updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Membership" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request" },
          "403": { description: "Forbidden - only creator and admins can update nicknames" },
          "404": { description: "Circle not found or target user is not an accepted member" },
        },
      },
    },


"/api/circles/{id}/members/{userId}/relationship": {
      "put": {
        "summary": "Insert or Update a member's relationship",
        "description": "Sets a specific relationship for a circle member. Use relationshipId from the /relationships/all list.",
        "tags": ["Circles"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Circle ID" },
          { "name": "userId", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Member's User ID" }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "relationshipId": { "type": "string", "description": "The UUID of the relationship (e.g., Father, Son)" }
                },
                "required": ["relationshipId"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Relationship updated successfully" },
          "404": { "description": "Member or Circle not found" }
        }
      },
"delete": {
        "summary": "Remove/Delete a member's relationship",
        "description": "Clears the assigned relationship and resets it to null (defaults to 'Member' in live-status).",
        "tags": ["Circles"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Circle ID" },
          { "name": "userId", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Member's User ID" }
        ],
        "responses": {
          "200": { "description": "Relationship deleted successfully" }
        }
      }
    },

    "/api/circles/{id}/members/{userId}": {
      delete: {
        summary: "Remove a member from a circle",
        description:
          "Remove a member from a circle. Admins and creators can remove members. Only the creator can remove admins. The creator cannot be removed. This will also clean up any UserLocation entries for the removed member in this circle.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "User ID of the member to remove",
          },
        ],
        responses: {
          "200": {
            description: "Member removed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - userId is required or cannot remove the circle creator",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description:
              "Forbidden - only creator and admins can remove members. Admins can only remove members, not other admins.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found or user is not an accepted member of this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/leave": {
      delete: {
        summary: "Leave a circle",
        description:
          "Allows admins and members to voluntarily leave a circle. The circle creator cannot leave (they should delete the circle instead). This will also clean up any UserLocation entries for the user in this circle.",
        tags: ["Circles"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        responses: {
          "200": {
            description: "Successfully left the circle",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Circle" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - circle creator cannot leave the circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found or user is not an accepted member of this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/firebase-token": {
      post: {
        summary: "Store or update Firebase Cloud Messaging token for the current user",
        description:
          "Registers a device token for push notifications. If a token already exists for the same deviceId, it will be updated. User agent is automatically captured from request headers.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  token: {
                    type: "string",
                    description: "Firebase Cloud Messaging token (required)",
                  },
                  deviceId: {
                    type: "string",
                    description:
                      "Unique device identifier (optional, but recommended for token updates)",
                  },
                  deviceType: {
                    type: "string",
                    description: "Device type: 'ios', 'android', 'web', etc. (optional)",
                  },
                  deviceDetails: {
                    type: "object",
                    description: "Additional device information as JSON object (optional)",
                  },
                },
                required: ["token"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Firebase token stored or updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/FirebaseToken" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - token is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/pending-requests": {
      get: {
        summary: "Get pending membership requests for the authenticated user",
        description:
          "Returns all pending membership requests (invitations) for the currently authenticated user. These are circles that the user has been invited to join but haven't accepted or rejected yet.",
        tags: ["User Profile"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of pending membership requests",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Membership" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/assigned-locations": {
      get: {
        summary: "Get assigned locations for the authenticated user",
        description:
          "Returns all locations assigned to the currently authenticated user across all circles. Includes the location details, circle information, and any coordinates where the user marked the location as reached.",
        tags: ["User Profile"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of assigned locations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserLocation" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/circles/{circleId}/location": {
      post: {
        summary: "Update user's current location",
        description:
          "Saves the user's current location. Creates a new location history entry each time it's called, maintaining a complete history of location updates. The location must be associated with a circle (user must be a member or creator of the circle).",
        tags: ["User Profile"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "circleId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "Circle ID to associate this location with (user must be a member or creator)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  latitude: {
                    type: "number",
                    description: "Latitude coordinate (-90 to 90)",
                    minimum: -90,
                    maximum: 90,
                  },
                  longitude: {
                    type: "number",
                    description: "Longitude coordinate (-180 to 180)",
                    minimum: -180,
                    maximum: 180,
                  },
                  name: {
                    type: "string",
                    nullable: true,
                    description:
                      "Optional name for the location (e.g., 'Home', 'Work', or place name from Google Maps)",
                    maxLength: 255,
                  },
                  metadata: {
                    type: "object",
                    nullable: true,
                    description: "Optional metadata object",
                  },
                },
                required: ["latitude", "longitude"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/LocationHistory" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid coordinates or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description: "Forbidden - user is not a member of the specified circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Location not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/location-history": {
      get: {
        summary: "Get user's full location history",
        description:
          "Returns the complete location history for the authenticated user, ordered by most recent first. Each entry represents a location update event.",
        tags: ["User Profile"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, minimum: 1, maximum: 1000 },
            description: "Maximum number of records to return (1-1000)",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0, minimum: 0 },
            description: "Number of records to skip for pagination",
          },
        ],
        responses: {
          "200": {
            description: "Location history with pagination",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LocationHistory" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "integer", description: "Total number of records" },
                        limit: { type: "integer", description: "Number of records per page" },
                        offset: { type: "integer", description: "Number of records skipped" },
                        hasMore: {
                          type: "boolean",
                          description: "Whether there are more records available",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid pagination parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/profile/heartbeat": {
      post: {
        summary: "Send heartbeat ping",
        description:
          "Sends a periodic heartbeat to indicate the app is running. Updates the last heartbeat timestamp in user metadata. Used for monitoring app activity.",
        tags: ["User Profile"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Heartbeat received successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/profile/battery": {
      post: {
        summary: "Update device battery level",
        description:
          "Saves the user's device battery level to the database. Creates a new battery level record each time it's called, maintaining a complete history.",
        tags: ["Safety & Alerts"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  batteryLevel: {
                    type: "number",
                    description: "Battery level percentage (0-100)",
                    minimum: 0,
                    maximum: 100,
                  },
                  deviceId: {
                    type: "string",
                    nullable: true,
                    description: "Optional device identifier",
                  },
                },
                required: ["batteryLevel"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Battery level saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        batteryLevel: { type: "number" },
                        deviceId: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request - invalid battery level" },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/profile/low-battery": {
      post: {
        summary: "Send low battery alert",
        description:
          "Sends a low battery alert notification to all circle members when the user's device battery is below the threshold (default 20%). Saves the battery level to the database and sends push notifications to all circle members.",
        tags: ["Safety & Alerts"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  batteryLevel: {
                    type: "number",
                    description: "Battery level percentage (0-100)",
                    minimum: 0,
                    maximum: 100,
                  },
                  deviceId: {
                    type: "string",
                    nullable: true,
                    description: "Optional device identifier",
                  },
                  threshold: {
                    type: "number",
                    default: 20,
                    description:
                      "Battery threshold percentage (default: 20). Alert is only sent if battery is below this threshold.",
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: ["batteryLevel"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Low battery alert sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    notificationsSent: { type: "integer" },
                    notificationsFailed: { type: "integer" },
                    totalRecipients: { type: "integer" },
                    tokensFound: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        batteryLevel: { type: "number" },
                        deviceId: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid battery level or battery above threshold",
          },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/profile/crash": {
      post: {
        summary: "Report app crash",
        description:
          "Reports an app crash and sends crash detection notifications to all circle members. Saves crash details to the database and sends push notifications.",
        tags: ["Safety & Alerts"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  latitude: {
                    type: "number",
                    nullable: true,
                    description: "Latitude coordinate at time of crash",
                  },
                  longitude: {
                    type: "number",
                    nullable: true,
                    description: "Longitude coordinate at time of crash",
                  },
                  crashDetails: {
                    type: "string",
                    nullable: true,
                    description: "Additional crash details or error information",
                  },
                  deviceId: {
                    type: "string",
                    nullable: true,
                    description: "Device identifier",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Crash detected and notifications sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    notificationsSent: { type: "integer" },
                    notificationsFailed: { type: "integer" },
                    totalRecipients: { type: "integer" },
                    tokensFound: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        latitude: { type: "number", nullable: true },
                        longitude: { type: "number", nullable: true },
                        crashDetails: { type: "string", nullable: true },
                        deviceId: { type: "string", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/profile/sos": {
      post: {
        summary: "Send SOS emergency alert",
        description:
          "Sends an emergency SOS alert to all circle members. Saves the SOS alert to the database and sends push notifications to all circle members with location information.",
        tags: ["Safety & Alerts"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    nullable: true,
                    description: "Custom SOS message (defaults to 'User needs help!')",
                  },
                  latitude: {
                    type: "number",
                    nullable: true,
                    description: "Latitude coordinate for emergency location",
                  },
                  longitude: {
                    type: "number",
                    nullable: true,
                    description: "Longitude coordinate for emergency location",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "SOS alert sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    notificationsSent: { type: "integer" },
                    notificationsFailed: { type: "integer" },
                    totalRecipients: { type: "integer" },
                    tokensFound: { type: "integer" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        userId: { type: "string" },
                        message: { type: "string", nullable: true },
                        latitude: { type: "number", nullable: true },
                        longitude: { type: "number", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "User not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/circles/{id}/locations": {
      post: {
        summary: "Create a location for a circle (admin/creator only)",
        description:
          "Creates a new location and assigns it to a circle. Only circle creators and admins can create locations for a circle. If isCommonLocation is true, the location will be automatically assigned to all accepted members of the circle.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the location (required)",
                  },
                  latitude: {
                    type: "number",
                    nullable: true,
                    description: "Latitude coordinate (optional)",
                  },
                  longitude: {
                    type: "number",
                    nullable: true,
                    description: "Longitude coordinate (optional)",
                  },
                  metadata: {
                    type: "object",
                    nullable: true,
                    description: "Optional metadata object",
                  },
                  isCommonLocation: {
                    type: "boolean",
                    default: false,
                    description:
                      "If true, the location will be automatically assigned to all accepted members of the circle",
                  },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Location created successfully. If isCommonLocation was true, includes message about assignment to members.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Location" },
                    message: {
                      type: "string",
                      description:
                        "Confirmation message. If isCommonLocation was true, indicates how many members the location was assigned to.",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - name is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description:
              "Forbidden - only circle creators and admins can create locations for a circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      put: {
        summary: "Update a location for a circle (admin/creator only)",
        description:
          "Updates an existing location in a circle. Only circle creators and admins can update locations. If isCommonLocation is provided, it will assign the location to all members (true) or remove assignments from all members (false).",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "locationId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Location ID",
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the location",
                  },
                  latitude: {
                    type: "number",
                    nullable: true,
                    description: "Latitude coordinate",
                  },
                  longitude: {
                    type: "number",
                    nullable: true,
                    description: "Longitude coordinate",
                  },
                  metadata: {
                    type: "object",
                    nullable: true,
                    description: "Metadata object",
                  },
                  isCommonLocation: {
                    type: "boolean",
                    description:
                      "If true, assigns location to all accepted members. If false, removes location assignments from all members. If not provided, assignment status remains unchanged.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Location" },
                    message: {
                      type: "string",
                      description:
                        "Confirmation message. If isCommonLocation was provided, indicates assignment changes.",
                    },
                  },
                },
              },
            },
          },
          "403": {
            description:
              "Forbidden - only circle creators and admins can update locations for a circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found or location not found or does not belong to this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/assign-location": {
      post: {
        summary: "Assign a location to user(s) in a circle (admin/creator only)",
        description:
          "Allows circle creators and admins to assign a location to one or more members. If userId is provided, assigns to that specific user. If userId is omitted, assigns to all accepted members of the circle.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  locationId: {
                    type: "string",
                    description: "ID of the location to assign (must belong to this circle)",
                  },
                  userId: {
                    type: "string",
                    nullable: true,
                    description:
                      "Optional: ID of the user to assign the location to (must be an accepted member). If omitted, assigns to all accepted members of the circle.",
                  },
                },
                required: ["locationId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Location assigned successfully. Returns single UserLocation if userId was provided, or array of UserLocation if assigned to all members.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { $ref: "#/components/schemas/UserLocation" },
                      },
                    },
                    {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/UserLocation" },
                        },
                        message: { type: "string" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Bad request - locationId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description:
              "Forbidden - only circle creators and admins can assign locations to members",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description:
              "Circle not found, location not found, target user is not a member, or no accepted members found in circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/unassign-location": {
      post: {
        summary: "Unassign a location from user(s) in a circle (admin/creator only)",
        description:
          "Allows circle creators and admins to unassign a location from one or more members. If userId is provided, unassigns from that specific user. If userId is omitted, unassigns from all members of the circle. Sends notifications based on circle notification settings.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  locationId: {
                    type: "string",
                    description: "ID of the location to unassign (must belong to this circle)",
                  },
                  userId: {
                    type: "string",
                    nullable: true,
                    description:
                      "Optional: ID of the user to unassign the location from. If omitted, unassigns from all members of the circle.",
                  },
                },
                required: ["locationId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location unassigned successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - locationId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description:
              "Forbidden - only circle creators and admins can unassign locations from members",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found, location not found, or location not assigned to user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/locations/{locationId}": {
      delete: {
        summary: "Delete a location from a circle (admin/creator only)",
        description:
          "Deletes a location from a circle. This will also remove all user assignments for this location. Only circle creators and admins can delete locations. Sends notifications based on circle notification settings.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
          {
            name: "locationId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Location ID to delete",
          },
        ],
        responses: {
          "200": {
            description: "Location deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "403": {
            description: "Forbidden - only circle creators and admins can remove locations",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found or location not found or does not belong to this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/mark-location-reached": {
      post: {
        summary: "Mark a location as reached and notify other circle members",
        description:
          "Marks that the current user has reached a location. Sends push notifications to all other accepted members of the circle and creates notification records in the database.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  locationId: {
                    type: "string",
                    description: "ID of the location that was reached (must belong to this circle)",
                  },
                  latitude: {
                    type: "number",
                    description: "Optional: Latitude coordinate when location was reached",
                  },
                  longitude: {
                    type: "number",
                    description: "Optional: Longitude coordinate when location was reached",
                  },
                },
                required: ["locationId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location marked as reached and notifications sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    notificationsSent: {
                      type: "integer",
                      description: "Number of push notifications sent",
                    },
                    notificationsFailed: {
                      type: "integer",
                      description: "Number of push notifications that failed",
                    },
                    totalRecipients: { type: "integer", description: "Total number of recipients" },
                    tokensFound: {
                      type: "integer",
                      description: "Number of Firebase tokens found",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - locationId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description: "Forbidden - user must be an accepted member of this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found, location not found, or user not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/circles/{id}/mark-location-left": {
      post: {
        summary: "Mark a location as left and notify other circle members",
        description:
          "Marks that the current user has left a location. Sends push notifications to all other accepted members of the circle and creates notification records in the database.",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Circle ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  locationId: {
                    type: "string",
                    description: "ID of the location that was left (must belong to this circle)",
                  },
                },
                required: ["locationId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Location marked as left and notifications sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    notificationsSent: {
                      type: "integer",
                      description: "Number of push notifications sent",
                    },
                    notificationsFailed: {
                      type: "integer",
                      description: "Number of push notifications that failed",
                    },
                    totalRecipients: { type: "integer", description: "Total number of recipients" },
                    tokensFound: {
                      type: "integer",
                      description: "Number of Firebase tokens found",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - locationId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "403": {
            description: "Forbidden - user must be an accepted member of this circle",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Circle not found, location not found, or user not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/logs": {
      get: {
        summary: "Get API request logs",
        description:
          "Retrieve logged API requests (non-GET requests only). Supports pagination and filtering by method, status code, user ID, and date range. Unprotected route.",
        tags: ["Logs"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number for pagination",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 100 },
            description: "Number of logs per page",
          },
          {
            name: "method",
            in: "query",
            schema: { type: "string", enum: ["POST", "PUT", "DELETE", "PATCH"] },
            description: "Filter by HTTP method",
          },
          {
            name: "statusCode",
            in: "query",
            schema: { type: "integer", minimum: 100, maximum: 599 },
            description: "Filter by HTTP status code",
          },
          {
            name: "userId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by user ID",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter logs from this date (ISO 8601 format)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter logs until this date (ISO 8601 format)",
          },
        ],
        responses: {
          "200": {
            description: "List of API logs with pagination",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LogsResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/subscription/plans": {
      get: {
        summary: "Get all available subscription plans",
        description:
          "Returns a list of all available subscription plans (Free, Silver, Gold, Platinum).",
        tags: ["Subscriptions"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of available plans",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Plan" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/subscription/current": {
      get: {
        summary: "Get current user's subscription plan",
        description: "Returns the currently authenticated user's subscription plan information.",
        tags: ["Subscriptions"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User's current subscription plan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/UserPlan" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": {
            description: "No plan found for user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
"/api/payment/ipay-callback": {
  "post": {
    "summary": "iPay Payment Gateway Callback",
    "description": "Callback endpoint for iPay to notify payment status. The order_id should be in 'userId|planId' format.",
    "tags": ["Payments"],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "status": {
                "type": "string",
                "description": "1 for success, 0 for failed",
                "example": "1"
              },
              "order_id": {
                "type": "string",
                "description": "Format: userId|planId",
                "example": "user-uuid-here|plan-uuid-here"
              },
              "transaction_id": {
                "type": "string",
                "example": "IPAY12345678"
              },
              "amount": {
                "type": "number",
                "example": 1500.00
              }
            }
          }
        }
      }
    },
    "responses": {
      "200": { "description": "Callback processed successfully" },
      "500": { "description": "Server error" }
    }
  }
},

    "/api/subscription/subscribe": {
      post: {
        summary: "Subscribe to a plan",
        description:
          "Subscribe the current user to a subscription plan. No payment processing is implemented - this endpoint simply updates the user's plan. New users are automatically assigned the Free plan on registration.",
        tags: ["Subscriptions"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  planId: {
                    type: "string",
                    description: "ID of the plan to subscribe to",
                  },
                },
                required: ["planId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successfully subscribed to plan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/UserPlan" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - planId is required or invalid plan ID",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": {
            description: "Plan not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/tracker": {
      get: {
        summary: "Get tracker data",
        description:
          "Retrieve GPS tracker data from SinoTrack devices. Supports pagination and filtering by device ID, GPS status, and date range.",
        tags: ["Tracker"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number for pagination",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 100 },
            description: "Number of records per page",
          },
          {
            name: "deviceId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by device ID",
          },
          {
            name: "gpsStatus",
            in: "query",
            schema: { type: "string", enum: ["A", "V"] },
            description: "Filter by GPS status (A = valid, V = invalid)",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter data from this date (ISO 8601 format)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter data until this date (ISO 8601 format)",
          },
        ],
        responses: {
          "200": {
            description: "List of tracker data with pagination",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TrackerResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/tracker/device/{deviceId}": {
      get: {
        summary: "Get tracker data by device ID",
        description:
          "Retrieve GPS tracker data for a specific device. Supports pagination and date range filtering.",
        tags: ["Tracker"],
        parameters: [
          {
            name: "deviceId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Device ID to retrieve data for",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1, minimum: 1 },
            description: "Page number for pagination",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 100 },
            description: "Number of records per page",
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter data from this date (ISO 8601 format)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Filter data until this date (ISO 8601 format)",
          },
        ],
        responses: {
          "200": {
            description: "Tracker data for the specified device",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TrackerDeviceResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/tracker/devices": {
      get: {
        summary: "Get list of device IDs",
        description: "Returns a list of all unique device IDs that have sent tracker data.",
        tags: ["Tracker"],
        responses: {
          "200": {
            description: "List of unique device IDs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeviceIdsResponse" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/tracker/user/devices": {
post: {
    summary: "Add a tracking device for the authenticated user",
    description: "Associate a tracking device with the authenticated user by deviceId. The device can optionally be given a friendly name.",
    tags: ["Tracker"],
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/AddUserDeviceRequest" }, 
        },
      },
    },
        responses: {
          "201": {
            description: "Device added successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AddUserDeviceResponse" },
              },
            },
          },
          "400": {
            description: "Invalid request - deviceId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "409": {
            description: "Device already exists for this user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        summary: "Get all tracking devices for the authenticated user",
        description:
          "Returns a list of all tracking devices associated with the authenticated user.",
        tags: ["Tracker"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of user's tracking devices",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserDevicesResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/tracker/user/devices/{deviceId}": {
      delete: {
        summary: "Remove a tracking device for the authenticated user",
        description: "Remove the association between a tracking device and the authenticated user.",
        tags: ["Tracker"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "deviceId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Device ID to remove from the user's devices",
          },
        ],
        responses: {
          "200": {
            description: "Device removed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RemoveUserDeviceResponse" },
              },
            },
          },
          "400": {
            description: "Invalid request - deviceId is required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "404": {
            description: "Device not found for this user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
"/api/tracker/user/devices/{deviceId}/live": {
  get: {
    summary: "Get LIVE Status for a specific device",
    description: "Returns the latest battery, ACC status and location for a device owned by the user.",
    tags: ["Tracker"],
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: "deviceId",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Device ID"
      }
    ],
    responses: {
      "200": {
        description: "Live status details",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: {
                  type: "object",
                  properties: {
                    deviceInfo: { $ref: "#/components/schemas/UserDevice" },
                    liveData: {
                      type: "object",
                      properties: {
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                        accStatus: { type: "string" },
                        battery: { type: "string" },
                        gsm: { type: "integer" },
                        lastUpdate: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
},

"/api/notifications/settings/{circleId}": {
      get: {
        tags: ["Settings"],
        summary: "Get notification settings for a circle",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "circleId",
            required: true,
            schema: { type: "string" },
            description: "ID of the circle"
          }
        ],
        responses: {
          200: {
            description: "Notification settings retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationSettings" }
              }
            }
          },
          403: { description: "Not a member of this circle" },
          404: { description: "Circle not found" }
        }
      },
      put: {
        tags: ["Settings"],
        summary: "Update notification settings for a circle (Admin Only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "circleId",
            required: true,
            schema: { type: "string" },
            description: "ID of the circle"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  settings: {
                    $ref: "#/components/schemas/NotificationSettings"
                  }
                },
                example: {
                  settings: {
                    low_battery: "creator_and_admins",
                    sos_alert: "all_members",
                    location_reached: "all_members"
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { $ref: "#/components/schemas/NotificationSettings" }
                  }
                }
              }
            }
          },
          403: { description: "Only admins can update settings" },
          500: { description: "Server error" }
        }
      }
    },


    "/api/notifications": {
      get: {
        summary: "Get notifications for the authenticated user",
        description:
          "Retrieve paginated notifications for the authenticated user. Supports filtering by read status.",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number (1-indexed)",
          },
          {
            name: "perPage",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Number of items per page (max 100)",
          },
          {
            name: "read",
            in: "query",
            schema: { type: "boolean" },
            description: "Filter by read status (true for read, false for unread)",
          },
        ],
        responses: {
          "200": {
            description: "List of notifications with pagination",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationsResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

"/api/notifications/read-all": {
  "put": {
    "summary": "Mark device notification as read",
    "description": "Mark all pending notifications for a specific user as read.",
    "tags": ["Notifications"],
    "security": [{ "bearerAuth": [] }],
    "parameters": [
      {
        "name": "userId",
        "in": "path",
        "required": true,
        "schema": { "type": "string" },
        "description": "The userId to mark notifications as read"
      }
    ],
    "responses": {
      "200": {
        "description": "Notification status updated",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "success": { "type": "boolean" },
                "message": { "type": "string" }
              }
            }
          }
        }
      },
      "401": { "description": "Unauthorized" },
      "500": { "description": "Server error" }
    }
  }
},


  
"/api/notifications/{notificationId}": {
      "put": {
        "summary": "Mark a notification as read",
        "description": "Mark a specific notification as read by its ID.",
        "tags": ["Notifications"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "notificationId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" },
            "description": "ID of the notification to mark as read"
          }
        ],
        "responses": {
          "200": {
            "description": "Notification marked as read",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ReadNotificationResponse" }
              }
            }
          },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Notification not found" },
          "500": { "description": "Server error" }
        }
      }
    },




  "/api/qr/settings": {
    put: {
      summary: "Update QR Profile Settings",
      tags: ["QR Profile"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                displayName: { type: "string", example: "Madhusha Gunasekara" },
                phoneNumber: { type: "string", example: "+94712345678" },
                otherDetails: { type: "string", example: "madhusha.codara.lk" },
                showDetails: { type: "boolean", example: true },
                isActive: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Settings updated successfully" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/qr/view/{code}": {
    get: {
      summary: "Get Public QR Profile Data",
      tags: ["QR Profile"],
      parameters: [
        {
          in: "path",
          name: "code",
          required: true,
          schema: { type: "string" },
          description: "The unique code from the QR link",
        },
      ],
      responses: {
        200: {
          description: "Profile data retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      displayName: { type: "string" },
                      phoneNumber: { type: "string" },
                      otherDetails: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Profile not found" },
      },
    },
  },




    "/api/profile/referral/generate": {
      "post": {
        "summary": "Generate a unique referral link",
        "tags": ["Referrals"],
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Returns referral code and link",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "referralCode": { "type": "string" },
                        "signupUrl": { "type": "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },


"/api/auth/user/claim-referral": {
    post: {
      summary: "Claim a referral code",
      description: "Allows a user to enter a referral code after registration to link with a referrer.",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                referralCode: {
                  type: "string",
                  example: "A1B2C3D4"
                }
              },
              required: ["referralCode"]
            }
          }
        }
      },
      responses: {
        200: {
          description: "Referral claimed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Referral claimed successfully" }
                }
              }
            }
          }
        },
        400: { description: "Invalid request or referral already claimed" },
        404: { description: "User or referral code not found" },
        500: { description: "Internal server error" }
      }
    }
  },


  "/api/auth/user/referral-stats": {
    get: {
      summary: "Get User Referral Statistics",
      description: "Returns the user's referral code, total referral count, and the list of referred users.",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      myReferralCode: { type: "string", example: "A1B2C3D4" },
                      totalReferrals: { type: "integer", example: 5 },
                      referralList: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            createdAt: { type: "string", format: "date-time" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" }
      }
    }
  },



    "/api/profile/referral/details/{code}": {
      "get": {
        "summary": "Get referrer info by code",
        "tags": ["Referrals"],
        "parameters": [
          { "name": "code", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Returns referrer name, avatar and package",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "data": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string" },
                        "avatar": { "type": "string", "nullable": true },
                        "package": { "type": "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
